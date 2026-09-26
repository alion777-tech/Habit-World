"use client";
import React, { useState, useEffect, useRef } from "react";
import { useOptimisticCompletion } from "@/hooks/useOptimisticCompletion";
import { useLocale } from "next-intl";
import type { Todo, TodoCategory, TodoRecurrence } from "@/types/appTypes";
import { addTodo, toggleTodo, deleteTodo, updateTodo, saveTodoCategories } from "@/lib/todoActions";
import { addDays, weekEnd, isToday, isOverdue, reminderActive, DEFAULT_CATEGORIES } from "@/lib/todoModel";
import styles from "./TodoView.module.css";

type Props = { uid: string | null; todos: Todo[]; categories?: TodoCategory[]; today: string; isDarkMode?: boolean;
  checkLimit: (type: "todos") => boolean };
export default function TodoView({ uid, todos: savedTodos, categories = DEFAULT_CATEGORIES, today, isDarkMode, checkLimit }: Props) {
  const { items: todos, complete } = useOptimisticCompletion(savedTodos, uid);
  const ja = useLocale() === "ja";
  const l = (jp: string, en: string) => ja ? jp : en;
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("open");
  const [dateFilter, setDateFilter] = useState("");
  const [specifiedDate, setSpecifiedDate] = useState(today);
  const [sort, setSort] = useState("created");
  const [limit, setLimit] = useState(50);
  const [quick, setQuick] = useState("");
  const [draft, setDraft] = useState<Todo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [addingText, setAddingText] = useState("");
  const busyRef = useRef(false);
  const [categoryName, setCategoryName] = useState("");
  const [renameId, setRenameId] = useState("");
  const [subtask, setSubtask] = useState("");
  const editorRef = useRef<HTMLElement>(null);
  const editorOpen = !!draft;
  useEffect(() => {
    if (!editorOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = editorRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select:not(:disabled)');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [editorOpen]);
  const name = (c: TodoCategory) => !ja && DEFAULT_CATEGORIES.some(d => d.id === c.id && d.name === c.name)
    ? ({ shopping: "Shopping", work: "Work", home: "Home", paperwork: "Paperwork", other: "Other" }[c.id] || c.name) : c.name;
  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (error) { setError(error instanceof Error ? error.message : l("保存できませんでした。通信状態を確認して再試行してください。", "Could not save. Check your connection and retry.")); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const patch = (fields: Partial<Todo>) => setDraft(d => d ? { ...d, ...fields } : d);
  const newDraft = (): Todo => ({ id: "", text: quick, done: false, priority: "medium", categoryId: category && category !== "none" ? category : null, memo: "", subtasks: [] });
  const create = async () => {
    if (!quick.trim() || !checkLimit("todos")) return;
    const submitted = quick;
    setQuick(""); setAddingText(submitted);
    try {
      await addTodo(uid, submitted, { categoryId: category && category !== "none" ? category : null, priority: "medium" }, true);
    } catch (error) {
      setQuick(current => current || submitted);
      setNotice(l("追加できなかったToDo: ", "Task not added: ") + submitted);
      throw error;
    } finally { setAddingText(""); }
  };
  const filtered = todos.filter(t => {
    if (!t.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())) return false;
    if (category && (t.categoryId || "none") !== category) return false;
    if (priority && (t.priority || "medium") !== priority) return false;
    if (tab === "completed" ? !t.done : status === "open" ? t.done : status === "done" ? !t.done : false) return false;
    if (tab === "today" && !isToday(t, today)) return false;
    if (tab === "overdue" && !isOverdue(t, today)) return false;
    if (tab === "upcoming" && !((t.dueDate && t.dueDate > today) || (t.startDate && t.startDate > today))) return false;
    const due = t.dueDate;
    if (dateFilter === "none" && due) return false;
    if (dateFilter === "today" && due !== today) return false;
    if (dateFilter === "tomorrow" && due !== addDays(today, 1)) return false;
    if (dateFilter === "week" && (!due || due < today || due > weekEnd(today))) return false;
    if (dateFilter === "nextWeek" && (!due || due <= weekEnd(today) || due > addDays(weekEnd(today), 7))) return false;
    if (dateFilter === "overdue" && !isOverdue(t, today)) return false;
    if (dateFilter === "date" && due !== specifiedDate) return false;
    return true;
  }).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (sort === "due" ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999") : 0));
  const priorityName = (p?: string) => p === "high" ? l("高", "High") : p === "low" ? l("低", "Low") : l("中", "Medium");
  const timestamp = (value: Todo["createdAt"]) => {
    if (!value) return l("記録なし", "Not recorded");
    const d = typeof value === "object" && "toDate" in value ? value.toDate() : new Date(value as string);
    return Number.isNaN(d.getTime()) ? l("記録なし", "Not recorded") : d.toLocaleString(ja ? "ja-JP" : "en-US");
  };
  return <section className={styles.root} data-dark={isDarkMode}>
    <h2>ToDo</h2><p className={styles.hint}>{l("仕事・用事を整理。完了で1pt獲得します。", "Organize tasks and errands. Earn 1pt on completion; undo returns the reward.")}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status">{notice}</p>}
    {addingText && <p role="status">{l("追加中: ", "Adding: ")}{addingText}</p>}
    <form className={styles.row} onSubmit={e => { e.preventDefault(); void run(create); }}>
      <input aria-label={l("タスク名", "Task name")} placeholder={categories.find(c => c.id === category)?.shopping ? l("牛乳、卵… 1品ずつ追加", "Milk, eggs… add one item") : l("やることを追加…", "Add a task…")} value={quick} onChange={e => setQuick(e.target.value)} maxLength={300}/>
      <button disabled={busy || !quick.trim()} className={styles.primary}>{l("追加", "Add")}</button>
      <button type="button" disabled={busy} onClick={() => setDraft(newDraft())}>{l("詳細", "Details")}</button>
    </form>
    <div className={styles.tabs} aria-label={l("表示切替", "Views")}>{[["today", l("今日", "Today")], ["overdue", l("期限切れ", "Overdue")], ["upcoming", l("今後", "Upcoming")], ["all", l("すべて", "All")], ["categories", l("カテゴリ", "Categories")], ["completed", l("完了済み", "Completed")]].map(([id, text]) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setStatus("open"); setLimit(50); }}>{text}</button>)}</div>
    {tab === "categories" && <div className={styles.card}>
      <div className={styles.tabs}>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{name(c)} ({todos.filter(t => !t.done && t.categoryId === c.id).length})</button>)}</div>
      <form className={styles.row} onSubmit={e => { e.preventDefault(); void run(async () => {
        if (!categoryName.trim()) return;
        const next = renameId ? categories.map(c => c.id === renameId ? { ...c, name: categoryName.trim() } : c) : [...categories, { id: crypto.randomUUID(), name: categoryName.trim() }];
        await saveTodoCategories(uid, next); setCategoryName("");
      }); }}>
        <select aria-label={l("カテゴリ編集", "Edit category")} value={renameId} onChange={e => { setRenameId(e.target.value); setCategoryName(categories.find(c => c.id === e.target.value)?.name || ""); }}><option value="">{l("新規カテゴリ", "New category")}</option>{categories.map(c => <option key={c.id} value={c.id}>{name(c)}</option>)}</select>
        <input aria-label={l("カテゴリ名", "Category name")} value={categoryName} onChange={e => setCategoryName(e.target.value)} maxLength={60}/><button disabled={busy || !categoryName.trim()}>{l("保存", "Save")}</button>
      </form>
    </div>}
    <input className={styles.search} type="search" placeholder={l("タスク名を検索", "Search task names")} aria-label={l("タスク名を検索", "Search task names")} value={search} onChange={e => { setSearch(e.target.value); setLimit(50); }}/>
    <details><summary>{l("絞り込み・並び順", "Filters and sorting")}</summary><div className={styles.grid}>
      <label>{l("カテゴリ", "Category")}<select value={category} onChange={e => setCategory(e.target.value)}><option value="">{l("すべて", "All")}</option><option value="none">{l("未分類", "Uncategorized")}</option>{categories.map(c => <option key={c.id} value={c.id}>{name(c)}</option>)}</select></label>
      <label>{l("状態", "Status")}<select value={tab === "completed" ? "done" : status} disabled={tab === "completed"} onChange={e => setStatus(e.target.value)}><option value="open">{l("未完了", "Open")}</option><option value="done">{l("完了", "Done")}</option><option value="all">{l("すべて", "All")}</option></select></label>
      <label>{l("優先度", "Priority")}<select value={priority} onChange={e => setPriority(e.target.value)}><option value="">{l("すべて", "All")}</option>{["high", "medium", "low"].map(p => <option key={p} value={p}>{priorityName(p)}</option>)}</select></label>
      <label>{l("期限", "Due date")}<select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>{[["", l("すべて", "All")], ["today", l("今日", "Today")], ["tomorrow", l("明日", "Tomorrow")], ["week", l("今週", "This week")], ["nextWeek", l("来週", "Next week")], ["date", l("指定日", "Specific date")], ["none", l("期限なし", "No date")], ["overdue", l("期限切れ", "Overdue")]].map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select>{dateFilter === "date" && <input type="date" aria-label={l("指定日", "Specific date")} value={specifiedDate} onChange={e => setSpecifiedDate(e.target.value)}/>}</label>
      <label>{l("並び順", "Sort")}<select value={sort} onChange={e => setSort(e.target.value)}><option value="created">{l("作成順（新しい順）", "Newest first")}</option><option value="due">{l("期限が近い順", "Due date")}</option></select></label>
      <button onClick={() => { setCategory(""); setPriority(""); setStatus("open"); setDateFilter(""); setSearch(""); }}>{l("絞り込みを解除", "Clear filters")}</button>
    </div></details>
    <p className={styles.hint}>{filtered.length} {l("件 · ピン留めを先頭に表示", "tasks · Pinned first")}{category && ` · ${categories.find(c => c.id === category) ? name(categories.find(c => c.id === category)!) : l("未分類", "Uncategorized")}`}</p>
    <ul className={styles.list}>{filtered.slice(0, limit).map(item => <li key={item.id} className={`${styles.card} ${styles.todoCard}`} data-overdue={isOverdue(item, today)}>
      <div className={styles.row}>
        <label className={styles.check}><input type="checkbox" aria-label={`${item.text}: ${l("完了切替", "toggle completion")}`} checked={item.done} disabled={busy} onChange={() => void run(async () => { if (!await complete(item.id, !item.done, () => toggleTodo(uid, item.id, item.done))) return; if (!item.done) setNotice(l("完了しました。1pt獲得。繰り返しは次回分を作成します。", "Completed. Earned 1pt; repeating tasks create the next occurrence.")); })}/></label>
        <button className={styles.task} onClick={() => { setDraft({ ...item }); setSubtask(""); }}><span style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.pinned && "📌 "}{item.text}</span></button>
        <button aria-label={l("ピン留め切替", "Toggle pin")} aria-pressed={!!item.pinned} disabled={busy} onClick={() => void run(() => updateTodo(uid, item.id, { pinned: !item.pinned }))}>📌</button>
      </div>
      <div className={styles.meta} data-shopping={categories.find(c => c.id === item.categoryId)?.shopping}><span data-high={item.priority === "high"}>{l("優先度", "Priority")}: {priorityName(item.priority)}</span>
        {item.dueDate && <span>{isOverdue(item, today) ? l("⚠ 期限切れ: ", "⚠ Overdue: ") : l("期限: ", "Due: ")}{item.dueDate}</span>}
        {item.startDate && <span>{l("開始: ", "Start: ")}{item.startDate}</span>}
        {item.recurrence && <span>{l("↻ 繰り返し", "↻ Repeats")}</span>}
        {item.categoryId && <span>{categories.find(c => c.id === item.categoryId) ? name(categories.find(c => c.id === item.categoryId)!) : item.categoryId}</span>}
        {!!item.subtasks?.length && <span>☑ {item.subtasks.filter(s => s.done).length}/{item.subtasks.length}</span>}
      </div>
      {reminderActive(item, today) && <p role="status">🔔 {isOverdue(item, today) ? l("期限を過ぎています", "Past due") : l("もうすぐ期限です。確認・判断を忘れずに。", "Due soon. Remember to review and decide.")}</p>}
    </li>)}</ul>
    {!filtered.length && <p>{l("該当するToDoはありません。", "No matching tasks.")}</p>}
    {filtered.length > limit && <button onClick={() => setLimit(limit + 50)}>{l("さらに50件表示", "Show 50 more")}</button>}
    {draft && <div className={styles.overlay}><section ref={editorRef} onKeyDown={e => { if (e.key === "Escape" && !busy) { setDraft(null); setError(""); } }} role="dialog" aria-modal="true" aria-label={l("ToDoの詳細", "Task details")} className={styles.editor}>
      <form onSubmit={e => { e.preventDefault(); void run(async () => {
        if (!draft.text.trim()) return;
        if (draft.startDate && draft.dueDate && draft.startDate > draft.dueDate) { setError(l("開始日は期限以前にしてください。", "Start must be on or before due date.")); return; }
        if (draft.recurrence && !draft.startDate && !draft.dueDate) { setError(l("繰り返しには開始日または期限が必要です。", "Repeating tasks need a start or due date.")); return; }
        const { id, ...fields } = draft;
        if (id) { const { createdAt, done, completedAt, rewarded, completionPoints, nextTodoId, ...editable } = fields; void createdAt; void done; void completedAt; void rewarded; void completionPoints; void nextTodoId; await updateTodo(uid, id, editable); }
        else { if (!checkLimit("todos")) return; await addTodo(uid, draft.text, fields, true); }
        setDraft(null); setQuick("");
      }); }}>
        <h3>{l("ToDoの詳細", "Task details")}</h3>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <label>{l("タスク名", "Task name")}<input autoFocus required maxLength={300} value={draft.text} onChange={e => patch({ text: e.target.value })}/></label>
        <label>{l("メモ", "Notes")}<textarea value={draft.memo || ""} onChange={e => patch({ memo: e.target.value })} rows={3}/></label>
        <div className={styles.grid}>
          <label>{l("カテゴリ", "Category")}<select value={draft.categoryId || ""} onChange={e => patch({ categoryId: e.target.value || null })}><option value="">{l("未分類", "Uncategorized")}</option>{categories.map(c => <option key={c.id} value={c.id}>{name(c)}</option>)}</select></label>
          <label>{l("優先度", "Priority")}<select value={draft.priority || "medium"} onChange={e => patch({ priority: e.target.value as Todo["priority"] })}>{["high", "medium", "low"].map(p => <option key={p} value={p}>{priorityName(p)}</option>)}</select></label>
          <label>{l("開始日（いつやるか）", "Start date")}<input type="date" value={draft.startDate || ""} onChange={e => patch({ startDate: e.target.value || null })}/></label>
          <label>{l("期限（いつまでか）", "Due date")}<input type="date" value={draft.dueDate || ""} onChange={e => patch({ dueDate: e.target.value || null, ...(!e.target.value ? { reminderDays: null } : {}) })}/></label>
        </div>
        <div className={styles.tabs}>{[[l("今日", "Today"), today], [l("明日", "Tomorrow"), addDays(today, 1)], [l("今週末", "This Sunday"), weekEnd(today)], [l("来週末", "Next Sunday"), addDays(weekEnd(today), 7)], [l("期限なし", "No due date"), ""]].map(([label, date]) => <button type="button" key={label} onClick={() => patch({ dueDate: date || null, ...(!date ? { reminderDays: null } : {}) })}>{label}</button>)}</div>
        <label>{l("リマインダー", "Reminder")}<select disabled={!draft.dueDate} value={draft.reminderDays == null ? "none" : [0,1,3,7].includes(draft.reminderDays) ? draft.reminderDays : "custom"} onChange={e => patch({ reminderDays: e.target.value === "none" ? null : e.target.value === "custom" ? 2 : Number(e.target.value) })}><option value="none">{l("なし", "None")}</option>{[0,1,3,7].map(n => <option key={n} value={n}>{n === 0 ? l("当日", "On due date") : `${n}${l("日前", " days before")}`}</option>)}<option value="custom">{l("任意の日数前", "Custom days before")}</option></select></label>
        {draft.reminderDays != null && <label>{l("何日前に知らせるか", "Days before due date")}<input type="number" min={0} max={3650} required value={draft.reminderDays} onChange={e => patch({ reminderDays: Number(e.target.value) })}/></label>}
        <p className={styles.hint}>{l("通知はアプリ内に表示します。閉じている間のプッシュ通知はありません。日付は日本時間です。", "Reminders appear in the app, with no push while closed. Dates use Japan time.")}</p>
        <label>{l("繰り返し（Habitとは別）", "Repeat (separate from Habits)")}<select value={draft.recurrence?.unit || "none"} onChange={e => patch({ recurrence: e.target.value === "none" ? null : { unit: e.target.value as TodoRecurrence["unit"], interval: 1, weekday: 1, monthDay: 1 } })}><option value="none">{l("なし", "None")}</option><option value="day">{l("日ごと", "Daily")}</option><option value="week">{l("週ごと", "Weekly")}</option><option value="month">{l("月ごと", "Monthly")}</option></select></label>
        {draft.recurrence && <div className={styles.grid}>
          <label>{l("間隔", "Interval")}<input type="number" required min={1} max={365} value={draft.recurrence.interval} onChange={e => patch({ recurrence: { ...draft.recurrence!, interval: Number(e.target.value) } })}/></label>
          {draft.recurrence.unit === "week" && <label>{l("曜日", "Weekday")}<select value={draft.recurrence.weekday ?? 1} onChange={e => patch({ recurrence: { ...draft.recurrence!, weekday: Number(e.target.value) } })}>{(ja ? ["日", "月", "火", "水", "木", "金", "土"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((v,i) => <option key={i} value={i}>{v}</option>)}</select></label>}
          {draft.recurrence.unit === "month" && <label>{l("日", "Day")}<select value={draft.recurrence.monthDay || 1} onChange={e => patch({ recurrence: { ...draft.recurrence!, monthDay: e.target.value === "last" ? "last" : Number(e.target.value) } })}>{Array.from({ length: 31 }, (_,i) => <option key={i+1} value={i+1}>{i+1}</option>)}<option value="last">{l("月末", "Last day")}</option></select></label>}
        </div>}
        {draft.recurrence && <p className={styles.hint}>{l("開始日・期限が初回です。完了後に次の未来の予定を作成します。存在しない月日は月末に調整。完了を戻しても次回分は残ります。", "Start/due date is the first occurrence. Completion creates the next future task. Missing month days use month end. Reopening keeps the next task.")}</p>}
        <label className={styles.row}><input type="checkbox" checked={!!draft.pinned} onChange={e => patch({ pinned: e.target.checked })}/>{l("ピン留め", "Pin task")}</label>
        <h4>{l("サブタスク", "Subtasks")} ({draft.subtasks?.filter(s => s.done).length || 0}/{draft.subtasks?.length || 0})</h4>
        {(draft.subtasks || []).map(s => <div key={s.id} className={styles.row}><label className={styles.check}><input type="checkbox" checked={s.done} aria-label={s.text} onChange={e => patch({ subtasks: draft.subtasks!.map(x => x.id === s.id ? { ...x, done: e.target.checked } : x) })}/></label><input aria-label={l("サブタスク名", "Subtask name")} required value={s.text} onChange={e => patch({ subtasks: draft.subtasks!.map(x => x.id === s.id ? { ...x, text: e.target.value } : x) })}/><button type="button" aria-label={l("サブタスク削除", "Delete subtask")} onClick={() => patch({ subtasks: draft.subtasks!.filter(x => x.id !== s.id) })}>×</button></div>)}
        <div className={styles.row}><input aria-label={l("新しいサブタスク", "New subtask")} value={subtask} onChange={e => setSubtask(e.target.value)}/><button type="button" disabled={!subtask.trim()} onClick={() => { patch({ subtasks: [...(draft.subtasks || []), { id: crypto.randomUUID(), text: subtask.trim(), done: false }] }); setSubtask(""); }}>{l("追加", "Add")}</button></div>
        <p className={styles.hint}>{l("親タスクの完了は一覧のチェックで操作します。", "Complete the parent task using its list checkbox.")}</p>
        {draft.id && <p className={styles.hint}>{l("作成: ", "Created: ")}{timestamp(draft.createdAt)}<br/>{l("完了: ", "Completed: ")}{timestamp(draft.completedAt)}</p>}
        <footer className={styles.footer}><button type="button" disabled={busy} onClick={() => { setDraft(null); setError(""); }}>{l("キャンセル", "Cancel")}</button><button className={styles.primary} disabled={busy}>{busy ? l("保存中…", "Saving…") : l("保存", "Save")}</button>
        {draft.id && <button type="button" disabled={busy} onClick={() => { if (window.confirm(l("このToDoを削除しますか？次回分は残ります。", "Delete this task? Its next occurrence will remain."))) void run(async () => { await deleteTodo(uid, draft.id); setDraft(null); }); }}>{l("削除", "Delete")}</button>}</footer>
      </form>
    </section></div>}
  </section>;
}
