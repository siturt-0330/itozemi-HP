# GitHub Pagesで公開する

公開サイトはGitHub Pages、CMSは現在のChatGPT Sitesで管理します。GitHub Pages上ではCMSや管理用APIは動きません。

## 初回の設定

1. GitHub公開準備用のソースZIPを展開し、空のGitHubリポジトリへ追加します。
2. CMS左下の **公開データを書き出す** からZIPをダウンロードし、リポジトリのルートに展開します。
3. `content/public.json`と、ZIPに含まれる`site/uploads/`の写真をコミットします。
4. GitHubの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
5. 既定のブランチへpushします。**Actions → Publish GitHub Pages** で公開状況とURLを確認できます。

`content/public.json`がない場合、公開処理はスキップされます。初期データや古いseedが代わりに公開されることはありません。ActionsのSummaryから次の手順を確認できます。

## 内容を更新する

1. 現在のCMSで編集して保存します。
2. CMS左下の **公開データを書き出す** からZIPをダウンロードし、リポジトリのルートへ上書き展開します。
3. 変更した`content/public.json`と写真をコミットし、既定のブランチへpushします。
4. Actionsの公開完了を確認します。

CMSで保存しただけでは、GitHub上の公開サイトは更新されません。ZIPの反映とpushが必要です。

## 公開するファイル

ZIPには公開中のデータと参照するアップロード画像だけを含めます。下書き、CMSのバックアップ、認証情報、`.env`や`.dev.vars`などのローカル設定をGitHubへ追加しないでください。

## 独自ドメインを使う場合

独自ドメインは任意です。使用する場合は **Settings → Pages → Custom domain** に設定し、GitHubが案内するDNS設定とHTTPSの設定を行います。

ドメイン変更後はActionsを再実行してください。公開URLはGitHub Pagesの設定から取得してサイトを書き出します。

## Google検索について

ページごとのタイトル・説明文、サイトマップ、検索用データを公開先URLに合わせて書き出します。公開後、必要に応じてGoogle Search Consoleでサイトマップを登録してください。検索結果の反映やサイトリンクの有無・並び順はGoogleが決定します。

既存の作業リポジトリからGitを使う場合は、現在の`origin`を変更せず、GitHubには別のremote（例：`github`）を追加してください。公開準備用ZIPに、管理画面のファイル・CMSの初期データや下書き・ローカル設定・認証情報は含めていません。
