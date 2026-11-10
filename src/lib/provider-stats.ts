import "server-only";
import { db } from "./db";
import { EARNING_STATUSES } from "./constants";

/** Booking totals for one provider, whichever kind of listing they sell. */
export async function providerStats(providerId: string, type: string) {
  const earning = { status: { in: EARNING_STATUSES } };
  if (type === "UMRAH") {
    const scope = { package: { providerId } };
    const [listings, pending, sums] = await Promise.all([
      db.package.count({ where: { providerId, active: true } }),
      db.packageBooking.count({ where: { ...scope, status: "PENDING" } }),
      db.packageBooking.aggregate({ where: { ...scope, ...earning }, _sum: { totalCents: true, commissionCents: true }, _count: true }),
    ]);
    return { listings, pending, confirmed: sums._count, gross: sums._sum.totalCents ?? 0, commission: sums._sum.commissionCents ?? 0 };
  }
  const scope = { service: { providerId } };
  const [listings, pending, sums] = await Promise.all([
    db.transportService.count({ where: { providerId, active: true } }),
    db.transportBooking.count({ where: { ...scope, status: "PENDING" } }),
    db.transportBooking.aggregate({ where: { ...scope, ...earning }, _sum: { totalCents: true, commissionCents: true }, _count: true }),
  ]);
  return { listings, pending, confirmed: sums._count, gross: sums._sum.totalCents ?? 0, commission: sums._sum.commissionCents ?? 0 };
}
