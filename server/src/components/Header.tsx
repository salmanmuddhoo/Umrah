import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export async function Header() {
  const user = await getUser();
  return (
    <header className="border-b border-black/5 bg-white">
      <div className="container-page flex items-center gap-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-800">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-900 to-teal-700 text-gold-100">
            <LogoMark />
          </span>
          One Ummah
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

/** The One Ummah mark: a hand with the index finger raised, as in the shahada. Same drawing as mobile/assets/brand/logo-mark.svg. */
function LogoMark() {
  return (
    <svg viewBox="0 0 100 100" className="h-7 w-7" style={{ ["--line" as string]: "#064e3b" }}>
  <g fill="currentColor" stroke="var(--line)" strokeWidth="2.8" strokeLinejoin="round">
    <path d="M42 50 V17 a7.5 7.5 0 0 1 15 0 V50 Z"/>
    <path d="M33 47 h33 a9 9 0 0 1 9 9 v15 c0 10 -7 17 -16 18 h-15 c-8 0 -14 -6 -14 -14 v-19 a9 9 0 0 1 3 -9 Z"/>
    <rect x="57" y="47" width="21" height="11" rx="5.5"/>
    <rect x="57" y="58" width="21" height="11" rx="5.5"/>
    <rect x="57" y="69" width="19" height="11" rx="5.5"/>
    <path d="M27 66 c0 -4 3 -6 7 -6 h18 a5.5 5.5 0 0 1 0 11 h-18 c-4 0 -7 -2 -7 -5 Z"/>
  </g>
  <path d="M45.5 15 a4 4 0 0 1 8 0 v3 h-8 Z" fill="var(--line)" opacity=".18"/>
    </svg>
  );
}
