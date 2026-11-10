import type { Metadata } from "next";
import { requireProvider } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";

export const metadata: Metadata = { title: "Provider dashboard" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { provider } = await requireProvider();
  const listings =
    provider.type === "UMRAH"
      ? { href: "/dashboard/packages", label: "Packages" }
      : { href: "/dashboard/services", label: "Services" };

  return (
    <div className="container-page py-8">
      <p className="text-xs font-semibold tracking-wide text-gold-600 uppercase">
        {provider.type === "UMRAH" ? "Umrah provider" : "Transport provider"}
      </p>
      <h1 className="h1">{provider.companyName}</h1>

      {provider.status === "PENDING" && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your account is awaiting approval. You can set up your listings now — they will go live as soon as we have
          verified your business.
        </p>
      )}
      {provider.status === "SUSPENDED" && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Your account is suspended and your listings are hidden. Please contact support.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]">
        <SideNav
          items={[
            { href: "/dashboard", label: "Overview" },
            listings,
            { href: "/dashboard/bookings", label: "Bookings" },
            { href: "/dashboard/profile", label: "Company profile" },
          ]}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
