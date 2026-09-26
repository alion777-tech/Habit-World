// hooks/useHabitCalendar.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyStat, Habit } from "@/types/appTypes";
import { isHabitVisibleOnDate } from "@/lib/habits/visibility";
import { formatDateToJST, getJSTDayOfWeek } from "@/lib/habits/dateUtils";

export const useHabitCalendar = (habits: Habit[], authorizedDayOffset?: number) => {
  // テスト日付オフセット（DEVボタンで増減する前提）
  const [testDayOffset, setTestDayOffset] = useState(0);
  // Only the isolated test sandbox passes the server-confirmed offset.
  const effectiveDayOffset = authorizedDayOffset ?? testDayOffset;

  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const currentDay = formatDateToJST(new Date(clock));

  // テスト基準日
  const base = useMemo(() => {
    const b = new Date();
    b.setDate(b.getDate() + effectiveDayOffset);
    return b;
  }, [effectiveDayOffset, currentDay]);

  const todayStr = useMemo(() => formatDateToJST(base), [base]);

  const yesterdayStr = useMemo(() => {
    const y = new Date(base);
    y.setDate(y.getDate() - 1);
    return formatDateToJST(y);
  }, [base]);

  // カレンダー表示中の月
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // テスト日付を動かしたら、その月に追従（安全版）
  useEffect(() => {
    setCurrentMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [base]);

  // 月の日付一覧（YYYY-MM-DD）
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return formatDateToJST(d);
    });
  }, [currentMonth]);

  // 達成率（カレンダー日付ベース）
  const dailyStats: DailyStat[] = useMemo(() => {
    const completed = new Map(habits.map(h => [h.id, new Set((h.pointHistory ?? []).map(p => p.date))]));
    return calendarDays.map((date) => {
      const todaysHabits = habits.filter((h) => isHabitVisibleOnDate(h, date));
      const total = todaysHabits.length;

      const doneCount = todaysHabits.filter((h) =>
        completed.get(h.id)?.has(date)
      ).length;

      const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);
      return { date, total, doneCount, rate };
    });
  }, [calendarDays, habits]);

  // 「今日の曜日」（weekly表示用）
  const todayDow = useMemo(() => getJSTDayOfWeek(base), [base]);

  return {
    // テスト日付
    testDayOffset,
    setTestDayOffset,
    base,
    todayStr,
    yesterdayStr,
    todayDow,

    // カレンダー
    currentMonth,
    setCurrentMonth,
    calendarDays,
    dailyStats,
  };
};
