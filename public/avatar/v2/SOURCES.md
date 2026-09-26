# アバタール素材 v2

出典はユーザー指定の `C:/Users/k-003/Downloads/アバター/`。
旧アバターの画像・スプライトは、この画面では参照しない。

| 使用先 | 元画像 |
| --- | --- |
| 基本パーツ4種 | ベース/Gemini_Generated_Image_h9snu7h9snu7h9sn.jpg |
| 髪型6種 | 髪型/Gemini_Generated_Image_7r70la7r70la7r70.jpg |
| 髪飾り9種 | 髪飾り/Gemini_Generated_Image_ibdn96ibdn96ibdn.jpg |
| 衣装12種 | 衣装/Gemini_Generated_Image_em36ttem36ttem36.jpg、Gemini_Generated_Image_afvkhdafvkhdafvk.jpg |
| 羽6種 | 羽/Gemini_Generated_Image_791ft7791ft7791f.jpg |
| 衣類店 | Gemini_Generated_Image_wzc57gwzc57gwzc5.jpg |
| エルフ店 | Gemini_Generated_Image_qjwwddqjwwddqjww.jpg |
| ドワーフ店 | Gemini_Generated_Image_i4w67ti4w67ti4w6.jpg |

パーツは imagegen の画像編集で元の絵を参照し、背景、文字、参考人形、他カテゴリに属する部分を除去した透過PNG。元画像の単純な切り抜きではなく、画像編集による補完を含む。
ショップ3枚は元画像から画像編集で商品メニュー・価格・UIを消し、店内背景を補完した `*-clean.png` を使用。元画像は保持。画面内の新しい商品案内はHTMLで重ねている。
`scripts/prepare-avatar-v2.cjs` が編集済みシートを切り分け、`sprites.json` に配置を出力する。
納品用の各PNGは `parts/` に含まれるため、通常のアプリ起動に再生成は不要。
