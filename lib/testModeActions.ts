import { doc, getDocFromServer, runTransaction, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { isTestAdminRegistration, validTestDayOffset, testDate } from "./testAccessModel";
import { calcToggleHabit } from "./habits/calcToggleHabit";
import { formatDateToJST } from "./habits/dateUtils";
import type { Habit } from "@/types/appTypes";

export type TestWorkspace = { habits: Habit[]; earnedHabitStreakBonuses: number[] };
export function initialTestWorkspace(): TestWorkspace {
  return { habits: [{ id: "sample-habit", text: "テスト用の習慣", type: "daily", createdAt: null,
    dailyStreak: 0, lastCompletedDate: null, point: 0, pointHistory: [] }], earnedHabitStreakBonuses: [] };
}
async function requireGoogleUser() {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || (await user.getIdTokenResult()).signInProvider !== "google.com" || auth.currentUser?.uid !== user.uid) {
    throw new Error("Googleアカウントでログインしてください。");
  }
  return user.uid;
}
export async function setTestMode(enabled: boolean) {
  const uid = await requireGoogleUser();
  // A server read prevents enabling a cached grant; rules also validate every write.
  if (!isTestAdminRegistration((await getDocFromServer(doc(db, "testAdmins", uid))).data())) throw new Error("テスト管理者権限がありません。");
  await setDoc(doc(db, "testSessions", uid), { enabled, dayOffset: 0 });
}
export async function changeTestDay(change: -1 | 0 | 1) {
  const uid = await requireGoogleUser();
  await runTransaction(db, async tx => {
    const ref = doc(db, "testSessions", uid);
    const registration = (await tx.get(doc(db, "testAdmins", uid))).data();
    const session = (await tx.get(ref)).data();
    if (!isTestAdminRegistration(registration) || session?.enabled !== true) throw new Error("テストモードをONにしてください。");
    const next = change === 0 ? 0 : Number(session.dayOffset) + change;
    if (!validTestDayOffset(next)) throw new Error("日付は前後3650日以内で指定してください。");
    tx.update(ref, { dayOffset: next });
  });
}
export async function updateTestHabit(habitId?: string) {
  const uid = await requireGoogleUser();
  const now = Date.now();
  await runTransaction(db, async tx => {
    const registration = (await tx.get(doc(db, "testAdmins", uid))).data();
    const session = (await tx.get(doc(db, "testSessions", uid))).data();
    const ref = doc(db, "testWorkspaces", uid);
    const saved = await tx.get(ref);
    if (!isTestAdminRegistration(registration) || session?.enabled !== true || !validTestDayOffset(session.dayOffset)) throw new Error("テストモードをONにしてください。");
    const workspace = saved.exists() ? saved.data() as TestWorkspace : initialTestWorkspace();
    if (habitId) {
      const habit = workspace.habits.find(item => item.id === habitId);
      if (!habit) throw new Error("テスト習慣が見つかりません。");
      const date = testDate(now, session.dayOffset);
      const yesterday = new Date(date); yesterday.setDate(yesterday.getDate() - 1);
      const today = formatDateToJST(date);
      const result = calcToggleHabit(habit, today, today, formatDateToJST(yesterday), workspace.earnedHabitStreakBonuses);
      workspace.habits = workspace.habits.map(item => item.id === habitId ? { ...item, ...result.fields } : item);
      if (result.earnedHabitStreakBonus) workspace.earnedHabitStreakBonuses = result.earnedHabitStreakBonus.earnedBonuses;
    }
    tx.set(ref, workspace);
  });
}
