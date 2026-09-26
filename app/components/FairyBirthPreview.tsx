"use client";
import { useState } from "react";
import FairyRoom from "./FairyRoom";
import AutonomousFairy from "./AutonomousFairy";
export default function FairyBirthPreview() {
  const [name, setName] = useState("");
  return <main style={{ minHeight: "100vh", padding: 24, background: "#163c34" }}>
    <p style={{ color: "white" }}>開発用プレビュー — アカウント・ポイントは変更しません</p>
    <FairyRoom uid="preview" key={name ? "room" : "birth"} fairy={{ status: name ? "ready" : "naming", eggReceivedAt: "2026-09-06", bornAt: "2026-09-12", appearance: "basic", name }} hatching={!name} onName={async value => { if (!value || Array.from(value).length > 20) throw new Error("1〜20文字で入力してください。"); setName(value); }} />
    {name && <><AutonomousFairy /><button onClick={() => setName("")} style={{ color: "white", padding: 16 }}>孵化をもう一度見る</button></>}
  </main>;
}
