import type { Node } from "./ast";

/** id と enabled を除いた形（木の比較用。テストだけが使う） */
export const strip = (n: Node): unknown =>
  JSON.parse(
    JSON.stringify(n, (k, v: unknown) =>
      k === "id" || k === "enabled" ? undefined : v,
    ),
  );
