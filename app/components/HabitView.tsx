//app/components/HabitView.tsx
"use client";

import type React from "react";
import type { Habit } from "@/types/appTypes";

type Props = {
  // =========================
  // 入力（新しい習慣を追加）
  // =========================
  habit: string;
  setHabit: (v: string) => void;
  onAddHabit: () => void;

  // =========================
  // テスト日付（開発用）
  // =========================
  isDev: boolean;
  todayStr: string;
  setTestDayOffset: React.Dispatch<React.SetStateAction<number>>;

  // =========================
  // 習慣の種類（daily / weekly）
  // =========================
  habitType: "daily" | "weekly";
  setHabitType: React.Dispatch<React.SetStateAction<"daily" | "weekly">>;

  // =========================
  // weekly の曜日選択
  // =========================
  daysOfWeek: number[];
  setDaysOfWeek: React.Dispatch<React.SetStateAction<number[]>>;

  // =========================
  // 一覧表示（今日表示する習慣だけ）
  // =========================
  uid: string | null;
  visibleHabits: Habit[];

  // =========================
  // 一覧の編集（ダブルクリック編集）
  // =========================
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  editingText: string;
  setEditingText: React.Dispatch<React.SetStateAction<string>>;

  // =========================
  // 一覧の操作（Home側の関数を呼ぶ）
  // =========================
  onToggleHabit: (habitId: string) => void;
  completionDisabled?: boolean;
  onSaveEdit: (habitId: string) => void;
  onDeleteHabit: (habitId: string) => void;
  isDarkMode?: boolean;

  // 過去分チェック用
  habitDisplayDate?: "today" | "yesterday";
  setHabitDisplayDate?: (v: "today" | "yesterday") => void;
};

import { useTranslations } from "next-intl";

export default function HabitView({
  habit,
  habitType,
  setHabitType,
  setHabit,
  daysOfWeek,
  setDaysOfWeek,
  uid,
  visibleHabits,

  editingId,
  setEditingId,
  editingText,
  setEditingText,
  onToggleHabit,
  completionDisabled = false,
  onSaveEdit,
  onDeleteHabit,

  onAddHabit,
  isDev,
  todayStr,
  setTestDayOffset,
  isDarkMode = false,

  habitDisplayDate = "today",
  setHabitDisplayDate,
}: Props) {
  const t = useTranslations("Habit");
  const tc = useTranslations("Common");

  return (
    <div>
      <div data-opening="habit">
      <input
        type="text"
        placeholder={t("placeholder")}
        value={habit}
        onChange={(e) => setHabit(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
          borderRadius: 8,
          border: isDarkMode ? "1px solid #4b5563" : "1px solid #ccc",
          background: isDarkMode ? "#374151" : "#fff",
          color: isDarkMode ? "#fff" : "#000",
        }}
      />
      <div style={{ marginBottom: 12, color: isDarkMode ? "#d1d5db" : "#000" }}>
        <label style={{ cursor: "pointer" }}>
          <input
            type="radio"
            checked={habitType === "daily"}
            onChange={() => setHabitType("daily")}
          />
          {t("daily")}
        </label>

        <label style={{ marginLeft: 12, cursor: "pointer" }}>
          <input
            type="radio"
            checked={habitType === "weekly"}
            onChange={() => setHabitType("weekly")}
          />
          {t("weekly")}
        </label>
      </div>
      {habitType === "weekly" && (
        <div style={{ marginBottom: 12, color: isDarkMode ? "#d1d5db" : "#000" }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <label key={i} style={{ marginRight: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={daysOfWeek.includes(i)}
                onChange={() => {
                  setDaysOfWeek((prev) =>
                    prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
                  );
                }}
              />
              {t(`days.${i}`)}
            </label>
          ))}
        </div>
      )}

      <button
        onClick={onAddHabit}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 8,
          border: "none",
          background: isDarkMode ? "#6366f1" : "#4f46e5",
          color: "#fff",
          fontSize: 16,
          fontWeight: "bold",
          marginBottom: 16,
          cursor: "pointer",
        }}
      >
        {t("addButton")}
      </button>

      </div>
      {/* 表示切替タブ */}
      {setHabitDisplayDate && (
        <div style={{
          display: "flex",
          marginBottom: 16,
          background: isDarkMode ? "#374151" : "#f1f5f9",
          borderRadius: 8,
          padding: 4
        }}>
          <button
            onClick={() => setHabitDisplayDate("today")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 6,
              border: "none",
              background: habitDisplayDate === "today" ? (isDarkMode ? "#4f46e5" : "#fff") : "transparent",
              color: habitDisplayDate === "today" ? (isDarkMode ? "#fff" : "#4f46e5") : (isDarkMode ? "#9ca3af" : "#64748b"),
              fontWeight: "bold",
              fontSize: 12,
              cursor: "pointer",
              boxShadow: habitDisplayDate === "today" && !isDarkMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            {t("today")}
          </button>
          <button
            onClick={() => setHabitDisplayDate("yesterday")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 6,
              border: "none",
              background: habitDisplayDate === "yesterday" ? (isDarkMode ? "#4f46e5" : "#fff") : "transparent",
              color: habitDisplayDate === "yesterday" ? (isDarkMode ? "#fff" : "#4f46e5") : (isDarkMode ? "#9ca3af" : "#64748b"),
              fontWeight: "bold",
              fontSize: 12,
              cursor: "pointer",
              boxShadow: habitDisplayDate === "yesterday" && !isDarkMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            {t("yesterday")}
          </button>
        </div>
      )}

      {habitDisplayDate === "yesterday" && (
        <div style={{
          fontSize: 11,
          color: isDarkMode ? "#fbbf24" : "#d97706",
          textAlign: "center",
          marginBottom: 12,
          padding: "4px 8px",
          background: isDarkMode ? "#451a03" : "#fffbeb",
          borderRadius: 4,
          border: isDarkMode ? "1px solid #92400e" : "1px solid #fcd34d"
        }}>
          ⚠️ {t("yesterdayNotice")}
        </div>
      )}

      {visibleHabits.length === 0 && (
        <p style={{ color: "#888", textAlign: "center", padding: 20 }}>{t("noHabits")}</p>
      )}
      <ul style={{ paddingLeft: 0 }}>
        {visibleHabits.map((h) => {
          const isDoneToday = (h.pointHistory ?? []).some((p) => p.date === todayStr);

          // ダークモードとライトモードの配色
          const itemBg = isDoneToday
            ? (isDarkMode ? "#064e3b" : "#d1fae5")
            : (isDarkMode ? "#374151" : "#f1f5f9");
          const textColor = isDoneToday
            ? (isDarkMode ? "#6ee7b7" : "#065f46")
            : (isDarkMode ? "#f3f4f6" : "#000");

          return (
            <li
              key={h.id}
              style={{
                listStyle: "none",
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 8,
                background: itemBg,
                color: textColor,

                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                // Completion colors change in the same frame as the checkbox.
              }}
            >
              <div style={{ cursor: "pointer", display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                <input
                  type="checkbox"
                  checked={isDoneToday}
                  disabled={completionDisabled}
                  onChange={() => {
                    onToggleHabit(h.id);
                  }}
                  style={{ marginRight: 10, width: 18, height: 18 }}
                />

                {editingId === h.id ? (
                  <input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => onSaveEdit(h.id)}
                    autoFocus
                    style={{
                      flex: 1,
                      marginRight: 8,
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid #4f46e5",
                      background: isDarkMode ? "#1f2937" : "#fff",
                      color: isDarkMode ? "#fff" : "#000"
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => {
                      setEditingId(h.id);
                      setEditingText(h.text);
                    }}
                    style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", textDecoration: isDoneToday ? "line-through" : "none" }}
                  >
                    <div style={{ fontWeight: "bold" }}>{h.text}</div>
                    <div style={{ fontSize: 11, color: isDoneToday ? (isDarkMode ? "#34d399" : "#047857") : (isDarkMode ? "#9ca3af" : "#666"), marginTop: 2 }}>
                      🔥 {t("streak", { days: h.dailyStreak })}
                    </div>
                  </span>
                )}
              </div>

              <span style={{ alignSelf: "flex-end", margin: "0 4px 4px 8px", maxWidth: "40%", fontSize: 11, lineHeight: 1.5, textAlign: "right", color: isDarkMode ? "#d1d5db" : "#64748b" }}>
                {h.type !== "weekly" ? t("daily") : [...new Set(h.daysOfWeek ?? [])].sort((a, b) => a - b).map(day => t(`days.${day}`)).join("・")}
              </span>
              <button
                onClick={() => {
                  if (window.confirm(t("confirmDelete"))) {
                    onDeleteHabit(h.id);
                  }
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  color: isDarkMode ? "#9ca3af" : "#888",
                  padding: "4px 8px"
                }}
              >
                🗑
              </button>
            </li>
          );
        })}
      </ul>

    </div>
  );
}
