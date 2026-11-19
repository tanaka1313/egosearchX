import type { ReactNode } from "react";

/** ページの見出し（画面仕様書 3.12）。見出しと、右に操作を並べる。パンくずは置かない */
export function PageHead({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}
