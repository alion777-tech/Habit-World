# 02 習慣システム

> 2026-09-15追記：テスト管理者・日付オフセット・試作画面のアクセス条件は[14 テスト管理](14-test-and-development-system.md)が最新です。通常機能を維持し、専用testAdmins/testSessions/testWorkspacesを追加しました。以下の初回調査で述べる未接続の日付操作・開発環境限定の説明は実装前の状態です。


[目次](00-index.md) / [ポイント詳細](03-point-system.md)

状態：実装済み。ただし全習慣の連続達成ボーナスに渡す `maxStreak` の更新接続は一部実装です。

## 機能と保存

| 項目 | 現在の仕組み・編集先 |
| --- | --- |
| 定義ファイル | `types/appTypes.ts` の `Habit` |
| 処理ファイル | `lib/habitActions.ts`、`lib/habits/calcToggleHabit.ts`、`lib/habits/updateHabitFields.ts` |
| 主要な関数 | `addHabit`、`deleteHabit`、`calcToggleHabit`、`getStreakAtDate`、`updateHabitFields`、本体 `handleToggleHabit` |
| 画面 | `app/components/HabitView.tsx`、`HomeView.tsx`、本体 `visibleHabits` |
| 保存場所 | `users/{uid}/habits/{habitId}`。未ログインは `habits_v2` |
| 保存項目 | `id/text/createdAt/type/daysOfWeek/dailyStreak/lastCompletedDate/point/pointHistory` |
| 手動編集場所 | 通常点・節目は `calcToggleHabit.ts`。曜日表示は `visibility.ts` と本体。上限は本体 `checkLimit` |
| 一緒に確認 | `useHabitCalendar.ts`、`HistoryView.tsx`、`fairyRoomModel.ts`、`profileActions.ts`、`firestore.rules` |

## 達成操作の流れ

1. 本体から今日または昨日を選ぶ。`habitDisplayDate` と `activeHabitDate` が対象日を決めます。Homeからは今日を渡します。
2. `handleToggleHabit` が対象の `Habit` とプロフィール全体の `stats.earnedHabitStreakBonuses` を `calcToggleHabit` に渡します。
3. 対象日の `pointHistory` がなければ達成、あれば取消です。
4. 達成時は直前の暦日から履歴を遡り、連続日数を計算。最新達成日に合わせて `dailyStreak` と `lastCompletedDate` を更新します。
5. 基本1ptと未受領の節目ボーナスを、その対象日の履歴1件に合算して保存します。
6. `updateHabitFields` で保存後、必要なら `earnedHabitStreakBonuses` をプロフィールに別途保存。成功した達成は妖精発話イベントを送ります。

曜日指定は `weekly` と `daysOfWeek`（0=日曜〜6=土曜）。表示対象の曜日を制御しますが、連続日数の計算は「予定日に連続」ではなく「暦日に履歴が連続」です。週1回の達成を連続7回として数える実装ではありません。

昨日を後から達成し、今日も達成済みの場合は連続日数をつなぎ直します。このとき節目判定は最終的な `finalStreak` で行われ、報酬は今回編集した昨日の履歴へ入ります。

## 取消・削除と注意点

- 取消はその日の履歴に保存された点数全額を減らします。3日ボーナス込みの6ptなら6ptを減算します。
- 取消してもプロフィールの「この節目を受領済み」という記録を戻しません。同じ節目の再チェックでボーナスが再支給されるわけではありません。
- 他の日に既に保存された報酬の再計算はしません。取消後の連続日数は再計算します。
- 習慣削除はその習慣のポイントと履歴を含むデータを削除するため、画面の合計ポイントも減ります。
- `updateHabitFields` は当日の新規チェックで妖精の体力も回復させます。昨日の追記は当日の回復になりません。同じ習慣は1日1回までです。
- 習慣本体の保存とプロフィールの節目受領済み保存は別処理です。全体が単一トランザクションという説明はできません。

## カレンダーの計算と実装上の差

`useHabitCalendar.dailyStats` は表示月を1日から順に作り、予定習慣0件の日を0%、それ以外を `round(doneCount / total * 100)` とします。作成日より前を除外する条件は `isHabitVisibleOnDate` にありません。

本体の表示用 `streak` はこの月初からの配列を先頭から数え、100%でない日に止まります。「今日から過去へ連続全達成日数を数える」計算ではありません。加えて、この値を `stats.maxStreak` に保存する接続も確認できません。`dailyStreak`、表示用 `streak`、`stats.maxStreak` は別物として扱ってください。

## 開発用日付の追補

`useHabitCalendar` に `testDayOffset` とsetterは残っていますが、現在の `HabitView` にsetterを呼ぶボタン・イベントはありません。今日/昨日の達成切替とは別です。開発サーバーを起動すれば日付変更ボタンを使える状態ではありません。保存への影響を含めた調査は [14](14-test-and-development-system.md) を参照してください。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
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
