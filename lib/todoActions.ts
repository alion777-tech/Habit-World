import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LocalStorageRepository as Local } from "./localActions";
import { LS_KEYS } from "./dataPersistence";
import type { Todo, TodoCategory } from "@/types/appTypes";
import { completionChanges } from "./todoModel";
import { formatDateToJST } from "./habits/dateUtils";

export async function addTodo(uid: string | null, text: string, fields: Partial<Todo> = {}) {
  if (!text.trim()) return;
  const data = { ...fields, text: text.trim(), done: false, createdAt: new Date().toISOString() };
  if (uid) await addDoc(collection(db, "users", uid, "todos"), { ...data, createdAt: serverTimestamp() });
  else Local.addItem(LS_KEYS.TODOS, { ...data, id: "local_todo_" + crypto.randomUUID() });
}
export async function toggleTodo(uid: string | null, todoId: string, done: boolean) {
  const now = new Date().toISOString();
  const today = formatDateToJST(new Date());
  if (uid) {
    const ref = doc(db, "users", uid, "todos", todoId);
    const nextRef = doc(collection(db, "users", uid, "todos"));
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().done !== done) return;
      const todo = { ...snap.data(), id: todoId } as Todo;
      const { fields, reward, next } = completionChanges(todo, today, now);
      tx.update(ref, { ...fields, ...(next ? { nextTodoId: nextRef.id } : {}) });
      if (next) tx.set(nextRef, { ...next, createdAt: serverTimestamp() });
      if (reward) tx.set(doc(db, "users", uid), { todoPoints: increment(reward) }, { merge: true });
    });
  } else {
    const list = Local.getList<Todo>(LS_KEYS.TODOS);
    const todo = list.find(t => t.id === todoId);
    if (!todo || todo.done !== done) return;
    const { fields, reward, next } = completionChanges(todo, today, now);
    Object.assign(todo, fields);
    if (next) { todo.nextTodoId = "local_todo_" + crypto.randomUUID(); list.push({ ...next, id: todo.nextTodoId }); }
    Local.saveList(LS_KEYS.TODOS, list);
    if (reward) { const p = Local.getProfile() || {}; Local.setProfile({ ...p, todoPoints: (p.todoPoints || 0) + reward }); }
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
