# Habit World の Firebase 設定

このアプリの接続先と Firebase CLI の既定プロジェクトは `habit-world-de762` です。
`.env.local` を変えた場合は開発サーバーを再起動してください。
localhost で動かしていても、ログイン後はクラウドの Firestore に保存します。
未ログイン時はブラウザーの localStorage に保存します。

## Firebase Console で確認すること

1. https://console.firebase.google.com/project/habit-world-de762/overview を開きます。
2. Authentication → Sign-in method で Google を有効にします。求められた場合はサポートメールを設定します。
3. Authentication → Settings → Authorized domains に `localhost` を追加します（ポート番号は不要）。
4. Firestore Database が作成済みか確認します。未作成なら本番モードで `(default)` データベースを作成します。このリポジトリの設定ではリージョンは `asia-northeast1` です。
5. Firestore Database → Rules に、このリポジトリの `firestore.rules` の全文を貼り付けて公開します。テストモードの全員許可ルールにはしないでください。

## CLI でルールを公開する場合

上記 5 の代わりに、プロジェクトのフォルダーで実行できます。
初回は Firebase プロジェクトを管理できる Google アカウントでログインしてください。

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project habit-world-de762
```

このコマンドは Firestore のルールだけを公開します。
Functions は古いデータ構造を参照しているため、この作業ではまとめてデプロイしません。

## 動作確認

1. 開発サーバーを停止して `npm run dev` で起動し直し、http://localhost:3000 を開きます。
2. Google でログインし、習慣・プロフィール・「したい100のこと」を保存します。
3. 「したい100のこと」は入力欄からフォーカスを外すと保存が始まります。「保存中…」が消えてから再読み込みし、内容が残っていることを確認します。
4. 保存エラーが出たら画面を閉じず、ルールの公開先と通信状態を確認して「再試行」を押します。

ルールファイルのローカル修正だけではクラウドの権限は変わりません。
この修正作業ではクラウドへの公開・管理画面の変更・ログイン済みアカウントでの保存確認は実施していません。

## localhost で JavaScript / CSS が 404 になる場合

コピー元や本番ビルドの Service Worker が古い画面を返す場合があります。
開発時の Service Worker 登録は停止し、新しい画面を取得できれば既存の `/sw.js` 登録を自動解除します。
古い画面のままの場合は、開発サーバーを再起動したうえで次の操作をしてください。

1. localhost:3000 の開発者ツール → Application → Service Workers を開きます。
2. localhost:3000 の `/sw.js` に対して Unregister を押します。
3. localhost:3000 のタブをすべて閉じ、http://localhost:3000 を開き直します。

「Clear site data」は使わないでください。未ログイン時に保存した localStorage のデータも消えるためです。
