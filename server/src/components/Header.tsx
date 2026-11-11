import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export async function Header() {
  const user = await getUser();
  return (
    <header className="border-b border-black/5 bg-white">
      <div className="container-page flex items-center gap-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-800">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-gold-400">
            ۞
          </span>
          My Ummah
        </Link>
        <span className="text-sm text-slate-500">Admin console</span>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {user ? (
            <form action={logout}>
              <button className="btn btn-sm text-slate-500 hover:text-slate-900" title={`Signed in as ${user.name}`}>
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn-ghost btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
