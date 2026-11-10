import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { savePackage } from "@/app/actions/provider";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { PackageFields } from "@/components/PackageFields";

export default async function NewPackage() {
  await requireProvider("UMRAH");
  return (
    <ActionForm action={savePackage.bind(null, null)} className="card space-y-5 p-6">
      <h2 className="text-lg font-semibold text-brand-900">New package</h2>
      <PackageFields />
      <div className="flex justify-end gap-2">
        <Link href="/dashboard/packages" className="btn-ghost">
          Cancel
        </Link>
        <SubmitButton>Publish package</SubmitButton>
      </div>
    </ActionForm>
  );
}
