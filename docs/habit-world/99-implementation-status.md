# 99 実装状況・コード対応表

[目次](00-index.md)

調査日：2026-09-14。状態の意味は00を参照。本体の現行接続と、独立試作・旧処理を区別しています。「実装済み」は静的なソース接続の確認であり、公開環境での検証済みという意味ではありません。

## 機能対応表

| ID | 機能名 | 現在の仕様 | 実装状態 | 関連ファイル | 主要な処理・確認場所 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| CORE-01 | 本体画面 | ja/en、stateによるタブ切替 | 実装済み | app/[locale]/page.tsx、i18n/routing.ts | Home、view、routing | worldとは別 |
| CORE-02 | ログイン | Google popup後にローカル同期 | 実装済み | AuthBox.tsx、syncActions.ts | signInWithGoogle、syncLocalDataToFirestore | 運用認証設定は未確認 |
| HAB-01 | 習慣追加・編集・削除 | daily/weekly、今日・昨日の達成 | 実装済み | habitActions.ts、HabitView.tsx、本体 | addHabit、saveEdit、handleToggleHabit | 上限は本体checkLimit |
| HAB-02 | 曜日表示・統計 | 予定曜日と履歴で達成率 | 実装済み | visibility.ts、useHabitCalendar.ts | isHabitVisibleOnDate、dailyStats | 作成日前除外なし |
| HAB-03 | 個別連続日数 | 暦日の履歴連続で計算 | 実装済み | calcToggleHabit.ts | getStreakAtDate、finalStreak | 予定日ベースでない |
| PT-01 | 通常習慣点 | 1回1pt | 実装済み | calcToggleHabit.ts | earnedPoint、pointDelta | 旧Functions10ptと別 |
| PT-02 | 節目報酬 | 3日5pt等、全11節目 | 実装済み | calcToggleHabit.ts、本体 | HABIT_STREAK_BONUS_POINTS、earnedHabitStreakBonus | 受領日数は全習慣で共有 |
| PT-03 | 4日専用報酬 | 定義なし | 未実装 | calcToggleHabit.ts、titles.ts | 節目表・TITLE_DEFINITIONSに4日なし | 将来値は不明 |
| PT-04 | 取消 | 対象日の保存点全額減算 | 実装済み | calcToggleHabit.ts | kind=uncheck | 節目受領IDは維持 |
| PT-05 | 合計・レベル | 習慣+目標100×件数+bonus+todo、100ごとLv | 実装済み | 本体 | habitPoints、goalBonusPoints、totalPoint、level | APは別 |
| PT-06 | 特別ポイント | 定義条件、ID単位で一度 | 実装済み | titles.ts、specialPointModel/Actions.ts | calculateSpecialRewards、awardSpecialPoints | 条件の一部は下記制約 |
| PT-07 | 累計ログイン報酬 | 3日30、7日70等 | 実装済み | titles.ts、fairyProgressModel.ts | login_*、advanceFairyLogin | 連続ログインとは別 |
| PT-08 | 連続全達成報酬 | maxStreak>=3等で50pt等 | 一部実装 | titles.ts、本体、appTypes.ts | streak_*のcheck | maxStreak更新接続なし |
| PT-09 | 旧履歴引継ぎ | earnedTitlesからdate:null履歴を補完 | 実装済み | specialPointModel.ts、HistoryView.tsx | specialPointHistory | 過去点の再加算なし |
| PT-10 | 商品購入・pt消費 | 商品・価格・購入処理なし | 未実装 | FairyChamber.tsx | shop disabled | 価格0という意味ではない |
| GOAL-01 | 目標 | 期限、達成、優先順 | 実装済み | DreamView、goalActions/Model | updateGoal、reorderGoals、orderedGoals | done件数を集計 |
| GOAL-02 | 公開目標 | 秘密以外が公開対象、カードのみ未達成上位3件 | 実装済み | goalModel/Actions、FriendView | publicGoalList、syncPublicGoals | 詳細文書は本人のみ |
| TODO-01 | タスク管理 | 日付・カテゴリ・メモ・サブタスク等 | 実装済み | TodoView、todoModel/Actions | addTodo、updateTodo | データはprivate |
| TODO-02 | 完了報酬・繰返し | 初回5pt、次回1件生成 | 実装済み | todoModel/Actions | completionChanges、toggleTodo | 取消しても報酬維持 |
| TODO-03 | リマインダー | 期限前の画面内表示 | 実装済み | todoModel、TodoView | reminderActive | 定刻プッシュは未実装 |
| DREAM-01 | 夢達成 | 10秒長押し、最大5回、目標維持/削除 | 実装済み | 本体、DreamView | handleDreamAchieved | 精霊王進化はなし |
| BUCKET-01 | 100のこと | 目標done30件でメニュー解放 | 実装済み | 本体、BucketListView、bucketListActions | isLocked、get/saveBucketList | ローカル移行対象外 |
| FAIRY-01 | 卵受領 | fairy未作成ならegg | 実装済み | OpeningTutorial、fairyProgressActions | finish、receiveFairyEgg | 個数管理なし |
| FAIRY-02 | 孵化 | eggかつ連続ログイン7以上、100pt | 実装済み | fairyProgressModel/Actions、FairyRoom | advanceFairyLogin、recordFairyLogin | 非匿名認証 |
| FAIRY-03 | 命名・改名 | 1〜20文字、readyへ | 実装済み | fairyProgressActions、FairyRoom/Chamber | nameFairy | 固定画像の基本妖精 |
| ROOM-01 | 体力・冬眠 | 初期100、日−5、当日習慣+8 | 実装済み | fairyRoomModel、updateHabitFields | advanceRoom、recoverFromHabit | 同IDは当日1回 |
| ROOM-02 | 部屋記録 | 最新100、誕生/冒険/冬眠/成長等 | 実装済み | fairyRoomModel、FairyChamber | record、records表示 | 古い記録を削る |
| ADV-01 | 森の冒険 | 体力80以上、20消費、24時間 | 実装済み | fairyRoomModel/Actions、FairyChamber | ADVENTURE_AREAS、departAdventure、syncFairyRoom | ポイント不要 |
| ADV-02 | AP抽選・帰還 | 出発時20〜40決定、帰還時加算 | 実装済み | fairyRoomModel | reward式、advanceRoom | 理論各1/21 |
| ADV-03 | 複数エリア解放 | 湖・洞窟は予定文のみ | 未実装 | FairyChamber | adventure末尾の案内 | 条件・確率不明 |
| ADV-04 | ランダムイベント | イベントテーブルなし | 未実装 | fairyRoomModel | departAdventure/advanceRoomの処理範囲 | AP以外の抽選なし |
| ITEM-01 | 宝の地図・アイテム | 専用データ・ドロップ・消費なし | 未実装 | fairyRoomModel、FairyChamber | FairyRoomState、予定文 | 効果・価格は不明 |
| AV-01 | 本体の外見 | basic保存、画像固定 | 一部実装 | fairyProgressActions、各Fairy部品 | appearance、/world/fairy.png | 切替処理なし |
| AV-02 | /avatar着せ替え | 8カテゴリ、ブラウザー保存、PNG出力 | 実装済み（独立試作） | app/(root)/avatar/model.ts、studio.tsx | equip、layers、decide、exportPng | 本体接続/購入は未実装 |
| FRIEND-01 | フォロー | 承認なし、一方向 | 実装済み | FriendView、socialActions | followUser、unfollowUser | following配列 |
| FRIEND-02 | 検索・おすすめ | 名前/夢、曖昧一致、推薦20人 | 実装済み | friendDiscovery、socialActions | rankSearchUsers、recommendUsers | 実績ランキングでない |
| FRIEND-03 | 旧申請・承認 | 関数とルールのみ | 一部実装 | friendActions.ts、firestore.rules | send/accept/rejectFriendRequest | 現行画面importなし |
| RANK-01 | 妖精ランキング | 3指標の自分の値だけ | 一部実装 | FairyChamber | RANKINGS、ranking分岐 | 他人取得/順位なし |
| KING-01 | 精霊王導入 | 12段階の固定案内 | 実装済み | openingDialogue、OpeningTutorial | openingDialogue、step、finish | AI会話ではない |
| KING-02 | 精霊王の部屋 | お言葉・5種類の相談 | 実装済み | FairyChamber、FairyKingRoom | council、fairyKingDialogue | お言葉15件・各相談10回答。JSONからランダム表示 |
| TALK-01 | 共通会話 | 状況カテゴリ→履歴を除いて抽選 | 実装済み | data/fairy、dialogue.ts、FairySpeech | categories、selectDialogue | エリア別条件なし |
| TALK-02 | 成功時会話 | 習慣・目標・夢の成功イベント | 実装済み | events.ts、本体、DreamView | announceFairy | ToDo/APは発信なし |
| TALK-03 | 部屋会話 | 6文、直前添字を回避 | 実装済み | FairyChamber | ROOM_LINES、talk | 初回は最後の文を抽選しない |
| TALK-04 | アイテム等の共通文 | 8カテゴリはデータのみ未接続 | 一部実装 | data/fairy/ja.json | itemEarned等、10参照 | データ存在≠発話実装 |
| SAVE-01 | データ購読 | uid有無でFirestore/ローカル | 実装済み | dataPersistence、localActions | subscribeData、subscribeProfile | 日付形式混在 |
| SAVE-02 | ローカル移行 | プロフィール、習慣、目標、ToDo | 一部実装 | syncActions | syncLocalDataToFirestore | 100のことなし、全体atomicでない |
| SAVE-03 | 公開範囲 | publicUsersはログイン者が読める | 実装済み | firestore.rules、profileActions | allow read、saveUserProfile | 表示フラグとアクセス制御は別 |
| LEGACY-01 | 旧習慣+10 | 入れ子habits更新でusers.points+10 | 一部実装 | lib/firestore.ts、functions/src/index.ts | toggleHabit、onHabitCompleted | 現行UIと未接続、稼働不明 |
| PROTO-01 | /world | 3ミッション、10pt/30XP、初期XP120 | 実装済み（独立試作） | world-prototype.tsx | WorldPrototype、complete | 再読込で消える |
| OPS-01 | 公開環境・実データ | 調査対象外 | コード上では確認できない | firebase.json、lib/firebase.ts | 設定コードのみ確認 | デプロイ成功を主張しない |

ファイル名を短く記した行は各章末のコード参照で完全パスを確認できます。

## 仕様変更前に扱いを決める現行の制約

| 確認事項 | コード上の根拠 | 資料での扱い |
| --- | --- | --- |
| 全達成称号のmaxStreak更新 | titles.tsが読むが書込み元なし | 一部実装。3日全達成で必ず50ptとはしない |
| 画面のstreak | 本体が月初からdailyStatsを走査 | 今日から過去への最大連続ではない |
| 目標「累計」 | goalsAchievedCountを現存done件数に補正 | 永久累積とはしない |
| 合計ポイント | 現存習慣point/達成目標件数から再計算 | 削除・取消で減少する |
| 習慣節目保存 | 習慣更新の後、別途プロフィール保存 | 全体の原子的更新ではない |
| 会話のデータのみカテゴリ | categoriesとannounce呼出しを全検索 | 表示済み機能と区別 |
| 部屋の新エリア対応 | 森・24時間・ハートの固定文字列 | 配列追加だけで完全対応としない |
| 外見変更の案内 | FairyRoomに将来の変更案内、現表示は固定 | 本体着せ替え実装とはしない |
| 公開プロフィール | 汎用patchのpublicUsers保存、readはsignedIn | 表示非公開とDB非公開を区別 |
| 旧ソース・試作 | 入れ子Functionsと/world独自点 | 本体の報酬式へ混入させない |

## 調査・検証の範囲

app/lib/types/data/hooks/functions/src、認証・ルール・保存・言語・ルート・既存検証スクリプトを調査し、ポイント、セリフ通知、乱数、地図・ショップ・ランキング等の参照を横断検索しました。既存Markdownやビルドログだけから動作を推測していません。

今回の変更はdocs/habit-world内のみ。ビルド・公開サイト操作・Firestore書込み・デプロイ・リファクタリングは行っていません。資料のリンク、定義数、引用する識別子を検証しました。結果は末尾に記録しています。

## コード上で確認した場所の索引

各機能表の根拠を関数・定数・実際の呼出しまで辿るための索引です。

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [package.json](<C:/dev/GitHub/Habit-World/package.json:5>) | "scripts" | 5 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:55>) | export default function Home | 55 |
| [i18n/routing.ts](<C:/dev/GitHub/Habit-World/i18n/routing.ts:4>) | export const routing | 4 |
| [middleware.ts](<C:/dev/GitHub/Habit-World/middleware.ts:6>) | export const config | 6 |
| [app/(root)/page.tsx](<C:/dev/GitHub/Habit-World/app/(root)/page.tsx:4>) | export default function RootPage | 4 |
| [app/(root)/world/world-prototype.tsx](<C:/dev/GitHub/Habit-World/app/(root)/world/world-prototype.tsx:19>) | export default function WorldPrototype | 19 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:11>) | export default function AvatarStudio | 11 |
| [app/components/HomeView.tsx](<C:/dev/GitHub/Habit-World/app/components/HomeView.tsx:11>) | export default | 11 |
| [app/components/DreamView.tsx](<C:/dev/GitHub/Habit-World/app/components/DreamView.tsx:51>) | export default | 51 |
| [app/components/TodoView.tsx](<C:/dev/GitHub/Habit-World/app/components/TodoView.tsx:11>) | export default | 11 |
| [app/components/BucketListView.tsx](<C:/dev/GitHub/Habit-World/app/components/BucketListView.tsx:29>) | export default | 29 |
| [lib/goalModel.ts](<C:/dev/GitHub/Habit-World/lib/goalModel.ts:8>) | export function orderedGoals | 8 |
| [lib/todoModel.ts](<C:/dev/GitHub/Habit-World/lib/todoModel.ts:13>) | export function nextOccurrence | 13 |
| [next.config.ts](<C:/dev/GitHub/Habit-World/next.config.ts:7>) | const withPWA | 7 |
| [app/[locale]/layout.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/layout.tsx:71>) | navigator.serviceWorker | 71 |
| [types/appTypes.ts](<C:/dev/GitHub/Habit-World/types/appTypes.ts:15>) | export type Habit | 15 |
| [lib/habitActions.ts](<C:/dev/GitHub/Habit-World/lib/habitActions.ts:14>) | export const addHabit | 14 |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:62>) | const getStreakAtDate | 62 |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:76>) | export const calcToggleHabit | 76 |
| [lib/habits/updateHabitFields.ts](<C:/dev/GitHub/Habit-World/lib/habits/updateHabitFields.ts:10>) | export const updateHabitFields | 10 |
| [lib/habits/visibility.ts](<C:/dev/GitHub/Habit-World/lib/habits/visibility.ts:4>) | export const isHabitVisibleOnDate | 4 |
| [hooks/useHabitCalendar.ts](<C:/dev/GitHub/Habit-World/hooks/useHabitCalendar.ts:58>) | const dailyStats | 58 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:451>) | const handleToggleHabit | 451 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:563>) | const checkLimit | 563 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:636>) | const streak = | 636 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:661>) | const visibleHabits | 661 |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:45>) | const HABIT_STREAK_BONUS_POINTS | 45 |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:138>) | const earnedPoint | 138 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:531>) | const goalBonusPoints | 531 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:538>) | const totalPoint | 538 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:555>) | void awardSpecialPoints | 555 |
| [lib/specialPointModel.ts](<C:/dev/GitHub/Habit-World/lib/specialPointModel.ts:16>) | export function calculateSpecialRewards | 16 |
| [lib/specialPointActions.ts](<C:/dev/GitHub/Habit-World/lib/specialPointActions.ts:7>) | export async function awardSpecialPoints | 7 |
| [lib/fairyProgressModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressModel.ts:3>) | export function advanceFairyLogin | 3 |
| [lib/todoModel.ts](<C:/dev/GitHub/Habit-World/lib/todoModel.ts:37>) | export function completionChanges | 37 |
| [lib/todoActions.ts](<C:/dev/GitHub/Habit-World/lib/todoActions.ts:15>) | export async function toggleTodo | 15 |
| [functions/src/index.ts](<C:/dev/GitHub/Habit-World/functions/src/index.ts:9>) | export const onHabitCompleted | 9 |
| [app/(root)/world/world-prototype.tsx](<C:/dev/GitHub/Habit-World/app/(root)/world/world-prototype.tsx:30>) | const xp = | 30 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:1>) | export const HAIRS | 1 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:4>) | export const OPTIONS | 4 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:8>) | export const STORAGE_KEY | 8 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:16>) | export function layers | 16 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:8>) | export function AvatarFigure | 8 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:19>) | function decide | 19 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:20>) | async function exportPng | 20 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:181>) | src="/world/fairy.png" | 181 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:16>) | export async function receiveFairyEgg | 16 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:22>) | export async function recordFairyLogin | 22 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:27>) | export async function nameFairy | 27 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:1>) | export const ROOM_RULES | 1 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:24>) | export function createRoom | 24 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:51>) | export function recoverFromHabit | 51 |
| [lib/fairyRoomActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomActions.ts:6>) | export async function syncFairyRoom | 6 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:71>) | const timer = window.setInterval | 71 |
| [app/components/FairyRoom.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyRoom.tsx:8>) | export default function FairyRoom | 8 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:5>) | export const ADVENTURE_AREAS | 5 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:9>) | export type FairyRoomState | 9 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:30>) | export function advanceRoom | 30 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:63>) | export function departAdventure | 63 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:69>) | const reward = | 69 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:57>) | const readyToLeave | 57 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:138>) | panel === "adventure" | 138 |
| [app/components/FairyChamberPreview.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamberPreview.tsx:13>) | if (areaId) next = departAdventure | 13 |
| [app/components/FriendView.tsx](<C:/dev/GitHub/Habit-World/app/components/FriendView.tsx:24>) | export default function FriendView | 24 |
| [app/components/FriendView.tsx](<C:/dev/GitHub/Habit-World/app/components/FriendView.tsx:124>) | const handleRegister | 124 |
| [lib/socialActions.ts](<C:/dev/GitHub/Habit-World/lib/socialActions.ts:27>) | export const getDiscoveryUsers | 27 |
| [lib/socialActions.ts](<C:/dev/GitHub/Habit-World/lib/socialActions.ts:55>) | export const followUser | 55 |
| [lib/socialActions.ts](<C:/dev/GitHub/Habit-World/lib/socialActions.ts:101>) | export const getFollowingUsers | 101 |
| [lib/friendDiscovery.ts](<C:/dev/GitHub/Habit-World/lib/friendDiscovery.ts:3>) | export const normalizeSearchText | 3 |
| [lib/friendDiscovery.ts](<C:/dev/GitHub/Habit-World/lib/friendDiscovery.ts:42>) | function matchScore | 42 |
| [lib/friendDiscovery.ts](<C:/dev/GitHub/Habit-World/lib/friendDiscovery.ts:71>) | function similarDream | 71 |
| [lib/friendDiscovery.ts](<C:/dev/GitHub/Habit-World/lib/friendDiscovery.ts:84>) | export function recommendUsers | 84 |
| [lib/friendActions.ts](<C:/dev/GitHub/Habit-World/lib/friendActions.ts:71>) | export const sendFriendRequest | 71 |
| [lib/goalModel.ts](<C:/dev/GitHub/Habit-World/lib/goalModel.ts:14>) | export function publicGoalList | 14 |
| [firestore.rules](<C:/dev/GitHub/Habit-World/firestore.rules:21>) | match /publicUsers/{uid} | 21 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:27>) | const RANKINGS | 27 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:124>) | panel === "ranking" | 124 |
| [lib/friendDiscovery.ts](<C:/dev/GitHub/Habit-World/lib/friendDiscovery.ts:60>) | export function rankSearchUsers | 60 |
| [app/components/TitleView.tsx](<C:/dev/GitHub/Habit-World/app/components/TitleView.tsx:17>) | export default function TitleView | 17 |
| [data/openingDialogue.ts](<C:/dev/GitHub/Habit-World/data/openingDialogue.ts:3>) | export const openingDialogue | 3 |
| [app/components/OpeningTutorial.tsx](<C:/dev/GitHub/Habit-World/app/components/OpeningTutorial.tsx:10>) | const completionKey | 10 |
| [app/components/OpeningTutorial.tsx](<C:/dev/GitHub/Habit-World/app/components/OpeningTutorial.tsx:117>) | async function finish | 117 |
| [app/components/OpeningTutorial.tsx](<C:/dev/GitHub/Habit-World/app/components/OpeningTutorial.tsx:96>) | }, 42) | 96 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:22>) | id: "council" | 22 |
| [app/(root)/world/world-prototype.tsx](<C:/dev/GitHub/Habit-World/app/(root)/world/world-prototype.tsx:104>) | いつか、精霊王へ | 104 |
| [data/fairy/ja.json](<C:/dev/GitHub/Habit-World/data/fairy/ja.json:2>) | "normal" | 2 |
| [data/fairy/en.json](<C:/dev/GitHub/Habit-World/data/fairy/en.json:2>) | "normal" | 2 |
| [lib/fairy/dialogue.ts](<C:/dev/GitHub/Habit-World/lib/fairy/dialogue.ts:19>) | export function categories | 19 |
| [lib/fairy/dialogue.ts](<C:/dev/GitHub/Habit-World/lib/fairy/dialogue.ts:38>) | export function selectDialogue | 38 |
| [lib/fairy/dialogue.ts](<C:/dev/GitHub/Habit-World/lib/fairy/dialogue.ts:53>) | export function loginCategory | 53 |
| [lib/fairy/events.ts](<C:/dev/GitHub/Habit-World/lib/fairy/events.ts:4>) | export function announceFairy | 4 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:33>) | const key = | 33 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:51>) | const show = | 51 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:85>) | const event = | 85 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:90>) | const next = | 90 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:179>) | onClick={() => setSpeechRequest | 179 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:468>) | announceFairy(first | 468 |
| [app/components/DreamView.tsx](<C:/dev/GitHub/Habit-World/app/components/DreamView.tsx:314>) | if (newDoneState) announceFairy | 314 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:10>) | const ROOM_LINES | 10 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:81>) | const talk = | 81 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:102>) | <div className={styles.speech} | 102 |
| [app/components/FairyRoom.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyRoom.tsx:66>) | phase === "waiting" && | 66 |
| [scripts/fairy-data.cjs](<C:/dev/GitHub/Habit-World/scripts/fairy-data.cjs:6>) | function validate | 6 |
| [types/appTypes.ts](<C:/dev/GitHub/Habit-World/types/appTypes.ts:62>) | fairy?: | 62 |
| [lib/fairyProgressModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressModel.ts:16>) | if (profile.fairy?.status | 16 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:21>) | id: "shop" | 21 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:143>) | 湖・洞窟・地図 | 143 |
| [app/(root)/world/world-prototype.tsx](<C:/dev/GitHub/Habit-World/app/(root)/world/world-prototype.tsx:72>) | worldGift | 72 |
| [types/appTypes.ts](<C:/dev/GitHub/Habit-World/types/appTypes.ts:59>) | export type UserProfile | 59 |
| [lib/dataPersistence.ts](<C:/dev/GitHub/Habit-World/lib/dataPersistence.ts:14>) | export const LS_KEYS | 14 |
| [lib/dataPersistence.ts](<C:/dev/GitHub/Habit-World/lib/dataPersistence.ts:108>) | export function subscribeProfile | 108 |
| [lib/localActions.ts](<C:/dev/GitHub/Habit-World/lib/localActions.ts:6>) | export class LocalStorageRepository | 6 |
| [lib/profileActions.ts](<C:/dev/GitHub/Habit-World/lib/profileActions.ts:73>) | export const saveUserProfile | 73 |
| [lib/profileActions.ts](<C:/dev/GitHub/Habit-World/lib/profileActions.ts:112>) | export const updateLastLogin | 112 |
| [lib/syncActions.ts](<C:/dev/GitHub/Habit-World/lib/syncActions.ts:10>) | export async function syncLocalDataToFirestore | 10 |
| [lib/goalActions.ts](<C:/dev/GitHub/Habit-World/lib/goalActions.ts:82>) | export async function syncPublicGoals | 82 |
| [lib/bucketListActions.ts](<C:/dev/GitHub/Habit-World/lib/bucketListActions.ts:26>) | export const saveBucketList | 26 |
| [lib/firebase.ts](<C:/dev/GitHub/Habit-World/lib/firebase.ts:5>) | const firebaseConfig | 5 |
| [firebase.json](<C:/dev/GitHub/Habit-World/firebase.json:27>) | "emulators" | 27 |
| [lib/firestore.ts](<C:/dev/GitHub/Habit-World/lib/firestore.ts:49>) | export async function createHabit | 49 |
| [lib/titles.ts](<C:/dev/GitHub/Habit-World/lib/titles.ts:14>) | export const TITLE_DEFINITIONS | 14 |
| [scripts/test-dialogue.cjs](<C:/dev/GitHub/Habit-World/scripts/test-dialogue.cjs:1>) | const assert | 1 |
| [scripts/test-special-points.cjs](<C:/dev/GitHub/Habit-World/scripts/test-special-points.cjs:1>) | const assert | 1 |
| [scripts/test-fairy-room.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-room.cjs:1>) | const assert | 1 |
| [scripts/test-fairy-room-actions.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-room-actions.cjs:2>) | const assert | 2 |
| [scripts/test-fairy-progress.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-progress.cjs:1>) | const assert | 1 |
| [scripts/test-avatar.cjs](<C:/dev/GitHub/Habit-World/scripts/test-avatar.cjs:1>) | const assert | 1 |
| [scripts/test-friend-discovery.cjs](<C:/dev/GitHub/Habit-World/scripts/test-friend-discovery.cjs:4>) | const assert | 4 |
| [scripts/test-goals.cjs](<C:/dev/GitHub/Habit-World/scripts/test-goals.cjs:1>) | const assert | 1 |
| [scripts/test-todo.cjs](<C:/dev/GitHub/Habit-World/scripts/test-todo.cjs:1>) | const assert | 1 |

## 検証結果（2026-09-14）

- 資料15ファイル、リンク354件を検査し、参照先ファイルの欠落なし。コードブロックの閉じ忘れ・文字置換記号も検出なし。
- 各章に142件、重複を除き130か所のコード参照を付け、対象文字列と行番号の存在を確認。
- TITLE_DEFINITIONS全42件を直接読み取り、03へID・名称・条件・報酬・check式・定義行を掲載。共通日本語セリフは43カテゴリ260文。
- 既存テスト6本が成功：test-special-points.cjs、test-fairy-progress.cjs、test-fairy-room.cjs、test-fairy-room-actions.cjs、test-dialogue.cjs、test-fairy-speech.cjs。Firestoreはテスト内の代替実装で、実アカウントへ書込みなし。
- calcToggleHabitをメモリー内のサンプルで直接評価し、1〜4日目が1/1/6/1pt、累計9pt、3日目取消が−6ptになることを確認。検証コードはファイルとして追加していません。
- ビルド・全テスト一括実行・画面操作・実Firebase接続の動作検証は未実施。既存の未コミット変更は維持し、今回作成したのはdocs/habit-worldのMarkdownのみです。

## 実装前の追加調査：テスト・開発用機能（2026-09-14）

詳細とTEST-01〜15の全対応表は [14 テスト・開発用システム](14-test-and-development-system.md) を参照。以下は前回の調査に追加した結果です。

| ID | 機能名 | 現在の仕様 | 実装状態 | 関連ファイル | 主要処理・備考 |
| --- | --- | --- | --- | --- | --- |
| TEST-01/02 | テスト日付変更 | オフセット計算とPropsは残るが操作なし | 一部実装 | hooks/useHabitCalendar.ts、HabitView.tsx、本体 | setTestDayOffsetの呼出し0件。開発時もボタンなし |
| TEST-03/04 | 開発/管理者モード | NODE_ENVの環境判定あり、管理者モード未確認 | 開発判定は実装済み / 管理者はコード上では確認できない | 本体、firestore.rules | isDevは権限ではない |
| TEST-05/06 | 昨日・月移動 | 達成対象の昨日、カレンダー閲覧月は変更可能 | 実装済み | HabitView、HistoryView、StatsView | 基準日変更とは別 |
| TEST-07 | メール認証 | 過去版から削除済み、現在はGoogleのみ | 現行未実装（旧実装確認済み） | AuthBox.tsx、Git c5cb4d6 | 2026-02-15の削除差分。Firebase側設定は不明 |
| TEST-08〜10 | 仮ユーザー・プレビュー | サンプルで孵化/部屋を操作 | 実装済み | FairyBirthPreview、FairyChamberPreview | 本番notFound。previewは認証ユーザーではない |
| TEST-11/12 | 初期化 | resetAllDataは未接続、DB一括テスト初期化は未確認 | 一部実装 / コード上では確認できない | 本体、BucketListView | 通常リストのリセットは実データ変更 |
| TEST-13/14 | エミュレーター・仮想時計 | エミュレーター設定とテスト内Clockあり | 一部実装（アプリ接続なし） / テスト実装済み | firebase.json、lib/firebase.ts、scripts | 全機能共通のテスト時計ではない |
| TEST-15 | 独立試作 | world/avatarの再試行・初期化 | 実装済み（独立試作） | app/(root)/world、app/(root)/avatar | development限定ではない |

今回の追加調査ではソース横断検索・ローカルGit履歴確認・資料リンク検査のみを行いました。機能の有効化・削除・ログイン・データ初期化は実施していません。前節の15ファイル/354リンクは初回資料作成時の記録で、追加後は16ファイルです。


## 2026-09-15 テスト管理の実装後対応表（現在仕様）

この節と[14 テスト管理](14-test-and-development-system.md)が上記TEST-01〜15の旧調査より優先します。初回の「資料のみ」「ビルド未実施」は初回調査時点の記録です。

| ID | 機能名 | 現在の仕様 | 実装状態 | 関連ファイル | 主要な処理 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| TEST-16 | テスト管理者 | Google UID登録＋enabled＋TEST01〜03ラベル | 実装済み | hooks/useTestAccess.ts、lib/testAccessModel.ts、firestore.rules | useTestAccess、isTestAdmin | 実UID登録は未実施 |
| TEST-17 | ON/OFF | 管理者本人のセッション保存、OFFで日付0 | 実装済み | lib/testModeActions.ts、TestAdminMenu.tsx | setTestMode | 一般ユーザーの直接書込も拒否 |
| TEST-18 | 日付テスト | 専用習慣の前日/翌日/今日、±3650日 | 実装済み | hooks/useHabitCalendar.ts、lib/testModeActions.ts | changeTestDay、updateTestHabit | 既存calcToggleHabit再利用。全機能共通時計は未実装 |
| TEST-19 | 試作入口 | 登録＋ONの場合のみ既存4画面を表示 | 実装済み | app/components/TestFeatureGate.tsx、各page.tsx | TestFeatureGate | 既存の試作内容は維持 |
| TEST-20 | サーバー権限 | testAdmins編集禁止、本人＋Google＋有効登録でテスト保存を許可 | 実装済み | firestore.rules | isTestAdmin、testModeEnabled | 運用ルールへの反映は未実施 |
| TEST-21 | 検証 | 型検査・本番ビルド・既存11本・テスト管理・実エミュレータールール検証成功 | 一部実装 | scripts/test-test-mode.cjs、scripts/test-test-mode-rules.cjs、firebase.test.json | npm run test:test-mode / test:test-rules | 実Google OAuthおよび実画面チェックは未実施 |
