//app/components/StatsView.tsx
"use client";

import type React from "react";
import type { DailyStat } from "@/types/appTypes";

type Props = {
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;

  calendarDays: string[];
  dailyStats: DailyStat[];

  selectedDate: string | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<string | null>>;

  streak: number;
  isDarkMode?: boolean;
};

import { useTranslations } from "next-intl";

export default function StatsView({
  currentMonth,
  setCurrentMonth,
  calendarDays,
  dailyStats,
  selectedDate,
  setSelectedDate,
  streak,
  isDarkMode = false,
}: Props) {
  const t = useTranslations("Stats");

  const navButtonStyle = {
    padding: "6px 12px",
    borderRadius: 8,
    border: isDarkMode ? "1px solid #4b5563" : "1px solid #ccc",
    background: isDarkMode ? "#374151" : "#fff",
    color: isDarkMode ? "#fff" : "#000",
    cursor: "pointer",
    fontSize: 12,
  };

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>📊 {t("title")}</h2>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <button
          style={navButtonStyle}
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
            )
          }
        >
          {t("prevMonth")}
        </button>

        <div style={{ fontWeight: "bold", color: isDarkMode ? "#fff" : "#000" }}>
          {currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}
        </div>

        <button
          style={navButtonStyle}
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            )
          }
        >
          {t("nextMonth")}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          marginBottom: 16,
        }}
      >
        {calendarDays.map((date) => {
          const stat = dailyStats.find((d) => d.date === date);
          const achieved = stat && stat.doneCount > 0;
          const isSelected = selectedDate === date;

          return (
            <div
              key={date}
              onClick={() => setSelectedDate(date)}
              style={{
                padding: "8px 0",
                fontSize: 12,
                textAlign: "center",
                borderRadius: 8,
                cursor: "pointer",
                background: achieved
                  ? (isDarkMode ? "#064e3b" : "#4ade80")
                  : (isDarkMode ? "#374151" : "#e5e7eb"),
                color: achieved
                  ? (isDarkMode ? "#6ee7b7" : "#065f46")
                  : (isDarkMode ? "#d1d5db" : "#374151"),
                outline: isSelected ? `2px solid ${isDarkMode ? "#6366f1" : "#2563eb"}` : "none",
                transition: "all 0.2s",
                fontWeight: achieved ? "bold" : "normal"
              }}
            >
              {Number(date.slice(8, 10))}
            </div>
          );
        })}
      </div>

      <div style={{
        background: isDarkMode ? "#111827" : "#f8fafc",
        padding: 12,
        borderRadius: 12,
        marginBottom: 20
      }}>
        {selectedDate ? (
          (() => {
            const d = dailyStats.find((s) => s.date === selectedDate);
            if (!d) return <p style={{ fontSize: 12, color: "#888", textAlign: "center", margin: 0 }}>{t("noData")}</p>;

            return (
              <div style={{ fontSize: 13, textAlign: "center", color: isDarkMode ? "#fff" : "#000" }}>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>{selectedDate}</div>
                <div style={{ color: isDarkMode ? "#fbbf24" : "#4f46e5", fontWeight: "bold" }}>
                  {t("rate", { rate: d.rate, done: d.doneCount, total: d.total })}
                </div>
              </div>
            );
          })()
        ) : (
          <p style={{ fontSize: 12, color: "#888", textAlign: "center", margin: 0 }}>{t("selectDate")}</p>
        )}
      </div>

      <div style={{
        padding: 16,
        borderRadius: 12,
        background: isDarkMode ? "#374151" : "#eef2ff",
        border: isDarkMode ? "1px solid #4b5563" : "none"
      }}>
        <h3 style={{ fontSize: 15, marginBottom: 8, color: isDarkMode ? "#fff" : "#4f46e5", fontWeight: "bold" }}>{t("streakTitle")}</h3>
        <p style={{ fontSize: 18, fontWeight: "bold", margin: 0, color: isDarkMode ? "#fbbf24" : "#1e40af" }}>
          {t("streakMessage", { days: streak })}
        </p>
      </div>
    </div>
  );
}
