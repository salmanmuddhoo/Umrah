import type { Metadata } from "next";
import Link from "next/link";
import { getCommissionRates } from "@/lib/settings";

export const metadata: Metadata = { title: "Become a partner" };

export default async function PartnersPage() {
  const rates = await getCommissionRates();
  const plans = [
    {
      as: "umrah",
      title: "Umrah providers",
      rate: rates.package,
      points: ["Publish unlimited packages", "Track seats and bookings in one dashboard", "Confirm or decline each request"],
    },
    {
      as: "transport",
      title: "Transport providers",
      rate: rates.transport,
      points: ["List your routes and vehicles", "Receive pickup details with every booking", "Confirm or decline each request"],
    },
  ];
  return (
    <div className="container-page max-w-4xl py-14">
      <h1 className="h1">Grow your business with Rihla</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Listing is free. We only charge a commission on bookings you confirm, so we earn when you do.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.as} className="card flex flex-col p-6">
            <h2 className="text-lg font-bold text-brand-900">{p.title}</h2>
            <p className="mt-2">
              <span className="text-3xl font-bold text-brand-700">{p.rate}%</span>
              <span className="text-sm text-slate-500"> commission per confirmed booking</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
              {p.points.map((x) => (
                <li key={x}>✓ {x}</li>
              ))}
            </ul>
            <Link href={`/register?as=${p.as}`} className="btn-primary mt-6">
              Register as {p.as === "umrah" ? "an Umrah" : "a transport"} provider
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
