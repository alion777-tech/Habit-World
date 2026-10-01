"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import styles from "./AutonomousFairy.module.css";
import FairySpeech, { type FairyContext } from "./FairySpeech";
import { AvatarFigure } from '../(root)/avatar/wardrobe-studio';
import { DEFAULT } from '../(root)/avatar/wardrobe';
import { useWardrobe } from '../../hooks/useWardrobe';

type Point = { x: number; y: number };
type Action = "enter" | "fly" | "hover" | "rest" | "leave" | "away" | "peek" | "land" | "walk" | "takeoff";
type Preview = "fly" | "walk" | "peek";
const random = (min: number, max: number) => min + Math.random() * (max - min);

/** Movement remains independent of the read-only dialogue context. */
export default function AutonomousFairy({ context, uid }: { context?: FairyContext;uid?:string|null } = {}) {
  const wardrobe=useWardrobe(uid);
  const sprite = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const previewRef = useRef<Preview | null>(null);
  const [paused, setPaused] = useState(false);
  const japanese = useLocale().startsWith("ja");
  const [speechRequest, setSpeechRequest] = useState(0);

  useEffect(() => {
    const element = sprite.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let bounds = { width: 0, height: 0, size: 0 };
    let from: Point = { x: 0, y: 0 };
    let to: Point = { x: 0, y: 0 };
    let position: Point = { x: 0, y: 0 };
    let action: Action = "enter";
    let elapsed = 0;
    let duration = 3500;
    let clock = 0;
    let last = 0;
    let frame = 0;
    let direction = -1;
    let peekSide = 1;
    const floor = () => {
      const navigation = document.querySelector<HTMLElement>(".primary-nav")?.getBoundingClientRect();
      const bottom = navigation && navigation.height > 0
        ? Math.min(bounds.height, navigation.top) : bounds.height;
      return Math.max(0, bottom - element.offsetHeight - 8);
    };
    const destination = (): Point => ({
      x: random(8, Math.max(8, bounds.width - bounds.size - 8)),
      y: random(24, Math.max(24, bounds.height - element.offsetHeight - 24)),
    });
    const edge = (): Point => ({
      ...destination(),
      x: Math.random() < 0.5 ? 8 : Math.max(8, bounds.width - bounds.size - 8),
    });
    const paint = () => {
      const progress = Math.min(elapsed / duration, 1);
      const flying = ["enter", "fly", "hover", "leave", "takeoff", "land"].includes(action);
      const strength = action === "land" ? 1 - progress : action === "takeoff" ? progress : 1;
      const step = Math.sin(clock / 105);
      const bob = media.matches ? 0 : action === "walk" ? -Math.abs(step) * 4
        : flying ? Math.sin(clock / 280) * 5 * strength : 0;
      const tilt = media.matches ? 0 : action === "walk" ? step * 7
        : action === "peek" ? -peekSide * Math.sin(progress * Math.PI) * 22
        : flying ? (direction * 9 + Math.sin(clock / 280) * 4) * strength : Math.sin(clock / 900) * 2;
      const squash = media.matches ? 0 : action === "walk" ? Math.abs(step) * 0.035
        : flying ? Math.sin(clock / 130) * 0.025 * strength : 0;
      element.style.transform = `translate3d(${position.x}px, ${position.y + bob}px, 0)`;
      // The inner image acts independently of its flight path, using the same clock
      // so pause, tab visibility and reduced motion also freeze the pose.
      const body = element.firstElementChild as HTMLElement | null;
      if (body) body.style.transform = `rotate(${tilt}deg) scale(${1 + squash}, ${1 - squash})`;
      element.style.visibility = action === "away" ? "hidden" : "visible";
      element.dataset.action = action;
    };
    const resize = () => {
      bounds = { width: window.innerWidth, height: window.innerHeight, size: element.offsetWidth };
      if (action === "walk") {
        const clampX = (x: number) => Math.max(8, Math.min(x, bounds.width - bounds.size - 8));
        from = { x: clampX(from.x), y: floor() };
        to = { x: direction > 0 ? Math.max(8, bounds.width - bounds.size - 8) : 8, y: floor() };
        position = { x: clampX(position.x), y: floor() };
        paint();
        return;
      }
      position = media.matches ? edge() : { x: bounds.width + bounds.size, y: destination().y };
      from = { ...position };
      to = edge();
      action = media.matches ? "rest" : "enter";
      elapsed = 0;
      duration = 3500;
      paint();
    };
    const begin = (nextAction: Action, target: Point, milliseconds: number) => {
      from = { ...position };
      to = target;
      elapsed = 0;
      duration = milliseconds;
      action = nextAction;
      if (Math.abs(to.x - from.x) > 1) direction = to.x > from.x ? 1 : -1;
    };
    const leave = () => {
      peekSide = position.x < bounds.width / 2 ? -1 : 1;
      begin("leave", { x: peekSide < 0 ? -bounds.size - 16 : bounds.width + 16, y: position.y }, 2500);
    };
    const next = () => {
      if (action === "leave") {
        begin("away", { ...position }, random(2000, 4000));
      } else if (action === "away") {
        begin("peek", { x: peekSide < 0 ? -bounds.size * 0.45 : bounds.width - bounds.size * 0.55, y: position.y }, 4500);
      } else if (action === "peek") {
        begin("enter", edge(), 2500);
      } else if (action === "land") {
        begin("walk", { x: position.x < bounds.width / 2 ? Math.max(8, bounds.width - bounds.size - 8) : 8, y: floor() }, random(6500, 9500));
      } else if (action === "walk") {
        begin("takeoff", destination(), 3000);
      } else if (action === "takeoff") {
        begin("hover", { ...position }, 2200);
      } else {
        const choice = Math.random();
        if (choice < 0.3) begin("fly", destination(), random(4500, 6500));
        else if (choice < 0.45) begin("hover", { ...position }, 3000);
        else if (choice < 0.6) begin("rest", edge(), 5000);
        else if (choice < 0.8) begin("land", { x: position.x, y: floor() }, 2200);
        else leave();
      }
    };
    const tick = (now: number) => {
      const delta = last ? Math.min(now - last, 64) : 0;
      last = now;
      // Follow the actual bar edge, including safe-area padding and layout changes.
      // Only the walking route and its landing endpoint use this boundary.
      if (action === "land") to.y = floor();
      if (action === "walk") {
        from.y = to.y = position.y = floor();
        paint();
      }
      if (!pausedRef.current && !media.matches) {
        if (previewRef.current) {
          const requested = previewRef.current;
          previewRef.current = null;
          if (requested === "peek") leave();
          else if (requested === "walk") begin("land", { x: Math.max(8, Math.min(position.x, bounds.width - bounds.size - 8)), y: floor() }, 1800);
          else begin("fly", destination(), 3500);
        }
        clock += delta;
        elapsed += delta;
        const progress = Math.min(elapsed / duration, 1);
        // A rest action reaches the edge first, then stays there for half its time.
        const travel = action === "rest" ? Math.min(progress * 2, 1)
          : action === "peek" ? Math.min(progress * 3, 1) : progress;
        const ease = travel * travel * (3 - 2 * travel);
        const arc = ["fly", "enter", "takeoff"].includes(action)
          ? Math.sin(progress * Math.PI) * Math.min(45, Math.max(0, Math.min(from.y, to.y) - 16)) : 0;
        position = { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease - arc };
        paint();
        if (progress >= 1) next();
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    resize();
    visibility();
    window.addEventListener("resize", resize);
    media.addEventListener("change", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <>
      <div className={styles.controls}>
        <button type="button" aria-pressed={paused} onClick={() => {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
        }}>
          {japanese ? (paused ? "妖精の移動を再開" : "妖精の移動を一時停止") : (paused ? "Resume fairy" : "Pause fairy")}
        </button>
        {(["fly", "walk", "peek"] as Preview[]).map((preview) => (
          <button key={preview} type="button" onClick={() => {
            previewRef.current = preview;
            pausedRef.current = false;
            setPaused(false);
          }}>
            {japanese ? ({ fly: "飛ぶ", walk: "歩く", peek: "のぞく" })[preview]
              : ({ fly: "Fly", walk: "Walk", peek: "Peek" })[preview]}
          </button>
        ))}
      </div>
      <div className={styles.layer}>
        <div ref={sprite} className={styles.sprite} role="button" tabIndex={0}
          aria-label={japanese ? "妖精と話す" : "Talk to the fairy"}
          onClick={() => setSpeechRequest(n => n + 1)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSpeechRequest(n => n + 1); } }}>
          {wardrobe?.closetPurchased?<div className={styles.avatarBody}><AvatarFigure avatar={wardrobe.equipped} adjustments={wardrobe.adjustments}/></div>:<div className={styles.avatarBody}><AvatarFigure avatar={DEFAULT}/></div>}
        </div>
      </div>
      <FairySpeech sprite={sprite} request={speechRequest} context={context} locale={japanese ? "ja" : "en"} />
    </>
  );
}
