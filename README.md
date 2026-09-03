# Web Security Patterns

Webセキュリティを「攻撃の仕組み」と「修正コード」で学ぶ学習Webサービス。
対象読者は実務経験0〜3年の初心者エンジニア（ミドル層にも通用する深さを保つ）。

各トピックは次の構成で学べる。

1. 概要（何が起きるか、なぜ危険か）
2. 攻撃の仕組み（攻撃者視点の番号付きステップ）
3. 脆弱なコードと修正コードの横並び比較（問題行・修正行をハイライト）
4. 理解度チェック（4択クイズ3問、即時正誤＋解説）
5. 実務チェックリスト
6. 参考資料（OWASP・MDNなど公式・一次情報）

## 技術方針

- **依存パッケージゼロの静的サイト**。フレームワーク・ビルドツールは使わない。
- 教材データは`public/content/topicNN.js`に1ファイル1トピックで`registerTopic({...})`。
- 進捗・クイズ回答はブラウザの`localStorage`（キー: `websec.state.v1`）に保存。
- 本番はCloudflare Pages等に`public/`ディレクトリをそのまま置けば動く。

## 起動方法

```bash
node server.js
```

http://localhost:3950 で開く（127.0.0.1限定・ビルド不要）。確認後はプロセスを停止する。

ポートを変えたい場合は`PORT`環境変数を指定する。

```bash
PORT=4000 node server.js
```

## ディレクトリ構成

```
web-security-patterns/
├── server.js              ローカル開発用の静的配信サーバー（ポート3950）
├── public/
│   ├── index.html         エントリ。content/topicNN.jsを読み込む
│   ├── app.js             画面描画・ルーティング・進捗・クイズ
│   ├── app-register.js    registerTopic / registerIntro のグローバル定義
│   ├── styles.css         スタイル（ダークトーン基調）
│   └── content/
│       ├── intro.js       はじめに（脅威モデル、OWASP Top 10対応表）
│       └── topicNN.js     各トピック教材（01〜15）
├── scripts/
│   └── validate.js        教材データの構造検証（未作成のトピックはスキップ）
├── CONTENT_SPEC.md        教材データの仕様書（後続エージェント向け）
└── README.md
```

## 教材データの検証

```bash
node scripts/validate.js                          # 全トピックを検証
node scripts/validate.js public/content/topic01.js  # 指定ファイルのみ
```

存在するトピックファイルのみを検証し、未作成の番号はスキップする。
スキーマ・クイズ・コードハイライト行番号・参考URL形式をチェックする。

## 教材の追加

`CONTENT_SPEC.md`と完成見本`public/content/topic01.js`を参照。
新しいトピックは`public/content/topicNN.js`に置くだけで、`index.html`が既に01〜15を読み込む設定になっている。

## コード規約

- コメント・ドキュメントは日本語、絵文字不使用。日本語に不要な半角スペースを入れない。
- 依存パッケージを増やさない。
- 本教材は防御のための知識として提供する。攻撃手順は自分のローカル環境でのみ検証すること。
