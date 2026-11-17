"use client";
// MOCK: 破棄予定（#61）
import { useRouter } from "next/navigation";
import { useStore } from "./store";

/** 上部の「モックです」バナー。初回の見え方を確かめるボタン付き */
export function MockBanner() {
  const { startFresh } = useStore();
  const router = useRouter();
  return (
    <div
      role="note"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b-2 border-dashed border-amber-600 bg-amber-300 px-3 py-1.5 text-sm font-bold text-amber-950"
    >
      <span>
        ⚠ モック（紙芝居）— 破棄予定。動作はすべてダミーです（作成 #60 ／ 破棄
        #61）
      </span>
      <span className="flex items-center gap-3 font-normal">
        <button
          onClick={() => {
            startFresh();
            router.push("/mock");
          }}
          className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-amber-950"
        >
          初回の状態で見る
        </button>
        {/* 再読み込みで、使い込んだ状態の初期データに戻す */}
        <button
          onClick={() => window.location.reload()}
          className="underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-amber-950"
        >
          使い込んだ状態に戻す
        </button>
      </span>
    </div>
  );
}
