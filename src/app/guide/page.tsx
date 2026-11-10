import type { Metadata } from "next";
import Link from "next/link";
import { CHECKLIST, IHRAM_RESTRICTIONS, MIQATS, PREPARATION, STEPS } from "@/lib/guide";

export const metadata: Metadata = {
  title: "How to perform Umrah",
  description: "A step-by-step guide to Umrah: ihram, tawaf, sa‘i and leaving ihram, with the supplications to recite.",
};

export default function GuidePage() {
  return (
    <div className="container-page py-10">
      <h1 className="h1">How to perform Umrah</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Umrah has four essential parts: entering ihram, tawaf around the Ka‘bah, sa‘i between Safa and Marwah, and
        shaving or trimming the hair. This guide walks through each in order.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_1fr]">
        <nav className="h-fit text-sm lg:sticky lg:top-24" aria-label="Guide sections">
          <ol className="card flex gap-1 overflow-x-auto p-2 lg:flex-col">
            <li>
              <a href="#prepare" className="block rounded-lg px-3 py-2 whitespace-nowrap text-slate-600 hover:bg-brand-50 hover:text-brand-800">
                Before you travel
              </a>
            </li>
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 whitespace-nowrap text-slate-600 hover:bg-brand-50 hover:text-brand-800">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#checklist" className="block rounded-lg px-3 py-2 whitespace-nowrap text-slate-600 hover:bg-brand-50 hover:text-brand-800">
                Packing checklist
              </a>
            </li>
          </ol>
        </nav>

        <div className="max-w-3xl space-y-12">
          <section id="prepare" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-brand-900">Before you travel</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
              {PREPARATION.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>

          {STEPS.map((step, i) => (
            <section key={step.id} id={step.id} className="scroll-mt-28">
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-lg font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-brand-900">{step.title}</h2>
                  <p className="mt-1 text-slate-600">{step.summary}</p>
                </div>
              </div>

              <ul className="mt-5 list-disc space-y-2 pl-5 text-slate-700">
                {step.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>

              {step.duas?.map((d) => (
                <figure key={d.translit} className="card mt-5 border-l-4 border-l-gold-400 p-5">
                  <figcaption className="text-xs font-semibold tracking-wide text-gold-600 uppercase">{d.when}</figcaption>
                  <p lang="ar" dir="rtl" className="mt-3 font-arabic text-2xl leading-loose text-brand-900">
                    {d.arabic}
                  </p>
                  <p className="mt-3 text-slate-700 italic">{d.translit}</p>
                  <p className="mt-1 text-sm text-slate-500">{d.meaning}</p>
                </figure>
              ))}

              {step.tip && (
                <p className="mt-5 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  <strong>Tip:</strong> {step.tip}
                </p>
              )}

              {step.id === "ihram" && (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="card p-5">
                    <h3 className="font-semibold text-brand-900">The miqats</h3>
                    <p className="mt-1 text-xs text-slate-500">The boundaries you must not cross without ihram.</p>
                    <dl className="mt-3 space-y-3 text-sm">
                      {MIQATS.map((m) => (
                        <div key={m.name}>
                          <dt className="font-medium text-slate-900">{m.name}</dt>
                          <dd className="text-slate-600">{m.for}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="card p-5">
                    <h3 className="font-semibold text-brand-900">Not allowed while in ihram</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                      {IHRAM_RESTRICTIONS.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          ))}

          <section id="checklist" className="scroll-mt-28">
            <h2 className="text-xl font-bold text-brand-900">Packing checklist</h2>
            <ul className="mt-4 grid gap-2 text-slate-700 sm:grid-cols-2">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span aria-hidden className="text-brand-600">✓</span> {c}
                </li>
              ))}
            </ul>
          </section>

          <p className="rounded-lg border border-black/5 bg-white px-4 py-3 text-sm text-slate-600">
            This guide is a general summary. The schools of Islamic law differ on some details, so please check anything
            you are unsure of with a scholar you trust. Have a question?{" "}
            <Link href="/community?topic=rituals" className="font-medium text-brand-700 hover:underline">
              Ask the community
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
