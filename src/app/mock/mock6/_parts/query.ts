// MOCK: 破棄予定（#61）
// モック用の簡易クエリ組み立て（文字列の連結だけ。本実装のシリアライザーではない）
import {
  FILTERS,
  TODAY,
  YESTERDAY,
  type Chip,
  type Cond,
  type Detail,
  type Period,
} from "./data";

export function condToken(c: Cond): string {
  const v = c.value.trim();
  if (!v) return "";
  switch (c.kind) {
    case "exact":
      return `"${v}"`;
    case "exclude":
      return v.startsWith("-") ? v : `-${v}`;
    case "list":
      return v.startsWith("list:") ? v : `list:${v}`;
    default:
      return v;
  }
}

/** 共通：ON の条件ボタンの中身（個別設定で無効にした項目を除く） */
export function chipTokens(chip: Chip, disabled: string[] = []): string[] {
  return chip.conds
    .filter((c) => !disabled.includes(c.id))
    .map(condToken)
    .filter(Boolean);
}

export function addDay(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function periodTokens(p: Period): string[] {
  switch (p.kind) {
    case "today":
      return [`since:${TODAY}`];
    case "yday":
    case "last":
      return [`since:${YESTERDAY}`];
    case "days": {
      const n = Number(p.days);
      return Number.isFinite(n) && n > 0 ? [`since:${addDay(TODAY, -n)}`] : [];
    }
    case "date": {
      const t: string[] = [];
      if (p.from) t.push(`since:${p.from}`);
      // 終了日を含む指定 → until は翌日へ変換（requirements F2）
      if (p.to) t.push(`until:${addDay(p.to, 1)}`);
      return t;
    }
    default:
      return [];
  }
}

export const PERIOD_LABEL: Record<Period["kind"], string> = {
  none: "指定なし",
  today: "今日",
  yday: "昨日から",
  last: "前回から",
  days: "N日前から",
  date: "日付を指定",
};

/** 個別設定（詳細設定）のトークン。期間は含まない */
export function detailTokens(d: Detail): string[] {
  const t: string[] = [];
  d.exact.forEach((v) => t.push(`"${v}"`));
  d.plain.forEach((v) => t.push(v));
  if (d.variants.length) t.push(`(${d.variants.join(" OR ")})`);
  d.exclude.forEach((v) => t.push(`-${v}`));
  if (d.from) t.push(`from:${d.from}`);
  if (d.to) t.push(`to:${d.to}`);
  if (d.mention) t.push(`@${d.mention.replace(/^@/, "")}`);
  if (d.list) t.push(`list:${d.list}`);
  FILTERS.forEach((f) => {
    const v = d.flt[f.key];
    if (v === "inc") t.push(f.op);
    if (v === "exc") t.push(`-${f.op}`);
  });
  if (d.lang) t.push(`lang:${d.lang}`);
  if (d.minFaves) t.push(`min_faves:${d.minFaves}`);
  if (d.minRt) t.push(`min_retweets:${d.minRt}`);
  if (d.minReplies) t.push(`min_replies:${d.minReplies}`);
  d.raw
    .split(/\s+/)
    .filter(Boolean)
    .forEach((v) => t.push(v));
  return t;
}

export type BuildInput = {
  word: string;
  exact: boolean;
  chips: Chip[];
  detail: Detail;
  period: Period;
  /** チップの on を無視して、このIDだけを使う（お気に入り・いつものエゴサの実行用） */
  onlyChipIds?: string[];
  extra?: string[];
};

export function buildQuery(i: BuildInput): {
  text: string;
  warnings: string[];
  tokens: string[];
} {
  const w = i.word.trim();
  const tokens: string[] = [];
  if (w) tokens.push(i.exact ? `"${w}"` : w);
  const used = i.chips.filter((ch) =>
    i.onlyChipIds ? i.onlyChipIds.includes(ch.id) : ch.on,
  );
  used.forEach((ch) => tokens.push(...chipTokens(ch, i.detail.disabledConds)));
  tokens.push(
    ...detailTokens(i.detail).filter((x) => !i.detail.offTokens.includes(x)),
  );
  tokens.push(...(i.extra ?? []));
  tokens.push(...periodTokens(i.period));
  const warnings: string[] = [];
  if (tokens.some((x) => x.includes("list:")))
    warnings.push("list: は Yahoo では使えません（Yahoo では除外されます）");
  if (tokens.some((x) => x.includes("filter:")))
    warnings.push("filter: は Yahoo では使えません（Yahoo では除外されます）");
  if (tokens.some((x) => x.startsWith("-from:")))
    warnings.push(
      "-from: は Yahoo では使えません。Yahoo のミュート機能を使ってください",
    );
  return { text: tokens.join(" "), warnings, tokens };
}

/** `https://x.com/i/lists/<ID>?s=20` か数字だけの文字列からリスト ID を取り出す */
export function parseListId(input: string): string | null {
  const s = input.trim();
  if (/^\d{5,}$/.test(s)) return s;
  const m = s.match(/lists\/(\d{5,})/);
  return m ? m[1] : null;
}
