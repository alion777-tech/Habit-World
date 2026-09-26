export const TEST_LABELS = ["TEST01", "TEST02", "TEST03"] as const;
export type TestLabel = typeof TEST_LABELS[number];
export const MAX_TEST_DAY_OFFSET = 3650;
export function isTestAdminRegistration(value: unknown): value is { enabled: true; label: TestLabel } {
  if (!value || typeof value !== "object") return false;
  const entry = value as { enabled?: unknown; label?: unknown };
  return entry.enabled === true && TEST_LABELS.some(label => label === entry.label);
}
export function validTestDayOffset(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= MAX_TEST_DAY_OFFSET;
}
export function testDate(now: number, dayOffset: number) {
  if (!validTestDayOffset(dayOffset)) throw new Error("テスト日付の範囲外です。");
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  return date;
}
