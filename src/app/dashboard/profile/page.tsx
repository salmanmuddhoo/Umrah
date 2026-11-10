import { requireProvider } from "@/lib/auth";
import { updateProfile } from "@/app/actions/provider";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/ui";

export default async function ProfilePage() {
  const { provider } = await requireProvider();
  return (
    <ActionForm action={updateProfile} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold text-brand-900">Company profile</h2>
      <Field label="Company name">
        <input name="companyName" required minLength={2} maxLength={120} defaultValue={provider.companyName} className="input" />
      </Field>
      <Field label="About your company" hint="Shown to pilgrims on your listings.">
        <textarea name="description" rows={5} maxLength={2000} defaultValue={provider.description} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <input name="city" maxLength={80} defaultValue={provider.city} className="input" />
        </Field>
        <Field label="Country">
          <input name="country" maxLength={80} defaultValue={provider.country} className="input" />
        </Field>
        <Field label="Business phone" hint="Shared with customers once you confirm their booking.">
          <input name="phone" type="tel" maxLength={40} defaultValue={provider.phone} className="input" />
        </Field>
        <Field label="Licence / registration number">
          <input name="licenseNo" maxLength={80} defaultValue={provider.licenseNo} className="input" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </ActionForm>
  );
}
