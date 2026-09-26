"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTestAccess, type TestAccess } from "@/hooks/useTestAccess";
import { useHabitCalendar } from "@/hooks/useHabitCalendar";
import { changeTestDay, setTestMode, updateTestHabit, type TestWorkspace } from "@/lib/testModeActions";

export default function TestAdminMenu({ locale }: { locale: string }) {
  const access = useTestAccess();
  return <TestAdminControls locale={locale} access={access} />;
}

export function TestAdminControls({ locale, access, disabled = false, onBusyChange }: { locale: string; access: TestAccess; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Keying the sandbox prevents another account's data flashing after sign-in changes.
  async function run(action: () => Promise<void>) {
    if (busy || disabled) return;
    setBusy(true); onBusyChange?.(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  if (!access.label || access.loading) return null;
  return <details style={{ margin: "12px 0", padding: 12, border: "2px solid #b45309", borderRadius: 8 }}>
    <summary>テスト管理 · {access.label}</summary>
    <p>このGoogleアカウントはテストアカウント兼テスト管理者です。</p>
    <button type="button" disabled={busy || disabled} aria-pressed={access.enabled} onClick={() => void run(() => setTestMode(!access.enabled))}>
      テストモード {access.enabled ? "ON → OFFにする" : "OFF → ONにする"}
    </button>
    {error && <p role="alert">{error}</p>}
    {access.enabled && access.uid && <TestSandbox key={access.uid} uid={access.uid} offset={access.dayOffset} locale={locale} disabled={disabled || busy} onBusyChange={onBusyChange} />}
  </details>;
}

function TestSandbox({ uid, offset, locale, disabled, onBusyChange }: { uid: string; offset: number; locale: string; disabled: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [workspace, setWorkspace] = useState<TestWorkspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { todayStr } = useHabitCalendar(workspace?.habits ?? [], offset);
  useEffect(() => onSnapshot(doc(db, "testWorkspaces", uid), snapshot => {
    setWorkspace(snapshot.exists() ? snapshot.data() as TestWorkspace : null);
  }, () => { setWorkspace(null); setError("テストデータを読めません。権限と接続を確認してください。"); }), [uid]);
  async function run(action: () => Promise<void>) {
    if (busy || disabled) return;
    setBusy(true); onBusyChange?.(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <div>
    <p role="status">テスト日付：{todayStr}（実日付との差：{offset}日）</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button disabled={busy || disabled || offset <= -3650} onClick={() => void run(() => changeTestDay(-1))}>前の日へ</button>
      <button disabled={busy || disabled || offset >= 3650} onClick={() => void run(() => changeTestDay(1))}>次の日へ</button>
      <button disabled={busy || disabled} onClick={() => void run(() => changeTestDay(0))}>今日へ戻す</button>
    </div>
    <p>日付テストは本体の習慣一覧・ホームの習慣にも適用します。通常の習慣履歴とポイントに保存されます。ToDo・カレンダー月移動・ログイン・孵化・冒険時計は実日付のままです。</p>
    <p>以下は従来の専用テスト習慣です。本体習慣のコピーではありません。</p>
    {!workspace && <button disabled={busy || disabled} onClick={() => void run(() => updateTestHabit())}>テスト習慣を用意する</button>}
    {workspace?.habits.map(habit => <label key={habit.id} style={{ display: "block", padding: 8 }}>
      <input type="checkbox" disabled={busy || disabled} checked={habit.pointHistory.some(item => item.date === todayStr)} onChange={() => void run(() => updateTestHabit(habit.id))} />
      {habit.text} · {habit.dailyStreak}日連続 · {habit.point}pt
    </label>)}
    <p>この専用テスト習慣のポイント・履歴は、本体の実績に加算しません。本体習慣での操作は本体に保存されます。OFFでもテスト履歴は残り、日付差は0に戻ります。</p>
    <nav aria-label="既存のテスト機能"><ul>
      <li><a href={`/${locale}/fairy-preview`}>既存の妖精孵化テスト</a></li>
      <li><a href={`/${locale}/fairy-room-preview`}>既存の妖精の部屋テスト</a></li>
      <li><Link href="/avatar">アバタールーム・クローゼット</Link></li><li><Link href="/avatar?entry=shops">森のアイテムショップ</Link></li>
      <li><Link href="/world">既存のワールド試作</Link></li>
    </ul></nav>
    {error && <p role="alert">{error}</p>}
  </div>;
}



