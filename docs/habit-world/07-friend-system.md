# 07 フレンドシステム

[目次](00-index.md)

## 現在の仕組み

本体で動くのは承認不要の一方向フォローです。`FriendView` のタブは feed / following / search。非匿名アカウントで利用し、表示名未登録なら登録画面を出します。公開・非公開を選んでプロフィールを保存します。

| 機能 | 条件と結果 | 主要処理 |
| --- | --- | --- |
| 検索候補取得 | `publicUsers` のisPublic=trueを200件ずつ全ページ取得 | `socialActions.getDiscoveryUsers` |
| 検索 | 自分以外の公開ユーザー。名前と、公開設定された夢に一致 | `friendDiscovery.rankSearchUsers` |
| 表記揺れ | NFKC、小文字、カタカナ→ひらがな、空白整理 | `normalizeSearchText` |
| 並び順 | 完全一致400、前方300、部分200、曖昧100。名前一致は+10。同点はUID順 | `matchScore`、`rankSearchUsers` |
| 曖昧一致 | 検索語3文字以上。3〜5文字は編集距離1、6文字以上は2まで | `distance`、`matchScore` |
| おすすめ | 自分とフォロー済みを除外。理由数の多い順、同点UID、最大20人 | `recommendUsers` |
| 夢が似ている | 両者の公開条件を満たし、2文字組の共通数>=2かつ類似度>=0.35 | `similarDream` |
| 共通の特別ポイントID | 自分が公開かつearnedTitlesに共通IDがある | `recommendUsers` のsharedTitles |
| フォロー・解除 | `publicUsers/{自分UID}.following` に追加・削除。承認なし | `followUser` / `unfollowUser` |
| フォロー一覧・フィード | followingのIDごとに公開文書を取得。夢達成と公開対象の目標達成を返す（ユーザーごとに最新1件） | `getFollowingUsers` |
| 公開目標 | 公開設定ONかつ秘密ではない目標が公開対象。カード表示のみ未達成上位3件 | `goalModel.publicGoalList`、`goalActions.syncPublicGoals` |

推薦理由がない候補も一覧に入ります。「おすすめに表示された＝夢が似ている」とは限りません。検索結果の順は実績ランキングではありません。

## 目標の公開・秘密・達成通知

- プロフィールの「目標を公開する」は公開対象を決める設定で、目標数を制限しません。プロフィール全体の非公開設定も尊重します。
- 目標ごとの secret: true は全体設定より優先します。秘密の目標の内容は公開文書へコピーせず、カード・検索・近況に表示しません。
- publicGoals はプロフィールカード用のプレビューだけを保存します。公開対象の未完了目標を現在の順番で最大3件表示します。
- 公開対象の目標は順位にかかわらず、未完了から完了になったとき recentAction に目標ID・タイトル・日時を記録します。4件目以降も対象です。
- 秘密への変更、公開設定OFF、完了の取り消し、目標削除で、該当する目標達成通知を取り下げます。設定変更だけでは過去の達成通知を新規生成しません。
- 秘密の目標は本人の一覧に残り、通常目標とは別の順序です。下に表示する場合は通常の未完了目標の後、完了済み目標の前です。鍵を外すときは確認します。
- 目標達成にもハートでいいね・取り消しができます。プロフィール表示のいいねは受け取った合計です。

## 旧フレンド申請との違い

`lib/friendActions.ts` に申請・承認・拒否・解除が残っています。しかし現在の `FriendView` はこのファイルをimportせず、`socialActions.ts` を利用します。

旧申請は `users/{相手UID}/friendRequests/{自分UID}`、承認は自分の `friends/{申請者UID}` のみ作成し申請を消します。双方向の友達登録処理ではありません。状態は一部実装（関数・ルールはあるが現在UIと未接続）。将来フォロー機能を編集するときに旧 `searchUsers` を誤って変更しないでください。

## 公開表示と保存範囲

`discoveryProfile` は現行 `showDream/showGoal` がbooleanなら旧 `showDreams/showGoals` より優先し、非公開項目を表示用データから除きます。最終ログインは `showLastLogin` がtrueのときだけ表示用に返します。

ただし、DBの `publicUsers` はログインユーザー全員が読めるルールです。画面側で隠すことと、DBに保存されていないことは異なります。`saveUserProfile` の汎用同期や `updateLastLogin` は公開文書へも書くため、公開範囲変更時は [12](12-data-and-save-system.md) を確認してください。

## 編集マップ

| 項目 | 場所 |
| --- | --- |
| 定義 | `types/appTypes.ts.UserProfile`、`friendDiscovery.ts.Recommendation` |
| 画面 | `app/components/FriendView.tsx` |
| 処理 | `lib/socialActions.ts`、`lib/friendDiscovery.ts`、`lib/goalActions.ts` |
| 保存 | `publicUsers/{uid}` のfollowing/公開プロフィール/publicGoals/recentAction |
| 手動編集 | 検索重み・推薦閾値はfriendDiscovery、取得ページ件数はsocialActions、表示文はmessagesのFriend |
| 同時確認 | `ProfileView.tsx`、`profileActions.ts`、`goalModel.ts`、`firestore.rules`、`scripts/test-friend-discovery.cjs` |

フレンド登録の `handleRegister` 内で `useTranslations` が呼ばれている点は現行コード上で確認できます。イベントハンドラー内のHook呼出しは動作確認が必要な箇所です。この調査では修正していません。

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
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
