/**
 * トピック03: サーバーサイドリクエストフォージェリ（SSRF）
 * カテゴリ: インジェクション
 */
registerTopic({
  id: 3,
  category: "インジェクション",
  title: "サーバーサイドリクエストフォージェリ（SSRF）",
  summary: "サーバーに任意の宛先へリクエストさせ、内部ネットワークやクラウドメタデータへ到達される脆弱性。",
  keywords: ["SSRF", "server side request forgery", "メタデータ", "169.254.169.254", "内部ネットワーク", "URL許可リスト", "DNSリバインディング"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>サーバーサイドリクエストフォージェリ（SSRF）は、攻撃者が<strong>サーバーに任意の宛先へHTTPリクエストなどを送らせる</strong>脆弱性です。",
    "「URLを指定すると、そのページのプレビューやサムネイルを作る」「指定した画像URLを取り込む」といった、",
    "<strong>サーバーが利用者の指定したURLへアクセスする</strong>機能が典型的な入口になります。</p>",
    "<p>なぜ危険かというと、サーバーは通常、外部の攻撃者からは直接見えない<strong>内部ネットワークの内側</strong>にいるからです。",
    "攻撃者は自分では届かない社内の管理画面やデータベース、内部APIに対して、",
    "「サーバーを踏み台にして」アクセスさせることができます。特にクラウド環境では、",
    "<code>http://169.254.169.254/</code>という<strong>メタデータサービス</strong>（インスタンスの設定や一時的な認証情報を返す内部専用のアドレス）に到達されると、",
    "クラウドの認証情報（トークン）を盗まれ、そこからクラウド資源全体を侵害される深刻な事故につながります。</p>",
    "<p>根本原因は、<strong>アクセス先URLの決定を利用者の入力に委ねているのに、宛先の検証をしていない</strong>ことです。",
    "対策の主軸は、<strong>接続先を許可リスト（許可したドメインだけ）に限定する</strong>こと、",
    "内部・プライベートIPアドレスへの到達を遮断すること、そしてクラウド側でメタデータへのアクセス自体を絞ることです。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>「URLを入力するとOGP画像を取得してプレビューを作る」機能を例に、内部到達とクラウド認証情報の窃取までを追います（あくまで防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "サーバーが外部アクセスする機能を見つける",
        detail: "<p>攻撃者は、URLを渡すとサーバー側がそのURLへアクセスする機能（リンクプレビュー、画像取り込み、Webhook、PDF生成など）を探します。" +
          "自分が用意した<code>https://evil.example/ping</code>を指定し、サーバーからアクセスが来れば「サーバーが自分の代わりに通信する」ことを確認できます。</p>",
      },
      {
        title: "宛先を内部アドレスに向ける",
        detail: "<p>次にURLを<code>http://127.0.0.1/</code>や<code>http://localhost:8080/</code>、社内セグメントの<code>http://192.168.0.10/</code>に差し替えます。" +
          "外部からは触れない内部サービスの応答が返ってくれば、サーバーを踏み台に内部ネットワークへ到達できたことになります。</p>",
      },
      {
        title: "クラウドのメタデータサービスを狙う",
        detail: "<p>クラウド上のサーバーなら<code>http://169.254.169.254/</code>を指定します。" +
          "これはインスタンス自身の設定や一時認証情報を返す内部専用アドレスで、応答が返れば、そこに保管された" +
          "クラウドの<strong>一時的な認証トークン</strong>を読み取れる可能性があります。</p>",
      },
      {
        title: "許可リストのすり抜けを試す",
        detail: "<p>単純なフィルタは、<code>http://127.0.0.1</code>を<code>http://0177.0.0.1</code>（8進数）や<code>http://[::1]</code>（IPv6）で言い換える、" +
          "<code>@</code>を使った<code>https://allowed.example@evil.example</code>、リダイレクトで内部へ飛ばす、" +
          "<strong>DNSリバインディング</strong>（検証時と接続時でDNSの解決先を変える）などで回避を狙われます。</p>",
      },
      {
        title: "盗んだ認証情報でクラウドを侵害",
        detail: "<p>メタデータから得たトークンを使い、攻撃者はストレージの中身を読み出したり、新たなリソースを作成したりします。" +
          "SSRF1件が、クラウドアカウント全体の侵害へと拡大していきます。</p>",
      },
    ],
    note: "<p>「<code>127.0.0.1</code>という文字列を弾く」ようなブラックリストは、上記の言い換えで簡単に破られます。" +
      "また入力URLのホスト名だけを検証しても、<strong>リダイレクトやDNSリバインディング</strong>で最終的な接続先が変わると意味がありません。" +
      "対策は「許可したドメインだけを通す許可リスト」と「解決後のIPが内部・プライベート帯なら遮断」を、実際に接続する直前まで一貫して効かせることです。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "サーバー側：ユーザー指定URLの取得",
      lang: "JavaScript (Node.js)",
      description: "利用者が入力したURLをサーバーがそのまま取得する処理。宛先の検証がない点に注目します。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "app.post('/preview', async (req, res) => {",
          "  const target = req.body.url;",
          "  // 宛先を検証せずそのまま取得している",
          "  const r = await fetch(target);",
          "  const html = await r.text();",
          "  res.send(extractOgImage(html));",
          "});",
        ].join("\n"),
        highlights: [2, 3, 4],
        note: "<p>利用者が渡した<code>url</code>を検証なしで<code>fetch</code>しています。" +
          "<code>http://169.254.169.254/</code>や<code>http://127.0.0.1/</code>を指定されると、" +
          "内部専用アドレスへサーバーがアクセスしてしまいます。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const dns = require('dns').promises;",
          "const net = require('net');",
          "const ALLOW_HOSTS = new Set(['images.example.com']);",
          "",
          "app.post('/preview', async (req, res) => {",
          "  const u = new URL(req.body.url);",
          "  if (u.protocol !== 'https:') return res.status(400).end();",
          "  if (!ALLOW_HOSTS.has(u.hostname)) return res.status(400).end();",
          "  const { address } = await dns.lookup(u.hostname);",
          "  if (isPrivate(address)) return res.status(400).end();",
          "  // redirect: 'manual' で追跡リダイレクトによる回避を防ぐ",
          "  const r = await fetch(u, { redirect: 'manual' });",
          "  res.send(extractOgImage(await r.text()));",
          "});",
        ].join("\n"),
        highlights: [3, 7, 8, 9, 10, 12],
        note: "<p>プロトコルを<code>https</code>に限定し、ホスト名を<strong>許可リスト</strong>で絞り、" +
          "名前解決した<strong>IPがプライベート帯なら遮断</strong>します。さらに<code>redirect: 'manual'</code>で" +
          "リダイレクトによる内部への迂回を防ぎます。<code>isPrivate()</code>は次の比較で示します。</p>",
      },
    },
    {
      title: "内部・プライベートIPの判定",
      lang: "JavaScript (Node.js)",
      description: "宛先IPが内部向けかどうかを判定するヘルパー。ここが甘いとSSRF対策全体が崩れます。",
      vulnerable: {
        label: "脆弱なコード",
        code: [
          "// 文字列でのブラックリスト（回避が容易）",
          "function isBlocked(host) {",
          "  return host === '127.0.0.1' || host === 'localhost';",
          "}",
        ].join("\n"),
        highlights: [2, 3],
        note: "<p>文字列一致では、<code>0177.0.0.1</code>（8進）・<code>2130706433</code>（10進整数）・" +
          "<code>[::1]</code>（IPv6）・<code>169.254.169.254</code>などを見逃します。" +
          "「ホスト名の文字列」ではなく「解決後のIP」を数値帯で判定する必要があります。</p>",
      },
      fixed: {
        label: "修正したコード",
        code: [
          "const net = require('net');",
          "function isPrivate(ip) {",
          "  if (net.isIPv4(ip)) {",
          "    const [a, b] = ip.split('.').map(Number);",
          "    if (a === 10 || a === 127) return true;",
          "    if (a === 169 && b === 254) return true; // メタデータ含む",
          "    if (a === 172 && b >= 16 && b <= 31) return true;",
          "    if (a === 192 && b === 168) return true;",
          "    return false;",
          "  }",
          "  return true; // IPv6等は既定で遮断（必要な範囲だけ許可）",
          "}",
        ].join("\n"),
        highlights: [5, 6, 7, 8, 11],
        note: "<p>解決後のIPを数値の範囲で判定し、ループバック（<code>127.0.0.0/8</code>）・" +
          "プライベート帯（<code>10/8</code>・<code>172.16/12</code>・<code>192.168/16</code>）・" +
          "リンクローカル（<code>169.254/16</code>、メタデータを含む）を遮断します。判断に迷う範囲は既定で遮断し、必要な宛先だけを明示的に許可します。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "SSRF（サーバーサイドリクエストフォージェリ）で攻撃者が狙う典型的な宛先はどれですか。",
      choices: [
        "攻撃者自身のブラウザのローカルストレージ",
        "クラウドのメタデータサービス（例: 169.254.169.254）や、外部から見えない内部ネットワーク",
        "利用者のスマートフォンのSMS",
        "検索エンジンの公開インデックス",
      ],
      answerIndex: 1,
      explanation: "<p>SSRFはサーバーを踏み台にして、外部からは到達できない内部リソースへアクセスさせる攻撃です。" +
        "特にクラウドのメタデータサービス（<code>169.254.169.254</code>）は一時的な認証情報を返すため主要な標的になります。" +
        "ブラウザのローカルストレージやSMSはサーバー側リクエストの対象ではなく、公開インデックスは誰でも見られるためSSRFで狙う意味がありません。</p>",
    },
    {
      question: "SSRF対策として「URLに『127.0.0.1』や『localhost』という文字列が含まれていたら拒否する」ブラックリストの問題点はどれですか。",
      choices: [
        "正規のユーザーが127.0.0.1へアクセスできなくなり不便になる",
        "8進数・10進整数・IPv6表記やDNSリバインディング等で同じ内部アドレスを別の形で指定でき、回避される",
        "文字列比較は処理が遅く、パフォーマンスに影響する",
        "ブラックリストはHTTPSと併用できない",
      ],
      answerIndex: 1,
      explanation: "<p>同じ内部アドレスは<code>0177.0.0.1</code>（8進）・<code>2130706433</code>（10進整数）・" +
        "<code>[::1]</code>（IPv6）など多数の表記で指定でき、DNSリバインディングでは検証後に解決先を内部へ変えられます。" +
        "そのため文字列ブラックリストは回避されます。正解は「解決後のIPを数値帯で判定し、内部・プライベート帯を遮断」する方式です。" +
        "パフォーマンスやHTTPSとの併用は本質的な問題ではありません。</p>",
    },
    {
      question: "ユーザー指定URLをサーバーが取得する機能で、SSRFを防ぐうえで最も効果的な設計はどれですか。",
      choices: [
        "許可したドメインだけを通す許可リストにし、名前解決後のIPが内部・プライベート帯なら遮断し、リダイレクトも検証する",
        "取得するURLは必ずGETメソッドに限定する",
        "取得したレスポンスをそのまま画面に表示しないようにする",
        "リクエストのタイムアウトを短く設定する",
      ],
      answerIndex: 0,
      explanation: "<p>SSRFの根本は「宛先の決定を入力に委ねているのに検証していない」ことなので、" +
        "許可リストで宛先を絞り、解決後のIPで内部帯を遮断し、リダイレクトによる迂回まで検証するのが最も効果的です。" +
        "GET限定・レスポンス非表示・短いタイムアウトは被害を多少和らげる補助にはなりますが、内部到達そのものは防げません。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "サーバーが利用者指定URLへアクセスする機能（プレビュー・画像取り込み・Webhook・PDF生成等）を洗い出した",
    "接続先ホストをコード側の許可リストで限定し、任意ドメインへのアクセスを許していない",
    "名前解決後のIPを判定し、ループバック・プライベート帯・リンクローカル（<code>169.254.169.254</code>を含む）を遮断している",
    "リダイレクトを自動追跡せず（<code>redirect: 'manual'</code>等）、追跡する場合も各ホップで宛先を再検証している",
    "許可プロトコルを<code>http/https</code>に限定し、<code>file://</code>・<code>gopher://</code>などを弾いている",
    "クラウド側でメタデータサービスへのアクセスを制限している（例: IMDSv2の必須化やホップ制限）",
    "内部APIやDBは、SSRF到達を前提に認証を必須化し、送信元IPだけの信頼に依存していない（多層防御）",
  ],

  // 参考資料（公式・一次情報。実在する定番URLのみ）
  references: [
    { title: "OWASP Server Side Request Forgery (SSRF)", url: "https://owasp.org/www-community/attacks/Server_Side_Request_Forgery", note: "SSRFの定義（英語）" },
    { title: "OWASP Cheat Sheet: Server Side Request Forgery Prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html", note: "許可リストやIP遮断など防御の実務（英語）" },
    { title: "CWE-918: Server-Side Request Forgery (SSRF)", url: "https://cwe.mitre.org/data/definitions/918.html", note: "脆弱性分類の一次情報（英語）" },
    { title: "OWASP Top 10 2021 A10 SSRF", url: "https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/", note: "Top10での位置づけ（英語）" },
    { title: "PortSwigger: SSRF", url: "https://portswigger.net/web-security/ssrf", note: "攻撃と防御の解説・演習（英語）" },
  ],
});
