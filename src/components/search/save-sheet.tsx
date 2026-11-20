"use client";

import { Play, Star } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ApiError, LIMITS, type Engine, type SaveSearchInput } from "@/api";
import { searchAutoName } from "@/components/common/auto-name";
import { EnginePicker } from "@/components/common/engine-picker";
import { useToast } from "@/components/common/toast";
import { TONE } from "@/components/common/tone";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { useSearchScope } from "./search-scope";

const NONE = "none";
const NEW = "new";

/**
 * ［☆ 保存］の保存シート（画面仕様書 3.7）。お気に入りに保存し、同時にいつものエゴサへ追加できる。
 * 保存するのは検索文字列（相対期間は since:yesterday などの記号のまま）。条件ボタンの参照は持たない。
 * 保存できない理由（名前が空・検索語も条件も無い・期間が逆）は、モーダルやトーストにせずシートの中に出す。
 */
export function SaveSheet({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t.search.saveSheet.title}
      closeLabel={t.sheet.close}
    >
      {/* 閉じると中身ごと消えるので、開き直すと入力は初期値に戻る */}
      <SaveForm onClose={() => onOpenChange(false)} />
    </Sheet>
  );
}

function SaveForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const s = t.search.saveSheet;
  const toast = useToast();
  const { word, built, usedChips } = useSearchScope();
  const groups = useAppStore((st) => st.groups);
  const saveSearch = useAppStore((st) => st.saveSearch);

  // 名前は空から始め、入力が無ければ検索語と ON のボタン名から作った名前（プレースホルダーに出している）で保存する
  const autoName =
    searchAutoName(
      word,
      usedChips.map((c) => c.label),
      LIMITS.autoName,
    ) || s.defaultNameEmpty;
  const [name, setName] = useState("");
  const favoriteName = name.trim() || autoName;
  const [engine, setEngine] = useState<Engine>("x");
  const [target, setTarget] = useState<string>(NONE);
  // 新しいいつものエゴサの名前は、空ならお気に入りの名前と同じ（入力は実質1回）
  const [newGroup, setNewGroup] = useState("");
  const groupName = newGroup.trim() || favoriteName;
  const [error, setError] = useState("");

  const save = async () => {
    const blocker = built.blockers[0];
    if (blocker) return setError(t.issues[blocker.code](blocker.params ?? {}));

    const to: SaveSearchInput["target"] =
      target === NONE
        ? { kind: "none" }
        : target === NEW
          ? { kind: "newGroup", name: groupName }
          : { kind: "group", groupId: target };
    try {
      const res = await saveSearch({
        favorite: { name: favoriteName, query: built.stored, engine },
        target: to,
      });
      toast.show(res.group ? s.savedToGroup(res.group.name) : s.saved);
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "CORRUPT")) console.error(e);
      setError(s.failed);
    }
  };

  return (
    <>
      {/* お気に入り（名前・文字列・検索先）と、いつものエゴサへの追加を、別のカードに分ける */}
      <div className={`space-y-3 rounded-lg border p-3 ${TONE.fav.card}`}>
        <label className="block space-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Star className={`size-4 ${TONE.fav.icon}`} aria-hidden />
            {s.name}
          </span>
          <input
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder={autoName}
            className="w-full rounded-lg border bg-field px-3 py-2"
          />
        </label>
        <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
          {built.stored || t.home.noCondition}
        </code>
        <p className="text-xs text-muted-foreground">{s.note}</p>
        <EnginePicker value={engine} onChange={setEngine} />
      </div>
      <fieldset
        className={`space-y-1 rounded-lg border p-3 text-sm ${TONE.group.card}`}
      >
        <legend className="flex items-center gap-1.5 px-1 font-medium">
          <Play className={`size-4 ${TONE.group.icon}`} aria-hidden />
          {s.groupLegend}
        </legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="save-target"
            checked={target === NONE}
            onChange={() => setTarget(NONE)}
          />
          {s.none}
        </label>
        {groups.map((g) => (
          <label key={g.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="save-target"
              checked={target === g.id}
              onChange={() => setTarget(g.id)}
            />
            {s.addTo(g.name)}
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="save-target"
            checked={target === NEW}
            onChange={() => setTarget(NEW)}
          />
          {s.newGroup}
        </label>
        {target === NEW && (
          <input
            value={newGroup}
            onChange={(ev) => setNewGroup(ev.target.value)}
            aria-label={s.newGroupName}
            placeholder={favoriteName}
            className="w-full rounded-lg border px-3 py-2"
          />
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {s.cancel}
        </Button>
        <Button type="button" onClick={() => void save()}>
          {s.save}
        </Button>
      </div>
    </>
  );
}
