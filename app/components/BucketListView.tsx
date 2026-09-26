"use client";

import React, { useEffect, useState, useRef } from "react";
import type { BucketListData, BucketListItem } from "@/types/appTypes";
import { getBucketList, saveBucketList } from "@/lib/bucketListActions";

const UI = {
    fontBase: 14,
    fontSmall: 12,
    fontTiny: 11,

    radius: 8,
    radiusSm: 6,
    radiusLg: 12,

    padXs: "4px 8px",
    padSm: "8px 12px",
    padMd: 12,     // 入力・カードの基本paddingに使う
};


type Props = {
    uid: string | null;
    isDarkMode?: boolean;
};

import { useTranslations } from "next-intl";

export default function BucketListView({ uid, isDarkMode = false }: Props) {
    const t = useTranslations("BucketList");
    const tc = useTranslations("Common");

    const [data, setData] = useState<BucketListData>({
        title: t("titleDefault"),
        subtitle: t("subtitleDefault"),
        items: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            text: "",
            isCompleted: false,
            // deadline is removed from UI but kept in type for compatibility if needed
        }))
    });

    const [isLoading, setIsLoading] = useState(true);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingSubtitle, setEditingSubtitle] = useState(false);

    // Double-click edit states for list items
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editingItemText, setEditingItemText] = useState("");

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load data
    useEffect(() => {
        let active = true;
        const load = async () => {
            setIsLoading(true);
            setLoadError(false);
            try {
            const saved = await getBucketList(uid);
            if (!active) return;
            if (saved) {
                // Ensure we always have 100 items even if data is old/partial
                const mergedItems = Array.from({ length: 100 }, (_, i) => {
                    const found = saved.items.find(item => item.id === i + 1);
                    return found || { id: i + 1, text: "", isCompleted: false };
                });

                setData({
                    title: saved.title || t("titleDefault"),
                    subtitle: saved.subtitle || t("subtitleDefault"),
                    targetDate: saved.targetDate || null,
                    items: mergedItems
                });
            }
            } catch (error) {
                console.error("Could not load bucket list:", error);
                if (active) setLoadError(true);
            } finally {
                if (active) setIsLoading(false);
            }
        };

        load();
        return () => { active = false; };
    }, [uid, t, retryCount]);

    // Auto-save logic
    useEffect(() => {
        if (!hasUnsavedChanges || isLoading || loadError) return;
        let active = true;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveBucketList(uid, data);
                if (active) {
                    setHasUnsavedChanges(false);
                    setSaveError(false);
                }
            } catch (error) {
                console.error("Could not save bucket list:", error);
                if (active) setSaveError(true);
            }
        }, 1000); // 1 second debounce

        return () => {
            active = false;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [data, hasUnsavedChanges, uid, isLoading, loadError]);

    const updateData = (newData: Partial<BucketListData>) => {
        setData(prev => ({ ...prev, ...newData }));
        setHasUnsavedChanges(true);
    };

    const updateItem = (id: number, updates: Partial<BucketListItem>) => {
        const newItems = data.items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        );
        updateData({ items: newItems });
    };

    const handleReset = async () => {
        if (!window.confirm(t("resetConfirm"))) return;

        const newData = {
            title: t("titleDefault"),
            subtitle: t("subtitleDefault"),
            targetDate: null,
            items: Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                text: "",
                isCompleted: false,
            }))
        };

        updateData(newData);
    };

    const completedCount = data.items.filter(i => i.isCompleted).length;
    const progress = completedCount; // Max 100, so count == percentage
    const isAllCompleted = completedCount === 100;

    if (isLoading) {
        return <div style={{ padding: 20, textAlign: "center", color: isDarkMode ? "#ccc" : "#666" }}>{tc("loading")}</div>;
    }

    if (loadError) {
        return <div role="alert" style={{ padding: 20, color: "#ef4444" }}>
            <p>{t("loadError")}</p>
            <button onClick={() => setRetryCount(count => count + 1)}>{t("retry")}</button>
        </div>;
    }

    return (
        <div style={{ color: isDarkMode ? "#f3f4f6" : "#1f2937" }}>
            {saveError ? <div role="alert" style={{ color: "#ef4444", marginBottom: 16 }}>
                <p>{t("saveError")}</p>
                <button onClick={() => setData(previous => ({ ...previous }))}>{t("retry")}</button>
            </div> : hasUnsavedChanges && <p role="status">{t("saving")}</p>}
            {/* Header Section */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                {editingSubtitle ? (
                    <input
                        value={data.subtitle}
                        onChange={(e) => updateData({ subtitle: e.target.value })}
                        onBlur={() => setEditingSubtitle(false)}
                        onKeyDown={(e) => { if (e.key === "Enter") setEditingSubtitle(false); }}
                        autoFocus
                        style={{
                            fontSize: UI.fontBase,
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                            textAlign: "center",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid #6366f1",
                            outline: "none",
                            width: "80%"
                        }}
                    />
                ) : (
                    <div
                        onClick={() => setEditingSubtitle(true)}
                        style={{ fontSize: UI.fontBase, color: isDarkMode ? "#9ca3af" : "#6b7280", cursor: "pointer", minHeight: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                    >
                        {data.subtitle} <span style={{ fontSize: UI.fontSmall, opacity: 0.7 }}>✏️</span>
                    </div>
                )}

                {(() => {
                    // Title format logic needs to be flexible for i18n
                    // For Japanese: [prefix] + "までに" + "したい100のこと"
                    // For English: it might be different, but let's stick to part replacements
                    const part1 = t("suffixPart1");
                    const part2 = t("suffixPart2");
                    const fullSuffix = part1 + part2;

                    const hasSuffix = data.title.endsWith(fullSuffix);
                    const prefix = hasSuffix ? data.title.slice(0, -fullSuffix.length) : data.title;

                    return editingTitle ? (
                        <div style={{ marginBottom: 16 }}>
                            {/* Row 1: Center Aligned [Prefix][suffixPart1] */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    alignItems: "baseline",
                                    gap: 2,
                                    transform: "translateX(10px)",
                                }}
                            >

                                <input
                                    value={prefix}
                                    onChange={(e) => updateData({ title: e.target.value + fullSuffix })}
                                    onBlur={() => setEditingTitle(false)}
                                    onKeyDown={(e) => { if (e.key === "Enter") setEditingTitle(false); }}
                                    autoFocus
                                    style={{
                                        fontSize: 24,
                                        fontWeight: "bold",
                                        textAlign: "left",
                                        background: "transparent",
                                        border: "none",
                                        borderBottom: "2px solid #6366f1",
                                        outline: "none",
                                        color: isDarkMode ? "#fff" : "#000",
                                        width: "auto",
                                        minWidth: 120, // ensure enough space to click
                                        maxWidth: "70%"
                                    }}
                                />
                                <span style={{ fontSize: 24, fontWeight: "bold" }}>{part1}</span>
                            </div>

                            {/* Row 2: Right Aligned [suffixPart2] */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                                <span style={{ fontSize: 24, fontWeight: "bold" }}>{part2}</span>
                            </div>
                        </div>
                    ) : (
                        <h1
                            onClick={() => setEditingTitle(true)}
                            style={{
                                margin: "4px 0 16px",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4
                            }}
                        >
                            {/* Row 1: Center Aligned */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    alignItems: "baseline",
                                    gap: 4,
                                    transform: "translateX(10px)",
                                }}
                            >
                                <span style={{ fontSize: 24, fontWeight: "bold" }}>{prefix}</span>
                                <span style={{ fontSize: 24, fontWeight: "bold" }}>{part1}</span>
                            </div>


                            {/* Row 2: Right Aligned */}
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 24, fontWeight: "bold" }}>{part2}</span>
                                <span style={{ fontSize: 16, opacity: 0.5 }}>✏️</span>
                            </div>
                        </h1>
                    );
                })()}

                {/* Global Deadline Picker */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, marginRight: 8, color: isDarkMode ? "#9ca3af" : "#6b7280" }}>
                        {t("targetDateLabel")}
                    </label>
                    <input
                        type="date"
                        value={data.targetDate || ""}
                        onChange={(e) => updateData({ targetDate: e.target.value })}
                        style={{
                            padding: UI.padXs,
                            borderRadius: UI.radiusSm,
                            border: isDarkMode ? "1px solid #4b5563" : "1px solid #ccc",
                            background: isDarkMode ? "#1f2937" : "#fff",
                            color: isDarkMode ? "#fff" : "#000",
                            cursor: "pointer"
                        }}

                    />
                </div>

                {/* Progress Bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                        flex: 1,
                        height: 10,
                        background: isDarkMode ? "#374151" : "#e5e7eb",
                        borderRadius: 5,
                        overflow: "hidden"
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #6366f1, #a855f7)",
                            transition: "width 0.5s ease"
                        }} />
                    </div>
                    <div style={{ fontWeight: "bold", minWidth: 40, textAlign: "right" }}>{progress}%</div>
                </div>
            </div>

            {/* Congratulatory Message */}
            {isAllCompleted && (
                <div style={{
                    padding: 20,
                    background: "linear-gradient(135deg, #fce7f3, #e0e7ff)",
                    borderRadius: 12,
                    marginBottom: 24,
                    textAlign: "center",
                    border: "2px solid #fbcfe8",
                    color: "#1f2937"
                }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                    <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>{t("congratsTitle")}</h3>
                    <p style={{ fontSize: 14, marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: t("congratsDesc") }} />
                    <button
                        onClick={handleReset}
                        style={{
                            padding: "8px 16px",
                            background: "#fff",
                            border: "1px solid #db2777",
                            color: "#db2777",
                            borderRadius: 20,
                            fontWeight: "bold",
                            cursor: "pointer"
                        }}
                    >
                        {t("resetButton")}
                    </button>
                </div>
            )}

            {/* List Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.items.map((item) => {
                    // Global deadline check
                    const isOverdue = data.targetDate && data.targetDate < new Date().toISOString().split("T")[0] && !item.isCompleted;

                    return (
                        <div
                            key={item.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: UI.padSm,
                                background: item.isCompleted
                                    ? (isDarkMode ? "#1f2937" : "#f9fafb")
                                    : (isDarkMode ? "#374151" : "#fff"),
                                borderRadius: UI.radius,
                                border: isDarkMode ? "1px solid #4b5563" : "1px solid #e5e7eb",
                                opacity: item.isCompleted ? 0.6 : 1,
                                transition: "all 0.2s"
                            }}
                        >
                            <div style={{
                                minWidth: 24,
                                fontSize: 12,
                                fontWeight: "bold",
                                color: isDarkMode ? "#9ca3af" : "#9ca3af"
                            }}>
                                {item.id}.
                            </div>

                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={item.isCompleted}
                                onChange={() => updateItem(item.id, { isCompleted: !item.isCompleted })}
                                disabled={!item.text}
                                style={{ cursor: "pointer", width: 16, height: 16 }}
                            />

                            {/* Text Input (Double click to edit) */}
                            <div style={{ flex: 1, position: "relative" }}>
                                {editingItemId === item.id ? (
                                    <input
                                        value={editingItemText}
                                        onChange={(e) => setEditingItemText(e.target.value)}
                                        onBlur={() => {
                                            updateItem(item.id, { text: editingItemText });
                                            setEditingItemId(null);
                                        }}
                                        autoFocus
                                        placeholder={t("placeholder")}
                                        style={{
                                            width: "100%",
                                            padding: UI.padXs,
                                            borderRadius: 4,
                                            border: "1px solid #6366f1",
                                            background: isDarkMode ? "#1f2937" : "#fff",
                                            color: isDarkMode ? "#fff" : "#000",
                                            outline: "none"
                                        }}
                                    />
                                ) : (
                                    <div
                                        onDoubleClick={() => {
                                            setEditingItemId(item.id);
                                            setEditingItemText(item.text);
                                        }}
                                        style={{
                                            padding: UI.padXs,
                                            cursor: "text",
                                            minHeight: 24,
                                            color: isOverdue
                                                ? "#ef4444" // Red for overdue
                                                : (item.isCompleted ? (isDarkMode ? "#9ca3af" : "#9ca3af") : (isDarkMode ? "#fff" : "#000")),
                                            textDecoration: item.isCompleted ? "line-through" : "none"
                                        }}
                                    >
                                        {item.text || <span style={{ color: isDarkMode ? "#6b7280" : "#d1d5db", fontSize: 12 }}>{t("doubleClickTip")}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
