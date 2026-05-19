"use client";

import Link from "next/link";
import { ArrowRight, FileText, MapPin, ShieldAlert } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { scenarios } from "@/lib/demo-content";
import { useLanguage } from "@/lib/language-context";
import { translations } from "@/lib/translations";

export default function ScenariosPage() {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <main>
      <SiteNav />
      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.scenariosPageKicker}</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold text-ink">{t.scenariosPageH1}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-fluent-muted">
            {t.scenariosPageDesc}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:px-8">
        {scenarios.map((scenario, index) => {
          const td = t.scenariosFullData[index];
          return (
            <article key={scenario.id} className="grid gap-5 rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm lg:grid-cols-[220px_1fr_280px]">
              <div>
                <p className="text-sm font-bold text-azure">{t.scenarioLabel(index)}</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">{td?.title ?? scenario.title}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-fluent-border bg-fluent-canvas px-3 py-1 text-xs font-bold text-fluent-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {scenario.city}
                  </span>
                  <RiskPill level={scenario.riskLevel} label={t.riskPillLabels[scenario.riskLevel]} />
                  <span className="inline-flex rounded-full border border-fluent-border bg-white px-3 py-1 text-xs font-bold text-fluent-muted">
                    {td?.riskRange ?? scenario.riskRange}
                  </span>
                </div>
              </div>
              <div className="grid gap-4">
                <Block title={t.blockTouristQuestion} text={td?.touristInput ?? scenario.touristInput} />
                <Block title={t.blockEvidenceType} text={td?.evidenceType ?? scenario.evidenceType} />
                <Block title={t.blockTrustPassDoes} text={td?.trustPassDoes ?? scenario.trustPassDoes} />
                <Block title={t.blockWhyItMatters} text={td?.whyItMatters ?? scenario.whyItMatters} />
              </div>
              <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ShieldAlert className="h-4 w-4 text-azure" />
                  {t.scenarioSignalsHeader}
                </p>
                <div className="mt-3 grid gap-2">
                  {(td?.signals ?? scenario.signals).map((signal) => (
                    <span key={signal} className="rounded-[8px] bg-white px-3 py-2 text-sm text-fluent-muted">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="border-t border-fluent-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-lg font-bold text-ink">{t.recommendedWalkthrough}</p>
            <p className="mt-1 text-sm text-fluent-muted">{t.recommendedWalkthroughDesc}</p>
          </div>
          <Link href="/check" className="inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white transition hover:bg-fluent-blueDark">
            {t.tryRiskCheck}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        <FileText className="h-4 w-4 text-azure" />
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-fluent-muted">{text}</p>
    </div>
  );
}

function RiskPill({ level, label }: { level: string; label?: string }) {
  const styles: Record<string, string> = {
    Low: "border-green-200 bg-green-50 text-green-700",
    Caution: "border-yellow-200 bg-yellow-50 text-yellow-800",
    High: "border-orange-200 bg-orange-50 text-orange-800",
    Emergency: "border-red-200 bg-red-50 text-red-700"
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[level]}`}>{label ?? level}</span>;
}
