/**
 * トピック14: サプライチェーン攻撃（npm）
 * カテゴリ: 運用
 */
registerTopic({
  id: 14,
  category: "運用",
  title: "サプライチェーン攻撃（npm）",
  summary: "悪意ある依存パッケージやtyposquattingで、インストール時に任意コードを実行される問題。",
  keywords: ["サプライチェーン", "supply chain", "npm", "typosquatting", "dependency confusion", "lockfile", "package-lock.json", "npm ci", "npm audit", "postinstall", "依存関係"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>サプライチェーン攻撃は、アプリ本体のコードではなく<strong>依存しているパッケージ（部品）を汚染する</strong>攻撃です。",
    "npmで公開されているパッケージに悪意あるコードが混入すると、それを<code>npm install</code>した開発者のPCやCI、",
    "さらにはビルドされたアプリの利用者にまで被害が広がります。</p>",
    "<p>なぜ危険かというと、依存パッケージのコードは<strong>アプリ本体とまったく同じ権限で動く</strong>からです。",
    "さらにnpmには<code>postinstall</code>のようなインストール時に自動実行されるスクリプトの仕組みがあるため、",
    "パッケージを使わなくても<strong>インストールした瞬間</strong>に環境変数のAPIキー、<code>~/.npmrc</code>のトークン、",
    "クラウド認証情報などを盗まれる可能性があります。近年も、週に数千万回ダウンロードされる著名パッケージの",
    "メンテナーアカウントがフィッシングで乗っ取られ、悪意あるバージョンが配布される事件が繰り返し起きています。",
    "盗んだトークンで別のパッケージへ感染を広げる、ワームのように自己増殖する攻撃も観測されています。</p>",
    "<p>根本原因は、<strong>依存関係を「暗黙のうちに信頼」している</strong>ことです。",
    "直接依存は数十個でも、その依存の依存（推移的依存）まで含めると数百〜数千個に膨らみ、",
    "そのすべての公開者を開発者は検証していません。加えて<code>^1.2.3</code>のような範囲指定は",
    "「次のインストールで何が入るか」を第三者のリリースに委ねる仕組みであり、",
    "lockfileなしの運用では乗っ取られた新バージョンが自動的に取り込まれてしまいます。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>npmレジストリを悪用した典型的な流れを、typosquattingとアカウント乗っ取りの2系統を織り交ぜて追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "紛らわしい名前のパッケージを公開する（typosquatting）",
        detail: "<p>攻撃者は人気パッケージのタイプミス版（例: <code>express</code>に対する<code>expresss</code>）や、" +
          "企業の社内パッケージと同名の公開パッケージ（dependency confusion）をnpmに公開します。" +
          "正規パッケージのメンテナーをフィッシングで乗っ取り、正規の名前で悪意あるバージョンを公開する手口もあります。</p>",
      },
      {
        title: "インストール時に動くスクリプトを仕込む",
        detail: "<p>パッケージの<code>package.json</code>に<code>postinstall</code>スクリプトを定義しておくと、" +
          "利用者が<code>require</code>で読み込まなくても、<code>npm install</code>が完了した時点で任意のコードが実行されます。" +
          "実行時に発動させたい場合は、正規の処理に紛れ込ませた難読化コードを使います。</p>",
      },
      {
        title: "開発者やCIが取り込むのを待つ",
        detail: "<p>タイプミスによる誤インストールのほか、<code>\"^1.2.3\"</code>のような範囲指定とlockfileなしの" +
          "<code>npm install</code>の組み合わせでは、CIが動くたびに最新版（＝乗っ取られた版かもしれないもの）が自動で取得されます。" +
          "攻撃者は何もしなくても、被害環境の側から取り込みに来てくれるわけです。</p>",
      },
      {
        title: "シークレットを外部へ送信する",
        detail: "<p>実行されたコードは<code>process.env</code>の環境変数（APIキー、クラウド認証情報）や" +
          "<code>~/.npmrc</code>のnpmトークンを収集し、<code>https://evil.example</code>のような攻撃者のサーバーへ送信します。" +
          "CI環境は本番相当のシークレットを持っていることが多く、格好の標的になります。</p>",
      },
      {
        title: "盗んだトークンで感染を拡大する",
        detail: "<p>盗んだnpmトークンを使えば、被害者が管理する別のパッケージにも悪意あるコードを注入して公開できます。" +
          "こうしてパッケージからパッケージへ連鎖的に感染が広がり、ワームのように自己増殖した実例も報告されています。</p>",
      },
    ],
    note: "<p>「有名なパッケージだから安全」とは言えないのがこの攻撃の怖さです。正規パッケージ自体が乗っ取られる以上、" +
      "個々のパッケージの信頼に頼るのではなく、<strong>lockfileによる固定・インストール時スクリプトの抑制・" +
      "トークンの最小権限化</strong>という多層防御で「混入しても被害を最小化する」設計にします。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "依存バージョンの固定とlockfileの運用",
      lang: "package.json / シェル(npm)",
      description: "依存の宣言方法とCIでのインストールコマンドを見ます。「何が入るか」を自分で決めているかどうかが分かれ目です。",
      vulnerable: {
        label: "脆弱な運用",
        code: [
          "// package.json（抜粋）",
          "{",
          "  \"dependencies\": {",
          "    \"express\": \"*\",",
          "    \"date-utils-pro\": \"latest\"",
          "  }",
          "}",
          "",
          "# CI用スクリプト（package-lock.jsonは.gitignoreで除外している）",
          "$ npm install",
        ].join("\n"),
        highlights: [4, 5, 9, 10],
        note: "<p><code>*</code>や<code>latest</code>は「次のインストールで何が入るか」を第三者のリリースに委ねる宣言です。" +
          "さらにlockfileを捨てているため、CIが動くたびに最新版を再解決し、" +
          "乗っ取られたバージョンが公開された直後から自動で取り込んでしまいます。</p>",
      },
      fixed: {
        label: "修正した運用",
        code: [
          "// package.json（抜粋）",
          "{",
          "  \"dependencies\": {",
          "    \"express\": \"4.19.2\",",
          "    \"date-utils-pro\": \"2.1.0\"",
          "  }",
          "}",
          "",
          "# package-lock.jsonをリポジトリにコミットし、CIではciコマンドを使う",
          "$ npm ci",
        ].join("\n"),
        highlights: [4, 5, 9, 10],
        note: "<p>バージョンを固定し、依存ツリー全体のバージョンとハッシュを記録した<code>package-lock.json</code>をコミットします。" +
          "<code>npm ci</code>はlockfileと完全に一致するものだけをインストールし、不一致なら失敗するため、" +
          "意図しない更新が紛れ込みません。更新はDependabotやRenovateにPRを作らせ、差分をレビューしてから取り込みます。</p>",
      },
    },
    {
      title: "インストール時スクリプトの抑制と監査",
      lang: "シェル(npm) / .npmrc",
      description: "パッケージを追加するときの手順を比較します。「入れる前に確かめ、入れても自動実行させない」が基本です。",
      vulnerable: {
        label: "脆弱な運用",
        code: [
          "# 名前をよく確かめずにインストール（正しくはexpress）",
          "$ npm install expresss",
          "",
          "# インストール完了と同時にpostinstallスクリプトが実行され、",
          "# 環境変数やnpmトークンを盗むコードが動いてしまう",
        ].join("\n"),
        highlights: [2],
        note: "<p>タイプミスした1回の<code>npm install</code>で、typosquattingパッケージの" +
          "<code>postinstall</code>が開発者の権限で即座に実行されます。" +
          "アンインストールしても、盗まれたシークレットは戻りません。</p>",
      },
      fixed: {
        label: "修正した運用",
        code: [
          "# .npmrc（プロジェクト直下）: インストール時スクリプトを無効化",
          "ignore-scripts=true",
          "",
          "# 追加する前にパッケージの素性（リポジトリ・公開者・更新状況）を確認",
          "$ npm view express repository.url maintainers",
          "",
          "# インストール後は既知の脆弱性を監査する",
          "$ npm audit --audit-level=high",
        ].join("\n"),
        highlights: [2, 5, 8],
        note: "<p><code>ignore-scripts=true</code>で<code>postinstall</code>等の自動実行を止めます" +
          "（ネイティブビルドが必要な一部の依存は動かなくなるため、必要なパッケージだけ個別に許可する運用にします）。" +
          "<code>npm view</code>で名前・リポジトリ・公開者を確認してから入れ、<code>npm audit</code>で既知脆弱性を検出します。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "package-lock.jsonをリポジトリにコミットし、CIでnpm ciを使う主な目的はどれですか。",
      choices: [
        "インストールを高速化してCIの利用料金を節約するため",
        "依存パッケージの脆弱性を自動で修正するため",
        "検証済みと同一のバージョン一式をどの環境でも再現し、意図しない新バージョンの混入を防ぐため",
        "node_modulesディレクトリをコミットしなくて済むようにするため",
      ],
      answerIndex: 2,
      explanation: "<p>lockfileは推移的依存まで含めた全パッケージのバージョンとハッシュを記録し、" +
        "<code>npm ci</code>はそれと完全一致するものだけをインストールします。これにより、レビューを経ていない" +
        "新バージョン（乗っ取られた版かもしれないもの）が勝手に入ることを防げます。高速化は副次的な効果にすぎず、" +
        "脆弱性の修正は<code>npm audit fix</code>など別の仕組みの話です。node_modulesをコミットしない運用自体はlockfileがなくても可能です。</p>",
    },
    {
      question: "typosquattingの説明として正しいものはどれですか。",
      choices: [
        "人気パッケージと紛らわしい名前で悪意あるパッケージを公開し、タイプミスや勘違いによるインストールを狙う攻撃",
        "パッケージのバージョン番号を偽装して、古い脆弱なバージョンをインストールさせる攻撃",
        "DNSを改ざんして、npmレジストリへの通信を偽のサーバーに向ける攻撃",
        "パッケージのREADMEに偽の説明を載せて、誤った使い方をさせる攻撃",
      ],
      answerIndex: 0,
      explanation: "<p>typosquattingは「タイプミス（typo）」と「占拠（squatting）」の造語で、" +
        "<code>express</code>に対する<code>expresss</code>のような紛らわしい名前を先に取得しておく手口です。" +
        "インストールした瞬間に<code>postinstall</code>で悪意あるコードが動くため、1回の打ち間違いが被害に直結します。" +
        "バージョン偽装・DNS改ざん・偽ドキュメントはいずれも別種の攻撃であり、typosquattingの定義ではありません。</p>",
    },
    {
      question: "npmの依存パッケージがとくに危険な混入経路とされる理由として、最も適切なものはどれですか。",
      choices: [
        "npmレジストリとの通信は常に平文で行われ、途中で改ざんされやすいため",
        "postinstallなどのスクリプトにより、インストールしただけで任意のコードが開発者やCIの権限で実行されるため",
        "node_modulesの容量が大きく、ディスクを圧迫してサーバーを停止させるため",
        "インストールしたパッケージが自動的に自分の名義で再公開されてしまうため",
      ],
      answerIndex: 1,
      explanation: "<p>npmにはインストール時に自動実行されるライフサイクルスクリプト（<code>preinstall</code>や" +
        "<code>postinstall</code>）があり、コードを1行も<code>require</code>しなくても、install完了時点で環境変数や" +
        "トークンへアクセスするコードが動きます。レジストリとの通信はHTTPSで保護されているため平文という説明は誤りで、" +
        "ディスク容量や自動再公開はこの攻撃の本質ではありません。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "<code>package-lock.json</code>（またはyarn.lock等）をリポジトリにコミットし、CIでは<code>npm install</code>ではなく<code>npm ci</code>を使っている",
    "依存を追加する前に、パッケージ名のつづり・リポジトリ・公開者・更新状況・ダウンロード数を確認している",
    "<code>npm audit</code>をCIなどで定期的に実行し、重大な既知脆弱性を検知したら対応するフローがある",
    "<code>.npmrc</code>の<code>ignore-scripts=true</code>などで、インストール時スクリプトの自動実行を抑制している",
    "依存の更新はDependabotやRenovateでPRを作らせ、変更内容をレビューしてから取り込んでいる",
    "npmアカウントに2FA（二要素認証）を設定し、CI用トークンは最小権限・短い有効期限にしている",
    "開発環境やCIに置くシークレットを最小限に絞り、漏洩時に即座に失効・ローテーションできるようにしている（詳細はトピック13）",
  ],

  // 参考資料（公式・一次情報。全URLはHTTP 200を確認済み）
  references: [
    { title: "OWASP Cheat Sheet: NPM Security", url: "https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html", note: "npm利用時のセキュリティ実務ルール（英語）" },
    { title: "npm Docs: package-lock.json", url: "https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json", note: "lockfileの役割と仕様（英語）" },
    { title: "npm Docs: npm ci", url: "https://docs.npmjs.com/cli/v10/commands/npm-ci", note: "lockfileと完全一致でインストールするコマンド（英語）" },
    { title: "npm Docs: npm audit", url: "https://docs.npmjs.com/cli/v10/commands/npm-audit", note: "既知脆弱性の監査コマンド（英語）" },
    { title: "GitHub Docs: サプライチェーンセキュリティ", url: "https://docs.github.com/ja/code-security/supply-chain-security", note: "依存関係の保護に関する公式ガイド（日本語）" },
  ],
});
