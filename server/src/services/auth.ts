import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashCode, readVerification, signVerification } from "@/lib/auth";
import { ApiError, badRequest } from "@/lib/errors";
import { isPin, maskIdentifier, parseIdentifier, type Identifier } from "@/lib/identifier";
import { channelFor, sendVerificationCode } from "@/lib/messaging";
import { roleForProviderType } from "@/lib/rules";
import { str, type Input } from "@/lib/validate";

export const CODE_TTL_MS = 10 * 60_000;
export const RESEND_WAIT_MS = 30_000;
export const MAX_CODES_PER_HOUR = 5;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_PIN_ATTEMPTS = 5;

const whereUser = (id: Identifier) => (id.kind === "email" ? { email: id.value } : { phone: id.value });

function identifierFrom(input: Input) {
  const id = parseIdentifier(input.identifier);
  if (!id) throw badRequest("Enter an email address, or a phone number with its country code (for example +44 7700 900123).");
  return id;
}

/** Step 1: send a 6-digit code by email, or by WhatsApp for phone numbers. */
export async function startVerification(input: Input) {
  const id = identifierFrom(input);
  const now = Date.now();

  const recent = await db.verificationCode.findMany({
    where: { identifier: id.value, createdAt: { gte: new Date(now - 3_600_000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_WAIT_MS) {
    throw new ApiError(429, "Please wait a moment before asking for another code.");
  }
  if (recent.length >= MAX_CODES_PER_HOUR) {
    throw new ApiError(429, "Too many codes requested. Please try again in an hour.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = await db.verificationCode.create({
    data: { identifier: id.value, codeHash: hashCode(id.value, code), expiresAt: new Date(now + CODE_TTL_MS) },
  });

  let delivered: boolean;
  try {
    ({ delivered } = await sendVerificationCode(id, code));
  } catch (err) {
    // A code nobody received should not count against the hourly limit.
    await db.verificationCode.delete({ where: { id: row.id } });
    throw err;
  }

  return {
    channel: channelFor(id),
    destination: maskIdentifier(id),
    // Only ever set in development, when no email/WhatsApp provider is configured.
    ...(!delivered && { devCode: code }),
  };
}

/** Step 2: check the code. Success returns a short-lived token that the next step must present. */
export async function confirmCode(input: Input) {
  const id = identifierFrom(input);
  const code = str(input, "code", 10);

  const row = await db.verificationCode.findFirst({
    where: { identifier: id.value, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw badRequest("This code has expired. Please ask for a new one.");
  if (row.attempts >= MAX_CODE_ATTEMPTS) throw new ApiError(429, "Too many wrong codes. Please ask for a new one.");

  const given = Buffer.from(hashCode(id.value, code));
  const wanted = Buffer.from(row.codeHash);
  if (!/^\d{6}$/.test(code) || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    await db.verificationCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw badRequest("That code is not right. Please check it and try again.");
  }

  // Guard on consumedAt so the same code cannot be redeemed twice in parallel.
  const used = await db.verificationCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (used.count === 0) throw badRequest("This code has already been used. Please ask for a new one.");

  const account = await db.user.findUnique({ where: whereUser(id), select: { id: true } });
  return { verificationToken: await signVerification(id.value), accountExists: !!account };
}

/** The identifier a verification token vouches for. Every step after the code needs one. */
async function verified(input: Input) {
  const value = await readVerification(input.verificationToken);
  const id = value ? parseIdentifier(value) : null;
  if (!id) throw new ApiError(401, "Your verification has expired. Please start again.");
  return id;
}

function pinFrom(input: Input) {
  if (!isPin(input.pin)) throw badRequest("Your PIN must be exactly 4 digits.");
  return input.pin;
}

/** Step 3 for new people: create the account with the PIN they chose. Returns the new user's id. */
export async function registerUser(input: Input) {
  const id = await verified(input);
  const pin = pinFrom(input);
  const name = str(input, "name", 80);
  const as = str(input, "as");
  const companyName = str(input, "companyName", 120);

  if (name.length < 2) throw badRequest("Please enter your name.");
  const providerType = as === "umrah" ? "UMRAH" : as === "transport" ? "TRANSPORT" : null;
  if (providerType && companyName.length < 2) throw badRequest("Please enter your company name.");

  if (await db.user.findUnique({ where: whereUser(id), select: { id: true } })) {
    throw new ApiError(409, "An account already exists for this email or number. Please sign in instead.");
  }

  const user = await db.user.create({
    data: {
      name,
      ...whereUser(id),
      pinHash: await bcrypt.hash(pin, 10),
      role: roleForProviderType(providerType),
      provider: providerType
        ? {
            create: {
              type: providerType,
              companyName,
              country: str(input, "country", 80),
              city: str(input, "city", 80),
              // A provider who signed up by phone is reachable on that number by default.
              phone: str(input, "phone", 40) || (id.kind === "phone" ? id.value : ""),
              licenseNo: str(input, "licenseNo", 80),
            },
          }
        : undefined,
    },
  });
  return user.id;
}

/**
 * Checks a PIN and counts wrong attempts. After MAX_PIN_ATTEMPTS in a row the PIN
 * is refused even when correct, until it is reset with a fresh verification code —
 * otherwise 10,000 guesses would always get in.
 */
async function checkPin(user: { id: string; pinHash: string | null; pinAttempts: number }, pin: string) {
  const locked = new ApiError(423, "Too many wrong PINs. Please reset your PIN with a verification code.");
  if (!user.pinHash || user.pinAttempts >= MAX_PIN_ATTEMPTS) throw locked;

  if (await bcrypt.compare(pin, user.pinHash)) {
    if (user.pinAttempts > 0) await db.user.update({ where: { id: user.id }, data: { pinAttempts: 0 } });
    return;
  }
  const { pinAttempts } = await db.user.update({ where: { id: user.id }, data: { pinAttempts: { increment: 1 } } });
  const left = MAX_PIN_ATTEMPTS - pinAttempts;
  if (left <= 0) throw locked;
  throw new ApiError(403, `Wrong PIN. ${left} ${left === 1 ? "attempt" : "attempts"} left.`);
}

const PIN_FIELDS = { id: true, pinHash: true, pinAttempts: true } as const;

/** Step 3 for returning people on a new device: the code proved who they are, the PIN completes sign-in. */
export async function loginWithPin(input: Input) {
  const id = await verified(input);
  const pin = pinFrom(input);
  const user = await db.user.findUnique({ where: whereUser(id), select: PIN_FIELDS });
  if (!user) throw new ApiError(404, "No account exists for this email or number yet.");
  await checkPin(user, pin);
  return user.id;
}

/** Forgotten or locked PIN: a fresh verification code is enough to choose a new one. */
export async function resetPin(input: Input) {
  const id = await verified(input);
  const pin = pinFrom(input);
  const user = await db.user.findUnique({ where: whereUser(id), select: { id: true } });
  if (!user) throw new ApiError(404, "No account exists for this email or number yet.");
  await db.user.update({ where: { id: user.id }, data: { pinHash: await bcrypt.hash(pin, 10), pinAttempts: 0 } });
  return user.id;
}

/** Unlocking the app on a device that is already signed in. */
export async function verifyPin(userId: string, input: Input) {
  const pin = pinFrom(input);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: PIN_FIELDS });
  await checkPin(user, pin);
  return { ok: true };
}

/** Password sign-in for the web admin console. Returns the user's id and role when the credentials are right. */
export async function checkAdminPassword(input: Input) {
  const email = str(input, "email", 200).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Incorrect email or password.");
  }
  return { id: user.id, role: user.role };
}
