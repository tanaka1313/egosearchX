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
};
