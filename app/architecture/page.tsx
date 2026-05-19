"use client";

import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Cloud, Database, FileScan, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { useLanguage } from "@/lib/language-context";
import { translations } from "@/lib/translations";

export default function ArchitecturePage() {
  const { lang } = useLanguage();
  const t = translations[lang];

  return (
    <main>
      <SiteNav />
      <section className="border-b border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-azure">{t.architecturePageKicker}</p>
            <h1 className="mt-2 text-4xl font-bold text-ink">{t.architecturePageH1}</h1>
            <p className="mt-4 text-base leading-7 text-fluent-muted">
              {t.architecturePageDesc}
            </p>
            <Link href="/check" className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-azure px-5 py-3 text-sm font-bold text-white transition hover:bg-fluent-blueDark">
              {t.testLiveFlow}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-3 shadow-soft">
            <img src="/trustpass-ai-grounding-layer.png" alt="TrustPass Azure AI and grounded safety layer architecture" className="h-auto w-full rounded-[8px] border border-fluent-border bg-white" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {t.azureServices.map((service) => (
          <div key={service.title} className="rounded-[8px] border border-fluent-border bg-white p-5 shadow-sm">
            <Bot className="h-6 w-6 text-azure" />
            <p className="mt-3 font-bold text-ink">{service.title}</p>
            <p className="mt-2 text-sm leading-6 text-fluent-muted">{service.description}</p>
          </div>
        ))}
      </section>

      <section className="border-y border-fluent-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {t.architectureCards.map((card, i) => (
            <ArchitectureCard
              key={card.title}
              icon={i === 0 ? <FileScan /> : i === 1 ? <Cloud /> : <Database />}
              title={card.title}
              items={card.items}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[8px] border border-blue-100 bg-[#EAF4FE] p-6">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-azure">
            <ShieldCheck className="h-4 w-4" />
            {t.responsibleTrustKicker}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {t.responsibleTrustItems.map((item) => (
              <div key={item} className="flex gap-3 rounded-[8px] bg-white p-4 text-sm leading-6 text-fluent-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ArchitectureCard({ icon, title, items }: { icon: React.ReactElement; title: string; items: string[] }) {
  return (
    <div className="rounded-[8px] border border-fluent-border bg-fluent-canvas p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white text-azure">{icon}</div>
      <h2 className="mt-4 text-xl font-bold text-ink">{title}</h2>
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-fluent-muted">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
