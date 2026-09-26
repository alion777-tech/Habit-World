"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTestAccess } from "@/hooks/useTestAccess";
import { useHabitCalendar } from "@/hooks/useHabitCalendar";
import { changeTestDay, setTestMode, updateTestHabit, type TestWorkspace } from "@/lib/testModeActions";

export default function TestAdminMenu({ locale }: { locale: string }) {
  const access = useTestAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Keying the sandbox prevents another account's data flashing after sign-in changes.
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }
  if (!access.label || access.loading) return null;
  return <details style={{ margin: "12px 0", padding: 12, border: "2px solid #b45309", borderRadius: 8 }}>
    <summary>テスト管理 · {access.label}</summary>
    <p>このGoogleアカウントはテストアカウント兼テスト管理者です。</p>
    <button type="button" disabled={busy} aria-pressed={access.enabled} onClick={() => void run(() => setTestMode(!access.enabled))}>
      テストモード {access.enabled ? "ON → OFFにする" : "OFF → ONにする"}
    </button>
    {error && <p role="alert">{error}</p>}
    {access.enabled && access.uid && <TestSandbox key={access.uid} uid={access.uid} offset={access.dayOffset} locale={locale} />}
  </details>;
}

function TestSandbox({ uid, offset, locale }: { uid: string; offset: number; locale: string }) {
  const [workspace, setWorkspace] = useState<TestWorkspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { todayStr } = useHabitCalendar(workspace?.habits ?? [], offset);
  useEffect(() => onSnapshot(doc(db, "testWorkspaces", uid), snapshot => {
    setWorkspace(snapshot.exists() ? snapshot.data() as TestWorkspace : null);
  }, () => { setWorkspace(null); setError("テストデータを読めません。権限と接続を確認してください。"); }), [uid]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }
  return <div>
    <p role="status">テスト日付：{todayStr}（実日付との差：{offset}日）</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button disabled={busy || offset <= -3650} onClick={() => void run(() => changeTestDay(-1))}>前の日へ</button>
      <button disabled={busy || offset >= 3650} onClick={() => void run(() => changeTestDay(1))}>次の日へ</button>
      <button disabled={busy} onClick={() => void run(() => changeTestDay(0))}>今日へ戻す</button>
    </div>
    <p>日付テストは専用の習慣データに適用します。通常画面の「今日／昨日」、カレンダー、ログイン日数・孵化・冒険時計は実日付のままです。</p>
    {!workspace && <button disabled={busy} onClick={() => void run(() => updateTestHabit())}>テスト習慣を用意する</button>}
    {workspace?.habits.map(habit => <label key={habit.id} style={{ display: "block", padding: 8 }}>
      <input type="checkbox" disabled={busy} checked={habit.pointHistory.some(item => item.date === todayStr)} onChange={() => void run(() => updateTestHabit(habit.id))} />
      {habit.text} · {habit.dailyStreak}日連続 · {habit.point}pt
    </label>)}
    <p>テストのポイント・履歴は通常アカウントの実績に加算しません。OFFでもテスト履歴は残り、日付差は0に戻ります。</p>
    <nav aria-label="既存のテスト機能"><ul>
      <li><a href={`/${locale}/fairy-preview`}>既存の妖精孵化テスト</a></li>
      <li><a href={`/${locale}/fairy-room-preview`}>既存の妖精の部屋テスト</a></li>
      <li><Link href="/avatar">アバタールーム・クローゼット</Link></li><li><Link href="/avatar?entry=shops">森のアイテムショップ</Link></li>
      <li><Link href="/world">既存のワールド試作</Link></li>
    </ul></nav>
    {error && <p role="alert">{error}</p>}
  </div>;
}



