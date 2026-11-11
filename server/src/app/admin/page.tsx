import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EARNING_STATUSES } from "@/lib/constants";
import { money } from "@/lib/format";
import { Empty, Stat } from "@/components/ui";

export default async function AdminHome() {
  await requireAdmin();
  const earning = { status: { in: EARNING_STATUSES } };
  const sum = { _sum: { totalCents: true, commissionCents: true }, _count: true } as const;

  const [pkg, ride, pendingProviders, pkgRows, rideRows, providers] = await Promise.all([
    db.packageBooking.aggregate({ where: earning, ...sum }),
    db.transportBooking.aggregate({ where: earning, ...sum }),
    db.provider.count({ where: { status: "PENDING" } }),
    db.packageBooking.findMany({ where: earning, select: { totalCents: true, commissionCents: true, package: { select: { providerId: true } } } }),
    db.transportBooking.findMany({ where: earning, select: { totalCents: true, commissionCents: true, service: { select: { providerId: true } } } }),
    db.provider.findMany({ select: { id: true, companyName: true, type: true } }),
  ]);

  // Commission owed per provider, across both booking types.
  const byProvider = new Map<string, { count: number; gross: number; commission: number }>();
  const add = (providerId: string, total: number, commission: number) => {
    const cur = byProvider.get(providerId) ?? { count: 0, gross: 0, commission: 0 };
    byProvider.set(providerId, { count: cur.count + 1, gross: cur.gross + total, commission: cur.commission + commission });
  };
  pkgRows.forEach((b) => add(b.package.providerId, b.totalCents, b.commissionCents));
  rideRows.forEach((b) => add(b.service.providerId, b.totalCents, b.commissionCents));
  const table = providers
    .filter((p) => byProvider.has(p.id))
    .map((p) => ({ ...p, ...byProvider.get(p.id)! }))
    .sort((a, b) => b.commission - a.commission);

  const pkgCommission = pkg._sum.commissionCents ?? 0;
  const rideCommission = ride._sum.commissionCents ?? 0;
  const gross = (pkg._sum.totalCents ?? 0) + (ride._sum.totalCents ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Platform revenue" value={money(pkgCommission + rideCommission)} hint="Commission on confirmed bookings" />
        <Stat label="From Umrah packages" value={money(pkgCommission)} hint={`${pkg._count} booking${pkg._count === 1 ? "" : "s"}`} />
        <Stat label="From transport" value={money(rideCommission)} hint={`${ride._count} booking${ride._count === 1 ? "" : "s"}`} />
        <Stat label="Booking volume" value={money(gross)} hint="Total paid to providers before commission" />
      </div>

      {pendingProviders > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendingProviders} provider{pendingProviders === 1 ? " is" : "s are"} waiting for approval.{" "}
          <Link href="/admin/providers" className="font-semibold underline">
            Review now
          </Link>
        </p>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-900">Commission by provider</h2>
        {table.length === 0 ? (
          <Empty>No confirmed bookings yet.</Empty>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Bookings</th>
                  <th className="px-4 py-3 text-right font-medium">Volume</th>
                  <th className="px-4 py-3 text-right font-medium">Commission owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {table.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.companyName}</td>
                    <td className="px-4 py-3">{r.type === "UMRAH" ? "Umrah" : "Transport"}</td>
                    <td className="px-4 py-3 text-right">{r.count}</td>
                    <td className="px-4 py-3 text-right">{money(r.gross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-800">{money(r.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
