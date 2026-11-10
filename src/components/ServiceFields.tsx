import type { TransportService } from "@prisma/client";
import { VEHICLE_LABELS, VEHICLE_TYPES } from "@/lib/constants";
import { Field } from "./ui";

export function ServiceFields({ service }: { service?: TransportService }) {
  return (
    <>
      <Field label="Title">
        <input name="title" required minLength={5} maxLength={120} defaultValue={service?.title} className="input" placeholder="Jeddah Airport to Makkah hotel — private GMC" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <input name="fromPlace" required maxLength={120} defaultValue={service?.fromPlace} className="input" placeholder="Jeddah Airport (JED)" />
        </Field>
        <Field label="To">
          <input name="toPlace" required maxLength={120} defaultValue={service?.toPlace} className="input" placeholder="Makkah" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Vehicle type">
          <select name="vehicleType" defaultValue={service?.vehicleType ?? "SEDAN"} className="input">
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {VEHICLE_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Passenger capacity">
          <input name="capacity" type="number" required min={1} max={80} defaultValue={service?.capacity} className="input" />
        </Field>
        <Field label="Price per trip (USD)">
          <input name="price" type="number" required min={1} step="0.01" defaultValue={service ? service.priceCents / 100 : undefined} className="input" />
        </Field>
      </div>
      <Field label="Description (optional)" hint="Vehicle model, luggage allowance, waiting time, child seats.">
        <textarea name="description" maxLength={2000} rows={4} defaultValue={service?.description} className="input" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-4 w-4 accent-brand-700" />
        Open for booking
      </label>
    </>
  );
}
