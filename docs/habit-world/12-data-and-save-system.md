# 12 データ・保存システム

> 2026-09-15追記：テスト管理者・日付オフセット・試作画面のアクセス条件は[14 テスト管理](14-test-and-development-system.md)が最新です。通常機能を維持し、専用testAdmins/testSessions/testWorkspacesを追加しました。以下の初回調査で述べる未接続の日付操作・開発環境限定の説明は実装前の状態です。


[目次](00-index.md)

## 保存の切替

`uid` がある場合はFirestore、nullならLocalStorage。`lib/dataPersistence.ts.subscribeData/subscribeProfile` が読込と変更購読、`lib/localActions.ts.LocalStorageRepository` がブラウザー保存を担当します。本体のモデル型は `types/appTypes.ts` です。

認証画面 `AuthBox` はGoogle popupログイン後に `syncLocalDataToFirestore` を呼びます。妖精進行・冒険とフレンド画面は匿名利用を拒否します。Firestore所有者ルールそのものは非匿名限定ではありません。

## Firestoreの現行パス

| 保存場所 | 内容 | 主な読み書き元 |
| --- | --- | --- |
| `users/{uid}` | name/gender/dream/公開フラグ、earnedTitles、bonusPoints、specialPointHistory、todoPoints、todoCategories、stats、firstLoginAt、loginRewardDate、fairy、fairyRoom等 | profileActions、specialPointActions、fairyProgressActions、fairyRoomActions、todoActions |
| `users/{uid}/habits/{id}` | 習慣定義、point、pointHistory、dailyStreak | habitActions、updateHabitFields、subscribeData |
| `users/{uid}/goals/{id}` | title/deadline/done/achievedAt/priorityOrder/createdAt | goalActions、subscribeData |
| `users/{uid}/todos/{id}` | タスクと繰返し、rewarded、nextTodoId等 | todoActions、subscribeData |
| `users/{uid}/bucketList/main` | 100のこと | bucketListActions |
| `publicUsers/{uid}` | 検索用プロフィール、公開目標、following、recentAction、lastLoginAt等 | socialActions、profileActions、goalActions |
| `users/{uid}/public/status` | lastLoginAt/lastActive | profileActions |
| `users/{uid}/friendRequests/{id}`、`friends/{id}` | 旧申請/承認用 | friendActions。現行画面から未接続 |
| `users/{uid}/notifications/{id}` | ルールはあるが現行の通知作成・画面接続は確認できない | firestore.rules |

`lib/firestore.ts` の dreams→goals→habitsという深い入れ子は別の旧構造です。現行UIと混ぜないでください。そのパスのFunctionsは `points` を加算しますが、現行totalPointは読みません。

## ブラウザー保存キー

| キー | 内容・定義場所 |
| --- | --- |
| habits_v2 / goals_v2 / todos_v2 | 未ログインの各一覧。`dataPersistence.LS_KEYS` |
| profile_v2 | 未ログインプロフィール・卵等。LS_KEYS |
| bucket_list_v2 | 未ログインの100のこと。LS_KEYS |
| isDarkMode | 本体の表示設定。`Home.toggleDarkMode` |
| habit-world-opening-v1 | completeで導入済み。`OpeningTutorial.completionKey` |
| habit-world-opening-egg | receivedで旧導入の卵受領。OpeningTutorial、本体移行処理 |
| habit-world:fairy:v1:{account} | 会話用lastVisit/days/history。`FairySpeech`。accountなしはlocal |
| habit-world.avatar-prototype.v3 | 独立アバター試作の選択ID・name/version |
| habit-world.avatar-prototype.v2 | 同試作の旧読込キー |

`/world` の入力・ミッションはstateのみで保存キーはありません。部屋のAPや冒険を独立のブラウザーキーに保存する現行本体処理もありません。

## データ項目の意味

| 項目 | 型・用途 |
| --- | --- |
| pointHistory | `{date:"YYYY-MM-DD",point:number}[]`。習慣の対象日ごとの獲得点 |
| specialPointHistory | `{id,date:string|null,name,description,point}[]`。nullは旧記録の獲得日不明 |
| stats.earnedHabitStreakBonuses | 受領済み節目日数の配列。習慣全体で共有 |
| stats.loginDays / continuousLoginDays / maxContinuousLoginDays | 累計/連続/最大連続ログイン |
| stats.maxStreak | 全達成称号の判定入力だが、現行更新処理が確認できない |
| stats.goalsAchievedCount | 本体で現在のdone目標数へ補正される |
| fairy | status=egg/naming/ready、eggReceivedAt、bornAt、name、appearance |
| fairyRoom | 体力、AP、旅行、記録等。[06](06-adventure-system.md)に全項目 |
| todo.rewarded | 同タスクの報酬を再付与しないためのフラグ |
| todo.nextTodoId | 繰返し次回の二重生成を防ぐ参照 |
| todoImportId / todoImportIds | ローカルToDo点の重複移行を防ぐ実装上の項目。UserProfile型には明示されていない |

日付は `formatDateToJST` を使う場面が多く、日次報酬は実際の日本日付。Firestore Timestamp、ISO文字列、Date、ミリ秒が混在しています。`bornAt` は日付文字列、旅行時刻はミリ秒、RoomRecord.atはISOまたは渡された文字列です。保存形式変更時に一括して同一形式と仮定しないでください。

## ローカルからアカウントへの移行

`syncLocalDataToFirestore` の順序はプロフィール → 習慣/目標/ToDo → 公開目標再同期。

- プロフィールに一時的なtodoImportIdを作り、サーバーのtodoImportIdsに未登録ならローカルtodoPointsを加算。カテゴリはID重複を除いて統合。
- 既存アカウントのfairy、loginRewardDate、stats、bonusPoints、earnedTitles、specialPointHistoryを優先。既存fairyがなければローカル妖精情報から卵状態を移行。
- 習慣・目標はaddDocで新ID。ToDoは元IDのsetDocなのでnextTodoId参照を保ち、再試行に対応。
- 各区分の転送後に該当LocalStorageキーを削除。全体の一括トランザクションではありません。途中失敗・再実行では習慣/目標の重複可能性を確認する必要があります。
- **bucket_list_v2の移行はこの関数に含まれていません**。ログインすれば自動で100のことも移るとは説明できません。
- 会話履歴・独立アバター・導入終了フラグ・ダークモードもこの移行対象ではありません。

## 同期と整合性

Firestoreでは `onSnapshot`、ローカルでは `local_storage_change` により画面を更新します。リスト購読はstorageイベントにも対応しますが、ローカルプロフィール購読は独自イベントのみです。habits/goalsはcreatedAt降順、ToDoは取得後に時刻で整列します。

トランザクションが使われるのは特別報酬、ログイン進行、部屋同期、ToDo完了、当日習慣回復などです。ただし習慣の点は画面から計算したfieldsを渡し、節目受領記録は別保存なので、複数端末の同時操作まで一括で保証する構成とは記載できません。

`getUserProfile` の返却にはfairyRoom/firstLoginAtが明示されていません。本体の通常の `subscribeProfile` は文書全体を読むためその経路で扱います。別画面を作る際に「getUserProfileで全項目取得できる」と仮定しないでください。

## 公開データとルールの現状

`firestore.rules` はusers本体・習慣・ToDo・目標・100のことを所有者のみ、publicUsersとpublic/statusをログイン者が読めるようにしています。`publicUsers.isPublic` は検索条件・表示に利用しますが、ルール上の読込可否条件ではありません。

`saveUserProfile` は渡されたpatchをusersに保存し、通常分岐では同じpatchをpublicUsersにも保存します。showGoal/isPublic変更時も `syncPublicGoals` にpublicPatchとして渡します。公開項目の許可リストへ完全に絞った汎用保存ではありません。`updateLastLogin` も公開側へ時刻を書きます。非表示フラグの存在を、DBから読み取れない保証と扱わないでください。

ポイントや体力の数値範囲・正当な増減をサーバールールで検証するコードはありません。現状のクライアント計算と所有者ルールの設計事実です。新しいランキングや通貨を設計する際に確認すべき箇所として記録します。

## 編集マップ・運用確認

定義は `types/appTypes.ts` と各Model、保存は各Actions、公開は `profileActions/goalActions/socialActions`、権限は `firestore.rules`、インデックスは `firestore.indexes.json`。Firebase初期化は `lib/firebase.ts` がNEXT_PUBLIC_FIREBASE_*環境変数を利用します。秘密値・実アカウント情報は本資料には転記していません。

`firebase.json` はFirestoreルール/インデックスとfunctionsを指定し、エミュレーターのポートはFirestore8081/Auth9099/UI4000。ただし `lib/firebase.ts` にエミュレーター接続関数はなく、起動だけで本体接続先が切り替わるとは確認できません。実際の接続先・デプロイ済みルール・稼働Functions・バックアップ有無はコード上では確認できません。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
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
| [firestore.rules](<C:/dev/GitHub/Habit-World/firestore.rules:21>) | match /publicUsers/{uid} | 21 |
| [lib/firestore.ts](<C:/dev/GitHub/Habit-World/lib/firestore.ts:49>) | export async function createHabit | 49 |
