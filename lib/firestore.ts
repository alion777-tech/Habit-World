import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* ========== DREAMS ========== */

// 夢を追加
export async function createDream(uid: string, title: string, description: string) {
  const ref = collection(db, "users", uid, "dreams");
  await addDoc(ref, {
    title,
    description,
    createdAt: serverTimestamp(),
  });
}

// 夢一覧を取得
export async function getDreams(uid: string) {
  const ref = collection(db, "users", uid, "dreams");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ========== GOALS ========== */

export async function createGoal(uid: string, dreamId: string, title: string) {
  const ref = collection(db, "users", uid, "dreams", dreamId, "goals");
  await addDoc(ref, {
    title,
    createdAt: serverTimestamp(),
  });
}

export async function getGoals(uid: string, dreamId: string) {
  const ref = collection(db, "users", uid, "dreams", dreamId, "goals");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ========== HABITS ========== */

export async function createHabit(
  uid: string,
  dreamId: string,
  goalId: string,
  title: string
) {
  const ref = collection(
    db,
    "users",
    uid,
    "dreams",
    dreamId,
    "goals",
    goalId,
    "habits"
  );
  await addDoc(ref, {
    title,
    completedToday: false,
    createdAt: serverTimestamp(),
  });
}

export async function toggleHabit(
  uid: string,
  dreamId: string,
  goalId: string,
  habitId: string,
  done: boolean
) {
  const ref = doc(
    db,
    "users",
    uid,
    "dreams",
    dreamId,
    "goals",
    goalId,
    "habits",
    habitId
  );
  await updateDoc(ref, { completedToday: done });
}
