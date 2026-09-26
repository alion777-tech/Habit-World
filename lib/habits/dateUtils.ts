/**
 * 日本時間 (JST) での日付文字列 (YYYY-MM-DD) を取得する
 */
export const formatDateToJST = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    // ja-JP format is YYYY/MM/DD by default, but we ensure it as string components
    const parts = formatter.formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
};

/**
 * 日本時間 (JST) での曜日 (0:日, 1:月, ..., 6:土) を取得する
 */
export const getJSTDayOfWeek = (date: Date): number => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        weekday: "short",
    });
    const weekday = formatter.format(date); // "Sun", "Mon", etc.
    const mapping: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };
    return mapping[weekday] ?? 0;
};
