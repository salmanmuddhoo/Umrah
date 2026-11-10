import Link from "next/link";
import type { Provider, TransportService } from "@prisma/client";
import { VEHICLE_LABELS } from "@/lib/constants";
import { money } from "@/lib/format";

export function ServiceCard({ service }: { service: TransportService & { provider: Provider } }) {
  return (
    <Link href={`/transport/${service.id}`} className="card group flex flex-col gap-3 p-5 text-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-brand-900 group-hover:underline">{service.title}</h3>
        <span className="badge shrink-0 bg-gold-100 text-gold-600">{VEHICLE_LABELS[service.vehicleType] ?? service.vehicleType}</span>
      </div>
      <p className="font-medium text-slate-700">
        {service.fromPlace} <span aria-hidden>→</span> {service.toPlace}
      </p>
      <p className="text-slate-500">Up to {service.capacity} passengers</p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <p className="text-xs text-slate-500">by {service.provider.companyName}</p>
        <p className="text-right">
          <span className="text-xl font-bold text-brand-800">{money(service.priceCents)}</span>
          <span className="block text-xs text-slate-500">per trip</span>
        </p>
      </div>
    </Link>
  );
}
