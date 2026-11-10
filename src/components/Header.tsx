import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

const NAV = [
  { href: "/packages", label: "Packages" },
  { href: "/transport", label: "Transport" },
  { href: "/guide", label: "Umrah guide" },
  { href: "/community", label: "Community" },
];

export async function Header() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-800">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-gold-400">
            ۞
          </span>
          Rihla
        </Link>
        <nav className="order-3 flex w-full gap-5 overflow-x-auto text-sm font-medium text-slate-600 sm:order-none sm:w-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-brand-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="btn-ghost btn-sm">
                  Admin
                </Link>
              )}
              {user.provider && (
                <Link href="/dashboard" className="btn-ghost btn-sm">
                  Dashboard
                </Link>
              )}
              <Link href="/bookings" className="btn-ghost btn-sm">
                My bookings
              </Link>
              <form action={logout}>
                <button className="btn btn-sm text-slate-500 hover:text-slate-900" title={`Signed in as ${user.name}`}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary btn-sm">
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
