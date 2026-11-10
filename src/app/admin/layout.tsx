import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-page py-8">
      <p className="text-xs font-semibold tracking-wide text-gold-600 uppercase">Platform admin</p>
      <h1 className="h1">Rihla back office</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]">
        <SideNav
          items={[
            { href: "/admin", label: "Revenue" },
            { href: "/admin/providers", label: "Providers" },
            { href: "/admin/settings", label: "Commission" },
          ]}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
