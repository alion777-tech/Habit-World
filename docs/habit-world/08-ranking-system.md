# 08 ランキングシステム

[目次](00-index.md)

状態：一部実装。種類の切替と自分の実績表示は実装済みですが、他ユーザー取得・順位計算・上位5人表示は未実装です。

`FairyChamber` の `MENU` からrankingパネルを開き、`RANKINGS` の3項目を切り替えます。

| ID | 表示名 | 現在の表示値 | 将来予定として表示される文言 |
| --- | --- | --- | --- |
| growth | 総合獲得ポイント | 本体から渡されたtotalPoints、Lv | 総合ポイントで上位5人 |
| login | 累計ログイン日数 | loginDays | 累計日数で上位5人。連続日数ではない |
| adventure | 冒険ポイント | fairyRoom.adventurePoints | APで上位5人 |

「ランキングは準備中」「現在はあなたの実績を表示しています」が明示されています。順位、同点処理、集計期間、参加公開設定、リセット、報酬、ランキングAPI・専用コレクションはコード上では確認できません。表示文の上位5人を実装済みの検索制限値と扱わないでください。

## 編集マップ

| 項目 | 場所 |
| --- | --- |
| 機能 | 個人実績をランキング予定画面として表示 |
| 定義ファイル | `app/components/FairyChamber.tsx` の `MENU/RANKINGS` |
| 処理・主要関数 | `FairyChamber`、`ranking` state、`panel === "ranking"` の表示分岐 |
| データ保存 | ランキング専用保存なし。総合点は本体で集計、loginDays/APはusers文書 |
| 手動編集場所 | `RANKINGS` のlabel、各分岐の説明と実績表示 |
| 同時確認 | `app/[locale]/page.tsx` の集計、`fairyProgressModel.ts`、`fairyRoomModel.ts`、公開する場合のルール設計 |

`friendDiscovery.rankSearchUsers` は名前・夢の検索適合度順です。妖精のランキング取得処理ではありません。`TitleView` も自身のレベル・特別ポイント一覧であり、他人との順位表ではありません。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:27>) | const RANKINGS | 27 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:124>) | panel === "ranking" | 124 |
| [lib/friendDiscovery.ts](<C:/dev/GitHub/Habit-World/lib/friendDiscovery.ts:60>) | export function rankSearchUsers | 60 |
| [app/components/TitleView.tsx](<C:/dev/GitHub/Habit-World/app/components/TitleView.tsx:17>) | export default function TitleView | 17 |
