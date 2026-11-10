import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { VEHICLE_LABELS } from "@/lib/constants";
import { money } from "@/lib/format";
import { bookTransport } from "@/app/actions/bookings";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [service, user] = await Promise.all([
    db.transportService.findUnique({ where: { id }, include: { provider: true } }),
    getUser(),
  ]);
  if (!service) notFound();
  const isPublic = service.active && service.provider.status === "APPROVED";
  if (!isPublic && user?.role !== "ADMIN" && user?.provider?.id !== service.providerId) notFound();

  return (
    <div className="container-page py-10">
      <Link href="/transport" className="text-sm text-brand-700 hover:underline">
        ← All transport
      </Link>
      {!isPublic && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview only — this service is not visible to pilgrims yet.
        </p>
      )}
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <h1 className="h1">{service.title}</h1>
          <p className="muted mt-1">by {service.provider.companyName}</p>

          <dl className="card mt-6 grid grid-cols-2 gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-4">
            {[
              ["From", service.fromPlace],
              ["To", service.toPlace],
              ["Vehicle", VEHICLE_LABELS[service.vehicleType] ?? service.vehicleType],
              ["Capacity", `${service.capacity} passengers`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          {service.description && (
            <p className="mt-6 leading-relaxed whitespace-pre-line text-slate-700">{service.description}</p>
          )}
          {service.provider.description && (
            <>
              <h2 className="mt-8 text-lg font-semibold text-brand-900">About {service.provider.companyName}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{service.provider.description}</p>
            </>
          )}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <p>
            <span className="text-3xl font-bold text-brand-800">{money(service.priceCents)}</span>
            <span className="text-sm text-slate-500"> per trip</span>
          </p>
          {isPublic ? (
            <ActionForm action={bookTransport.bind(null, service.id)} className="mt-4 space-y-4">
              <Field label="Pickup date and time" hint="Saudi Arabia local time.">
                <input name="pickupAt" type="datetime-local" required className="input" />
              </Field>
              <Field label="Pickup location" hint="Terminal, hotel name or address.">
                <input name="pickupLocation" required minLength={3} maxLength={200} className="input" />
              </Field>
              <Field label="Passengers">
                <input name="passengers" type="number" min={1} max={service.capacity} defaultValue={1} required className="input" />
              </Field>
              <Field label="Contact phone" hint="Include your country code.">
                <input name="contactPhone" type="tel" required className="input" placeholder="+44 7700 900000" />
              </Field>
              <Field label="Notes for the driver (optional)">
                <textarea name="notes" rows={2} maxLength={1000} className="input" placeholder="Flight number, luggage, child seats…" />
              </Field>
              <SubmitButton className="btn-primary w-full">{user ? "Request booking" : "Sign in to book"}</SubmitButton>
              <p className="text-xs text-slate-500">No payment is taken now. The provider will confirm and arrange payment with you.</p>
            </ActionForm>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">Not open for booking.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
