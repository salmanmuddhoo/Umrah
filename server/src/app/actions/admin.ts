"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { createAd } from "@/services/ads";
import { validRate } from "@/lib/rules";
import { fromFormData, str, type FormState } from "@/lib/validate";

export async function setProviderStatus(providerId: string, status: "APPROVED" | "SUSPENDED" | "PENDING") {
  await requireAdmin();
  if (!["APPROVED", "SUSPENDED", "PENDING"].includes(status)) return;
  await db.provider.update({ where: { id: providerId }, data: { status } });
  revalidatePath("/admin", "layout");
}

export async function saveCommission(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const input = fromFormData(fd);
  // An empty field must not silently become a 0% rate.
  const read = (key: string) => (str(input, key) === "" ? NaN : Number(str(input, key)));
  const pkg = read("package");
  const transport = read("transport");
  if (!validRate(pkg, 50) || !validRate(transport, 50)) return { error: "Commission rates must be between 0 and 50%." };

  for (const [key, value] of [
    ["commission_package_pct", String(pkg)],
    ["commission_transport_pct", String(transport)],
  ]) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  revalidatePath("/admin", "layout");
  return { ok: "Commission rates saved. They apply to new bookings from now on." };
}

export async function saveAd(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await createAd(fromFormData(fd));
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/ads");
  return { ok: "Ad created. It is now in rotation on the app's Home tab (within its dates)." };
}

export async function setAdActive(adId: string, active: boolean) {
  await requireAdmin();
  await db.ad.updateMany({ where: { id: adId }, data: { active } });
  revalidatePath("/admin/ads");
}

export async function deleteAd(adId: string) {
  await requireAdmin();
  await db.ad.deleteMany({ where: { id: adId } });
  revalidatePath("/admin/ads");
}
