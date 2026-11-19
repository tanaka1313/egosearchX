import type { ReactNode } from "react";

/** 空状態（画面仕様書 3.12）。破線の枠に、案内の文と次の操作を出す */
export function EmptyState({
  text,
  children,
}: {
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      <p>{text}</p>
      {children}
    </div>
  );
}
