"use client";
import { useCallback, useRef, useState } from "react";
import FairyChamber from "./FairyChamber";
import { advanceRoom, createRoom, departAdventure, recoverFromHabit } from "@/lib/fairyRoomModel";
import {tradeRoom,type TradeAction} from '@/lib/shopModel';

export default function FairyChamberPreview({ embedded = false, isDarkMode = false }: { embedded?: boolean; isDarkMode?: boolean }) {
  const [initial] = useState(()=>createRoom(Date.now(), "2026-09-12"));
  const current = useRef(initial);
  const [room, setRoom] = useState(initial);
  const [name, setName] = useState("ミルフィ");
  const [mobile, setMobile] = useState(false);
  const sync = useCallback(async (level: number, areaId?: string) => {
    let next = advanceRoom(current.current, Date.now(), level);
    if (areaId) next = departAdventure(next, Date.now(), areaId, 0.5);
    current.current = next; setRoom(next); return next;
  }, []);
  const trade=useCallback(async(action:TradeAction)=>{const next=tradeRoom(current.current,action,Date.now());current.current=next;setRoom(next);return next;},[]);
  return <section aria-label="妖精の部屋のお試し" style={{ minHeight: embedded ? undefined : "100vh", background: embedded ? "transparent" : "#e9e8dd", padding: embedded ? 0 : "24px 12px" }}>
    <div style={{ maxWidth: 1050, margin: "0 auto 16px", color: isDarkMode ? "#f3f4f6" : "#23382b", display: "flex", flexWrap: "wrap", gap: 12 }}>
      <p style={{ width: "100%" }}>お試しの妖精の部屋 · ログインや妖精の解放前でも利用できます。ここでの操作はアカウントに保存されず、実際のポイントや妖精には影響しません。</p>
      {!embedded && <button onClick={() => setMobile(value => !value)}>表示幅を切り替え</button>}
      <button onClick={() => { const next = { ...createRoom(Date.now(), "2026-09-12"), health: 73 }; current.current = next; setRoom(next); }}>体力73</button>
      <button onClick={() => { const next = { ...createRoom(Date.now(), "2026-09-12"), health: 0, sleeping: true }; current.current = next; setRoom(next); }}>冬眠</button>
      <button onClick={() => { const next = recoverFromHabit(current.current, Date.now(), "2026-09-12", String(Date.now())); current.current = next; setRoom(next); }}>習慣で回復</button>
      <button onClick={() => { const next = createRoom(Date.now(), "2026-09-12"); current.current = next; setRoom(next); }}>満タンに戻す</button>
      <button onClick={() => { if (!current.current.adventure) return; const next = advanceRoom({ ...current.current, adventure: { ...current.current.adventure, returnsAt: Date.now() - 1 } }, Date.now()); current.current = next; setRoom(next); }}>冒険をすぐ帰還させる</button>
    </div>
    <div style={{ maxWidth: mobile ? 390 : 1050, margin: "auto" }}>
      <FairyChamber uid="preview" fairy={{ status: "ready", name, appearance: "basic", eggReceivedAt: "2026-09-06", bornAt: "2026-09-12" }} room={room} totalPoints={1250} loginDays={128} onSync={sync} onTrade={trade} onName={async value => setName(value)} />
    </div>
  </section>;
}

