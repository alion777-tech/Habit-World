//app/components/TitleView.tsx
"use client";

import React from "react";
import { TitleDefinition } from "@/lib/titles";

type Props = {
  level: number;
  earnedTitles: string[];
  titles: TitleDefinition[];
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

import { useTranslations } from "next-intl";

export default function TitleView({
  level,
  earnedTitles,
  titles,
  isDarkMode,
  toggleDarkMode,
}: Props) {
  const t = useTranslations("Title");

  const categoryNames: Record<string, string> = {
    royalty: t("categories.royalty"),
    continuity: t("categories.continuity"),
    points: t("categories.points"),
    streak: t("categories.streak"),
    level: t("categories.level"),
    effort: t("categories.effort"),
    hidden: t("categories.hidden")
  };

  return (
    <div>
      <h2 style={{ fontSize: 24, marginBottom: 16, textAlign: "center", color: isDarkMode ? "#fff" : "#1f2937" }}>{t("title")}</h2>

      <div style={{
        textAlign: "center",
        marginBottom: 24,
        padding: "12px",
        background: isDarkMode ? "#1e1b4b" : "#e0e7ff",
        borderRadius: 12,
        color: isDarkMode ? "#c7d2fe" : "#4338ca",
        fontWeight: "bold"
      }}>
        {t("currentLevel", { level })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 40 }}>
        {Object.keys(categoryNames).map(catId => {
          const catTitles = titles.filter(t => t.category === catId && earnedTitles.includes(t.id));
          if (catTitles.length === 0 && catId !== "hidden") return null;
          if (catTitles.length === 0 && catId === "hidden") return null;

          return (
            <div key={catId}>
              <h3 style={{ fontSize: 14, color: isDarkMode ? "#9ca3af" : "#64748b", marginBottom: 10, borderLeft: `4px solid ${isDarkMode ? "#6366f1" : "#4f46e5"}`, paddingLeft: 8 }}>
                {categoryNames[catId]}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {catTitles.map(t => (
                  <div
                    key={t.id}
                    title={t.conditionDescription}
                    style={{
                      padding: "6px 12px",
                      background: isDarkMode ? "#374151" : "#fffbeb",
                      borderRadius: 20,
                      border: isDarkMode ? "1px solid #4b5563" : "1px solid #fde68a",
                      color: isDarkMode ? "#fbbf24" : "#b45309",
                      fontSize: 12,
                      fontWeight: "bold",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      cursor: "default"
                    }}
                  >
                    ✨ {t.name} · +{t.bonusPoints}pt
                    <div style={{ fontSize: 11, fontWeight: "normal", marginTop: 4 }}>{t.conditionDescription}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {earnedTitles.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#888" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🌑</p>
            <p style={{ fontSize: 14 }}>{t("noTitles")}<br />{t("noTitlesDesc")}</p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button
          onClick={toggleDarkMode}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: isDarkMode ? "1px solid #6b7280" : "1px solid #ccc",
            background: isDarkMode ? "#374151" : "#fff",
            color: isDarkMode ? "#fff" : "#000",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >
          {isDarkMode ? t("lightMode") : t("darkMode")}
        </button>
      </div>
    </div>
  );
}
