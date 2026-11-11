"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // The first item is the section root, so it only matches exactly.
  const active = (href: string, i: number) => (i === 0 ? pathname === href : pathname.startsWith(href));
  return (
    <nav className="card flex h-fit gap-1 overflow-x-auto p-2 text-sm lg:flex-col">
      {items.map((it, i) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={active(it.href, i) ? "page" : undefined}
          className={`rounded-lg px-3 py-2 font-medium whitespace-nowrap ${
            active(it.href, i) ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
