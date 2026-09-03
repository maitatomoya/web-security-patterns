/**
 * トピック07: クロスサイトリクエストフォージェリ（CSRF）
 * カテゴリ: 認証・認可
 */
registerTopic({
  id: 7,
  category: "認証・認可",
  title: "クロスサイトリクエストフォージェリ（CSRF）",
  summary: "ログイン済みユーザーに意図しない副作用のあるリクエストを送らせる脆弱性。トークンとSameSiteによる対策を学ぶ。",
  keywords: [
    "CSRF", "cross site request forgery", "XSRF", "CSRFトークン", "synchronizer token",
    "SameSite", "Cookie", "double submit", "Origin", "Referer", "リクエスト偽造",
  ],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>クロスサイトリクエストフォージェリ（CSRF、シーサーフ）は、<strong>ログイン中の利用者のブラウザを利用して、",
    "本人が意図しないリクエストを正規サイトへ送らせる</strong>攻撃です。",
    "鍵になるのは、ブラウザが<strong>クッキーを自動で送る</strong>という仕様です。",
    "利用者があるサイトにログイン済みなら、そのサイト宛てのリクエストには、たとえ<strong>別サイト（攻撃者のページ）が起点でも</strong>セッションクッキーが付いて送られます。",
    "サーバーはクッキーが正しいので「本人からの正規リクエスト」と信じて処理してしまいます。</p>",
    "<p>なぜ危険かというと、攻撃者はパスワードもセッションIDも盗む必要がないからです。",
    "利用者をだまして攻撃者のページを開かせるだけで、<strong>送金・メールアドレス変更・退会・設定変更</strong>といった副作用のある操作を、本人の権限で勝手に実行できてしまいます。",
    "利用者から見れば、身に覚えのない操作が自分のアカウントで起きることになります。</p>",
    "<p>XSS（トピック01）と混同されがちですが仕組みは逆です。XSSは<strong>被害者のブラウザで攻撃者のスクリプトを動かす</strong>攻撃で、情報の窃取もできます。",
    "一方CSRFは<strong>スクリプトを動かさず、正規サイトへのリクエストを偽造して送るだけ</strong>で、レスポンスを読むことは基本的にできません（同一オリジンポリシーが読み取りを防ぐ）。",
    "根本原因は、サーバーが「そのリクエストが本当に自サイトの画面から、本人の意思で送られたか」を検証していないことです。",
    "対策の中心は<strong>CSRFトークン</strong>（推測不能な合言葉をフォームに埋め、送信時に照合する）と、クッキーの<strong>SameSite属性</strong>（他サイト起点の送信にクッキーを付けない。トピック05）の二段構えです。</p>",
  ].join(""),

  // 攻撃の仕組み
  attack: {
    scenario: "<p>ネットバンキング風のサイトで、ログイン中の利用者に「メールアドレス変更」を勝手に実行させる流れを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "標的の副作用リクエストの形を調べる",
        detail: "<p>攻撃者はまず、変更処理がどんなリクエストかを調べます。たとえば" +
          "<code>POST /account/email</code> に <code>email=...</code> を送る形だと分かれば、あとはこれを偽造するだけです。" +
          "CSRFトークンのような追加の検証がないことが攻撃の前提になります。</p>",
      },
      {
        title: "攻撃者のサイトに自動送信の罠を仕込む",
        detail: "<p>攻撃者は自分のページ（例<code>evil.example</code>）に、標的サイト宛ての隠しフォームを置き、" +
          "ページを開いた瞬間にJavaScriptで自動送信させます。GETで副作用が起きる実装なら、" +
          "<code>&lt;img src=\"https://bank.example/account/email?email=attacker@evil.example\"&gt;</code>のように画像タグ1つで済んでしまいます。</p>",
      },
      {
        title: "ログイン中の被害者を誘導する",
        detail: "<p>攻撃者はメールやSNSで、この罠ページのURLを被害者に踏ませます。" +
          "被害者が標的サイトに<strong>ログインしたまま</strong>罠ページを開くことが条件です（多くの人は複数タブでログイン状態を保っています）。</p>",
      },
      {
        title: "ブラウザがクッキー付きで送信し、サーバーが実行する",
        detail: "<p>罠ページから標的サイトへリクエストが飛ぶ際、ブラウザは標的サイトのセッションクッキーを自動で付けます。" +
          "サーバーはクッキーが正しいので正規の要求と判断し、メールアドレスを攻撃者のものに書き換えてしまいます。</p>",
      },
      {
        title: "乗っ取りにつなげる",
        detail: "<p>メールアドレスを攻撃者のものに変えられれば、パスワード再設定メールを攻撃者が受け取れます。" +
          "こうして最終的にアカウントごと乗っ取られます。CSRFは単独の被害だけでなく、乗っ取りの起点にもなります。</p>",
      },
    ],
    note: "<p>緩和策と根本対策を分けて考えます。<code>SameSite</code>属性は他サイト起点の送信にクッキーを付けさせない有効な<strong>緩和策</strong>ですが、" +
      "既定挙動はブラウザやバージョンで差があり、サブドメインをまたぐ構成などでは万全ではありません。" +
      "そのため、サーバー側で<strong>CSRFトークンを照合する</strong>ことを根本対策の軸に置き、SameSiteを多層防御として併用するのが定石です。" +
      "また、副作用のある操作は必ず<code>POST</code>など安全でないメソッドにし、<code>GET</code>で状態を変えない設計も前提になります。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：CSRFトークンの発行と照合",
      lang: "JavaScript (Node.js / Express)",
      description: "メールアドレス変更を例に、フォーム表示と変更処理を比較します。合言葉（トークン）で「自サイトの画面から来た要求か」を検証できるかがポイントです。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// フォーム表示",
          "app.get('/account/email', requireLogin, (req, res) => {",
          "  res.send(renderForm()); // 隠しトークンなし",
          "});",
          "",
          "// 変更処理：ログイン状態（クッキー）だけを見て実行",
          "app.post('/account/email', requireLogin, async (req, res) => {",
          "  await db.updateEmail(req.session.userId, req.body.email);",
          "  res.send('変更しました');",
          "});",
        ].join("\n"),
        highlights: [7, 8],
        note: "<p><code>requireLogin</code>はクッキーのセッションを見るだけです。" +
          "クッキーは他サイト起点のリクエストにも自動で付くため、攻撃者のページからのPOSTも「正規のログイン要求」として通ってしまいます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const crypto = require('crypto');",
          "",
          "// フォーム表示時にトークンを発行しセッションに保存する",
          "app.get('/account/email', requireLogin, (req, res) => {",
          "  const token = crypto.randomBytes(32).toString('hex');",
          "  req.session.csrfToken = token;",
          "  res.send(renderForm(token)); // hidden inputにtokenを埋め込む",
          "});",
          "",
          "// 変更時、フォームの値とセッションの値を照合してから実行",
          "app.post('/account/email', requireLogin, async (req, res) => {",
          "  const sent = req.body._csrf;",
          "  const saved = req.session.csrfToken;",
          "  if (!sent || sent !== saved) return res.status(403).send('CSRF検証に失敗しました');",
          "  await db.updateEmail(req.session.userId, req.body.email);",
          "  res.send('変更しました');",
          "});",
        ].join("\n"),
        highlights: [5, 6, 7, 12, 13, 14],
        note: "<p>推測できないトークンをサーバーが発行し、フォームの隠し項目に埋め込みます（Synchronizer Tokenパターン）。" +
          "攻撃者のページはこのトークンを知りようがないため、照合で弾かれます。" +
          "実務では<code>csrf-csrf</code>などのライブラリを使うと、トークン発行・検証・使い回し防止をまとめて扱えて安全です。" +
          "SPAでは同等の仕組みをカスタムヘッダー（例<code>X-CSRF-Token</code>）で実現します。</p>",
      },
    },
    {
      title: "多層防御：セッションクッキーのSameSite属性",
      lang: "JavaScript (Node.js / Express, express-session)",
      description: "トークンに加え、クッキー自体を他サイト起点の送信で付けさせない設定を比較します。トピック05のセッション設計と地続きです。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.use(session({",
          "  secret: process.env.SESSION_SECRET,",
          "  resave: false,",
          "  saveUninitialized: false,",
          "  cookie: {",
          "    httpOnly: true,",
          "    secure: true,",
          "    // sameSite を指定していない",
          "  },",
          "}));",
        ].join("\n"),
        highlights: [8],
        note: "<p><code>sameSite</code>を明示していません。既定の挙動はブラウザやバージョンで異なり、" +
          "古い環境では他サイト起点のPOSTにもクッキーが付いてしまうため、CSRFの緩和が効かないことがあります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.use(session({",
          "  secret: process.env.SESSION_SECRET,",
          "  resave: false,",
          "  saveUninitialized: false,",
          "  cookie: {",
          "    httpOnly: true,",
          "    secure: true,",
          "    sameSite: 'lax', // 他サイト起点のPOST等にクッキーを付けない",
          "  },",
          "}));",
        ].join("\n"),
        highlights: [8],
        note: "<p><code>sameSite: 'lax'</code>で、他サイトからのフォーム送信やサブリソース要求にクッキーが付かなくなります（トップレベルのGET遷移では付く）。" +
          "より厳格な<code>'strict'</code>は外部リンクからの遷移でも未ログイン扱いになり利便性が下がるため用途次第です。" +
          "ただしSameSiteは<strong>緩和策</strong>であり、CSRFトークンの代わりにはなりません。両方を併用します。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "CSRF攻撃が成立するための前提として正しいものはどれですか。",
      choices: [
        "被害者が対象サイトにログイン済みで、ブラウザがセッションクッキーを自動送信すること",
        "攻撃者が被害者のパスワードをあらかじめ知っていること",
        "被害者のブラウザでJavaScriptが無効になっていること",
        "対象サイトがHTTPSに対応していないこと",
      ],
      answerIndex: 0,
      explanation: "<p>CSRFは、ログイン済みの被害者のブラウザがクッキーを自動送信する性質を悪用します。" +
        "だからパスワードやセッションIDを盗む必要はなく、罠ページを開かせるだけで本人の権限で操作を実行できます。" +
        "JavaScriptの有無やHTTPSの有無は成立条件ではなく（HTTPSでもCSRFは起こります）、前提はあくまで「ログイン状態＋クッキー自動送信」です。</p>",
    },
    {
      question: "CSRFトークン（Synchronizer Token）が防御になる理由はどれですか。",
      choices: [
        "トークンによって通信全体が暗号化されるため",
        "攻撃者のサイトからは、サーバーが発行した推測不能なトークンの値を知ることができず、正しく送れないため",
        "トークンがあるとクッキーがブラウザに保存されなくなるため",
        "トークンがパスワードの代わりになり再認証されるため",
      ],
      answerIndex: 1,
      explanation: "<p>サーバーは画面表示時に推測できないトークンを発行してフォームに埋め込み、送信時に照合します。" +
        "攻撃者のページは同一オリジンポリシーによりそのトークンを読み取れないため、正しい値を付けて送れず、検証で弾かれます。" +
        "トークンは通信の暗号化（HTTPSの役割）でもクッキー保存の制御でも、パスワードの代替でもありません。</p>",
    },
    {
      question: "CSRFとXSSの違いの説明として最も適切なものはどれですか。",
      choices: [
        "CSRFもXSSも、被害者のブラウザで攻撃者のスクリプトを実行する点は同じである",
        "CSRFは被害者のブラウザでスクリプトを実行せず、正規サイトへのリクエストを偽造して送る攻撃である",
        "CSRFはサーバーのファイルを直接書き換える攻撃である",
        "XSSはクッキーを一切利用しない攻撃である",
      ],
      answerIndex: 1,
      explanation: "<p>CSRFはスクリプト実行を必要とせず、クッキーが自動送信される性質を使って正規サイトへのリクエストを偽造します（レスポンスは基本読めません）。" +
        "対してXSSは被害者のブラウザで攻撃者のスクリプトを実行させ、情報窃取や画面改ざんも可能です。" +
        "CSRFはサーバーのファイルを直接書き換えるものではなく、XSSはむしろクッキー窃取に使われることが多い点でも選択肢は誤りです。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "状態を変える操作（作成・更新・削除・送金など）はすべて <code>POST</code> 等の安全でないメソッドで受け、<code>GET</code> で副作用を起こしていない",
    "副作用のあるリクエストで CSRFトークンを発行・照合している（自作せず <code>csrf-csrf</code> 等の実績あるライブラリを利用）",
    "セッションクッキーに <code>SameSite</code>（Lax以上）を明示し、多層防御として併用している（詳細はトピック05）",
    "SPA/API では <code>X-CSRF-Token</code> などのカスタムヘッダーやトークン照合で、単純なクロスサイト送信を弾いている",
    "サーバー側で <code>Origin</code>/<code>Referer</code> ヘッダーを検証し、想定外のオリジンからの要求を拒否している",
    "CSRFトークンをXSSで盗まれないよう、XSS対策（出力エスケープ・CSP。トピック01/10）も併せて実施している",
    "パスワード変更・メール変更・送金など重要操作では、再認証や確認ステップを追加している",
  ],

  // 参考資料
  references: [
    { title: "OWASP: Cross Site Request Forgery (CSRF)", url: "https://owasp.org/www-community/attacks/csrf", note: "CSRFの定義と仕組み（英語）" },
    { title: "OWASP Cheat Sheet: CSRF Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html", note: "トークン・SameSite・Origin検証の実務指針（英語）" },
    { title: "MDN: クロスサイトリクエストフォージェリ (CSRF)", url: "https://developer.mozilla.org/ja/docs/Web/Security/Attacks/CSRF", note: "CSRFの概要（日本語）" },
    { title: "MDN: Set-Cookie の SameSite 属性", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesite", note: "SameSiteの各値の挙動（日本語）" },
    { title: "web.dev: SameSite cookies explained", url: "https://web.dev/articles/samesite-cookies-explained", note: "SameSiteの挙動と移行の解説（英語）" },
  ],
});
