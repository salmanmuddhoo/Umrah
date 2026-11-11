import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AD_THEMES } from "@/lib/constants";
import { date } from "@/lib/format";
import { deleteAd, saveAd, setAdActive } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty, Field } from "@/components/ui";

function state(ad: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!ad.active) return { label: "Paused", cls: "bg-slate-200 text-slate-600" };
  if (ad.startsAt && ad.startsAt > now) return { label: "Scheduled", cls: "bg-amber-100 text-amber-800" };
  if (ad.endsAt && ad.endsAt < now) return { label: "Ended", cls: "bg-slate-200 text-slate-600" };
  return { label: "Running", cls: "bg-brand-100 text-brand-800" };
}

export default async function AdminAds() {
  await requireAdmin();
  const [ads, packages, services] = await Promise.all([
    db.ad.findMany({ orderBy: { createdAt: "desc" }, include: { package: { select: { title: true } }, service: { select: { title: true } } } }),
    db.package.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, provider: { select: { companyName: true } } } }),
    db.transportService.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, provider: { select: { companyName: true } } } }),
  ]);
  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-brand-900">Advertising</h2>
        <p className="muted mt-1">
          Ads rotate in the banner at the top of the app&apos;s Home tab, marked &ldquo;Sponsored&rdquo;. Up to 10 run at once, newest first.
        </p>
      </div>

      {ads.length === 0 ? (
        <Empty>No ads yet. Create the first one below.</Empty>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => {
            const s = state(ad, now);
            return (
              <li key={ad.id} className="card flex flex-wrap items-center gap-4 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{ad.headline}</p>
                  <p className="text-slate-600">
                    {ad.advertiser}
                    {ad.body && ` · ${ad.body}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Opens: {ad.package?.title ?? ad.service?.title ?? "nothing"} · {ad.startsAt ? date(ad.startsAt) : "now"} →{" "}
                    {ad.endsAt ? date(ad.endsAt) : "until paused"} · {ad.theme}
                  </p>
                </div>
                <span className="text-right">
                  <span className="block text-lg font-bold text-brand-800">{ad.clicks}</span>
                  <span className="text-xs text-slate-500">{ad.clicks === 1 ? "tap" : "taps"}</span>
                </span>
                <span className={`badge ${s.cls}`}>{s.label}</span>
                <form action={setAdActive.bind(null, ad.id, !ad.active)}>
                  <button className="btn-ghost btn-sm">{ad.active ? "Pause" : "Resume"}</button>
                </form>
                <form action={deleteAd.bind(null, ad.id)}>
                  <button className="btn-danger btn-sm">Delete</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <ActionForm action={saveAd} className="card max-w-2xl space-y-4 p-6">
        <h3 className="font-semibold text-brand-900">New ad</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Advertiser">
            <input name="advertiser" required minLength={2} maxLength={80} className="input" placeholder="Noor Travel" />
          </Field>
          <Field label="Button label">
            <input name="cta" maxLength={24} className="input" placeholder="See package" />
          </Field>
        </div>
        <Field label="Headline">
          <input name="headline" required minLength={5} maxLength={80} className="input" placeholder="Ramadan Umrah from $1,450" />
        </Field>
        <Field label="Text (optional)" hint="One short sentence; up to 160 characters.">
          <input name="body" maxLength={160} className="input" />
        </Field>
        <Field label="Opens when tapped">
          <select name="target" className="input" defaultValue="">
            <option value="">Nothing (display only)</option>
            <optgroup label="Umrah packages">
              {packages.map((p) => (
                <option key={p.id} value={`package:${p.id}`}>
                  {p.title} — {p.provider.companyName}
                </option>
              ))}
            </optgroup>
            <optgroup label="Transport">
              {services.map((s) => (
                <option key={s.id} value={`service:${s.id}`}>
                  {s.title} — {s.provider.companyName}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Colour">
            <select name="theme" className="input" defaultValue="brand">
              {AD_THEMES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts (optional)">
            <input name="startsAt" type="date" className="input" />
          </Field>
          <Field label="Ends (optional)">
            <input name="endsAt" type="date" className="input" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-brand-700" />
          Start showing it straight away
        </label>
        <SubmitButton>Create ad</SubmitButton>
      </ActionForm>
    </div>
  );
}
