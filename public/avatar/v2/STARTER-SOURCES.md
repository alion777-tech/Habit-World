# 初期パーツの出典と編集

元画像: `C:/Users/k-003/Downloads/アバター/初期/` 内の `Gemini_Generated_Image_ky02hvky02hvky02.jpg`、`Gemini_Generated_Image_sk2q1xsk2q1xsk2q.png`、分解素材 `cho1ibcho1ibcho1`、`xevs6pxevs6pxevs`、`ugq1lzugq1lzugq1` のPNG。

内蔵 image_gen を使用。絵柄と色を参考に市松模様を除去し、触角を髪から独立させ、6パーツの透過シートとして編集。元画像は変更していない。完成画像と完全なピクセル一致ではなく、既存基本パーツに合わせる独立素材。

保存先: `public/avatar/v2/starter-atlas.png`。各パーツは `public/avatar/v2/parts/*-starter-*.png`。抽出と配置は `scripts/prepare-avatar-starter.cjs`。

## 使用した最終プロンプト

Use case: background-extraction / precise-object-edit. Produce ONE transparent RGBA sprite atlas, landscape 3 columns x 2 rows, six isolated equally spaced parts extracted faithfully from attached fairy artwork. Input 1 boy finished fairy, input 2 girl finished fairy, input 3 detached wings, input 4 detached girl hair, input 5 detached dress. Preserve exact cute dark navy outlines, turquoise hair highlights, pink dress, sage boy tunic with two star buttons and shorts, rainbow pastel wings. Layout top row: boy short turquoise hair WITHOUT face or antenna; girl turquoise bob hair WITHOUT face or antenna (transparent face opening); pair of thin navy antenna with round pink tips ONLY. Bottom row: boy sage green tunic and shorts as one outfit WITHOUT ANY skin, hands, legs, face or hair, transparent neck hole; girl pink sleeveless dress with pink scalloped collar ONLY, NO arms or outlines of arms, transparent neck hole; pair of full pastel butterfly wings. Full parts with generous margins wholly within each cell, no overlapping cells. TRUE transparent background alpha 0, absolutely NO checkerboard pixels, no text, no labels, no watermark, no mannequin or body. These parts will be programmatically cropped and combined on existing avatar base. Do not redesign.
# ショート差し替え（2026-09-16）

初期ショートは既存の `parts/hair-short.png`（旧ショップのショート）に統合。アトラスの旧ショートは描画には使わない。既存の画像を再利用し、新規生成・再描画はしていない。
