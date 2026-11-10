import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { date, money, saudiDateTime } from "@/lib/format";
import { setBookingStatus } from "@/app/actions/bookings";
import { Empty, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "My bookings" };

function CancelButton({ kind, id, status }: { kind: "package" | "transport"; id: string; status: string }) {
  if (status !== "PENDING" && status !== "CONFIRMED") return null;
  return (
    <form action={setBookingStatus.bind(null, kind, id, "CANCELLED")}>
      <button className="btn-danger btn-sm">Cancel</button>
    </form>
  );
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const user = await requireUser("/bookings");
  const { booked } = await searchParams;
  const [packages, rides] = await Promise.all([
    db.packageBooking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { package: { include: { provider: { select: { companyName: true, phone: true } } } } },
    }),
    db.transportBooking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { service: { include: { provider: { select: { companyName: true, phone: true } } } } },
    }),
  ]);

  return (
    <div className="container-page max-w-4xl py-10">
      <h1 className="h1">My bookings</h1>
      {booked && (
        <p role="status" className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Your booking request has been sent. The provider will confirm it and contact you about payment.
        </p>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-brand-900">Umrah packages</h2>
      {packages.length === 0 ? (
        <Empty>
          No package bookings yet.{" "}
          <Link href="/packages" className="font-medium text-brand-700 hover:underline">
            Browse packages
          </Link>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {packages.map((b) => (
            <li key={b.id} className="card flex flex-wrap items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/packages/${b.packageId}`} className="font-semibold text-slate-900 hover:underline">
                  {b.package.title}
                </Link>
                <p className="text-slate-600">
                  Departs {date(b.package.departureDate)} · {b.travellers} traveller{b.travellers === 1 ? "" : "s"} ·{" "}
                  {b.package.provider.companyName}
                  {b.status === "CONFIRMED" && b.package.provider.phone && ` · ${b.package.provider.phone}`}
                </p>
              </div>
              <span className="font-semibold">{money(b.totalCents)}</span>
              <StatusBadge status={b.status} />
              <CancelButton kind="package" id={b.id} status={b.status} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-brand-900">Transport</h2>
      {rides.length === 0 ? (
        <Empty>
          No transport bookings yet.{" "}
          <Link href="/transport" className="font-medium text-brand-700 hover:underline">
            Browse transport
          </Link>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rides.map((b) => (
            <li key={b.id} className="card flex flex-wrap items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/transport/${b.serviceId}`} className="font-semibold text-slate-900 hover:underline">
                  {b.service.fromPlace} → {b.service.toPlace}
                </Link>
                <p className="text-slate-600">
                  {saudiDateTime(b.pickupAt)} (Saudi time) · {b.pickupLocation} · {b.passengers} passenger
                  {b.passengers === 1 ? "" : "s"} · {b.service.provider.companyName}
                  {b.status === "CONFIRMED" && b.service.provider.phone && ` · ${b.service.provider.phone}`}
                </p>
              </div>
              <span className="font-semibold">{money(b.totalCents)}</span>
              <StatusBadge status={b.status} />
              <CancelButton kind="transport" id={b.id} status={b.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
