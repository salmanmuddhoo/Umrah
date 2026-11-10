import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { seatsBooked } from "@/lib/queries";
import { date, money } from "@/lib/format";
import { bookPackage } from "@/app/actions/bookings";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { inclusions } from "@/components/PackageCard";
import { Field, Stars } from "@/components/ui";

async function load(id: string) {
  const [pkg, user] = await Promise.all([db.package.findUnique({ where: { id }, include: { provider: true } }), getUser()]);
  if (!pkg) return null;
  // Hidden listings stay visible to their owner (for previewing) and to admins.
  const isPublic = pkg.active && pkg.provider.status === "APPROVED";
  const canPreview = user?.role === "ADMIN" || user?.provider?.id === pkg.providerId;
  return isPublic || canPreview ? { pkg, user, isPublic } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await load((await params).id);
  return { title: found?.pkg.title ?? "Package" };
}

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await load(id);
  if (!found) notFound();
  const { pkg, user, isPublic } = found;

  const seatsLeft = pkg.seatsTotal - ((await seatsBooked([id])).get(id) ?? 0);
  const departed = pkg.departureDate < new Date();
  const bookable = isPublic && !departed && seatsLeft > 0;

  return (
    <div className="container-page py-10">
      <Link href="/packages" className="text-sm text-brand-700 hover:underline">
        ← All packages
      </Link>
      {!isPublic && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview only — this package is not visible to pilgrims yet.
        </p>
      )}
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <h1 className="h1">{pkg.title}</h1>
          <p className="muted mt-1">
            by {pkg.provider.companyName}
            {pkg.provider.city && ` · ${[pkg.provider.city, pkg.provider.country].filter(Boolean).join(", ")}`}
          </p>

          <dl className="card mt-6 grid grid-cols-2 gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-4">
            {[
              ["Departs", date(pkg.departureDate)],
              ["From", pkg.departureCity],
              ["Duration", `${pkg.durationDays} days`],
              ["Seats left", seatsLeft > 0 ? String(seatsLeft) : "Fully booked"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-8 text-lg font-semibold text-brand-900">Where you will stay</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            <li className="card p-4 text-sm">
              <p className="text-xs text-slate-500">Makkah · {pkg.makkahNights} nights</p>
              <p className="font-semibold">{pkg.makkahHotel}</p>
              <Stars n={pkg.hotelStars} />
            </li>
            {pkg.madinahNights > 0 && (
              <li className="card p-4 text-sm">
                <p className="text-xs text-slate-500">Madinah · {pkg.madinahNights} nights</p>
                <p className="font-semibold">{pkg.madinahHotel}</p>
              </li>
            )}
          </ul>

          <h2 className="mt-8 text-lg font-semibold text-brand-900">What is included</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {inclusions(pkg).length > 0 ? (
              inclusions(pkg).map((i) => (
                <span key={i} className="badge bg-brand-100 px-3 py-1 text-sm text-brand-800">
                  ✓ {i}
                </span>
              ))
            ) : (
              <p className="muted">Accommodation only.</p>
            )}
          </div>

          <h2 className="mt-8 text-lg font-semibold text-brand-900">About this package</h2>
          <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{pkg.description}</p>

          {pkg.provider.description && (
            <>
              <h2 className="mt-8 text-lg font-semibold text-brand-900">About {pkg.provider.companyName}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{pkg.provider.description}</p>
              {pkg.provider.licenseNo && <p className="muted mt-2">Licence no. {pkg.provider.licenseNo}</p>}
            </>
          )}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <p>
            <span className="text-3xl font-bold text-brand-800">{money(pkg.priceCents)}</span>
            <span className="text-sm text-slate-500"> per person</span>
          </p>
          {bookable ? (
            <ActionForm action={bookPackage.bind(null, pkg.id)} className="mt-4 space-y-4">
              <Field label="Travellers">
                <input name="travellers" type="number" min={1} max={Math.min(seatsLeft, 50)} defaultValue={1} required className="input" />
              </Field>
              <Field label="Contact phone" hint="Include your country code.">
                <input name="contactPhone" type="tel" required className="input" placeholder="+44 7700 900000" />
              </Field>
              <Field label="Notes for the provider (optional)">
                <textarea name="notes" rows={3} maxLength={1000} className="input" placeholder="Wheelchair needs, room preferences…" />
              </Field>
              <SubmitButton className="btn-primary w-full">{user ? "Request booking" : "Sign in to book"}</SubmitButton>
              <p className="text-xs text-slate-500">
                No payment is taken now. {pkg.provider.companyName} will confirm your booking and arrange payment with you.
              </p>
            </ActionForm>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              {!isPublic ? "Not open for booking." : departed ? "This package has departed." : "This package is fully booked."}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
