/**
 * X のクエリの字句解析。`model.ts` の `tokenize`（空白で分けるだけ。契約 `query.tokenize` の元）とは別物で、
 * 括弧・OR・否定を区別したトークン列にする（パーサー用）。
 * どのトークンも、入力の該当部分（`start`〜`end`）をそのまま持つ。raw で保持するときに内容を欠かさないため。
 */
export type Token =
  /** `(` または `-(` */
  | { type: "lparen"; negate: boolean; start: number; end: number }
  | { type: "rparen"; start: number; end: number }
  /** 単独の大文字 `OR` */
  | { type: "or"; start: number; end: number }
  | {
      type: "word";
      /** 入力のまま（先頭の `-` を含む） */
      text: string;
      /** 先頭が `-`（`-` だけの語は含めない） */
      negate: boolean;
      /** 引用符が閉じていない */
      unterminated: boolean;
      start: number;
      end: number;
    };

/**
 * 空白・括弧で区切る。引用符の中では区切らない。
 * 閉じていない引用符は、最後までを 1 つの語にする（`unterminated`）。
 */
export function lex(q: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < q.length) {
    const ch = q[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "(") {
      out.push({ type: "lparen", negate: false, start: i, end: i + 1 });
      i++;
    } else if (ch === "-" && q[i + 1] === "(") {
      out.push({ type: "lparen", negate: true, start: i, end: i + 2 });
      i += 2;
    } else if (ch === ")") {
      out.push({ type: "rparen", start: i, end: i + 1 });
      i++;
    } else {
      const start = i;
      let inQuote = false;
      while (i < q.length) {
        const c = q[i];
        if (c === '"') inQuote = !inQuote;
        else if (!inQuote && (/\s/.test(c) || c === "(" || c === ")")) break;
        i++;
      }
      const text = q.slice(start, i);
      if (text === "OR") out.push({ type: "or", start, end: i });
      else
        out.push({
          type: "word",
          text,
          negate: text.length > 1 && text.startsWith("-"),
          unterminated: inQuote,
          start,
          end: i,
        });
    }
  }
  return out;
}
