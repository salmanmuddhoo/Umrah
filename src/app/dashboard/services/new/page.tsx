import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { saveService } from "@/app/actions/provider";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ServiceFields } from "@/components/ServiceFields";

export default async function NewService() {
  await requireProvider("TRANSPORT");
  return (
    <ActionForm action={saveService.bind(null, null)} className="card space-y-5 p-6">
      <h2 className="text-lg font-semibold text-brand-900">New transport service</h2>
      <ServiceFields />
      <div className="flex justify-end gap-2">
        <Link href="/dashboard/services" className="btn-ghost">
          Cancel
        </Link>
        <SubmitButton>Publish service</SubmitButton>
      </div>
    </ActionForm>
  );
}
