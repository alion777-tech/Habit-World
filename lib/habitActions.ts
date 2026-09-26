// lib/habitActions.ts
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocalStorageRepository } from "./localActions";
import { LS_KEYS } from "./dataPersistence";

// 追加
export const addHabit = async (
  uid: string | null, // nullを許容
  habit: string,
  habitType: "daily" | "weekly",
  daysOfWeek: number[]
) => {
  if (!habit.trim()) return;

  console.log("[addHabit] start:", { uid, habit, habitType, daysOfWeek });

  if (uid) {
    try {
      const docRef = await addDoc(collection(db, "users", uid, "habits"), {
        text: habit,
        type: habitType,
        daysOfWeek: habitType === "weekly" ? daysOfWeek : null,
        createdAt: serverTimestamp(),
        dailyStreak: 0,
        lastCompletedDate: null,
        point: 0,
        pointHistory: [],
      });
      console.log("[addHabit] success Firestore:", docRef.id);
    } catch (e) {
      console.error("[addHabit] failed Firestore:", e);
      throw e;
    }
  } else {
    // LocalStorage
    const newHabit = {
      id: "local_" + Date.now().toString(),
      text: habit,
      type: habitType,
      daysOfWeek: habitType === "weekly" ? daysOfWeek : null,
      createdAt: new Date(),
      dailyStreak: 0,
      lastCompletedDate: null,
      point: 0,
      pointHistory: [],
    };
    LocalStorageRepository.addItem(LS_KEYS.HABITS, newHabit);
    console.log("[addHabit] success LocalStorage:", newHabit.id);
  }
};

// 削除
export const deleteHabit = async (uid: string | null, id: string) => {
  if (!id) return;

  if (uid) {
    try {
      await deleteDoc(doc(db, "users", uid, "habits", id));
    } catch (e) {
      console.error("deleteHabit failed Firestore:", e);
      throw e;
    }
  } else {
    LocalStorageRepository.deleteItem(LS_KEYS.HABITS, id);
    console.log("[deleteHabit] success LocalStorage:", id);
  }
};
