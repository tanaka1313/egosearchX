"use client";

// 組み立て：バックエンドを作る唯一の場所（docs/api-spec.md 1.2）。ここだけが `@/backend` を import してよい。
import { useState, type ReactNode } from "react";
import { createBrowserBackend } from "@/backend";
import { ApiProvider } from "@/store/api-context";

export function Providers({ children }: { children: ReactNode }) {
  // localStorage は、事前描画（window なし）では触らない。作るのは1回だけ
  const [api] = useState(createBrowserBackend);
  return <ApiProvider api={api}>{children}</ApiProvider>;
}
