"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FILTERS, type Detail, type Engine, type Tri } from "./data";
import { addDay, chipTokens, detailTokens, periodTokens } from "./query";
import { useStore } from "./store";
import { Section, TagInput } from "./ui";

const TRI: { v: Tri; l: string }[] = [
  { v: "any", l: "指定なし" },
  { v: "inc", l: "含む" },
  { v: "exc", l: "除く" },
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono = true,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(ev) => onChange(ev.target.value)}
        className={`w-full rounded-lg border px-2 py-1.5 ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

/** 詳細設定（個別設定）。初期は閉じた開閉エリア */
export function DetailPanel() {
  const { detail, setDetail, period, setPeriod, usedChips, resetDetail } =
    useStore();
  const [tab, setTab] = useState<"gui" | "text">("gui");
  const patch = (p: Partial<Detail>) => setDetail((d) => ({ ...d, ...p }));
  const nodes = detailTokens(detail);

  const toggleCond = (id: string) =>
    patch({
      disabledConds: detail.disabledConds.includes(id)
        ? detail.disabledConds.filter((x) => x !== id)
        : [...detail.disabledConds, id],
    });

  return (
    <details className="group rounded-xl border">
      <summary className="cursor-pointer px-3 py-3 font-medium focus-visible:ring-2 focus-visible:ring-ring">
        詳細条件
        {nodes.length > 0 && (
          <span className="ml-2 rounded-full border px-2 text-xs">
            個別 {nodes.length}
          </span>
        )}
      </summary>
      <div className="space-y-2 border-t p-3">
        <Section title="語">
          <TagInput
            label="完全一致の語"
            values={detail.exact}
            onChange={(v) => patch({ exact: v })}
          />
          <TagInput
            label="通常の語"
            values={detail.plain}
            onChange={(v) => patch({ plain: v })}
          />
          <TagInput
            label="表記ゆれ展開（ORで結ぶ）"
            values={detail.variants}
            onChange={(v) => patch({ variants: v })}
            placeholder="例：表記A（Enter）、表記B（Enter）"
          />
          <TagInput
            label="除外する語"
            values={detail.exclude}
            onChange={(v) => patch({ exclude: v })}
          />
        </Section>

        <Section title="アカウント">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="from:（このアカウントの投稿）"
              value={detail.from}
              onChange={(v) => patch({ from: v })}
              placeholder="sample_id"
            />
            <Field
              label="to:（このアカウント宛て）"
              value={detail.to}
              onChange={(v) => patch({ to: v })}
              placeholder="sample_id"
            />
            <Field
              label="@（メンション）"
              value={detail.mention}
              onChange={(v) => patch({ mention: v })}
              placeholder="sample_id"
            />
            <Field
              label="list:（リストID）"
              value={detail.list}
              onChange={(v) => patch({ list: v })}
              placeholder="1412278227767218179"
            />
          </div>
        </Section>

        <Section title="フィルタ">
          <div className="grid gap-2 sm:grid-cols-2">
            {FILTERS.map((f) => (
              <fieldset key={f.key} className="space-y-1">
                <legend className="text-sm font-medium">{f.label}</legend>
                <div className="flex gap-1">
                  {TRI.map((t) => {
                    const on = (detail.flt[f.key] ?? "any") === t.v;
                    return (
                      <button
                        key={t.v}
                        aria-pressed={on}
                        onClick={() =>
                          patch({ flt: { ...detail.flt, [f.key]: t.v } })
                        }
                        className={`rounded-full border px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring ${on ? "bg-foreground text-background" : ""}`}
                      >
                        {on ? "✓ " : ""}
                        {t.l}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">言語</span>
              <select
                value={detail.lang}
                onChange={(ev) => patch({ lang: ev.target.value })}
                className="w-full rounded-lg border px-2 py-1.5"
              >
                <option value="">指定なし</option>
                <option value="ja">日本語</option>
                <option value="en">英語</option>
                <option value="id">インドネシア語</option>
              </select>
            </label>
            <Field
              label="min_faves（いいね数以上）"
              value={detail.minFaves}
              onChange={(v) => patch({ minFaves: v.replace(/\D/g, "") })}
              placeholder="100"
            />
            <Field
              label="min_retweets（リポスト数以上）"
              value={detail.minRt}
              onChange={(v) => patch({ minRt: v.replace(/\D/g, "") })}
              placeholder="10"
            />
            <Field
              label="min_replies（返信数以上）"
              value={detail.minReplies}
              onChange={(v) => patch({ minReplies: v.replace(/\D/g, "") })}
              placeholder="5"
            />
          </div>
        </Section>

        <Section title="期間">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="N日前から"
              type="number"
              value={period.days}
              onChange={(v) => setPeriod({ ...period, kind: "days", days: v })}
            />
            <div />
            <Field
              label="開始日"
              type="date"
              value={period.from}
              onChange={(v) => setPeriod({ ...period, kind: "date", from: v })}
              mono={false}
            />
            <Field
              label="終了日（この日を含む）"
              type="date"
              value={period.to}
              onChange={(v) => setPeriod({ ...period, kind: "date", to: v })}
              mono={false}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            出力：
            <code className="font-mono">
              {periodTokens(period).join(" ") || "（指定なし）"}
            </code>
            {period.to &&
              `　※until は終了日の翌日（${addDay(period.to, 1)}）に変換されます`}
          </p>
        </Section>

        <Section title="エンジンと表示">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="エンジン"
          >
            {(
              [
                ["x", "X"],
                ["yahoo", "Yahoo"],
                ["both", "両方"],
              ] as [Engine, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                aria-pressed={detail.engine === v}
                onClick={() => patch({ engine: v })}
                className={`rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring ${detail.engine === v ? "bg-foreground text-background" : ""}`}
              >
                {detail.engine === v ? "✓ " : ""}
                {l}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={detail.live}
              onChange={(ev) => patch({ live: ev.target.checked })}
            />
            X の「最新」タブで開く（f=live）
          </label>
        </Section>

        <Section
          title={`共通（ONの条件ボタン）の項目別の無効化（${usedChips.length}個のボタン）`}
        >
          {usedChips.length === 0 && (
            <p className="text-sm text-muted-foreground">
              ONの条件ボタンがありません
            </p>
          )}
          {usedChips.map((ch) => (
            <fieldset key={ch.id} className="space-y-1">
              <legend className="text-sm font-medium">{ch.label}</legend>
              {ch.conds.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!detail.disabledConds.includes(c.id)}
                    onChange={() => toggleCond(c.id)}
                  />
                  <code className="font-mono text-xs">
                    {chipTokens({ ...ch, conds: [c] })[0] ?? "（空）"}
                  </code>
                  {detail.disabledConds.includes(c.id) && (
                    <span className="text-xs">この検索では無効</span>
                  )}
                </label>
              ))}
            </fieldset>
          ))}
        </Section>

        <Section title="高度な編集（構造／テキスト）">
          <div role="tablist" aria-label="表示" className="flex gap-1">
            {(
              [
                ["gui", "構造"],
                ["text", "テキスト"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                role="tab"
                aria-selected={tab === v}
                onClick={() => setTab(v)}
                className={`rounded-full border px-3 py-1 text-sm ${tab === v ? "bg-foreground text-background" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
          {tab === "gui" ? (
            <ul className="space-y-1">
              {nodes.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  個別の条件はまだありません
                </li>
              )}
              {nodes.map((n, i) => (
                <li
                  key={`${n}${i}`}
                  className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    aria-label={`${n}を有効にする`}
                    checked={!detail.offTokens.includes(n)}
                    onChange={() =>
                      patch({
                        offTokens: detail.offTokens.includes(n)
                          ? detail.offTokens.filter((x) => x !== n)
                          : [...detail.offTokens, n],
                      })
                    }
                  />
                  <code className="font-mono text-xs">{n}</code>
                </li>
              ))}
            </ul>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>
                生トークン（解析できない演算子はそのまま保持され、URL
                に出力されます）
              </span>
              <textarea
                value={detail.raw}
                onChange={(ev) => patch({ raw: ev.target.value })}
                className="h-20 w-full rounded-lg border p-2 font-mono text-sm"
                placeholder="foo:bar -baz"
              />
            </label>
          )}
        </Section>

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={resetDetail}>
            この検索の個別設定をリセット
          </Button>
        </div>
      </div>
    </details>
  );
}
