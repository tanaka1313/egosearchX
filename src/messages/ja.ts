import {
  LIMITS,
  type CondKind,
  type FilterKey,
  type IssueCode,
  type IssueParams,
  type ParamOp,
} from "@/api";
import { ENGINE_LABEL } from "./engine";

const Y = ENGINE_LABEL.yahoo;
const str = (v: IssueParams[string] | undefined) => String(v ?? "");

/**
 * 日本語の辞書。`Messages` 型はこれから導く（en に欠けや余計なキーがあると型エラー→ビルド失敗）。
 * 警告・エラーはコードごとの関数にして、値（params）を埋め込む。数字は params か定数から出す。
 */
const issues: Record<IssueCode, (p: IssueParams) => string> = {
  "period.overridesDateChip": (p) =>
    `期間を指定中のため、日付ボタン「${str(p.label)}」は使われません（期間を優先）`,
  "yahoo.listUnsupported": () =>
    `list: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.filterUnsupported": () =>
    `filter: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.accountExcludeUnsupported": (p) =>
    `${str(p.op)} は${Y}では使えません。${Y}のミュート機能を使ってください`,
  "yahoo.mentionAsReply": () =>
    `@ のメンションは、${Y}では宛先として扱われます`,
  "yahoo.langUnsupported": () =>
    `lang: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.minCountUnsupported": (p) =>
    `${str(p.op)}: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.rawUnverified": (p) =>
    `「${str(p.token)}」が${Y}で使えるかは未確認です（そのまま URL に入れます）`,
  "yahoo.groupUnverified": () =>
    `${Y}では括弧の組み合わせを書き表せないため、X の形のまま出します（結果が変わる場合があります）`,
  "query.tooLong": (p) =>
    `クエリが${str(p.limit)}文字を超えています（${str(p.length)}文字。上限は未確認）`,
  "query.empty": () => "検索語か条件を入力してください",
  "period.inverted": () => "期間の開始日が終了日より後になっています",
  "url.unreadable": () => "URL として読み取れません",
  "url.unsupportedHost": () => `X または ${Y}の URL ではありません`,
  "url.noQuery": () => "検索語（q / p）が含まれていません",
  "list.invalid": () =>
    "リストの URL（https://x.com/i/lists/…）または数字の ID を入力してください",
  "chip.labelTooLong": () => `ラベルは${LIMITS.chipLabel}文字までです`,
  "chip.empty": () => "条件を1つ以上入力してください",
  "chip.badNumber": (p) =>
    `${Number(p.index) + 1}行目：数値は1以上の整数で入力してください`,
  "chip.badDate": (p) =>
    `${Number(p.index) + 1}行目：日付は YYYY-MM-DD の形で入力してください`,
};

export const ja = {
  issues,
  footer: {
    unofficial: "ファンが作った非公式のツールです",
    last: "前回",
    empty: "実行するとここに残ります",
    rerun: "再実行",
    history: "履歴 →",
  },
  header: {
    openMenu: "メニューを開く",
    siteName: "EgoSearch",
    feature: "X（Twitter）",
    featureLabel: "機能：X（Twitter）",
  },
  interest: {
    button: (name: string) => `興味の対象：${name}（押して切り替え）`,
    menu: "興味の対象",
    close: "切り替えを閉じる",
    note: "条件ボタンを、選んだ対象のものに切り替えます（お気に入り・いつものエゴサは共通）。この端末にだけ保存します。",
  },
  strip: {
    label: "いつものエゴサ",
    add: "いつものエゴサを追加",
    empty: "まとめて1タップで開けます",
    emptyTitle: "保存した検索を、1タップでまとめて開けます（［＋］で作成）",
    list: "一覧",
    title: (name: string, count: number, done: boolean) =>
      `${name}（${count}）${done ? "：今日は済" : ""}`,
    run: (name: string, count: number, done: boolean) =>
      `${name}（${count}個）を実行${done ? "（今日は済）" : ""}`,
  },
  blocked: {
    summary: (total: number, failed: number) =>
      `${total}件中${failed}件を開けませんでした。`,
    hint: "ブラウザのポップアップを許可してください。下のリンクから個別に開けます。",
    close: "閉じる",
  },
  menu: {
    label: "メニュー",
    fixedLabel: "メニュー（常時表示）",
    close: "メニューを閉じる",
    closeOutside: "メニューの外を押して閉じる",
    current: "表示中",
    manage: (name: string) => `${name}の管理`,
    manageTitle: (name: string) => `${name}の管理（追加・編集・削除）`,
    items: {
      home: "ホーム",
      buttons: "条件ボタン",
      favorites: "お気に入り",
      groups: "いつものエゴサ",
      history: "履歴",
      trash: "削除済み",
      import: "URL解析",
      about: "このサイトについて",
    },
  },
  toast: {
    undo: "元に戻す",
    saveFailed: "保存できませんでした",
    recordFailed: "履歴に記録できませんでした",
    resetFailed: "データを初期化できませんでした",
  },
  version: {
    open: "バージョン情報",
    title: "バージョン情報",
    description: "この画面のビルド情報です。不具合の報告時に伝えてください。",
    builtAt: "ビルド日時",
    commit: "コミット",
    unknown: "不明",
    close: "閉じる",
  },
  corrupt: {
    message: "保存データを読み込めず、復元できません。",
    reset: "データを初期化する",
  },
  confirm: {
    cancel: "キャンセル",
  },
  resetData: {
    title: "データを初期化しますか？",
    body: "保存データ（条件ボタン・お気に入り・いつものエゴサ・履歴・削除済み・設定）をすべて破棄します。元に戻せません。",
    action: "初期化する",
  },
  lang: {
    label: "言語",
    ja: "日本語",
    en: "English",
  },
  sheet: {
    close: "閉じる",
  },
  enginePicker: {
    legend: "検索先（▶ 実行で開く先）",
    both: "両方",
  },
  home: {
    reason:
      "SNS の検索は毎日するのに、検索コマンドを覚えておく場所がない。その負担を減らしたくて作りました。",
    more: "詳しく →",
    searchSection: "検索",
    wordLabel: "検索する語",
    wordPlaceholder: "名前や #タグ を入力（Enter で X で開く）",
    favorites: "お気に入り",
    favoritesHead: (n: number) => `☆ お気に入り（${n}）`,
    favoritesEmpty: "条件を触って気に入ったら ☆ 保存 でここに入ります",
    run: "▶ 実行",
    runLabel: (name: string) => `${name}を実行`,
    noCondition: "（条件なし）",
    editFavorites: "お気に入りを編集 →",
  },
  search: {
    condition: "条件",
    exact: "完全一致",
    chips: "条件ボタン",
    on: "ON",
    off: "OFF",
    disabled: "無効",
    newBadge: "新",
    periodBlocked: "期間を指定中のため無効です（期間を優先します）",
    periodBlockedTitle: (tokens: string) =>
      `期間を指定中のため無効（${tokens}）`,
    more: (n: number) => `もっと開く（+${n}）`,
    editChips: "ボタンを編集 →",
    suggestLabel: "サジェスト検索条件",
    suggestHeading: "サジェスト（直近の検索などから・この検索にだけ足せます）",
    suggestEmpty: "検索するとここに候補が出ます",
    wordSet: {
      open: "検索ワード集",
      title: "検索ワード集",
      filterLabel: "検索ワード集を絞り込み",
      filterPlaceholder: "名前やタグで絞り込み",
      none: "該当なし",
      close: "閉じる",
    },
    paramLabel: {
      min_faves: "ファボ数",
      min_retweets: "リポスト数",
      min_replies: "返信数",
      since: "開始日",
      until: "終了日",
    } satisfies Record<ParamOp, string>,
    paramSuffix: {
      min_faves: "件以上",
      min_retweets: "件以上",
      min_replies: "件以上",
      since: "以降",
      until: "以前",
    } satisfies Record<ParamOp, string>,
    period: {
      label: "期間",
      d1: "昨日から",
      d3: "3日前から",
      d7: "1週間前から",
      date: "日付",
      from: "開始日（この日以降）",
      to: "終了日（この日を含む）",
      clear: "日付の指定を解除",
      inverted: "⚠ 開始日が終了日より後です",
      since: (d: string) => `${d} 以降`,
      until: (d: string) => `${d} 以前`,
      range: (a: string, b: string) => `${a} 〜 ${b}（終了日を含む）`,
      output: (stored: string, opened: string) =>
        `出力：${stored}${opened !== stored ? `（開くときは ${opened}）` : ""}`,
    },
    preview: {
      label: "組み立てた検索クエリ（長いときは横にスクロール）",
      empty: "（検索語か条件ボタンを選んでください）",
      copy: "クエリをコピー",
      copied: "クエリをコピーしました",
      experimental: "実験的",
      experimentalTitle:
        "実機で確認が済んでいない演算子を含みます（結果が変わる可能性があります）",
    },
    warnings: "注意",
    detail: {
      title: "詳細条件",
      individual: (n: number) => `個別 ${n}`,
      words: "語",
      exact: "完全一致の語",
      plain: "通常の語",
      variants: "表記ゆれ展開（ORで結ぶ）",
      variantsPlaceholder: "例：表記A（Enter）、表記B（Enter）",
      exclude: "除外する語",
      tagPlaceholder: "入力して Enter",
      tagAdd: (label: string) => `${label}を追加`,
      tagRemove: (v: string) => `${v}を削除`,
      add: "追加",
      account: "アカウント",
      from: "from:（このアカウントの投稿）",
      to: "to:（このアカウント宛て）",
      mention: "@（メンション）",
      list: "list:（リストID）",
      excludeAccount: "除外",
      exFrom: "-from:（このアカウントの投稿を除く）",
      exTo: "-to:（このアカウント宛てを除く）",
      exMention: "-@（このメンションを除く）",
      filters: "フィルタ",
      filter: {
        replies: "リプライ",
        retweets: "リポスト",
        quote: "引用",
        images: "画像",
        videos: "動画",
        links: "リンク",
        verified: "認証済み",
      } satisfies Record<FilterKey, string>,
      tri: { any: "指定なし", inc: "含む", exc: "除く" },
      lang: "言語",
      langOptions: {
        "": "指定なし",
        ja: "日本語",
        en: "英語",
        id: "インドネシア語",
      },
      minFaves: "min_faves（いいね数以上）",
      minRt: "min_retweets（リポスト数以上）",
      minReplies: "min_replies（返信数以上）",
      periodSection: "期間",
      disabledTitle: (n: number) =>
        `共通（ONの条件ボタン）の項目別の無効化（${n}個のボタン）`,
      disabledNone: "ONの条件ボタンがありません",
      disabledNote: "この検索では無効",
      rawTitle: "テキストで追加",
      rawNote:
        "上の欄に無い条件を、検索文字列のまま足せます（解析できない演算子もそのまま URL に出力されます）",
      rawLabel: "テキストで追加する条件",
      rawPlaceholder: "foo:bar -baz",
      reset: "この検索の個別設定をリセット",
      resetDone: "個別設定をリセットしました",
    },
    open: {
      openIn: (name: string) => `${name} で開く`,
      yahooTitle: `${ENGINE_LABEL.yahoo}で開く`,
      save: "保存",
      saveLabel: "この検索を保存",
      more: "そのほかの操作",
      copyX: "リンクをコピー（X）",
      copyYahoo: "リンクをコピー（Yahoo）",
      linkCopied: (name: string) => `${name}の検索リンクをコピーしました`,
    },
    saveSheet: {
      title: "この検索を保存",
      name: "お気に入りの名前",
      defaultName: (word: string) => `${word} の検索`,
      defaultNameEmpty: "新しい検索",
      note: "この検索文字列を保存します。「昨日から」などは since:yesterday のまま保存し、開くときの日付で計算します。条件ボタンを後から直しても、保存したものは変わりません。",
      groupLegend: "いつものエゴサに追加（まとめて実行できます）",
      none: "追加しない",
      addTo: (name: string) => `「${name}」に追加`,
      newGroup: "新しいいつものエゴサを作る",
      newGroupName: "新しいいつものエゴサの名前（初期値はお気に入りの名前）",
      newGroupPlaceholder: "例：配信後エゴサ",
      cancel: "キャンセル",
      save: "保存",
      nameRequired: "名前を入力してください",
      groupNameRequired: "いつものエゴサの名前を入力してください",
      saved: "お気に入りに保存しました",
      savedToGroup: (name: string) =>
        `お気に入りに保存し、「${name}」に追加しました`,
      failed: "保存できませんでした",
    },
  },
  importPage: {
    title: "URL解析",
    description: `X か ${Y}の URL を貼ると、条件に分けます。解析できない部分は生トークンとして残し、URL に戻したときに欠けません。既存のデータは上書きしません。`,
    inputLabel: "取り込む URL",
    placeholder: "https://x.com/search?q=…",
    tokens: "解析結果",
    cond: "条件",
    raw: "生トークン（解析できなかった部分）",
    editInHome: "ホームで編集する",
    saveAsFavorite: "新規お気に入りとして保存",
    sheetTitle: "お気に入りに保存",
    saveNote:
      "貼った URL を解析した検索文字列を、新しいお気に入りとして保存します。",
    failed: "操作できませんでした",
  },
  chips: {
    title: "条件ボタン",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: "条件ボタンの数",
    addPresets: "プリセットを追加",
    addPresetsFor: (name: string) => `プリセット（${name}）を追加`,
    add: "＋ 追加",
    description: (interest: string) =>
      `ホームに並ぶボタンです（いま選んでいる「${interest}」の並び。ヘッダーで切り替えると別の並びになります）。ドラッグ（キーボードは Space＋矢印）で並べ替え、ラベルと中身（複数の条件）を編集できます。［コピー］で条件の文字列をクリップボードにコピーできます。「表示」を外すと、ホームには出ません（削除はされません）。削除すると「削除済み」に移り、復元できます。`,
    full: (max: number) =>
      `⚠ 上限（${max}件）です。不要なボタンを削除してください。`,
    empty: "条件ボタンがありません",
    list: "条件ボタンの一覧",
    reorder: (label: string) =>
      `${label}を並べ替え（Space で持ち上げ、矢印で移動）`,
    preset: "プリセット",
    newMark: "新",
    hiddenMark: "非表示",
    conds: (n: number) => `${n}条件`,
    visible: "表示",
    visibleTitle: "ホームに出す。外すとホームの並び・クエリから外れます",
    edit: "編集",
    editLabel: (label: string) => `${label}を編集`,
    copy: "コピー",
    copyTitle: "条件の文字列をクリップボードにコピーします",
    copied: (label: string) => `「${label}」の条件をコピーしました`,
    remove: (label: string) => `${label}を削除`,
    removed: (label: string) => `「${label}」を削除済みへ移しました`,
    presetsAdded: (n: number) => `プリセットのボタンを${n}件追加しました`,
    presetsAllAdded: "プリセットのボタンはすべて登録済みです",
    failed: "操作できませんでした",
    suggest: {
      title: "サジェスト（直近の検索などから）",
      note: (max: number) =>
        `最大${max}件。気に入ったものを条件ボタンに追加できます。候補の表示順は変えられません。`,
      empty: "検索するとここに候補が出ます",
      adopt: "＋ 条件ボタンに追加",
      adoptLabel: (token: string) => `${token}を条件ボタンに追加`,
      full: (max: number) =>
        `⚠ 条件ボタンが上限（${max}件）のため追加できません`,
    },
    editor: {
      addTitle: "条件ボタンを追加",
      editTitle: "条件ボタンを編集",
      label: "ラベル（ボタンの表示名）",
      labelPlaceholder: "例：ネタバレ除外",
      body: "中身（複数の条件を持てます）",
      conds: "条件の一覧",
      reorder: "条件を並べ替え",
      kind: "条件の種類",
      op: "演算子",
      value: "条件の値",
      paramValue: "初期値（ホームで変えられます）",
      remove: "条件を削除",
      addCond: "＋ 条件を追加",
      kinds: {
        word: "語（通常）",
        exact: "語（完全一致）",
        exclude: "除外",
        list: "リスト",
        account: "アカウント",
        filter: "フィルタ",
        raw: "生トークン",
        number: "数値",
        date: "日付",
      } satisfies Record<CondKind, string>,
      hints: {
        word: "ぺこら",
        exact: "兎田ぺこら",
        exclude: "切り抜き",
        list: "リストID（数字）",
        account: "from:ID / to:ID",
        filter: "-filter:retweets",
        raw: "foo:bar",
        number: "50",
        date: "2026-11-07",
      } satisfies Record<CondKind, string>,
      listSection: "リストを登録",
      listInput: "リストの URL または ID",
      listPlaceholder: "https://x.com/i/lists/… または ID",
      listExtract: "取り出す",
      listName: (id: string) => `リスト ${id.slice(0, 6)}…`,
      preview: "プレビュー",
      previewEmpty: "（中身が空です）",
      editNote:
        "保存済みのお気に入り・いつものエゴサには反映されません（それぞれが検索文字列を持っているため）。",
      limit: (max: number) =>
        `上限（${max}件）です。不要なボタンを削除してください。`,
      cancel: "キャンセル",
      save: "保存",
      saveFailed: "保存できませんでした",
    },
  },
  // 要件定義書 9.3。静的 HTML（ja）の title・description もここから出す（src/app/layout.tsx）
  meta: {
    title:
      "ホロライブのエゴサ用 X（Twitter）検索コマンド保存｜Hololive EgoSearch",
    description:
      "ホロライブの推しを X（Twitter）でエゴサする検索コマンドを保存して、毎日の検索をワンタップで開けます。Yahoo!リアルタイム検索にも対応。ログイン不要、ファンが作った非公式ツールです。",
  },
  aboutPage: {
    title: "このサイトについて",
    reasonTitle: "このサイトを作った理由",
    reason1:
      "SNS の検索は毎日のことなのに、検索コマンドを覚えておく機能がありません。毎日いくつも検索するのに、その検索を保存してまとめて実行することもできませんでした。そんな負担を減らしたくて、このサイトを作りました。",
    reason2:
      "そこで、何度でも使える検索ボタン（条件ボタン）を用意し、毎日の調べ物のために「お気に入り」と「いつものエゴサ」の機能を加えました。",
    noResults: "検索結果はこのサイトには表示しません。",
    noResultsRest: `検索の URL を作って、X（Twitter）や ${Y}のページを開くだけです。`,
    stepsTitle: "使い方（3ステップ）",
    steps: [
      "検索したい名前やタグを入力する",
      "条件ボタンと期間を押して絞り込む",
      "［X で開く］または［Yahoo で開く］を押す",
    ],
    featuresTitle: "できること",
    features: [
      {
        title: "検索を組み立てる",
        body: "名前やタグを入れて、条件ボタン（RTを除く、画像つき、リストから…）を押すだけで、X の検索文字列ができます。期間も1タップで指定できます。",
      },
      {
        title: `X と ${Y}の両方で開く`,
        body: `同じ条件を、X と ${Y}の両方で開けます。${Y}で使えない演算子は、黙って消さずに警告でお知らせします。`,
      },
      {
        title: "条件ボタンを自分用に育てる",
        body: "よく使う条件をボタンにして、並べ替え・コピーができます。最近の検索などから、ボタン候補（サジェスト）も出ます。",
      },
      {
        title: "保存して、いつものエゴサでまとめて開く",
        body: "気に入った検索はお気に入りに保存。複数まとめた「いつものエゴサ」を1タップで押すと、全部のタブが開きます。",
      },
      {
        title: "履歴・削除済み・URL解析",
        body: `前回の検索をすぐ再実行。消したものは削除済みから戻せます。X や ${Y}の URL を貼ると、条件に分解してホームで編集できます。`,
      },
    ],
    dataTitle: "データの扱い",
    data: [
      "X にログインしません。X の API も使いません。",
      "保存した内容（条件ボタン・お気に入り・履歴など）は、この端末のブラウザにだけ保存します。サーバーには送りません。",
      "履歴や閲覧内容を、勝手に読み取ることはしません。",
    ],
    unofficial:
      "ホロライブ（カバー株式会社）とは関係のない、ファンが作った非公式のツールです。",
  },
};

/** 辞書の型。en はこれで注釈する */
export type Messages = typeof ja;
