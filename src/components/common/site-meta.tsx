"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/store/i18n-context";
import { documentTitle } from "./page-title";

/**
 * 表示言語に合わせて `document.title` と description を切り替える（何も描画しない）。
 * 静的 HTML は ja で出す（SEO。要件定義書 9.3）ので、en の画面ではここで差し替える。
 *
 * ページを移ると Next が、そのページの静的な title（ja）を書き戻す。移動の完了より後なので、
 * 1度だけ書いても負ける。head の変更を見て、期待する値に合わせ直す（同じ値なら何もしないので止まる）。
 */
export function SiteMeta() {
  const { t } = useI18n();
  const pathname = usePathname();

  useEffect(() => {
    const title = documentTitle(t, pathname);
    const description = t.meta.description;

    const apply = () => {
      if (document.title !== title) document.title = title;
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      if (meta.content !== description) meta.content = description;
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    return () => observer.disconnect();
  }, [t, pathname]);

  return null;
}
