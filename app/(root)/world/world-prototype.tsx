"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./world.module.css";

const chapters = [
  { label: "THE BEGINNING", title: "すべては、この大樹から。", text: "まだ名前のない、あなたの世界。\n大樹は、新しい夢の訪れを待っていました。", next: "大樹にふれる" },
  { label: "A LITTLE POSSIBILITY", title: "ひとつの、可能性。", text: "あなたに応えるように、光が枝先へ。\n小さなつぼみが、静かに息づきはじめます。", next: "光をそっと届ける" },
  { label: "YOUR FIRST HOME", title: "つぼみが、あなたの家になる。", text: "花びらは壁に、光は窓に。\n大樹に生まれたこのつぼみが、あなたの最初の居場所です。", next: "つぼみの家に入る" },
  { label: "AN EMPTY ROOM", title: "まだ、なにもない部屋。", text: "家具も、思い出も、まだありません。\nここは、これから一緒に満たしていく場所。", next: "部屋の光を見つめる" },
  { label: "A NEW LIFE", title: "夢を待つ光が、集まって。", text: "小さな光が、ひとつ、またひとつ。\nあなたと出会うための命が、ここに生まれようとしています。", next: "光に呼びかける" },
  { label: "YOUR COMPANION", title: "「あなたに、会いたかった。」", text: "わたしはリリ。あなたと一緒に夢を叶えるために生まれた妖精。\n急がなくていいよ。これから、一緒に歩いていこう。", next: "リリに夢を話す" },
];
const missionNames = ["30分勉強する", "本を10ページ読む", "体を動かす"];
type Panel = "missions" | "dream" | "fairy" | "menu" | null;

export default function WorldPrototype() {
  const [step, setStep] = useState(0);
  const [dream, setDream] = useState("");
  const [goal, setGoal] = useState("");
  const [completed, setCompleted] = useState<number[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [inside, setInside] = useState(false);
  const [reaction, setReaction] = useState("");
  const [restart, setRestart] = useState(false);
  const main = step === 9;
  const interior = main ? inside : step >= 3;
  const xp = 120 + completed.length * 30;
  const level = Math.floor(xp / 100) + 1;
  const points = completed.length * 10;
  const fairy = step >= 5;
  const next = () => setStep(s => Math.min(9, s + 1));
  const togglePanel = (value: Panel) => setPanel(p => p === value ? null : value);
  const complete = (id: number) => {
    setCompleted(current => current.includes(id) ? current : [...current, id]);
    setReaction("あなたの一歩、ちゃんと届いたよ。ありがとう！");
  };
  const reset = () => { setStep(0); setDream(""); setGoal(""); setCompleted([]); setPanel(null); setInside(false); setReaction(""); setRestart(false); };

  const missions = <>
    <span className={styles.eyebrow}>SMALL STEPS, NEW WORLDS</span>
    <h2>今日のミッション</h2>
    <p className={styles.muted}>小さな一歩でいい。リリと、今日をはじめよう。</p>
    <div className={styles.missionList}>{missionNames.map((name, i) => <button key={name} className={`${styles.mission} ${completed.includes(i) ? styles.done : ""}`} disabled={completed.includes(i)} onClick={() => complete(i)}>
      <span className={styles.checkbox}>{completed.includes(i) ? "✓" : ""}</span>
      <span><strong>{name}</strong><small>{completed.includes(i) ? "達成しました" : "習慣 · 今日の一歩"}</small></span>
      <span className={styles.reward}>{completed.includes(i) ? "✓" : "+30 XP"}</span>
    </button>)}</div>
    <p className={styles.missionFoot}>{completed.length} / 3 達成 <span>1ミッションにつき +10 pt ・ +30 XP</span></p>
  </>;

  return <main className={styles.world} data-scene={step}>
    <div key={interior ? "inside" : "outside"} className={`${styles.landscape} ${interior ? styles.indoor : ""}`} aria-hidden="true" />
    <div className={styles.vignette} />
    <div className={styles.particles} aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ "--x": `${(i * 37 + 9) % 100}%`, "--y": `${(i * 23 + 12) % 100}%`, "--delay": `${i * -.7}s` } as CSSProperties} />)}</div>

    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.emblem}>✧</span><span>HABIT WORLD<small>ハビットワールド</small></span></div>
      {main ? <div className={styles.wallet}><span>✦ <b>{points}</b> <small>pt</small></span><button onClick={() => togglePanel("menu")} aria-label="メニューを開く">☰</button></div> : <span className={styles.prologue}>PROLOGUE <i /> はじまりの物語</span>}
    </header>

    {!interior && step >= 1 && <div key={step === 1 ? "bud" : "house"} className={`${styles.homeSpot} ${step === 1 ? styles.budSpot : ""}`}>
      {step === 1 ? <Image unoptimized width={1024} height={1536} className={styles.bud} src="/world/bud.png" alt="大樹に生まれた小さなつぼみ" /> : <button className={styles.homeButton} onClick={() => main ? setInside(true) : setStep(3)} aria-label="つぼみの家に入る"><Image unoptimized width={1199} height={1312} className={styles.home} src="/world/house.png" alt="花びらが壁になったつぼみの家" />{main && <span>つぼみの家 <b>↗</b></span>}</button>}
    </div>}
    {step === 4 && <div className={styles.birth} aria-label="光が集まっている"><span>✧</span></div>}
    {fairy && <button className={`${styles.fairy} ${main ? styles.fairyMain : ""} ${completed.length ? styles.happy : ""}`} onClick={() => { if (main) togglePanel("fairy"); else setReaction("大丈夫。あなたのペースで、一緒に進もう。"); }} aria-label="妖精リリに話しかける">
      <Image unoptimized width={1024} height={1536} src="/world/fairy.png" alt="水色の髪と虹色の翼を持つ妖精リリ" />
      {main && <span className={styles.fairyLabel}>リリ <i /> {inside ? "おうちでひと休み" : "あなたと一緒"}</span>}
    </button>}
    {completed.length > 0 && !interior && <div className={styles.worldGift} aria-label="最初の一歩で生まれた道しるべの光">✧<span>はじまりの灯</span></div>}
    {fairy && step < 8 && reaction && <p className={styles.speech} role="status">{reaction}</p>}

    {step < 6 && <section key={step} className={styles.story}>
      <div className={styles.storyCopy}><span className={styles.eyebrow}>{chapters[step].label}</span><h1>{chapters[step].title}</h1><p>{chapters[step].text}</p></div>
      <button className={styles.primary} onClick={next}>{chapters[step].next}<span>→</span></button>
      <div className={styles.chapterDots} aria-label={`物語 ${step + 1} / 6`}>{chapters.map((_, i) => <span className={i === step ? styles.activeDot : ""} key={i} />)}</div>
    </section>}

    {(step === 6 || step === 7) && <section className={styles.formCard} key={step}>
      <span className={styles.eyebrow}>{step === 6 ? "YOUR DREAM, OUR JOURNEY" : "ONE STEP CLOSER"}</span>
      <h1>{step === 6 ? "あなたの夢を、教えて。" : "最初の目標を、ひとつ。"}</h1>
      <p>{step === 6 ? "大きな夢も、まだ小さな願いも。ここから、わたしたちの物語が始まるよ。" : "夢へ続く道を、小さく分けてみよう。あとから変えても大丈夫。"}</p>
      {step === 7 && <div className={styles.dreamQuote}>✧ {dream}</div>}
      <form onSubmit={e => { e.preventDefault(); if ((step === 6 ? dream : goal).trim()) { if (step === 6) setDream(dream.trim()); else setGoal(goal.trim()); next(); } }}>
        <label htmlFor="wish">{step === 6 ? "叶えたい夢" : "夢に近づく目標"}</label>
        <input id="wish" autoFocus maxLength={100} value={step === 6 ? dream : goal} onChange={e => step === 6 ? setDream(e.target.value) : setGoal(e.target.value)} placeholder={step === 6 ? "例：自分の物語を、一冊の本にする" : "例：毎日30分、学ぶ時間をつくる"} />
        <button type="button" className={styles.sample} onClick={() => step === 6 ? setDream("自分の物語を、一冊の本にする") : setGoal("毎日30分、学ぶ時間をつくる")}>例を使って体験する</button>
        <button className={styles.primary} disabled={!(step === 6 ? dream : goal).trim()}>{step === 6 ? "この夢をリリと叶える" : "今日の一歩を見つける"}<span>→</span></button>
      </form>
    </section>}

    {step === 8 && <section className={styles.formCard}>{missions}<div className={styles.liveReward} role="status">✦ {points} pt <span>Lv.{level} · {xp} XP</span></div>{completed.length > 0 && <p className={styles.congratulation}>「最初の一歩、おめでとう！」<br />大樹のそばに、道しるべの光が生まれました。</p>}<button className={styles.primary} disabled={!completed.length} onClick={() => { setStep(9); setInside(false); setReaction(""); }}>わたしたちの世界へ<span>→</span></button></section>}

    {main && <>
      <div className={styles.location}><span>はじまりの森</span><h1>{inside ? "つぼみの家" : "はじまりの大樹"}</h1><small>✧ {inside ? "これから思い出で満ちていく場所" : "あなたの夢が、根をおろす場所"}</small></div>
      <button className={styles.companion} onClick={() => togglePanel("fairy")}><span className={styles.avatar}><Image unoptimized width={1024} height={1536} src="/world/fairy.png" alt="" /></span><span><strong>リリ <small>Lv.{level}</small></strong><span className={styles.xpTrack}><i style={{ width: `${xp % 100}%` }} /></span><small>{xp % 100} / 100 XP ・ 次のレベルへ</small></span></button>
      <div className={styles.bottomLeft}><span className={styles.eyebrow}>OUR DREAM</span><button onClick={() => togglePanel("dream")}>{dream || "自分の夢を実現する"}<span>↗</span></button><small>今日も、あなたのペースで。</small></div>
      {inside && <button className={styles.exitHome} onClick={() => setInside(false)}>↗ 大樹のもとへ</button>}
      <nav className={styles.dock} aria-label="ゲームメニュー"><button className={panel === "missions" ? styles.selected : ""} onClick={() => togglePanel("missions")}><span>☷</span>ミッション <small>{completed.length}/3</small></button><button className={panel === "dream" ? styles.selected : ""} onClick={() => togglePanel("dream")}><span>✧</span>夢の道しるべ</button><button onClick={() => { setInside(!inside); setPanel(null); }}><span>⌂</span>{inside ? "大樹" : "おうち"}</button><button className={panel === "fairy" ? styles.selected : ""} onClick={() => togglePanel("fairy")}><span>❋</span>リリ</button></nav>
      {panel && <aside className={styles.panel} aria-label={panel === "missions" ? "今日のミッション" : "ワールドメニュー"}><button className={styles.close} onClick={() => setPanel(null)} aria-label="パネルを閉じる">×</button>
        {panel === "missions" && <>{missions}<p className={styles.congratulation} role="status">{reaction}</p></>}
        {panel === "dream" && <><span className={styles.eyebrow}>THE ROAD TO FAIRY ROYALTY</span><h2>夢の道しるべ</h2><div className={styles.journey}><span>01　あなたの夢</span><h3>{dream}</h3><span>02　最初の目標</span><h3>{goal}</h3><span>03　今日のミッション</span><p>{completed.length}/3 の一歩を達成</p><span>✧　いつか、妖精王へ</span><p>あなたの夢が叶う日、リリは妖精王になる。<br />まだ始まったばかりの、ふたりの物語。</p></div></>}
        {panel === "fairy" && <><span className={styles.eyebrow}>YOUR LITTLE COMPANION</span><h2>リリ <small>Lv.{level}</small></h2><p>あなたと一緒に夢を叶えるために生まれた妖精。</p><div className={styles.fairyStats}><span>気分 <b>{completed.length ? "うれしい" : "わくわく"}</b></span><span>状態 <b>{inside ? "ひと休み" : "森を眺めている"}</b></span><span>翼 <b>はじまりの虹</b></span><span>称号 <b>{completed.length ? "はじめの一歩" : "夢のともだち"}</b></span></div><blockquote>「できる日も、お休みする日も、<br />わたしはここにいるよ。」</blockquote><p className={styles.muted}>髪・服・翼の着せ替えは、これからの物語で。</p></>}
        {panel === "menu" && <><span className={styles.eyebrow}>HABIT WORLD</span><h2>旅のメニュー</h2><p>ゲーム画面の体験版です。入力や達成はこの画面内だけに反映され、再読み込みで最初に戻ります。</p><button className={styles.menuRow} onClick={() => setRestart(true)}>はじまりの物語をもう一度 <span>↻</span></button><Link className={styles.menuRow} href="/ja">既存の習慣アプリへ <span>↗</span></Link><p className={styles.muted}>ミッションはサンプルです。Firebaseのデータは変更しません。</p>{restart && <div className={styles.restart}><p>入力した夢・目標と体験中の達成をリセットしますか？</p><button onClick={reset}>最初から体験する</button><button onClick={() => setRestart(false)}>キャンセル</button></div>}</>}
      </aside>}
    </>}
    {!main && <footer className={styles.footer}><span>HABIT WORLD · FIRST LIGHT</span><span>✧ あなたの一歩が、世界の物語になる</span></footer>}
  </main>;
}
