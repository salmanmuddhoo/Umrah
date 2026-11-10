import Link from "next/link";
import { db } from "@/lib/db";
import { PUBLIC_LISTING, seatsBooked } from "@/lib/queries";
import { PackageCard } from "@/components/PackageCard";
import { ServiceCard } from "@/components/ServiceCard";
import { timeAgo } from "@/lib/format";

export default async function Home() {
  const [packages, services, posts] = await Promise.all([
    db.package.findMany({
      where: { ...PUBLIC_LISTING, departureDate: { gte: new Date() } },
      include: { provider: true },
      orderBy: { departureDate: "asc" },
      take: 3,
    }),
    db.transportService.findMany({ where: PUBLIC_LISTING, include: { provider: true }, orderBy: { priceCents: "asc" }, take: 3 }),
    db.post.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: { author: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
  ]);
  const booked = await seatsBooked(packages.map((p) => p.id));

  return (
    <>
      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white">
        <div className="container-page py-16 sm:py-24">
          <p className="text-left font-arabic text-2xl text-gold-400" lang="ar" dir="rtl">
            لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">Your Umrah, planned with confidence.</h1>
          <p className="mt-4 max-w-xl text-lg text-brand-100">
            Compare packages from vetted providers, arrange your rides between the airport, Makkah and Madinah, and
            prepare with a clear step-by-step guide.
          </p>
          <form action="/packages" className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
            <input
              name="q"
              className="input flex-1 border-0"
              placeholder="Search by departure city, hotel or provider"
              aria-label="Search packages"
            />
            <button className="btn-gold">Find packages</button>
          </form>
        </div>
      </section>

      <div className="container-page space-y-16 py-12">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/packages", title: "Umrah packages", text: "Flights, hotels and visas from approved providers." },
            { href: "/transport", title: "Transport", text: "Private cars, vans and coaches between the holy cities." },
            { href: "/guide", title: "Umrah guide", text: "Every rite explained, with the duas to recite." },
            { href: "/community", title: "Community", text: "Ask questions and share advice with other pilgrims." },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="card p-5 transition-shadow hover:shadow-md">
              <h2 className="font-semibold text-brand-800">{c.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{c.text}</p>
            </Link>
          ))}
        </section>

        {packages.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="h1">Departing soon</h2>
              <Link href="/packages" className="text-sm font-medium text-brand-700 hover:underline">
                All packages →
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <PackageCard key={p.id} pkg={p} seatsLeft={p.seatsTotal - (booked.get(p.id) ?? 0)} />
              ))}
            </div>
          </section>
        )}

        {services.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="h1">Getting around</h2>
              <Link href="/transport" className="text-sm font-medium text-brand-700 hover:underline">
                All transport →
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </section>
        )}

        {posts.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="h1">From the community</h2>
              <Link href="/community" className="text-sm font-medium text-brand-700 hover:underline">
                Join the discussion →
              </Link>
            </div>
            <ul className="card divide-y divide-black/5">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={`/community/${p.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                    <span className="w-10 text-center text-sm font-semibold text-brand-700">▲ {p.score}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{p.title}</span>
                      <span className="text-xs text-slate-500">
                        {p.author.name} · {timeAgo(p.createdAt)} · {p._count.comments} {p._count.comments === 1 ? "comment" : "comments"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card flex flex-col items-start gap-4 bg-brand-50 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Are you an Umrah operator or transport company?</h2>
            <p className="mt-1 text-slate-600">List your packages or fleet and receive bookings from pilgrims worldwide.</p>
          </div>
          <Link href="/partners" className="btn-primary shrink-0">
            Become a partner
          </Link>
        </section>
      </div>
    </>
  );
}
