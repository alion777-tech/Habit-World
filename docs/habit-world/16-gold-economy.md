# ポイント／ゴールド実装

2026-09-27更新。完了・取消の最新仕様は [17-completion-accounting.md](17-completion-accounting.md) を優先する。

- 累計獲得ポイント：`users/{uid}.economy.lifetimePoints`。レベル、ポイント到達、レベル到達称号はこちらを参照。
- ゴールド：`users/{uid}.economy.gold`。購入時に価格分を減算。ポイント獲得時には累計と同額を加算。素材売却ではゴールドのみ加算し、累計・レベルは変えない。
- 通常報酬：`economy.normalCredited`。完了状態に連動して増減。削除時は保持。特別報酬：`economy.credited` と獲得履歴で重複を防止。レベル：`economy.highestLevel` を保持し、取消でも下げない。
- 初回同期時に、現在の習慣point合計＋達成中の目標×100＋bonusPoints＋todoPointsを両残高の初期値として一度だけ引き継ぐ。過去の報酬は再計算しない。移行前に削除された履歴は復元できない。
- 既存の履歴、称号ID、購入履歴は保持。旧ブラウザー内のクローゼット・着替え購入も部屋の同期時に購入記録へ統合し、請求しない。
- ローカル利用では `profile_v2.economy`。ログイン時にはソース文書と残高を同一トランザクションで移行し、取込IDで再試行による二重加算を防止。
- `fairyRoom.gold` はUIへの返却用投影値であり、Firestoreへ残高として保存しない。
- 旧 `fairyRoom.coins` は1対1でゴールドへ一度だけ統合する。`economy.legacyCoinMigration.amount` に移行額を記録し、再送・再同期で二重加算しない。通常同期で旧フィールドを削除し、購入・売却・部屋同期にも旧通貨を引き継がない。移行額は累計獲得ポイントに加算しない。
- ブラウザー保存の旧ショッププレビューもゴールドへ統合する。本体の残高とは混ぜない。
- 古いバージョンのクライアントは引き続き旧フィールドを書き込む可能性があるため、運用時は新バージョンへ更新する。移行済み記録がある残高は再換算しない。
- クローゼットのみ価格を2,000ゴールドに変更。設定元は店舗Markdown表、実行時は生成済みJSONのpriceを参照。
- クローゼット購入前は初期の女の子モデルで固定。着替え・クローゼット・試着室はロック。既存購入者は解放状態を維持。
- ToDoは1ptに変更。習慣は2026-09-29の変更後の完了から10pt、既存の節目・称号・ログイン・目標報酬額は変更していない。夢の新報酬・毎日の全達成報酬も追加していない。冒険ルール・APも変更していない。

## 検証

`node scripts/test-economy.cjs` で 5,000→購入後3,000→500獲得後3,500ゴールド、累計5,000→5,500、レベル維持、保存失敗、再送、取消・削除、旧コインの一回移行・ゴールド売却、クローゼットロック、旧購入記録を検証する。Firestoreはトランザクションのテストダブルを使用し、本番データは操作していない。

関連するToDo・目標・習慣日付・ショップ・衣装・特別報酬・孵化・部屋・テストモードの回帰テストと `npm run build` も実施。

## 実装上の範囲

既存のクライアント＋Firestoreトランザクション構成を維持している。Firestoreの本人書込権限や、開発用ポイントのランキング除外は今回変更していない。受領情報はプロフィール内に保持するため、長期の大量履歴では独立コレクション化を検討する。既存データを安全に読むため各取引で習慣・目標を照合するので、件数に比例して読み取りが増える。

## 変更ファイル

- `app/(root)/avatar/shop-counter.tsx`
- `app/(root)/avatar/wardrobe-studio.tsx`
- `app/(root)/avatar/wardrobe.ts`
- `app/[locale]/page.tsx`
- `app/components/AutonomousFairy.tsx`
- `app/components/FairyChamber.tsx`
- `data/shop-catalog.json`
- `docs/habit-world/shops/README.md`
- `docs/habit-world/shops/dwarf.md`
- `docs/habit-world/shops/elf.md`
- `docs/habit-world/shops/fairy.md`
- `lib/fairyProgressActions.ts`
- `lib/fairyRoomActions.ts`
- `lib/fairyRoomModel.ts`
- `lib/goalActions.ts`
- `lib/habitActions.ts`
- `lib/habits/updateHabitFields.ts`
- `lib/profileActions.ts`
- `lib/shopModel.ts`
- `lib/specialPointActions.ts`
- `lib/syncActions.ts`
- `lib/todoActions.ts`
- `scripts/test-fairy-room-actions.cjs`
- `scripts/test-goals.cjs`
- `scripts/test-main-habit-date.cjs`
- `scripts/test-shops.cjs`
- `scripts/test-todo.cjs`
- `types/appTypes.ts`
- `docs/habit-world/16-gold-economy.md`
- `lib/economyActions.ts`
- `lib/economyModel.ts`
- `lib/legacyShopOwnership.ts`
- `scripts/economy-test-support.cjs`
- `scripts/test-economy.cjs`
