"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { openingDialogue } from "@/data/openingDialogue";
import { receiveFairyEgg } from "@/lib/fairyProgressActions";
import { unlockFairySounds } from "@/lib/fairySounds";
import "./opening.css";

type Props = { uid: string | null; onActiveChange: (active: boolean) => void; ready: boolean; signedIn: boolean; onNavigate: (tab: "profile" | "dream" | "habit") => void };
const completionKey = "habit-world-opening-v1";

export default function OpeningTutorial({ uid, onActiveChange, ready, signedIn, onNavigate }: Props) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [sound, setSound] = useState(false);
  const music = useRef<HTMLAudioElement | null>(null);
  const voice = useRef<AudioContext | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const initialized = useRef(false);
  const step = useMemo(() => {
    const entry = openingDialogue[index];
    return signedIn && entry.signedInText ? { ...entry, text: entry.signedInText } : entry;
  }, [index, signedIn]);
  const letters = Array.from(step.text);
  const reading = count < letters.length;
  useEffect(() => { onActiveChange(active); }, [active, onActiveChange]);

  useEffect(() => {
    const replay = () => { setIndex(0); setCount(0); setStarted(false); setActive(true); };
    window.addEventListener("habit-world-replay-opening", replay);
    return () => window.removeEventListener("habit-world-replay-opening", replay);
  }, []);

  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;
    try { setActive(localStorage.getItem(completionKey) !== "complete"); }
    catch { setActive(true); }
  }, [ready]);

  useEffect(() => {
    if (!active) return;
    document.body.classList.add("opening-active");
    document.body.classList.toggle("opening-guided", started && !!step.tab);
    const panel = document.querySelector<HTMLElement>(".app-panel");
    if (panel) panel.inert = !(started && !!step.tab);
    return () => { document.body.classList.remove("opening-active", "opening-guided"); if (panel) panel.inert = false; };
  }, [active, started, step.tab]);

  useEffect(() => {
    if (!active || !started || !step.tab) return;
    onNavigate(step.tab);
    const menu = step.id === "login" ? document.querySelector<HTMLDetailsElement>(".app-menu") : null;
    const wasOpen = menu?.open;
    if (menu) menu.open = true;
    const timer = window.setTimeout(() => {
      const targets = document.querySelectorAll(`[data-opening="${step.target}"], [data-opening="tab-${step.tab}"]`);
      targets.forEach(el => el.classList.add("opening-glow"));
      document.querySelector(`[data-opening="${step.target}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
    return () => {
      clearTimeout(timer);
      if (menu) menu.open = wasOpen ?? false;
      document.querySelectorAll(".opening-glow").forEach(el => el.classList.remove("opening-glow"));
    };
  }, [active, started, step, onNavigate]);

  useEffect(() => {
    if (!active || !started) return;
    setCount(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(Array.from(step.text).length);
      return;
    }
    let position = 0;
    const timer = window.setInterval(() => {
      position++;
      setCount(previous => Math.max(previous, position));
      const ctx = voice.current;
      if (ctx?.state === "running" && position % 2 === 0) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(620 + (position % 5) * 65, ctx.currentTime);
        gain.gain.setValueAtTime(0.018, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(); oscillator.stop(ctx.currentTime + 0.04);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
      if (position >= Array.from(step.text).length) clearInterval(timer);
    }, 42);
    typingTimer.current = timer;
    return () => clearInterval(timer);
  }, [active, started, step]); // 音声切替で文章を巻き戻さない

  // タイピング音のON/OFFはAudioContext自体を停止して即時反映する。
  useEffect(() => () => { music.current?.pause(); void voice.current?.close(); }, []);

  async function toggleSound(enable: boolean) {
    if (!enable) { music.current?.pause(); void voice.current?.suspend(); setSound(false); return; }
    try {
      void unlockFairySounds().catch(() => {});
      music.current ??= new Audio("/opening/bgm.mp3");
      music.current.loop = true; music.current.volume = 0.35;
      voice.current ??= new AudioContext();
      await voice.current.resume();
      await music.current.play();
      setSound(true);
    } catch { setSound(false); }
  }

  async function finish() {
    if (saving) return;
    setSaving(true); setSaveError("");
    try { await receiveFairyEgg(uid); }
    catch { setSaveError("卵を保存できませんでした。通信を確認して、もう一度お試しください。"); setSaving(false); return; }
    try { localStorage.setItem(completionKey, "complete"); localStorage.setItem("habit-world-opening-egg", "received"); } catch { /* 保存不可でも終了可能 */ }
    // 同じAudio要素を保持し、メイン画面へBGMを途切れず引き継ぐ。
    void voice.current?.suspend();
    setActive(false);
    setSaving(false);
  }

  if (!active) return <button className="opening-speaker main-speaker" aria-label={sound ? "BGMをOFFにする" : "BGMをONにする"} aria-pressed={sound} onClick={() => void toggleSound(!sound)}>{sound ? "🔊" : "🔇"}<span>BGM {sound ? "ON" : "OFF"}</span></button>;
  const guided = started && !!step.tab;
  return <section className={`opening ${guided ? "opening-guide" : "opening-scene"}`} aria-label="はじまりのチュートリアル">
    <button className="opening-speaker" aria-label={sound ? "BGMをOFFにする" : "BGMをONにする"} aria-pressed={sound} onClick={() => void toggleSound(!sound)}>{sound ? "🔊" : "🔇"}<span>BGM {sound ? "ON" : "OFF"}</span></button>
    {!guided && <img className="opening-art" src={!started || step.id === "ending" ? "/opening/title.jpg" : "/opening/spirit.jpg"} alt={!started || step.id === "ending" ? "Habit World — 夢に向かう毎日" : "光あふれる森の精霊王"} />}
    {guided && <img className="opening-portrait" src="/opening/spirit.jpg" alt="精霊王" />}
    {!started ? <div className="opening-start"><p>小さな一歩が、あなたの世界を育てる。</p><button onClick={() => { void toggleSound(true); setStarted(true); }}>旅をはじめる</button><small>タップすると音楽が流れます。右上で切り替えられます。</small></div> : <>
      {step.id === "egg" && <div className="opening-gift"><div className="opening-egg" role="img" aria-label="虹色に輝くカラフルな卵" /><strong>カラフルな卵を受け取りました！</strong></div>}
      <div className="opening-bubble">
        <div className="opening-caption"><strong>✧ 精霊王</strong><span>{index + 1} / {openingDialogue.length}</span></div>
        <p aria-label={step.text}><span aria-hidden="true">{letters.slice(0, count).join("")}</span></p>
        {saveError && <p role="alert">{saveError}</p>}
        <div className="opening-actions">
          {index > 0 && <button onClick={() => { setCount(0); setIndex(index - 1); }}>戻る</button>}
          <button onClick={() => { if (reading) { clearInterval(typingTimer.current); setCount(letters.length); } else if (index === openingDialogue.length - 1) finish(); else { setCount(0); setIndex(index + 1); } }}>{reading ? "全文を表示" : index === openingDialogue.length - 1 ? "冒険をはじめる" : step.id === "login" && !signedIn ? "ログインせず進む →" : "次へ →"}</button>
        </div>
      </div>
    </>}
  </section>;
}
