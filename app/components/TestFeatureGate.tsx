"use client";
import type { ReactNode } from "react";
import { useTestAccess } from "@/hooks/useTestAccess";

export default function TestFeatureGate({ children }: { children: ReactNode }) {
  const access = useTestAccess();
  if (access.loading) return <p role="status">テスト権限を確認しています…</p>;
  if (!access.label || !access.enabled) return <section style={{ padding: 24 }}>
    <h1>テスト機能</h1><p>{access.error || "登録されたGoogleアカウントでログインし、テスト管理メニューでテストモードをONにしてください。"}</p>
    <a href="/ja">通常画面へ戻る</a>
  </section>;
  return <><div style={{ padding: 12, background: "#fef3c7", color: "#422006" }} role="status">{access.label} · テストモード ON · <a href="/ja">テスト管理メニューへ</a></div>{children}</>;
}
