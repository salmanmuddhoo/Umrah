import Link from "next/link";
import type { Package, Provider } from "@prisma/client";
import { date, money } from "@/lib/format";
import { Stars } from "./ui";

export function inclusions(p: Package) {
  return [
    p.incFlights && "Flights",
    p.incVisa && "Visa",
    p.incMeals && "Meals",
    p.incTransport && "Ground transport",
    p.incZiyarah && "Ziyarah tours",
  ].filter(Boolean) as string[];
}

export function PackageCard({ pkg, seatsLeft }: { pkg: Package & { provider: Provider }; seatsLeft: number }) {
  return (
    <Link href={`/packages/${pkg.id}`} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-4 text-white">
        <p className="text-xs text-brand-200">
          {pkg.durationDays} days · from {pkg.departureCity}
        </p>
        <h3 className="mt-1 text-lg leading-snug font-semibold group-hover:underline">{pkg.title}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 text-sm">
        <p className="text-slate-600">
          <Stars n={pkg.hotelStars} /> {pkg.makkahHotel}
          {pkg.madinahNights > 0 && ` + ${pkg.madinahHotel}`}
        </p>
        <p className="text-slate-600">
          Departs {date(pkg.departureDate)} · {pkg.makkahNights} nights Makkah
          {pkg.madinahNights > 0 && `, ${pkg.madinahNights} Madinah`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {inclusions(pkg).map((i) => (
            <span key={i} className="badge bg-brand-50 text-brand-700">
              {i}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-xs text-slate-500">by {pkg.provider.companyName}</p>
            <p className={`text-xs ${seatsLeft <= 5 ? "font-medium text-amber-700" : "text-slate-500"}`}>
              {seatsLeft > 0 ? `${seatsLeft} seats left` : "Fully booked"}
            </p>
          </div>
          <p className="text-right">
            <span className="text-xl font-bold text-brand-800">{money(pkg.priceCents)}</span>
            <span className="block text-xs text-slate-500">per person</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
