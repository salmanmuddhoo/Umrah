import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "umrah_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value === "change-me") {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return new TextEncoder().encode("dev-only-secret-do-not-use-in-production");
  }
  return new TextEncoder().encode(value);
}

/** Signed token identifying a user. The web console keeps it in a cookie; the mobile app sends it as a Bearer token. */
export async function signToken(userId: string) {
  return new SignJWT({ sub: userId, use: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.use === "session" ? (payload.sub ?? null) : null;
  } catch {
    return null;
  }
}

export const USER_SELECT = { id: true, name: true, email: true, phone: true, role: true, provider: true } as const;

const VERIFIED_FOR = 15 * 60;

/** Short-lived proof that someone just confirmed a code sent to `identifier`. Needed to register, sign in or reset a PIN. */
export async function signVerification(identifier: string) {
  return new SignJWT({ sub: identifier, use: "verified" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFIED_FOR}s`)
    .sign(secret());
}

/** The identifier a verification token vouches for, or null when it is missing, expired or not a verification token. */
export async function readVerification(token: unknown) {
  if (typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.use === "verified" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Keyed hash for one-time codes, so the database never holds a usable code. */
export function hashCode(identifier: string, code: string) {
  return createHmac("sha256", secret()).update(`${identifier}:${code}`).digest("hex");
}

/** The user behind an API request's `Authorization: Bearer <token>` header, or null. */
export async function getApiUser(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const userId = await verifyToken(header.slice(7).trim());
  return userId ? db.user.findUnique({ where: { id: userId }, select: USER_SELECT }) : null;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getApiUser>>>;

export async function createSession(userId: string) {
  const token = await signToken(userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user (with their provider profile, if any), or null. */
export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  return userId ? db.user.findUnique({ where: { id: userId }, select: USER_SELECT }) : null;
});

export async function requireUser(next?: string) {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/login");
  return user;
}
