"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { str, type FormState } from "@/lib/form";

/** Only follow same-site relative redirects. */
function safeNext(next: string, fallback: string) {
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name", 80);
  const email = str(fd, "email", 200).toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const as = str(fd, "as");
  const companyName = str(fd, "companyName", 120);

  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8 || password.length > 200) return { error: "Password must be at least 8 characters." };

  const providerType = as === "umrah" ? "UMRAH" : as === "transport" ? "TRANSPORT" : null;
  if (providerType && companyName.length < 2) return { error: "Please enter your company name." };

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: providerType === "UMRAH" ? "PROVIDER" : providerType === "TRANSPORT" ? "TRANSPORT" : "PILGRIM",
      provider: providerType
        ? {
            create: {
              type: providerType,
              companyName,
              country: str(fd, "country", 80),
              city: str(fd, "city", 80),
              phone: str(fd, "phone", 40),
              licenseNo: str(fd, "licenseNo", 80),
            },
          }
        : undefined,
    },
  });

  await createSession(user.id);
  redirect(providerType ? "/dashboard" : safeNext(str(fd, "next"), "/"));
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  await createSession(user.id);
  const home = user.role === "ADMIN" ? "/admin" : user.role === "PILGRIM" ? "/" : "/dashboard";
  redirect(safeNext(str(fd, "next"), home));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
