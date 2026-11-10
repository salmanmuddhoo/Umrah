import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_LISTING } from "@/lib/queries";
import { VEHICLE_LABELS, VEHICLE_TYPES } from "@/lib/constants";
import { ServiceCard } from "@/components/ServiceCard";
import { Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Transport" };

export default async function TransportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = get("q");
  const type = (VEHICLE_TYPES as readonly string[]).includes(get("type")) ? get("type") : "";
  const pax = Number(get("pax"));

  const where: Prisma.TransportServiceWhereInput = {
    ...PUBLIC_LISTING,
    ...(q && {
      OR: [
        { title: { contains: q } },
        { fromPlace: { contains: q } },
        { toPlace: { contains: q } },
        { provider: { companyName: { contains: q } } },
      ],
    }),
    ...(type && { vehicleType: type }),
    ...(pax > 0 && { capacity: { gte: Math.floor(pax) } }),
  };
  const services = await db.transportService.findMany({ where, include: { provider: true }, orderBy: { priceCents: "asc" }, take: 60 });

  return (
    <div className="container-page py-10">
      <h1 className="h1">Transport</h1>
      <p className="muted mt-1">Airport transfers, intercity rides and ziyarah tours with licensed drivers.</p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} className="input" placeholder="Route or place, e.g. Jeddah Airport" aria-label="Search" />
        <select name="type" defaultValue={type} className="input" aria-label="Vehicle type">
          <option value="">Any vehicle</option>
          {VEHICLE_TYPES.map((v) => (
            <option key={v} value={v}>
              {VEHICLE_LABELS[v]}
            </option>
          ))}
        </select>
        <input name="pax" defaultValue={get("pax")} type="number" min="1" className="input" placeholder="Passengers" aria-label="Passengers" />
        <button className="btn-primary">Search</button>
      </form>

      <div className="mt-6">
        {services.length === 0 ? (
          <Empty>No transport matches your search.</Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
