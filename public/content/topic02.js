/**
 * トピック02: SQLインジェクション
 * カテゴリ: インジェクション
 */
registerTopic({
  id: 2,
  category: "インジェクション",
  title: "SQLインジェクション",
  summary: "入力がSQL文の一部として解釈され、認証回避やデータ窃取・改ざんを許す脆弱性。プレースホルダで防ぐ。",
  keywords: ["SQLインジェクション", "SQL injection", "SQLi", "プレースホルダ", "プリペアドステートメント", "parameterized query", "エスケープ", "ORM"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>SQLインジェクション（SQLi）は、利用者の入力が<strong>SQL文の一部（命令）として解釈されてしまう</strong>脆弱性です。",
    "アプリはデータベースに問い合わせるとき、SQLという言語で命令文を組み立てます。",
    "このとき入力値を文字列連結でそのままSQLに埋め込むと、攻撃者は入力欄に「値」ではなく「SQLの構文」を送り込み、",
    "本来意図しない問い合わせをデータベースに実行させることができます。</p>",
    "<p>なぜ危険かというと、データベースはアプリの心臓部で、ユーザー情報・注文・決済履歴などがすべて集まっているからです。",
    "攻撃が成立すると、<strong>ログインを回避して他人になりすます</strong>、<strong>全テーブルのデータを丸ごと抜き取る</strong>、",
    "<strong>データを改ざん・削除する</strong>、さらにDBの設定次第では<strong>サーバー上でコマンドを実行する</strong>ところまで被害が広がります。",
    "実際に大規模な個人情報漏洩の多くがSQLインジェクションを起点にしてきました。</p>",
    "<p>根本原因は、トピック01のXSSと同じく<strong>「データ」であるべき入力が「コード（SQL）」として扱われている</strong>ことです。",
    "対策の主軸は入力のフィルタリングではなく、<strong>プレースホルダ（プリペアドステートメント）</strong>を使って",
    "「SQLの文の構造」と「後から流し込む値」を分離することです。こうすればユーザーが何を入力しても、それは常に「値」としてしか扱われません。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>メールアドレスとパスワードでログインする画面を例に、認証回避とデータ窃取の流れを追います（あくまで防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "入力がSQLに影響する箇所を探す",
        detail: "<p>攻撃者はまず、入力欄にシングルクォート<code>'</code>を1つ入れて送信します。" +
          "<code>SQL構文エラー</code>やアプリの500エラーが返れば、入力がSQL文の中にそのまま入り込み、" +
          "文字列の途中でクォートが閉じてしまった可能性が高いと判断できます。</p>",
      },
      {
        title: "条件を常に真にして認証を回避する",
        detail: "<p>ログインのメール欄に<code>' OR '1'='1</code>のような入力を送ります。" +
          "組み立てられるSQLが<code>... WHERE email = '' OR '1'='1' ...</code>となると、" +
          "<code>1=1</code>は常に真なので条件全体が成立し、パスワードを知らなくても最初のユーザーとしてログインできてしまいます。</p>",
      },
      {
        title: "UNIONで別テーブルの中身を引き出す",
        detail: "<p>次に<code>UNION SELECT</code>を使い、表示用のクエリに別テーブルの列を連結します。" +
          "たとえば商品検索の結果に<code>users</code>テーブルのメールとパスワードハッシュを混ぜて出力させ、" +
          "画面上に他人の認証情報を表示させます。列数やデータ型を合わせるのが攻撃者の手間になります。</p>",
      },
      {
        title: "エラーやブラインドで少しずつ抜き取る",
        detail: "<p>画面に結果が出ない場合でも、わざとエラーを起こしてメッセージにデータを載せる<strong>エラーベース</strong>や、" +
          "条件の真偽で応答の内容や時間差（<code>SLEEP</code>など）を観測する<strong>ブラインドSQLi</strong>で、" +
          "1文字ずつ機械的にデータを推測・回収できます。</p>",
      },
      {
        title: "改ざん・破壊やさらなる侵入",
        detail: "<p>権限が強いDBユーザーで接続していると、<code>UPDATE</code>や<code>DROP TABLE</code>によるデータ改ざん・削除、" +
          "設定次第ではファイル書き込みやOSコマンド実行まで到達し、サーバー全体の乗っ取りにつながることもあります。</p>",
      },
    ],
    note: "<p>入力から<code>'</code>や<code>OR</code>を除去する「ブラックリスト方式」は、大文字小文字・コメント（<code>/**/</code>）・" +
      "エンコードなど無数の回避手段があり、防御にはなりません。緩和策として最小権限のDBユーザーを使うことは重要ですが、" +
      "根本対策はあくまで次のコードで示すプレースホルダによる「構造と値の分離」です。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：ログイン処理のクエリ組み立て",
      lang: "JavaScript (Node.js / mysql2)",
      description: "受け取ったメールとパスワードでユーザーを検索する処理。SQLをどう組み立てているかに注目します。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.post('/login', async (req, res) => {",
          "  const { email, password } = req.body;",
          "  // 入力を文字列連結でSQLに直接埋め込んでいる",
          "  const sql =",
          "    \"SELECT * FROM users WHERE email = '\" + email +",
          "    \"' AND password = '\" + password + \"'\";",
          "  const [rows] = await conn.query(sql);",
          "  if (rows.length > 0) return res.send('ログイン成功');",
          "  res.status(401).send('認証失敗');",
          "});",
        ].join("\n"),
        highlights: [4, 5, 6, 7],
        note: "<p>入力を<code>+</code>でSQLに連結しているため、<code>email</code>に<code>' OR '1'='1</code>を入れると" +
          "<code>WHERE email = '' OR '1'='1' AND ...</code>となり条件が常に真になります。" +
          "入力が「値」ではなく「SQLの構文」として解釈されているのが問題です。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.post('/login', async (req, res) => {",
          "  const { email, password } = req.body;",
          "  // ? はプレースホルダ。値は後から別枠で渡す",
          "  const sql =",
          "    'SELECT * FROM users WHERE email = ? AND password = ?';",
          "  const [rows] = await conn.execute(sql, [email, password]);",
          "  if (rows.length > 0) return res.send('ログイン成功');",
          "  res.status(401).send('認証失敗');",
          "});",
        ].join("\n"),
        highlights: [4, 5, 6],
        note: "<p><code>?</code>（プレースホルダ）でSQLの構造を先に確定し、値は第2引数の配列で別枠として渡します。" +
          "こうすると<code>email</code>に何が入っても常に「1個の文字列値」として扱われ、SQL構文として解釈されません。" +
          "なお実務ではパスワードは平文比較せずハッシュで検証します（詳細はトピック06）。</p>",
      },
    },
    {
      title: "動的な並び替え：プレースホルダが使えない部分",
      lang: "JavaScript (Node.js) / SQL",
      description: "列名や昇順・降順など「構造そのもの」を動的に変えたいときは、値用のプレースホルダでは対応できません。許可リストで守ります。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// ?q=... と ?order=... をそのまま連結している",
          "const column = req.query.sort;   // 例: 'name'",
          "const order = req.query.order;   // 例: 'ASC'",
          "const sql =",
          "  'SELECT id, name FROM products ORDER BY '",
          "  + column + ' ' + order;",
          "const [rows] = await conn.query(sql);",
        ].join("\n"),
        highlights: [5, 6],
        note: "<p>列名や<code>ASC/DESC</code>はプレースホルダにできないため連結しがちですが、" +
          "ここに<code>sort</code>として細工した文字列を入れられると、やはりSQLインジェクションが成立します。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "// 許可する値だけをコード側で定義しておく",
          "const ALLOWED_COLUMNS = ['id', 'name', 'price'];",
          "const column = ALLOWED_COLUMNS.includes(req.query.sort)",
          "  ? req.query.sort : 'id';",
          "const order = req.query.order === 'desc' ? 'DESC' : 'ASC';",
          "const sql =",
          "  `SELECT id, name FROM products ORDER BY ${column} ${order}`;",
          "const [rows] = await conn.query(sql);",
        ].join("\n"),
        highlights: [2, 3, 4, 5],
        note: "<p>構造を動的に変えたい部分は、<strong>あらかじめコードに書いた許可リスト</strong>の中から選ぶ形にします。" +
          "入力は「許可リストのどれか」を選ぶキーとしてのみ使い、入力文字列そのものをSQLに埋め込まないのがポイントです。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "SQLインジェクションの最も確実な根本対策はどれですか。",
      choices: [
        "入力から「'」や「OR」「SELECT」などの危険な単語をブラックリストで除去する",
        "プレースホルダ（プリペアドステートメント）を使い、SQLの構造と値を分離する",
        "データベースへの接続をHTTPSにする",
        "アプリのエラーメッセージを本番環境で非表示にする",
      ],
      answerIndex: 1,
      explanation: "<p>SQLiの原因は「入力がSQLの構文として解釈されること」なので、" +
        "構造と値を分離するプレースホルダが根本対策です。ブラックリストは大文字小文字・コメント・エンコードで容易に回避され、" +
        "確実な防御になりません。エラーメッセージの非表示はブラインド攻撃を少し面倒にする緩和策にすぎず、" +
        "HTTPSは通信経路の保護でSQLiとは別レイヤーの話です。</p>",
    },
    {
      question: "ログイン画面のメール欄に「' OR '1'='1」を入れると認証を回避できることがあります。この攻撃が成立してしまう根本的な理由はどれですか。",
      choices: [
        "パスワードが平文でデータベースに保存されているから",
        "入力値を文字列連結でSQLに埋め込み、入力がWHERE条件の一部として解釈されるから",
        "HTTPリクエストがGETメソッドで送られているから",
        "データベースのバージョンが古いから",
      ],
      answerIndex: 1,
      explanation: "<p>入力を連結でSQLに差し込むと<code>WHERE email = '' OR '1'='1' AND ...</code>のように" +
        "入力が条件式そのものになり、常に真の条件が作られて認証を通過します。原因はSQLの組み立て方であり、" +
        "パスワード保存方式・HTTPメソッド・DBのバージョンは、この認証回避が成立する直接の理由ではありません。" +
        "プレースホルダを使えば入力は常に1個の値として扱われ、この攻撃は成立しません。</p>",
    },
    {
      question: "列名や昇順・降順（ORDER BY）を利用者の選択で動的に変えたい場面で、SQLインジェクションを防ぐ適切な方法はどれですか。",
      choices: [
        "列名も値用のプレースホルダ「?」で渡せば安全なので、それを使う",
        "コード側に定義した許可リストの中からのみ列名・並び順を選ばせる",
        "入力された列名をURLエンコードしてから連結する",
        "ORDER BY は危険なので、並び替え機能自体を提供しない",
      ],
      answerIndex: 1,
      explanation: "<p>値用のプレースホルダは「値」の位置にしか使えず、列名や<code>ASC/DESC</code>などSQLの構造部分には使えません。" +
        "そのため、あらかじめコードに書いた許可リスト（例: <code>['id','name','price']</code>）から選ばせ、" +
        "入力文字列そのものをSQLに埋め込まないのが正解です。URLエンコードは構文としての解釈を防げず、" +
        "機能自体を諦めるのは対策として過剰かつ本質的ではありません。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "SQLを組み立てるすべての箇所で、値はプレースホルダ（プリペアドステートメント）経由で渡し、文字列連結で埋め込んでいない",
    "ORMやクエリビルダを使う場合も、生SQL（<code>raw</code>/<code>query</code>）に入力を連結していないか検索して確認した",
    "列名・テーブル名・<code>ORDER BY</code>など構造部分を動的に変える箇所は、コード側の許可リストから選ばせている",
    "アプリが使うDBユーザーの権限を最小化し、不要な<code>DROP</code>やファイル操作の権限を与えていない（被害範囲の限定）",
    "本番環境ではSQLエラーの詳細をそのまま画面に返さず、攻撃者へのヒントを与えないようにしている",
    "入力のバリデーション（型・長さ・形式）は補助として行い、SQLi対策の主軸はプレースホルダに置いている",
    "SASTやレビューで文字列連結によるクエリ生成を継続的に検出する仕組みがある",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP SQL Injection", url: "https://owasp.org/www-community/attacks/SQL_Injection", note: "SQLiの定義と攻撃手法（英語）" },
    { title: "OWASP Cheat Sheet: SQL Injection Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html", note: "プレースホルダなど防御の実務ルール（英語）" },
    { title: "OWASP Cheat Sheet: Query Parameterization", url: "https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html", note: "各言語でのパラメータ化の書き方（英語）" },
    { title: "CWE-89: SQL Injection", url: "https://cwe.mitre.org/data/definitions/89.html", note: "脆弱性分類の一次情報（英語）" },
    { title: "MDN Glossary: SQL Injection", url: "https://developer.mozilla.org/en-US/docs/Glossary/SQL_Injection", note: "入門的な用語解説（英語）" },
  ],
});
