import "server-only";
import { db } from "./db";

/** Seats already taken on each package (cancelled bookings free their seats). */
export async function seatsBooked(packageIds: string[]) {
  if (packageIds.length === 0) return new Map<string, number>();
  const rows = await db.packageBooking.groupBy({
    by: ["packageId"],
    where: { packageId: { in: packageIds }, status: { not: "CANCELLED" } },
    _sum: { travellers: true },
  });
  return new Map(rows.map((r) => [r.packageId, r._sum.travellers ?? 0]));
}

/** Filter that limits listings to ones the public may see. */
export const PUBLIC_LISTING = { active: true, provider: { status: "APPROVED" } } as const;
