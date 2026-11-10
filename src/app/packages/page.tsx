import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_LISTING, seatsBooked } from "@/lib/queries";
import { PackageCard } from "@/components/PackageCard";
import { Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Umrah packages" };

const SORTS: Record<string, Prisma.PackageOrderByWithRelationInput> = {
  date: { departureDate: "asc" },
  price: { priceCents: "asc" },
  "price-desc": { priceCents: "desc" },
  duration: { durationDays: "asc" },
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = get("q");
  const maxPrice = Number(get("max"));
  const stars = Number(get("stars"));
  const sort = get("sort") in SORTS ? get("sort") : "date";

  const where: Prisma.PackageWhereInput = {
    ...PUBLIC_LISTING,
    departureDate: { gte: new Date() },
    ...(q && {
      OR: [
        { title: { contains: q } },
        { departureCity: { contains: q } },
        { makkahHotel: { contains: q } },
        { madinahHotel: { contains: q } },
        { provider: { companyName: { contains: q } } },
      ],
    }),
    ...(maxPrice > 0 && { priceCents: { lte: Math.round(maxPrice * 100) } }),
    ...(stars >= 1 && stars <= 5 && { hotelStars: { gte: stars } }),
  };

  const packages = await db.package.findMany({ where, include: { provider: true }, orderBy: SORTS[sort], take: 60 });
  const booked = await seatsBooked(packages.map((p) => p.id));

  return (
    <div className="container-page py-10">
      <h1 className="h1">Umrah packages</h1>
      <p className="muted mt-1">Every provider is reviewed before their packages are listed.</p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} className="input" placeholder="City, hotel or provider" aria-label="Search" />
        <input name="max" defaultValue={get("max")} type="number" min="0" className="input" placeholder="Max price (USD)" aria-label="Maximum price per person" />
        <select name="stars" defaultValue={get("stars")} className="input" aria-label="Minimum hotel rating">
          <option value="">Any hotel rating</option>
          <option value="3">3★ and up</option>
          <option value="4">4★ and up</option>
          <option value="5">5★ only</option>
        </select>
        <select name="sort" defaultValue={sort} className="input" aria-label="Sort by">
          <option value="date">Soonest departure</option>
          <option value="price">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="duration">Shortest trip</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>

      <div className="mt-6">
        {packages.length === 0 ? (
          <Empty>No packages match your search. Try widening your filters.</Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} seatsLeft={p.seatsTotal - (booked.get(p.id) ?? 0)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
