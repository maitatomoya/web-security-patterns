/**
 * トピック12: オープンリダイレクト
 * カテゴリ: 設定ミス
 */
registerTopic({
  id: 12,
  category: "設定ミス",
  title: "オープンリダイレクト",
  summary: "リダイレクト先を検証せず外部URLへ飛ばし、フィッシングやトークン奪取に悪用される脆弱性。",
  keywords: ["オープンリダイレクト", "open redirect", "unvalidated redirect", "リダイレクト", "許可リスト", "allowlist", "フィッシング", "returnUrl", "next"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>オープンリダイレクトは、<strong>リダイレクト先のURLを利用者の入力から決めているのに、その値を検証していない</strong>ために、",
    "攻撃者が指定した任意の外部サイトへ利用者を飛ばせてしまう脆弱性です。",
    "ログイン後の遷移先を<code>?returnUrl=</code>や<code>?next=</code>で受け取る画面などでよく起こります。</p>",
    "<p>なぜ危険かというと、利用者が見るのは<strong>正規サイトのドメインで始まるURL</strong>だからです。",
    "たとえば<code>https://shop.example/login?returnUrl=https://evil.example/fake</code>というリンクは、",
    "ドメイン部分が本物なので信用されやすく、ログイン後にそのまま偽サイトへ遷移させられます。",
    "偽サイトが本物そっくりのログイン画面を出せば、利用者はパスワードを入力してしまう（フィッシング）。",
    "さらにOAuthの<code>redirect_uri</code>のように<strong>リダイレクト時にトークンやコードが付与される</strong>フローでは、",
    "その値ごと攻撃者のサーバーへ送られ、アカウント乗っ取りに直結することがあります。</p>",
    "<p>根本原因は、<strong>「どこへ飛ばすか」という制御情報を、利用者が自由に書き換えられる値のまま信用している</strong>ことです。",
    "対策の基本は、外部の任意URLを受け付けないこと。具体的には、遷移先を<strong>サーバー側で管理する許可リスト</strong>に載った値だけに限定するか、",
    "受け取るのはURLではなく<strong>相対パス（同一サイト内のパス）</strong>に限る、という設計にします。",
    "ホスト名の一致を文字列の前方一致で雑に判定すると回避されるため、正しいURL解析での検証が欠かせません。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>ログイン後に<code>?next=</code>のパスへ戻す通販サイトを題材に、正規ドメインのリンクで偽サイトへ誘導するまでを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "リダイレクト先を外から指定できる場所を探す",
        detail: "<p>攻撃者はURLの中に<code>returnUrl</code>・<code>next</code>・<code>redirect</code>・<code>url</code>といった" +
          "遷移先らしいパラメータを探します。値を書き換えて別ページに飛べば、遷移先が入力任せだと分かります。</p>",
      },
      {
        title: "外部URLが弾かれないか試す",
        detail: "<p><code>?next=/mypage</code>を<code>?next=https://evil.example</code>に変えて、" +
          "ログイン後に外部ドメインへ飛べば脆弱です。<code>//evil.example</code>のようなスキーム省略形が" +
          "通ってしまうケースもあり、これも試されます。</p>",
      },
      {
        title: "正規ドメインで始まる罠リンクを作る",
        detail: "<p>攻撃者は<code>https://shop.example/login?next=https://evil.example/login</code>のように、" +
          "<strong>ドメイン部分は本物</strong>のリンクを用意します。パラメータ部分は見落とされやすく、信用されやすいのがポイントです。</p>",
      },
      {
        title: "メールやSNSで被害者に踏ませる",
        detail: "<p>「注文内容の確認はこちら」などの文面で罠リンクを配ります。被害者は正規ドメインを見て安心し、" +
          "リンクを開いてログインします。</p>",
      },
      {
        title: "偽サイトで認証情報やトークンを奪う",
        detail: "<p>ログイン成功後、正規サイトは検証せず<code>evil.example</code>へリダイレクトします。" +
          "そこに置かれた本物そっくりのログイン画面でパスワードを再入力させたり、" +
          "OAuthフローなら<code>redirect_uri</code>越しに認可コードを奪ったりします。</p>",
      },
    ],
    note: "<p>「<code>evil</code>という文字列を含むURLを弾く」等のブラックリストは、" +
      "<code>https://evil.example@shop.example</code>（利用者情報付きURL）や<code>%2F%2F</code>のような" +
      "エンコード、部分文字列一致の抜け穴で簡単に回避されます。次のコードのとおり" +
      "<strong>許可リストや相対パス限定というホワイトリスト方式</strong>で組むのが確実です。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：ログイン後のリダイレクト",
      lang: "JavaScript (Node.js / Express)",
      description: "?next= で受け取った遷移先へリダイレクトする処理。値をそのまま渡すか、検証するかで安全性が変わります。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.post('/login', (req, res) => {",
          "  authenticate(req.body);",
          "  // 受け取った next をそのままリダイレクト先にしている",
          "  const next = req.query.next || '/mypage';",
          "  res.redirect(next);",
          "});",
        ].join("\n"),
        highlights: [4, 5],
        note: "<p><code>next</code>に<code>https://evil.example</code>や<code>//evil.example</code>を渡すと、" +
          "そのまま外部サイトへリダイレクトします。値の検証が一切ないため、任意の宛先へ飛ばせます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "// 事前に決めた遷移先だけを許可（キー→パスのマップ）",
          "const ALLOWED = { mypage: '/mypage', orders: '/orders', top: '/' };",
          "",
          "app.post('/login', (req, res) => {",
          "  authenticate(req.body);",
          "  // 外部から来るのはキーだけ。実URLはサーバーが決める",
          "  const dest = ALLOWED[req.query.next] || '/mypage';",
          "  res.redirect(dest);",
          "});",
        ].join("\n"),
        highlights: [2, 6, 7],
        note: "<p>外部から受け取るのは<code>mypage</code>のような<strong>キー</strong>だけにし、" +
          "実際のURLはサーバー側の許可リストから引きます。攻撃者がどんな値を送っても、" +
          "許可リストにないものは既定の<code>/mypage</code>に落ちるため、外部サイトへは飛べません。</p>",
      },
    },
    {
      title: "URLを直接受け取る場合の検証",
      lang: "JavaScript (Node.js)",
      description: "どうしてもパス文字列を受け取りたい場合は、相対パスに限定します。ホスト名の前方一致による判定は危険です。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "function isSafe(target) {",
          "  // ホスト名を前方一致で判定（回避されやすい）",
          "  return target.startsWith('https://shop.example');",
          "}",
          "",
          "// 通ってしまう例:",
          "// https://shop.example.evil.example/  → 前方一致で true",
          "// //evil.example                      → 判定対象外ですり抜け",
        ].join("\n"),
        highlights: [2, 3],
        note: "<p>文字列の前方一致は<code>https://shop.example.evil.example</code>のような" +
          "サブドメイン偽装や、スキーム省略の<code>//evil.example</code>で破られます。" +
          "URLは自前の文字列処理ではなく、必ずパーサーで構造として解釈する必要があります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "function safeRedirectPath(target) {",
          "  // 受け付けるのは同一サイト内の相対パスのみ",
          "  // 先頭が単一の '/' で始まり、'//' や '/\\' で始まらない",
          "  if (typeof target !== 'string') return '/mypage';",
          "  if (!/^\\/[^/\\\\]/.test(target)) return '/mypage';",
          "  return target;",
          "}",
          "",
          "app.post('/login', (req, res) => {",
          "  authenticate(req.body);",
          "  res.redirect(safeRedirectPath(req.query.next));",
          "});",
        ].join("\n"),
        highlights: [4, 5, 6],
        note: "<p>先頭が単一の<code>/</code>で、次が<code>/</code>や<code>\\</code>でないパスだけを許すことで、" +
          "<code>//evil.example</code>や<code>/\\evil.example</code>のようなホスト指定を排除し、同一サイト内に閉じます。" +
          "完全なURLを扱うなら<code>new URL(target, base)</code>で解析し、<code>url.origin</code>が" +
          "自サイトと一致するかを比較する方法も確実です。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "オープンリダイレクトが利用者をだましやすい主な理由はどれですか。",
      choices: [
        "リダイレクト先の外部サイトが必ずHTTPSになるため",
        "利用者に見えるURLのドメイン部分が正規サイトのままで、信用されやすいため",
        "ブラウザのアドレスバーが自動的に非表示になるため",
        "サーバーの管理者権限を奪える攻撃だから",
      ],
      answerIndex: 1,
      explanation: "<p>罠リンクは<code>https://shop.example/login?next=...</code>のように" +
        "ドメイン部分が本物なので、利用者は安心してクリックします。実際の遷移先はパラメータ内にあり見落とされがちです。" +
        "HTTPS化やアドレスバーの挙動は無関係で、オープンリダイレクト自体はサーバー権限の奪取ではありません（ただしフィッシングやトークン奪取の踏み台になります）。</p>",
    },
    {
      question: "リダイレクト先の検証方法として最も安全なのはどれですか。",
      choices: [
        "URLに『evil』などの危険な単語が含まれていたら拒否する（ブラックリスト）",
        "target.startsWith('https://shop.example') でホスト名を前方一致判定する",
        "外部から受け取るのはキーだけにし、実URLはサーバー側の許可リストから引く",
        "受け取ったURLをそのままリダイレクトするが、HTTPSのときだけ許可する",
      ],
      answerIndex: 2,
      explanation: "<p>遷移先をサーバー管理の許可リスト（ホワイトリスト）に限定すれば、攻撃者が何を送っても外部へは飛べません。" +
        "ブラックリストはエンコードや利用者情報付きURLで回避され、前方一致は<code>shop.example.evil.example</code>で破られます。" +
        "HTTPSかどうかは宛先が悪性かとは無関係で、検証になりません。</p>",
    },
    {
      question: "相対パスだけを許可する実装で、追加で弾くべき入力はどれですか。",
      choices: [
        "/mypage",
        "//evil.example",
        "/orders/123",
        "/",
      ],
      answerIndex: 1,
      explanation: "<p><code>//evil.example</code>はスキームを省略した絶対URLとして解釈され、" +
        "ブラウザは<code>https://evil.example</code>へ遷移します。先頭が<code>/</code>でも2文字目が<code>/</code>（や<code>\\</code>）の場合は" +
        "外部ホスト指定になり得るため弾く必要があります。<code>/mypage</code>・<code>/orders/123</code>・<code>/</code>はいずれも同一サイト内の相対パスで安全です。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "リダイレクト先を利用者入力（<code>returnUrl</code>・<code>next</code>・<code>redirect</code>等）から決めている箇所を洗い出した",
    "遷移先はサーバー側の許可リストに載ったキー/URLだけに限定している、または相対パスのみを許可している",
    "URLの検証は文字列の前方一致ではなく、URLパーサーで<code>origin</code>を比較して行っている",
    "<code>//host</code>・<code>/\\host</code>・<code>https://a@b</code>・エンコード形など、既知の回避パターンで通らないことを確認した",
    "許可リストに一致しない値は例外にせず、安全な既定ページ（例: <code>/mypage</code>）へフォールバックしている",
    "OAuthやSSOの<code>redirect_uri</code>は完全一致の許可リストで厳格に検証している",
    "外部サイトへ意図的に飛ばす導線がある場合は、遷移前に確認ページを挟む等でだまし討ちを防いでいる",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Cheat Sheet: Unvalidated Redirects and Forwards", url: "https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html", note: "検証方法と許可リストの実務ルール（英語）" },
    { title: "CWE-601: URL Redirection to Untrusted Site (Open Redirect)", url: "https://cwe.mitre.org/data/definitions/601.html", note: "脆弱性の定義と例（英語）" },
    { title: "MDN: URL() コンストラクター", url: "https://developer.mozilla.org/ja/docs/Web/API/URL/URL", note: "URLを構造として解析し検証する（日本語）" },
    { title: "PortSwigger: Open redirection (reflected)", url: "https://portswigger.net/kb/issues/00500100_open-redirection-reflected", note: "オープンリダイレクトの解説（英語）" },
  ],
});
