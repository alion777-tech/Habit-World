# 10 セリフ・会話システム

[目次](00-index.md)

## どこで・誰が・どのデータを話すか

| 場所・状況 | 話者・内容の保存場所 | 表示方法・状態 |
| --- | --- | --- |
| 本体の通常画面（妖精の部屋以外） | 妖精。`data/fairy/ja.json` / `en.json` | `AutonomousFairy` → `FairySpeech` → `selectDialogue`。タップ/Enter/Space、成功イベントで抽選。実装済み |
| 妖精の部屋 | 命名済みの妖精。`FairyChamber.tsx.ROOM_LINES` | タップ時に6文から抽選。共通JSONは使わない |
| 部屋へ入った初期表示 | 妖精。`FairyChamber` のline初期値 | 固定「おかえりなさい。今日はお部屋で、ゆっくりしていってね。」 |
| 冒険中 | 妖精。`FairyChamber` のspeech内trip分岐 | 固定「いま、森の奥を探検しているよ。帰ったらお話を聞いてね！」。森内の別マップ画面はない |
| 冬眠中 | 妖精。speech内sleeping分岐 | 固定「すぅ、すぅ……。また一緒に、小さな一歩から。」 |
| 冒険開始・帰還 | `fairyRoomModel.ts.departAdventure/advanceRoom` の文字列 | 部屋の記録文。ランダム発話ではない |
| 孵化 | `FairyRoom.tsx` のphase分岐 | 固定の説明・状態文。共通会話カテゴリではない |
| 精霊王の導入 | `data/openingDialogue.ts.openingDialogue` | 配列順。`OpeningTutorial`。ランダムではない |
| `/world` 試作 | リリ・ナレーション。`world-prototype.tsx.chapters`、reaction、各JSX | 固定の物語、ミッション成功・タップの反応。本体と別 |
| `/avatar` 試作 | `studio.tsx` の決定dialog内 | 固定「これから、一緒に歩いていこう。」 |
| アイテム発見・エリア発見 | 共通JSONにitemEarned/placeDiscoveredあり | 定義のみ。現行UIの通知呼出しが見つからず一部実装 |
| 妖精王の部屋 | `data/fairy-king-dialogue.json` の `fairyKingWords` / `fairyKingAdvice` | お言葉15件・5相談カテゴリー各10件。直前と同じ文章を避けてランダム表示 |

共通妖精は本体でオープニング非表示・読み込み完了・プロフィール一致・fairy.status=ready・部屋以外の場合にマウントされます。`context` は当日の予定習慣数、完了数、直近の習慣連続日数等で、**現在エリアIDや現在タブIDは渡していません**。「湖限定のランダム台詞」を設定する既存のキーや分岐はありません。

## 共通セリフの選択規則

定義と関数：`lib/fairy/dialogue.ts` の `Category/DialogueContext/categories/timeCategory/loginCategory/selectDialogue`。

1. `event` があればその1カテゴリだけを選びます。
2. なければ有効な `login` がある場合その1カテゴリ。
3. それ以外はnormal＋現在の時間帯を必ず候補にし、放置・長時間利用・行動・進捗・連続条件を足します。
4. 候補カテゴリを等確率で1つ選び、そこから履歴による除外後の文を等確率で1つ選びます。

全文章を平らにして等確率にはしません。カテゴリがK個、選ばれたカテゴリの使用可能文がN個なら、その文の理論確率は1/K×1/N（カテゴリ間の同文を考慮しない場合）。固定の「冒険セリフ20%」等はありません。

日本語は `locale.startsWith("ja")`、それ以外は英語辞書。選択カテゴリに英語配列がないときは英語normalに戻ります。英語辞書は9カテゴリのみで、未翻訳カテゴリを日本語同カテゴリで読むわけではありません。

履歴は最後80件。同じ文章を直前に再表示せず、まず24時間以内に使った文を除外。尽きた場合は直前文と60秒以内の文を除外して再候補化。それも尽きた場合はnullで発話しません。これは報酬判定とは独立しています。

## カテゴリと条件（共通JSON）

すべての日本語カテゴリは `data/fairy/ja.json` の同名プロパティ（文字列配列）です。normalは8文、他は各6文、合計43カテゴリ260文。英語は `data/fairy/en.json` にnormal6文、morning/night/lateNight/habitCompleted/allDone/goalCompleted/levelUp/dreamAchieved各3文、計30文。

| 配列名 | 選ばれる条件・現行接続 |
| --- | --- |
| normal | 通常候補に常時含む |
| morning | 日本時間5:00〜8:59 |
| forenoon | 9:00〜11:59 |
| noon | 12:00〜13:59 |
| afternoon | 14:00〜16:59 |
| evening | 17:00〜18:59 |
| night | 19:00〜22:59 |
| lateNight | 23:00〜翌4:59 |
| firstLogin | 会話用ローカル履歴に前回来訪時刻がない |
| shortReturn | 同じ日本日付内の再訪 |
| dailyLogin | 日付差1〜6で、会話用連続日数が2未満 |
| consecutiveLogin | 日付差1〜6で、会話用連続日数2以上 |
| returnLogin | 前回来訪から日本日付差7〜29日 |
| longAbsence | 前回来訪から日本日付差30日以上 |
| notStarted | total>0かつcompleted=0 |
| allDone | total>0かつcompleted>=total。進捗の最優先 |
| almostDone | 全完了未満で80%以上 |
| goodProgress | 80%未満で50%以上 |
| oneDone | 上記の割合条件未満で1件完了 |
| multipleDone | 上記以外の途中進捗 |
| streak | context.streak>=2 |
| idle | 操作がない時間が120000ms以上（直前の放置時間も使用） |
| longSession | マウント後3600000ms以上 |
| peek | 妖精のdata-actionがpeek |
| rest | data-actionがrest |
| playing | data-actionがwalk |
| nearby | data-actionがenter |
| firstHabit | 本体でチェック前の全習慣履歴が空。成功した初回習慣チェック |
| habitCompleted | 習慣成功時、初回・7日・30日・レベル上昇の優先条件に該当しない |
| streak7 | 今日の習慣達成でdailyStreak=7。firstHabitより優先度は低い |
| streak30 | 今日の習慣達成でdailyStreak=30。firstHabitより優先度は低い |
| levelUp | 今回の習慣pointDeltaによりレベル上昇。初回・30日・7日が優先 |
| firstGoal | DreamViewで達成を成功させ、変更前の目標にdoneが1件もない |
| goalCompleted | それ以外の目標達成成功 |
| dreamAchieved | 本体の夢達成・確認・保存の後 |
| personalBest | データのみ。通常カテゴリ選択にも現行announceFairy呼出しにも接続なし |
| pointsEarned | データのみ。ポイント獲得アラートと同一機能ではない |
| titleEarned | データのみ。特別ポイント獲得処理からの呼出しなし |
| energetic | データのみ。体力による選択なし |
| sleepy | データのみ。部屋の冬眠固定文とは別 |
| placeDiscovered | データのみ。エリア発見処理なし |
| itemEarned | データのみ。アイテム発見処理なし |
| fairyGrowth | データのみ。成長記録からの通知なし |

たとえば全2習慣中1件完了なら50%のgoodProgressになり、oneDoneは選ばれません。初回習慣判定は生涯受領フラグではなく現存履歴の有無、初回目標判定も生涯履歴ではなく現在のdoneです。

## 発話イベントの接続

`lib/fairy/events.ts.announceFairy(category)` はブラウザーの `fairy-dialogue` カスタムイベントを送ります。`FairySpeech` が日本語辞書に存在するカテゴリか確認し、15秒有効なpendingとして保存して `show()` を呼びます。

| 発信元 | 優先順・条件 |
| --- | --- |
| `app/[locale]/page.tsx.handleToggleHabit` | firstHabit → 今日のstreak30 → 今日のstreak7 → levelUp → habitCompleted。取消では発信しない |
| `app/components/DreamView.tsx` の達成操作 | firstGoal / goalCompleted |
| 本体 `handleDreamAchieved` | 保存と最近の活動更新後dreamAchieved |

特別ポイント・ToDo・冒険帰還にはこのイベントを送る処理が見つかりません。初期データ読込で過去達成を祝うイベントも送りません。

`AutonomousFairy` の移動は自動ですが、通常発話は自動定期実行ではありません。タップ等で `speechRequest` を増やすか、上記イベントで発話します。60秒タイマーは来訪時刻の保存用です。文の表示は4.5〜10秒（文字数×150msを範囲内に制限）、その後300msで非表示。タブ非表示・妖精away時はshowが何もせず、pendingの有効時間内に別のshow契機がないとイベントは表示されません。

来訪時刻・会話履歴のキーは `habit-world:fairy:v1:{account}`、accountなしはlocal。`lastVisit/days/history` を保存します。これはFirestoreのログイン報酬日数ではなく、そのブラウザーの会話履歴です。ログイン候補はマウント後60秒有効で、1回話すと解除されます。

## 妖精の部屋の6文

`app/components/FairyChamber.tsx` の `ROOM_LINES` に直接保存されています。

| 添字 | 文章 |
| --- | --- |
| 0 | ここ、私のお部屋なんだよ！ 葉っぱのハンモック、お気に入りなんだ。 |
| 1 | 今日は何をして遊ぼうかな？ あなたのお話も聞かせてね。 |
| 2 | 小さな一歩を重ねるたびに、私もちょっとずつ成長しているよ。 |
| 3 | 次はどこへ冒険に行こう？ 森の奥から、いい風が吹いてくるね。 |
| 4 | 新しい服、着てみたいな。どんな色が似合うと思う？ |
| 5 | いつでも、あなたのペースで。また会えてうれしいな。 |

`talk` は `(lastLine + 1 + floor(random × (length−1))) % length`。直前の添字を避け、通常は残り5文各20%。初回はlastLine=-1なので添字0〜4だけが各20%で、添字5は初回に出ません。このコード上の偏りも現状として記録します。共通の24時間履歴とは別で、部屋の直前添字は永続保存しません。冬眠中はタップしてlineが変わっても固定の睡眠文が優先します。

## 自動移動の確率（会話状況に影響するが冒険ではない）

`AutonomousFairy.next` の一般抽選分岐はfly30%、hover15%、rest15%、land20%、leave20%。これは一般分岐を通るときの確率で、全フレーム・全状態の割合ではありません。leave→away→peek→enter、land→walk→takeoff→hoverは固定遷移。左右端の選択は各50%。移動状態を共通会話が参照しますが、場所・エリアの抽選ではありません。

## 初心者向け：通常セリフを追加する

1. `data/fairy/ja.json` を開きます。
2. 上表を見て目的の配列名を検索します。通常なら `"normal"`、習慣達成なら `"habitCompleted"` です。
3. 既存の配列の末尾にカンマを付け、二重引用符で囲った文を追加します。以下は形式例であり、今回追加した実データではありません。

```json
"normal": [
  "既存の文章",
  "今日の小さな楽しみを聞かせてね"
]
```

4. 実際には「既存の文章」に置き換えず、既存配列を残して1文足してください。JSONの最後の要素の後にはカンマを置きません。文中の二重引用符は `\"`、改行は `\n` のように記述します。
5. 英語も必要なら `data/fairy/en.json` の同じキーに英語文を追加します。欠けたキーは現在normalに戻ります。
6. `node scripts/test-dialogue.cjs`、`node scripts/test-fairy-speech.cjs` で既存検証を行い、対象条件でタップして表示を確認します。直近履歴があると新文の表示は確率次第です。

既存の検証は日本語について各カテゴリ6文以上、カテゴリ内重複なし、1文80文字以下、一人称や責める語の一部を禁止しています。`scripts/fairy-data.cjs` には候補JSONの検証・新しいレビュー用ファイルへの統合機能があります。これはオフライン補助であり、実行時にAIから台詞を生成する機能ではありません。

## 初心者向け：部屋・精霊王・新しいエリア

- **部屋**：`FairyChamber.tsx` を開く → `const ROOM_LINES = [` を探す → 既存文字列の行をまねて `"新しい文",` を追加。最低2文は維持してください。1文だと直前回避式が意図を失います。初期挨拶・冒険中・睡眠中は配列外の固定文を編集します。
- **精霊王**：`data/openingDialogue.ts` を開く → `openingDialogue` で目的のidを探す → textを編集。ログイン済み文はsignedInTextも確認。tab/target/idは画面接続・特別演出に使うので、文章変更だけなら保持します。
- **孵化演出**：`FairyRoom.tsx` → phaseがwaiting/shake/open/nameの分岐を探す。報酬表示は計算モデルの値と合わせます。
- **新エリア専用**：既存のエリア別辞書はありません。JSONにforest等を足すだけでは選ばれません。`DialogueContext`、`categories`、エリアを渡す呼出元、日英データ、テストを新規に接続する設計が必要です。部屋会話と共通会話のどちらに実装するかも先に決めます。
- **既存の未接続カテゴリを使う**：実際の保存成功後に `announceFairy("itemEarned")` 等を呼ぶ接続が必要です。アイテム機能自体がない現状では、文を編集しても獲得イベントは生まれません。

## 編集マップ

| 変更対象 | 定義・処理 | 保存・同時確認 |
| --- | --- | --- |
| 共通文章 | data/fairy両JSON | dialogue.tsのCategory/フォールバック、既存テスト |
| 状況条件・抽選・履歴制限 | `dialogue.ts` | `FairySpeech.tsx`、本体context |
| 発話時点・表示秒数 | `FairySpeech.tsx`、`events.ts`、各announce呼出元 | 失敗時・取消・初期ロードの扱い |
| 部屋文・抽選 | `FairyChamber.tsx.ROOM_LINES/talk` | trip/sleepingの固定表示、部屋再マウント |
| 冒険記録文 | `fairyRoomModel.ts` | 保存済みrecordsの文は変更されない |
| 導入文 | `openingDialogue.ts` | `OpeningTutorial.tsx`、data-opening属性 |
| 試作文 | `world-prototype.tsx` / `studio.tsx` | 本体に反映されないこと |

## コード参照（調査時点）

| ファイル | 確認する識別子・場所 | 行 |
| --- | --- | ---: |
| [data/fairy/ja.json](<C:/dev/GitHub/Habit-World/data/fairy/ja.json:2>) | "normal" | 2 |
| [data/fairy/en.json](<C:/dev/GitHub/Habit-World/data/fairy/en.json:2>) | "normal" | 2 |
| [data/openingDialogue.ts](<C:/dev/GitHub/Habit-World/data/openingDialogue.ts:3>) | export const openingDialogue | 3 |
| [lib/fairy/dialogue.ts](<C:/dev/GitHub/Habit-World/lib/fairy/dialogue.ts:19>) | export function categories | 19 |
| [lib/fairy/dialogue.ts](<C:/dev/GitHub/Habit-World/lib/fairy/dialogue.ts:38>) | export function selectDialogue | 38 |
| [lib/fairy/dialogue.ts](<C:/dev/GitHub/Habit-World/lib/fairy/dialogue.ts:53>) | export function loginCategory | 53 |
| [lib/fairy/events.ts](<C:/dev/GitHub/Habit-World/lib/fairy/events.ts:4>) | export function announceFairy | 4 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:33>) | const key = | 33 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:51>) | const show = | 51 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:85>) | const event = | 85 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:90>) | const next = | 90 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:179>) | onClick={() => setSpeechRequest | 179 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:468>) | announceFairy(first | 468 |
| [app/components/DreamView.tsx](<C:/dev/GitHub/Habit-World/app/components/DreamView.tsx:314>) | if (newDoneState) announceFairy | 314 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:10>) | const ROOM_LINES | 10 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:81>) | const talk = | 81 |
| [app/components/FairyChamber.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamber.tsx:102>) | <div className={styles.speech} | 102 |
| [app/components/FairyRoom.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyRoom.tsx:66>) | phase === "waiting" && | 66 |
| [scripts/fairy-data.cjs](<C:/dev/GitHub/Habit-World/scripts/fairy-data.cjs:6>) | function validate | 6 |
