"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { fairyKingDialogue, fairyKingGreetings, type FairyKingAdvice, type FairyKingResponse, type FairyKingWord } from "@/lib/fairyKingDialogue";
import styles from "./FairyKingRoom.module.css";

type Conversation =
  | { step: "welcome"; greeting: string }
  | { step: "topics" }
  | { step: "word"; word: FairyKingWord }
  | { step: "advice"; topic: FairyKingAdvice; response: FairyKingResponse };

export default function FairyKingRoom({ onLeave, draw, initialGreeting }: {
  onLeave: () => void;
  draw: <T extends { id: string }>(pool: string, entries: readonly T[]) => T;
  initialGreeting: string;
}) {
  const [conversation, setConversation] = useState<Conversation>({ step: "welcome", greeting: initialGreeting });
  const heading = useRef<HTMLHeadingElement>(null);
  const greet = () => {
    const entry = draw("greeting", fairyKingGreetings);
    setConversation({ step: "welcome", greeting: entry.text });
  };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [conversation]);

  const word = () => {
    const next = draw("word", fairyKingDialogue.fairyKingWords);
    setConversation({ step: "word", word: next });
  };
  const advise = (topic: FairyKingAdvice) => {
    const key = `advice:${topic.id}`;
    const next = draw(key, topic.responses);
    setConversation({ step: "advice", topic, response: next });
  };
  const topics = () => setConversation({ step: "topics" });
  const line = conversation.step === "welcome" ? conversation.greeting
    : conversation.step === "topics" ? fairyKingDialogue.consultationPrompt
    : conversation.step === "word" ? `「${conversation.word.word}」`
    : conversation.response.reply;
  const title = conversation.step === "word" ? "今日のお言葉"
    : conversation.step === "advice" ? conversation.topic.label : "精霊王とのひととき";

  return <section className={styles.root} aria-label="精霊王の部屋">
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>HABIT WORLD · SPIRIT KING</span><h2>精霊王の部屋</h2><p>夢への道も、今日の迷いも。ここでひと息。</p></div>
      <button type="button" className={styles.leave} onClick={onLeave}>妖精の部屋へ戻る</button>
    </header>
    <div className={styles.scene}>
      <div className={styles.conversation}>
        <div className={styles.dialogue}>
          <span className={styles.speaker}>✧ 精霊王</span>
          <h3 ref={heading} tabIndex={-1} className={styles.title}>{title}</h3>
          <div aria-live="polite" aria-atomic="true" className={styles.message}>
            <p className={conversation.step === "word" ? styles.word : styles.line}>{line}</p>
            {conversation.step === "word" && <p className={styles.explanation}>{conversation.word.explanation}</p>}
            {(conversation.step === "word" || conversation.step === "advice") && <div className={styles.action}>
              <span>今日の小さな一歩</span><p>{conversation.step === "word" ? conversation.word.action : conversation.response.action}</p>
            </div>}
          </div>
        </div>
        <div className={styles.choices} role="group" aria-label="精霊王への返事">
          <p className={styles.choiceHint}>あなたの言葉を選んでください</p>
          {conversation.step === "welcome" && <>
            <Choice onClick={word}>精霊王に今日のお言葉をいただく</Choice>
            <Choice onClick={topics}>精霊王に悩みを聞いてもらう</Choice>
          </>}
          {conversation.step === "topics" && <>
            {fairyKingDialogue.fairyKingAdvice.map(topic => <Choice key={topic.id} onClick={() => advise(topic)}>{topic.choice}</Choice>)}
            <Choice onClick={greet} quiet>精霊王の部屋に戻る</Choice>
          </>}
          {conversation.step === "word" && <>
            <Choice onClick={word}>別のお言葉をいただく</Choice>
            <Choice onClick={topics}>悩みを聞いてもらう</Choice>
            <Choice onClick={greet} quiet>精霊王の部屋に戻る</Choice>
          </>}
          {conversation.step === "advice" && <>
            <Choice onClick={() => advise(conversation.topic)}>この悩みをもう少し相談する</Choice>
            <Choice onClick={topics}>もう一度相談する</Choice>
            <Choice onClick={word}>今日のお言葉をいただく</Choice>
            <Choice onClick={greet} quiet>精霊王の部屋に戻る</Choice>
          </>}
        </div>
      </div>
      <figure className={styles.portrait}>
        <Image src="/opening/spirit.jpg" alt="光あふれる森で、優しく話を聞く精霊王" fill sizes="(max-width: 650px) 100vw, 45vw" priority />
        <figcaption><span>SPIRIT KING</span>おぬしの歩幅で、話してよいのじゃ。</figcaption>
      </figure>
    </div>
    <footer className={styles.footer}>✧ 答えを急がず、次の一歩を一緒に探そう。</footer>
  </section>;
}

function Choice({ children, onClick, quiet = false }: { children: React.ReactNode; onClick: () => void; quiet?: boolean }) {
  return <button type="button" className={`${styles.choice} ${quiet ? styles.quiet : ""}`} onClick={onClick}>
    <span aria-hidden="true" className={styles.choiceMark}>◇</span><span>{children}</span><span aria-hidden="true" className={styles.arrow}>›</span>
  </button>;
}
