"use client";
// MOCK: 破棄予定（#61）
import { Button } from "@/components/ui/button";
import { FILTERS, type Detail, type Tri } from "./data";
import { PeriodPicker } from "./period-picker";
import { chipTokens, detailTokens } from "./query";
import { disabledKey } from "./query-model";
import { useSearchScope } from "./search-scope";
import { Section, TagInput, toggleClass } from "./ui";

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

/**
 * 詳細条件（個別設定）。初期は閉じた開閉エリア。状態は SearchScope から読む（ホーム・いつものエゴサの編集で共通）。
 * footer：末尾に置く操作（ホームは開くボタン群、いつものエゴサの編集は［お気に入りに保存して追加］）。
 */
export function DetailPanel({ footer }: { footer?: React.ReactNode }) {
  const { detail, setDetail, period, setPeriod, usedChips, resetDetail } =
    useSearchScope();
  const patch = (p: Partial<Detail>) => setDetail((d) => ({ ...d, ...p }));
  const nodes = detailTokens(detail);

  const toggleCond = (id: string) =>
    patch({
      disabledConds: detail.disabledConds.includes(id)
        ? detail.disabledConds.filter((x) => x !== id)
        : [...detail.disabledConds, id],
    });

  return (
    <details className="group border-t pt-1">
      <summary className="cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">
        詳細条件
        {nodes.length > 0 && (
          <span className="ml-2 rounded-full border px-2 text-xs">
            個別 {nodes.length}
          </span>
        )}
      </summary>
      <div className="space-y-2 pt-2">
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
          {/* 除外は X の実機で確認済み（-list: は X でエラーになるので置かない）。Yahoo!リアルタイム検索では効かないので警告する */}
          <div className="text-sm font-medium">除外</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="-from:（このアカウントの投稿を除く）"
              value={detail.exFrom}
              onChange={(v) => patch({ exFrom: v })}
              placeholder="sample_id"
            />
            <Field
              label="-to:（このアカウント宛てを除く）"
              value={detail.exTo}
              onChange={(v) => patch({ exTo: v })}
              placeholder="sample_id"
            />
            <Field
              label="-@（このメンションを除く）"
              value={detail.exMention}
              onChange={(v) => patch({ exMention: v })}
              placeholder="sample_id"
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
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${toggleClass(on)}`}
                      >
                        <span className="w-3 text-center">
                          {on ? "✓" : "○"}
                        </span>
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

        <Section title="期間" defaultOpen>
          {/* ホームの期間と同じコントローラー・同じ状態（どちらで変えても同期する） */}
          <PeriodPicker value={period} onChange={setPeriod} showOutput />
        </Section>

        {/* 検索先は、開くときはボタン（［X で開く］［Yahoo で開く］）、保存するときは保存画面で選ぶ */}
        <Section title="表示">
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
              {/* 項目はトークンで指す（ボタンの本体が文字列のため。キーは `<ボタンID>::<トークン>`） */}
              {chipTokens(ch).map((t) => {
                const key = disabledKey(ch.id, t);
                const off = detail.disabledConds.includes(key);
                return (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={() => toggleCond(key)}
                    />
                    <code className="font-mono text-xs">{t}</code>
                    {off && <span className="text-xs">この検索では無効</span>}
                  </label>
                );
              })}
            </fieldset>
          ))}
        </Section>

        <Section title="テキストで追加">
          <label className="block space-y-1 text-sm">
            <span>
              上の欄に無い条件を、検索文字列のまま足せます（解析できない演算子もそのまま
              URL に出力されます）
            </span>
            <textarea
              value={detail.raw}
              onChange={(ev) => patch({ raw: ev.target.value })}
              aria-label="テキストで追加する条件"
              className="h-20 w-full rounded-lg border p-2 font-mono text-sm"
              placeholder="foo:bar -baz"
            />
          </label>
        </Section>

        {/* 詳細条件を触ったその場で次の操作ができるよう、末尾に画面ごとの操作を置く */}
        {footer}

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={resetDetail}>
            この検索の個別設定をリセット
          </Button>
        </div>
      </div>
    </details>
  );
}
