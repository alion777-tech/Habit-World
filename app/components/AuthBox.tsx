"use client";

import { useEffect, useState } from "react";
import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type Props = {
  isDarkMode?: boolean;
};

import { useTranslations } from "next-intl";

export default function AuthBox({ isDarkMode = false }: Props) {
  const t = useTranslations("Auth");

  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Googleアカウントでログインし、ローカルデータを同期する
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { syncLocalDataToFirestore } = await import("@/lib/syncActions");
      await syncLocalDataToFirestore(result.user.uid);
      setError("");
    } catch (e: any) {
      console.error("[AuthBox] Google Sign In error:", e);
      setError(e.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  if (user && !user.isAnonymous) {
    return (
      <div style={{
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        background: isDarkMode ? "#374151" : "#f3f4f6",
        border: isDarkMode ? "1px solid #4b5563" : "none"
      }}>
        <div style={{ fontSize: 13, color: isDarkMode ? "#9ca3af" : "#4b5563" }}>{t("loginInProgress")}</div>
        <div style={{ fontWeight: "bold", marginBottom: 8, color: isDarkMode ? "#fff" : "#000" }}>{user.email || user.displayName || t("loggedIn")}</div>
        {error && <div role="alert" style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button
          onClick={logout}
          style={{
            padding: "4px 16px",
            background: isDarkMode ? "transparent" : "#fff",
            color: isDarkMode ? "#fff" : "#000",
            border: isDarkMode ? "1.5px solid #fff" : "1px solid #d1d5db",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: "bold"
          }}
        >
          {t("logout")}
        </button>
      </div>
    );
  }

  // 未ログイン状態の表示
  return (
    <div style={{
      marginBottom: 16,
      padding: 16,
      borderRadius: 12,
      background: isDarkMode ? "#1f2937" : "#f3f4f6",
      border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db"
    }}>
      <h3 style={{ fontSize: 14, marginBottom: 16, textAlign: "center", fontWeight: "bold", color: isDarkMode ? "#fff" : "#000" }}>{t("getStarted")}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={signInWithGoogle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px",
            background: isDarkMode ? "#111827" : "#fff",
            color: isDarkMode ? "#fff" : "#000",
            border: isDarkMode ? "1px solid #4b5563" : "1px solid #d1d5db",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          {t("loginWithGoogle")}
        </button>
      </div>
      <p
        style={{
          fontSize: 11,
          marginTop: 14,
          textAlign: "center",
          lineHeight: 1.5,
          color: isDarkMode ? "#9ca3af" : "#6b7280"
        }}
      >
        {t("termsPrefix")}
        <a
          href="/terms.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6366f1", margin: "0 4px" }}
        >
          {t("termsLink")}
        </a>
        {t("termsAnd")}
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6366f1", margin: "0 4px" }}
        >
          {t("privacyLink")}
        </a>
        {t("termsSuffix")}
      </p>
      {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12, textAlign: "center" }}>{error}</div>}
    </div>
  );
}
