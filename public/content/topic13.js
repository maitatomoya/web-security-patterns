/**
 * トピック13: シークレット管理（環境変数・コミット事故）
 * カテゴリ: 運用
 */
registerTopic({
  id: 13,
  category: "運用",
  title: "シークレット管理（環境変数・コミット事故）",
  summary: "APIキーや認証情報をコードに直書き・コミットしてしまい、履歴から漏洩する問題。環境変数と秘密管理で防ぐ。",
  keywords: ["シークレット管理", "secret management", "APIキー", "環境変数", "dotenv", ".env", ".gitignore", "ローテーション", "git履歴", "hardcoded credentials"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>シークレット（秘密情報）とは、APIキー・データベースのパスワード・トークン・暗号鍵など、",
    "<strong>漏れると悪用される認証・認可のための値</strong>のことです。これらをソースコードに直接書き込み（ハードコード）、",
    "そのままGitにコミットしてしまう事故が後を絶ちません。運用プロセスの不備が原因で起こる、コード品質とは別種の問題です。</p>",
    "<p>なぜ危険かというと、<strong>Gitは履歴を残す</strong>からです。一度コミットした秘密は、後のコミットでファイルから消しても",
    "<code>git log</code>や過去のコミットをたどれば読み出せます。リポジトリを公開（あるいは共有）した時点で、",
    "その秘密は<strong>漏洩したものとして扱う</strong>必要があります。公開リポジトリのAPIキーは自動化ツールに数分で拾われ、",
    "不正なクラウド利用で高額請求が発生したり、DBやメール送信を乗っ取られたりします。",
    "「後で消せば大丈夫」は通用しません。<strong>コミットされた瞬間に、その鍵は無効化して作り直す（ローテーション）</strong>のが原則です。</p>",
    "<p>根本原因は、<strong>環境ごとに変わる秘密の設定値を、コード（バージョン管理の対象）に混ぜてしまう</strong>ことです。",
    "対策の基本は、設定と秘密をコードから分離すること。具体的には値を<strong>環境変数</strong>で外から与え、",
    "ローカルでは<code>.env</code>ファイルに置いて<strong><code>.gitignore</code>で追跡対象から外す</strong>、",
    "本番では秘密管理サービス（各クラウドのSecrets ManagerやCI/CDのSecrets機能）を使う、という設計にします。",
    "リポジトリには実際の値を含まない<code>.env.example</code>だけを置きます。",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>外部APIキーをコードに直書きしたまま公開リポジトリへpushしてしまった、という典型的な事故の流れを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "公開リポジトリを機械的に監視する",
        detail: "<p>攻撃者はGitHub等の新規コミットを常時スキャンするツールを走らせ、" +
          "<code>API_KEY=</code>や<code>AKIA...</code>（クラウドの鍵の形式）など、" +
          "秘密らしい文字列パターンを探しています。人手ではなく自動化されています。</p>",
      },
      {
        title: "直書きされた鍵を履歴から拾う",
        detail: "<p>コード中に<code>const apiKey = 'sk_live_xxxxxxxx'</code>のような値があれば即座に検出されます。" +
          "最新ファイルから消えていても、<code>git log -p</code>で過去のコミットを覗けば残った値を回収できます。</p>",
      },
      {
        title: "鍵が本物か軽く叩いて確かめる",
        detail: "<p>攻撃者は拾った鍵で対象APIに軽いリクエストを送り、認証が通るか（まだ有効か）を確認します。" +
          "有効と分かれば、その鍵で許された操作はすべて実行できてしまいます。</p>",
      },
      {
        title: "権限の範囲で悪用する",
        detail: "<p>クラウドの鍵なら高負荷なインスタンスを大量に起動して費用を負わせ、" +
          "メール送信APIの鍵ならスパムやフィッシングを大量送信し、DBの認証情報なら顧客データを抜き取ります。" +
          "被害は鍵に与えられた権限の広さに比例します。</p>",
      },
      {
        title: "気付いた時には請求と流出が発生済み",
        detail: "<p>開発者が事故に気付くのは、高額請求の通知やサービス側の不正利用アラートが来てからということが多く、" +
          "その時点で被害は始まっています。pushからここまでが数分〜数時間で進むこともあります。</p>",
      },
    ],
    note: "<p>やってはいけないのは「該当行を消して普通にコミットし直す」だけで終えること。" +
      "履歴に値が残るうえ、そもそも一度漏れた鍵は無効化しない限り危険なままです。" +
      "正しい初動は<strong>(1)鍵を即ローテーション（無効化して再発行）、(2)履歴から除去、(3)再発防止で<code>.gitignore</code>整備</strong>。" +
      "この順番と考え方を次のコードで確認します。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "アプリ側：秘密の受け渡し方",
      lang: "JavaScript (Node.js)",
      description: "外部APIの鍵をコードに書くか、環境変数から読むか。値の置き場所が安全性を決めます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// 鍵をソースコードに直書き（このままコミットされる）",
          "const stripe = require('stripe')(",
          "  'sk_live_51ABCDEfghIJKLmnopQRST'",
          ");",
          "",
          "const db = connect({",
          "  host: 'db.internal',",
          "  user: 'admin',",
          "  password: 'P@ssw0rd-prod-123',",
          "});",
        ].join("\n"),
        highlights: [3, 9],
        note: "<p>本番の決済鍵とDBパスワードがコードに埋め込まれ、コミットするとGit履歴に永久に残ります。" +
          "リポジトリを閲覧できる全員（公開なら世界中）に秘密が渡ります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "// 値はコードに書かず、環境変数から読み込む",
          "require('dotenv').config(); // ローカルは .env から読む",
          "",
          "const key = process.env.STRIPE_SECRET_KEY;",
          "if (!key) throw new Error('STRIPE_SECRET_KEY が未設定です');",
          "const stripe = require('stripe')(key);",
          "",
          "const db = connect({",
          "  host: process.env.DB_HOST,",
          "  user: process.env.DB_USER,",
          "  password: process.env.DB_PASSWORD,",
          "});",
        ].join("\n"),
        highlights: [2, 4, 5, 9, 10, 11],
        note: "<p>秘密はコードから追い出し、<code>process.env</code>経由で外から注入します。" +
          "ローカルは<code>dotenv</code>で<code>.env</code>から読み、本番はクラウドの環境変数やSecrets Managerで与えます。" +
          "未設定なら起動時にエラーで気付けるよう存在チェックも入れています。</p>",
      },
    },
    {
      title: "運用側：.gitignore と漏えい時のローテーション",
      lang: "設定ファイル / シェル (bash)",
      description: "秘密ファイルを追跡対象から外す設定と、万一コミットしてしまった場合の初動手順です。",
      vulnerable: {
        label: "危険な状態 / 誤った初動",
        code: [
          "# .env をコミットしてしまっている（追跡対象のまま）",
          "$ git add .env",
          "$ git commit -m 'add config'",
          "",
          "# 誤った初動: 行を消して上書きコミットするだけ",
          "$ vi config.js   # 鍵の行を削除",
          "$ git commit -am 'remove key'",
          "# → 過去のコミットに鍵が残り、鍵も有効なまま。無意味",
        ].join("\n"),
        highlights: [2, 3, 7, 8],
        note: "<p><code>.env</code>を追跡し、鍵を消すだけの上書きコミットで済ませています。" +
          "履歴（<code>git log -p</code>）に値が残り、しかも鍵自体を無効化していないため危険は消えません。</p>",
      },
      fixed: {
        label: "正しい設定と初動",
        code: [
          "# 1) 秘密ファイルを最初から追跡対象外にする",
          "$ cat .gitignore",
          ".env",
          ".env.*",
          "!.env.example        # 値を含まない雛形だけは残す",
          "",
          "# 2) 漏えい時はまず鍵をローテーション（無効化して再発行）",
          "#    → 各サービスの管理画面で旧キーを失効させ新キー発行",
          "",
          "# 3) 履歴から値を除去（履歴の書き換えが必要）",
          "$ git rm --cached .env          # 追跡から外す",
          "$ git commit -m 'stop tracking .env'",
          "#   過去履歴の完全除去は git filter-repo 等を使う",
        ].join("\n"),
        highlights: [3, 4, 5, 8, 11],
        note: "<p>優先順位が重要です。<strong>まず鍵をローテーション</strong>（漏れた鍵はもう安全にできない）、" +
          "次に<code>.gitignore</code>で再発防止、最後に<code>git filter-repo</code>等で履歴から値を除去します。" +
          "リポジトリには値を含まない<code>.env.example</code>だけを置き、必要なキー名を共有します。" +
          "CIやクラウドではGit管理下ではなくSecrets機能に値を保存します。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "APIキーを誤って公開リポジトリにコミットしてしまいました。最初に取るべき対応はどれですか。",
      choices: [
        "該当行を消して新しいコミットで上書きすれば十分",
        "リポジトリをprivateに切り替えれば漏洩は取り消せる",
        "その鍵を即座にローテーション（無効化して再発行）する",
        "次回のリリースまで様子を見る",
      ],
      answerIndex: 2,
      explanation: "<p>一度公開された鍵は「漏洩済み」と考え、まず無効化して作り直す（ローテーション）のが最優先です。" +
        "行を消す上書きコミットは過去履歴に値が残り、鍵も有効なまま。private化やリポジトリ削除も、" +
        "既に自動収集された可能性を打ち消せません。履歴の除去は必要ですが、それは鍵の無効化の後に行う再発防止策です。</p>",
    },
    {
      question: "ローカル開発で秘密情報を扱う際の正しい運用はどれですか。",
      choices: [
        "秘密の実値を .env に書き、その .env をリポジトリにコミットして共有する",
        "秘密は .env に置いて .gitignore で追跡対象から外し、リポジトリには値を含まない .env.example だけを置く",
        "秘密はソースコードに定数として書き、コメントで『本番前に消す』と注意書きする",
        "秘密をREADMEに記載してチームで共有する",
      ],
      answerIndex: 1,
      explanation: "<p>秘密の実値はバージョン管理に載せず、<code>.env</code>に置いて<code>.gitignore</code>で除外し、" +
        "リポジトリには雛形の<code>.env.example</code>（キー名のみ）だけを共有します。" +
        "<code>.env</code>自体のコミット、コードへの直書き、READMEへの記載はいずれも履歴や共有範囲に秘密を残し危険です。</p>",
    },
    {
      question: "コミット済みの秘密について「ファイルから消したのだから安全」と言えない理由はどれですか。",
      choices: [
        "ファイルを消すとアプリが動かなくなるから",
        "Gitは履歴を保持し、過去のコミットから消したはずの値を読み出せるから",
        ".gitignore に書けば過去のコミットも自動的に消えるから",
        "環境変数に移すと値が二重に保存されるから",
      ],
      answerIndex: 1,
      explanation: "<p>Gitは変更履歴を保持するため、最新ファイルから値を消しても<code>git log -p</code>や過去コミットの参照で" +
        "元の値を取り出せます。<code>.gitignore</code>は今後の追跡を止めるだけで過去履歴には効きません。" +
        "だからこそ、履歴からの除去と、そもそもの鍵ローテーションの両方が必要になります。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "APIキー・パスワード・トークン・秘密鍵をソースコードに直書きしていない（<code>process.env</code>等で外部注入している）",
    "<code>.env</code>や秘密ファイルを<code>.gitignore</code>に登録し、リポジトリには値を含まない<code>.env.example</code>だけを置いている",
    "コミット前にシークレット検出（<code>git-secrets</code>・<code>gitleaks</code>やGitHubのpush protection等）が走る仕組みがある",
    "本番の秘密はクラウドのSecrets ManagerやCI/CDのSecrets機能で管理し、Gitやログに出さない",
    "秘密をコミットしてしまった際の初動（まず鍵をローテーション→履歴除去→再発防止）を手順として決めてある",
    "鍵には最小権限のみ付与し、定期的なローテーション（無効化と再発行）を運用に組み込んでいる",
    "アプリ起動時に必須の環境変数が揃っているかを検証し、未設定なら明示的に失敗させている",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Cheat Sheet: Secrets Management", url: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html", note: "秘密管理の実務指針（英語）" },
    { title: "CWE-798: Use of Hard-coded Credentials", url: "https://cwe.mitre.org/data/definitions/798.html", note: "認証情報ハードコードの定義（英語）" },
    { title: "The Twelve-Factor App: Config", url: "https://12factor.net/config", note: "設定を環境変数で分離する原則（英語）" },
    { title: "GitHub Docs: リポジトリから機密データを削除する", url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository", note: "履歴からの除去手順（英語）" },
    { title: "GitHub Docs: シークレットスキャンについて", url: "https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning", note: "コミット済み秘密の自動検出（英語）" },
    { title: "dotenv (Node.js)", url: "https://github.com/motdotla/dotenv", note: ".envから環境変数を読み込む定番ライブラリ" },
  ],
});
