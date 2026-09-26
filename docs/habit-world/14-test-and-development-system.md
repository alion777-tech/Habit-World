# 14 テストアカウント・テスト管理者・テストモード

[目次](00-index.md) / [編集ガイド](13-editing-guide.md)

更新：2026-09-15。以下が実装後の仕様です。末尾の2026-09-14調査は過去の記録として保存しています。

## テストアカウントとは

TEST01 / TEST02 / TEST03は、実際のGoogleアカウントに付ける管理ラベルです。**この3アカウント自体がテストアカウントであり、テスト管理者です。** 別のアプリ管理者アカウント、メール/パスワード認証、別ログインフォームは作成していません。

既存AuthBoxのGoogleログインをそのまま使用し、Google認証UIDに対応するFirestore登録簿を照合します。表示名・メール・通常プロフィールのrole/isTestAdminを変更しても権限は得られません。

| 保存場所 | 内容 | 権限 |
| --- | --- | --- |
| testAdmins/{Google認証UID} | enabled:boolean、label:TEST01/TEST02/TEST03 | 本人Google認証によるgetのみ。アプリからの作成/変更/削除/listは全員禁止 |
| testSessions/{同じUID} | enabled:boolean、dayOffset:integer | 有効な管理者本人だけ。±3650日、OFF時は0 |
| testWorkspaces/{同じUID} | habits、earnedHabitStreakBonuses | 有効な管理者本人かつモードONだけ読書き可能 |

登録簿は本人が自由に書けるusers配下から分離しました。一般ユーザー、匿名、非Google認証、未ログイン、別UIDからのテスト操作はFirestoreルールでも拒否します。登録の削除・enabled=falseで後続のアクセスを停止し、画面も購読で閉じます。キャッシュだけで権限を付与せず、ログイン切替後の古い通知を破棄します。

## TEST01〜03の実アカウント登録手順

1. 対象の各Googleアカウントで、既存のGoogleログインを一度行います。登録前はテストメニューがなくて正常です。
2. 既存プロジェクトを管理する担当者がFirebase Console → Authentication → Usersで各GoogleユーザーのUIDを取得します。アプリのProject表示とConsoleの対象プロジェクトを照合します。
3. 今回のfirestore.rulesを対象プロジェクトへ反映します。CLIの例：`npx firebase deploy --only firestore:rules --project 実際のプロジェクトID`。この運用デプロイは今回未実施です。
4. Firestore DataでトップレベルのtestAdminsコレクションを作り、文書IDを**TEST01という文字ではなく、そのGoogleユーザーの実UID**にします。
5. 文書にenabledをbooleanのtrue、labelをstringのTEST01で設定します。TEST02、TEST03も別の対応UIDで登録します。文字列の「true」は使いません。
6. 今回のアプリ変更も実行環境へ反映し、各アカウントで本体を開きます。☰メニューに「テスト管理 · TEST01」等が表示されます。
7. ONにするとtestSessionsが作られます。「テスト習慣を用意する」でtestWorkspacesが作られます。両方ともConsoleで事前作成不要です。

登録文書の例：

```json
{ "enabled": true, "label": "TEST01" }
```

権限管理は既存のFirebase Console/IAM権限で行います。第4のアプリ内管理者アカウントを作る手順ではありません。各ラベルを1UIDずつ割り当ててください。登録簿全体のラベル一意性はルールで強制しないため、同じラベルの重複登録は管理側で避けます。

**実UIDはまだ提示されていないため、実アカウント登録と実Firebaseへのデプロイは未実施です。** 仮のUID、全員許可の初期設定、ハードコードされたテストメールは入れていません。

## メニューとON/OFF

本体の「☰ メニュー」→「テスト管理 · TEST0x」→モードON/OFFの順です。表示条件はGoogle認証・登録有効・許可ラベル・サーバーで確認済みであること。一般ユーザーにはテスト管理メニューや操作を表示しません。

ON開始時とOFF時は日付差を0にします。OFFで操作と試作画面は閉じますが、テスト履歴は残します。セッションはアカウント単位で保存され、同一アカウントの別タブにも反映されます。ログアウトは表示を消しますが保存済みONは消さないため、同じアカウントで再ログインすると復帰します。

## 日付テストと通常機能との違い

1. テストモードON→「テスト習慣を用意する」。再実行で既存履歴を初期化しません。
2. テスト習慣をチェック→「次の日へ」→チェック、と進めます。「前の日へ」「今日へ戻す」も使用できます。
3. 既存calcToggleHabitをそのまま使い、1〜4日目は1/1/6/1pt、合計9pt。取消と節目受領判定も既存の計算です。

日付差は**テスト管理メニュー内の専用習慣データ**に適用します。既存useHabitCalendarへ確認済みオフセットを渡す構成で、本体全体の時計を差し替えません。通常のusersデータへテスト履歴やポイントを加算しません。

通常の「昨日／今日の入力」は対象日の通常履歴を編集する正式機能で、変更していません。通常のカレンダー月移動は閲覧対象月を変更する正式機能で、こちらも変更していません。テスト日付を動かしても本体側の今日・昨日・カレンダーは進みません。

ログイン報酬・孵化の連続ログイン・冒険の24時間時計・ToDo保存時刻は実時計のままです。これらを共通仮想時計へ作り直していません。孵化・冒険は既存プレビューの再生/即帰還ボタン、関数テストで確認できます。前の日への移動は保存履歴を過去状態へ巻き戻す操作ではありません。

## 既存の開発システムとの接続

| 既存部分 | 今回の変更・再利用 |
| --- | --- |
| hooks/useHabitCalendar.ts | 任意引数authorizedDayOffsetを追加し、既存の日付・曜日計算に接続。通常の1引数利用は維持 |
| lib/habits/calcToggleHabit.ts | 無変更。専用テスト保存処理から呼ぶ |
| HabitView・HistoryView・StatsView・通常習慣保存 | 今回は無変更 |
| /ja/fairy-preview、/en/fairy-preview | 実際のURLは /ja/fairy-preview、/en/fairy-preview。既存FairyBirthPreviewを維持し、入口のみ権限＋ONへ変更 |
| /ja/fairy-room-preview、/en/fairy-room-preview | 体力・冬眠・回復・即帰還等の既存内容を維持。入口だけ制御 |
| /avatar、/world | studio/model/画像/試作stateを維持。移動・削除・統合せず入口へ同じゲートを追加 |

プレビューは開発時だけの制限から「登録済み管理者＋ON」へ変わりました。本番ビルドでも許可ユーザーは利用でき、開発環境でも一般ユーザーは利用できません。URL直打ちも権限不足なら案内だけを表示し、試作の子コンポーネントをマウントしません。

プレビューのメモリー状態、アバター・会話のLocalStorageは既存のままです。全試作の保存先をtestWorkspacesへ統合していません。アバターは従来のブラウザー共通キーなので、同じブラウザーの複数テスト管理者間で保存した姿が共有され得ます。

## セキュリティ境界と権限の変更先

モード変更・日付変更・テスト履歴への直接SDKアクセスはFirestoreルールで制御します。クライアントも最新の登録簿を確認します。通常users/publicUsersのアクセス権は広げていません。

ダウンロード済みJavaScriptを改造して純粋計算やローカル描画を実行することまで禁止する仕組みではありません。保護対象は認証に紐づくテストセッション・データです。既存通常データの本人書込み権限は維持しており、通常ポイント全般の不正防止を新設したものではありません。

- 人の追加・交代・停止：ConsoleのtestAdmins/{uid}。停止はenabled=falseまたは削除。交代時は古いUIDを無効化します。
- ラベルの変更：lib/testAccessModel.tsのTEST_LABELSとfirestore.rulesのisTestAdminを同時変更。
- 日付範囲：MAX_TEST_DAY_OFFSET、ルールの範囲、TestAdminMenuのボタン条件を確認。
- 保存仕様：testModeActions、useTestAccess、testSessionsルールを確認。

採用方法の根拠：[Firebaseルールの条件とget/exists](https://firebase.google.com/docs/firestore/security/rules-conditions)、[ルールのローカルテスト](https://firebase.google.com/docs/firestore/security/test-rules-emulator)。

## 実装・変更ファイル

| ファイル | 役割 |
| --- | --- |
| [lib/testAccessModel.ts](C:/dev/GitHub/Habit-World/lib/testAccessModel.ts) | 登録・オフセットの検証 |
| [hooks/useTestAccess.ts](C:/dev/GitHub/Habit-World/hooks/useTestAccess.ts) | 認証・登録・セッション購読、失効・キャッシュ・アカウント切替対策 |
| [lib/testModeActions.ts](C:/dev/GitHub/Habit-World/lib/testModeActions.ts) | モード/日付/テスト習慣の保存、既存計算の呼出し |
| [app/components/TestAdminMenu.tsx](C:/dev/GitHub/Habit-World/app/components/TestAdminMenu.tsx) | メニュー、専用データ操作、既存試作へのリンク |
| [app/components/TestFeatureGate.tsx](C:/dev/GitHub/Habit-World/app/components/TestFeatureGate.tsx) | 既存試作のアクセス入口 |
| hooks/useHabitCalendar.ts、app/[locale]/page.tsx | 日付計算の引数拡張、本体メニューへの接続 |
| 各preview、avatar、worldのpage.tsx | 既存画面を権限ゲートで囲む |
| [firestore.rules](C:/dev/GitHub/Habit-World/firestore.rules) | Google認証・登録・本人・モードONをサーバー側検証 |
| [firebase.test.json](C:/dev/GitHub/Habit-World/firebase.test.json) | ローカルdemoプロジェクト、Firestore8181 |
| [scripts/test-test-mode.cjs](C:/dev/GitHub/Habit-World/scripts/test-test-mode.cjs) | 権限購読・UI・操作・保存分離のテスト |
| [scripts/test-test-mode-rules.cjs](C:/dev/GitHub/Habit-World/scripts/test-test-mode-rules.cjs) | Firestoreエミュレーターでの直接アクセス検証 |
| package.json、package-lock.json | 検証コマンドと開発依存 |

## 検証結果・実アカウント確認

`npx tsc --noEmit --incremental false`、`npm run test:test-mode`、既存11本のテストは成功。`npm run test:test-rules`相当をローカルdemo-habit-world-testsで実行して成功しました。本番用`next build --webpack`も成功しました。Java21以上が必要です。実プロジェクトへのフォールバックはありません。

| 要求項目 | 結果・実登録後に必要な確認 |
| --- | --- |
| 1. TEST01でGoogleログイン | 実アカウント未登録のため未実施。登録後に従来Googleボタンで確認 |
| 2. メニュー表示 | 登録あり/なしのUI描画テスト成功。実画面は登録後確認 |
| 3. モードON | アクションとルール検証成功。実画面のON/OFFは登録後確認 |
| 4. 既存テスト機能 | ゲート・既存試作のテスト成功。実ログインで各URLを開く確認は残る |
| 5. 日付テスト | 前/次/今日、3日ボーナスをテスト成功 |
| 6. 通常の今日/昨日 | 該当UI・保存処理無変更、hookの日付分離とルールで両日分保存成功。実画面操作は登録後確認 |
| 7. 月移動 | 既存hookの前後月変更と通常の今日/昨日維持を自動検証成功。実画面操作は登録後確認 |
| 8. 一般ユーザーの非表示 | メニューと試作ゲートのUI描画テスト成功 |
| 9. 直接利用拒否 | 一般・非Google・未認証・OFF・失効・別UID・自己昇格の拒否をエミュレーターで確認 |
| 10. 既存機能を保持 | 中身の削除・移動なし。アバター/妖精/部屋/会話等の既存テスト成功 |

エミュレーターのGoogleトークンによる検証を、実Google OAuthログイン済みと混同しません。実UID登録・運用デプロイは残作業です。

---

## 実装前の調査記録（2026-09-14：以下は現在仕様ではありません）

[目次](00-index.md) / [習慣](02-habit-system.md) / [保存](12-data-and-save-system.md)

調査日：2026-09-14。現在の作業ツリーを対象に、呼出し元・画面・保存先まで確認しました。補助的にローカルGit履歴も読みました。コードの変更、ログイン、初期化、DB操作、機能の再有効化は行っていません。「使用可能」はコード上で操作への接続があるという意味で、実際の公開環境で操作した結果ではありません。

## 結論

**日付をずらす内部処理は残っていますが、翌日・前日へずらす操作UIは現在ありません。** `setTestDayOffset` は部品へ渡されるだけで、現在のソースに関数呼出しがありません。開発環境で起動するだけでは日付変更ボタンは出ません。

これとは別に、習慣の「今日／昨日」切替、履歴・統計の前月／翌月移動、開発専用の孵化・部屋プレビューは接続されています。メール/パスワード認証は過去の実装をGitで確認できましたが、現在の画面と処理からは削除されています。

## 機能別一覧

| ID | 機能 | ファイル・関数・変数 | 現在の動作・使用可否 | 状態・他機能への影響 |
| --- | --- | --- | --- | --- |
| TEST-01 | 日付オフセット | `hooks/useHabitCalendar.ts` / testDayOffset,setTestDayOffset,base | 現在日時に日数を足して基準日を作る。初期0。変更UI・呼出しなし | 一部実装。内部計算が残存。再接続時は実際の習慣保存に影響する |
| TEST-02 | 開発用の日付ボタン | `app/[locale]/page.tsx` → `HabitView.tsx` / isDev,setTestDayOffset | Propsと引数は残るが、ボタンもsetter実行もなし | 現在UIから使用不可。単に本番時だけ隠す実装ではない |
| TEST-03 | 開発環境判定 | 本体 / isDev、`package.json` / dev | NODE_ENV=development。環境ラベル等に使用 | 実装済み。画面内の切替スイッチや権限ではない |
| TEST-04 | 管理者モード | `firestore.rules`、`types/appTypes.ts`、本体を検索 | 管理者ロール、特定メール判定、管理画面の接続なし | コード上では確認できない。firebase-admin依存は管理者UIではない |
| TEST-05 | 今日／昨日切替 | 本体 / habitDisplayDate,activeHabitDate、`HabitView` / setHabitDisplayDate | 両ボタンあり。昨日の習慣もチェック・取消可能 | 実装済み・開発専用ではない。ポイントと履歴を書き換える |
| TEST-06 | カレンダー月・選択日 | `HistoryView` / goPrevMonth,goNextMonth、`StatsView` / setCurrentMonth,setSelectedDate | 月移動・閲覧日選択が可能 | 実装済み・通常機能。アプリの今日を変更しない |
| TEST-07 | メール/パスワードログイン | 現在の `AuthBox.tsx`、過去の同ファイル | 現在はGoogle popupのみ。過去にメールログイン・新規登録あり | 旧実装はGitで確認済み、現在使用不可。Firebase側の有効設定は不明 |
| TEST-08 | 固定テストアカウント | `scripts/test-*.cjs`、各Preview | preview/me/u等のサンプルIDがある | 実データのユーザー登録ではない。運用中のテストユーザー有無は確認できない |
| TEST-09 | 孵化プレビュー | `app/[locale]/fairy-preview/page.tsx`、`FairyBirthPreview.tsx` | 開発時のみ表示。命名と孵化やり直し | 実装済み。本番はnotFound。アカウント保存はしないが会話用ローカル履歴は別途動く |
| TEST-10 | 部屋プレビュー | `app/[locale]/fairy-room-preview/page.tsx`、`FairyChamberPreview.tsx` | 体力・冬眠・回復・初期化・即帰還・幅変更 | 実装済み。開発時のみ、メモリー内サンプルの更新 |
| TEST-11 | 本体resetAllData | `app/[locale]/page.tsx` / resetAllData | stateを空にする関数定義だけで呼出しなし | 一部実装。保存データ全消去関数ではない |
| TEST-12 | 一括テストデータ初期化 | 現行app/lib/scriptsを検索 | 実Firebaseのテストユーザー作成・DB一括初期化の専用処理なし | コード上では確認できない。通常リストのリセットとは区別 |
| TEST-13 | Firebaseエミュレーター | `firebase.json`、`functions/package.json`、`lib/firebase.ts` | ポートとFunctions用serveコマンドあり。アプリ接続設定なし | 一部実装。npm run devで自動的にエミュレーターへ切り替わらない |
| TEST-14 | スクリプト内仮想日時 | `scripts/test-fairy-room-actions.cjs`等 | 引数の時刻、VM内Clock、Map等で検証 | 実装済み。テストプロセス内だけ。画面のテストモードではない |
| TEST-15 | 独立体験版のリセット等 | `app/(root)/world/world-prototype.tsx`、`avatar/studio.tsx` | worldの最初から、avatarの編集中初期化等 | 実装済み。development限定ガードなし。本体DBの初期化ではない |

## 日付変更システムを詳しく追う

### 残っている処理と途切れている接続

```text
useHabitCalendar
  testDayOffset = useState(0)
  base = 現在のDateを作り、getDate() + testDayOffsetで日を変更
  todayStr / yesterdayStr / todayDow を計算
  ↓ return
本体 Home
  setTestDayOffset を受け取る
  ↓ Propsとして渡す
HabitView
  setTestDayOffset を受け取る
  × setterの呼出し・前日/翌日ボタンなし
```

オフセットは日単位のReact stateです。全世界共通の時計、OSの日時、Firebaseのサーバー時刻を変える仕組みではありません。任意日時入力欄、URLパラメーターによる設定、LocalStorageへのオフセット保存、日付リセットボタンはありません。再マウント・再読込で初期0へ戻ります。

`base` はオフセットまたは実際の日本日付が変わると再計算されます。60秒タイマーとwindowのfocusで実時計を確認し、基準日の月にcurrentMonthを合わせます。hook自体にはNODE_ENVガードがなく、本番にも計算・stateは残りますが、現在の操作経路がないため通常は0のままです。

コメントの「DEVボタンで増減する前提」は現存しますが、それだけでボタンが使用可能とは判断できません。今回調べたローカルGit履歴でも `setTestDayOffset(...)` の呼出し追加・削除は見つからず、ボタンが実際に動いた過去の版・削除時期は確認できません。

### もし内部オフセットを再接続した場合の影響

以下は現存するデータの流れから確認した影響です。今回はオフセットを操作・再接続していません。

| 影響先 | 参照する日付・処理 | 結果 |
| --- | --- | --- |
| 習慣一覧・完了表示 | activeHabitDate / activeHabitDow / todayStr | 仮想基準日の曜日や履歴を表示 |
| 習慣のポイントと履歴 | handleToggleHabit → calcToggleHabit(h,date,todayStr,yesterdayStr,…) | 渡された仮想対象日にチェックを保存可能。通常点・節目点・取消にも影響 |
| 保存先 | updateHabitFields(uid,…) | テスト専用データへ切替なし。uidがあれば実際の接続先Firestore、なければ通常のhabits_v2 |
| 節目受領 | saveUserProfileのearnedHabitStreakBonuses | 受領済み記録も通常プロフィールに残り得る |
| 合計点・レベル | 習慣pointの集計 | 点が変わればレベルとポイント到達条件にも影響 |
| 特別ポイント | 本体totalPoint等 → awardSpecialPoints | 点数条件は間接影響。特別履歴の日付自体は実際の日本日付 |
| HomeのToDo・ToDo画面 | 本体からtodayStrを渡す | 今日/期限超過/リマインダー/日付ショートカットの表示に影響 |
| ToDo完了・次回生成 | todoActionsのnew Date() | 完了保存と繰返し計算は実時計。画面の日付と一致しなくなる可能性 |
| カレンダー | base→currentMonth→calendarDays/dailyStats | 対象月の表示が変わる。表示用streakも月初走査なので影響 |
| 共通妖精の進捗会話 | 本体contextのtotal/completed/streak | 仮想日で集計した進捗が会話候補に渡る |
| 共通妖精の時間帯・来訪 | FairySpeechのDate.now() | 朝/夜・会話履歴は実時計のまま |
| 孵化・累計/連続ログイン | recordFairyLoginのnew Date() | todayStr変更でeffectが再実行され得るが、実日本日付の重複防止が働く。日を進めた扱いにはならない |
| 習慣による体力回復 | updateHabitFieldsの実際のtoday | 仮想未来日を達成しても実際の当日新規達成でなければ回復しない |
| 冒険開始・帰還・自然減少 | syncFairyRoomのDate.now() | 仮想日付では進まない |
| 1日の追加件数上限 | checkLimit/incrementStatsのnew Date() | 実日本日付のまま |
| 登録時刻・最終ログイン | serverTimestamp / new Date | オフセット非連動 |

本体の「テスト用の日付オフセットは報酬判定に渡さない」というコメントは**直後のログイン・孵化effectの文脈**です。習慣報酬まで仮想日付から隔離されているわけではありません。日付変更処理を将来復活させる場合に最も確認すべき点です。

### 通常の「昨日」とカレンダーとの違い

`HabitView` の今日/昨日ボタンは `setHabitDisplayDate` を呼び、本体が対象日をtodayStr/yesterdayStrから選びます。オフセット自体は変えません。開発フラグによる制限はなく、通常利用できる昨日分の編集です。

履歴の `goPrevMonth/goNextMonth` はcurrentMonthを変え、selectedDateをnullに戻します。統計の前後月ボタンはcurrentMonthのみ変更し、selectedDateを消す同じ処理はありません。両画面の選択日は閲覧用で、習慣達成のdate引数へは接続していません。任意のカレンダー日をクリックしてその日の習慣を編集する機能ではありません。

## メールログインと過去実装

現行 `AuthBox.tsx` はGoogleAuthProvider + signInWithPopupとsignOutだけです。メール入力・パスワード入力、signInWithEmailAndPassword、createUserWithEmailAndPassword、メールリンク認証の現行接続は見つかりません。`user.email` はログイン済み情報の**表示**です。

ローカルGit履歴で確認した事実：

| 版・日付 | ファイル・確認内容 |
| --- | --- |
| `3c8eeb4` / 2026-02-11 | AuthBoxにsignInWithEmailAndPassword / createUserWithEmailAndPasswordの追加を確認 |
| `c5cb4d6^` / 削除直前の版 | `app/components/AuthBox.tsx` にemail/passwordを渡すボタン内の非同期処理、メールアドレス・パスワード入力、GoogleへのlinkWithPopup処理が存在 |
| `c5cb4d6` / 2026-02-15 | 同ファイルからメール認証APIのimportと呼出しを削除した差分を確認 |

これは「以前の実装と思われる」だけでなく、履歴で確認できる旧実装です。ただし旧ファイルにdevelopment限定の判定は見つからず、**テスト専用メールログインだったとまでは確認できません**。固定テストメール・パスワードを使うログインとは区別します。

読み取り確認する場合は `git show 'c5cb4d6^:app/components/AuthBox.tsx'`。復元やcheckoutは不要です。現在のFirebase Consoleでメール認証が有効か、旧メールユーザーが残っているか、当時デプロイされたかは確認していません。ソースからUIが消えたことは、Authentication内のユーザーやプロバイダー設定の削除を意味しません。

## 開発者モード・管理者モード・エミュレーター

`isDev = process.env.NODE_ENV === "development"` はビルド/実行環境の判定です。管理者ログイン・管理者権限・メールアドレス許可リストではありません。現在の認証ルールはsignedIn/isOwner等で、管理者モードのrole/custom claims判定は確認できません。Functionsのfirebase-adminはサーバーSDKの利用であり、ユーザーが管理者モードへ切り替える機能ではありません。

開発時はnext.config.tsでPWA生成を無効にし、locale layoutの非production分岐はこのアプリのservice workerを登録解除します。これもテストユーザーモードではありません。

`firebase.json` にはFirestore8081/Auth9099/UI4000の設定、`functions/package.json` にはserve（ビルド後にFunctionsのみエミュレーター起動）・shellがあります。`lib/firebase.ts` にはconnectAuthEmulator / connectFirestoreEmulatorの接続がありません。環境名表示やnpm run devだけではDBの隔離になりません。稼働エミュレーターや実接続先は今回未確認です。

## 開発者用画面・ボタンの具体動作

### 部屋プレビュー

`/{ja|en}/fairy-room-preview` はdevelopment以外にnotFound()。`FairyChamberPreview` は `onSync/onName` を渡し、通常のFirestore保存関数の代わりにstate/refを更新します。

| 操作 | 関数・変数と結果 |
| --- | --- |
| 表示幅を切り替え | mobileを反転。390/1050の最大幅 |
| 体力73 | createRoomで部屋を作り直してhealth=73。既存のサンプルAP・記録・旅も初期化 |
| 冬眠 | createRoomで作り直しhealth=0,sleeping=true |
| 習慣で回復 | recoverFromHabit。日付は2026-09-12固定、habitIdはString(Date.now())。サンプル回復を繰返し試せる |
| 満タンに戻す | createRoomでサンプル部屋を初期化。体力だけを戻す処理ではない |
| 帰還を確認 | 冒険がある場合だけreturnsAtをDate.now()−1へ変更しadvanceRoom。アプリ全体の日付は動かさない |
| 出発 | sync内でrandom=0.5、結果30APを確定。通常の体力条件はモデルに従う |
| 命名 | onNameでサンプルname stateだけ更新 |

サンプルはuid=preview、名前ミルフィ、総合1250、ログイン128日、卵2026-09-06、誕生2026-09-12。現在時刻のupdatedAtと固定の誕生日が混在します。これはAuthenticationにpreviewユーザーを作る操作ではありません。

### 孵化プレビューとその他の演出

`/{ja|en}/fairy-preview` もdevelopment以外はnotFound()。`FairyBirthPreview` は名前なしならnaming、名前入力後readyのサンプルを作り、onNameでローカルstateのみ更新します。「孵化をもう一度見る」はnameを空にして部品を再マウント。7日ログインや実ポイント加算を待たずに演出を確認します。

命名後は `AutonomousFairy` をcontextなしで表示するため、`FairySpeech` の会話記憶キー `habit-world:fairy:v1:local` は使用されます。実アカウントには保存しませんが、ブラウザーに一切書き込まないプレビューではありません。

`AutonomousFairy` の移動停止/再開・飛ぶ/歩く/のぞくは、現在はdevelopmentガードのない本体の操作でもあります。`OpeningTutorial` の再生、`FairyRoom` の音付き再生も通常の演出再生であり、報酬の再支給ボタンではありません。

`/world` のresetは試作stateを最初に戻します。`/avatar` の初期化は編集中のavatarをDEFAULTに戻し、保存済みの姿は残します。両ルートにdevelopment限定ガードはなく、Firebase本体へ統合されたテストユーザー画面ではありません。

## 初期化と保存への影響

| 処理 | 現在呼べるか | 保存データへの影響 |
| --- | --- | --- |
| 本体resetAllData | 現行の呼出しなし | 関数内容はプロフィール等のReact stateクリアのみ。Firestore/LocalStorage削除なし。コメントのログアウト用途も現在未接続 |
| AuthBox.logout | ボタンに接続 | signOutのみ。resetAllDataを呼ばない |
| BucketListView.handleReset | 通常リストのボタンに接続 | 確認後100項目を空にし、通常の自動保存で実リストを上書き。開発専用ではない |
| 本体handleDreamAchievedの目標リセット | 通常の夢達成確認に接続 | 選択により実際の目標を削除。テストデータ初期化ではない |
| 各プレビューのやり直し | 開発ルート内で接続 | 上記サンプルstateのみ。ただし孵化後の会話記憶は独立 |
| syncLocalDataToFirestoreのremoveItem | Googleログイン後の移行に接続 | 転送したローカル区分を削除する移行後処理。テスト用全消去ではない |

## 自動テストの仮想日時・ユーザー

`scripts/test-*.cjs` はNodeで起動する検証です。TypeScriptをtranspileModuleで変換し、vm.runInNewContextへ読み込むものがあります。ブラウザーのstateや認証を切り替える機能ではありません。

| スクリプト | 仮想データ・日時の作り方 |
| --- | --- |
| test-fairy-progress.cjs | advanceFairyLoginへ2026-09-01〜07等を直接渡す。eggのprofileはJSオブジェクト |
| test-fairy-room.cjs | now=2026-09-12T03:00:00Z、day=86400000。now+day/21日等を関数に渡す |
| test-fairy-room-actions.cjs | VM内のClock.nowを固定、formatDateToJSTも固定。auth.currentUser.uid=me、FirestoreはMapと代替API |
| test-dialogue.cjs | 2026-09-09T00:00:00+09:00を起点に時間差・乱数を関数へ渡す |
| test-fairy-speech.cjs | DOMイベント・タイマー・LocalStorageを代替実装で検査 |
| test-todo.cjs | todayを固定し、docs/storageのMap、認証不要の代替Firestoreで検査 |
| test-goals.cjs | users/u/goals等をメモリー内Mapで再現 |
| test-friend-discovery.cjs | サンプルプロフィールとme等を検索・推薦関数へ渡す |

特定のuid文字列があるだけでFirebase Authenticationのテストユーザーが存在するとは判断できません。テスト専用固定日時は各スクリプトに閉じており、共通の「全機能テスト時計」はありません。各テストの実行方法は13を参照。この追補ではテストの新規作成・再実行ではなく、現存処理の読取りを行いました。

## 今後確認・編集する場所

日付機能を再利用する場合はhookだけでなく、本体handleToggleHabit、updateHabitFields、profileActions、todoActions、fairyProgressActions、fairyRoomActionsを一緒に確認します。仮想日時が一部だけに作用し、通常の保存先を共有する現状を前提に設計する必要があります。

メール認証の復活は旧ファイル丸ごとの復元ではなく、現在のGoogleログイン・ローカル移行・公開範囲・非匿名判定との接続確認が必要です。今回はいずれも復活・変更していません。

## コード参照（現在のソース）

| ファイル | 関連する定義・処理 | 行 |
| --- | --- | ---: |
| [hooks/useHabitCalendar.ts](<C:/dev/GitHub/Habit-World/hooks/useHabitCalendar.ts:11>) | const [testDayOffset | 11 |
| [hooks/useHabitCalendar.ts](<C:/dev/GitHub/Habit-World/hooks/useHabitCalendar.ts:23>) | const base = | 23 |
| [hooks/useHabitCalendar.ts](<C:/dev/GitHub/Habit-World/hooks/useHabitCalendar.ts:42>) | setCurrentMonth(new Date | 42 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:57>) | const isDev = | 57 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:131>) | const resetAllData | 131 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:291>) | const activeHabitDate | 291 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:451>) | const handleToggleHabit | 451 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:645>) | // 日付は実際の日本時間 | 645 |
| [app/[locale]/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/page.tsx:993>) | setTestDayOffset={ | 993 |
| [app/components/HabitView.tsx](<C:/dev/GitHub/Habit-World/app/components/HabitView.tsx:20>) | setTestDayOffset: | 20 |
| [app/components/HabitView.tsx](<C:/dev/GitHub/Habit-World/app/components/HabitView.tsx:195>) | onClick={() => setHabitDisplayDate("yesterday") | 195 |
| [app/components/AuthBox.tsx](<C:/dev/GitHub/Habit-World/app/components/AuthBox.tsx:31>) | const signInWithGoogle | 31 |
| [app/components/AuthBox.tsx](<C:/dev/GitHub/Habit-World/app/components/AuthBox.tsx:44>) | const logout | 44 |
| [app/components/HistoryView.tsx](<C:/dev/GitHub/Habit-World/app/components/HistoryView.tsx:40>) | const goPrevMonth | 40 |
| [app/components/StatsView.tsx](<C:/dev/GitHub/Habit-World/app/components/StatsView.tsx:53>) | setCurrentMonth( | 53 |
| [app/components/FairyChamberPreview.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyChamberPreview.tsx:6>) | export default function | 6 |
| [app/components/FairyBirthPreview.tsx](<C:/dev/GitHub/Habit-World/app/components/FairyBirthPreview.tsx:5>) | export default function | 5 |
| [app/[locale]/fairy-preview/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/fairy-preview/page.tsx:4>) | if (process.env.NODE_ENV | 4 |
| [app/[locale]/fairy-room-preview/page.tsx](<C:/dev/GitHub/Habit-World/app/[locale]/fairy-room-preview/page.tsx:5>) | if (process.env.NODE_ENV | 5 |
| [app/components/BucketListView.tsx](<C:/dev/GitHub/Habit-World/app/components/BucketListView.tsx:131>) | const handleReset | 131 |
| [lib/habits/updateHabitFields.ts](<C:/dev/GitHub/Habit-World/lib/habits/updateHabitFields.ts:23>) | const now = | 23 |
| [lib/fairyProgressActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyProgressActions.ts:22>) | export async function recordFairyLogin | 22 |
| [lib/fairyRoomActions.ts](<C:/dev/GitHub/Habit-World/lib/fairyRoomActions.ts:9>) | const now = | 9 |
| [lib/todoActions.ts](<C:/dev/GitHub/Habit-World/lib/todoActions.ts:17>) | const today = | 17 |
| [lib/firebase.ts](<C:/dev/GitHub/Habit-World/lib/firebase.ts:5>) | const firebaseConfig | 5 |
| [firebase.json](<C:/dev/GitHub/Habit-World/firebase.json:27>) | "emulators" | 27 |
| [functions/package.json](<C:/dev/GitHub/Habit-World/functions/package.json:7>) | "serve" | 7 |
| [scripts/test-fairy-room-actions.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-room-actions.cjs:12>) | class Clock | 12 |
| [scripts/test-fairy-progress.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-progress.cjs:8>) | let profile = | 8 |
| [scripts/test-fairy-speech.cjs](<C:/dev/GitHub/Habit-World/scripts/test-fairy-speech.cjs:23>) | const storage= | 23 |
| [app/components/AutonomousFairy.tsx](<C:/dev/GitHub/Habit-World/app/components/AutonomousFairy.tsx:21>) | const [speechRequest | 21 |
| [app/components/FairySpeech.tsx](<C:/dev/GitHub/Habit-World/app/components/FairySpeech.tsx:33>) | const key = | 33 |
