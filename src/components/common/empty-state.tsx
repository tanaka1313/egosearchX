import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { ERROR_CARD } from "./tone";

/**
 * 空状態（画面仕様書 3.12）。破線の枠に、案内の文と次の操作を出す。
 * `error` のときは、エラーの色（3.13）の枠とアイコンにして、通常の空状態と区別する。
 */
export function EmptyState({
  text,
  error = false,
  children,
}: {
  text: string;
  error?: boolean;
  children?: ReactNode;
}) {
  if (error)
    return (
      <div
        role="alert"
        className={`space-y-2 rounded-lg border p-6 text-center text-sm ${ERROR_CARD}`}
      >
        <TriangleAlert
          className="mx-auto size-5 text-destructive"
          aria-hidden
        />
        <p className="font-medium">{text}</p>
        {children}
      </div>
    );
  return (
    <div className="space-y-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      <p>{text}</p>
      {children}
    </div>
  );
}
