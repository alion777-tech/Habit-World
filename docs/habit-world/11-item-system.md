# 11 アイテムシステム

[目次](00-index.md) / [アバター](04-avatar-system.md) / [冒険](06-adventure-system.md)

## 現在の一覧

商品マスター、インベントリ、所持数量、購入履歴、価格、消費アイテム処理は未実装です。画面に名前が出るものと、実際の所持品システムを区別します。

| 名前・対象 | 種類・状態 | 入手・価格 | 使用条件・効果 | 関連データ・処理 |
| --- | --- | --- | --- | --- |
| カラフルな卵 | 導入報酬/妖精進行状態。実装済み | オープニング完了時。購入でなく付与、価格定義なし | fairyがないとき受領。アカウントの連続ログイン7日以上で孵化・+100pt、命名へ | `openingDialogue`、`OpeningTutorial.finish`、`receiveFairyEgg`、`advanceFairyLogin` |
| 基本の妖精 | キャラクター進行状態。実装済み | 卵の孵化。商品ではない | 命名後readyで部屋解放 | `UserProfile.fairy`、`nameFairy`、`FairyChamber` |
| 髪・服・翼・顔パーツ | 独立/avatar試作の選択肢。本体統合は一部実装 | 全選択肢を選択可能。価格・購入・ドロップなし | equipで選択IDを置換しレイヤー画像を表示。本体の妖精には反映しない | `avatar/model.ts.OPTIONS/layers/equip`、`studio.tsx`。全名称は04参照 |
| 地図／宝の地図 | 未実装 | 入手法、価格、確率はコード上では確認できない | 解放・報酬増加・消費等の効果なし | `FairyChamber` の将来説明に「地図」。専用定義・処理なし |
| 冒険アイテム | 未実装 | 商品・価格なし | 冒険補正処理なし | 部屋の将来説明のみ |
| 家具・部屋用品 | 所持・配置機能は未実装 | 購入・入手処理なし | 部屋背景は画像。家具データを置いているわけではない | `FairyChamber.module.css`、`public/world/fairy-room-v1.png` |
| はじまりの灯 | /worldの演出。試作内のみ実装 | サンプルミッション1件以上達成で表示 | 光の装飾。所持・使用・永続保存なし | `WorldPrototype` のworldGift条件 |

「葉っぱのハンモック」「新しい服」は部屋の台詞に登場しますが、購入可能商品としての定義はありません。APを「帰還のおみやげ」と表示しても、アイテムオブジェクトを受け取る実装ではありません。

## 卵の保存と二重受領防止

`receiveFairyEgg` は既に `profile.fairy` があれば空の更新を返します。卵の数ではなく `fairy.status` を保存します。受領日 `eggReceivedAt` と外見 `appearance:"basic"` を記録。ローカル保存した卵をGoogleログイン後に移行する処理がありますが、既存アカウントの妖精を卵に戻さないよう `syncLocalDataToFirestore` で保護しています。

「使用」ボタンで卵を消費する方式ではなく、ログイン進行による `egg→naming→ready` の状態遷移です。詳細は05を参照。

## 宝の地図を詳しく確認した結果

現行の `ADVENTURE_AREAS` はforestのみ。`FairyRoomState` にinventory/maps/items等はなく、`departAdventure` の引数も状態・時刻・areaId・乱数だけです。地図によるエリア解放、レア率上昇、特殊分岐、地図を消費する処理はありません。

画面には「湖・洞窟・地図・冒険アイテムは、今後のアップデートで」とあります。「宝の地図」の正式名称、ID、価格、入手確率、使用回数、効果倍率はコード上では確認できません。将来アイデアを現在の仕様として補完していません。

## 編集マップ

| 項目 | 場所・現状 |
| --- | --- |
| 機能 | 卵による進行は実装済み、一般アイテム機能は未実装 |
| 定義 | 卵は `types/appTypes.ts.UserProfile.fairy`。試作パーツは `app/(root)/avatar/model.ts` |
| 処理・主要関数 | `fairyProgressActions.receiveFairyEgg`、`fairyProgressModel.advanceFairyLogin`、試作equip |
| 保存 | usersのfairy / ローカルprofile_v2、試作アバター専用キー |
| 手動編集 | 卵説明はopeningDialogue、付与条件はfairyProgressActions、パーツ名称はOPTIONS |
| ショップ表示 | `FairyChamber.tsx.MENU` のshop、disabled分岐。価格一覧は存在しない |
| 同時確認 | `syncActions.ts`、`fairyRoomModel.ts`、`firestore.rules`、本体画像表示 |

新商品を追加する場合、編集対象の既存商品配列はありません。商品ID・種類・効果、価格と使用通貨、所持保存先、購入時の残高と所持品の同時更新、使用時の消費と効果、表示・認証の設計が先に必要です。これは今後の作業手順であり、実装済み仕様ではありません。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [types/appTypes.ts](<C:/dev/GitHub/Habit-World/types/appTypes.ts:62>) | fairy?: | 62 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:16>) | export async function receiveFairyEgg | 16 |
| [lib/fairyProgressModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressModel.ts:16>) | if (profile.fairy?.status | 16 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:9>) | export type FairyRoomState | 9 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:21>) | id: "shop" | 21 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:143>) | 湖・洞窟・地図 | 143 |
| [app/(root)/avatar/model.ts](<C:/dev/GitHub/Habit-World/app/(root)/avatar/model.ts:4>) | export const OPTIONS | 4 |
| [app/(root)/world/world-prototype.tsx](<C:/dev/GitHub/Habit-World/app/(root)/world/world-prototype.tsx:72>) | worldGift | 72 |
