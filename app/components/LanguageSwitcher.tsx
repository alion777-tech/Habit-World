"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";

export default function LanguageSwitcher({ isDarkMode = false }: { isDarkMode?: boolean }) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const toggleLanguage = () => {
        const nextLocale = locale === "ja" ? "en" : "ja";
        router.replace(pathname, { locale: nextLocale });
    };

    return (
        <button
            onClick={toggleLanguage}
            style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px 4px",
                background: isDarkMode ? "transparent" : "#e5e7eb",
                color: isDarkMode ? "#fff" : "#374151",
                border: isDarkMode ? "1.5px solid #fff" : "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.1)" : "#d1d5db";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = isDarkMode ? "transparent" : "#e5e7eb";
            }}
        >
            <span style={{ fontSize: "16px" }}>
                {locale === "ja" ? "🇯🇵" : "🇺🇸"}
            </span>
            <span>{locale === "ja" ? "日本語" : "English"}</span>
        </button>
    );
}
