import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashCode, signToken, signVerification } from "@/lib/auth";
import { db } from "@/lib/db";
import * as messaging from "@/lib/messaging";
import { resetDb } from "../../test/factories";
import * as auth from "./auth";

const EMAIL = "aisha@example.com";
const PHONE = "+447700900123";

/** Captures the code that would have been emailed or sent on WhatsApp. */
function captureCodes() {
  const sent: { to: string; kind: string; code: string }[] = [];
  vi.spyOn(messaging, "sendVerificationCode").mockImplementation(async (id, code) => {
    sent.push({ to: id.value, kind: id.kind, code });
    return { delivered: true };
  });
  return sent;
}

/** Runs steps 1 and 2 and returns the verification token. */
async function verify(identifier: string) {
  const sent = captureCodes();
  await auth.startVerification({ identifier });
  const result = await auth.confirmCode({ identifier, code: sent[0].code });
  // Let the next request for a code through the resend wait.
  await db.verificationCode.updateMany({ data: { createdAt: new Date(Date.now() - 60_000) } });
  return result;
}

async function signUp(identifier = EMAIL, pin = "4821") {
  const { verificationToken } = await verify(identifier);
  return auth.registerUser({ verificationToken, name: "Aisha", pin });
}

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());

describe("startVerification", () => {
  it("sends a 6-digit code by email for an email address", async () => {
    const sent = captureCodes();
    const res = await auth.startVerification({ identifier: " Aisha@Example.com " });
    expect(res).toEqual({ channel: "email", destination: "a•••@example.com" });
    expect(sent).toEqual([{ to: EMAIL, kind: "email", code: expect.stringMatching(/^\d{6}$/) }]);
  });

  it("sends the code on WhatsApp for a phone number", async () => {
    const sent = captureCodes();
    const res = await auth.startVerification({ identifier: "+44 7700 900123" });
    expect(res.channel).toBe("whatsapp");
    expect(sent[0]).toMatchObject({ to: PHONE, kind: "phone" });
  });

  it("stores only a hash of the code", async () => {
    const sent = captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    const row = await db.verificationCode.findFirstOrThrow();
    expect(row.codeHash).not.toContain(sent[0].code);
    expect(row.codeHash).toBe(hashCode(EMAIL, sent[0].code));
  });

  it("rejects input that is neither an email nor an international phone number", async () => {
    captureCodes();
    await expect(auth.startVerification({ identifier: "07700 900123" })).rejects.toMatchObject({ status: 400 });
    await expect(auth.startVerification({})).rejects.toMatchObject({ status: 400 });
  });

  it("makes people wait before asking for another code", async () => {
    captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    await expect(auth.startVerification({ identifier: EMAIL })).rejects.toMatchObject({ status: 429 });
  });

  it("caps the number of codes per hour", async () => {
    const sent = captureCodes();
    for (let i = 0; i < auth.MAX_CODES_PER_HOUR; i++) {
      await auth.startVerification({ identifier: EMAIL });
      await db.verificationCode.updateMany({ data: { createdAt: new Date(Date.now() - 60_000) } });
    }
    await expect(auth.startVerification({ identifier: EMAIL })).rejects.toThrow("Too many codes");
    expect(sent).toHaveLength(auth.MAX_CODES_PER_HOUR);
  });

  it("does not count a code that could not be delivered", async () => {
    vi.spyOn(messaging, "sendVerificationCode").mockRejectedValue(new Error("provider down"));
    await expect(auth.startVerification({ identifier: EMAIL })).rejects.toThrow("provider down");
    expect(await db.verificationCode.count()).toBe(0);
  });

  it("hands the code back only when nothing was actually delivered (development)", async () => {
    vi.spyOn(messaging, "sendVerificationCode").mockResolvedValue({ delivered: false });
    const res = await auth.startVerification({ identifier: EMAIL });
    expect(res).toHaveProperty("devCode");
  });
});

describe("sendVerificationCode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses in production when the channel has no credentials, rather than leaking the code", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(messaging.sendVerificationCode({ kind: "email", value: EMAIL }, "123456")).rejects.toMatchObject({ status: 503 });
  });

  it("posts the code to the WhatsApp Cloud API using the configured template", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "555");
    vi.stubEnv("WHATSAPP_TEMPLATE", "login_code");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    expect(await messaging.sendVerificationCode({ kind: "phone", value: PHONE }, "123456")).toEqual({ delivered: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/graph\.facebook\.com\/v[\d.]+\/555\/messages$/);
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({ messaging_product: "whatsapp", to: "447700900123", type: "template", template: { name: "login_code" } });
    expect(JSON.stringify(body.template.components)).toContain("123456");
  });

  it("sends email through Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "My Ummah <verify@example.com>");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await messaging.sendVerificationCode({ kind: "email", value: EMAIL }, "654321");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(init?.body))).toMatchObject({ to: [EMAIL], subject: expect.stringContaining("654321") });
  });

  it("hides the provider's error from the user", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "x@example.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"message":"API key is invalid"}', { status: 401 }));
    const err = await messaging.sendVerificationCode({ kind: "email", value: EMAIL }, "654321").catch((e: Error) => e);
    expect(err).toMatchObject({ status: 502 });
    expect((err as Error).message).not.toContain("API key");
  });
});

describe("confirmCode", () => {
  it("accepts the right code once, and says whether an account already exists", async () => {
    const sent = captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    const res = await auth.confirmCode({ identifier: EMAIL, code: sent[0].code });
    expect(res).toEqual({ verificationToken: expect.any(String), accountExists: false });
    await expect(auth.confirmCode({ identifier: EMAIL, code: sent[0].code })).rejects.toMatchObject({ status: 400 });
  });

  it("reports existing accounts", async () => {
    await signUp();
    expect((await verify(EMAIL)).accountExists).toBe(true);
  });

  it("rejects a wrong code and counts the attempt", async () => {
    captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    await expect(auth.confirmCode({ identifier: EMAIL, code: "abcdef" })).rejects.toThrow("not right");
    expect((await db.verificationCode.findFirstOrThrow()).attempts).toBe(1);
  });

  it("stops accepting guesses after too many wrong codes, even the right one", async () => {
    const sent = captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    const wrong = sent[0].code === "000000" ? "111111" : "000000";
    for (let i = 0; i < auth.MAX_CODE_ATTEMPTS; i++) {
      await expect(auth.confirmCode({ identifier: EMAIL, code: wrong })).rejects.toMatchObject({ status: 400 });
    }
    await expect(auth.confirmCode({ identifier: EMAIL, code: sent[0].code })).rejects.toMatchObject({ status: 429 });
  });

  it("rejects expired codes", async () => {
    const sent = captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    await db.verificationCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(auth.confirmCode({ identifier: EMAIL, code: sent[0].code })).rejects.toThrow("expired");
  });

  it("does not accept a code sent to someone else", async () => {
    const sent = captureCodes();
    await auth.startVerification({ identifier: EMAIL });
    await auth.startVerification({ identifier: PHONE });
    await expect(auth.confirmCode({ identifier: PHONE, code: sent[0].code })).rejects.toMatchObject({ status: 400 });
  });
});

describe("registerUser", () => {
  it("creates a pilgrim by email with a hashed PIN", async () => {
    const id = await signUp(EMAIL, "4821");
    const user = await db.user.findUniqueOrThrow({ where: { id }, include: { provider: true } });
    expect(user).toMatchObject({ email: EMAIL, phone: null, role: "PILGRIM", provider: null, passwordHash: null });
    expect(user.pinHash).not.toContain("4821");
    expect(await bcrypt.compare("4821", user.pinHash!)).toBe(true);
  });

  it("creates an account by phone number", async () => {
    const id = await signUp(PHONE);
    expect(await db.user.findUniqueOrThrow({ where: { id } })).toMatchObject({ phone: PHONE, email: null });
  });

  it("creates providers awaiting approval, reachable on the number they signed up with", async () => {
    const { verificationToken } = await verify(PHONE);
    const id = await auth.registerUser({ verificationToken, name: "Khalid", pin: "4821", as: "transport", companyName: "Haramain Rides" });
    const user = await db.user.findUniqueOrThrow({ where: { id }, include: { provider: true } });
    expect(user.role).toBe("TRANSPORT");
    expect(user.provider).toMatchObject({ type: "TRANSPORT", companyName: "Haramain Rides", status: "PENDING", phone: PHONE });
  });

  it("registers any listed kind of service provider, and ignores unknown kinds", async () => {
    const first = await verify(EMAIL);
    const caterer = await auth.registerUser({ verificationToken: first.verificationToken, name: "Huda", pin: "4821", as: "CATERING", companyName: "Madinah Kitchen" });
    expect((await db.user.findUniqueOrThrow({ where: { id: caterer }, include: { provider: true } })).provider).toMatchObject({ type: "CATERING", status: "PENDING" });

    const second = await verify(PHONE);
    const other = await auth.registerUser({ verificationToken: second.verificationToken, name: "Sam", pin: "4821", as: "casino", companyName: "X" });
    expect(await db.user.findUniqueOrThrow({ where: { id: other }, include: { provider: true } })).toMatchObject({ role: "PILGRIM", provider: null });
  });

  it("cannot be used to create an admin", async () => {
    const { verificationToken } = await verify(EMAIL);
    const id = await auth.registerUser({ verificationToken, name: "Aisha", pin: "4821", as: "admin", role: "ADMIN" });
    expect((await db.user.findUniqueOrThrow({ where: { id } })).role).toBe("PILGRIM");
  });

  it("needs a verified email or phone: a missing, forged or session token is refused", async () => {
    const base = { name: "Aisha", pin: "4821" };
    await expect(auth.registerUser(base)).rejects.toMatchObject({ status: 401 });
    await expect(auth.registerUser({ ...base, verificationToken: "not.a.token" })).rejects.toMatchObject({ status: 401 });
    await expect(auth.registerUser({ ...base, verificationToken: await signToken("some-user-id") })).rejects.toMatchObject({ status: 401 });
    expect(await db.user.count()).toBe(0);
  });

  it("ignores any identifier in the request body: the account is for the verified one", async () => {
    const { verificationToken } = await verify(EMAIL);
    const id = await auth.registerUser({ verificationToken, name: "Aisha", pin: "4821", identifier: "victim@example.com", email: "victim@example.com" });
    expect((await db.user.findUniqueOrThrow({ where: { id } })).email).toBe(EMAIL);
  });

  it("requires a 4-digit PIN, a name, and a company name for providers", async () => {
    const { verificationToken } = await verify(EMAIL);
    await expect(auth.registerUser({ verificationToken, name: "Aisha", pin: "12345" })).rejects.toThrow("4 digits");
    await expect(auth.registerUser({ verificationToken, name: "Aisha", pin: 1234 })).rejects.toThrow("4 digits");
    await expect(auth.registerUser({ verificationToken, name: "A", pin: "4821" })).rejects.toThrow("name");
    await expect(auth.registerUser({ verificationToken, name: "Aisha", pin: "4821", as: "umrah" })).rejects.toThrow("company name");
  });

  it("refuses a second account for the same email", async () => {
    await signUp();
    await expect(signUp()).rejects.toMatchObject({ status: 409 });
  });
});

describe("loginWithPin", () => {
  it("signs in with a fresh code and the right PIN", async () => {
    const id = await signUp(EMAIL, "4821");
    const { verificationToken } = await verify(EMAIL);
    expect(await auth.loginWithPin({ verificationToken, pin: "4821" })).toBe(id);
  });

  it("refuses a wrong PIN and says how many attempts are left", async () => {
    await signUp(EMAIL, "4821");
    const { verificationToken } = await verify(EMAIL);
    await expect(auth.loginWithPin({ verificationToken, pin: "0000" })).rejects.toMatchObject({ status: 403, message: "Wrong PIN. 4 attempts left." });
  });

  it("needs the verification code as well as the PIN", async () => {
    await signUp(EMAIL, "4821");
    await expect(auth.loginWithPin({ pin: "4821" })).rejects.toMatchObject({ status: 401 });
    // A token for a different address does not open this account.
    await expect(auth.loginWithPin({ verificationToken: await signVerification("other@example.com"), pin: "4821" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("PIN lockout", () => {
  async function lockOut(userId: string) {
    for (let i = 0; i < auth.MAX_PIN_ATTEMPTS; i++) await auth.verifyPin(userId, { pin: "0000" }).catch(() => {});
  }

  it("unlocks the app with the right PIN and resets the wrong-attempt count", async () => {
    const id = await signUp(EMAIL, "4821");
    await auth.verifyPin(id, { pin: "0000" }).catch(() => {});
    expect(await auth.verifyPin(id, { pin: "4821" })).toEqual({ ok: true });
    expect((await db.user.findUniqueOrThrow({ where: { id } })).pinAttempts).toBe(0);
  });

  it("locks the PIN after five wrong attempts, so it cannot be guessed", async () => {
    const id = await signUp(EMAIL, "4821");
    const statuses: number[] = [];
    for (let i = 0; i < auth.MAX_PIN_ATTEMPTS; i++) {
      statuses.push(await auth.verifyPin(id, { pin: "0000" }).then(() => 200, (e: { status: number }) => e.status));
    }
    expect(statuses).toEqual([403, 403, 403, 403, 423]);
    // Even the correct PIN is refused once locked.
    await expect(auth.verifyPin(id, { pin: "4821" })).rejects.toMatchObject({ status: 423 });
  });

  it("stays locked for sign-in on another device too", async () => {
    const id = await signUp(EMAIL, "4821");
    await lockOut(id);
    const { verificationToken } = await verify(EMAIL);
    await expect(auth.loginWithPin({ verificationToken, pin: "4821" })).rejects.toMatchObject({ status: 423 });
  });

  it("is cleared by resetting the PIN with a verification code", async () => {
    const id = await signUp(EMAIL, "4821");
    await lockOut(id);
    const { verificationToken } = await verify(EMAIL);
    expect(await auth.resetPin({ verificationToken, pin: "7310" })).toBe(id);
    expect(await auth.verifyPin(id, { pin: "7310" })).toEqual({ ok: true });
    await expect(auth.verifyPin(id, { pin: "4821" })).rejects.toMatchObject({ status: 403 });
  });

  it("does not let a PIN be reset without a verification code", async () => {
    await signUp(EMAIL, "4821");
    await expect(auth.resetPin({ pin: "7310" })).rejects.toMatchObject({ status: 401 });
    await expect(auth.resetPin({ verificationToken: await signVerification("nobody@example.com"), pin: "7310" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("checkAdminPassword (web console)", () => {
  it("accepts an admin's password and rejects a wrong one", async () => {
    const admin = await db.user.create({ data: { name: "Admin", email: "admin@example.com", role: "ADMIN", passwordHash: await bcrypt.hash("password123", 4) } });
    expect(await auth.checkAdminPassword({ email: "ADMIN@example.com", password: "password123" })).toEqual({ id: admin.id, role: "ADMIN" });
    await expect(auth.checkAdminPassword({ email: "admin@example.com", password: "nope" })).rejects.toMatchObject({ status: 401 });
  });

  it("never matches app accounts, which have no password", async () => {
    await signUp(EMAIL, "4821");
    await expect(auth.checkAdminPassword({ email: EMAIL, password: "" })).rejects.toMatchObject({ status: 401 });
    await expect(auth.checkAdminPassword({ email: EMAIL, password: "4821" })).rejects.toMatchObject({ status: 401 });
  });
});
