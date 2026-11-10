import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { providerStats } from "@/lib/provider-stats";
import { getCommissionRates } from "@/lib/settings";
import { money } from "@/lib/format";
import { Stat } from "@/components/ui";

export default async function DashboardHome() {
  const { provider } = await requireProvider();
  const isUmrah = provider.type === "UMRAH";
  const [stats, rates] = await Promise.all([providerStats(provider.id, provider.type), getCommissionRates()]);
  const rate = isUmrah ? rates.package : rates.transport;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={isUmrah ? "Active packages" : "Active services"} value={stats.listings} />
        <Stat label="Requests awaiting you" value={stats.pending} hint="Confirm or decline in Bookings" />
        <Stat label="Confirmed sales" value={money(stats.gross)} hint={`${stats.confirmed} booking${stats.confirmed === 1 ? "" : "s"}`} />
        <Stat label="Your earnings" value={money(stats.gross - stats.commission)} hint={`After ${money(stats.commission)} platform commission`} />
      </div>

      <div className="card p-5 text-sm text-slate-700">
        <h2 className="font-semibold text-brand-900">How billing works</h2>
        <p className="mt-2">
          Listing is free. Rihla charges <strong>{rate}%</strong> commission on each booking you confirm. The rate is fixed
          at the moment the pilgrim books, and cancelled bookings are never charged.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={isUmrah ? "/dashboard/packages/new" : "/dashboard/services/new"} className="btn-primary">
          {isUmrah ? "Add a package" : "Add a service"}
        </Link>
        <Link href="/dashboard/bookings" className="btn-ghost">
          View bookings
        </Link>
      </div>
    </div>
  );
}
