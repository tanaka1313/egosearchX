/**
 * Excel の行から、マスタ JSON（src/data/*.json）を作る。入出力は配列とオブジェクトだけの純粋関数で、
 * Excel の読み書きは `scripts/gen-master.mjs` が行う（ここは単体テストできる）。
 *
 * 入力の行は、シートの列順のセルの値（ヘッダー行を除く）。列の並びは docs/requirements.md 13章。
 * - interests: [ID, 表示名（日本語）, 表示名（英語）, 既定リストの名前, 既定リストのID]
 * - presets:   [対象, ラベル, 検索文字列, 初期ON, 初期表示, 確認済み]
 * - groups:    [対象, グループ名（日本語）, グループ名（英語）, 確認済み]
 * - words:     [対象, グループ（日本語名）, 表示名, 検索文字列, ホームに出す, 確認済み]
 * - dict:      [日本語, 英語]（シート「英語対応表」）
 *
 * 推測で値を作らない：読めない・食い違う値は、直さずに止める（`GenError`）か、報告（report）に出す。
 */
import { VALUE_OPS } from "../../src/api/constants.ts";
import { LIMITS } from "../../src/api/limits.ts";

export class GenError extends Error {}

/** Excel の「共通」。JSON では `common` */
export const COMMON_JA = "共通";
export const COMMON_ID = "common";

const CONFIRMED = new Set(["〇", "○", "◯"]);
const JA_CHARS = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
/** `ラベル [値] 単位` の形（値付きの条件ボタンのラベル。画面と同じ形） */
const LABEL_RE = /^(.*?)\s*\[([^\]]*)\]\s*(.*)$/;
/** 値付きの演算子ごとの、ラベルの単位（値の後ろ）。画面の辞書（messages の paramSuffix）と同じ */
const SUFFIX = {
  min_faves: "件以上",
  min_retweets: "件以上",
  min_replies: "件以上",
  since: "以降",
  until: "以前",
};
/** 引用符つきの語を OR でつないだだけの検索文字列（メンバーの呼び名の一覧）。OR の前後の空白は問わない */
const NAME_LIST_RE = /^\(\s*"[^"]+"(?:\s*OR\s*"[^"]+")*\s*\)$/;

/** セルの値を文字列にする（リッチテキスト・数式・ハイパーリンクの値を読む。前後の空白は除く） */
export function cellText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (Array.isArray(v.richText))
      return v.richText
        .map((r) => r.text)
        .join("")
        .trim();
    if ("result" in v) return cellText(v.result);
    if ("text" in v) return cellText(v.text);
    return "";
  }
  return String(v).trim();
}

/** 「確認済み」の〇（〇・○・◯）が付いているか */
export const isConfirmed = (v) => CONFIRMED.has(cellText(v));

/** TRUE／FALSE の文字列と、真偽値・0／1 のセルを読む。空は既定値 */
export function cellBool(v, fallback) {
  if (v === null || v === undefined || cellText(v) === "") return fallback;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = cellText(v).toUpperCase();
  if (s === "TRUE" || s === "1") return true;
  if (s === "FALSE" || s === "0") return false;
  throw new GenError(`TRUE／FALSE で書いてください: ${cellText(v)}`);
}

const isBlank = (row) => row.slice(0, 4).every((c) => cellText(c) === "");

/** 検索文字列の先頭が値付きの演算子なら、その接頭辞と値を返す（接頭辞の長いものを先に調べる） */
function valueOpOf(token) {
  const list = Object.entries(VALUE_OPS).sort(
    (a, b) => b[1].prefix.length - a[1].prefix.length,
  );
  for (const [op, d] of list) {
    if (token.startsWith(d.prefix))
      return { op, prefix: d.prefix, value: token.slice(d.prefix.length) };
  }
  return null;
}

/**
 * 日本語と英語の対応表で、表示名を英語にする。
 * 全体の一致 → `名前 [値] 単位` → `本体(種類)` の順に、部品ごとに表を引く。日本語を含み、引けなかった部品は
 * `missing` に集め、日本語のまま返す（推測で訳さない）。日本語を含まない部品とタグ（#…）はそのまま。
 * `groupNames`：グループ名（日本語 → 英語）。「エゴサワード(ときのそら)」の括弧の中などで使う。
 */
export function makeTranslator(dictRows, groupNames) {
  const dict = new Map();
  for (const r of dictRows) {
    const ja = cellText(r[0]);
    const en = cellText(r[1]);
    if (ja && en) dict.set(ja, en);
  }
  const missing = new Set();
  const tr = (s) => {
    const t = s.trim();
    // タグ（#…）・絵文字・英字だけの語は固有名詞なのでそのまま
    if (!JA_CHARS.test(t) || t.startsWith("#")) return t;
    const hit = dict.get(t) ?? groupNames.get(t);
    if (hit) return hit;
    let m = t.match(LABEL_RE);
    if (m && m[1])
      return [tr(m[1]), `[${m[2]}]`, m[3] ? tr(m[3]) : ""]
        .filter(Boolean)
        .join(" ");
    m = t.match(/^(.+?)\((.+)\)$/);
    if (m) return `${tr(m[1])} (${tr(m[2])})`;
    missing.add(t);
    return t;
  };
  return { tr, missing };
}

/** プリセットのラベル（`名前 [値] 単位`）と検索文字列から、JSON のラベルと検索文字列を作る */
export function presetLabelAndQuery(label, query, where) {
  const m = label.match(LABEL_RE);
  if (!m) return { label, query };
  const [, base, value, suffix] = m;
  const op = valueOpOf(query);
  if (!op || /\s/.test(query))
    throw new GenError(
      `${where}: ラベルに [値] がありますが、検索文字列が値付きの演算子ではありません（${label} / ${query}）`,
    );
  const qv = query.slice(op.prefix.length);
  const placeholder = /^X+$/i.test(value);
  // [XXX] は「値が空の初期値」。検索文字列は演算子だけにする（画面の入力欄で値を入れる）
  if (placeholder ? qv !== `[${value}]` && qv !== "" : qv !== value)
    throw new GenError(
      `${where}: ラベルの値 [${value}] が検索文字列の値と違います（${label} / ${query}）`,
    );
  const want = SUFFIX[op.op] ?? "";
  // 値が [XXX]（空の初期値）のときは、単位を省いてよい（画面が単位を出す）
  if (suffix !== want && !(placeholder && suffix === ""))
    throw new GenError(
      `${where}: 単位は「${want}」にしてください（今は「${suffix}」。${label}）`,
    );
  return { label: base, query: placeholder ? op.prefix : query };
}

/** 条件ボタンのラベルは、日本語も英語も上限（LIMITS.chipLabel）を超えられない（超えると保存できない） */
function assertLabelLength(where, ja, en) {
  if (ja.length > LIMITS.chipLabel || en.length > LIMITS.chipLabel)
    throw new GenError(
      `${where}: ラベルは ${LIMITS.chipLabel} 文字までです（${ja} / ${en}）。英語は「英語対応表」シートで直してください`,
    );
}

/** 検索文字列に `[XXX]` のような空の初期値の目印（値付きの条件ボタン用）があるか */
const hasPlaceholder = (q) => /\[X+\]/i.test(q);

/**
 * @param {{ interests: unknown[][], presets: unknown[][], groups: unknown[][], words: unknown[][], dict: unknown[][] }} rows
 */
export function buildMaster(rows) {
  const report = { skipped: [], review: [], missing: [], stats: {} };

  // --- 興味の対象（確認済みの〇は見ない：値は今の JSON と同じで、書き換えの対象ではないため） ---
  const interests = {};
  const interestRows = rows.interests.filter((r) => cellText(r[0]));
  const groupNames = new Map([[COMMON_JA, ""]]);
  for (const r of rows.groups) {
    const ja = cellText(r[1]);
    const en = cellText(r[2]);
    if (ja && en && !groupNames.has(ja)) groupNames.set(ja, en);
  }
  groupNames.delete(COMMON_JA);
  const { tr, missing } = makeTranslator(rows.dict, groupNames);

  for (const r of interestRows) {
    const id = cellText(r[0]);
    const listLabel = cellText(r[3]);
    const listId = cellText(r[4]);
    if (!!listLabel !== !!listId)
      throw new GenError(
        `興味の対象 ${id}: 既定リストの名前とIDは、両方書くか両方空にしてください`,
      );
    const listEn = tr(listLabel);
    if (listId) assertLabelLength(`興味の対象 ${id}`, listLabel, listEn);
    interests[id] = {
      label: { ja: cellText(r[1]), en: cellText(r[2]) },
      list: listId ? { label: { ja: listLabel, en: listEn }, listId } : null,
    };
  }
  const ids = Object.keys(interests);
  const interestOf = (v, where) => {
    const s = cellText(v);
    if (s === COMMON_JA || s === COMMON_ID) return COMMON_ID;
    if (!ids.includes(s))
      throw new GenError(`${where}: 存在しない対象です: ${s}`);
    return s;
  };

  // --- プリセット（1本の並び。既定リストの目印を先頭に置く） ---
  const presets = [{ defaultList: true }];
  rows.presets.forEach((r, i) => {
    if (isBlank(r)) return;
    const where = `プリセット ${i + 2}行目`;
    if (!isConfirmed(r[5]))
      return report.skipped.push(
        `${where}: 確認済みでない（${cellText(r[1])}）`,
      );
    const { label, query } = presetLabelAndQuery(
      cellText(r[1]),
      cellText(r[2]),
      where,
    );
    if (!label || !query)
      throw new GenError(`${where}: ラベルと検索文字列を書いてください`);
    const en = tr(label);
    assertLabelLength(where, label, en);
    presets.push({
      interest: interestOf(r[0], where),
      label: { ja: label, en },
      query,
      on: cellBool(r[3], false),
      visible: cellBool(r[4], true),
    });
  });

  // --- 検索ワード集 ---
  const groupDefs = new Map();
  rows.groups.forEach((r, i) => {
    if (isBlank(r)) return;
    const where = `ワード集グループ ${i + 2}行目`;
    if (!isConfirmed(r[3]))
      return report.skipped.push(
        `${where}: 確認済みでない（${cellText(r[1])}）`,
      );
    const interest = interestOf(r[0], where);
    const ja = cellText(r[1]);
    const en = cellText(r[2]);
    if (!ja || !en)
      throw new GenError(`${where}: グループ名は日本語と英語の両方が必要です`);
    const key = `${interest}\t${ja}`;
    if (groupDefs.has(key))
      throw new GenError(
        `${where}: 同じ対象にグループ名「${ja}」が重複しています`,
      );
    groupDefs.set(key, { interest, name: { ja, en }, words: [] });
  });
  /** 共通のグループ（グループ名は日本語の「共通」。英語は対応表から） */
  const commonGroup = () => {
    const key = `${COMMON_ID}\t${COMMON_JA}`;
    if (!groupDefs.has(key)) {
      const en = tr(COMMON_JA);
      groupDefs.set(key, {
        interest: COMMON_ID,
        name: { ja: COMMON_JA, en },
        words: [],
      });
    }
    return groupDefs.get(key);
  };

  const skippedDash = [];
  const skippedPlaceholder = [];
  rows.words.forEach((r, i) => {
    if (isBlank(r)) return;
    const where = `検索ワード集 ${i + 2}行目`;
    const label = cellText(r[2]);
    const query = cellText(r[3]);
    if (!isConfirmed(r[5]))
      return report.skipped.push(`${where}: 確認済みでない（${label}）`);
    if (!label || !query)
      throw new GenError(`${where}: 表示名と検索文字列を書いてください`);
    if (query === "-")
      return skippedDash.push(`${where}: 検索文字列が「-」（${label}）`);
    if (hasPlaceholder(query))
      return skippedPlaceholder.push(
        `${where}: 値の入力欄が必要な行（${label}）。プリセットの値付きボタンで使うため、検索ワード集には入れません`,
      );
    const interest = interestOf(r[0], where);
    const groupJa = cellText(r[1]);
    const group =
      interest === COMMON_ID
        ? commonGroup()
        : groupDefs.get(`${interest}\t${groupJa}`);
    if (!group)
      throw new GenError(
        `${where}: 「ワード集グループ」シートに、対象 ${interest} のグループ「${groupJa}」がありません`,
      );
    if (/\s\/\s/.test(query))
      report.review.push(
        `${where}: 検索文字列に区切りの「 / 」が入っています（${query}）`,
      );
    if (/"OR|OR"/.test(query))
      report.review.push(`${where}: OR の前後に空白がありません（${query}）`);
    group.words.push({
      label: { ja: label, en: tr(label) },
      query,
      starter: cellBool(r[4], false),
    });
  });
  report.skipped.push(...skippedDash, ...skippedPlaceholder);

  // --- 検索ワード集 JSON とサジェスト規則（検索ワード集から導く） ---
  const wordSet = {};
  const suggestRules = {};
  const orderOfInterest = [COMMON_ID, ...ids];
  const groups = [...groupDefs.values()].sort(
    (a, b) =>
      orderOfInterest.indexOf(a.interest) - orderOfInterest.indexOf(b.interest),
  );
  for (const g of groups) {
    if (g.words.length === 0) {
      report.review.push(
        `グループ「${g.name.ja}」（${g.interest}）はワードが無いので JSON に入れません`,
      );
      continue;
    }
    (wordSet[g.interest] ??= []).push({ name: g.name, words: g.words });
    if (g.interest === COMMON_ID) continue;
    // 呼び名の一覧（"A" OR "B"…だけの検索文字列）のワードがあるグループだけ、規則を作る
    const when = [];
    for (const w of g.words) {
      if (!NAME_LIST_RE.test(w.query)) continue;
      for (const m of w.query.matchAll(/"([^"]+)"/g))
        if (!when.includes(m[1])) when.push(m[1]);
    }
    if (when.length === 0) continue;
    const suggest = [...new Set(g.words.map((w) => w.query))];
    (suggestRules[g.interest] ??= []).push({ group: g.name.ja, when, suggest });
  }

  report.missing = [...missing].sort();
  report.stats = {
    presets: presets.length - 1,
    groups: groups.filter((g) => g.words.length > 0).length,
    words: groups.reduce((n, g) => n + g.words.length, 0),
    suggestRules: Object.values(suggestRules).reduce((n, a) => n + a.length, 0),
    missingEnglish: report.missing.length,
  };
  return { files: { interests, presets, wordSet, suggestRules }, report };
}
