/**
 * 本文（`main`）へフォーカスを移す。押した要素が消えた・無効になったときの戻し先（フォーカスを `body` に落とさない）。
 * `main` は通常フォーカスできないので、`tabindex="-1"`（Tab の順には入らない）を付けてから移す。
 */
export function focusMain(): void {
  const main = document.querySelector<HTMLElement>("main");
  if (!main) return;
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}

/** フォーカスを戻せる要素か（つながっていて、無効でなく、`body` でない） */
export function isFocusable(el: Element | null): el is HTMLElement {
  return (
    el instanceof HTMLElement &&
    el !== document.body &&
    el.isConnected &&
    !(el as HTMLButtonElement).disabled
  );
}
