"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { str, type FormState } from "@/lib/form";

export async function setProviderStatus(providerId: string, status: "APPROVED" | "SUSPENDED" | "PENDING") {
  await requireAdmin();
  if (!["APPROVED", "SUSPENDED", "PENDING"].includes(status)) return;
  await db.provider.update({ where: { id: providerId }, data: { status } });
  revalidatePath("/admin", "layout");
  revalidatePath("/packages");
  revalidatePath("/transport");
}

export async function saveCommission(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const pkg = Number(str(fd, "package"));
  const transport = Number(str(fd, "transport"));
  const valid = (n: number) => Number.isFinite(n) && n >= 0 && n <= 50;
  if (!valid(pkg) || !valid(transport)) return { error: "Commission rates must be between 0 and 50%." };

  for (const [key, value] of [
    ["commission_package_pct", String(pkg)],
    ["commission_transport_pct", String(transport)],
  ]) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  revalidatePath("/admin", "layout");
  return { ok: "Commission rates saved. They apply to new bookings from now on." };
}
