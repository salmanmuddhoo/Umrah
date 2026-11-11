import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { badRequest, ApiError } from "@/lib/errors";
import { roleForProviderType } from "@/lib/rules";
import { isEmail, str, type Input } from "@/lib/validate";

function password(input: Input) {
  return typeof input.password === "string" ? input.password : "";
}

/** Creates a pilgrim, or a provider account when `as` is "umrah" or "transport". Returns the new user's id. */
export async function registerUser(input: Input) {
  const name = str(input, "name", 80);
  const email = str(input, "email", 200).toLowerCase();
  const pw = password(input);
  const as = str(input, "as");
  const companyName = str(input, "companyName", 120);

  if (name.length < 2) throw badRequest("Please enter your name.");
  if (!isEmail(email)) throw badRequest("Please enter a valid email address.");
  if (pw.length < 8 || pw.length > 200) throw badRequest("Password must be at least 8 characters.");

  const providerType = as === "umrah" ? "UMRAH" : as === "transport" ? "TRANSPORT" : null;
  if (providerType && companyName.length < 2) throw badRequest("Please enter your company name.");

  if (await db.user.findUnique({ where: { email } })) {
    throw new ApiError(409, "An account with this email already exists. Try signing in.");
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(pw, 10),
      role: roleForProviderType(providerType),
      provider: providerType
        ? {
            create: {
              type: providerType,
              companyName,
              country: str(input, "country", 80),
              city: str(input, "city", 80),
              phone: str(input, "phone", 40),
              licenseNo: str(input, "licenseNo", 80),
            },
          }
        : undefined,
    },
  });
  return user.id;
}

/** Returns the user's id and role when the credentials are right. */
export async function checkCredentials(input: Input) {
  const email = str(input, "email", 200).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password(input), user.passwordHash))) {
    throw new ApiError(401, "Incorrect email or password.");
  }
  return { id: user.id, role: user.role };
}
