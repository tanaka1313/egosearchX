/**
 * キャンセルの戻り先（画面仕様書 9章）：直前に開いていたアプリ内のページを sessionStorage に覚える。
 * 画面の遷移の記録でユーザーのデータではないので、DAO（`lib/storage`）は通さない（タブを閉じれば消える）。
 * 外部のサイトへは戻らない（記録はアプリ内のパスだけ）。
 */
const CURRENT = "egosearch:path:current";
const PREV = "egosearch:path:prev";

/** ページを表示したときに呼ぶ（同じページの再描画は何もしない） */
export function rememberPath(pathname: string): void {
  try {
    const cur = sessionStorage.getItem(CURRENT);
    if (cur === pathname) return;
    if (cur) sessionStorage.setItem(PREV, cur);
    sessionStorage.setItem(CURRENT, pathname);
  } catch {
    // sessionStorage が使えない環境では記録しない（戻り先は既定のページになる）
  }
}

/** 直前のアプリ内ページ。記録が無い、または今のページと同じときは `fallback` */
export function previousPath(fallback: string): string {
  try {
    const prev = sessionStorage.getItem(PREV);
    if (!prev || prev === sessionStorage.getItem(CURRENT)) return fallback;
    return prev;
  } catch {
    return fallback;
  }
}
