import { db } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { date, money, saudiDateTime, timeAgo } from "@/lib/format";
import { setBookingStatus } from "@/app/actions/bookings";
import { Empty, StatusBadge } from "@/components/ui";

type Row = {
  id: string;
  status: string;
  createdAt: Date;
  title: string;
  detail: string;
  customer: string;
  email: string;
  phone: string;
  notes: string;
  totalCents: number;
  commissionCents: number;
};

function Actions({ kind, id, status }: { kind: "package" | "transport"; id: string; status: string }) {
  const btn = (to: string, label: string, cls: string) => (
    <form action={setBookingStatus.bind(null, kind, id, to)}>
      <button className={`${cls} btn-sm`}>{label}</button>
    </form>
  );
  if (status === "PENDING") return <>{btn("CONFIRMED", "Confirm", "btn-primary")}{btn("CANCELLED", "Decline", "btn-danger")}</>;
  if (status === "CONFIRMED") return <>{btn("COMPLETED", "Mark completed", "btn-ghost")}{btn("CANCELLED", "Cancel", "btn-danger")}</>;
  return null;
}

export default async function ProviderBookings() {
  const { provider } = await requireProvider();
  const kind = provider.type === "UMRAH" ? "package" : "transport";
  const customer = { select: { name: true, email: true } };

  const rows: Row[] =
    kind === "package"
      ? (
          await db.packageBooking.findMany({
            where: { package: { providerId: provider.id } },
            orderBy: { createdAt: "desc" },
            include: { package: { select: { title: true, departureDate: true } }, user: customer },
          })
        ).map((b) => ({
          ...b,
          title: b.package.title,
          detail: `Departs ${date(b.package.departureDate)} · ${b.travellers} traveller${b.travellers === 1 ? "" : "s"}`,
          customer: b.user.name,
          email: b.user.email,
          phone: b.contactPhone,
        }))
      : (
          await db.transportBooking.findMany({
            where: { service: { providerId: provider.id } },
            orderBy: { createdAt: "desc" },
            include: { service: { select: { title: true } }, user: customer },
          })
        ).map((b) => ({
          ...b,
          title: b.service.title,
          detail: `${saudiDateTime(b.pickupAt)} (Saudi time) · pickup: ${b.pickupLocation} · ${b.passengers} passenger${b.passengers === 1 ? "" : "s"}`,
          customer: b.user.name,
          email: b.user.email,
          phone: b.contactPhone,
        }));

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-brand-900">Bookings</h2>
      {rows.length === 0 ? (
        <Empty>No bookings yet. They will appear here as soon as a pilgrim books.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => (
            <li key={b.id} className="card p-4 text-sm">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{b.title}</p>
                  <p className="text-slate-600">{b.detail}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-2 text-slate-700">
                <span className="font-medium">{b.customer}</span> · <a href={`mailto:${b.email}`} className="text-brand-700 hover:underline">{b.email}</a> ·{" "}
                <a href={`tel:${b.phone}`} className="text-brand-700 hover:underline">{b.phone}</a>
                <span className="text-slate-400"> · requested {timeAgo(b.createdAt)}</span>
              </p>
              {b.notes && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">“{b.notes}”</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-slate-600">
                  <span className="font-semibold text-slate-900">{money(b.totalCents)}</span> · commission {money(b.commissionCents)} · you
                  receive {money(b.totalCents - b.commissionCents)}
                </p>
                <Actions kind={kind} id={b.id} status={b.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
