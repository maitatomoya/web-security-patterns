/**
 * トピック11: クリックジャッキング
 * カテゴリ: 設定ミス
 */
registerTopic({
  id: 11,
  category: "設定ミス",
  title: "クリックジャッキング",
  summary: "透明なiframeで正規サイトを重ね、利用者に意図しないクリックをさせる攻撃。frame-ancestorsで対策する。",
  keywords: ["クリックジャッキング", "clickjacking", "UI redress", "iframe", "X-Frame-Options", "frame-ancestors", "CSP", "SameSite"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>クリックジャッキングは、攻撃者が用意した罠ページの上に<strong>正規サイトを透明なiframeで重ねて表示</strong>し、",
    "利用者が「自分は罠ページのボタンを押している」と思っている間に、実際には見えない正規サイトのボタンを",
    "クリックさせる攻撃です。画面の見た目（UI）をだまして操作を横取りするため、<strong>UIリドレッシング</strong>とも呼ばれます。</p>",
    "<p>なぜ危険かというと、クリックは<strong>ログイン済みの利用者本人の操作</strong>として正規サイトに届くからです。",
    "被害者のブラウザは正規サイトのCookieを自動で送るため、たとえば「退会する」「送金する」「連携アプリを許可する」",
    "「公開範囲を全体にする」といった副作用のあるボタンを、本人の意図なしに押させられてしまいます。",
    "入力を盗むXSSとは違い、<strong>正規の操作をそのまま実行させる</strong>点が特徴です。</p>",
    "<p>根本原因は、<strong>自分のサイトが他人のページの中にiframeとして埋め込まれることを許してしまっている</strong>ことです。",
    "ブラウザは既定では、あるサイトを別ドメインのページ内にフレーム表示することを禁止しません。",
    "そのため、<code>Content-Security-Policy</code>の<code>frame-ancestors</code>ディレクティブ",
    "（ブラウザにフレーム埋め込み元を制限させる指定）や、古いブラウザ向けの<code>X-Frame-Options</code>ヘッダーで、",
    "「どのサイトなら自分を埋め込んでよいか」をサーバーが明示する必要があります。設定しなければ全ドメインから埋め込み可能なままです。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>「送金確認」ボタンを持つ銀行サイトを題材に、透明iframeで送金を実行させるまでの流れを追います（あくまで防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "埋め込みを禁止していないページを探す",
        detail: "<p>攻撃者はまず、狙ったサイトが<code>frame-ancestors</code>や<code>X-Frame-Options</code>を返していないか調べます。" +
          "自分の罠ページに<code>&lt;iframe src=\"https://bank.example/transfer\"&gt;</code>を書いて表示でき、" +
          "「表示が拒否されました」にならなければ、埋め込み可能＝攻撃対象になります。</p>",
      },
      {
        title: "罠ページにiframeを透明化して重ねる",
        detail: "<p>攻撃者は「無料ギフトを受け取る」などの魅力的なボタンを置いた罠ページを作り、" +
          "その真上に正規サイトのiframeを<code>opacity:0</code>（完全透明）で重ねます。" +
          "iframeは見えませんが、クリックは背後の正規サイトへ届きます。</p>",
      },
      {
        title: "狙いのボタンを指の下に合わせる",
        detail: "<p><code>position</code>や<code>z-index</code>を調整し、正規サイトの「送金を確認」ボタンが" +
          "ちょうど罠ページの「受け取る」ボタンの位置に来るよう座標を合わせます。" +
          "利用者の目には罠ページのボタンしか見えません。</p>",
      },
      {
        title: "ログイン済みの被害者を誘導する",
        detail: "<p>攻撃者はメールやSNSで罠ページのURLを配ります。銀行サイトにログイン済み（Cookieが有効）の利用者が" +
          "罠ページを開いてボタンを押すと、実際には透明なiframe内の「送金を確認」がクリックされます。</p>",
      },
      {
        title: "本人の操作として処理が実行される",
        detail: "<p>クリックは被害者本人のセッションで送られるため、サーバーは正規の操作として送金を実行します。" +
          "被害者は「ギフトを受け取った」と思っているだけで、送金が完了したことに気付きません。</p>",
      },
    ],
    note: "<p>クリックジャッキングはCookieを直接盗むわけではないため、<code>HttpOnly</code>では防げません。" +
      "また副作用のある操作を守るCSRF対策（トークンや<code>SameSite</code>）も、罠ページが「正規サイト自身のフォーム」を" +
      "iframe越しにそのまま送信させるこの手口には効きにくいことがあります。" +
      "確実な対策は、次のコードのとおり<strong>そもそもフレーム埋め込みをサーバーが拒否する</strong>ことです。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：フレーム埋め込みを拒否するヘッダー",
      lang: "JavaScript (Node.js / Express)",
      description: "レスポンスヘッダーで「自分をどこから埋め込んでよいか」を宣言します。CSPのframe-ancestorsが本命、X-Frame-Optionsは古いブラウザ向けの保険です。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "const express = require('express');",
          "const app = express();",
          "",
          "// フレーム制御のヘッダーを一切付けていない",
          "app.get('/transfer', requireLogin, (req, res) => {",
          "  res.send(renderTransferPage());",
          "});",
        ].join("\n"),
        highlights: [4, 5, 6],
        note: "<p>フレーム制御のヘッダーが無いため、ブラウザは既定でどのドメインからのiframe埋め込みも許します。" +
          "攻撃者は<code>/transfer</code>を自分の罠ページに透明iframeで重ねられます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const express = require('express');",
          "const app = express();",
          "",
          "// すべてのレスポンスにフレーム制御ヘッダーを付与",
          "app.use((req, res, next) => {",
          "  // 本命: 自サイト(self)以外からのフレーム埋め込みを禁止",
          "  res.setHeader('Content-Security-Policy', \"frame-ancestors 'self'\");",
          "  // 古いブラウザ向けの保険",
          "  res.setHeader('X-Frame-Options', 'DENY');",
          "  next();",
          "});",
          "",
          "app.get('/transfer', requireLogin, (req, res) => {",
          "  res.send(renderTransferPage());",
          "});",
        ].join("\n"),
        highlights: [5, 6, 7, 8, 9, 10, 11],
        note: "<p><code>frame-ancestors 'self'</code>で「自サイト以外からのフレーム化」をブラウザに拒否させます。" +
          "特定の信頼ドメインだけ許すなら<code>frame-ancestors 'self' https://partner.example</code>のように列挙します。" +
          "全面禁止なら<code>frame-ancestors 'none'</code>。実務では<code>helmet</code>ミドルウェアで両ヘッダーをまとめて設定できます。" +
          "セキュリティヘッダー全般の詳細はトピック10を参照してください。</p>",
      },
    },
    {
      title: "X-Frame-Options と frame-ancestors の違い",
      lang: "HTTP レスポンスヘッダー",
      description: "同じ「フレーム埋め込み拒否」でも、古い方式と新しい方式で表現力が異なります。両方の書き分けを確認します。",
      vulnerable: {
        label: "古い/不十分な指定",
        code: [
          "# 廃止された ALLOW-FROM。多くのブラウザが無視する",
          "X-Frame-Options: ALLOW-FROM https://partner.example",
          "",
          "# 複数ドメインを許可したくても X-Frame-Options では書けない",
          "# （DENY か SAMEORIGIN の2択しか実質使えない）",
        ].join("\n"),
        highlights: [1, 2],
        note: "<p><code>X-Frame-Options: ALLOW-FROM</code>は仕様として廃止され、主要ブラウザで無視されます。" +
          "「特定の複数ドメインだけ許可」といった細かい制御が<code>X-Frame-Options</code>では表現できません。</p>",
      },
      fixed: {
        label: "推奨する指定",
        code: [
          "# 新しい方式。複数の許可元を柔軟に列挙できる",
          "Content-Security-Policy: frame-ancestors 'self' https://partner.example",
          "",
          "# どこからも埋め込ませない場合",
          "Content-Security-Policy: frame-ancestors 'none'",
          "",
          "# 古いブラウザ向けの保険として併記",
          "X-Frame-Options: DENY",
        ].join("\n"),
        highlights: [2, 5, 8],
        note: "<p><code>frame-ancestors</code>は許可元を空白区切りで複数書け、ワイルドカードやスキームも扱えます。" +
          "対応ブラウザでは<code>X-Frame-Options</code>より<code>frame-ancestors</code>が優先されるため、" +
          "新規実装は<code>frame-ancestors</code>を主とし、<code>X-Frame-Options</code>は後方互換の保険として併記します。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "クリックジャッキングの根本対策として最も適切なのはどれですか。",
      choices: [
        "セッションCookieにHttpOnly属性を付ける",
        "Content-Security-Policyのframe-ancestorsで、自サイトを埋め込めるドメインを制限する",
        "すべての通信をHTTPSにする",
        "入力値をサーバー側でエスケープする",
      ],
      answerIndex: 1,
      explanation: "<p>クリックジャッキングは「自サイトが他人のページにiframeで埋め込まれる」ことが原因なので、" +
        "<code>frame-ancestors</code>（や古いブラウザ向けの<code>X-Frame-Options</code>）で埋め込み元を制限するのが根本対策です。" +
        "<code>HttpOnly</code>はCookie窃取の緩和、HTTPSは通信保護、エスケープはXSS対策で、いずれもこの攻撃自体は止められません。</p>",
    },
    {
      question: "X-Frame-Options と CSPのframe-ancestors に関する説明として正しいのはどれですか。",
      choices: [
        "X-Frame-Options: ALLOW-FROM は現在も全ブラウザで有効で、複数ドメインを許可できる",
        "frame-ancestors は許可元を複数列挙でき、対応ブラウザではX-Frame-Optionsより優先される",
        "両方を設定すると競合してブラウザがフレーム制御を無効化する",
        "frame-ancestors はレスポンスボディに書くもので、ヘッダーには書けない",
      ],
      answerIndex: 1,
      explanation: "<p><code>frame-ancestors</code>は<code>'self' https://partner.example</code>のように許可元を複数書け、" +
        "対応ブラウザでは<code>X-Frame-Options</code>より優先されます。<code>X-Frame-Options: ALLOW-FROM</code>は廃止され無視されます。" +
        "両者の併記は競合ではなく後方互換の保険であり、<code>frame-ancestors</code>はあくまでHTTPレスポンスヘッダーとして送ります。</p>",
    },
    {
      question: "あるページを自社ドメインの管理画面からだけiframeで埋め込みたい場合、適切な指定はどれですか。",
      choices: [
        "Content-Security-Policy: frame-ancestors 'none'",
        "Content-Security-Policy: frame-ancestors 'self'",
        "X-Frame-Options: DENY だけを設定する",
        "ヘッダーを何も設定しない",
      ],
      answerIndex: 1,
      explanation: "<p>同一オリジン（自サイト自身）からの埋め込みだけ許すには<code>frame-ancestors 'self'</code>を使います。" +
        "<code>'none'</code>や<code>X-Frame-Options: DENY</code>は自サイトからの埋め込みも禁止してしまい、管理画面が表示できません。" +
        "ヘッダー未設定では全ドメインから埋め込め、クリックジャッキングを許します。別ドメインの管理画面から埋め込むなら、" +
        "そのドメインを<code>frame-ancestors 'self' https://admin.example</code>のように明示します。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "認証後の画面や副作用のある操作を含むページで、<code>Content-Security-Policy: frame-ancestors</code>を設定している",
    "既定は<code>frame-ancestors 'self'</code>または<code>'none'</code>とし、埋め込みを許すドメインだけを明示的に列挙している",
    "古いブラウザ向けの保険として<code>X-Frame-Options: DENY</code>（または<code>SAMEORIGIN</code>）も併記している",
    "廃止された<code>X-Frame-Options: ALLOW-FROM</code>に依存していない",
    "ヘッダーは個別ページではなく共通ミドルウェア（例: <code>helmet</code>）で全レスポンスに付与し、付け忘れを防いでいる",
    "実際に別ドメインのテストページからiframe埋め込みを試み、ブラウザが拒否することを確認した",
    "iframe埋め込みが業務上必要なページ（決済ウィジェット等）だけを例外扱いし、許可元を最小限にしている",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Clickjacking", url: "https://owasp.org/www-community/attacks/Clickjacking", note: "クリックジャッキングの定義と手口（英語）" },
    { title: "OWASP Cheat Sheet: Clickjacking Defense", url: "https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html", note: "frame-ancestors中心の防御ルール（英語）" },
    { title: "MDN: CSP frame-ancestors ディレクティブ", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors", note: "許可元の書き方（日本語）" },
    { title: "MDN: X-Frame-Options", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/X-Frame-Options", note: "古い方式と値の意味（日本語）" },
    { title: "Helmet (Node.js セキュリティヘッダー)", url: "https://helmetjs.github.io/", note: "ExpressでCSP/X-Frame-Optionsを設定する定番" },
  ],
});
