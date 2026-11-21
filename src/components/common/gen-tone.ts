/**
 * 検索ワード集のグループの色（期ごと）。期の並び順（`generations`）の番号で、この表から引く（足りなければ一巡する）。
 * 共通のグループは `COMMON_TONE`（灰）。色だけで区別させないよう、見出しには期の名前も文字で出す。
 * Tailwind は動的に作ったクラス名を拾えないので、すべて文字列で書く。
 */
export type GenTone = {
  /** 枠の左の太線 */
  bar: string;
  /** 見出しの帯 */
  head: string;
  /** タブ・チェックの小さな印 */
  dot: string;
};

export const GEN_TONES: readonly GenTone[] = [
  { bar: "border-l-sky-400", head: "bg-sky-400/20", dot: "bg-sky-400" },
  {
    bar: "border-l-emerald-400",
    head: "bg-emerald-400/20",
    dot: "bg-emerald-400",
  },
  {
    bar: "border-l-violet-400",
    head: "bg-violet-400/20",
    dot: "bg-violet-400",
  },
  { bar: "border-l-amber-400", head: "bg-amber-400/20", dot: "bg-amber-400" },
  { bar: "border-l-rose-400", head: "bg-rose-400/20", dot: "bg-rose-400" },
  { bar: "border-l-cyan-400", head: "bg-cyan-400/20", dot: "bg-cyan-400" },
  { bar: "border-l-lime-400", head: "bg-lime-400/20", dot: "bg-lime-400" },
  {
    bar: "border-l-fuchsia-400",
    head: "bg-fuchsia-400/20",
    dot: "bg-fuchsia-400",
  },
  {
    bar: "border-l-orange-400",
    head: "bg-orange-400/20",
    dot: "bg-orange-400",
  },
  { bar: "border-l-teal-400", head: "bg-teal-400/20", dot: "bg-teal-400" },
];

export const COMMON_TONE: GenTone = {
  bar: "border-l-slate-400",
  head: "bg-slate-400/20",
  dot: "bg-slate-400",
};

/** グループの色：先頭の期の番号で決める。期が無ければ共通の灰 */
export function toneOfGens(
  gens: readonly string[],
  order: readonly string[],
): GenTone {
  const i = gens.length > 0 ? order.indexOf(gens[0]) : -1;
  return i < 0 ? COMMON_TONE : GEN_TONES[i % GEN_TONES.length];
}
