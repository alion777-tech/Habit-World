# 13 手動編集・今後の開発ガイド

> 2026-09-15追記：テスト管理者・日付オフセット・試作画面のアクセス条件は[14 テスト管理](14-test-and-development-system.md)が最新です。通常機能を維持し、専用testAdmins/testSessions/testWorkspacesを追加しました。以下の初回調査で述べる未接続の日付操作・開発環境限定の説明は実装前の状態です。


[目次](00-index.md)

この章は今後編集するときの手順です。今回、以下のコード変更は実行していません。

## ファイルの探し方

エディターでプロジェクト `Habit-World` を開き、記載されたパスを開きます。`app/[locale]/page.tsx` の `[locale]` は実際のフォルダ名です。PowerShellでは角括弧をパターン扱いしないよう `Get-Content -LiteralPath 'app/[locale]/page.tsx'` を使います。

ファイル内検索で関数名・配列名を探してください。ターミナルなら、例えば `rg -n 'HABIT_STREAK_BONUS_POINTS' lib` で行番号を出せます。資料末尾のコード参照は調査時の行番号です。

## 目的別の編集経路

| 変更したいこと | 読む章 | 最初に開くファイル・検索語 | 一緒に確認するファイル |
| --- | --- | --- | --- |
| 通常習慣点 | 03、02 | `lib/habits/calcToggleHabit.ts` / earnedPoint | 本体、HistoryView、updateHabitFields |
| 3日継続+5pt | 03 | 同ファイル / HABIT_STREAK_BONUS_POINTSの3 | profile.stats、取消、昨日の追記 |
| 累計3日ログイン+30pt | 03、05 | `lib/titles.ts` / login_3 | specialPointModel/Actions、fairyProgressModel |
| 4日専用報酬を作る | 03 | 既存定義なし。習慣節目かログイン条件か先に決める | 受領ID/配列、重複防止、表示、テスト |
| 全達成3日+50pt | 03、99 | `lib/titles.ts` / streak_3 | maxStreakの計算・保存接続を先に確認 |
| 孵化7日・100pt | 05、03 | `fairyProgressModel.ts` / advanceFairyLogin | FairyRoom固定表示、openingDialogue、本体のロック文 |
| 目標報酬 | 03 | 本体 / goalBonusPoints | DreamView、messages、取消・削除後合計 |
| ToDo報酬 | 03、01 | `todoModel.ts` / completionChanges | todoActions、rewarded、次回タスク生成 |
| 森の冒険時間・AP | 06 | `fairyRoomModel.ts` / ADVENTURE_AREAS | FairyChamber内の固定文とテスト |
| 冒険抽選の分布 | 06 | 同ファイル / departAdventureのreward式 | 保存済みreward、帰還重複防止 |
| 体力減少・回復 | 05 | 同ファイル / ROOM_RULES | updateHabitFields、ハート換算、部屋説明 |
| 普段の妖精セリフ | 10 | `data/fairy/ja.json` / 対象カテゴリ | en.json、dialogue.ts、FairySpeech |
| 部屋限定セリフ | 10 | `FairyChamber.tsx` / ROOM_LINES | talk、trip/sleepingの固定文 |
| 精霊王の案内 | 09、10 | `data/openingDialogue.ts` / id,text | OpeningTutorial、data-opening属性 |
| 新アイテム・価格 | 11、12 | 商品定義なし。まず保存・効果・購入仕様を設計 | 型、Actions、ルール、ショップ、冒険接続 |
| アバター名・素材 | 04 | `avatar/model.ts` / OPTIONS,layers | studio.tsx、素材、テスト。独立試作の変更 |
| 検索の推薦精度 | 07 | `friendDiscovery.ts` / matchScore,similarDream | socialActions、FriendView、公開フラグ |
| 公開ランキング | 08、12 | 現状個人表示のみ。RANKINGSを起点に設計 | 公開可能な値、取得・順位、ルール、集計 |

## 数値変更の例：習慣3日のボーナス

1. 03を読み、変更対象が個別習慣+5、累計ログイン+30、全達成条件+50のどれかを決めます。
2. 個別習慣なら `lib/habits/calcToggleHabit.ts` を開きます。
3. `HABIT_STREAK_BONUS_POINTS` の `3: 5` を探します。変更するのは右側の値です（新しい数値は要件で決めます）。
4. 既にstatsに3が記録された人への再付与はありません。既存履歴のpointも自動変更されません。過去分を変えるなら別途データ移行を設計します。
5. 未受領ユーザー・受領済みユーザー・3日目取消・再チェック・昨日の追記・別習慣で3日に到達を確認します。

ポイント総計やレベルの変更は、特別ポイント閾値の再評価、部屋のレベル表示・成長記録にも影響します。

## データ追加と保存互換

配列のname/text変更は比較的局所的ですが、ID変更は保存済みデータに影響します。特別ポイントIDを変えると新しい報酬と認識され得ます。アバターの既存IDを消すと `isAvatar` で読込が無効になる場合があります。areaIdを増やす際は現在の固定帰還文も直す必要があります。

保存項目を追加するなら、型 → 初期値/create関数 → 旧データの不足時補完 → 保存Actions → 購読/取得 → UI → 移行/公開範囲の順に確認します。型定義だけの変更では、既存Firestore文書に値は入りません。

## 既存検証の使い分け

以下はプロジェクト直下で実行する既存コマンドです。今回は新しいテストファイルを作成していません。

| 対象 | コマンド |
| --- | --- |
| 特別報酬移行・重複 | `node scripts/test-special-points.cjs` |
| 孵化・ログイン | `node scripts/test-fairy-progress.cjs` |
| 部屋モデル・保存接続 | `node scripts/test-fairy-room.cjs` / `node scripts/test-fairy-room-actions.cjs` |
| 会話選択・表示 | `node scripts/test-dialogue.cjs` / `node scripts/test-fairy-speech.cjs` |
| 自動移動の確認 | `node scripts/test-fairy.cjs` |
| アバター | `node scripts/test-avatar.cjs` |
| 検索・おすすめ | `node scripts/test-friend-discovery.cjs` |
| 目標 | `node scripts/test-goals.cjs` |
| ToDo | `npm run test:todo` または `node scripts/test-todo.cjs` |

これらはTypeScriptの計算関数を読み込むテストやソース接続検査を含みます。パスしても実際のFirebase権限・通信・複数端末競合をすべて保証しません。変更内容に対応した検証を選びます。

UI変更時は `npm run dev` と該当画面で確認。部屋は開発専用 `/ja/fairy-room-preview`、孵化は `/ja/fairy-preview` で試せます。本体からログイン・チェックすれば実データを変更するため、接続先を確認した開発用アカウントで行ってください。エミュレーター起動だけでは接続先が切り替わりません。

`npm run build` はPWA生成物などを書き換える可能性があります。今回はコードを変更しない資料調査のためビルド・UI操作・デプロイは実施していません。現状 `lint` は `next lint` 定義で、この調査では実行成功を確認していません。

## 資料を更新する手順

変更後は対象章の条件・数値・保存・編集先を更新し、99の実装状態と00の入口を合わせて更新します。「準備中ボタンを有効にした」だけなら、購入や保存が動くかを確認するまで実装済みにしません。実データを確認していない事項は引き続き「コード上では確認できない」と残します。

## テスト機能の所在を調べたいとき

[14 テスト・開発用システム](14-test-and-development-system.md) に現在使える操作・未接続の処理・過去のメール認証をまとめています。内部の日付オフセットには現在操作UIがなく、全機能の時計や保存先を切り替えるテストモードではありません。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:563>) | const checkLimit | 563 |
| [lib/habits/calcToggleHabit.ts](<C:/dev/GitHub/Habit-World/lib/habits/calcToggleHabit.ts:45>) | const HABIT_STREAK_BONUS_POINTS | 45 |
| [lib/titles.ts](<C:/dev/GitHub/Habit-World/lib/titles.ts:14>) | export const TITLE_DEFINITIONS | 14 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:5>) | export const ADVENTURE_AREAS | 5 |
| [scripts/test-dialogue.cjs](<C:/dev/GitHub/Habit-World/scripts/test-dialogue.cjs:1>) | const assert | 1 |
| [scripts/test-special-points.cjs](<C:/dev/GitHub/Habit-World/scripts/test-special-points.cjs:1>) | const assert | 1 |
| [scripts/test-fairy-room.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-room.cjs:1>) | const assert | 1 |
| [scripts/test-fairy-room-actions.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-room-actions.cjs:2>) | const assert | 2 |
| [scripts/test-fairy-progress.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-progress.cjs:1>) | const assert | 1 |
| [scripts/test-avatar.cjs](<C:/dev/GitHub/Habit-World/scripts/test-avatar.cjs:1>) | const assert | 1 |
| [scripts/test-friend-discovery.cjs](<C:/dev/GitHub/Habit-World/scripts/test-friend-discovery.cjs:4>) | const assert | 4 |
| [scripts/test-goals.cjs](<C:/dev/GitHub/Habit-World/scripts/test-goals.cjs:1>) | const assert | 1 |
| [scripts/test-todo.cjs](<C:/dev/GitHub/Habit-World/scripts/test-todo.cjs:1>) | const assert | 1 |
