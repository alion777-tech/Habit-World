import { readEconomy, syncLocalEconomy } from "./economyActions";
import { reconcileEconomy } from "./economyModel";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocalStorageRepository as Local } from "./localActions";
import { LS_KEYS } from "./dataPersistence";
import type { Todo, TodoCategory } from "@/types/appTypes";
import { completionChanges } from "./todoModel";
import { formatDateToJST } from "./habits/dateUtils";

export async function addTodo(uid: string | null, text: string, fields: Partial<Todo> = {}, trackCreation = false) {
  if (!text.trim()) return;
  const data = { ...fields, text: text.trim(), done: false, createdAt: new Date().toISOString() };
  const today = formatDateToJST(new Date());
  const creationStats = (stats: Record<string, any> = {}) => {
    const newDay = stats.lastActionDate !== today;
    return { ...stats, lastActionDate: today,
      goalsAddedToday: newDay ? 0 : (stats.goalsAddedToday || 0),
      habitsAddedToday: newDay ? 0 : (stats.habitsAddedToday || 0),
      todosAddedToday: (newDay ? 0 : (stats.todosAddedToday || 0)) + 1,
      goalsCreatedCount: stats.goalsCreatedCount || 0,
      habitsCreatedCount: stats.habitsCreatedCount || 0 };
  };
  if (uid && trackCreation) {
    const todoRef = doc(collection(db, "users", uid, "todos"));
    const profileRef = doc(db, "users", uid);
    await runTransaction(db, async tx => {
      const profile = (await tx.get(profileRef)).data() || {};
      tx.set(todoRef, { ...data, createdAt: serverTimestamp() });
      tx.set(profileRef, { stats: creationStats(profile.stats) }, { merge: true });
    });
  } else if (uid) await addDoc(collection(db, "users", uid, "todos"), { ...data, createdAt: serverTimestamp() });
  else {
    Local.addItem(LS_KEYS.TODOS, { ...data, id: "local_todo_" + crypto.randomUUID() });
    if (trackCreation) { const profile = Local.getProfile() || {}; Local.setProfile({ ...profile, stats: creationStats(profile.stats) }); }
  }
}
export async function toggleTodo(uid: string | null, todoId: string, done: boolean) {
  const now = new Date().toISOString();
  const today = formatDateToJST(new Date());
  if (uid) {
    const ref = doc(db, "users", uid, "todos", todoId);
    const nextRef = doc(collection(db, "users", uid, "todos"));
    await runTransaction(db, async tx => {
      const state = await readEconomy(tx, uid);
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().done !== done) return;
      const todo = { ...snap.data(), id: todoId } as Todo;
      const { fields, reward, next } = completionChanges(todo, today, now);
      if ((state.profile.todoPoints || 0) + reward < 0) throw Error("ポイント履歴を確認できません。変更を中止しました。");
      const economy = reconcileEconomy({ ...state.profile, economy: state.economy, todoPoints: (state.profile.todoPoints || 0) + reward }, state.habits, state.goals);
      tx.update(ref, { ...fields, ...(next ? { nextTodoId: nextRef.id } : {}) });
      if (next) tx.set(nextRef, { ...next, createdAt: serverTimestamp() });
      tx.set(state.ref, { economy, ...(reward ? { todoPoints: increment(reward) } : {}) }, { merge: true });
    });
  } else {
    syncLocalEconomy();
    const list = Local.getList<Todo>(LS_KEYS.TODOS);
    const todo = list.find(t => t.id === todoId);
    if (!todo || todo.done !== done) return;
    const { fields, reward, next } = completionChanges(todo, today, now);
    const profile = Local.getProfile() || {};
    if ((profile.todoPoints || 0) + reward < 0) throw Error("ポイント履歴を確認できません。変更を中止しました。");
    const economy = reconcileEconomy({ ...profile, todoPoints: (profile.todoPoints || 0) + reward }, Local.getList(LS_KEYS.HABITS), Local.getList(LS_KEYS.GOALS));
    Object.assign(todo, fields);
    if (next) { todo.nextTodoId = "local_todo_" + crypto.randomUUID(); list.push({ ...next, id: todo.nextTodoId }); }
    Local.saveCompletion(LS_KEYS.TODOS, list, { ...profile, economy, todoPoints: (profile.todoPoints || 0) + reward });
    syncLocalEconomy();
  }
}
export async function deleteTodo(uid: string | null, todoId: string) {
  if (uid) await deleteDoc(doc(db, "users", uid, "todos", todoId));
  else Local.deleteItem(LS_KEYS.TODOS, todoId);
}
export async function updateTodo(uid: string | null, todoId: string, input: string | Partial<Todo>) {
  const fields = typeof input === "string" ? { text: input.trim() } : input;
  if (fields.text !== undefined && !fields.text.trim()) throw new Error("Task name is required");
  if (uid) await updateDoc(doc(db, "users", uid, "todos", todoId), fields);
  else Local.updateItem<Todo>(LS_KEYS.TODOS, todoId, fields);
}
// Categories are private and use stable IDs, so renaming never rewrites tasks.
export async function saveTodoCategories(uid: string | null, todoCategories: TodoCategory[]) {
  if (uid) await setDoc(doc(db, "users", uid), { todoCategories }, { merge: true });
  else Local.setProfile({ ...(Local.getProfile() || {}), todoCategories });
}
