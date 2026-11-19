/**
 * ON/OFF で押す部品（条件ボタン、期間、3択）の見た目を、ここ1か所に集める（CLAUDE.md「UI の決まり」）。
 * 枠線の太さと文字の太さは ON/OFF で同じにする（押しても大きさが変わらない）。
 * ON は青の枠＋薄い塗り＋✓（アイコン側）。主ボタン（塗りつぶしの青）とは別の見た目にする。
 */
export const toggleClass = (on: boolean) =>
  `border focus-visible:ring-2 focus-visible:ring-ring ${
    on
      ? "border-primary bg-primary/20 text-foreground"
      : "border-border bg-background text-muted-foreground"
  }`;

/** 枠の中のセグメント（期間）。OFF も枠線の太さを同じにして透明にし、押しても大きさが変わらないようにする */
export const segmentClass = (on: boolean) =>
  `border focus-visible:ring-2 focus-visible:ring-ring ${
    on
      ? "border-primary bg-primary/20 text-foreground"
      : "border-transparent text-muted-foreground hover:bg-muted"
  }`;
