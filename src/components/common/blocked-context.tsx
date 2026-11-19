"use client";

import { createContext, useContext } from "react";
import type { OpenTarget } from "@/api";

/**
 * ブロックされて開けなかった検索を、帯の下の `BlockedNotice`（画面仕様書 2.2）に出す入口。
 * 本文の画面（ホームなど）が検索を開いたときも、同じ表示を使う。Provider が無いときは何もしない（部品の単体テスト用）。
 */
export type ReportBlocked = (total: number, blocked: OpenTarget[]) => void;

export const BlockedContext = createContext<ReportBlocked>(() => {});

export const useReportBlocked = (): ReportBlocked => useContext(BlockedContext);
