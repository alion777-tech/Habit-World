"use client";
import { useEffect, useRef, useState } from "react";
import { unlockFairySounds, fairySoundReady, playFairyHatchSound, playFairyNamedSound, stopFairySounds } from "@/lib/fairySounds";
import { nameFairy } from "@/lib/fairyProgressActions";
import type { UserProfile } from "@/types/appTypes";
import "./fairyRoom.css";

export default function FairyRoom({ uid, fairy, hatching = false, onName }: { uid: string; fairy: NonNullable<UserProfile["fairy"]>; hatching?: boolean; onName?: (name: string) => Promise<void> }) {
  const [phase, setPhase] = useState(hatching ? "waiting" : "name");
  const [name, setName] = useState(fairy.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const completed = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!hatching) return;
    void hatch();
    heading.current?.focus();
    const panel = document.querySelector<HTMLElement>(".app-panel");
    if (panel) panel.inert = true;
    return () => { if (panel) panel.inert = false; };
  }, [hatching]);
  useEffect(() => {
    if (phase !== "shake") return;
    const timer = window.setTimeout(() => setPhase("open"), 2300);
    return () => clearTimeout(timer);
  }, [phase, playCount]);
  // openへの遷移時に前のタイマーが解除されるので、命名への遷移は独立させる。
  useEffect(() => {
    if (phase !== "open") return;
    const timer = window.setTimeout(() => setPhase("name"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => () => { if (!completed.current) stopFairySounds(); }, []);
  async function hatch(withGesture = false) {
    setPlayCount(value => value + 1);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (withGesture) {
      try { await unlockFairySounds(); setSoundEnabled(true); } catch { setSoundBlocked(true); }
    }
    if ((soundEnabled || withGesture) && fairySoundReady()) {
      setSoundBlocked(false); playFairyHatchSound(reduced);
    } else if (soundEnabled) setSoundBlocked(true);
    setPhase(reduced ? "name" : "shake");
  }
  const content = <div className={`fairy-room-card phase-${phase}`}>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
      <button type="button" aria-pressed={soundEnabled && !soundBlocked} onClick={async () => {
        if (soundEnabled && !soundBlocked) { stopFairySounds(); setSoundEnabled(false); }
        else { try { await unlockFairySounds(); setSoundEnabled(true); setSoundBlocked(false); playFairyNamedSound(); } catch { setSoundBlocked(true); } }
      }}>{soundEnabled && !soundBlocked ? "🔊 効果音 ON" : "🔇 効果音 OFF"}</button>
      {hatching && <button type="button" onClick={() => { stopFairySounds(); setPhase("waiting"); void hatch(true); }}>音付きでもう一度見る</button>}
    </div>
    {soundBlocked && <p>「音付きでもう一度見る」を押すと、効果音付きで再生します。</p>}
    <h2 ref={heading} tabIndex={-1}>{hatching ? phase === "name" ? "妖精をゲットしました！" : "連続7日ログイン達成！" : "妖精の部屋"}</h2>
    {hatching && <p className="fairy-reward">✨ 特別ポイント ＋100pt獲得</p>}
    <div className="fairy-birth-stage">
      {hatching && phase !== "name" && <div className="fairy-shell"><div className="fairy-shell-top" /><div className="fairy-shell-bottom" /></div>}
      {(!hatching || phase === "open" || phase === "name") && <img className="fairy-born" src="/world/fairy.png" alt="卵から生まれた基本の妖精" />}
      {hatching && (phase === "open" || phase === "name") && <div className="fairy-sparkles" aria-hidden="true">✧ ✨ ✦ ✨ ✧</div>}
      {hatching && (phase === "open" || phase === "name") && <div className="fairy-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${i * 5.8}%`, background: ["#ffe8a3", "#b0f7ed", "#e8b2ff"][i % 3], animationDelay: `${(i % 5) * .12}s` }} />)}</div>}
    </div>
    {phase === "waiting" && <><p>卵の中から、小さな音が聞こえます。</p><button onClick={() => void hatch(true)}>卵を見守る</button></>}
    {phase === "shake" && <p role="status">ピコピコ……もうすぐ生まれそう！</p>}
    {phase === "open" && <p role="status">あなたの歩みから、新しい仲間が誕生しました！</p>}
    {phase === "name" && <>
      {hatching ? <p>あなたの小さな一歩から、妖精が生まれました。この子に名前をつけてあげてください。</p> : <p>誕生日：{fairy.bornAt} · 見た目：基本形</p>}
      <p>妖精には性別がありません。見た目はあとからいろいろ変更できます。これから一緒に過ごす仲間に、好きな名前を贈りましょう。</p>
      <form onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setError("");
        if (soundEnabled) { try { await unlockFairySounds(); } catch {} }
        try { if (onName) await onName(name.trim()); else await nameFairy(uid, name); completed.current = true; if (soundEnabled) playFairyNamedSound(); } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。もう一度お試しください。"); }
        finally { setBusy(false); }
      }}>
        <label htmlFor="fairy-name">妖精の名前（1〜20文字）</label>
        <input id="fairy-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="off" required />
        <button disabled={busy || !name.trim()}>{busy ? "保存中…" : hatching ? "名前を贈って、一緒に歩き出す" : "名前を変更する"}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </>}
  </div>;
  return hatching ? <div className="fairy-birth-overlay" role="dialog" aria-modal="true" aria-label="妖精の誕生">{content}</div> : content;
}
