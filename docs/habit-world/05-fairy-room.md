# 05 妖精の部屋

> 2026-09-15追記：テスト管理者・日付オフセット・試作画面のアクセス条件は[14 テスト管理](14-test-and-development-system.md)が最新です。通常機能を維持し、専用testAdmins/testSessions/testWorkspacesを追加しました。以下の初回調査で述べる未接続の日付操作・開発環境限定の説明は実装前の状態です。


[目次](00-index.md) / [冒険](06-adventure-system.md) / [会話](10-dialogue-system.md)

## 入手から部屋解放まで

状態：孵化・命名・部屋・体力・記録は実装済み。精霊王の部屋でのお言葉・相談も実装済み（[会話データと確認手順](fairy-king-room.md)）。

1. `OpeningTutorial.finish` が `receiveFairyEgg` を呼び、`fairy` がない場合だけ `status:"egg"`、受領日、`appearance:"basic"` を保存。
2. 本体がアカウントのログイン日を `recordFairyLogin` で記録。同じ日本日付なら重複カウントしません。前回日が昨日なら連続日数+1、途切れたら1。
3. `egg` で `continuousLoginDays>=7` なら `naming` に移行、`bornAt` に日付文字列を保存。履歴ID `fairy-login-7` 未受領なら+100pt。
4. `FairyRoom` が孵化・命名画面を表示。`nameFairy` は空白を除いた1〜20文字を検証し、`ready` にします。
5. 本体のメニューから `FairyChamber` へ。改名も `nameFairy` を使用。

関数は「卵を受け取ってから7日間」を別カウントしていません。プロフィールの連続ログイン日数を利用します。未ログインでも卵のローカル保存はできますが、本体のログイン記録・孵化・部屋同期は非匿名の認証UIDが必要です。

## 部屋の数値と時間経過

| 条件・項目 | 結果 | 定義・関数 |
| --- | --- | --- |
| 部屋初期化 | 体力100、気力100、AP0、最高Lv1、冒険なし | `createRoom` |
| 気力の経過時間 | 7日で100減少、下限0 | `advanceRoom`、`ROOM_RULES.changePerDay` |
| 体力の経過時間 | 気力50超では回復、50以下では減少。7日で100の速度、0〜100 | `advanceRoom` |
| 当日の習慣を新規達成 | 気力+5、上限100。同習慣IDは当日1回。体力の直接回復なし | `updateHabitFields` → `recoverFromHabit` |
| 体力5以下 | 冬眠。気力0だけでは冬眠しない | `reconcileRoomSleep` |
| 冬眠解除 | 気力と体力が両方50超で解除。冬眠中も気力50超なら通常速度で体力回復 | `reconcileRoomSleep` |
| 出発 | 体力80以上必要、20消費 | `departAdventure` |
| ハート | 5個、1個=20。小数分も表示 | `heartFill` |
| 体力40未満 | 表示「ひとやすみ」 | `FairyChamber.status` |
| レベル | 総合ポイント100ごとに+1、最低Lv1 | `FairyChamber.level` |
| 最高レベルを更新 | 成長記録を追加 | `advanceRoom(level)` |
| 記録上限 | 最新100件、表示は新しい順 | `record`、`ROOM_RULES.recordLimit` |

経過時間分をアクセス時に計算する仕組みです。常時サーバーで毎日体力を減らす定期処理ではありません。`updatedAt` はミリ秒、体力・気力は小数を保持します。時刻が過去に戻っても負の経過時間を適用しません。気力が50に達するまでの回復区間と、その後の減少区間を分けて計算します。冬眠中も気力・体力の減少は続き、習慣達成で気力を回復できます。

2026-10-08：`health` は改名せず、気力を `energy` として追加しました。旧データで `energy` がない場合は、初回計算時に100で開始し、体力は既存値を保持します。過去の気力を仮定して体力・気力を遡って変化させず、その時点から時間計算を開始します。保存済みの気力0や回復済み習慣IDは保持します。旧冬眠データは気力100を補完しても、体力が50以下なら冬眠を維持します。冬眠中は回復アイテムを使用できず、習慣達成で気力50超を維持して自然回復を続ける必要があります。冬眠表示には `/world/fairy-hibernating.png` を使用します。冒険の出発条件・消費・帰還報酬は変更していません。

`FairyChamber` は初回・60秒ごと・タブ可視性変更時に同期。体力の予測表示には `advanceRoom` を使いますが、APと帰還記録は保存に成功した `source` を表示します。通信失敗はエラーと再接続操作を出します。

## 保存と編集場所

冬眠中のコメントは「ふぁ……ちょっと疲れちゃった。少しだけ、ここでおやすみするね。」です。冒険中の表示は `/world/fairy-adventuring.png` の看板画像を使います。冒険中はショップ・クローゼット・アイテム使用を停止し、冬眠中はこれらに加えて冒険への出発を停止します。部屋の対象ボタンは少し暗くし、冒険中は赤文字の「冒険中」、冬眠中は「💤冬眠中」のバッジを表示します。取引モデルでも購入・売却・使用・装備を拒否し、直接クローゼット画面を開いた場合も編集を停止します。帰還・目覚め後は通常利用に戻ります。

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
