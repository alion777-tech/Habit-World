# Image generation prompts — mannequin prototype v2

Tool: built-in image_gen (not CLI). All final PNGs are copied into this folder. Existing wings at ../wings.png are reused from the previous prototype.

## Base → base.png

Use case: stylized-concept. Create a production 2D paper-doll BASE MANNEQUIN sprite for a cute storybook fairy dress-up game. Transparent alpha PNG, portrait 5:6 canvas. One SINGLE continuous complete body INCLUDING bald round head, face, short natural neck, shoulders, torso, arms, hands, legs and bare feet. Warm peach skin, navy clean outlines, soft pastel shading, large simple navy eyes, tiny friendly smile, slight cheek blush. Chibi roughly 2.7 heads tall. Gender-neutral toy doll, FULLY CLOTHED in a plain close-fitting ivory sleeveless unitard ending at upper thighs, modest and opaque, no anatomy detail. Straight front orthographic view, symmetrical relaxed A-pose arms diagonally downward 35 degrees from torso, palms forward. No hair, no wings, no accessories, no scenery, no shadow, NO checkerboard pixels. Center on canvas: head top at 12% canvas height, head bottom at 42%, feet at 90%; total body extends x27% to73%. Keep head and body organically connected with very short neck. Cute turquoise-haired reference fairy aesthetic but bald so separate hairstyles can be overlaid. Do not create disconnected parts or additional figures.

## Hair atlas — first pass

Input: generated base mannequin as geometry reference.

Use case: precise-object-edit. Reference image is the exact mannequin geometry for a paper doll game. Generate an EQUIPMENT-ONLY HAIR ATLAS: transparent PNG 3 columns x1 row, each cell same 5:6 portrait aspect as reference; whole canvas aspect 5:2. Three SEPARATE turquoise wigs: column1 short pixie, column2 long hair with side locks, column3 twin tails. NO HEAD, NO FACE, NO SKIN, NO EYES, NO EARS, NO BODY. Every non-hair pixel truly transparent alpha including the large face opening. Each wig must overlay the reference bald head precisely, same head scale in each cell. Reference head center x50% cell, scalp top4% cell height, scalp sides33% and67% width, chin35% height. Hair silhouette can go beyond scalp. Hair top2%, bangs stop around17% height so eyes remain visible, side locks frame the face without covering it. The face hole is transparent. Long hair and twin tails can extend down to50% height on SIDES only, keep center and torso transparent. Hair must remain at correct height near top of each otherwise empty FULL BODY canvas; bottom half of each cell is transparent empty padding. Fine dark navy outlines, soft cel shaded cyan/turquoise exactly the same art style. No labels, no grid lines, no checkerboard, no mannequin rendering. This is only removable hair, not finished characters.

## Hair transparency correction → hair.png

Input: first-pass hair atlas as edit target.

Use case: background-extraction. Remove ALL gray checkerboard pixels from this exact three-wig hair sprite sheet and replace with genuine PNG alpha transparency. Both outside wigs and inside face openings must be alpha zero. Keep only cyan hair and its navy contour. Preserve all three hair designs, their position, shape, size, same canvas aspect ratio and three equal cells. NO painted background, no gray grid anywhere, no black background, no faces. Produce transparent PNG cutouts.

## Clothing → clothes.png

Input: generated base mannequin as geometry reference.

Use case: precise-object-edit. Reference is exact mannequin geometry, generate CLOTHING ONLY transparent PNG sprite atlas 3 equal columns x1 row. Each cell same 5:6 portrait aspect as reference; whole canvas 5:2. Clothing worn by an INVISIBLE mannequin exactly matching reference pose/scale. Column1 green leaf sleeveless tunic and green shorts; column2 pink petal sleeveless dress; column3 lavender star sleeveless tunic dress with gold trim. Navy clean outlines, soft pastel cel shading. All three outfits cover the entire ivory unitard of reference: from shoulders y37% to shorts bottom y64%; waist x40..60%, shoulders x43..57% canvas, garment broadens to x37..63% at hem. Garment should have high round neckline and straps covering reference unitard straps. Neckline opening is transparent. NO HEAD NO FACE NO SKIN NO BODY NO ARMS NO HANDS NO LEGS NO FEET. Absolutely only removable garments. Shoulder holes and background are true transparent alpha. No shoes. Garments aligned at their original reference full-canvas position: top36% and bottom67% cell height. Top third and bottom quarter of EACH cell remain blank transparent. Do not enlarge clothing to fill canvas. No labels no grid no checkerboard. The three options need compatible identical neckline positions so they naturally sit on the same unchanged whole mannequin.

## Final geometry

Outputs did not exactly follow requested positions. The runtime manifest registers equipment against the unchanged base. Hair uses explicit atlas source rectangles to prevent neighboring sprites from bleeding into a selected wig. No body-image edits or face replacement occur during selection.

## Smaller girl head → girl-v2.png (built-in image_gen)

Input: original base.png.

Use case: precise-object-edit. Edit this exact complete girl fairy paper-doll base. Make ONLY the entire head including face and ears 15% narrower and 12% shorter, anchored at the bottom of chin. Keep the chin at its CURRENT position just above the shoulders: move the smaller head DOWN, never create a longer neck. Keep the neck very short and naturally joined. Keep eyes, cheeks and mouth proportionally smaller within smaller head. Girl version, retain friendly eyes and smile. Absolute invariants: canvas aspect 5:6, body from shoulders to feet unchanged in size, location, silhouette and relaxed A pose; same modest ivory opaque sleeveless unitard; exact same torso, arms, hands, legs, feet; body must not recenter or enlarge. No hair or wings or new equipment. Full single continuous head+face+body image, true transparent PNG alpha background, no checkerboard. Base reference head currently spans about x33%-67%, y4%-34%; smaller head should span about x35.5%-64.5%, y8%-34%, chin stays y34%; shoulders remain y36.5%, feet y95%. Preserve original palette and clean 2D illustration.

Follow-up transparency correction:

Use case: background-extraction. Remove the entire gray checkerboard background from this complete girl mannequin and replace it with genuine PNG alpha transparency. Preserve the exact complete figure, smaller head and face, short neck, body, unitard, pose, proportions, edges and canvas dimensions/placement. Every pixel outside the figure must be fully transparent, including between arms and torso and between legs. No painted gray or checkerboard anywhere. No resizing or recentering. Transparent background PNG.

## Boy → boy-v1.png (built-in image_gen)

Input: original base.png.

Use case: precise-object-edit. Create the BOY variant of this exact one-piece fairy paper-doll mannequin. Head, face, neck and entire body must remain ONE continuous image. Make entire bald head including face/ears 15% narrower and 12% shorter than reference, anchored at bottom of chin. Chin stays at original y34% just above shoulders; smaller head moves DOWN, neck stays very short. Boy face: friendly navy eyes with no long eyelashes, simple slightly straighter eyebrows, warm tiny smile, slightly less blush. Childlike male fairy, same cute style. The ivory opaque sleeveless mid-thigh unitard must remain. Preserve the EXACT original body outline, proportions, position, relaxed A pose, shoulders/arms/hands/legs/feet and clothing fit from shoulders down for interchangeable equipment. Flat modest clothed torso. Never change body scale or center. Canvas portrait 5:6 same as reference. Head should span x35.5%-64.5%, y8%-34%, shoulders y36.5%, feet y95%. No hair, no wings, no props, no text. True transparent alpha PNG, no checkerboard. No separate face piece, no disconnected neck. This asset will be used beneath the same independent clothing and wigs as the girl.

Follow-up transparency correction:

Use case: background-extraction. Remove ALL gray checkerboard from this boy paper-doll mannequin and replace with genuine PNG alpha transparency. Preserve the exact figure pixels, face, smaller bald head, short neck, pose, body, ivory unitard, same framing and dimensions. Transparent between arms and torso, between legs, and outside silhouette. NO painted gray, no checkerboard, no shadows, no recentering. Keep only the full single-piece boy mannequin on transparent background.

The percentages above are prompt targets, not a guarantee of exact generated dimensions. Complete mannequin registration is adjusted in model.ts to match the shared clothing shoulder and foot anchors.

## v3: neutral faceless base (built-in image_gen)

Input: girl-v2.png. Final asset neutral-v3.png.

Precisely edit this existing transparent full-body paper doll. REMOVE ONLY all facial features: eyes, eyelashes, eyebrows, nose mark, mouth, blush, cheek lines. Fill the entire face interior with smooth natural peach skin shading. It must be a FACELESS neutral mannequin. Preserve the exact head outline, jaw, ears, short neck, body, ivory unitard, hands, legs, pose, size, framing and canvas. Do not resize or recenter anything. No new features, no hair, no wings. True transparent PNG background, preserve alpha, no checkerboard. Head and body remain one connected image.

Transparency correction (first retry):
Remove all gray checkerboard pixels and replace with actual alpha transparency. Keep this exact faceless mannequin unchanged, full body same canvas and position. No eyes, no eyebrows, no mouth, no nose, no cheek color. The skin remains plain. Only the complete mannequin silhouette is opaque, all outside pixels and spaces between limbs must be transparent PNG. Do not recenter, resize or draw any checkerboard or background.

Transparency correction (second retry):
BACKGROUND REMOVAL / transparent cutout. This image contains an unwanted painted gray checkered background. Extract the single faceless mannequin as a transparent PNG sticker. The OUTPUT MUST HAVE REAL ALPHA CHANNEL TRANSPARENCY, not a picture of a checkerboard. Delete the gray squares entirely. Preserve the central character including blank peach face, ivory unitard and limbs in exact location and scale. Entire canvas outside silhouette alpha=0. Keep full canvas dimensions. No floor no shadow no texture no background no added facial marks. Deliver transparent cutout.

## v3: independent feature atlas → features.png

Production transparent PNG sprite atlas of INDEPENDENT facial feature parts for a cute storybook fairy paper doll. EXACT GRID: 2 equal columns and 4 equal rows, square canvas. Each cell twice as wide as tall. Do not draw a face, head, skin, hair, ears or silhouette. ONLY floating isolated features on genuine transparent alpha background. Row1: two complete symmetrical PAIRS OF EYES, left cell gentle large navy blue sparkling eyes with small lashes, right cell lively slightly narrower teal eyes without lashes. Row2: two PAIRS OF EYEBROWS, left gently arched dark navy brows, right straighter confident navy brows. Row3: two tiny NOSES, left tiny peach dot, right tiny peach curved nose mark. Row4: two MOUTHS, left small dark terracotta closed smile, right small open joyful smile with pink interior. Centre each feature or pair in its own cell, clear empty padding between cells. Eye pairs each fill 75% cell width, 60% cell height. Eyebrow pairs fill 75% width, 20% height. Nose fills 10% width 20% height. Mouth fills 25% width 30% height. Soft clean cel-shaded 2D chibi art, navy contours. No labels, no grid lines, NO checkerboard pixels, no background color, no additional elements.

Cheek colors are code-rendered soft gradients in the preview and PNG exporter; they are not painted on the base. Hair positioning is adjusted in the manifest without regenerating its art.
