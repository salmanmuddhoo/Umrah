import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { savePackage } from "@/app/actions/provider";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { PackageFields } from "@/components/PackageFields";

export default async function EditPackage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { provider } = await requireProvider("UMRAH");
  const pkg = await db.package.findFirst({ where: { id, providerId: provider.id } });
  if (!pkg) notFound();
  return (
    <ActionForm action={savePackage.bind(null, pkg.id)} className="card space-y-5 p-6">
      <h2 className="text-lg font-semibold text-brand-900">Edit package</h2>
      <PackageFields pkg={pkg} />
      <div className="flex justify-end gap-2">
        <Link href="/dashboard/packages" className="btn-ghost">
          Cancel
        </Link>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </ActionForm>
  );
}
