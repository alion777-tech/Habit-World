import { formatDateToJST } from "./dateUtils";
import { TEST_LABELS, validTestDayOffset } from "../testAccessModel";
import type { TestAccess } from "@/hooks/useTestAccess";

export type HabitTestContext = { uid: string; dayOffset: number; today: string };

// Calendar arithmetic on JST date strings, independent of the browser's timezone.
export function shiftHabitDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function habitTestDate(realToday: string, uid: string | null, access: TestAccess) {
  const active = !!uid && access.uid === uid && !access.loading && !access.error
    && !!access.label && TEST_LABELS.includes(access.label) && access.enabled
    && validTestDayOffset(access.dayOffset);
  const today = shiftHabitDate(realToday, active ? access.dayOffset : 0);
  return {
    today,
    yesterday: shiftHabitDate(today, -1),
    dayOfWeek: new Date(`${today}T00:00:00Z`).getUTCDay(),
    context: active ? { uid: uid!, dayOffset: access.dayOffset, today } : undefined,
  };
}

export function matchesHabitTestDay(context: HabitTestContext, now: number) {
  return validTestDayOffset(context.dayOffset)
    && shiftHabitDate(formatDateToJST(new Date(now)), context.dayOffset) === context.today;
}
