/**
 * トピック04: ファイルアップロードの脆弱性
 * カテゴリ: インジェクション
 */
registerTopic({
  id: 4,
  category: "インジェクション",
  title: "ファイルアップロードの脆弱性",
  summary: "拡張子・MIME・保存先の検証不足で、Webシェル設置やなりすまし配信を許す脆弱性。",
  keywords: ["ファイルアップロード", "file upload", "Webシェル", "web shell", "拡張子検証", "MIMEタイプ", "Content-Type", "パストラバーサル", "RCE"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>ファイルアップロードの脆弱性は、利用者がアップロードしたファイルの<strong>種類・中身・保存先・配信方法の検証が不足している</strong>ために起きる問題の総称です。",
    "プロフィール画像や添付ファイルなど、ファイルを受け取る機能はどのサービスにもありますが、",
    "受け取り方を誤ると、ファイルが単なるデータではなく<strong>サーバー上で動く「プログラム」</strong>として扱われてしまいます。</p>",
    "<p>最も深刻なのは<strong>Webシェルの設置</strong>です。攻撃者が<code>.php</code>や<code>.jsp</code>のような実行可能ファイルをアップロードし、",
    "それが公開ディレクトリに置かれてサーバーで実行されると、ブラウザからそのURLを開くだけで任意のコマンドを実行できる遠隔操作口ができてしまいます（RCE、リモートコード実行）。",
    "ほかにも、HTMLやSVGを画像に見せかけてアップロードして<strong>格納型XSS</strong>（トピック01）を起こす、",
    "<code>../</code>を含むファイル名で保存先を抜け出し重要ファイルを上書きする<strong>パストラバーサル</strong>、",
    "巨大ファイルや大量アップロードによる<strong>サービス妨害（DoS）</strong>など、被害は多岐にわたります。</p>",
    "<p>根本原因は、<strong>ファイル名や送られてきたMIMEタイプ（Content-Type）といった「利用者が自由に詐称できる情報」を信用している</strong>ことです。",
    "対策は、拡張子は許可リストで判定し、中身（マジックバイト）も確認し、",
    "<strong>アップロード先を公開・実行対象から切り離し、名前もサーバー側で振り直す</strong>ことです。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>プロフィール画像アップロード機能を例に、Webシェルを置いてサーバーを乗っ取るまでの流れを追います（あくまで防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "受け付けるファイルの条件を探る",
        detail: "<p>攻撃者はまず、正規の画像を上げて成功させ、次に拡張子やContent-Typeを少しずつ変えて何が通るかを観察します。" +
          "検証が「送られてきたContent-Typeを見るだけ」なら、中身と無関係に<code>image/png</code>と名乗るだけで通せると分かります。</p>",
      },
      {
        title: "実行可能ファイルを画像に偽装する",
        detail: "<p>PHPが動くサーバーなら、<code>shell.php</code>の中身にコマンド実行コードを書き、" +
          "Content-Typeを<code>image/png</code>と詐称して送ります。拡張子チェックが甘い場合は" +
          "<code>shell.php.png</code>や<code>shell.pHp</code>、末尾に空白やヌル文字を付けるなどで回避を狙います。</p>",
      },
      {
        title: "公開・実行される場所に保存させる",
        detail: "<p>アップロードされたファイルがWeb公開ディレクトリにそのまま置かれ、かつサーバーが拡張子で実行判断していると、" +
          "<code>https://victim.example/uploads/shell.php</code>をブラウザで開いた瞬間にコードが実行されます。</p>",
      },
      {
        title: "保存先を抜け出す（パストラバーサル）",
        detail: "<p>ファイル名を検証せず保存パスに連結していると、<code>../../var/www/html/shell.php</code>のような名前で" +
          "意図しないディレクトリに書き込めます。設定ファイルや既存スクリプトの上書きも狙われます。</p>",
      },
      {
        title: "Webシェルでサーバーを操作する",
        detail: "<p>設置したWebシェルのURLにコマンドを渡すと、サーバー上で任意コマンドが実行できます。" +
          "そこから内部探索・認証情報の窃取・他サーバーへの横展開へと被害が拡大します。</p>",
      },
    ],
    note: "<p>送られてくる<code>Content-Type</code>や<code>ファイル名の拡張子</code>は、いずれも利用者が自由に詐称できるため、それ単体では信用できません。" +
      "拡張子は許可リストで判定しつつ、<strong>ファイルの中身（マジックバイト）</strong>も確認し、" +
      "何より<strong>保存先を実行対象から外す・名前をサーバー側で振り直す</strong>ことで、たとえ偽装ファイルが入っても実行されない設計にするのが要点です。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：アップロードの受け取りと保存",
      lang: "JavaScript (Node.js / Express / multer)",
      description: "プロフィール画像を受け取って保存する処理。何を根拠に「画像」と判断し、どこへどんな名前で保存するかに注目します。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.post('/avatar', upload.single('file'), (req, res) => {",
          "  const f = req.file;",
          "  // 送られてきたContent-Typeとファイル名を信用",
          "  if (!f.mimetype.startsWith('image/')) {",
          "    return res.status(400).send('画像のみ');",
          "  }",
          "  // 元のファイル名のまま公開ディレクトリへ保存",
          "  const dest = './public/uploads/' + f.originalname;",
          "  fs.writeFileSync(dest, f.buffer);",
          "  res.send('/uploads/' + f.originalname);",
          "});",
        ].join("\n"),
        highlights: [4, 8, 9, 10],
        note: "<p><code>mimetype</code>も<code>originalname</code>も利用者が詐称できます。" +
          "<code>shell.php</code>を<code>image/png</code>と名乗って送れば検証を通過し、" +
          "公開ディレクトリに実行可能名のまま保存され、URLアクセスで実行される恐れがあります。" +
          "ファイル名連結による<code>../</code>のパストラバーサルも防げていません。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const crypto = require('crypto');",
          "const path = require('path');",
          "// 拡張子と中身(マジックバイト)の両方で許可判定",
          "const ALLOW = { 'image/png': 'png', 'image/jpeg': 'jpg' };",
          "",
          "app.post('/avatar', upload.single('file'), (req, res) => {",
          "  const type = detectByMagicBytes(req.file.buffer); // 実際の中身から判定",
          "  const ext = ALLOW[type];",
          "  if (!ext) return res.status(400).send('png/jpegのみ');",
          "  // 名前はサーバーが乱数で採番（元の名前は使わない）",
          "  const name = crypto.randomUUID() + '.' + ext;",
          "  // 公開・実行対象外のディレクトリへ保存",
          "  const dest = path.join('/var/app/uploads', name);",
          "  fs.writeFileSync(dest, req.file.buffer);",
          "  res.send('/files/' + name); // 配信は専用エンドポイント経由",
          "});",
        ].join("\n"),
        highlights: [4, 7, 8, 9, 11, 13, 15],
        note: "<p>判定を「自己申告のMIME」ではなく<strong>中身（マジックバイト）</strong>で行い、許可リストの拡張子だけ受け付けます。" +
          "ファイル名は<strong>乱数で採番</strong>して元の名前を捨てるため、拡張子偽装もパストラバーサルも無効化されます。" +
          "保存先を<strong>公開・実行対象外</strong>にし、配信は後述の専用エンドポイント経由にするのが要点です。</p>",
      },
    },
    {
      title: "配信側：保存したファイルの返し方",
      lang: "HTTP / JavaScript (Node.js)",
      description: "アップロードしたファイルを利用者へ返すときの設定。ブラウザにファイルを勝手に解釈・実行させない工夫を見ます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// 公開ディレクトリを静的配信し、拡張子で自動実行される",
          "app.use('/uploads', express.static('./public/uploads'));",
          "// レスポンスにContent-Type等の防御指定なし",
        ].join("\n"),
        highlights: [2],
        note: "<p>公開ディレクトリをそのまま静的配信しているため、実行可能ファイルが置かれると実行され得ます。" +
          "また<code>X-Content-Type-Options</code>がないと、ブラウザがMIMEを推測（スニッフィング）し、" +
          "画像のつもりのファイルをHTML/スクリプトとして解釈してXSSにつながることがあります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.get('/files/:name', (req, res) => {",
          "  const name = path.basename(req.params.name); // ../ を除去",
          "  const file = path.join('/var/app/uploads', name);",
          "  res.setHeader('X-Content-Type-Options', 'nosniff');",
          "  res.setHeader('Content-Disposition', 'attachment');",
          "  res.type(mimeFromName(name)); // 保存時に確定した型のみ",
          "  fs.createReadStream(file).pipe(res);",
          "});",
        ].join("\n"),
        highlights: [2, 4, 5, 6],
        note: "<p>配信は専用エンドポイントで行い、<code>path.basename()</code>でパストラバーサルを封じます。" +
          "<code>X-Content-Type-Options: nosniff</code>でMIMEスニッフィングを止め、" +
          "<code>Content-Disposition: attachment</code>でブラウザ内実行ではなくダウンロードとして扱わせます。" +
          "画像配信を別ドメイン（cookieのないサンドボックス）に分けるとさらに安全です。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "ファイルアップロードで「送られてきたContent-Type（MIMEタイプ）が image/ で始まるか」だけを検証する方式の問題点はどれですか。",
      choices: [
        "Content-Typeは利用者が自由に詐称できるため、実行可能ファイルを画像と偽って通せる",
        "Content-Typeの検証は処理が重く、サーバーの負荷が高くなる",
        "画像のContent-Typeは image/ で始まらないことがあるため、正規の画像が弾かれる",
        "Content-TypeはHTTPS通信でしか送られてこない",
      ],
      answerIndex: 0,
      explanation: "<p>リクエストの<code>Content-Type</code>は送信側が自由に設定でき、中身とは無関係です。" +
        "<code>shell.php</code>を<code>image/png</code>と名乗って送れば、この検証は通過してしまいます。" +
        "正しくは中身（マジックバイト）で判定し、拡張子は許可リストで確認します。処理負荷やHTTPSは本質的な問題ではありません。</p>",
    },
    {
      question: "アップロードされたファイルによるWebシェル設置（サーバー上での任意コード実行）を防ぐうえで、最も効果的な設計はどれですか。",
      choices: [
        "アップロード後にウイルス対策ソフトでスキャンすれば、それだけで十分である",
        "保存先を公開・実行対象外のディレクトリにし、ファイル名をサーバー側で乱数採番して元の名前・拡張子を使わない",
        "ファイルサイズの上限を小さく設定する",
        "アップロードフォームにCAPTCHAを設置する",
      ],
      answerIndex: 1,
      explanation: "<p>たとえ偽装ファイルが入っても「実行されない場所に置き」「実行可能な名前を与えない」ことで、Webシェルは成立しなくなります。" +
        "これが最も効果的です。ウイルススキャンは新種や難読化を見逃すため単体では不十分、サイズ上限はDoS対策、" +
        "CAPTCHAは自動化の抑制であり、いずれもコード実行そのものは防げません。</p>",
    },
    {
      question: "画像として保存したファイルを配信する際に、レスポンスへ「X-Content-Type-Options: nosniff」を付ける主な目的はどれですか。",
      choices: [
        "画像の圧縮率を高めてファイルサイズを小さくするため",
        "ブラウザがMIMEを推測（スニッフィング）して、ファイルをHTMLやスクリプトとして解釈・実行するのを防ぐため",
        "画像のダウンロード速度を上げるため",
        "検索エンジンにファイルをインデックスさせないため",
      ],
      answerIndex: 1,
      explanation: "<p><code>nosniff</code>はブラウザにMIMEの推測をやめさせ、サーバーが指定したContent-Typeどおりに扱わせるヘッダーです。" +
        "これがないと、画像のつもりのファイルをブラウザがHTML/スクリプトと解釈し、格納型XSSにつながることがあります。" +
        "圧縮・速度・インデックス制御とは無関係です。ヘッダーの詳細はトピック10も参照してください。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "拡張子は許可リスト方式で判定し、さらにファイルの中身（マジックバイト）で実際の型を確認している",
    "保存するファイル名はサーバー側で乱数採番し、利用者が付けた名前・拡張子をそのまま使っていない",
    "アップロード先を公開ディレクトリや実行対象から外し、Webシェルが置かれても実行されない構成にしている",
    "保存パスにファイル名を連結する箇所で<code>path.basename()</code>等を使い、<code>../</code>のパストラバーサルを防いでいる",
    "配信レスポンスに<code>X-Content-Type-Options: nosniff</code>を付け、必要に応じて<code>Content-Disposition: attachment</code>で扱っている",
    "ファイルサイズ・件数・拡張子の上限を設け、巨大・大量アップロードによるDoSを抑止している",
    "ユーザー生成ファイルの配信をcookieのない別ドメイン（サンドボックス）に分離することを検討した",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Cheat Sheet: File Upload", url: "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html", note: "アップロード検証の実務ルール（英語）" },
    { title: "OWASP: Unrestricted File Upload", url: "https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload", note: "無制限アップロードの解説（英語）" },
    { title: "CWE-434: Unrestricted Upload of File with Dangerous Type", url: "https://cwe.mitre.org/data/definitions/434.html", note: "脆弱性分類の一次情報（英語）" },
    { title: "MDN: X-Content-Type-Options", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options", note: "MIMEスニッフィング抑止ヘッダー（日本語）" },
    { title: "PortSwigger: File upload vulnerabilities", url: "https://portswigger.net/web-security/file-upload", note: "攻撃と防御の解説・演習（英語）" },
  ],
});
