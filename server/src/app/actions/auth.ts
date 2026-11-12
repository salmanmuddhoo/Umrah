"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { safeNext } from "@/lib/rules";
import { fromFormData, str, type FormState } from "@/lib/validate";
import { checkAdminPassword } from "@/services/auth";

/** Sign-in for the web admin console. Everyone else uses the mobile app. */
export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const input = fromFormData(fd);
  let user;
  try {
    user = await checkAdminPassword(input);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  if (user.role !== "ADMIN") return { error: "This console is for platform administrators. Please use the One Ummah app." };

  await createSession(user.id);
  redirect(safeNext(str(input, "next"), "/admin"));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
