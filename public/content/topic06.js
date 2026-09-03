/**
 * トピック06: パスワード保存（ハッシュ・ソルト）
 * カテゴリ: 認証・認可
 */
registerTopic({
  id: 6,
  category: "認証・認可",
  title: "パスワード保存（ハッシュ・ソルト）",
  summary: "平文保存や高速ハッシュでの保存が、漏洩時に全アカウントを危険にさらす問題。bcrypt/Argon2による対策を学ぶ。",
  keywords: [
    "パスワード", "ハッシュ", "hash", "ソルト", "salt", "ペッパー", "pepper",
    "bcrypt", "Argon2", "scrypt", "MD5", "SHA-256", "レインボーテーブル", "credential stuffing",
  ],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>ログイン機能を持つアプリは利用者のパスワードを保管しますが、これを<strong>平文（そのままの文字列）で保存してはいけません</strong>。",
    "データベースが漏洩した瞬間、全利用者のパスワードがそのまま攻撃者の手に渡り、なりすまし放題になるからです。",
    "さらに多くの人がパスワードを<strong>使い回している</strong>ため、1つのサイトの漏洩が別サイトの不正ログイン（クレデンシャルスタッフィング）へ連鎖します。</p>",
    "<p>そこで使うのが<strong>ハッシュ関数</strong>です。ハッシュは入力から固定長の値を計算する一方通行の変換で、",
    "ハッシュ値から元のパスワードを逆算するのは困難です。ログイン時は「入力をハッシュした値」と「保存済みのハッシュ値」を比べれば、",
    "平文を持たずに本人確認ができます。ところが<code>MD5</code>や<code>SHA-256</code>のような<strong>高速な</strong>ハッシュは、パスワード保存には不向きです。",
    "GPUを使えば1秒間に数十億回という速さで総当りでき、よくあるパスワードを事前計算した<strong>レインボーテーブル</strong>で一瞬で照合されてしまいます。</p>",
    "<p>対策は2つの要素からなります。1つは<strong>ソルト</strong>で、利用者ごとに異なるランダム値をパスワードに足してからハッシュします。",
    "これで同じパスワードでも保存されるハッシュが全員違う値になり、レインボーテーブルと「一括解読」が無効になります。",
    "もう1つは<strong>意図的に遅い（計算コストの高い）ハッシュ</strong>を使うことです。<code>bcrypt</code>・<code>Argon2</code>・<code>scrypt</code>は、",
    "コスト係数（ワークファクタ）で1回あたりの計算時間を調整でき、総当りのコストを一気に引き上げます。",
    "これらはソルトの生成と付与も内部で行ってくれるため、実務では自前でMD5＋ソルトを組むより、専用ライブラリを使うのが正解です。</p>",
  ].join(""),

  // 攻撃の仕組み
  attack: {
    scenario: "<p>データベースが漏洩したと仮定し、保存方式の違いでパスワードがどれだけ簡単に割られるかを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "データベースの流出でハッシュ一覧を入手する",
        detail: "<p>攻撃者はSQLインジェクション（トピック02）やバックアップの流出などで、" +
          "利用者テーブルのメールアドレスとパスワードのハッシュ値をまとめて手に入れます。ここが出発点です。</p>",
      },
      {
        title: "平文ならその場で終了、高速ハッシュなら照合を始める",
        detail: "<p>平文保存ならこの時点で完全に終わりです。<code>MD5</code>や<code>SHA-256</code>で保存されていても、" +
          "攻撃者はよく使われるパスワードのハッシュを並べた<strong>レインボーテーブル</strong>と突き合わせ、一致するものを次々に特定します。</p>",
      },
      {
        title: "GPUで大量の総当り・辞書攻撃をかける",
        detail: "<p>テーブルに載っていないパスワードも、GPUで秒間数十億回のハッシュ計算を回して総当りします。" +
          "高速ハッシュはこの計算が速いほど攻撃者に有利で、短いパスワードや辞書に載る語は短時間で割られます。</p>",
      },
      {
        title: "割れたパスワードを他サービスで使い回す",
        detail: "<p>手に入れたメールアドレスとパスワードの組を、銀行やSNSなど他サービスのログインに次々試します（クレデンシャルスタッフィング）。" +
          "利用者がパスワードを使い回していれば、漏洩元とは無関係なサービスまで被害が広がります。</p>",
      },
    ],
    note: "<p>ソルト付きの<code>bcrypt</code>や<code>Argon2</code>で保存していれば、レインボーテーブルは効かず、" +
      "1件ごとに計算コストの高いハッシュを総当りする必要が出るため、現実的な時間では割られにくくなります。" +
      "「漏洩しても即全滅にはしない」ための<strong>最後の砦</strong>が、正しいパスワード保存です。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "登録時：パスワードのハッシュ化",
      lang: "JavaScript (Node.js / bcrypt)",
      description: "利用者登録でパスワードをどう保存するかを比較します。ソルトの有無と、ハッシュの速さがポイントです。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "const crypto = require('crypto');",
          "",
          "app.post('/register', async (req, res) => {",
          "  const { email, password } = req.body;",
          "  // MD5でハッシュ化（高速・ソルトなし）",
          "  const hashed = crypto.createHash('md5').update(password).digest('hex');",
          "  await db.createUser({ email, password: hashed });",
          "  res.redirect('/login');",
          "});",
        ].join("\n"),
        highlights: [6],
        note: "<p><code>MD5</code>は高速なうえソルトもないため、同じパスワードは常に同じハッシュになります。" +
          "レインボーテーブルで一瞬、GPU総当りで短時間に割られます（<code>SHA-256</code>を単体で使っても速すぎて同じ問題です）。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const bcrypt = require('bcrypt');",
          "const COST = 12; // コスト係数。ハードウェアに応じて調整する",
          "",
          "app.post('/register', async (req, res) => {",
          "  const { email, password } = req.body;",
          "  // bcryptがソルト生成・付与と反復計算をまとめて行う",
          "  const hashed = await bcrypt.hash(password, COST);",
          "  await db.createUser({ email, password: hashed });",
          "  res.redirect('/login');",
          "});",
        ].join("\n"),
        highlights: [1, 2, 7],
        note: "<p><code>bcrypt.hash</code>は利用者ごとのソルトを自動生成し、コスト係数の回数だけ計算を繰り返した結果を返します。" +
          "生成される文字列にはソルトとコストが埋め込まれるため、照合時に別途ソルトを管理する必要はありません。" +
          "<code>Argon2</code>（<code>argon2.hash</code>）はより新しい推奨アルゴリズムで、使い方はほぼ同様です。" +
          "なお<code>bcrypt</code>は入力の先頭72バイトまでしか使わない点に注意します。</p>",
      },
    },
    {
      title: "ログイン時：パスワードの照合",
      lang: "JavaScript (Node.js / bcrypt)",
      description: "保存済みハッシュと入力を照合する処理です。比較の仕方にもセキュリティ上の差が出ます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.post('/login', async (req, res) => {",
          "  const { email, password } = req.body;",
          "  const user = await db.findByEmail(email);",
          "  const hashed = crypto.createHash('md5').update(password).digest('hex');",
          "  // 文字列を === で直接比較する",
          "  if (user && user.password === hashed) {",
          "    req.session.userId = user.id;",
          "    return res.redirect('/mypage');",
          "  }",
          "  res.status(401).send('認証に失敗しました');",
          "});",
        ].join("\n"),
        highlights: [4, 6],
        note: "<p>保存側がMD5なので前述の弱点をそのまま抱えます。加えて<code>===</code>による比較は入力に応じて処理時間が変わり得るため、" +
          "厳密には応答時間の差から情報が漏れるタイミング攻撃の余地も残ります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.post('/login', async (req, res) => {",
          "  const { email, password } = req.body;",
          "  const user = await db.findByEmail(email);",
          "  // bcrypt.compareがハッシュ内のソルト・コストで再計算し定数時間比較する",
          "  const ok = user && await bcrypt.compare(password, user.password);",
          "  if (ok) {",
          "    req.session.userId = user.id;",
          "    return res.redirect('/mypage');",
          "  }",
          "  res.status(401).send('認証に失敗しました');",
          "});",
        ].join("\n"),
        highlights: [4, 5],
        note: "<p><code>bcrypt.compare</code>は保存済みハッシュからソルトとコストを取り出して同条件で計算し、" +
          "定数時間で比較します。なお「利用者が存在しない」場合と「パスワード違い」で応答内容や時間を変えると、" +
          "登録済みメールアドレスを推測されます（ユーザー列挙）。どちらも同じ扱いにするのが安全です。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "パスワードの保存に <code>MD5</code> や <code>SHA-256</code> を単体で使うのが不適切な主な理由はどれですか。",
      choices: [
        "これらのハッシュは元の文字列に復号できてしまうため",
        "計算が高速で、GPUによる総当りやレインボーテーブルで解読されやすいため",
        "ハッシュ値の長さが短すぎて保存できないため",
        "これらは暗号化であってハッシュではないため",
      ],
      answerIndex: 1,
      explanation: "<p><code>MD5</code>や<code>SHA-256</code>は本来「速いこと」が長所ですが、パスワード保存では逆に弱点になります。" +
        "速いほど攻撃者は単位時間あたり多く総当りでき、事前計算したレインボーテーブルとの照合も容易です。" +
        "これらは復号可能な暗号化ではなく一方通行のハッシュで、長さも保存に支障はありません。だからこそ意図的に遅いbcrypt/Argon2を使います。</p>",
    },
    {
      question: "パスワードに付ける「ソルト」の役割として正しいものはどれですか。",
      choices: [
        "ハッシュ計算を高速化してサーバー負荷を下げる",
        "パスワードを暗号化して元に戻せるようにする",
        "利用者ごとに異なる値を加えることで、同じパスワードでも別のハッシュにし、レインボーテーブルや一括解読を無効化する",
        "パスワードの最大長を無制限にする",
      ],
      answerIndex: 2,
      explanation: "<p>ソルトは利用者ごとのランダム値で、これを加えてハッシュすると同じパスワードでも保存値が全員異なります。" +
        "その結果、事前計算のレインボーテーブルは使えず、1件解読しても他へ流用できなくなります。" +
        "ソルトは計算を速くするものでも暗号化でもなく、パスワードの最大長とも無関係です。</p>",
    },
    {
      question: "<code>bcrypt</code> のコスト係数（ワークファクタ）を上げると何が起きますか。",
      choices: [
        "1回のハッシュ計算にかかる時間が増え、総当り攻撃のコストが上がる",
        "パスワードが自動的に長くなる",
        "ソルトが不要になる",
        "保存されるハッシュ値がMD5と同じ長さになる",
      ],
      answerIndex: 0,
      explanation: "<p>コスト係数は計算の反復回数（の指数）を決め、上げるほど1回のハッシュに時間がかかります。" +
        "正規のログインでは1回だけなので影響は小さい一方、攻撃者の総当りは膨大な回数になるため、攻撃コストを大きく引き上げられます。" +
        "ソルトは引き続き必要で、パスワードの長さやハッシュ値の形式が変わるわけではありません。ハードウェアの進化に合わせて定期的に見直します。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "パスワードを平文で保存していない（DB・ログ・エラー出力のいずれにも平文が残っていないことを確認した）",
    "保存には <code>bcrypt</code>・<code>Argon2</code>・<code>scrypt</code> など意図的に遅いハッシュを使い、<code>MD5</code>/<code>SHA-256</code> 単体を使っていない",
    "利用者ごとのソルトが付与されている（ライブラリ任せで自動付与されることを確認した）",
    "コスト係数（ワークファクタ）を環境に合わせて設定し、定期的に見直している",
    "照合は <code>bcrypt.compare</code> 等のライブラリ関数で行い、ハッシュ文字列を <code>===</code> で直接比較していない",
    "「ユーザーが存在しない」場合と「パスワード違い」で応答や時間を変えず、ユーザー列挙を防いでいる",
    "パスワードの最小長や既知の流出パスワード拒否など、強度ポリシーを設けている（詳細はトピック05の認証と併せて設計）",
  ],

  // 参考資料
  references: [
    { title: "OWASP Cheat Sheet: Password Storage", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html", note: "ハッシュ方式・ソルト・ペッパーの実務指針（英語）" },
    { title: "OWASP Top 10: A02 Cryptographic Failures", url: "https://owasp.org/Top10/A02_2021-Cryptographic_Failures/", note: "暗号関連の代表的な失敗（英語）" },
    { title: "node.bcrypt.js (GitHub)", url: "https://github.com/kelektiv/node.bcrypt.js", note: "Node.js向けbcryptの定番実装と使い方" },
    { title: "node-argon2 (GitHub)", url: "https://github.com/ranisalt/node-argon2", note: "推奨アルゴリズムArgon2のNode.js実装" },
    { title: "Node.js 公式ドキュメント: crypto（scrypt等）", url: "https://nodejs.org/api/crypto.html", note: "標準モジュールでのscryptなどの利用（英語）" },
  ],
});
