# 05 妖精の部屋

> 2026-09-15追記：テスト管理者・日付オフセット・試作画面のアクセス条件は[14 テスト管理](14-test-and-development-system.md)が最新です。通常機能を維持し、専用testAdmins/testSessions/testWorkspacesを追加しました。以下の初回調査で述べる未接続の日付操作・開発環境限定の説明は実装前の状態です。


[目次](00-index.md) / [冒険](06-adventure-system.md) / [会話](10-dialogue-system.md)

## 入手から部屋解放まで

状態：孵化・命名・部屋・体力・記録は実装済み。妖精王の部屋でのお言葉・相談も実装済み（[会話データと確認手順](fairy-king-room.md)）。

1. `OpeningTutorial.finish` が `receiveFairyEgg` を呼び、`fairy` がない場合だけ `status:"egg"`、受領日、`appearance:"basic"` を保存。
2. 本体がアカウントのログイン日を `recordFairyLogin` で記録。同じ日本日付なら重複カウントしません。前回日が昨日なら連続日数+1、途切れたら1。
3. `egg` で `continuousLoginDays>=7` なら `naming` に移行、`bornAt` に日付文字列を保存。履歴ID `fairy-login-7` 未受領なら+100pt。
4. `FairyRoom` が孵化・命名画面を表示。`nameFairy` は空白を除いた1〜20文字を検証し、`ready` にします。
5. 本体のメニューから `FairyChamber` へ。改名も `nameFairy` を使用。

関数は「卵を受け取ってから7日間」を別カウントしていません。プロフィールの連続ログイン日数を利用します。未ログインでも卵のローカル保存はできますが、本体のログイン記録・孵化・部屋同期は非匿名の認証UIDが必要です。

## 部屋の数値と時間経過

| 条件・項目 | 結果 | 定義・関数 |
| --- | --- | --- |
| 部屋初期化 | 体力100、AP0、最高Lv1、冒険なし | `createRoom` |
| 経過時間 | 1日=86400000msにつき体力5減少、下限0 | `advanceRoom`、`ROOM_RULES.decayPerDay` |
| 当日の習慣を新規達成 | +8、上限100。同習慣IDは当日1回 | `updateHabitFields` → `recoverFromHabit` |
| 体力0 | sleeping=true、冬眠記録 | `advanceRoom` |
| 冬眠中に習慣達成で回復 | sleeping=false、目覚め記録 | `recoverFromHabit` |
| 出発 | 体力80以上必要、20消費 | `departAdventure` |
| ハート | 5個、1個=20。小数分も表示 | `heartFill` |
| 体力40未満 | 表示「ひとやすみ」 | `FairyChamber.status` |
| レベル | 総合ポイント100ごとに+1、最低Lv1 | `FairyChamber.level` |
| 最高レベルを更新 | 成長記録を追加 | `advanceRoom(level)` |
| 記録上限 | 最新100件、表示は新しい順 | `record`、`ROOM_RULES.recordLimit` |

経過時間分をアクセス時に計算する仕組みです。常時サーバーで毎日体力を減らす定期処理ではありません。`updatedAt` はミリ秒、健康値は小数を保持します。時刻が過去に戻ってもマイナスの経過時間を回復として扱いません。

`FairyChamber` は初回・60秒ごと・タブ可視性変更時に同期。体力の予測表示には `advanceRoom` を使いますが、APと帰還記録は保存に成功した `source` を表示します。通信失敗はエラーと再接続操作を出します。

## 保存と編集場所

| 項目 | 場所 |
| --- | --- |
| 定義ファイル | `lib/fairyRoomModel.ts` の `ROOM_RULES/FairyRoomState`、`types/appTypes.ts` の `fairy` |
| 処理ファイル | `fairyProgressModel.ts`、`fairyProgressActions.ts`、`fairyRoomActions.ts` |
| 主要関数 | `advanceFairyLogin/receiveFairyEgg/recordFairyLogin/nameFairy/syncFairyRoom`、上表のモデル関数 |
| 保存場所 | `users/{uid}.fairy` と `.fairyRoom` |
| 画面 | `FairyRoom.tsx` は孵化。`FairyChamber.tsx` は常設部屋。名前が似ているが役割が違う |
| 手動編集場所 | 体力等は `ROOM_RULES`、会話は `ROOM_LINES`、メニューは `MENU`、レイアウトは `FairyChamber.module.css` |
| 一緒に確認 | 本体の解放表示、`openingDialogue.ts`、固定の100pt孵化表示、`scripts/test-fairy-progress.cjs`、部屋関連テスト |

記録は誕生、部屋開設、出発、帰還、冬眠、目覚め、最高レベル更新。習慣1回ごとの達成は部屋の記録には追加しません。同じIDの記録は重複追加せず、上限を超える古い記録は削られます。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:16>) | export async function receiveFairyEgg | 16 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:22>) | export async function recordFairyLogin | 22 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:27>) | export async function nameFairy | 27 |
| [lib/fairyProgressModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressModel.ts:3>) | export function advanceFairyLogin | 3 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:1>) | export const ROOM_RULES | 1 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:24>) | export function createRoom | 24 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:51>) | export function recoverFromHabit | 51 |
| [lib/fairyRoomActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomActions.ts:6>) | export async function syncFairyRoom | 6 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:71>) | const timer = window.setInterval | 71 |
| [app/components/FairyRoom.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyRoom.tsx:8>) | export default function FairyRoom | 8 |
