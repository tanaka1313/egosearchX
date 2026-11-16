// MOCK: 破棄予定（#61）
export const PRESETS = [
  {
    id: "p1",
    name: "名前エゴサ（メンバーA）",
    engines: ["X"],
    last: "昨日",
    warn: false,
  },
  {
    id: "p2",
    name: "公式タグ",
    engines: ["X", "Yahoo"],
    last: "3日前",
    warn: true,
  },
  {
    id: "p3",
    name: "箱Aからのリプライ",
    engines: ["X"],
    last: "未実行",
    warn: false,
  },
];

export const QUERY_X =
  '"メンバーA" OR "めんばーえー" -filter:retweets since:2026-11-16 until:2026-11-18';
export const QUERY_YAHOO =
  '("メンバーA" "めんばーえー") 2026-11-16〜2026-11-18';
export const URL_X = "https://x.com/search?q=…（ダミー）&f=live";
export const URL_YAHOO =
  "https://search.yahoo.co.jp/realtime/search?p=…（ダミー）";
export const BOOKMARK_URL = "https://example.invalid/launch#v1.AAAA…（ダミー）";
