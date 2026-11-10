import { requireAdmin } from "@/lib/auth";
import { getCommissionRates } from "@/lib/settings";
import { saveCommission } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export default async function AdminSettings() {
  await requireAdmin();
  const rates = await getCommissionRates();
  return (
    <ActionForm action={saveCommission} className="card max-w-lg space-y-4 p-6">
      <h2 className="text-lg font-semibold text-brand-900">Commission rates</h2>
      <p className="muted">
        The percentage Rihla keeps from each confirmed booking. Changes apply to new bookings only — existing bookings
        keep the rate they were made at.
      </p>
      <Field label="Umrah packages (%)">
        <input name="package" type="number" required min={0} max={50} step="0.1" defaultValue={rates.package} className="input" />
      </Field>
      <Field label="Transport (%)">
        <input name="transport" type="number" required min={0} max={50} step="0.1" defaultValue={rates.transport} className="input" />
      </Field>
      <SubmitButton>Save rates</SubmitButton>
    </ActionForm>
  );
}
