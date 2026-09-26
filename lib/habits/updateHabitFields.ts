import { habitCompletionPlan } from "./completionModel";
import { readEconomy, syncLocalEconomy } from "../economyActions";
import { reconcileEconomy } from "../economyModel";
// lib/habits/updateHabitFields.ts
import { doc, updateDoc, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { isTestAdminRegistration } from "../testAccessModel";
import { matchesHabitTestDay, type HabitTestContext } from "./habitTestDate";
import { LocalStorageRepository } from "../localActions";
import { LS_KEYS } from "../dataPersistence";
import { createRoom, recoverFromHabit } from "../fairyRoomModel";
import { formatDateToJST } from "./dateUtils";
import type { Habit, Goal, UserProfile } from "@/types/appTypes";

export const updateHabitFields = async (
  uid: string | null,
  habitId: string,
  fields: Record<string, any>,
  testContext?: HabitTestContext,
  completion?: { date: string; done: boolean }
) => {
  if (!habitId) return;

  if (testContext) {
    const user = auth.currentUser;
    if (!uid || testContext.uid !== uid || user?.uid !== uid || user.isAnonymous
      || (await user.getIdTokenResult()).signInProvider !== "google.com") {
      throw new Error("テスト権限が変更されました。日付を確認して再試行してください。");
    }
  }

  if (uid) {
    const habitRef = doc(db, "users", uid, "habits", habitId);
    if (!completion && !Array.isArray(fields.pointHistory)) {
      await updateDoc(habitRef, fields);
      return;
    }
    const now = Date.now();
    const today = formatDateToJST(new Date(now));
    return runTransaction(db, async tx => {
      if (testContext) {
        const registration = (await tx.get(doc(db, "testAdmins", uid))).data();
        const session = (await tx.get(doc(db, "testSessions", uid))).data();
        if (auth.currentUser?.uid !== uid || !isTestAdminRegistration(registration)
          || session?.enabled !== true || session.dayOffset !== testContext.dayOffset
          || !matchesHabitTestDay(testContext, Date.now())) {
          throw new Error("テスト日付または権限が変更されました。再試行してください。");
        }
      }
      const habit = (await tx.get(habitRef)).data();
      const profileRef = doc(db, "users", uid);
      const state = await readEconomy(tx, uid);
      const profile = state.profile;
      if (!habit) throw Error("習慣が見つかりません。");
      const targetToday = testContext?.today ?? today;
      const before = new Date(targetToday + "T00:00:00Z"); before.setUTCDate(before.getUTCDate() - 1);
      const plan = completion ? habitCompletionPlan(profile, state.economy, { ...habit, id: habitId } as Habit, completion.date, completion.done, targetToday, before.toISOString().slice(0, 10)) : undefined;
      if (completion && !plan) return;
      const nextFields = plan?.result.fields ?? fields;
      const nextProfile = { ...profile, ...plan?.patch, economy: state.economy };
      const economy = reconcileEconomy(nextProfile, state.habits.map(h => h.id === habitId ? { ...h, ...nextFields } : h), state.goals);
      const hadToday = habit?.pointHistory?.some((entry: { date: string }) => entry.date === today);
      const hasToday = nextFields.pointHistory.some((entry: { date: string }) => entry.date === today);
      tx.update(habitRef, nextFields);
      tx.set(profileRef, { ...plan?.patch, economy }, { merge: true });
      if (!hadToday && hasToday && profile?.fairy?.status === "ready") {
        const room = profile.fairyRoom ?? createRoom(now, profile.fairy.bornAt);
        tx.update(profileRef, { fairyRoom: recoverFromHabit(room, now, today, habitId) });
      }
      return plan?.result;
    });
  } else {
    syncLocalEconomy();
    const profile = LocalStorageRepository.getProfile() || {};
    const habits = LocalStorageRepository.getList<Habit>(LS_KEYS.HABITS);
    const habit = habits.find(h => h.id === habitId);
    if (!habit) throw Error("習慣が見つかりません。");
    const today = formatDateToJST(new Date());
    const yesterday = formatDateToJST(new Date(Date.now() - 86400000));
    const plan = completion ? habitCompletionPlan(profile, profile.economy!, habit, completion.date, completion.done, today, yesterday) : undefined;
    if (completion && !plan) return;
    const nextFields = plan?.result.fields ?? fields;
    const nextProfile = { ...profile, ...plan?.patch };
    const economy = reconcileEconomy(nextProfile, habits.map(h => h.id === habitId ? { ...h, ...nextFields } : h), LocalStorageRepository.getList<Goal>(LS_KEYS.GOALS));
    LocalStorageRepository.saveCompletion(LS_KEYS.HABITS, habits.map(h => h.id === habitId ? { ...h, ...nextFields } : h), { ...nextProfile, economy });
    return plan?.result;
  }
};

export const setHabitCompletion = (uid: string | null, habitId: string, date: string, done: boolean, context?: HabitTestContext) => updateHabitFields(uid, habitId, {}, context, { date, done });
