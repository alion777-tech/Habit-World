// lib/habits/calcToggleHabit.ts
import { formatDateToJST } from "./dateUtils";

type Habit = {
  id: string;
  text: string;
  dailyStreak: number;
  lastCompletedDate: string | null;
  point: number | null;
  pointHistory: { date: string; point: number }[];
};

type EarnedHabitStreakBonus = {
  streak: number;
  point: number;
  earnedBonuses: number[];
};

type ToggleCalcResult =
  | {
      kind: "uncheck";
      fields: {
        lastCompletedDate: string | null;
        dailyStreak: number;
        point: number;
        pointHistory: { date: string; point: number }[];
      };
      pointDelta: number;
      alertMessage?: string;
      earnedHabitStreakBonus?: EarnedHabitStreakBonus;
    }
  | {
      kind: "check";
      fields: {
        dailyStreak: number;
        lastCompletedDate: string;
        point: number;
        pointHistory: { date: string; point: number }[];
      };
      pointDelta: number;
      alertMessage?: string;
      earnedHabitStreakBonus?: EarnedHabitStreakBonus;
    };

const HABIT_STREAK_BONUS_POINTS: Record<number, number> = {
  3: 5,
  7: 20,
  10: 30,
  21: 70,
  30: 100,
  90: 300,
  210: 700,
  365: 1500,
  1095: 3000,
  2555: 7000,
  3650: 10000,
};

const getBonusPoint = (streak: number): number =>
  HABIT_STREAK_BONUS_POINTS[streak] ?? 0;

const getStreakAtDate = (history: { date: string }[], targetDate: string): number => {
  let streak = 0;
  let current = targetDate;

  while (history.some((h) => h.date === current)) {
    streak++;
    const d = new Date(current);
    d.setDate(d.getDate() - 1);
    current = formatDateToJST(d);
  }

  return streak;
};

export const calcToggleHabit = (
  h: Habit,
  targetDate: string,
  todayStr: string,
  yesterdayStr: string,
  earnedHabitStreakBonuses: number[] = []
): ToggleCalcResult => {
  const currentPoint = h.point ?? 0;
  const history = Array.isArray(h.pointHistory) ? h.pointHistory : [];
  const earnedBonuses = Array.isArray(earnedHabitStreakBonuses)
    ? earnedHabitStreakBonuses
    : [];

  const targetEntry = history.find((p) => p.date === targetDate);
  const isDoneTarget = !!targetEntry;

  if (isDoneTarget) {
    const minus = targetEntry?.point ?? 0;
    const newHistory = history.filter((p) => p.date !== targetDate);
    let newDailyStreak = 0;
    let newLastCompletedDate: string | null = null;

    if (newHistory.length > 0) {
      const sorted = [...newHistory].sort((a, b) => b.date.localeCompare(a.date));
      newLastCompletedDate = sorted[0].date;
      newDailyStreak = getStreakAtDate(newHistory, newLastCompletedDate);
    }

    return {
      kind: "uncheck",
      fields: {
        lastCompletedDate: newLastCompletedDate,
        dailyStreak: newDailyStreak,
        point: currentPoint - minus,
        pointHistory: newHistory,
      },
      pointDelta: -minus,
    };
  }

  const d = new Date(targetDate);
  d.setDate(d.getDate() - 1);
  const dayBeforeTarget = formatDateToJST(d);
  const prevStreak = getStreakAtDate(history, dayBeforeTarget);

  const targetStreak = prevStreak + 1;
  const historyWithBasePoint = [...history, { date: targetDate, point: 1 }];
  let finalStreak = targetStreak;
  let finalLastCompletedDate = targetDate;

  if (targetDate === yesterdayStr && history.some((p) => p.date === todayStr)) {
    finalStreak = targetStreak + 1;
    finalLastCompletedDate = todayStr;
  } else {
    const sorted = [...historyWithBasePoint].sort((a, b) => b.date.localeCompare(a.date));
    finalLastCompletedDate = sorted[0].date;
    finalStreak = getStreakAtDate(historyWithBasePoint, finalLastCompletedDate);
  }

  const bonusPoint = earnedBonuses.includes(finalStreak)
    ? 0
    : getBonusPoint(finalStreak);
  const earnedPoint = 1 + bonusPoint;
  const newHistory = [...history, { date: targetDate, point: earnedPoint }];
  const newEarnedBonuses =
    bonusPoint > 0 ? [...earnedBonuses, finalStreak] : earnedBonuses;
  const earnedHabitStreakBonus =
    bonusPoint > 0
      ? {
          streak: finalStreak,
          point: bonusPoint,
          earnedBonuses: newEarnedBonuses,
        }
      : undefined;

  return {
    kind: "check",
    fields: {
      dailyStreak: finalStreak,
      lastCompletedDate: finalLastCompletedDate,
      point: currentPoint + earnedPoint,
      pointHistory: newHistory,
    },
    pointDelta: earnedPoint,
    alertMessage: earnedHabitStreakBonus
      ? `連続${finalStreak}日達成ボーナス: +${bonusPoint}pt`
      : undefined,
    earnedHabitStreakBonus,
  };
};
