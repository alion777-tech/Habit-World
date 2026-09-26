# 09 精霊王

[目次](00-index.md) / [会話の編集](10-dialogue-system.md)

精霊王はオープニングの案内役として実装済みです。部屋の「精霊王の相談所」は準備中で、会話選択・相談判定・報酬・AI応答は未実装です。

## オープニング

`data/openingDialogue.ts` の `openingDialogue` は12段階。welcome → purpose → login → name → gender → privacy → dream → goal → habit → effort → egg → ending の配列順で表示します。ランダム抽選ではありません。

`OpeningTutorial` は `signedInText` があればログイン済み用の文に置き換えます。`tab` で本体のプロフィール・夢・習慣へ移動し、`target` と `data-opening` 属性で入力欄を光らせます。文字は42msごとに表示され、全文表示・前後移動に対応。完了時に卵を保存して導入を閉じます。

初回判定はブラウザーキー `habit-world-opening-v1` がcompleteかどうか。再生ボタンは `habit-world-replay-opening` イベントを送ります。卵は `receiveFairyEgg` が既存fairyを保護するので、再生するたびに増殖する所持品ではありません。

背景・肖像は `/opening/spirit.jpg`、タイトル等は `/opening/title.jpg`、BGMは `/opening/bgm.mp3`。タイピング音はAudioContextで合成し、録音された台詞音声ではありません。

## 編集マップ

| 項目 | 場所 |
| --- | --- |
| 定義ファイル | `data/openingDialogue.ts` の `OpeningStep/openingDialogue` |
| 処理ファイル・主要関数 | `app/components/OpeningTutorial.tsx` の `OpeningTutorial/finish/toggleSound` |
| 保存 | 導入終了キー、旧卵キー、`profile.fairy` |
| 手動編集可能 | text / signedInText。順番変更は配列。画像・配置はpublic/openingとopening.css |
| 同時確認 | 本体onNavigate、ProfileView/DreamView/HabitView/AuthBoxのdata-opening、fairyProgressActions |
| 相談所 | `FairyChamber.tsx` のMENU内councilとdisabled分岐。文言だけで利用可能にはならない |

`/world` 試作にある「夢が叶うと妖精王になる」は物語テキストです。本体で夢達成時に妖精を王へ進化させる処理や見た目変更は確認できません。「精霊王」と「妖精王」を同一の進化仕様としてまとめていません。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [data/openingDialogue.ts](<C:/dev/GitHub/Habit-World/data/openingDialogue.ts:3>) | export const openingDialogue | 3 |
| [app/components/OpeningTutorial.tsx](<C:/dev/GitHub/Habit-World/app/components/OpeningTutorial.tsx:10>) | const completionKey | 10 |
| [app/components/OpeningTutorial.tsx](<C:/dev/GitHub/Habit-World/app/components/OpeningTutorial.tsx:117>) | async function finish | 117 |
| [app/components/OpeningTutorial.tsx](<C:/dev/GitHub/Habit-World/app/components/OpeningTutorial.tsx:96>) | }, 42) | 96 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:22>) | id: "council" | 22 |
| [app/(root)/world/world-prototype.tsx](<C:/dev/GitHub/Habit-World/app/(root)/world/world-prototype.tsx:104>) | いつか、妖精王へ | 104 |
