"use client";

import { StateIcon } from "@/components/common/state-icon";
import { toggleClass } from "@/components/search/styles";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/store/i18n-context";

const LANGS = ["ja", "en"] as const;

/** ［日本語］［English］の2択。置き場所は左メニューの下部（#73） */
export function LanguageSwitch() {
  const { lang, t, setLang } = useI18n();
  return (
    <div role="group" aria-label={t.lang.label} className="flex gap-2">
      {LANGS.map((l) => (
        <Button
          key={l}
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={toggleClass(lang === l)}
        >
          <StateIcon on={lang === l} decorative />
          {t.lang[l]}
        </Button>
      ))}
    </div>
  );
}
