/**
 * トピック08: IDOR・認可不備
 * カテゴリ: 認証・認可
 */
registerTopic({
  id: 8,
  category: "認証・認可",
  title: "IDOR・認可不備",
  summary: "リソースIDを差し替えるだけで他人のデータにアクセスできる、オブジェクトレベル認可の欠落。",
  keywords: [
    "IDOR",
    "Insecure Direct Object Reference",
    "認可不備",
    "Broken Access Control",
    "BOLA",
    "オブジェクトレベル認可",
    "アクセス制御",
    "水平権限昇格",
    "垂直権限昇格",
  ],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>IDOR（Insecure Direct Object Reference、安全でない直接オブジェクト参照）は、",
    "URLやリクエストに含まれる<strong>リソースのID（注文番号やユーザーIDなど）を別の値に差し替えるだけで、",
    "本来アクセスできないはずの他人のデータを読み書きできてしまう</strong>脆弱性です。",
    "OWASP Top 10では「アクセス制御の不備（Broken Access Control）」の代表例として扱われ、",
    "近年もっとも多く報告される種類の一つです。</p>",
    "<p>なぜ起きるかというと、多くのアプリが<strong>「ログインしているか（認証）」は確認するのに、",
    "「そのユーザーがこの特定のデータを見てよいか（認可）」を確認していない</strong>からです。",
    "たとえば<code>GET /api/orders/1024</code>という注文詳細のAPIが、",
    "リクエストしてきたユーザーが本当に注文1024の持ち主かを照合せず、IDだけでDBを引いて返してしまう、という作りです。",
    "こうした「特定のオブジェクト（1件のデータ）に対する権限チェック漏れ」を、",
    "APIセキュリティの分野では<strong>BOLA（Broken Object Level Authorization、オブジェクトレベル認可の不備）</strong>とも呼びます。</p>",
    "<p>被害は具体的です。連番のIDを1ずつ増やして総当たりすれば、",
    "全ユーザーの個人情報・請求書・メッセージなどを一括で吸い出せます（情報漏えい）。",
    "さらに更新・削除系のAPI（<code>PUT</code>や<code>DELETE</code>）に同じ穴があれば、",
    "他人のデータの改ざんや消去まで可能になります。",
    "IDを推測しにくいUUIDに変えるのは<strong>緩和策にすぎず</strong>、根本原因である",
    "<strong>「サーバー側で毎回、所有者・権限を照合していないこと」</strong>を直さない限り脆弱性は残ります。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>ECサイトの「注文詳細」ページを題材に、IDを差し替えて他人の注文情報を盗み見るまでの流れを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "自分のデータでID付きのリクエストを観察する",
        detail: "<p>攻撃者はまず正規ユーザーとしてログインし、自分の注文詳細を開きます。" +
          "ブラウザの開発者ツールで通信を見ると<code>GET /api/orders/1024</code>のように、" +
          "URLに注文IDがそのまま入っていることに気付きます。</p>",
      },
      {
        title: "IDを別の値に差し替えて試す",
        detail: "<p>次に<code>1024</code>を<code>1023</code>や<code>1025</code>に変えてリクエストします。" +
          "自分のものではない注文の中身（氏名・住所・購入品）が返ってきたら、" +
          "所有者チェックが無い＝IDORが存在すると確認できます。</p>",
      },
      {
        title: "連番IDを総当たりして一括で吸い出す",
        detail: "<p>IDが連番だとわかれば、<code>1</code>から順にアクセスするスクリプトで全注文を機械的に取得できます。" +
          "1件ずつは小さな漏えいでも、総当たりで<strong>全顧客の個人情報</strong>がまとめて流出します。</p>",
      },
      {
        title: "更新・削除系のAPIも同じIDで狙う",
        detail: "<p>攻撃者は<code>PUT /api/orders/1023</code>や<code>DELETE /api/orders/1023</code>も試します。" +
          "ここにも所有者チェックが無ければ、他人の注文の住所を書き換えて商品を横取りしたり、" +
          "注文を消したりできてしまいます。</p>",
      },
      {
        title: "権限（ロール）の壁も越えられないか確かめる",
        detail: "<p>さらに<code>/api/admin/users</code>のような管理者向けエンドポイントに一般ユーザーのまま直接アクセスします。" +
          "画面にボタンが出ていないだけでサーバーがロールを検証していなければ、" +
          "一般ユーザーが管理機能を使える<strong>垂直権限昇格</strong>につながります。</p>",
      },
    ],
    note: "<p>他人のデータへ横に広がるのが<strong>水平権限昇格</strong>（同じ一般ユーザー同士）、" +
      "一般ユーザーが管理者機能に手を伸ばすのが<strong>垂直権限昇格</strong>です。" +
      "IDを推測困難なUUIDにするのは総当たりを遅らせる緩和にすぎません。" +
      "URLやSNSでIDが漏れれば意味がなくなるため、根本対策は「リクエストのたびにサーバー側で所有者と権限を照合する」ことです。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：注文詳細の取得（所有者チェック）",
      lang: "JavaScript (Node.js / Express)",
      description: "ログイン済みユーザーが自分の注文を見るAPI。IDだけでDBを引いていないかに注目します。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// 認証済み（req.userにログイン中ユーザーが入る）",
          "app.get('/api/orders/:id', requireLogin, async (req, res) => {",
          "  const order = await db.orders.findById(req.params.id);",
          "  if (!order) return res.status(404).json({ error: 'not found' });",
          "  // 誰の注文かを確認せずそのまま返している",
          "  res.json(order);",
          "});",
        ].join("\n"),
        highlights: [3, 6],
        note: "<p>ログイン（認証）は<code>requireLogin</code>で済ませていますが、" +
          "<strong>その注文が本当にログイン中ユーザーのものか</strong>を照合していません。" +
          "<code>:id</code>を差し替えれば誰の注文でも取得でき、これがIDORです。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.get('/api/orders/:id', requireLogin, async (req, res) => {",
          "  // 所有者条件をクエリに含めて取得する",
          "  const order = await db.orders.findOne({",
          "    id: req.params.id,",
          "    userId: req.user.id,",
          "  });",
          "  // 他人の注文は存在しないものとして扱う（404）",
          "  if (!order) return res.status(404).json({ error: 'not found' });",
          "  res.json(order);",
          "});",
        ].join("\n"),
        highlights: [3, 4, 5, 6, 8],
        note: "<p>取得の条件に<code>userId: req.user.id</code>を加え、" +
          "<strong>ログイン中ユーザーの注文だけ</strong>をDBから引きます。" +
          "他人のIDを指定しても該当なしになり、あえて<code>403</code>ではなく<code>404</code>を返すことで" +
          "「そのIDの存在」自体を攻撃者に教えない配慮もできます。</p>",
      },
    },
    {
      title: "サーバー側：管理者機能のロール確認",
      lang: "JavaScript (Node.js / Express)",
      description: "画面にボタンを出さないだけの「隠す対策」と、サーバーで権限を照合する対策の違いを見ます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// 一覧APIはログインさえしていれば誰でも叩ける",
          "app.get('/api/admin/users', requireLogin, async (req, res) => {",
          "  const users = await db.users.findAll();",
          "  res.json(users);",
          "});",
          "// UI側で管理者にだけボタンを表示している（が、APIは無防備）",
        ].join("\n"),
        highlights: [2, 6],
        note: "<p>フロントで管理者だけにボタンを見せても、APIのURLを直接叩けば誰でも実行できます。" +
          "「UIで隠す」はアクセス制御ではありません。ロールの検証がサーバーに無い時点で垂直権限昇格が可能です。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "// ロールをサーバー側で検証するミドルウェア",
          "function requireRole(role) {",
          "  return (req, res, next) => {",
          "    if (req.user.role !== role) {",
          "      return res.status(403).json({ error: 'forbidden' });",
          "    }",
          "    next();",
          "  };",
          "}",
          "",
          "app.get('/api/admin/users', requireLogin, requireRole('admin'),",
          "  async (req, res) => {",
          "    res.json(await db.users.findAll());",
          "  });",
        ].join("\n"),
        highlights: [2, 4, 5, 11],
        note: "<p>サーバー側で<code>req.user.role</code>を検証し、管理者以外は<code>403</code>で拒否します。" +
          "権限は<strong>サーバーが毎回チェックする</strong>のが原則で、ロールはクライアントから受け取った値ではなく" +
          "セッションやトークンに紐づくサーバー側の情報を使います。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "IDOR（安全でない直接オブジェクト参照）の根本原因として最も適切なものはどれですか。",
      choices: [
        "リソースIDが連番で推測しやすいこと",
        "サーバー側で、そのリソースを要求者が操作してよいかという所有者・権限の照合が欠けていること",
        "通信がHTTPSで暗号化されていないこと",
        "パスワードのハッシュ化が不十分なこと",
      ],
      answerIndex: 1,
      explanation: "<p>IDORの本質は「認証は通っているが認可（このデータを見てよいか）を確認していない」ことです。" +
        "IDが連番だと総当たりが容易になりますが、それは被害を広げる要因にすぎず、" +
        "推測しにくいIDにしても照合が無ければIDは漏れた時点で悪用されます。" +
        "HTTPSやパスワード保存は別レイヤーの対策で、IDORの原因ではありません。</p>",
    },
    {
      question: "IDを推測困難なUUIDに変える対策について、正しい説明はどれですか。",
      choices: [
        "UUIDにすれば所有者チェックは不要になる",
        "総当たりを難しくする緩和策だが、IDが漏れれば悪用され、根本対策にはならない",
        "UUIDは暗号化されているため復号しない限り誰もアクセスできない",
        "UUIDにすると認可チェックが自動的に有効になる",
      ],
      answerIndex: 1,
      explanation: "<p>UUID化は連番総当たりを難しくする緩和策です。しかしUUIDは暗号化ではなく単なる識別子で、" +
        "URL・ログ・共有リンク・SNSなどから漏れれば、所有者チェックが無い限りそのまま悪用されます。" +
        "認可が自動で有効になることもありません。根本対策はサーバー側で毎回所有者と権限を照合することです。</p>",
    },
    {
      question: "管理者専用の一覧APIを一般ユーザーが直接URLを叩いて利用できてしまいました。最も適切な対策はどれですか。",
      choices: [
        "フロントエンドで管理者以外には画面のボタンを表示しないようにする",
        "APIのURLを推測されにくい長い名前に変える",
        "サーバー側でセッション由来のロールを検証し、権限が無ければ403で拒否する",
        "管理者機能のJavaScriptファイルを難読化する",
      ],
      answerIndex: 2,
      explanation: "<p>アクセス制御はサーバー側で行うのが原則です。ボタンを隠す・URLを変える・JSを難読化するのは" +
        "いずれもクライアント側の「隠蔽」にすぎず、APIを直接叩かれれば無力です（垂直権限昇格）。" +
        "サーバーがセッションやトークンに紐づくロールを毎回検証し、権限が無ければ拒否する形が正解です。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "リソースを返す・更新するAPIで、リクエスト者がそのオブジェクトの所有者か（または権限を持つか）を毎回サーバー側で照合している",
    "取得系だけでなく更新（<code>PUT</code>/<code>PATCH</code>）・削除（<code>DELETE</code>）でも同じ所有者・権限チェックを掛けている",
    "ロールや権限の判定に、クライアントから送られた値ではなくセッション・トークン由来のサーバー側の情報を使っている",
    "管理者用エンドポイントは、UIで隠すだけでなくサーバー側でロールを検証している",
    "認可の判定を各所にコピペせず、ミドルウェアや共通関数に集約して漏れを防いでいる",
    "IDのUUID化は緩和策と理解し、所有者チェックと併用している（UUID単体を対策にしていない）",
    "他人のリソースには一貫して<code>404</code>または<code>403</code>を返し、IDの存在有無を推測させない方針を決めている",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Top 10: A01 アクセス制御の不備", url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/", note: "IDORを含むアクセス制御不備の全体像（英語）" },
    { title: "OWASP Cheat Sheet: Insecure Direct Object Reference Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html", note: "IDOR対策の実務ルール（英語）" },
    { title: "OWASP Cheat Sheet: Authorization", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html", note: "認可設計の指針（英語）" },
    { title: "OWASP API Security Top 10: API1 BOLA", url: "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/", note: "オブジェクトレベル認可の不備（英語）" },
    { title: "CWE-639: Authorization Bypass Through User-Controlled Key", url: "https://cwe.mitre.org/data/definitions/639.html", note: "IDORに対応する脆弱性分類（英語）" },
  ],
});
