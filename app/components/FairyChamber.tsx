"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/types/appTypes";
import { ADVENTURE_AREAS, ROOM_RULES, advanceRoom, heartFill, type FairyRoomState } from "@/lib/fairyRoomModel";
import { syncFairyRoom,tradeFairyRoom } from "@/lib/fairyRoomActions";
import type {TradeAction} from '@/lib/shopModel';
import {MATERIALS} from '@/lib/shopCatalog';
import {useWardrobe} from '@/hooks/useWardrobe';
import { nameFairy } from "@/lib/fairyProgressActions";
import styles from "./FairyChamber.module.css";
import { WardrobeStudio, AvatarFigure } from '@/app/(root)/avatar/wardrobe-studio';
import { DEFAULT } from '@/app/(root)/avatar/wardrobe';
import FairyKingRoom from "./FairyKingRoom";
import { fairyKingGreetings, pickFairyKingEntry } from "@/lib/fairyKingDialogue";

const ROOM_LINES = [
  "ここ、私のお部屋なんだよ！ 葉っぱのハンモック、お気に入りなんだ。",
  "今日は何をして遊ぼうかな？ あなたのお話も聞かせてね。",
  "小さな一歩を重ねるたびに、私もちょっとずつ成長しているよ。",
  "次はどこへ冒険に行こう？ 森の奥から、いい風が吹いてくるね。",
  "新しい服、着てみたいな。どんな色が似合うと思う？",
  "いつでも、あなたのペースで。また会えてうれしいな。",
];
const MENU = [
  { id: "ranking", icon: "♛", title: "妖精ランキング", detail: "総合ポイント・ログイン日数・冒険ポイント" },
  { id: "records", icon: "▤", title: "妖精と冒険の記録", detail: "ふたりの足あと" },
  { id: "shop", icon: "♜", title: "アイテムショップ", detail: "森の3つのお店を訪ねよう" },
  { id: "council", icon: "✧", title: "精霊王の部屋", detail: "今日のお言葉と、やさしい相談のひととき" },
  { id: "closet", icon: "♧", title: "クローゼット", detail: "アバタールームで着替える" },
  { id: "adventure", icon: "⌁", title: "冒険に出かける", detail: "森の奥へ、小さな旅を" },
] as const;
type Panel = Exclude<typeof MENU[number]["id"], "closet" | "shop" | "council"> | "name";
const RANKINGS = [{ id: "growth", label: "総合獲得ポイント" }, { id: "login", label: "累計ログイン日数" }, { id: "adventure", label: "冒険ポイント" }] as const;
const roomHour = () => Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo", hour: "numeric", hourCycle: "h23",
}).format(new Date()));
type Props = {
  uid: string;
  fairy: NonNullable<UserProfile["fairy"]>;
  room?: FairyRoomState;
  totalPoints: number;
  attainedLevel?: number;
  loginDays: number;
  onSync?: (level: number, areaId?: string) => Promise<FairyRoomState>;
  onName?: (name: string) => Promise<void>;
  onTrade?: (action:TradeAction)=>Promise<FairyRoomState>;
  previewTime?: string | null;
};

export default function FairyChamber({ uid, fairy, room, totalPoints, attainedLevel = 1, loginDays, onSync, onName, onTrade, previewTime }: Props) {
  const [atelier, setAtelier] = useState<'closet' | 'shops' | null>(null);
  const [kingRoom, setKingRoom] = useState(false);
  const [kingGreeting, setKingGreeting] = useState("");
  const kingHistory = useRef<Record<string, string>>({});
  const kingEntrance = useRef<HTMLButtonElement>(null);
  const wardrobe=useWardrobe(uid);
  const [saved, setSaved] = useState(room);
  const [now, setNow] = useState<number | null>(null);
  const [nightBackground, setNightBackground] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [ranking, setRanking] = useState<typeof RANKINGS[number]["id"]>("growth");
  const [line, setLine] = useState("おかえりなさい。今日はお部屋で、ゆっくりしていってね。");
  const [newName, setNewName] = useState(fairy.name ?? "");
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const lastLine = useRef(-1);
  const level = Math.max(attainedLevel, room?.highestLevel ?? 1, Math.floor(Math.max(0, totalPoints) / 100) + 1);
  const latestRoom = room && (!saved || room.updatedAt >= saved.updatedAt) ? room : saved;
  const source = latestRoom ? { ...latestRoom, gold: room?.gold ?? latestRoom.gold } : undefined;
  const closetUnlocked = !!wardrobe?.closetPurchased || !!source?.purchases?.includes("closet");
  const trade=useCallback(async(action:TradeAction)=>{const next=onTrade?await onTrade(action):await tradeFairyRoom(uid,action);setSaved(next);setNow(Date.now());return next;},[uid,onTrade]);
  // Project health as time passes; rewards/records are only displayed after a committed sync.
  const health = source ? advanceRoom(source, now ?? source.updatedAt).health : 100;
  const sleeping = health <= 0;
  const trip = source?.adventure;
  const remaining = trip ? Math.max(0, trip.returnsAt - (now ?? source!.updatedAt)) : 0;
  const readyToLeave = !!source && health >= ROOM_RULES.adventureMinHealth && !trip;
  const sync = useCallback(async (areaId?: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError("");
    try {
      const result = onSync ? await onSync(level, areaId) : await syncFairyRoom(uid, level, areaId);
      setSaved(result); setNow(Date.now());
    } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。接続を確認して、もう一度お試しください。"); }
    finally { inFlight.current = false; setBusy(false); }
  }, [uid, level, onSync]);
  useEffect(() => {
    void sync();
    const refresh = () => { setNow(Date.now()); if (!document.hidden) void sync(); };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [sync]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshBackground = () => {
      const hour = roomHour();
      setNightBackground(hour >= 19 || hour < 5);
    };
    const schedule = () => {
      refreshBackground();
      timer = setTimeout(schedule, 60000 - Date.now() % 60000 + 50);
    };
    schedule();
    document.addEventListener("visibilitychange", refreshBackground);
    window.addEventListener("pageshow", refreshBackground);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshBackground);
      window.removeEventListener("pageshow", refreshBackground);
    };
  }, []);
  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    if (!panel && dialog.current?.open) dialog.current.close();
  }, [panel]);
  const title = panel === "name" ? "妖精の名前" : MENU.find(item => item.id === panel)?.title;
  const status = trip ? "冒険中" : sleeping ? "冬眠中" : health < 40 ? "ひとやすみ" : "元気に過ごしています";
  const previewHour = previewTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(previewTime) ? Number(previewTime.slice(0, 2)) : null;
  const showingNightBackground = previewHour === null ? nightBackground : previewHour >= 19 || previewHour < 5;
  const talk = () => {
    const next = (lastLine.current + 1 + Math.floor(Math.random() * (ROOM_LINES.length - 1))) % ROOM_LINES.length;
    lastLine.current = next;
    setLine(ROOM_LINES[next]);
  };
  const errorBox = error && <div className={styles.error} role="alert">{error}<button type="button" disabled={busy} onClick={() => void sync()}>再接続する</button></div>;
  const drawKingEntry = <T extends { id: string },>(pool: string, entries: readonly T[]): T => {
    const entry = pickFairyKingEntry(entries, kingHistory.current[pool]);
    kingHistory.current[pool] = entry.id;
    return entry;
  };
  if (atelier) return <WardrobeStudio key={uid} uid={uid} initialMode={atelier} room={source} onTrade={trade} onClose={() => setAtelier(null)} />;
  if (kingRoom) return <FairyKingRoom draw={drawKingEntry} initialGreeting={kingGreeting} onLeave={() => {
    setKingRoom(false);
    requestAnimationFrame(() => kingEntrance.current?.focus({ preventScroll: true }));
  }} />;
  return <section className={styles.root} aria-label="妖精の部屋">
    <header className={styles.header}><div><span className={styles.eyebrow}>HABIT WORLD · FAIRY HOME</span><h2>妖精の部屋</h2><p>小さな一歩が、この世界を育てていく。</p></div></header>
    {!panel && errorBox}
    <div className={styles.scene} data-time={showingNightBackground ? "night" : "day"}>
      <div className={styles.fairyArea}>
        <div className={styles.statusCard}>
          <div className={styles.nameRow}><h3>{fairy.name || "あなたの妖精"}</h3><button type="button" onClick={() => { setNewName(fairy.name ?? ""); setPanel("name"); }} aria-label="妖精の名前を変更">✎</button></div>
          <div className={styles.stats}><strong>Lv.{level}</strong><span>EXP <b>{Math.max(0, totalPoints).toLocaleString()}</b></span></div>
          <div className={styles.expTrack} aria-hidden="true"><i style={{ width: `${Math.max(0, totalPoints) % 100}%` }} /></div>
          <div className={styles.healthRow}>
            <div className={styles.hearts} role="img" aria-label={`体力 ${health.toFixed(1)} / 100、ハート${(health / 20).toFixed(1)}個分`}>
              {Array.from({ length: 5 }, (_, index) => <span className={styles.heart} key={index} aria-hidden="true">♥<span style={{ clipPath: `inset(${(1 - heartFill(health, index)) * 100}% 0 0 0)` }}>♥</span></span>)}
            </div><small>{health.toFixed(1)} / 100</small>
          </div><p className={styles.condition}><i data-sleeping={sleeping} />{source ? status : "お部屋を準備しています…"}</p>
        </div>
        <div className={styles.speech} role="status" aria-live="polite">{trip ? "いま、森の奥を探検しているよ。帰ったらお話を聞いてね！" : sleeping ? "すぅ、すぅ……。また一緒に、小さな一歩から。" : line}</div>
        <div className={styles.characterStage} data-motion={trip ? "away" : sleeping ? "sleeping" : "idle"}>
          {trip ? <div className={styles.away}><span aria-hidden="true">✧</span><p>森の奥へおでかけ中</p><small>{remaining > 0 ? `帰還まで 約${Math.ceil(remaining / 3600000)}時間` : "帰還しています。記録を確認中…"}</small></div> : <button type="button" className={styles.fairyButton} onClick={talk} aria-label={`${fairy.name || "妖精"}に話しかける`}><div style={{ width: "100%", maxWidth: 330, margin: "auto" }}><AvatarFigure avatar={closetUnlocked ? wardrobe?.equipped ?? DEFAULT : DEFAULT} adjustments={closetUnlocked ? wardrobe?.adjustments : undefined}/></div>{sleeping && <span className={styles.zzz}>Z z z</span>}</button>}
        </div>
        <p className={styles.touchHint}>{trip ? "帰還後、冒険の記録が届きます" : sleeping ? "習慣をひとつ再開すると、目を覚まします" : "妖精をタップして、おしゃべり"}</p>
      </div>
      <nav className={styles.menu} aria-label="妖精の部屋メニュー"><p className={styles.menuHeading}>このお部屋でできること</p>
        {MENU.map(item => {
          const disabled = item.id === "closet" && !closetUnlocked;
          return <button type="button" key={item.id} ref={item.id === "council" ? kingEntrance : undefined} className={`${styles.plank} ${item.id === "adventure" ? styles.adventurePlank : ""}`} disabled={disabled} onClick={() => {
            if (item.id === "closet") { setAtelier('closet'); return; }
            if (item.id === "shop") { setAtelier('shops'); return; }
            if (item.id === "council") {
              const greeting = drawKingEntry("greeting", fairyKingGreetings);
              setKingGreeting(greeting.text); setKingRoom(true); return;
            }
            if (item.id === "ranking") setRanking("growth");
            setPanel(item.id);
          }}><span className={styles.menuIcon} aria-hidden="true">{item.icon}</span><span><strong>{item.title}</strong><small>{item.id === "closet" && !closetUnlocked ? "ショップでクローゼットを購入して解放" : item.detail}</small></span><span className={styles.arrow} aria-hidden="true">{disabled ? "—" : "›"}</span></button>;
        })}
        <p className={styles.menuFoot}>習慣を続ける。妖精が育つ。世界が広がる。</p>
      </nav>
    </div>
    <footer className={styles.footer}><span>✧ 冒険ポイント <b>{(source?.adventurePoints ?? 0).toLocaleString()} AP</b></span><span>ゴールド <b>{(source?.gold??0).toLocaleString()}</b></span><span>この世界に来た日数 <b>{loginDays.toLocaleString()}日</b></span></footer>
    <dialog ref={dialog} aria-labelledby="fairy-chamber-dialog-title" className={styles.dialog} onCancel={() => setPanel(null)} onClose={() => setPanel(null)} onClick={event => { if (event.target === event.currentTarget) setPanel(null); }}>
      <div className={styles.dialogContent}><div className={styles.dialogHeader}><h3 id="fairy-chamber-dialog-title">{title}</h3><button type="button" aria-label="閉じる" onClick={() => setPanel(null)}>×</button></div>
        {errorBox}
        {panel === "ranking" && <>
          <div className={styles.rankingChoices} role="group" aria-label="ランキングの種類">
            {RANKINGS.map(item => <button type="button" key={item.id} aria-pressed={ranking === item.id} onClick={() => setRanking(item.id)}>{item.label}</button>)}
          </div>
          <span className={styles.badge}>ランキングは準備中</span>
          <div aria-live="polite" aria-atomic="true">
            <h4 className={styles.rankingTitle}>{RANKINGS.find(item => item.id === ranking)?.label}ランキング</h4>
            {ranking === "growth" && <><p>これまでに獲得した総合ポイント（EXP）で、上位5人の妖精を紹介する予定です。</p><div className={styles.metric}><span>{fairy.name || "あなたの妖精"}</span><strong>{totalPoints.toLocaleString()} EXP</strong><small>Lv.{level} · あなたの現在の実績</small></div></>}
            {ranking === "login" && <><p>この世界に来た累計日数で、上位5人の妖精を紹介する予定です。連続ログイン日数ではありません。</p><div className={styles.metric}><span>{fairy.name || "あなたの妖精"}</span><strong>{loginDays.toLocaleString()}日</strong><small>お休みした日があっても、これまでの日数は残ります。</small></div></>}
            {ranking === "adventure" && <><p>冒険で獲得した専用ポイント（AP）で、上位5人の妖精を紹介する予定です。総合ポイント（EXP）とは別に集計します。</p><div className={styles.metric}><span>{fairy.name || "あなたの妖精"}</span><strong>{(source?.adventurePoints ?? 0).toLocaleString()} AP</strong><small>あなたが冒険で獲得したポイント</small></div></>}
          </div>
          <p className={styles.hint}>現在はあなたの実績を表示しています。みんなの順位は公開ランキング開始後に表示します。</p>
        </>}
        {panel === "records" && <><p>ふたりの歩みを、新しいものから{ROOM_RULES.recordLimit}件まで残します。</p><ol className={styles.records}>{[...(source?.records ?? [])].reverse().map(item => <li key={item.id}><time dateTime={item.at}>{new Date(item.at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" })}</time><p>{item.text}</p></li>)}</ol>{!source?.records.length && <p>お部屋の記録を準備しています。</p>}</>}
        {panel === "adventure" && <>
          <p>小さな旅が、新しい世界への入口になる。</p>
          <p>帰還時にはAPと素材を受け取れます。素材はアイテムショップでゴールドに換えられます。</p><ul>{MATERIALS.map(m=><li key={m.id}>{m.name}：所持 {source?.materials?.[m.id]??0}個</li>)}</ul>
          {ADVENTURE_AREAS.map(area => <div className={styles.areaCard} key={area.id}><span className={styles.eyebrow}>FIRST JOURNEY</span><h4>🌿 {area.name}</h4><p>木漏れ日の向こうに、まだ知らない景色が待っています。</p><dl><div><dt>冒険の時間</dt><dd>約24時間</dd></div><div><dt>出発に必要な体力</dt><dd>ハート4個以上</dd></div><div><dt>出発時の消費</dt><dd>ハート1個</dd></div><div><dt>帰還のおみやげ</dt><dd>{area.minReward}〜{area.maxReward} AP</dd></div></dl>
            {trip ? <div role="status"><p>森の奥を冒険しています。</p><p>帰還予定：{new Date(trip.returnsAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（日本時間）</p>{remaining === 0 && <button type="button" className={styles.primary} disabled={busy} onClick={() => void sync()}>帰還を確認する</button>}</div> : <><button type="button" className={styles.primary} disabled={busy || !readyToLeave || !!error} onClick={() => void sync(area.id)}>{busy ? "準備しています…" : "森の奥へ送り出す"}</button>{!readyToLeave && source && <p className={styles.hint}>今はひとやすみ。習慣を続けて、ハート4個以上に回復すると出発できます。</p>}</>}
          </div>)}
          <p className={styles.hint}>体力は1日でハート約0.25個減り、今日の習慣1件につき約0.4個回復します。同じ習慣での回復は1日1回です。</p><p className={styles.hint}>湖・洞窟・地図・冒険アイテムは、今後のアップデートで。長い旅は、ここから始まります。</p>
        </>}
        {panel === "name" && <form onSubmit={async event => {
          event.preventDefault(); if (inFlight.current) return; inFlight.current = true; setBusy(true); setError("");
          try { if (onName) await onName(newName.trim()); else await nameFairy(uid, newName); setPanel(null); }
          catch (e) { setError(e instanceof Error ? e.message : "名前を保存できませんでした。"); }
          finally { inFlight.current = false; setBusy(false); }
        }}><label htmlFor="chamber-fairy-name">妖精の名前（1〜20文字）</label><input id="chamber-fairy-name" required maxLength={40} value={newName} onChange={event => setNewName(event.target.value)} /><button type="submit" className={styles.primary} disabled={busy || !newName.trim() || Array.from(newName.trim()).length > 20}>{busy ? "保存中…" : "名前を保存する"}</button></form>}
      </div>
    </dialog>
  </section>;
}



