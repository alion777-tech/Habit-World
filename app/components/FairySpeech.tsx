"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { bubblePosition, loginCategory, selectDialogue, type Category, type DialogueContext, type HistoryEntry } from "@/lib/fairy/dialogue";
import bank from "@/data/fairy/ja.json";
import styles from "./AutonomousFairy.module.css";

export type FairyContext = Omit<DialogueContext, "hour" | "action"> & { account?: string; ready?: boolean };
type Memory = { lastVisit?: number; days: number; history: HistoryEntry[] };
function readMemory(key: string): Memory {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      lastVisit: typeof value.lastVisit === "number" && Number.isFinite(value.lastVisit) ? value.lastVisit : undefined,
      days: Number.isInteger(value.days) && value.days > 0 ? value.days : 0,
      history: Array.isArray(value.history) ? value.history.filter((h: HistoryEntry) => h && typeof h.text === "string" && Number.isFinite(h.at)).slice(-80) : [],
    };
  } catch { return { days: 0, history: [] }; }
}

export default function FairySpeech({ sprite, request, context = {}, locale }: {
  sprite: RefObject<HTMLDivElement | null>; request: number; context?: FairyContext; locale: string;
}) {
  const bubble = useRef<HTMLDivElement>(null);
  const current = useRef(context);
  current.current = context;
  const speak = useRef<() => void>(() => {});
  const [message, setMessage] = useState<{ text: string; serial: number } | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const key = "habit-world:fairy:v1:" + (context.account || "local");
    const memory = readMemory(key);
    const started = Date.now();
    let lastActivity = started;
    let idleBeforeActivity = 0;
    const day = (ms: number) => Math.floor((ms + 9 * 3600000) / 86400000);
    const gap = memory.lastVisit ? day(started) - day(memory.lastVisit) : Infinity;
    memory.days = gap === 1 ? memory.days + 1 : gap === 0 ? memory.days : 1;
    let login: Category | undefined = loginCategory(memory.lastVisit, started, memory.days);
    let loginExpires = started + 60000;
    let pending: { event: Category; expires: number } | undefined;
    let fadeTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    const save = () => {
      memory.lastVisit = Date.now();
      try { localStorage.setItem(key, JSON.stringify(memory)); } catch { /* Storage is optional. */ }
    };
    save();
    const show = (manual = false) => {
      const now = Date.now();
      if (!manual && current.current.ready === false) return;
      if (document.hidden) return;
      const element = sprite.current;
      if (!element || element.dataset.action === "away") return;
      const result = selectDialogue({
        ...current.current,
        ...(current.current.ready === false ? { total: undefined, completed: undefined, streak: undefined } : {}),
        hour: Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", hour: "numeric", hourCycle: "h23" }).format(now)),
        action: element.dataset.action,
        sessionMs: now - started,
        idleMs: Math.max(now - lastActivity, idleBeforeActivity),
        login: now < loginExpires ? login : undefined,
        event: pending && now < pending.expires ? pending.event : undefined,
      }, memory.history, now, locale, Math.random, manual);
      if (!result) return;
      login = undefined;
      loginExpires = 0;
      pending = undefined;
      idleBeforeActivity = 0;
      memory.history = result.history;
      save();
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      setFading(false);
      setMessage({ text: result.text, serial: now });
      const duration = Math.min(10000, Math.max(4500, result.text.length * 150));
      fadeTimer = setTimeout(() => setFading(true), duration);
      hideTimer = setTimeout(() => setMessage(null), duration + 300);
    };
    speak.current = () => show(true);
    const activity = () => {
      idleBeforeActivity = Date.now() - lastActivity;
      lastActivity = Date.now();
    };
    const event = (e: Event) => {
      const category = (e as CustomEvent).detail;
      if (typeof category !== "string" || !Object.hasOwn(bank, category)) return;
      pending = { event: category as Category, expires: Date.now() + 15000 };
      show();
    };
    window.addEventListener("fairy-dialogue", event);
    window.addEventListener("pointerdown", activity, true);
    window.addEventListener("keydown", activity, true);
    window.addEventListener("pagehide", save);
    // Maintain last visit across midnight and long foreground sessions.
    const visitTimer = setInterval(() => { if (!document.hidden) save(); }, 60000);
    return () => {
      speak.current = () => {};
      clearTimeout(fadeTimer); clearTimeout(hideTimer); clearInterval(visitTimer);
      window.removeEventListener("fairy-dialogue", event);
      window.removeEventListener("pointerdown", activity, true);
      window.removeEventListener("keydown", activity, true);
      window.removeEventListener("pagehide", save);
    };
  }, [context.account, context.ready, locale, sprite]);

  useEffect(() => { if (request) speak.current(); }, [request]);

  useEffect(() => {
    if (!message) return;
    let frame = 0;
    const position = () => {
      const el = bubble.current;
      const fairy = sprite.current;
      if (el && fairy) {
        const rect = fairy.getBoundingClientRect();
        const viewport = window.visualViewport;
        const offsetX = viewport?.offsetLeft ?? 0;
        const offsetY = viewport?.offsetTop ?? 0;
        const width = viewport?.width ?? window.innerWidth;
        const height = viewport?.height ?? window.innerHeight;
        el.style.maxWidth = Math.max(1, width - 16) + "px";
        el.style.maxHeight = Math.max(1, height - 16) + "px";
        const point = bubblePosition(rect.left - offsetX, rect.top - offsetY, rect.height, el.offsetWidth, el.offsetHeight, width, height);
        el.style.left = point.left + offsetX + "px";
        el.style.top = point.top + offsetY + "px";
        el.style.visibility = fairy.dataset.action === "away" ? "hidden" : "visible";
      }
      frame = requestAnimationFrame(position);
    };
    position();
    return () => cancelAnimationFrame(frame);
  }, [message, sprite]);

  return <div ref={bubble} role="status" aria-live="polite" aria-atomic="true"
    className={styles.bubble} data-fading={fading} hidden={!message}>{message?.text}</div>;
}
