# ハビットワールド：ゲーム画面プロトタイプ

> 2026-09-15：試作画面を開くには、既存Googleログインで登録済みTEST01〜03として認証し、本体メニューでテストモードをONにしてください。開発環境でも必要です。試作の中身・保存方法は維持しています。[登録・操作・権限の手順](docs/habit-world/14-test-and-development-system.md)を参照。


起動：`npm run dev` → http://localhost:3000/world

既存の React / Next.js を再利用し、ゲーム画面は `app/(root)/world` に分離。
Firebase、既存の習慣管理、認証、データモデルへの変更はありません。
入力・達成は画面内の仮状態です。再読み込みするとリセットされます。

## 体験できること

大樹 → つぼみ → つぼみの家 → 家具のない室内 → 光 → 妖精リリの誕生 → 夢の入力 → 目標の入力 → サンプルミッションの達成 → ゲーム世界。

ゲーム画面ではミッション、夢の道しるべ、妖精の状態、家への出入り、物語の再体験が操作できます。
ミッションごとに10ポイントと30XP。初期XP120から3件達成すると210XP・Lv.3になります。
精霊王、着せ替え、冒険は将来の設定で、今回の実装対象には含めていません。

## 確認結果

- ブラウザーで物語全シーンを通過、夢・目標入力、最初のミッション達成、メイン画面への移動を確認。
- 空入力では進めないこと、達成済みボタンが無効になることを確認。
- 3件達成で30ポイント・Lv.3へ更新されることを確認。
- 390×844のスマートフォン幅でメイン画面とミッション操作を確認。
- TypeScript、プロトタイプ対象のESLintチェック成功。

## 素材

`public/world` に保存。内蔵image_genを使用。画像生成API用CLIは使用していません。
妖精はユーザー提供画像を参照して生成。身体・髪・服・翼は今回1枚の代表素材で、将来は同じ配置基準のレイヤー素材へ差し替えます。

生成プロンプトの内容：

- tree.png：Wide 16:9 hand-painted cozy fantasy game background. Enormous ancient magical tree, emerald teal canopy, warm brown trunk, dappled sunlight, misty woodland, grassy clearing, path and foreground foliage. Empty branch for a future bud home. No houses, characters, UI or lettering.
- house.png：Transparent game asset. Closed pink peach rosebud is itself a dwelling. Overlapping petals form walls, green sepals form the base, glowing round window and arched wooden door integrated into petals. Hand-painted luminous storybook style. No surroundings or lettering.
- interior.png：Wide 16:9 empty rosebud house interior. Peach blush petal walls and domed ceiling, organic circular wooden floor, round window, arched doorway to woodland, warm sunbeams. No furniture, objects or characters.
- fairy.png：Reference-based recreation of the provided fairy. Transparent background, turquoise bob hair, pink dress, pastel rainbow butterfly wings, navy outlines, pink antenna tips, friendly face and consistent small proportions. Whole body, no checkerboard or watermark.
- bud.png：Single closed pink rosebud with green sepals and a short stem. Transparent game sprite, delicate overlapping petals, warm golden glow, hand-painted storybook style. No door, window, architecture or surroundings.

世界の背景とキャラクターは生成画像、光の粒・浮遊・成長・画面遷移はCSS、ゲームUIはHTMLで構成しています。
