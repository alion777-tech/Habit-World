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
import type { UserProfile } from "@/types/appTypes";

export const updateHabitFields = async (
  uid: string | null,
  habitId: string,
  fields: Record<string, any>,
  testContext?: HabitTestContext
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
    if (!Array.isArray(fields.pointHistory)) {
      await updateDoc(habitRef, fields);
      return;
    }
    const now = Date.now();
    const today = formatDateToJST(new Date(now));
    await runTransaction(db, async tx => {
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
      const hadToday = habit?.pointHistory?.some((entry: { date: string }) => entry.date === today);
      const hasToday = fields.pointHistory.some((entry: { date: string }) => entry.date === today);
      tx.update(habitRef, fields);
      tx.set(profileRef, { economy: reconcileEconomy({ ...profile, economy: state.economy }, state.habits.map(h => h.id === habitId ? { ...h, ...fields } : h), state.goals) }, { merge: true });
      if (!hadToday && hasToday && profile?.fairy?.status === "ready") {
        const room = profile.fairyRoom ?? createRoom(now, profile.fairy.bornAt);
        tx.update(profileRef, { fairyRoom: recoverFromHabit(room, now, today, habitId) });
      }
    });
  } else {
    syncLocalEconomy();
    LocalStorageRepository.updateItem(LS_KEYS.HABITS, habitId, fields);
    syncLocalEconomy();
  }
};
