import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { providerTypeLabel } from "@/lib/constants";
import { date } from "@/lib/format";
import { setProviderStatus } from "@/app/actions/admin";
import { Empty, StatusBadge } from "@/components/ui";

const ORDER = ["PENDING", "APPROVED", "SUSPENDED"];

export default async function AdminProviders() {
  await requireAdmin();
  const providers = (
    await db.provider.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, phone: true } }, _count: { select: { packages: true, services: true } } },
    })
  ).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-brand-900">Providers</h2>
      {providers.length === 0 ? (
        <Empty>No providers have registered yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {providers.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center gap-4 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {p.companyName}{" "}
                  <span className="badge bg-gold-100 text-gold-600">{providerTypeLabel(p.type)}</span>
                </p>
                <p className="text-slate-600">
                  {p.user.name} · {p.user.email ?? p.user.phone}
                  {p.phone && ` · ${p.phone}`}
                </p>
                <p className="text-xs text-slate-500">
                  {[p.city, p.country].filter(Boolean).join(", ") || "Location not given"} · Licence: {p.licenseNo || "not given"} ·{" "}
                  {p.type === "UMRAH" ? `${p._count.packages} packages` : p.type === "TRANSPORT" ? `${p._count.services} services` : "no listings yet"} · joined {date(p.createdAt)}
                </p>
              </div>
              <StatusBadge status={p.status} />
              {p.status !== "APPROVED" && (
                <form action={setProviderStatus.bind(null, p.id, "APPROVED")}>
                  <button className="btn-primary btn-sm">{p.status === "SUSPENDED" ? "Reinstate" : "Approve"}</button>
                </form>
              )}
              {p.status !== "SUSPENDED" && (
                <form action={setProviderStatus.bind(null, p.id, "SUSPENDED")}>
                  <button className="btn-danger btn-sm">{p.status === "PENDING" ? "Reject" : "Suspend"}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
