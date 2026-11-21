/**
 * サジェスト規則の確認用 Excel（docs/data/suggest-rules-review.xlsx）を作る。
 *   npm run gen:suggest-review
 * サジェスト規則は検索ワード集から自動で作られる（`npm run gen:master`）ので、手で書かない。
 * これは中身を人が確かめるための読み取り用ファイルで、プログラムは読み込まない（毎回作り直す）。
 * 元は src/data の JSON（suggest-rules／word-set／interests）。
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const DATA = resolve(ROOT, "src/data");
export const REVIEW_PATH = resolve(ROOT, "docs/data/suggest-rules-review.xlsx");

const readJson = async (name) =>
  JSON.parse(await readFile(resolve(DATA, name), "utf8"));

/**
 * 確認用の行を作る（純粋関数）。列：対象／グループ／対象の語／出す条件（表示名）／出す条件の数。
 * 「対象の語」と「出す条件」は、セル内で改行して並べる。出す条件は、検索ワード集の表示名（日本語）で書く
 * （同じ検索文字列の表示名は、そのグループのものを使う。無ければ検索文字列のまま）。
 */
export function reviewRows({ interests, wordSet, suggestRules }) {
  const rows = [];
  for (const [id, rules] of Object.entries(suggestRules)) {
    const interest = interests[id]?.label.ja ?? id;
    const groups = [...(wordSet.common ?? []), ...(wordSet[id] ?? [])];
    for (const r of rules) {
      const group = groups.find((g) => g.name.ja === r.group);
      const labelOf = (query) =>
        group?.words.find((w) => w.query === query)?.label.ja ?? query;
      rows.push([
        interest,
        r.group,
        r.when.join("\n"),
        r.suggest.map(labelOf).join("\n"),
        r.suggest.length,
      ]);
    }
  }
  return rows;
}

async function main() {
  const rows = reviewRows({
    interests: await readJson("interests.json"),
    wordSet: await readJson("word-set.json"),
    suggestRules: await readJson("suggest-rules.json"),
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("サジェスト規則", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "対象", width: 14 },
    { header: "グループ", width: 26 },
    { header: "対象の語（検索にこの語が入ると出す。複数は改行）", width: 40 },
    { header: "出す条件（検索ワード集の表示名。複数は改行）", width: 50 },
    { header: "出す条件の数", width: 12 },
    { header: "", width: 3 },
    { header: "このファイルについて", width: 70 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const row of rows) ws.addRow(row);
  ws.eachRow((row) =>
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: "top" };
    }),
  );
  ws.getCell("G2").value = [
    "・サジェスト規則の確認用です（読み取り専用。ここを直しても反映されません）。",
    '・規則は検索ワード集から自動で作られます：グループのワードのうち、"A" OR "B"… だけの検索文字列（呼び名の一覧）の語が「対象の語」、グループの全ワードが「出す条件」です。',
    "・照合は語単位です（検索の語が「対象の語」と一致したとき。部分一致ではありません）。",
    "・直すときは Excel の検索ワード集を直して npm run gen:master を実行し、npm run gen:suggest-review でこのファイルを作り直します。",
  ].join("\n");
  ws.getCell("G2").alignment = { wrapText: true, vertical: "top" };
  await wb.xlsx.writeFile(REVIEW_PATH);
  console.log(
    `確認用の Excel を作りました: ${REVIEW_PATH}（${rows.length} 規則）`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
