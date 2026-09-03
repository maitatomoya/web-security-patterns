/**
 * トピック05: 認証とセッション管理
 * カテゴリ: 認証・認可
 */
registerTopic({
  id: 5,
  category: "認証・認可",
  title: "認証とセッション管理",
  summary: "セッションIDの発行・保存・失効の不備が、なりすましやセッション固定を招く問題。Cookie属性の設計を学ぶ。",
  keywords: [
    "セッション", "session", "セッションID", "session fixation", "セッション固定",
    "セッションハイジャック", "Cookie", "HttpOnly", "Secure", "SameSite", "express-session",
  ],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>HTTPは<strong>1回のリクエストごとに切れる（ステートレスな）通信</strong>です。",
    "そのままではサーバーは「今アクセスしてきたのが、さっきログインした本人か」を判別できません。",
    "そこで多くのWebアプリは、ログイン時に推測困難な<strong>セッションID</strong>を発行してクッキーに保存し、",
    "以降はそのIDをDBやメモリ上の「ログイン状態」と突き合わせて本人確認します。",
    "つまりセッションIDは<strong>ログイン後の身分証</strong>であり、これを奪われることは、そのままなりすましを許すことを意味します。</p>",
    "<p>この仕組みには、大きく2つの典型的な弱点があります。1つ目は<strong>セッションハイジャック</strong>で、",
    "XSS（トピック01）や通信の盗聴でセッションIDそのものを盗まれ、攻撃者が被害者としてアクセスされてしまうものです。",
    "2つ目は<strong>セッション固定（session fixation）</strong>で、攻撃者があらかじめ用意したセッションIDを被害者に使わせ、",
    "被害者がそのIDでログインした後に同じIDで乗り込むものです。いずれもパスワードを知らなくても本人になりすませてしまう点が危険です。</p>",
    "<p>根本原因は、<strong>セッションIDの生成・保存・失効の設計の甘さ</strong>にあります。",
    "IDが推測可能だったり、ログイン後にIDを再発行しなかったり、クッキーに<code>HttpOnly</code>・<code>Secure</code>・<code>SameSite</code>といった保護属性が付いていなかったり、",
    "ログアウトや一定時間経過でセッションを確実に無効化していなかったりすると、そこが侵入口になります。",
    "本トピックでは、Node.js/Expressを例に、<strong>ログイン時のセッションID再生成</strong>と<strong>クッキー属性の設計</strong>という2つの中心的な対策を学びます。</p>",
  ].join(""),

  // 攻撃の仕組み
  attack: {
    scenario: "<p>ここでは被害が分かりにくい<strong>セッション固定攻撃</strong>を題材に、攻撃者が被害者になりすますまでの流れを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "攻撃者が正規サイトから自分用のセッションIDを取得する",
        detail: "<p>攻撃者はまず標的サイトに普通にアクセスし、発行されたセッションID（例<code>SID=abc123</code>）を手に入れます。" +
          "この時点ではまだ誰もログインしていない、ただの空のセッションです。</p>",
      },
      {
        title: "そのIDを被害者に使わせる（固定する）",
        detail: "<p>攻撃者は被害者に、このIDを埋め込んだURLを踏ませたり、サイトがクッキーをきちんと管理していない隙を突いて、" +
          "被害者のブラウザに<code>SID=abc123</code>を使わせます。IDを攻撃者が知っているものに「固定」するのがこの攻撃の肝です。</p>",
      },
      {
        title: "被害者がそのIDのままログインする",
        detail: "<p>被害者は自分のIDとパスワードで正規にログインします。ここで<strong>サーバーがログイン後もセッションIDを変えない</strong>実装だと、" +
          "空だったセッション<code>abc123</code>が「被害者のログイン済みセッション」に昇格してしまいます。</p>",
      },
      {
        title: "攻撃者が同じIDで乗り込む",
        detail: "<p>攻撃者は最初から知っている<code>SID=abc123</code>を自分のブラウザにセットしてアクセスします。" +
          "サーバーから見れば正規のログイン済みセッションなので、攻撃者はパスワードを知らないまま被害者として操作できてしまいます。</p>",
      },
      {
        title: "権限を悪用する",
        detail: "<p>なりすましに成功した攻撃者は、被害者としてメールアドレスの変更、決済、退会などを実行します。" +
          "セッションハイジャック（IDの窃取）でも最終的な結果は同じで、いずれも「IDを握った者が本人扱いされる」ことが被害の本質です。</p>",
      },
    ],
    note: "<p>セッション固定の根本対策は<strong>ログイン成功時に古いセッションIDを破棄して新しいIDを発行する</strong>ことです。" +
      "こうすると、攻撃者が事前に用意したIDはログイン後に無効化され、乗り込めなくなります。" +
      "IDの窃取に対しては、<code>HttpOnly</code>でJavaScriptからの読み取りを封じ、<code>Secure</code>でHTTPS以外に送らせないことが効きます。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "ログイン処理：セッションIDの再生成",
      lang: "JavaScript (Node.js / Express, express-session)",
      description: "ログイン成功時にセッションIDをどう扱うかを比較します。セッション固定攻撃を防げるかどうかの分かれ目です。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.post('/login', async (req, res) => {",
          "  const user = await findUser(req.body.email);",
          "  const ok = user && await verifyPassword(req.body.password, user.hash);",
          "  if (!ok) return res.status(401).send('認証に失敗しました');",
          "",
          "  // ログイン前と同じセッションIDのまま、ログイン情報だけを入れる",
          "  req.session.userId = user.id;",
          "  res.redirect('/mypage');",
          "});",
        ].join("\n"),
        highlights: [6, 7],
        note: "<p>ログイン前後でセッションIDが変わりません。攻撃者が事前に固定したIDのままログインが成立するため、" +
          "同じIDを知っている攻撃者に被害者のログイン状態を乗っ取られます（セッション固定）。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.post('/login', async (req, res) => {",
          "  const user = await findUser(req.body.email);",
          "  const ok = user && await verifyPassword(req.body.password, user.hash);",
          "  if (!ok) return res.status(401).send('認証に失敗しました');",
          "",
          "  // 認証成功時に古いIDを捨て、新しいセッションIDを発行する",
          "  req.session.regenerate((err) => {",
          "    if (err) return res.status(500).send('エラーが発生しました');",
          "    req.session.userId = user.id;",
          "    res.redirect('/mypage');",
          "  });",
          "});",
        ].join("\n"),
        highlights: [6, 7, 8, 9],
        note: "<p><code>req.session.regenerate()</code>で古いセッションを破棄し、新しいIDを発行してからログイン情報を入れます。" +
          "攻撃者が固定したIDはログイン成立の瞬間に無効化されます。ログアウト時は<code>req.session.destroy()</code>でサーバー側のセッションも確実に消します。</p>",
      },
    },
    {
      title: "セッションクッキーの属性設定",
      lang: "JavaScript (Node.js / Express, express-session)",
      description: "セッションIDを運ぶクッキーに、どの保護属性を付けるかを比較します。IDが盗まれる経路をふさぐ設定です。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.use(session({",
          "  secret: 'keyboard cat',      // 秘密鍵をソースに直書き",
          "  resave: false,",
          "  saveUninitialized: true,     // 未ログインでも無駄にセッション発行",
          "  cookie: {",
          "    // httpOnly / secure / sameSite / 有効期限をどれも指定していない",
          "  },",
          "}));",
        ].join("\n"),
        highlights: [2, 4, 6],
        note: "<p>秘密鍵の直書きは漏洩時にセッション偽造を許します。属性未指定のクッキーはJavaScriptから読め（XSSでの窃取に無防備）、" +
          "HTTP通信でも平文で送られ（盗聴に無防備）、有効期限も曖昧になります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.use(session({",
          "  secret: process.env.SESSION_SECRET, // 十分に長い乱数を環境変数から",
          "  resave: false,",
          "  saveUninitialized: false,",
          "  cookie: {",
          "    httpOnly: true,   // document.cookie から読めなくする",
          "    secure: true,     // HTTPSのときだけ送信する",
          "    sameSite: 'lax',  // 他サイト起点の送信を制限（CSRF緩和。トピック07）",
          "    maxAge: 1000 * 60 * 30, // 無操作30分で失効（アイドルタイムアウト）",
          "  },",
          "}));",
        ].join("\n"),
        highlights: [2, 6, 7, 8, 9],
        note: "<p><code>httpOnly</code>でXSSからのID窃取を、<code>secure</code>で盗聴を、<code>sameSite</code>でCSRFを緩和します。" +
          "<code>maxAge</code>は無操作での失効（アイドルタイムアウト）です。加えて、ログインからの経過時間で切る" +
          "<strong>絶対タイムアウト</strong>もサーバー側に持たせると、盗まれたIDの有効期間を短くできます。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "セッション固定（session fixation）攻撃を防ぐ最も直接的な対策はどれですか。",
      choices: [
        "セッションIDをURLのクエリパラメータで受け渡す",
        "ログイン成功時に古いセッションIDを破棄し、新しいIDを再発行する",
        "セッションIDをできるだけ短くして通信量を減らす",
        "ログインフォームのHTMLをキャッシュさせる",
      ],
      answerIndex: 1,
      explanation: "<p>セッション固定は、攻撃者が用意したIDのまま被害者がログインすることで成立します。" +
        "<code>regenerate()</code>などでログイン時にIDを作り直せば、攻撃者が事前に固定したIDは無効化され乗っ取れません。" +
        "IDをURLに載せるとむしろ漏洩・固定を招き、IDを短くすると推測されやすくなり、いずれも逆効果です。</p>",
    },
    {
      question: "セッションクッキーに付ける <code>HttpOnly</code> 属性の効果として正しいものはどれですか。",
      choices: [
        "クッキーをHTTPS通信のときだけ送信するようになる",
        "クッキーの有効期限を自動的に延長する",
        "JavaScriptの <code>document.cookie</code> からクッキーを読めなくし、XSS時のID窃取を緩和する",
        "サーバー側のセッションデータを暗号化する",
      ],
      answerIndex: 2,
      explanation: "<p><code>HttpOnly</code>はJavaScriptからクッキーを参照できなくする属性で、" +
        "XSSに遭ってもセッションIDを<code>document.cookie</code>から盗み出せなくします。" +
        "HTTPSのときだけ送るのは<code>Secure</code>属性の役割で、有効期限延長やサーバー側データの暗号化とは無関係です。</p>",
    },
    {
      question: "セッションIDの発行について、セキュリティ上もっとも適切なものはどれですか。",
      choices: [
        "暗号論的に安全な乱数で十分な長さのIDを生成し、推測を不可能にする",
        "ユーザーIDと登録日時を連結して分かりやすいIDにする",
        "連番（1, 2, 3, …）にして管理しやすくする",
        "ユーザー名をそのままセッションIDとして使う",
      ],
      answerIndex: 0,
      explanation: "<p>セッションIDは「当てられたら即なりすまし」なので、暗号論的乱数で十分な長さ（推測できない値）にするのが必須です。" +
        "ユーザーIDや日時の連結、連番、ユーザー名の流用は、いずれも規則性から他人のIDを推測・総当りされる危険があり不適切です。" +
        "express-sessionなどのライブラリは既定でこの安全な生成を行います。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "ログイン成功時に <code>req.session.regenerate()</code> 等でセッションIDを再発行している（セッション固定対策）",
    "セッションクッキーに <code>HttpOnly</code> と <code>Secure</code> を付け、JavaScriptからの読み取りと平文送信を防いでいる",
    "<code>SameSite</code> 属性（Lax以上）を明示的に指定している（CSRF緩和。詳細はトピック07）",
    "セッションIDは暗号論的乱数で生成し、推測可能な値（連番・ユーザー名など）を使っていない",
    "無操作での失効（アイドルタイムアウト）と、ログインからの経過での失効（絶対タイムアウト）の両方を設けている",
    "ログアウト時にサーバー側のセッションを <code>destroy()</code> で確実に破棄し、クッキーも削除している",
    "セッションの秘密鍵はコードに直書きせず、環境変数など安全な場所から読み込んでいる（詳細はトピック13）",
  ],

  // 参考資料
  references: [
    { title: "OWASP Cheat Sheet: Session Management", url: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html", note: "セッションID・クッキー属性・失効の実務指針（英語）" },
    { title: "OWASP Cheat Sheet: Authentication", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html", note: "認証全般のベストプラクティス（英語）" },
    { title: "OWASP: Session fixation", url: "https://owasp.org/www-community/attacks/Session_fixation", note: "セッション固定攻撃の仕組み（英語）" },
    { title: "MDN: Set-Cookie ヘッダー", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Set-Cookie", note: "HttpOnly・Secure・SameSite等の属性（日本語）" },
    { title: "MDN: Set-Cookie の SameSite 属性", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesite", note: "SameSiteの各値の挙動（日本語）" },
    { title: "RFC 6265: HTTP State Management Mechanism", url: "https://datatracker.ietf.org/doc/html/rfc6265", note: "クッキーの仕様の一次情報（英語）" },
  ],
});
