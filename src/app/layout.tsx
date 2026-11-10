import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rihla — Umrah packages, transport and guidance", template: "%s · Rihla" },
  description:
    "Compare and book Umrah packages from licensed providers, arrange transport in Makkah and Madinah, follow a step-by-step Umrah guide and ask the community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-black/5 bg-white">
          <div className="container-page flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Rihla. May Allah accept your Umrah.</p>
            <nav className="flex gap-5">
              <Link href="/partners" className="hover:text-brand-700">
                List your packages or vehicles
              </Link>
              <Link href="/guide" className="hover:text-brand-700">
                Umrah guide
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
