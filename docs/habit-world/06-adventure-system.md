# 06 冒険システム

[目次](00-index.md) / [ポイント](03-point-system.md) / [アイテム](11-item-system.md)

## 現在の範囲

実装済みは、妖精を「森の奥」へ24時間送り出し、帰還時に20〜40APを受け取る処理です。冒険中に選択肢を操作するイベント、戦闘、アイテム発見、地図による解放は未実装です。

| エリアID / 名称 | 所要時間 | 必要体力 | 消費体力 | 報酬 | 解放条件 |
| --- | ---: | ---: | ---: | --- | --- |
| forest / 森の奥 | 86400000ms=24時間 | 80以上 | 20 | 整数20〜40AP | 妖精ready、部屋利用可能、他の冒険なし。エリア固有のレベル条件なし |
| 湖 | 定義なし | 不明 | 不明 | 不明 | 未実装。画面の今後の予定文のみ |
| 洞窟 | 定義なし | 不明 | 不明 | 不明 | 未実装。画面の今後の予定文のみ |

湖・洞窟にはエリアID、所要時間、確率、解放レベルはありません。推測で追加していません。

## 出発の具体条件と分岐

入口は `FairyChamber` の冒険パネル → `sync(area.id)` → `syncFairyRoom(uid,level,areaId)` → `departAdventure`。

| 判定場所 / 条件 | 結果 |
| --- | --- |
| `syncFairyRoom` で現在認証UIDと指定UIDが不一致、または匿名 | Googleログインを求めるエラー |
| プロフィールの妖精がreadyでない | 孵化後に来るよう求めるエラー |
| `departAdventure` でareaIdが定義にない | 「まだ準備中」のエラー |
| 時間経過処理後も `state.adventure` がある | 既に冒険中のエラー |
| 時間経過処理後の体力が80未満 | ハート4個以上を求めるエラー |
| 上記を満たす | 体力20減算、帰還時刻と報酬を確定、出発記録を追加 |

通常ポイント・AP・アイテムは出発に不要で、減算もありません。`sleeping` の独立検査ではなく、体力条件で出発を制限します。画面は保存データあり・体力条件・冒険なしに加え、処理中や通信エラー時にもボタンを無効化します。

## 報酬確率と計算式

`syncFairyRoom` はトランザクションの外で `now=Date.now()` と `random=Math.random()` を1回取得し、再試行中も同じ値を渡します。

```text
r = max(0, min(0.999999, random))
reward = minReward + floor(r × (maxReward - minReward + 1))
       = 20 + floor(r × 21)
```

`Math.random()` を一様な [0,1) とみなした場合、20〜40の各整数はそれぞれ `1/21 ≒ 4.7619%`。失敗抽選や「報酬なし」はなく、正常に帰還処理が確定すればこの範囲のAPを必ず得ます。これは乱数式から算出した理論確率で、実運用の観測率ではありません。乱数の端を丸める処理により0未満は20、1以上は40になります。

報酬は**出発時**に保存され、帰還時の再抽選はありません。途中で報酬範囲を変更しても、既に保存した旅の `reward` は変更されません。

| 抽選・イベント | 数値・状態 |
| --- | --- |
| AP整数の抽選 | 20〜40各1/21（上記の前提） |
| ランダムイベント発生確率 | 未実装。確率表はない |
| アイテム発見率 | 未実装。数値はコード上では確認できない |
| 特殊イベント・分岐抽選 | 未実装 |
| 宝の地図のドロップ率・効果補正 | 未実装。数値なし |
| 妖精の歩く/飛ぶ確率 | 別の画面演出。冒険イベントの確率ではない（10参照） |

## 帰還・結果・記録

`advanceRoom` が `now >= adventure.returnsAt` を確認し、`adventurePoints += trip.reward`、帰還記録を追加、`adventure=null` にします。以降は旅行がないので同じ報酬を再加算しません。時刻到達だけでバックエンドが自動実行する構成ではなく、部屋同期や習慣回復処理でモデルが進むときに確定します。

出発直後も時間経過による体力低下は続きます。ちょうど80で出発し24時間後、他の回復がなければ55になります（80−20−5）。冒険中の習慣達成を拒否する条件はなく、当日の回復も適用されます。

結果表示はAP残高と文字列記録です。記録は最大100件で、出発ID `depart-{now}`、帰還ID `return-{departedAt}`。帰還記録日時は実際の同期時刻ではなく予定帰還時刻です。専用のアイテム獲得一覧や詳細な冒険結果オブジェクトはありません。

## 保存データ

`users/{uid}.fairyRoom` 内（`FairyRoomState`）。

| フィールド | 内容 |
| --- | --- |
| adventure | 旅行なしならnull。旅行中は下記4項目 |
| adventure.areaId | 現在はforest |
| adventure.departedAt | 出発時刻（ミリ秒） |
| adventure.returnsAt | 予定帰還時刻（ミリ秒） |
| adventure.reward | 出発時に決まったAP |
| adventurePoints | 帰還済みAPの合計 |
| health / updatedAt | 体力と時間経過の起点 |
| records | `{id,at,text}`。冒険以外の部屋記録も共用 |
| sleeping / highestLevel / recoveryDay / recoveredHabitIds | 冬眠・成長記録・習慣回復と共用の管理項目 |

## 編集マップ

| 目的 | 定義・主要関数 | 同時に確認 |
| --- | --- | --- |
| エリア名・時間・体力消費・報酬範囲 | `lib/fairyRoomModel.ts.ADVENTURE_AREAS` | `FairyChamber.tsx` の約24時間等の固定文 |
| 必要体力 | `ROOM_RULES.adventureMinHealth` | ハート4個のエラー・説明文 |
| 確率分布 | `departAdventure` のreward式 | 上限下限と保存済みreward、部屋テスト |
| 帰還条件・AP加算 | `advanceRoom` | 再同期の重複防止、記録、習慣回復 |
| 保存・認証 | `lib/fairyRoomActions.ts.syncFairyRoom` | `types/appTypes.ts`、Firestoreルール |
| 記録文章 | `createRoom/advanceRoom/departAdventure` 内 | 現在は帰還文が「森の奥」で固定。エリア追加時に分岐が必要 |

新エリアを配列に追加すれば画面の一覧は増えますが、冒険中表示・帰還文・時間説明は森/24時間などの固定文字列が残っています。新エリアの完全対応にはそれらと保存済みareaIdへの対応を確認する必要があります。地図による解放やアイテム補正は編集できる既存設定がなく、新規設計が必要です。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:5>) | export const ADVENTURE_AREAS | 5 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:9>) | export type FairyRoomState | 9 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:30>) | export function advanceRoom | 30 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:63>) | export function departAdventure | 63 |
| [lib/fairyRoomModel.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomModel.ts:69>) | const reward = | 69 |
| [lib/fairyRoomActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomActions.ts:6>) | export async function syncFairyRoom | 6 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:57>) | const readyToLeave | 57 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:138>) | panel === "adventure" | 138 |
| [app/components/FairyChamberPreview.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamberPreview.tsx:13>) | if (areaId) next = departAdventure | 13 |
