/**
 * Excel（docs/data/presets-and-suggest-rules.xlsx）から、マスタ JSON（src/data/*.json）を作る。
 *   npm run gen:master                 JSON を作り直し、報告（飛ばした行・要確認・英語が未入力の語）を出す
 *   npm run gen:master -- --sync-dict  先に Excel を整える：シート「英語対応表」が無ければ作り、足りない日本語を
 *                                      英語が空の行で足す。不要になったシート「サジェスト規則」は外す（サジェスト規則は
 *                                      検索ワード集から作る。確認用の Excel は `npm run gen:suggest-review`）
 * 変換の規則は scripts/lib/master-from-rows.mjs（docs/requirements.md 13章）。
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import prettier from "prettier";
import { DICT_SEED } from "./lib/dict-seed.mjs";
import { GenError, buildMaster } from "./lib/master-from-rows.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
export const XLSX_PATH = resolve(
  ROOT,
  "docs/data/presets-and-suggest-rules.xlsx",
);
const OUT_DIR = resolve(ROOT, "src/data");

const SHEET = {
  interests: "興味の対象",
  presets: "プリセット",
  groups: "ワード集グループ",
  words: "検索ワード集",
  dict: "英語対応表",
  obsolete: "サジェスト規則",
};

/** シートのデータ行（2行目から）を、1〜`cols` 列の値の配列で返す */
export function sheetRows(ws, cols) {
  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    rows.push(Array.from({ length: cols }, (_, c) => row.getCell(c + 1).value));
  }
  return rows;
}

export async function readWorkbook(path = XLSX_PATH) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb;
}

function need(wb, name) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new GenError(`シート「${name}」がありません`);
  return ws;
}

/** ワークブックから、`buildMaster` の入力の行を取り出す */
export function rowsOf(wb) {
  const dict = wb.getWorksheet(SHEET.dict);
  return {
    interests: sheetRows(need(wb, SHEET.interests), 5),
    presets: sheetRows(need(wb, SHEET.presets), 6),
    groups: sheetRows(need(wb, SHEET.groups), 4),
    words: sheetRows(need(wb, SHEET.words), 6),
    dict: dict ? sheetRows(dict, 2) : [],
  };
}

/** シート「英語対応表」を作る（無いときだけ）。説明の列と、最初の行（DICT_SEED）を入れる */
function ensureDictSheet(wb) {
  let ws = wb.getWorksheet(SHEET.dict);
  if (ws) return ws;
  ws = wb.addWorksheet(SHEET.dict, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "日本語", key: "ja", width: 36 },
    { header: "英語", key: "en", width: 36 },
    { header: "メモ", key: "memo", width: 28 },
    { header: "", key: "gap", width: 3 },
    { header: "記入のしかた", key: "help", width: 80 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getCell("E2").value = [
    "・画面の言語が英語のときに出す名前を、日本語との対応で書きます（条件ボタンの名前、検索ワードの表示名、グループ名の種類など）。",
    "・「表示名(種類)」の形の表示名は、本体と種類を別々に引きます（例：ファンネーム、推しマ）。「名前 [値] 単位」の形は、名前と単位を別々に引きます。",
    "・グループ名は「ワード集グループ」シートの英語列から引くので、ここには書きません。",
    "・タグ・絵文字・英字だけの語は、書かなくても同じ表示になります。",
    "・英語が空の行は、まだ訳していない語です（英語の画面では日本語のまま出ます）。",
    "・足りない日本語は、npm run gen:master -- --sync-dict が空の行で足します。",
  ].join("\n");
  ws.getCell("E2").alignment = { wrapText: true, vertical: "top" };
  for (const [ja, en] of DICT_SEED) ws.addRow([ja, en]);
  return ws;
}

/** 足りない日本語を、英語が空の行で足す。足した数を返す */
function appendMissing(ws, missing) {
  const have = new Set();
  ws.eachRow((row, n) => {
    if (n > 1) have.add(String(row.getCell(1).value ?? "").trim());
  });
  let added = 0;
  for (const ja of missing) {
    if (have.has(ja)) continue;
    ws.addRow([ja, ""]);
    added++;
  }
  return added;
}

/** JSON を整形して書く（Prettier と同じ形にして、コミット時の整形で差分が出ないようにする） */
async function writeJson(name, value) {
  const path = resolve(OUT_DIR, name);
  const text = await prettier.format(JSON.stringify(value), {
    parser: "json",
    filepath: path,
  });
  await writeFile(path, text);
}

function printReport(report) {
  const section = (title, list) => {
    if (list.length === 0) return;
    console.log(`\n■ ${title}（${list.length}件）`);
    for (const x of list.slice(0, 40)) console.log(`  - ${x}`);
    if (list.length > 40) console.log(`  …ほか ${list.length - 40} 件`);
  };
  section("飛ばした行", report.skipped);
  section("要確認（JSON には入れました）", report.review);
  section(
    "英語が未入力の語（対応表に足してください。日本語のまま出ます）",
    report.missing,
  );
  console.log(`\n■ 件数: ${JSON.stringify(report.stats)}`);
}

async function main() {
  const sync = process.argv.includes("--sync-dict");
  const wb = await readWorkbook();

  if (sync) {
    const ws = ensureDictSheet(wb);
    const { report } = buildMaster(rowsOf(wb));
    const added = appendMissing(ws, report.missing);
    const obsolete = wb.getWorksheet(SHEET.obsolete);
    if (obsolete) wb.removeWorksheet(obsolete.id);
    await wb.xlsx.writeFile(XLSX_PATH);
    console.log(
      `Excel を整えました（英語対応表に ${added} 行を足し、${obsolete ? "「サジェスト規則」シートを外しました" : "外すシートは無し"}）`,
    );
  }

  if (!wb.getWorksheet(SHEET.dict))
    throw new GenError(
      "シート「英語対応表」がありません。先に npm run gen:master -- --sync-dict を実行してください",
    );

  const { files, report } = buildMaster(rowsOf(await readWorkbook()));
  await writeJson("interests.json", files.interests);
  await writeJson("presets.json", files.presets);
  await writeJson("word-set.json", files.wordSet);
  await writeJson("suggest-rules.json", files.suggestRules);
  console.log(
    "JSON を作りました: interests / presets / word-set / suggest-rules",
  );
  printReport(report);
}

// テストから import したときは実行しない
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((e) => {
    console.error(e instanceof GenError ? `エラー: ${e.message}` : e);
    process.exit(1);
  });
}
