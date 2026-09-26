//app/components/DreamView.tsx
"use client";

import { useOptimisticCompletion } from "@/hooks/useOptimisticCompletion";
import React, { useState } from "react";
import { orderedGoals, moveGoal } from "@/lib/goalModel";
import type { Goal, UserProfile } from "@/types/appTypes";
import { saveUserProfile } from "@/lib/profileActions";
import { announceFairy } from "@/lib/fairy/events";
import {
  reorderGoals,
  addGoal as addGoalAction,
  updateGoal as updateGoalAction,
  deleteGoal as deleteGoalAction,
} from "@/lib/goalActions";

const UI = {
  radius: 8,
  radiusCard: 12,
  font: 14,      // ← タブに寄せるなら 13、少し大きめなら 14
  pad: 10,       // ← 入力の高さ（大きくしたいなら 12）
  btnPadY: 10,   // ← ボタンの縦
  btnPadX: 16,   // ← ボタンの横
};


type Props = {
  uid: string | null;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  dreamInput: string;
  setDreamInput: (v: string) => void;
  isEditingDream: boolean;
  setIsEditingDream: (v: boolean) => void;
  goals: Goal[];
  goalInput: string;
  setGoalInput: (v: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
  editingGoalId: string | null;
  setEditingGoalId: (v: string | null) => void;
  editingGoalText: string;
  setEditingGoalText: (v: string) => void;
  tabButtonStyle: React.CSSProperties;
  isDarkMode?: boolean;
  checkLimit: (type: "goals" | "todos" | "habits") => boolean;
  incrementStats: (type: "goals" | "todos" | "habits") => Promise<void>;
};

import { useTranslations } from "next-intl";

export default function DreamView({
  uid,
  profile,
  setProfile,
  dreamInput,
  setDreamInput,
  isEditingDream,
  setIsEditingDream,
  goals: savedGoals,
  goalInput,
  setGoalInput,
  deadline,
  setDeadline,
  editingGoalId,
  setEditingGoalId,
  editingGoalText,
  setEditingGoalText,
  tabButtonStyle,
  isDarkMode = false,
  checkLimit,
  incrementStats,
}: Props) {
  const { items: goals, complete } = useOptimisticCompletion(savedGoals, uid);
  const [completionError, setCompletionError] = useState("");
  const [completing, setCompleting] = useState(false);
  const t = useTranslations("Dream");
  const tc = useTranslations("Common");
  const sorted = orderedGoals(goals);
  const active = sorted.filter(g => !g.done);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const move = async (id: string, index: number) => {
    if (ordering) return;
    setOrdering(true); setOrderError(false);
    try { await reorderGoals(uid, moveGoal(goals, id, index)); }
    catch { setOrderError(true); }
    finally { setOrdering(false); }
  };

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 16, color: isDarkMode ? "#fff" : "#000" }}>{t("title")}</h2>

      {/* 夢のセクション */}
      <div data-opening="dream" style={{ marginBottom: 16 }}>
        {!profile.dream && !isEditingDream ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={dreamInput}
              onChange={(e) => setDreamInput(e.target.value)}
              placeholder={t("dreamPlaceholder")}
              style={{
                flex: 1,
                padding: UI.pad,
                borderRadius: UI.radius,
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #ccc",
                background: isDarkMode ? "#374151" : "#fff",
                color: isDarkMode ? "#fff" : "#000",
                fontSize: UI.font,
              }}

            />
            <button
              onClick={async () => {
                if (!dreamInput.trim()) return;
                const trimmed = dreamInput.trim();
                console.log("[DreamSave] saving:", trimmed);
                await saveUserProfile(uid, { dream: trimmed });
                setProfile(prev => ({ ...prev, dream: trimmed }));
                setDreamInput("");
              }}
              style={{
                padding: `${UI.btnPadY}px ${UI.btnPadX}px`,
                borderRadius: UI.radius,
                background: isDarkMode ? "#6366f1" : "#4f46e5",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: UI.font,
              }}

            >
              {t("save")}
            </button>
          </div>
        ) : (
          <div>
            {isEditingDream ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={dreamInput}
                  onChange={(e) => setDreamInput(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: UI.pad,
                    borderRadius: UI.radius,
                    border: isDarkMode ? "1px solid #6366f1" : "1px solid #ccc",
                    background: isDarkMode ? "#374151" : "#fff",
                    color: isDarkMode ? "#fff" : "#000",
                    fontSize: UI.font,
                  }}

                />
                <button
                  onClick={async () => {
                    
                    const trimmed = dreamInput.trim();
                    await saveUserProfile(uid, { dream: trimmed });
                    setProfile(prev => ({ ...prev, dream: trimmed }));
                    setIsEditingDream(false);
                  }}
                  style={{
                    padding: `${UI.btnPadY}px ${UI.btnPadX}px`,
                    borderRadius: UI.radius,
                    background: isDarkMode ? "#6366f1" : "#4f46e5",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: UI.font,
                  }}

                >
                  {t("update")}
                </button>
                <button
                  onClick={() => setIsEditingDream(false)}
                  style={{
                    padding: `${UI.btnPadY}px ${UI.btnPadX}px`,
                    borderRadius: UI.radius,
                    background: isDarkMode ? "#4b5563" : "#e5e7eb",
                    color: isDarkMode ? "#fff" : "#000",
                    border: "none",
                    cursor: "pointer",
                    fontSize: UI.font,
                  }}

                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <div
                onDoubleClick={() => {
                  setDreamInput(profile.dream);
                  setIsEditingDream(true);
                }}
                style={{
                  padding: `${UI.btnPadY}px ${UI.btnPadX}px`,
                  background: isDarkMode ? "#2e1065" : "#f5f3ff",
                  borderRadius: UI.radiusCard,
                  border: isDarkMode ? "2px dashed #a855f7" : "1px dashed #c084fc",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <p style={{ fontSize: 16, fontWeight: "bold", color: isDarkMode ? "#e9d5ff" : "#6d28d9", margin: 0 }}>
                  “{profile.dream}”
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <hr style={{ border: "none", borderTop: isDarkMode ? "1px solid #374151" : "1px solid #eee", marginBottom: 16 }} />

      {/* 目標セクション */}
      <div data-opening="goal" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8, color: isDarkMode ? "#d1d5db" : "#000" }}>{t("goalSectionTitle")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder={t("goalPlaceholder")}
            style={{
              padding: UI.pad,
              borderRadius: UI.radius,
              border: isDarkMode ? "1px solid #4b5563" : "1px solid #ccc",
              background: isDarkMode ? "#374151" : "#fff",
              color: isDarkMode ? "#fff" : "#000",
              fontSize: UI.font,
            }}

          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                flex: 1,
                padding: UI.pad,
                borderRadius: UI.radius,
                border: isDarkMode ? "1px solid #4b5563" : "1px solid #ccc",
                background: isDarkMode ? "#374151" : "#fff",
                color: isDarkMode ? "#fff" : "#000",
                fontSize: UI.font,
              }}

            />
            <button
              onClick={async () => {
                if (!goalInput.trim()) return;
                if (!checkLimit("goals")) return;

                await addGoalAction(uid, goalInput.trim(), deadline || undefined);
                await incrementStats("goals");

                setGoalInput("");
                setDeadline("");
              }}
              style={{
                padding: `${UI.btnPadY}px ${UI.btnPadX + 8}px`, // 少し横広め
                borderRadius: UI.radius,
                background: "#10b981",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: UI.font,
              }}

            >
              {t("addGoalButton")}
            </button>
          </div>
        </div>
      </div>

      {/* 目標一覧 */}
      <p style={{ fontSize: 12, marginBottom: 12 }}>{t("priorityHint")}</p>
      {completionError && <p role="alert">{completionError}</p>}
      {orderError && <p role="alert">{t("orderError")}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((g, index) => (
            <div
              key={g.id}
              style={{
                padding: 12,
                borderRadius: 10,
                background: g.done
                  ? (isDarkMode ? "#1f2937" : "#f9fafb")
                  : (isDarkMode ? "#374151" : "#ffffff"),
                border: g.done
                  ? (isDarkMode ? "1px solid #111827" : "1px solid #e5e7eb")
                  : (isDarkMode ? "1px solid #4b5563" : "1px solid #ddd"),
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: g.done ? 0.7 : 1,
              }}
            >
              {!g.done && <strong aria-label={t("rankLabel", { rank: index + 1 })} style={{ color: "#6366f1", fontSize: 20 }}>{index + 1}</strong>}
              <input
                type="checkbox"
                aria-label={g.title}
                disabled={ordering || completing}
                checked={g.done}
                onChange={async () => {
                  
                  if (completing) return;
                  setCompleting(true); setCompletionError("");
                  try {
                  const newDoneState = !g.done;

                  // 1. ゴール状態更新
                  if (!await complete(g.id, newDoneState, () => updateGoalAction(uid, g.id, { done: newDoneState }))) return;
                  if (newDoneState) announceFairy(goals.every(goal => !goal.done) ? "firstGoal" : "goalCompleted");

                  const newCount = savedGoals.filter(goal => goal.id === g.id ? newDoneState : goal.done).length;

                  // 通知・演出
                  if (newDoneState) {
                    alert(t("goalAchievedAlert"));

                    // 10個達成での機能解禁通知
                    if (newCount === 30) {
                      setTimeout(() => {
                        alert(t("newFeatureUnlockedAlert"));
                      }, 500);
                    }

                    if (uid) {
                      const { updateRecentAction } = await import("@/lib/socialActions");
                      await updateRecentAction(uid, g.title, "goal");
                    }
                  }
                  } catch (error) { setCompletionError(error instanceof Error ? error.message : "保存できませんでした。再試行してください。"); }
                  finally { setCompleting(false); }
                }}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />

              <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {editingGoalId === g.id ? (
                  <input
                    value={editingGoalText}
                    onChange={(e) => setEditingGoalText(e.target.value)}
                    onBlur={async () => {
                      if (!editingGoalText.trim()) {
                        setEditingGoalId(null);
                        return;
                      }
                      await updateGoalAction(uid, g.id, { title: editingGoalText.trim() });
                      setEditingGoalId(null);
                    }}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: 4,
                      background: isDarkMode ? "#111827" : "#fff",
                      color: isDarkMode ? "#fff" : "#000",
                      border: "1px solid #6366f1"
                    }}
                  />
                ) : (
                  <div
                    onDoubleClick={() => {
                      setEditingGoalId(g.id);
                      setEditingGoalText(g.title);
                    }}
                    style={{
                      textDecoration: g.done ? "line-through" : "none",
                      fontWeight: g.done ? "normal" : "600",
                      color: g.done
                        ? (isDarkMode ? "#9ca3af" : "#9ca3af")
                        : (isDarkMode ? "#f3f4f6" : "#1f2937")
                    }}
                  >
                    {g.title}
                  </div>
                )}
                {!g.done && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="button" disabled={ordering || index === 0} aria-label={t("moveUp", { title: g.title })} onClick={() => void move(g.id, index - 1)} style={{ minWidth: 44, minHeight: 44, border: "1px solid #94a3b8", borderRadius: 6 }}>↑</button>
                  <button type="button" disabled={ordering || index === active.length - 1} aria-label={t("moveDown", { title: g.title })} onClick={() => void move(g.id, index + 1)} style={{ minWidth: 44, minHeight: 44, border: "1px solid #94a3b8", borderRadius: 6 }}>↓</button>
                  <select aria-label={t("changeRank", { title: g.title })} disabled={ordering} value={index} onChange={e => void move(g.id, Number(e.target.value))} style={{ minHeight: 44, maxWidth: "100%", borderRadius: 6, background: isDarkMode ? "#1f2937" : "#fff", color: "inherit", border: "1px solid #94a3b8" }}>
                    {active.map((_, rank) => <option key={rank} value={rank}>{t("rankLabel", { rank: rank + 1 })}</option>)}
                  </select>
                </div>}
                {g.deadline && (
                  <div style={{ fontSize: 11, color: g.done ? (isDarkMode ? "#4b5563" : "#d1d5db") : (isDarkMode ? "#9ca3af" : "#6b7280"), marginTop: 2 }}>
                    {t("deadlineLabel", { date: g.deadline })}
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  if (!window.confirm(tc("confirmDelete"))) return;
                  await deleteGoalAction(uid, g.id);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isDarkMode ? "#9ca3af" : "#888" }}
              >
                🗑
              </button>
            </div>
          ))}
        {goals.length === 0 && (
          <p style={{ textAlign: "center", color: isDarkMode ? "#6b7280" : "#9ca3af", fontSize: 14, marginTop: 12 }}>
            {t("noGoals")}
          </p>
        )}
      </div>
    </div>
  );
}
