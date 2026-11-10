import Link from "next/link";
import { db } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { seatsBooked } from "@/lib/queries";
import { date, money } from "@/lib/format";
import { deletePackage } from "@/app/actions/provider";
import { Empty } from "@/components/ui";

export default async function MyPackages() {
  const { provider } = await requireProvider("UMRAH");
  const packages = await db.package.findMany({ where: { providerId: provider.id }, orderBy: { departureDate: "asc" } });
  const booked = await seatsBooked(packages.map((p) => p.id));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-900">Your packages</h2>
        <Link href="/dashboard/packages/new" className="btn-primary btn-sm">
          Add a package
        </Link>
      </div>
      {packages.length === 0 ? (
        <Empty>You have not listed any packages yet.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium">Departs</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Seats sold</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {packages.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link href={`/packages/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{date(p.departureDate)}</td>
                  <td className="px-4 py-3">{money(p.priceCents)}</td>
                  <td className="px-4 py-3">
                    {booked.get(p.id) ?? 0} / {p.seatsTotal}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.active ? "bg-brand-100 text-brand-800" : "bg-slate-200 text-slate-600"}`}>
                      {p.active ? "Open" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/packages/${p.id}/edit`} className="btn-ghost btn-sm">
                        Edit
                      </Link>
                      <form action={deletePackage.bind(null, p.id)}>
                        <button className="btn-danger btn-sm" title="Packages with open bookings are hidden instead of deleted">
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
