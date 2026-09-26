# 04 アバターシステム

> 2026-09-15追記：テスト管理者・日付オフセット・試作画面のアクセス条件は[14 テスト管理](14-test-and-development-system.md)が最新です。通常機能を維持し、専用testAdmins/testSessions/testWorkspacesを追加しました。以下の初回調査で述べる未接続の日付操作・開発環境限定の説明は実装前の状態です。


[目次](00-index.md)

## 本体と着せ替え試作

本体の妖精は `fairy.appearance:"basic"` を保存しますが、表示は `AutonomousFairy.tsx`、`FairyRoom.tsx`、`FairyChamber.tsx` に直接指定された `/world/fairy.png` です。appearanceを読んで別画像に切り替える本体処理や、購入・所持パーツ・装備保存は未実装。部屋の `closet` は準備中で操作できません。

一方、`/avatar` には独立した着せ替え試作があります。この試作内の選択・保存・PNG出力は実装済みですが、本体との統合は一部実装です。所持品一覧ではなく、選択肢すべてを利用できる形式です。価格と購入処理はありません。

## 試作データ

定義ファイル：`app/(root)/avatar/model.ts`。`OPTIONS` がカテゴリとID・名称の元です。以下はコードに実在する名称です。

| カテゴリ / 配列 | ID → 名称 |
| --- | --- |
| hair / HAIRS | short → そよ風ショート、long → 月あかりロング、twintail → 花風ツインテール |
| outfit / OUTFITS | leaf → 森の旅人、petal → 花びらのドレス、star → 星読みのローブ |
| wings / WINGS | butterfly → 虹のちょうちょ、leaf → 若葉のささやき、crystal → 星晶のつばさ |
| eyes | gentle → やさしい瞳、clear → すっきりした瞳 |
| brows | arched → やわらかな眉、straight → まっすぐな眉 |
| nose | dot → 小さな鼻、curve → 丸みのある鼻 |
| mouth | smile → にっこり、open → うれしい笑顔 |
| cheeks | rose → さくら色、peach → あんず色、none → 色なし |

`Avatar` は version:3、name、8カテゴリの選択ID。`DEFAULT.name` は「リリ」。これは試作の初期名であり、全ユーザーの本体妖精名ではありません。入力名は最大20文字、`isAvatar` でIDとversion等を検査します。

保存キー `habit-world.avatar-prototype.v3`。旧 `habit-world.avatar-prototype.v2` は `migrate` で不足する顔パーツを初期値に補完します。Firestoreには保存しません。パーツの所有数や購入履歴は持ちません。

## 変更・表示・出力

`studio.tsx` の `select` → `equip` でカテゴリだけ変更。`randomize` は髪・服・翼のみランダム化し、顔は維持します。`decide` でブラウザーに保存。編集の初期化は保存済みの姿を消しません。

`layers` が重ねる画像と座標を返し、`AvatarFigure` と `layerStyle` が背景画像の切出しで表示します。重なり順は翼 → 固定マネキン → 服 → 頬 → 目 → 眉 → 鼻 → 口 → 髪。素材は `public/avatar/wings.png` と `public/avatar/mannequin/{neutral-v3,clothes,features,hair}.png`。頬は色のグラデーションです。

`exportPng` は同じレイヤーデータから1000×1200の透過PNGを生成。表示確認用 `Visibility` は保存内容に影響せず、決定画面・PNGは全パーツを表示します。

## 編集マップ

| 項目 | 場所 |
| --- | --- |
| 機能・現在の仕組み | 固定画像の本体と、独立レイヤー試作 |
| 定義・主要関数 | `model.ts` の `OPTIONS/DEFAULT/isAvatar/migrate/equip/layers/describe` |
| 処理・画面 | `studio.tsx` の `AvatarStudio/AvatarFigure/decide/exportPng` |
| 保存 | 上記LocalStorageキー。本体は `users/{uid}.fairy` |
| 手動編集可能 | 名称は各配列のname。パーツ配置は `layers`。見た目は画像と `studio.module.css` |
| 同時確認 | `scripts/test-avatar.cjs`、素材の列数・行数・切出し座標、保存IDの後方互換 |

新しい選択肢は配列に1行追加するだけでは描けません。現在は3列素材や添字別座標の固定配列があり、画像・`layers`・PNG切出し・検証を同時に対応させる必要があります。本体への着せ替え導入には表示・保存・所持の新しい接続設計が必要です。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:1>) | export const HAIRS | 1 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:4>) | export const OPTIONS | 4 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:8>) | export const STORAGE_KEY | 8 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:16>) | export function layers | 16 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:8>) | export function AvatarFigure | 8 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:19>) | function decide | 19 |
| [app/(root)/avatar/studio.tsx](<C:/dev/GitHub/Habit-World/app/(root)/avatar/studio.tsx:20>) | async function exportPng | 20 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:181>) | src="/world/fairy.png" | 181 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:16>) | export async function receiveFairyEgg | 16 |
