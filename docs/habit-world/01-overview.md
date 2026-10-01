# 01 全体像

[目次](00-index.md)

## 現在の構成

習慣・夢・目標・ToDo の記録を中心に、ポイント、妖精の孵化と部屋、フォローを加えた Web アプリです。定義の中心は `types/appTypes.ts`、画面の統合は `app/[locale]/page.tsx` の `Home` です。

`package.json` では Next.js `16.0.10`、React `19.2.1`、Firebase `^12.6.0`、next-intl `^4.8.3`、next-pwa `^5.6.0`。指定範囲と実際にインストールされた版・デプロイ版は同一とは限りません。

| 場所 | 役割 |
| --- | --- |
| `app/[locale]/page.tsx` | 認証・データ購読、ポイント集計、タブ、習慣操作、妖精への接続 |
| `app/components/` | 各画面と表示部品。`*View.tsx` が生活管理、`Fairy*` が妖精関連 |
| `lib/*Model.ts`、`lib/habits/` | 入力から結果を計算する処理。数値や条件の主な編集先 |
| `lib/*Actions.ts` | Firestore / LocalStorage への読み書き |
| `data/` | 妖精のセリフ JSON と精霊王の案内文 |
| `messages/ja.json`、`messages/en.json` | 一般画面の翻訳。妖精共通セリフとは別 |
| `public/world/`、`public/opening/`、`public/avatar/` | 画像・音楽・着せ替え素材 |
| `scripts/test-*.cjs` | 既存の計算・表示接続等の検証スクリプト |
| `functions/src/index.ts`、`lib/firestore.ts` | 本体とは異なる入れ子構造の旧処理。現行UIの接続は確認できない |

## 画面と接続範囲

2026-09-15更新：`/avatar`、`/world`を含む4つの試作入口をTestFeatureGateで保護しました。登録方法は[14 テスト管理](14-test-and-development-system.md)を参照。

| URL / 画面 | 状態・保存 |
| --- | --- |
| `/` | `app/(root)/page.tsx` が既定言語へ転送。言語 middleware も対象 |
| `/ja`、`/en` | 本体。`view` の値で Home、習慣、履歴、統計、夢・目標、ToDo、特別ポイント、プロフィール、フレンド、100のこと、妖精の部屋を切替 |
| `/world` | `WorldPrototype`。夢・目標・3つのミッションは React state のみ。再読込でリセット |
| `/avatar` | `AvatarStudio`。着せ替えとPNG出力が動く独立試作。専用LocalStorageのみ。本体の妖精画像と未接続 |
| `/ja/fairy-preview`、`/en/fairy-preview` | 孵化プレビュー。登録済みテスト管理者＋モードONが必要 |
| `/ja/fairy-room-preview`、`/en/fairy-room-preview` | 部屋プレビュー。登録済みテスト管理者＋モードONが必要。本体の保存を代替するコールバックを使用 |

本体の「冒険をはじめる」という導入終了ボタンは卵の保存・導入終了です。24時間の冒険を開始する処理ではありません。

## 生活管理機能の補足

| 機能 | 現在の仕組み | 定義・主要処理 | 保存・編集先 |
| --- | --- | --- | --- |
| 夢 | プロフィールの `dream` 1件。10秒長押しと確認で達成。最大5回、目標を維持するか削除するかを分岐。直接のポイント報酬なし | `Home.handleDreamAchieved`、`DreamView` | `users/{uid}.dream/dreamAchievedCount`。`profileActions.ts` |
| 目標 | 追加・期限・達成・並替え。達成中の件数×100pt。未達成優先、明示順位、作成時刻、IDの順で整列 | `goalModel.ts` の `orderedGoals` / `moveGoal`、`goalActions.ts` | `users/{uid}/goals`、`goals_v2`。公開対象は秘密以外。カード表示のみ未完了上位3件 |
| ToDo | メモ、優先度、開始日、期限、カテゴリ、ピン、サブタスク、繰返し、画面内リマインダー。初回完了+5pt | `todoModel.ts` の `completionChanges` / `nextOccurrence`、`todoActions.ts`、`TodoView.tsx` | `users/{uid}/todos`、`todos_v2`、プロフィールの `todoCategories/todoPoints` |
| ToDo繰返し | 日・週・月。間隔1〜365、曜日0〜6、月日1〜31またはlast。完了時に次回1件を作成し、過去分はまとめて飛ばす | `nextOccurrence` / `completionChanges` | `recurrence`、`nextTodoId`。週指定日は次の該当日を優先し、差0なら7×interval日 |
| Home | 今日の習慣と今日のToDo等を抜粋。高優先度ToDoは7日以内の期限も対象 | `HomeView.tsx`、`todoModel.ts.homeTodos` | 元の習慣/ToDoを操作 |
| したい100のこと | 本体メニューは達成中の目標30件以上で解放。リスト名・副題・全体期限、番号1〜100の内容・完了状態。項目別期限は型に残るが編集UIなし | `BucketListView.tsx`、`bucketListActions.ts` | `users/{uid}/bucketList/main`、`bucket_list_v2`。ポイント加算処理なし |
| 履歴・統計 | 習慣のポイント履歴と特別ポイント履歴。月別達成率は予定習慣に対する完了割合 | `HistoryView.tsx`、`StatsView.tsx`、`useHabitCalendar.ts` | 元データから表示時計算 |

`checkLimit` は習慣50件・目標200件・ToDo200件、各種追加1日50件を画面側で検査します。これはDBルールの件数制限ではありません。ToDoリマインダーは画面内の表示条件であり、定刻プッシュ送信処理は確認できません。

## 環境と開発入口

`npm run dev` は `next dev --webpack`、`npm run build` は `next build --webpack`。`npm run lint` は現状 `next lint` という定義のままで、この資料では成功を確認していません。言語は `i18n/routing.ts` の ja/en、既定ja。PWAは `next.config.ts` で開発時無効、production の layout 側で登録します。

手動編集する際は画面だけでなく、対応する Model、Actions、型、翻訳、保存ルールも確認します。既存の `FAIRY_ROOM.md` 等は参考資料ですが、将来の文章を実装の証拠にはしません。

## コード参照（調査時点）

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
