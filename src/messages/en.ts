import { LIMITS } from "@/api";
import { ENGINE_LABEL } from "./engine";
import type { Messages } from "./ja";

const Y = ENGINE_LABEL.yahoo;
const str = (v: string | number | undefined) => String(v ?? "");

/** 英語の辞書。文言は暫定で、全画面の文言とあわせて #67 で確定する */
export const en: Messages = {
  issues: {
    "period.overridesDateChip": (p) =>
      `A period is set, so the date button "${str(p.label)}" is not used (the period takes priority)`,
    "yahoo.listUnsupported": () =>
      `list: is not supported on ${Y} (it will be dropped)`,
    "yahoo.filterUnsupported": () =>
      `filter: is not supported on ${Y} (it will be dropped)`,
    "yahoo.accountExcludeUnsupported": (p) =>
      `${str(p.op)} is not supported on ${Y}. Use its mute feature instead`,
    "yahoo.mentionAsReply": () =>
      `A mention (@) is treated as a recipient on ${Y}`,
    "yahoo.langUnsupported": () =>
      `lang: is not supported on ${Y} (it will be dropped)`,
    "yahoo.minCountUnsupported": (p) =>
      `${str(p.op)}: is not supported on ${Y} (it will be dropped)`,
    "yahoo.rawUnverified": (p) =>
      `It is not confirmed that "${str(p.token)}" works on ${Y} (it is put into the URL as is)`,
    "yahoo.groupUnverified": () =>
      `${Y} cannot express this combination of parentheses, so the query is kept in X's form (results may differ)`,
    "query.tooLong": (p) =>
      `The query is over ${str(p.limit)} characters (${str(p.length)}; the real limit is unconfirmed)`,
    "query.empty": () => "Enter a search word or a condition",
    "period.inverted": () => "The start date is after the end date",
    "url.unreadable": () => "This cannot be read as a URL",
    "url.unsupportedHost": () => `This is not a URL of X or ${Y}`,
    "url.noQuery": () => "The URL has no search word (q / p)",
    "list.invalid": () =>
      "Enter a list URL (https://x.com/i/lists/…) or a numeric ID",
    "chip.labelTooLong": () =>
      `The label can be up to ${LIMITS.chipLabel} characters`,
    "chip.empty": () => "Enter at least one condition",
    "chip.badNumber": (p) =>
      `Row ${Number(p.index) + 1}: enter a whole number of 1 or more`,
    "chip.badDate": (p) =>
      `Row ${Number(p.index) + 1}: enter a date as YYYY-MM-DD`,
  },
  footer: {
    unofficial: "An unofficial fan-made tool",
    last: "Last",
    empty: "Your searches will appear here",
    rerun: "Run again",
    history: "History →",
  },
  header: {
    openMenu: "Open menu",
    siteName: "EgoSearch",
    feature: "X (Twitter)",
    featureLabel: "Feature: X (Twitter)",
  },
  interest: {
    button: (name) => `Interest: ${name} (press to switch)`,
    menu: "Interest",
    close: "Close the switcher",
    note: "Switches the condition buttons to the selected interest (favorites and routines are shared). Saved on this device only.",
  },
  strip: {
    label: "Routines",
    add: "Add a routine",
    empty: "Open several searches with one tap",
    emptyTitle:
      "Open your saved searches together with one tap (create one with [+])",
    list: "All",
    title: (name, count, done) =>
      `${name} (${count})${done ? ": done today" : ""}`,
    run: (name, count, done) =>
      `Run ${name} (${count} searches)${done ? " (done today)" : ""}`,
  },
  blocked: {
    summary: (total, failed) =>
      `${failed} of ${total} ${total === 1 ? "tab" : "tabs"} could not be opened.`,
    hint: "Allow pop-ups in your browser. You can also open each one from the links below.",
    close: "Close",
  },
  menu: {
    label: "Menu",
    fixedLabel: "Menu (always shown)",
    close: "Close menu",
    closeOutside: "Close menu (press outside)",
    current: "Current",
    manage: (name) => `Manage ${name}`,
    manageTitle: (name) => `Manage ${name} (add, edit, delete)`,
    items: {
      home: "Home",
      buttons: "Condition buttons",
      favorites: "Favorites",
      groups: "Routines",
      history: "History",
      trash: "Trash",
      import: "Parse URL",
      about: "About this site",
    },
  },
  toast: {
    undo: "Undo",
    saveFailed: "Could not save",
    recordFailed: "Could not save to history",
    resetFailed: "Could not reset the data",
  },
  version: {
    open: "Version info",
    title: "Version info",
    description:
      "Build information for this page. Please include it when reporting a problem.",
    builtAt: "Built at",
    commit: "Commit",
    unknown: "Unknown",
    close: "Close",
  },
  corrupt: {
    message: "Your saved data could not be read and cannot be recovered.",
    reset: "Reset data",
  },
  confirm: {
    cancel: "Cancel",
  },
  resetData: {
    title: "Reset all data?",
    body: "This discards all saved data (buttons, favorites, routines, history, trash and settings). This cannot be undone.",
    action: "Reset",
  },
  lang: {
    label: "Language",
    ja: "日本語",
    en: "English",
  },
  sheet: {
    close: "Close",
  },
  enginePicker: {
    legend: "Search on (opened by ▶ Run)",
    both: "Both",
  },
  home: {
    reason:
      "I search social media every day, but there is no place to keep the search commands. I built this to lighten that burden.",
    more: "Read more →",
    searchSection: "Search",
    wordLabel: "Search words",
    wordPlaceholder: "Enter a name or #tag (Enter opens it on X)",
    favorites: "Favorites",
    favoritesHead: (n) => `☆ Favorites (${n})`,
    favoritesEmpty: "Tweak the conditions, and ☆ Save puts your favorites here",
    run: "▶ Run",
    runLabel: (name) => `Run ${name}`,
    noCondition: "(no conditions)",
    editFavorites: "Edit favorites →",
  },
  search: {
    condition: "Conditions",
    exact: "Exact match",
    chips: "Condition buttons",
    on: "ON",
    off: "OFF",
    disabled: "Disabled",
    newBadge: "New",
    periodBlocked: "A period is set, so this is disabled (the period wins)",
    periodBlockedTitle: (tokens) =>
      `Disabled while a period is set (${tokens})`,
    more: (n) => `Show more (+${n})`,
    editChips: "Edit buttons →",
    suggestLabel: "Suggested conditions",
    suggestHeading:
      "Suggestions (from recent searches; added to this search only)",
    suggestEmpty: "Suggestions appear here after you search",
    paramLabel: {
      min_faves: "Likes",
      min_retweets: "Reposts",
      min_replies: "Replies",
      since: "Start date",
      until: "End date",
    },
    paramSuffix: {
      min_faves: "or more",
      min_retweets: "or more",
      min_replies: "or more",
      since: "onward",
      until: "or earlier",
    },
    period: {
      label: "Period",
      d1: "Since yesterday",
      d3: "Last 3 days",
      d7: "Last week",
      date: "Date",
      from: "Start date (this day onward)",
      to: "End date (this day included)",
      clear: "Clear the date range",
      inverted: "⚠ The start date is after the end date",
      since: (d) => `${d} onward`,
      until: (d) => `${d} or earlier`,
      range: (a, b) => `${a} – ${b} (end date included)`,
      output: (stored, opened) =>
        `Output: ${stored}${opened !== stored ? ` (when opened: ${opened})` : ""}`,
    },
    preview: {
      label: "The built search query (scrolls sideways when long)",
      empty: "(Enter search words or pick a condition button)",
      copy: "Copy the query",
      copied: "Copied the query",
      experimental: "Experimental",
      experimentalTitle:
        "Includes an operator that has not been confirmed on the real site (results may change)",
    },
    warnings: "Notes",
    detail: {
      title: "Advanced conditions",
      individual: (n) => `Own ${n}`,
      words: "Words",
      exact: "Exact words",
      plain: "Plain words",
      variants: "Spelling variants (joined with OR)",
      variantsPlaceholder: "e.g. spelling A (Enter), spelling B (Enter)",
      exclude: "Excluded words",
      tagPlaceholder: "Type and press Enter",
      tagAdd: (label) => `Add to ${label}`,
      tagRemove: (v) => `Remove ${v}`,
      add: "Add",
      account: "Accounts",
      from: "from: (posts by this account)",
      to: "to: (replies to this account)",
      mention: "@ (mention)",
      list: "list: (list ID)",
      excludeAccount: "Exclude",
      exFrom: "-from: (exclude posts by this account)",
      exTo: "-to: (exclude replies to this account)",
      exMention: "-@ (exclude this mention)",
      filters: "Filters",
      filter: {
        replies: "Replies",
        retweets: "Reposts",
        quote: "Quotes",
        images: "Images",
        videos: "Videos",
        links: "Links",
        verified: "Verified",
      },
      tri: { any: "Any", inc: "Include", exc: "Exclude" },
      lang: "Language",
      langOptions: {
        "": "Any",
        ja: "Japanese",
        en: "English",
        id: "Indonesian",
      },
      minFaves: "min_faves (at least this many likes)",
      minRt: "min_retweets (at least this many reposts)",
      minReplies: "min_replies (at least this many replies)",
      periodSection: "Period",
      disabledTitle: (n) =>
        `Turn off parts of the shared (ON) buttons (${n} buttons)`,
      disabledNone: "No condition buttons are ON",
      disabledNote: "Off for this search",
      rawTitle: "Add as text",
      rawNote:
        "Add conditions not covered above as search text (operators that cannot be parsed are put into the URL as is)",
      rawLabel: "Conditions to add as text",
      rawPlaceholder: "foo:bar -baz",
      reset: "Reset this search's own settings",
      resetDone: "Reset the settings of this search",
    },
    open: {
      openIn: (name) => `Open on ${name}`,
      yahooTitle: `Open on ${ENGINE_LABEL.yahoo}`,
      save: "Save",
      saveLabel: "Save this search",
      more: "More actions",
      copyX: "Copy link (X)",
      copyYahoo: "Copy link (Yahoo)",
      linkCopied: (name) => `Copied the ${name} search link`,
    },
    saveSheet: {
      title: "Save this search",
      name: "Favorite name",
      defaultName: (word) => `Search for ${word}`,
      defaultNameEmpty: "New search",
      note: "This search text is saved as is. Things like “since yesterday” are kept as since:yesterday and worked out from the date you open it. Changing the condition buttons later does not change what you saved.",
      groupLegend: "Add to a routine (run several at once)",
      none: "Do not add",
      addTo: (name) => `Add to “${name}”`,
      newGroup: "Create a new routine",
      newGroupName: "Name of the new routine (starts as the favorite name)",
      newGroupPlaceholder: "e.g. After-stream check",
      cancel: "Cancel",
      save: "Save",
      nameRequired: "Enter a name",
      groupNameRequired: "Enter a name for the routine",
      saved: "Saved to favorites",
      savedToGroup: (name) => `Saved to favorites and added to “${name}”`,
      failed: "Could not save",
    },
  },
};
