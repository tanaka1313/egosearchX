"use client";

import { PageHead } from "@/components/common/page-head";
import { useI18n } from "@/store/i18n-context";
import { PAGE_MAIN } from "@/components/common/layout";

/** S10 このサイトについて（画面仕様書 5.9）。静的な文言だけで、`@/api` は呼ばない */
export function AboutPage() {
  const a = useI18n().t.aboutPage;
  return (
    <main className={`${PAGE_MAIN} space-y-5`}>
      <PageHead title={a.title} />
      <section aria-label={a.reasonTitle} className="space-y-2">
        <h2 className="font-bold">{a.reasonTitle}</h2>
        <p className="text-sm">{a.reason1}</p>
        <p className="text-sm">{a.reason2}</p>
        <p className="text-sm text-muted-foreground">
          <strong>{a.noResults}</strong>
          {a.noResultsRest}
        </p>
      </section>

      <section aria-label={a.stepsTitle} className="space-y-2">
        <h2 className="font-bold">{a.stepsTitle}</h2>
        <ol className="space-y-1 text-sm">
          {a.steps.map((text, i) => (
            <li key={text} className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
              >
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label={a.featuresTitle} className="space-y-2">
        <h2 className="font-bold">{a.featuresTitle}</h2>
        <ul className="space-y-2">
          {a.features.map((f) => (
            <li key={f.title} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{f.title}</div>
              <p className="text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={a.dataTitle} className="space-y-2">
        <h2 className="font-bold">{a.dataTitle}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {a.data.map((text) => (
            <li key={text}>{text}</li>
          ))}
          <li>{a.unofficial}</li>
        </ul>
      </section>
    </main>
  );
}
