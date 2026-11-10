import type { Package } from "@prisma/client";
import { Field } from "./ui";

const INCLUDES = [
  ["incFlights", "Flights"],
  ["incVisa", "Visa"],
  ["incMeals", "Meals"],
  ["incTransport", "Ground transport"],
  ["incZiyarah", "Ziyarah tours"],
] as const;

export function PackageFields({ pkg }: { pkg?: Package }) {
  return (
    <>
      <Field label="Title">
        <input name="title" required minLength={5} maxLength={120} defaultValue={pkg?.title} className="input" placeholder="14-day Ramadan Umrah, 5★ hotels" />
      </Field>
      <Field label="Description" hint="Itinerary, group leader, distance of hotels from the Haram, what is not included.">
        <textarea name="description" required minLength={20} maxLength={4000} rows={6} defaultValue={pkg?.description} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Departure city">
          <input name="departureCity" required maxLength={80} defaultValue={pkg?.departureCity} className="input" />
        </Field>
        <Field label="Departure date">
          <input name="departureDate" type="date" required defaultValue={pkg?.departureDate.toISOString().slice(0, 10)} className="input" />
        </Field>
        <Field label="Duration (days)">
          <input name="durationDays" type="number" required min={1} max={90} defaultValue={pkg?.durationDays} className="input" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Makkah hotel">
          <input name="makkahHotel" required maxLength={120} defaultValue={pkg?.makkahHotel} className="input" />
        </Field>
        <Field label="Nights in Makkah">
          <input name="makkahNights" type="number" required min={1} max={90} defaultValue={pkg?.makkahNights} className="input" />
        </Field>
        <Field label="Madinah hotel (optional)">
          <input name="madinahHotel" maxLength={120} defaultValue={pkg?.madinahHotel} className="input" />
        </Field>
        <Field label="Nights in Madinah">
          <input name="madinahNights" type="number" min={0} max={90} defaultValue={pkg?.madinahNights ?? 0} className="input" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hotel rating">
          <select name="hotelStars" defaultValue={pkg?.hotelStars ?? 4} className="input">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price per person (USD)">
          <input name="price" type="number" required min={1} step="0.01" defaultValue={pkg ? pkg.priceCents / 100 : undefined} className="input" />
        </Field>
        <Field label="Total seats">
          <input name="seatsTotal" type="number" required min={1} max={5000} defaultValue={pkg?.seatsTotal} className="input" />
        </Field>
      </div>
      <fieldset>
        <legend className="label">Included in the price</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {INCLUDES.map(([name, label]) => (
            <label key={name} className="flex items-center gap-2">
              <input type="checkbox" name={name} defaultChecked={pkg?.[name] ?? false} className="h-4 w-4 accent-brand-700" /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} className="h-4 w-4 accent-brand-700" />
        Open for booking
      </label>
    </>
  );
}
