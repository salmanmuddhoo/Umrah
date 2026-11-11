import { requireAdmin } from "@/lib/auth";
import { GUIDE_PRICES } from "@/lib/constants";
import { getGuidePrices } from "@/lib/settings";
import { saveGuidePrices } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export default async function AdminPrices() {
  await requireAdmin();
  const prices = await getGuidePrices();
  return (
    <ActionForm action={saveGuidePrices} className="card max-w-2xl space-y-4 p-6">
      <h2 className="text-lg font-semibold text-brand-900">Guide prices</h2>
      <p className="muted">
        These are the prices quoted in the app&apos;s Visa and Zamzam guides. Saudi fees change, so check them against the official
        sources now and then and update the &ldquo;last checked&rdquo; date, which readers see next to every price.
      </p>
      {GUIDE_PRICES.map((p) => (
        <Field key={p.key} label={p.label}>
          <input name={p.key} required maxLength={160} defaultValue={prices[p.key]} className="input" />
        </Field>
      ))}
      <SubmitButton>Save prices</SubmitButton>
    </ActionForm>
  );
}
