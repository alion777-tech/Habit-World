# 03 ポイントシステム

現在の完了・取消・削除の仕様は[完了チェックとポイント](17-completion-accounting.md)を参照。本文の設定は説明資料であり、自動的にコードへ反映する設定ファイルではない。

## 通常ポイント（2026-09-29）

| 対象 | 新規完了 |
| --- | ---: |
| 習慣 | 10pt／10G |
| ToDo | 1pt／1G |
| 目標 | 100pt／100G |
| 夢・バケットリスト・ToDoサブタスク | 通常ポイントの直接加算なし |

累計はeconomy.lifetimePoints、買い物用残高はeconomy.gold。通常完了取消で実際の通常受領額を戻す。旧習慣1ptは1、新習慣10ptは10。ゴールド不足の取消は拒否する。削除では受領済み額を減らさず、買い物は累計を減らさない。最高到達レベルは下げない。

## 習慣の特別報酬

通常報酬と別管理。一度獲得したら取消でも残り、再完了や別習慣で二重受領しない。プロフィール全体のearnedHabitStreakBonusesとspecialPointHistoryで管理する。

| 連続日数 | 特別報酬 | 新規通常10ptを含む合計 |
| --- | ---: | ---: |
| 3 | 5 | 15 |
| 7 | 20 | 30 |
| 10 | 30 | 40 |
| 21 | 70 | 80 |
| 30 | 100 | 110 |
| 90 | 300 | 310 |
| 210 | 700 | 710 |
| 365 | 1500 | 1510 |
| 1095 | 3000 | 3010 |
| 2555 | 7000 | 7010 |
| 3650 | 10000 | 10010 |

特別報酬が受領済みの場合は通常10ptだけ。新しい利用者が3日連続で完了した場合、通常30＋特別5＝35pt、4日目で45pt（他の特別報酬を除く）。過去の1pt履歴・残高は増額しない。ログイン・レベル等の別条件を満たした場合は別途特別報酬が加算される。

## 特別ポイントの判定と重複防止

`lib/titles.ts` の `TITLE_DEFINITIONS` は名称・説明・`bonusPoints`・`check` を一括定義します。全定義の対応表は本章末に掲載しています。

`calculateSpecialRewards` は `earnedTitles` と既存履歴のIDを統合し、未受領で条件成立したものだけを `added` に入れます。`bonusPoints` に新規分の合計を足し、履歴と受領IDを保存。旧 `earnedTitles` しかない記録は `date:null` の履歴へ補完し、過去の獲得日を作りません。旧残高に同じポイントを再加算しません。

`awardSpecialPoints` はログインUIDを確認し、最新プロフィールをFirestoreトランザクションで読んで判定・保存します。`stats` は呼出元の値に保存済み `profile.stats` を重ね、習慣・目標作成件数だけは大きい方を採用します。本体は残高等が変わると再評価するため、ある報酬で次のポイント・レベル条件が成立すれば後続の評価で追加報酬が発生し得ます。

注意：`streak_*` が読むのは `maxStreak`。現在のソースにはその書込みが見つかりません。保存済み値があれば判定可能ですが、新規ユーザーの通常操作だけで成立するとは確認できません。また `goalsAchievedCount` は本体で現在の達成済み目標件数へ補正されるため、定義文の「累計」と履歴累積の意味が一致しません。

## 減算・消費・価格

取消は通常受領額のみ減算（特別報酬は保持）、削除では減算しない。購入はゴールドのみ消費する。商品価格と素材買取は[ゴールド経済](16-gold-economy.md)とショップ設定表を参照。

## 旧実装・試作の数字を混ぜない

`functions/src/index.ts.onHabitCompleted` は `users/{uid}/dreams/{dreamId}/goals/{goalId}/habits/{habitId}` の `completedToday:false→true` に対して `users/{uid}.points` を10増やします。本体は `users/{uid}/habits` に保存しているため、この処理による通常報酬10ptという説明は誤りです。稼働・デプロイはコード上では確認できません。

`/world` はミッション1件につき10pt / 30XP、初期XP120、レベルは `floor(xp/100)+1`。全て画面内試作データで、本体の残高と無関係です。

開発用 `FairyChamberPreview` はサンプル総合1250pt（Lv13）、累計ログイン128日を渡し、冒険乱数を0.5固定（30AP）で呼びます。プレビューの数字は本体初期残高・実際のユーザー実績ではありません。

## どこを編集するか

| 変更内容 | 定義・主要関数 | 一緒に確認するもの |
| --- | --- | --- |
| 習慣1回の基本点 | `calcToggleHabit` の `basePoint`（本番10） | completionModel・economyModel・normalPoint履歴、取消、旧データ、部屋回復 |
| 3日など節目の日数・点数 | `HABIT_STREAK_BONUS_POINTS` | 受領済み配列・過去履歴。値を変えても過去点は自動改訂されない |
| 目標100pt | 本体 `goalBonusPoints` | `DreamView`・翻訳の報酬表示、取消・削除、称号判定。既存達成目標も新係数で再集計される |
| ToDo1pt | `todoModel.completionChanges` | `todoActions.toggleTodo`、`rewarded`、繰返し、ToDoテスト |
| 特別条件 | `TITLE_DEFINITIONS` | `specialPointModel/Actions`、`TitleView`、`HistoryView`、条件統計の更新元 |
| 孵化100pt・7日 | `fairyProgressModel.advanceFairyLogin` | `FairyRoom` の固定「+100pt」、部屋ロック文、`openingDialogue`、履歴ID |
| AP範囲 | `ADVENTURE_AREAS` | `departAdventure`、`advanceRoom`、部屋説明・記録・保存済み旅行 |

## 特別ポイント定義の全件対応表

以下の表は調査時の `TITLE_DEFINITIONS` から転記します。表の「条件」は説明文、実際の判定式は `check` 列です。状態の制約は前述のとおりです。

| ID / 名称 | 条件の説明 | pt | 実際のcheck（sは判定用統計） | 実装状態・根拠 |
| --- | --- | ---: | --- | --- |
| debut / 新人デビュー | 習慣を1つ以上追加する | 10 | function (s) { return (s.habitsCreatedCount &#124;&#124; 0) >= 1; } | 実装済み（本章の統計制約参照） / [定義:17](<C:/dev/GitHub/Habit-World/lib/titles.ts:17>) |
| login_3 / 3日坊主撃破 | 累計3日ログイン | 30 | function (s) { return (s.loginDays &#124;&#124; 0) >= 3; } | 実装済み（本章の統計制約参照） / [定義:27](<C:/dev/GitHub/Habit-World/lib/titles.ts:27>) |
| login_7 / 1週間の壁突破 | 累計7日ログイン | 70 | function (s) { return (s.loginDays &#124;&#124; 0) >= 7; } | 実装済み（本章の統計制約参照） / [定義:35](<C:/dev/GitHub/Habit-World/lib/titles.ts:35>) |
| login_10 / 継続ビギナー | 累計10日ログイン | 100 | function (s) { return (s.loginDays &#124;&#124; 0) >= 10; } | 実装済み（本章の統計制約参照） / [定義:43](<C:/dev/GitHub/Habit-World/lib/titles.ts:43>) |
| login_20 / 継続マスター | 累計20日ログイン | 200 | function (s) { return (s.loginDays &#124;&#124; 0) >= 20; } | 実装済み（本章の統計制約参照） / [定義:51](<C:/dev/GitHub/Habit-World/lib/titles.ts:51>) |
| login_30 / 月間制覇者 | 累計30日ログイン | 300 | function (s) { return (s.loginDays &#124;&#124; 0) >= 30; } | 実装済み（本章の統計制約参照） / [定義:59](<C:/dev/GitHub/Habit-World/lib/titles.ts:59>) |
| login_100 / 百日修行僧 | 累計100日ログイン | 1000 | function (s) { return (s.loginDays &#124;&#124; 0) >= 100; } | 実装済み（本章の統計制約参照） / [定義:67](<C:/dev/GitHub/Habit-World/lib/titles.ts:67>) |
| login_200 / 習慣の求道者 | 累計200日ログイン | 2000 | function (s) { return (s.loginDays &#124;&#124; 0) >= 200; } | 実装済み（本章の統計制約参照） / [定義:75](<C:/dev/GitHub/Habit-World/lib/titles.ts:75>) |
| login_365 / 一年の守護者 | 累計365日ログイン | 3650 | function (s) { return (s.loginDays &#124;&#124; 0) >= 365; } | 実装済み（本章の統計制約参照） / [定義:83](<C:/dev/GitHub/Habit-World/lib/titles.ts:83>) |
| login_1095 / 3年ログイン継続 | 累計1095日ログイン | 10950 | function (s) { return (s.loginDays &#124;&#124; 0) >= 1095; } | 実装済み（本章の統計制約参照） / [定義:91](<C:/dev/GitHub/Habit-World/lib/titles.ts:91>) |
| login_2555 / 7年ログイン継続 | 累計2555日ログイン | 25550 | function (s) { return (s.loginDays &#124;&#124; 0) >= 2555; } | 実装済み（本章の統計制約参照） / [定義:99](<C:/dev/GitHub/Habit-World/lib/titles.ts:99>) |
| login_3650 / 10年ログイン継続 | 累計3650日ログイン | 36500 | function (s) { return (s.loginDays &#124;&#124; 0) >= 3650; } | 実装済み（本章の統計制約参照） / [定義:107](<C:/dev/GitHub/Habit-World/lib/titles.ts:107>) |
| pt_300 / 猛者 | 累計300pt達成 | 50 | function (s) { return (s.totalPoints &#124;&#124; 0) >= 300; } | 実装済み（本章の統計制約参照） / [定義:117](<C:/dev/GitHub/Habit-World/lib/titles.ts:117>) |
| pt_700 / 鉄人 | 累計700pt達成 | 100 | function (s) { return (s.totalPoints &#124;&#124; 0) >= 700; } | 実装済み（本章の統計制約参照） / [定義:125](<C:/dev/GitHub/Habit-World/lib/titles.ts:125>) |
| pt_1000 / レジェンド | 累計1000pt達成 | 200 | function (s) { return (s.totalPoints &#124;&#124; 0) >= 1000; } | 実装済み（本章の統計制約参照） / [定義:133](<C:/dev/GitHub/Habit-World/lib/titles.ts:133>) |
| pt_10000 / 狂気 | 累計10000pt達成 | 1000 | function (s) { return (s.totalPoints &#124;&#124; 0) >= 10000; } | 実装済み（本章の統計制約参照） / [定義:141](<C:/dev/GitHub/Habit-World/lib/titles.ts:141>) |
| pt_20000 / 無限機関 | 累計20000pt達成 | 2000 | function (s) { return (s.totalPoints &#124;&#124; 0) >= 20000; } | 実装済み（本章の統計制約参照） / [定義:149](<C:/dev/GitHub/Habit-World/lib/titles.ts:149>) |
| streak_3 / 連続3日ストリーカー | 3日連続全達成 | 50 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 3; } | 一部実装（maxStreak更新なし） / [定義:159](<C:/dev/GitHub/Habit-World/lib/titles.ts:159>) |
| streak_7 / 7日コンボ | 7日連続全達成 | 100 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 7; } | 一部実装（maxStreak更新なし） / [定義:167](<C:/dev/GitHub/Habit-World/lib/titles.ts:167>) |
| streak_10 / 10日コンボマスター | 10日連続全達成 | 150 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 10; } | 一部実装（maxStreak更新なし） / [定義:175](<C:/dev/GitHub/Habit-World/lib/titles.ts:175>) |
| streak_21 / 連続の鬼 | 21日（3週間）連続全達成 | 300 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 21; } | 一部実装（maxStreak更新なし） / [定義:183](<C:/dev/GitHub/Habit-World/lib/titles.ts:183>) |
| streak_30 / 連続神話 | 30日連続全達成 | 500 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 30; } | 一部実装（maxStreak更新なし） / [定義:191](<C:/dev/GitHub/Habit-World/lib/titles.ts:191>) |
| streak_90 / パーフェクト継続者 | 90日連続全達成 | 1000 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 90; } | 一部実装（maxStreak更新なし） / [定義:199](<C:/dev/GitHub/Habit-World/lib/titles.ts:199>) |
| streak_210 / 記録ホルダー | 210日連続全達成 | 2000 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 210; } | 一部実装（maxStreak更新なし） / [定義:207](<C:/dev/GitHub/Habit-World/lib/titles.ts:207>) |
| streak_365 / 伝説のストリーク | 365日連続全達成 | 5000 | function (s) { return (s.maxStreak &#124;&#124; 0) >= 365; } | 一部実装（maxStreak更新なし） / [定義:215](<C:/dev/GitHub/Habit-World/lib/titles.ts:215>) |
| lv_3 / 習慣見習い | Lv3到達 | 30 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 3; } | 実装済み（本章の統計制約参照） / [定義:225](<C:/dev/GitHub/Habit-World/lib/titles.ts:225>) |
| lv_10 / 習慣戦士 | Lv10到達 | 100 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 10; } | 実装済み（本章の統計制約参照） / [定義:233](<C:/dev/GitHub/Habit-World/lib/titles.ts:233>) |
| lv_20 / 習慣騎士 | Lv20到達 | 200 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 20; } | 実装済み（本章の統計制約参照） / [定義:241](<C:/dev/GitHub/Habit-World/lib/titles.ts:241>) |
| lv_30 / 習慣魔導士 | Lv30到達 | 300 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 30; } | 実装済み（本章の統計制約参照） / [定義:249](<C:/dev/GitHub/Habit-World/lib/titles.ts:249>) |
| lv_50 / 習慣賢者 | Lv50到達 | 500 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 50; } | 実装済み（本章の統計制約参照） / [定義:257](<C:/dev/GitHub/Habit-World/lib/titles.ts:257>) |
| lv_60 / 習慣マスター | Lv60到達 | 600 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 60; } | 実装済み（本章の統計制約参照） / [定義:265](<C:/dev/GitHub/Habit-World/lib/titles.ts:265>) |
| lv_100 / グランドマスター | Lv100到達 | 1000 | function (s) { return (Math.floor((s.totalPoints &#124;&#124; 0) / 100) + 1) >= 100; } | 実装済み（本章の統計制約参照） / [定義:273](<C:/dev/GitHub/Habit-World/lib/titles.ts:273>) |
| effort_goal_50 / 生活設計士 | 目標を累計50個追加 | 100 | function (s) { return (s.goalsCreatedCount &#124;&#124; 0) >= 50; } | 実装済み（本章の統計制約参照） / [定義:283](<C:/dev/GitHub/Habit-World/lib/titles.ts:283>) |
| effort_goal_100 / 人生ビルダー | 目標を累計100個追加 | 200 | function (s) { return (s.goalsCreatedCount &#124;&#124; 0) >= 100; } | 実装済み（本章の統計制約参照） / [定義:291](<C:/dev/GitHub/Habit-World/lib/titles.ts:291>) |
| effort_habit_50 / 習慣設計師 | 習慣を累計50個追加 | 100 | function (s) { return (s.habitsCreatedCount &#124;&#124; 0) >= 50; } | 実装済み（本章の統計制約参照） / [定義:299](<C:/dev/GitHub/Habit-World/lib/titles.ts:299>) |
| effort_habit_100 / 自己統制者 | 習慣を累計100個追加 | 200 | function (s) { return (s.habitsCreatedCount &#124;&#124; 0) >= 100; } | 実装済み（本章の統計制約参照） / [定義:307](<C:/dev/GitHub/Habit-World/lib/titles.ts:307>) |
| effort_goal_achieve_10 / 有言実行 | 目標を累計10個達成 | 300 | function (s) { return (s.goalsAchievedCount &#124;&#124; 0) >= 10; } | 実装済み（本章の統計制約参照） / [定義:315](<C:/dev/GitHub/Habit-World/lib/titles.ts:315>) |
| effort_goal_achieve_30 / 夢追い人 | 目標を累計30個達成 | 500 | function (s) { return (s.goalsAchievedCount &#124;&#124; 0) >= 30; } | 実装済み（本章の統計制約参照） / [定義:323](<C:/dev/GitHub/Habit-World/lib/titles.ts:323>) |
| effort_goal_achieve_50 / 達成マニア | 目標を累計50個達成 | 1000 | function (s) { return (s.goalsAchievedCount &#124;&#124; 0) >= 50; } | 実装済み（本章の統計制約参照） / [定義:331](<C:/dev/GitHub/Habit-World/lib/titles.ts:331>) |
| effort_goal_achieve_100 / 鋼の意思 | 目標を累計100個達成 | 2000 | function (s) { return (s.goalsAchievedCount &#124;&#124; 0) >= 100; } | 実装済み（本章の統計制約参照） / [定義:339](<C:/dev/GitHub/Habit-World/lib/titles.ts:339>) |
| login_streak_90 / 3ヶ月皆勤 | 累計90日ログイン | 1000 | function (s) { return (s.loginDays &#124;&#124; 0) >= 90; } | 実装済み（本章の統計制約参照） / [定義:349](<C:/dev/GitHub/Habit-World/lib/titles.ts:349>) |
| anniversary_1 / 初ログインから365日 | 利用開始から1年経過 | 3650 | function (s) { if (!s.firstLoginAt) return false; var first = s.firstLoginAt.toDate ? s.firstLoginAt.toDate() : new Date(s.firstLoginAt); var diff = Date.now() - first.getTime(); return diff >= 365 * 24 * 60 * 60 * 1000; } | 実装済み（本章の統計制約参照） / [定義:357](<C:/dev/GitHub/Habit-World/lib/titles.ts:357>) |

定義は合計42件。login_streak_90はID名にstreakが含まれますが、checkは連続日数ではなく累計loginDays>=90です。レベル報酬はLv3=200pt、Lv10=900pt、Lv20=1900pt、Lv30=2900pt、Lv50=4900pt、Lv60=5900pt、Lv100=9900ptが判定上の到達点です。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:45>) | const HABIT_STREAK_BONUS_POINTS | 45 |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:138>) | const earnedPoint | 138 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:451>) | const handleToggleHabit | 451 |
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
