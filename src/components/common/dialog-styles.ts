/**
 * モーダルの見た目を、ここ1か所に集める。ダイアログが背景の画面と同じ色に溶けて、どこまでがダイアログか
 * 分からなくなるのを防ぐ（幕を濃くして背景をぼかし、本体は一段明るい面＋青みの太い枠＋強い影で区別する）。
 * 確認ダイアログ（z-65）は重ねて出るので、幕の z だけ別にする。
 */
export const DIALOG_OVERLAY =
  "fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm";
export const DIALOG_OVERLAY_TOP =
  "fixed inset-0 z-[65] bg-black/75 backdrop-blur-sm";
export const DIALOG_PANEL =
  "border-2 border-primary/50 bg-card text-card-foreground shadow-2xl shadow-black/70 outline-none";
