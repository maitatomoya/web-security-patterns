/**
 * トピック09: CORS設定ミス
 * カテゴリ: 設定ミス
 */
registerTopic({
  id: 9,
  category: "設定ミス",
  title: "CORS設定ミス",
  summary: "Access-Control-Allow-Originの緩すぎる設定で、認証付きAPIを他オリジンから読まれる問題。",
  keywords: [
    "CORS",
    "Cross-Origin Resource Sharing",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
    "ワイルドカード",
    "オリジン",
    "同一オリジンポリシー",
    "プリフライト",
    "preflight",
  ],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>ブラウザには<strong>同一オリジンポリシー</strong>という基本の防御があります。",
    "オリジンとは「スキーム（http/https）＋ホスト名＋ポート」の組で、",
    "あるサイトのJavaScriptは、原則として<strong>別オリジンのAPIのレスポンスを読み取れません</strong>。",
    "これがあるおかげで、悪意あるサイトを開いても、そのサイトのスクリプトがあなたのログイン済み銀行APIの中身を勝手に読むことはできません。</p>",
    "<p>CORS（Cross-Origin Resource Sharing、オリジン間リソース共有）は、",
    "この制限を<strong>サーバーが明示的に許可したぶんだけ緩める</strong>仕組みです。",
    "サーバーが<code>Access-Control-Allow-Origin</code>というレスポンスヘッダーで「このオリジンには読ませてよい」と宣言すると、",
    "ブラウザはそのオリジンのスクリプトにレスポンスの読み取りを許します。",
    "つまりCORSは<strong>制限を追加する仕組みではなく、既定の制限を開ける仕組み</strong>です。ここを取り違えると設定を誤ります。</p>",
    "<p>危険なのは<strong>開け方が緩すぎる</strong>ケースです。とくに",
    "<strong>クッキーなどの認証情報を伴うリクエスト（<code>credentials</code>付き）を、任意のオリジンに許可してしまう</strong>設定は重大です。",
    "反射的にリクエスト元オリジンをそのまま<code>Allow-Origin</code>に返し、かつ<code>Allow-Credentials: true</code>を付けると、",
    "攻撃者のサイトを開いた被害者のブラウザが、<strong>被害者のログイン状態（クッキー）付きで</strong>あなたのAPIにアクセスし、",
    "その応答（個人情報など）を攻撃者のスクリプトが読み取れてしまいます。",
    "なお、仕様上<code>Allow-Origin: *</code>（ワイルドカード）と<code>credentials</code>は同時に使えないため、",
    "攻撃者はオリジンを反射（エコー）させる緩い実装を狙います。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>ログイン済みユーザーの情報を返すAPI（<code>https://api.example.com/me</code>）を題材に、緩いCORS設定が悪用される流れを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "CORSレスポンスヘッダーを観察する",
        detail: "<p>攻撃者はAPIのレスポンスヘッダーを確認します。" +
          "<code>Access-Control-Allow-Origin</code>にリクエスト元オリジンがそのまま反射され、" +
          "さらに<code>Access-Control-Allow-Credentials: true</code>が付いていれば、狙い目だとわかります。</p>",
      },
      {
        title: "オリジンを変えても反射されるか試す",
        detail: "<p>リクエストの<code>Origin</code>ヘッダーを<code>https://evil.example</code>に変えて送ってみます。" +
          "レスポンスの<code>Allow-Origin</code>がそのまま<code>https://evil.example</code>を返せば、" +
          "<strong>許可オリジンの検証をしていない</strong>と確定します。</p>",
      },
      {
        title: "被害者に罠ページを踏ませる",
        detail: "<p>攻撃者は自分のサイト<code>https://evil.example</code>に、" +
          "<code>fetch('https://api.example.com/me', { credentials: 'include' })</code>を実行するスクリプトを仕込み、" +
          "ログイン済みの被害者にそのページを開かせます。</p>",
      },
      {
        title: "被害者のクッキー付きでAPIが呼ばれる",
        detail: "<p>被害者のブラウザはAPIへのリクエストに<strong>被害者のセッションクッキーを自動で添付</strong>します。" +
          "サーバーは正規ログインとみなし、被害者本人の個人情報を返してしまいます。</p>",
      },
      {
        title: "緩いCORS設定によりレスポンスが読める",
        detail: "<p>本来なら同一オリジンポリシーで応答は読めませんが、" +
          "反射された<code>Allow-Origin</code>と<code>Allow-Credentials: true</code>により、" +
          "<code>evil.example</code>のスクリプトがレスポンス本文を読み取り、攻撃者サーバーへ送信します。</p>",
      },
    ],
    note: "<p>CORSは<strong>ブラウザのfetch/XHRからのクロスオリジン読み取り</strong>を制御する仕組みで、" +
      "サーバー間通信やCSRF（別トピック07）とは目的が異なります。" +
      "CORSを緩めても副作用のある操作自体はCSRF対策（トークンやSameSite）で別途守る必要があります。" +
      "根本対策は「許可オリジンを固定のホワイトリストで検証し、必要な場合だけ<code>credentials</code>を許すこと」です。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：CORSヘッダーの設定",
      lang: "JavaScript (Node.js / Express)",
      description: "リクエスト元オリジンを反射しつつ認証情報を許す危険な設定と、ホワイトリストで検証する設定を比べます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.use((req, res, next) => {",
          "  // リクエスト元オリジンを検証せずそのまま反射している",
          "  res.header('Access-Control-Allow-Origin', req.headers.origin);",
          "  // 認証情報つきのクロスオリジン読み取りまで許可している",
          "  res.header('Access-Control-Allow-Credentials', 'true');",
          "  next();",
          "});",
          "",
          "app.get('/me', requireLogin, (req, res) => {",
          "  res.json({ email: req.user.email, address: req.user.address });",
          "});",
        ].join("\n"),
        highlights: [3, 5],
        note: "<p><code>req.headers.origin</code>を検証なしで反射するのは、実質「どのオリジンにも許可」と同じです。" +
          "そこに<code>Allow-Credentials: true</code>が重なると、攻撃者サイトが被害者のクッキー付きで<code>/me</code>を読めます。" +
          "<code>Allow-Origin: *</code>とcredentialsは仕様上両立しないため、攻撃者はこの反射実装を狙います。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const ALLOWED = new Set([",
          "  'https://app.example.com',",
          "  'https://admin.example.com',",
          "]);",
          "",
          "app.use((req, res, next) => {",
          "  const origin = req.headers.origin;",
          "  if (origin && ALLOWED.has(origin)) {",
          "    res.header('Access-Control-Allow-Origin', origin);",
          "    res.header('Access-Control-Allow-Credentials', 'true');",
          "    res.header('Vary', 'Origin');",
          "  }",
          "  next();",
          "});",
        ].join("\n"),
        highlights: [1, 2, 3, 4, 8, 9, 11],
        note: "<p>許可するオリジンを<strong>固定のホワイトリスト</strong>で厳密一致させ、該当時だけヘッダーを付けます。" +
          "オリジンごとに応答が変わるため<code>Vary: Origin</code>を付けてキャッシュ事故を防ぎます。" +
          "<code>startsWith</code>など前方一致の判定は<code>app.example.com.evil.example</code>のような偽装を許すので、必ず完全一致で照合します。</p>",
      },
    },
    {
      title: "corsミドルウェア（cors パッケージ）での設定",
      lang: "JavaScript (Node.js / Express, cors)",
      description: "定番の cors ミドルウェアでも、既定の緩さのまま認証情報を許すと危険です。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "const cors = require('cors');",
          "// すべてのオリジンを許可し、かつ認証情報も許している",
          "app.use(cors({",
          "  origin: true,          // 送られてきたオリジンを常に許可",
          "  credentials: true,",
          "}));",
        ].join("\n"),
        highlights: [4, 5],
        note: "<p><code>origin: true</code>は「リクエスト元オリジンを常に反射して許可」する設定で、" +
          "<code>credentials: true</code>と組み合わせると前の例と同じ危険な状態になります。" +
          "手軽さゆえに本番でそのまま残りがちな典型的な設定ミスです。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const cors = require('cors');",
          "const ALLOWED = ['https://app.example.com'];",
          "app.use(cors({",
          "  origin(origin, cb) {",
          "    // オリジン無し（同一オリジン/サーバー間）は許可、それ以外は照合",
          "    if (!origin || ALLOWED.includes(origin)) return cb(null, true);",
          "    return cb(new Error('CORS: origin not allowed'));",
          "  },",
          "  credentials: true,",
          "  methods: ['GET', 'POST'],",
          "}));",
        ].join("\n"),
        highlights: [2, 4, 6, 7],
        note: "<p><code>origin</code>に関数を渡し、ホワイトリストと照合して許可・拒否を判定します。" +
          "許可メソッドも必要最小限に絞ります。認証情報を許すAPIほどオリジンの検証を厳密にすることが重要です。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "CORS（オリジン間リソース共有）の役割として正しい説明はどれですか。",
      choices: [
        "サーバーへのアクセスを制限し、不正なリクエストをブロックする仕組み",
        "同一オリジンポリシーによる既定の制限を、サーバーが許可した範囲だけ緩める仕組み",
        "通信を暗号化して盗聴を防ぐ仕組み",
        "CSRF攻撃を自動的に無効化する仕組み",
      ],
      answerIndex: 1,
      explanation: "<p>CORSは制限を「追加」するものではなく、同一オリジンポリシーで既定では読めないクロスオリジンのレスポンスを、" +
        "サーバーが<code>Access-Control-Allow-Origin</code>で許可した範囲だけ読めるように「緩める」仕組みです。" +
        "暗号化はHTTPSの役目、CSRF対策はトークンやSameSiteの役目であり、CORSはそれらを代替しません。</p>",
    },
    {
      question: "認証情報（クッキー）付きのAPIで、とくに危険なCORS設定の組み合わせはどれですか。",
      choices: [
        "Access-Control-Allow-Origin を固定の1オリジンにし、credentials を許可する",
        "リクエスト元オリジンを検証せずそのまま反射し、Access-Control-Allow-Credentials: true を付ける",
        "Access-Control-Allow-Origin を * にし、credentials を付けない",
        "CORSヘッダーを一切付けない",
      ],
      answerIndex: 1,
      explanation: "<p>オリジンを無検証で反射しつつ<code>Allow-Credentials: true</code>を付けると、" +
        "攻撃者サイトが被害者のクッキー付きでAPIを呼び、その応答を読めてしまいます。" +
        "固定オリジン＋credentialsは正しい使い方、<code>*</code>かつcredentials無しは応答に認証情報が乗らないため被害は限定的、" +
        "ヘッダー未設定は同一オリジンポリシーが効いたままで安全側です。</p>",
    },
    {
      question: "許可オリジンをホワイトリストで判定する際、避けるべき実装はどれですか。",
      choices: [
        "許可リストと完全一致で照合する",
        "origin.startsWith('https://app.example.com') のような前方一致で判定する",
        "許可時に Vary: Origin ヘッダーを付ける",
        "許可リストに無いオリジンにはCORSヘッダーを付けない",
      ],
      answerIndex: 1,
      explanation: "<p>前方一致（<code>startsWith</code>）は<code>https://app.example.com.evil.example</code>のような偽装オリジンを" +
        "誤って許可してしまいます。オリジンは必ず完全一致で照合します。" +
        "<code>Vary: Origin</code>はキャッシュ事故を防ぐ正しい配慮で、非許可オリジンにヘッダーを付けないのも適切です。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "<code>Access-Control-Allow-Origin</code>を許可オリジンのホワイトリストで完全一致検証している（リクエスト元の無検証な反射をしていない）",
    "<code>Access-Control-Allow-Credentials: true</code>を付けるのは本当に認証情報が必要なAPIに限定し、許可オリジンをより厳密にしている",
    "<code>Allow-Origin: *</code>とcredentialsを併用していない（仕様上両立しないことを理解している）",
    "オリジン判定に<code>startsWith</code>など前方一致・部分一致を使っていない",
    "オリジンによって応答が変わる場合は<code>Vary: Origin</code>を付け、キャッシュの取り違えを防いでいる",
    "許可するHTTPメソッド・ヘッダーを必要最小限に絞っている",
    "CORSはクロスオリジン読み取りの制御であり、CSRF対策（トークン・SameSite、トピック07）は別途行うと理解している",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "MDN: オリジン間リソース共有（CORS）", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Guides/CORS", note: "CORSの全体像とヘッダー解説（日本語）" },
    { title: "MDN: Access-Control-Allow-Origin", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin", note: "許可オリジンヘッダーの仕様（日本語）" },
    { title: "MDN: Request.credentials", url: "https://developer.mozilla.org/ja/docs/Web/API/Request/credentials", note: "認証情報付きリクエストの挙動（日本語）" },
    { title: "Fetch Standard（WHATWG）", url: "https://fetch.spec.whatwg.org/", note: "CORSプロトコルの一次仕様（英語）" },
    { title: "PortSwigger: Cross-origin resource sharing (CORS)", url: "https://portswigger.net/web-security/cors", note: "反射オリジン等の攻撃手法と対策（英語）" },
    { title: "npm cors ミドルウェア（Express）", url: "https://expressjs.com/en/resources/middleware/cors.html", note: "corsパッケージの設定リファレンス（英語）" },
  ],
});
