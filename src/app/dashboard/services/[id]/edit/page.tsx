import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { saveService } from "@/app/actions/provider";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ServiceFields } from "@/components/ServiceFields";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { provider } = await requireProvider("TRANSPORT");
  const service = await db.transportService.findFirst({ where: { id, providerId: provider.id } });
  if (!service) notFound();
  return (
    <ActionForm action={saveService.bind(null, service.id)} className="card space-y-5 p-6">
      <h2 className="text-lg font-semibold text-brand-900">Edit service</h2>
      <ServiceFields service={service} />
      <div className="flex justify-end gap-2">
        <Link href="/dashboard/services" className="btn-ghost">
          Cancel
        </Link>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </ActionForm>
  );
}
