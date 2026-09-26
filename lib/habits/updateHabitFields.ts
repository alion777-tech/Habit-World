// lib/habits/updateHabitFields.ts
import { doc, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocalStorageRepository } from "../localActions";
import { LS_KEYS } from "../dataPersistence";
import { createRoom, recoverFromHabit } from "../fairyRoomModel";
import { formatDateToJST } from "./dateUtils";
import type { UserProfile } from "@/types/appTypes";

export const updateHabitFields = async (
  uid: string | null,
  habitId: string,
  fields: Record<string, any>
) => {
  if (!habitId) return;

  if (uid) {
    const habitRef = doc(db, "users", uid, "habits", habitId);
    if (!Array.isArray(fields.pointHistory)) {
      await updateDoc(habitRef, fields);
      return;
    }
    const now = Date.now();
    const today = formatDateToJST(new Date(now));
    await runTransaction(db, async tx => {
      const habit = (await tx.get(habitRef)).data();
      const profileRef = doc(db, "users", uid);
      const profile = (await tx.get(profileRef)).data() as UserProfile | undefined;
      const hadToday = habit?.pointHistory?.some((entry: { date: string }) => entry.date === today);
      const hasToday = fields.pointHistory.some((entry: { date: string }) => entry.date === today);
      tx.update(habitRef, fields);
      if (!hadToday && hasToday && profile?.fairy?.status === "ready") {
        const room = profile.fairyRoom ?? createRoom(now, profile.fairy.bornAt);
        tx.update(profileRef, { fairyRoom: recoverFromHabit(room, now, today, habitId) });
      }
    });
  } else {
    LocalStorageRepository.updateItem(LS_KEYS.HABITS, habitId, fields);
  }
};
