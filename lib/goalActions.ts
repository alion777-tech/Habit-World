// lib/goalActions.ts
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocalStorageRepository } from "./localActions";
import { LS_KEYS } from "./dataPersistence";
import type { Goal } from "@/types/appTypes";
import { publicGoalList } from "./goalModel";

export type GoalDoc = {
  id: string;
  title: string;
  deadline?: string | null;
  done: boolean;
  createdAt: any; // serverTimestamp or Date
  achievedAt?: any;
};

export const addGoal = async (uid: string | null, title: string, deadline?: string) => {
  if (!title.trim()) return;

  if (uid) {
    const { serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(db, "users", uid, "goals"), {
      title: title.trim(),
      deadline: deadline || null,
      done: false,
      visibility: "private",
      createdAt: serverTimestamp(),
    });
  } else {
    const newGoal: GoalDoc = {
      id: "local_goal_" + Date.now().toString(),
      title: title.trim(),
      deadline: deadline || null,
      done: false,
      createdAt: new Date(),
    };
    LocalStorageRepository.addItem(LS_KEYS.GOALS, newGoal);
  }
  if (uid) await syncPublicGoals(uid);
};

export const updateGoal = async (
  uid: string | null,
  goalId: string,
  fields: Partial<{ title: string; deadline: string | null; done: boolean }>
) => {
  if (!goalId) return;

  const data: any = { ...fields };
  
  if (uid) {
    if (fields.done === true) {
      const { serverTimestamp } = await import("firebase/firestore");
      data.achievedAt = serverTimestamp();
    } else if (fields.done === false) {
      data.achievedAt = null;
    }
    await updateDoc(doc(db, "users", uid, "goals", goalId), data);
  } else {
    if (fields.done === true) {
      data.achievedAt = new Date();
    } else if (fields.done === false) {
      data.achievedAt = null;
    }
    LocalStorageRepository.updateItem(LS_KEYS.GOALS, goalId, data);
  }
  if (uid) await syncPublicGoals(uid);
};

export const deleteGoal = async (uid: string | null, goalId: string) => {
  if (!goalId) return;
  if (uid) {
    await deleteDoc(doc(db, "users", uid, "goals", goalId));
  } else {
    LocalStorageRepository.deleteItem(LS_KEYS.GOALS, goalId);
  }
  if (uid) await syncPublicGoals(uid);
};

/** Private source documents remain private; only the first three active goals are copied. */
export async function syncPublicGoals(uid: string, publicPatch: Record<string, unknown> = {}) {
  const list = await getDocs(collection(db, "users", uid, "goals"));
  await runTransaction(db, async tx => {
    const user = (await tx.get(doc(db, "users", uid))).data() || {};
    const publicRef = doc(db, "publicUsers", uid);
    const previous = (await tx.get(publicRef)).data() || {};
    const snapshots = await Promise.all(list.docs.map(d => tx.get(d.ref)));
    const goals = snapshots.filter(d => d.exists()).map(d => ({ ...d.data(), id: d.id } as Goal));
    const publicGoals = publicGoalList(goals, user);
    const showGoal = typeof user.showGoal === "boolean" ? user.showGoal : user.showGoals === true;
    tx.set(publicRef, { ...publicPatch, isPublic: user.isPublic === true, showGoal, publicGoals,
      ...(previous.recentAction?.type === "goal" ? { recentAction: null } : {}),
    }, { merge: true });
  });
}

export async function reorderGoals(uid: string | null, goals: Goal[]) {
  const active = goals.filter(g => !g.done);
  if (uid) {
    const batch = writeBatch(db);
    active.forEach((g, priorityOrder) => batch.update(doc(db, "users", uid, "goals", g.id), { priorityOrder }));
    await batch.commit();
    await syncPublicGoals(uid);
  } else {
    const ranks = new Map(active.map((g, i) => [g.id, i]));
    LocalStorageRepository.saveList(LS_KEYS.GOALS, LocalStorageRepository.getList<Goal>(LS_KEYS.GOALS)
      .map(g => ranks.has(g.id) ? { ...g, priorityOrder: ranks.get(g.id) } : g));
  }
}
