import Link from "next/link";
import { db } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { VEHICLE_LABELS } from "@/lib/constants";
import { money } from "@/lib/format";
import { deleteService } from "@/app/actions/provider";
import { Empty } from "@/components/ui";

export default async function MyServices() {
  const { provider } = await requireProvider("TRANSPORT");
  const services = await db.transportService.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-900">Your services</h2>
        <Link href="/dashboard/services/new" className="btn-primary btn-sm">
          Add a service
        </Link>
      </div>
      {services.length === 0 ? (
        <Empty>You have not listed any transport services yet.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link href={`/transport/${s.id}`} className="font-medium text-slate-900 hover:underline">
                      {s.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {s.fromPlace} → {s.toPlace}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {VEHICLE_LABELS[s.vehicleType]} · {s.capacity} pax
                  </td>
                  <td className="px-4 py-3">{money(s.priceCents)}</td>
                  <td className="px-4 py-3">{s._count.bookings}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${s.active ? "bg-brand-100 text-brand-800" : "bg-slate-200 text-slate-600"}`}>
                      {s.active ? "Open" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/services/${s.id}/edit`} className="btn-ghost btn-sm">
                        Edit
                      </Link>
                      <form action={deleteService.bind(null, s.id)}>
                        <button className="btn-danger btn-sm" title="Services with open bookings are hidden instead of deleted">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
