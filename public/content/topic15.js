/**
 * トピック15: メール認証（SPF/DKIM/DMARC）
 * カテゴリ: 運用
 */
registerTopic({
  id: 15,
  category: "運用",
  title: "メール認証（SPF/DKIM/DMARC）",
  summary: "送信ドメイン認証の未設定でメールをなりすまされ、フィッシングに悪用される問題。",
  keywords: ["SPF", "DKIM", "DMARC", "送信ドメイン認証", "なりすまし", "spoofing", "フィッシング", "DNS", "TXTレコード", "アライメント", "rua"],

  // 概要（HTML、400〜800字程度）
  overview: [
    "<p>メールの仕組み（SMTP）には、<strong>差出人が本物かを確かめる機能がもともとありません</strong>。",
    "封筒の差出人欄に他人の住所を書けるのと同じで、攻撃者は自分のサーバーから",
    "<code>From: support@example.com</code>と名乗るメールを自由に送れます。",
    "これを放置すると、自社ドメインをかたるフィッシングメールが顧客や取引先に届いてしまいます。</p>",
    "<p>危険なのは、受け取った側には正規メールと見分けがつきにくいことです。",
    "「パスワードの再設定」「請求書の確認」といった文面で偽サイトに誘導され、",
    "資格情報や金銭をだまし取られる被害（フィッシング、ビジネスメール詐欺）につながります。",
    "被害者は自社ではなく顧客ですが、失われるのは自社ドメインへの信頼です。",
    "また認証が未設定のドメインは、正規のメールまで迷惑メールと判定されやすくなります。</p>",
    "<p>対策が<strong>送信ドメイン認証</strong>で、DNSのTXTレコードで受信側に検証材料を提供します。",
    "<strong>SPF</strong>は「このドメインのメールを送ってよいサーバーのIPアドレス一覧」を公開し、",
    "<strong>DKIM</strong>は送信サーバーが電子署名を付けて本文やヘッダーの改ざんを検知できるようにし、",
    "<strong>DMARC</strong>は「SPF/DKIMで検証されたドメインが、利用者に見えるFromヘッダーと一致しているか（アライメント）」を確認したうえで、",
    "不合格メールの扱い（配送・隔離・拒否）と集計レポートの送付先を宣言します。",
    "3つは役割が異なり、<strong>セットで設定して初めてなりすましを止められます</strong>。</p>",
  ].join(""),

  // 攻撃の仕組み（攻撃者視点の番号付きステップ）
  attack: {
    scenario: "<p>送信ドメイン認証が未設定のexample.comをかたって、フィッシングメールが顧客に届くまでの流れを追います（防御を理解するための説明です）。</p>",
    steps: [
      {
        title: "認証が緩いドメインを調査する",
        detail: "<p>攻撃者は<code>dig txt example.com</code>や<code>dig txt _dmarc.example.com</code>でDNSを引き、" +
          "SPF・DMARCが未設定、あるいは<code>p=none</code>のまま放置されているドメインを探します。" +
          "防御側も同じコマンドで自ドメインの状態を今すぐ確認できます。</p>",
      },
      {
        title: "差出人を偽ったメールを送信する",
        detail: "<p>攻撃者は自前のメールサーバーから、ヘッダーの<code>From:</code>に" +
          "<code>support@example.com</code>を名乗るメールを送ります。SMTPではFromヘッダーは単なる自己申告であり、" +
          "書き換えを妨げる仕組みはプロトコル自体にはありません。</p>",
      },
      {
        title: "受信サーバーの判定をすり抜ける",
        detail: "<p>example.comがSPF/DKIM/DMARCを公開していなければ、受信サーバーには" +
          "「このメールは正規の送信元から来ていない」と判定する材料がありません。" +
          "迷惑メールフィルタを通過し、受信トレイに正規メールと同じ顔で並びます。</p>",
      },
      {
        title: "偽サイトへ誘導して資格情報を盗む",
        detail: "<p>「アカウントがロックされました」といった文面で偽のログインページへ誘導し、" +
          "パスワードを入力させます。誘導には正規サイトのオープンリダイレクト（トピック12）が" +
          "悪用されることもあり、URLの見た目でも気付きにくくなります。</p>",
      },
      {
        title: "乗っ取ったアカウントで二次被害を広げる",
        detail: "<p>盗んだ資格情報でアカウントに侵入し、決済情報の窃取や、そのアカウントを踏み台にした" +
          "取引先への攻撃（ビジネスメール詐欺）へ発展させます。ドメインの信頼が崩れるほど、" +
          "以後の正規メールの到達率も下がっていきます。</p>",
      },
    ],
    note: "<p>DMARCの集計レポート（<code>rua</code>）を受け取るように設定すると、" +
      "自ドメインをかたるメールがどこからどれだけ送られているかを可視化できます。" +
      "なりすましは自社のサーバーの外で起きるため、<strong>レポートなしでは被害に気付くことすら困難</strong>です。</p>",
  },

  // 脆弱／修正コードの比較
  codeComparison: [
    {
      title: "SPFとDKIM：正規の送信元をDNSで宣言する",
      lang: "DNS (TXTレコード)",
      description: "example.comのDNSゾーンの抜粋を比較します。受信側が検証に使う材料を、ドメイン管理者がどう公開するかを見ます。",
      vulnerable: {
        label: "脆弱な設定",
        code: [
          "; example.comのDNSゾーン（抜粋）",
          "example.com.  IN MX   10 mail.example.com.",
          "",
          "; SPFはあるが「+all」: 世界中のどのIPからの送信も合格にしてしまう",
          "example.com.  IN TXT  \"v=spf1 +all\"",
          "",
          "; DKIM（署名検証用の公開鍵）は未設定",
        ].join("\n"),
        highlights: [5, 7],
        note: "<p><code>+all</code>は「誰でもこのドメインを名乗ってよい」という宣言に等しく、" +
          "未設定よりむしろ有害です。DKIMもないため、受信側は送信元の正当性も内容の改ざんも検証できません。</p>",
      },
      fixed: {
        label: "修正した設定",
        code: [
          "; SPF: 自社サーバーと利用中の配信サービスだけを許可し、",
          "; それ以外からの送信は「-all」（不合格）と宣言する",
          "example.com.  IN TXT  \"v=spf1 ip4:203.0.113.10 include:_spf.mailer.example -all\"",
          "",
          "; DKIM: セレクタ名._domainkeyの下に署名検証用の公開鍵を公開する",
          "s2026._domainkey.example.com.  IN TXT  \"v=DKIM1; k=rsa; p=MIIBIjANBg...\"",
        ].join("\n"),
        highlights: [3, 6],
        note: "<p>SPFでは<code>ip4:</code>で自社サーバーのIP（例示用の203.0.113.10）を、" +
          "<code>include:</code>でメール配信サービスの送信元を許可し、末尾の<code>-all</code>で「それ以外は不合格」と締めます。" +
          "DKIMは送信サーバーが秘密鍵でメールに署名し、受信側がこの公開鍵で検証する仕組みです。" +
          "セレクタ（ここでは<code>s2026</code>）を分けることで、鍵の定期的な交換もできます。</p>",
      },
    },
    {
      title: "DMARC：アライメントとポリシーで仕上げる",
      lang: "DNS (TXTレコード)",
      description: "SPF/DKIMだけでは、検証されたドメインと「利用者に見えるFrom」の一致は誰も確認しません。それを担うDMARCの設定を比較します。",
      vulnerable: {
        label: "脆弱な設定",
        code: [
          "; DMARCレコードはあるが、導入時のまま放置されている",
          "_dmarc.example.com.  IN TXT  \"v=DMARC1; p=none\"",
          "",
          "; p=none: 認証に失敗したなりすましメールも通常どおり配送される",
          "; rua未指定: なりすましの実態を知る手段もない",
        ].join("\n"),
        highlights: [2, 4, 5],
        note: "<p><code>p=none</code>は「不合格でも何もしない」という観測専用のポリシーです。" +
          "導入初期の観測には必須ですが、レポート送付先（<code>rua</code>）すら設定せずに放置すると、" +
          "なりすましを止めることも気付くこともできません。</p>",
      },
      fixed: {
        label: "修正した設定",
        code: [
          "; 手順1: p=noneとruaで導入し、集計レポートで影響を観測する",
          "_dmarc.example.com.  IN TXT  \"v=DMARC1; p=none; rua=mailto:dmarc-rpt@example.com\"",
          "",
          "; 手順2: 正規の送信元すべてが認証に合格するのを確認したら、",
          ";        レコードを強化版に置き換える（quarantine=隔離、reject=拒否）",
          "_dmarc.example.com.  IN TXT  \"v=DMARC1; p=reject; rua=mailto:dmarc-rpt@example.com; sp=reject\"",
        ].join("\n"),
        highlights: [2, 6],
        note: "<p>DMARCの合格条件は「SPFまたはDKIMに合格し、かつ検証されたドメインがFromヘッダーの" +
          "ドメインと一致（アライメント）していること」です。まず<code>p=none</code>と<code>rua</code>で観測し、" +
          "配信サービスなど正規送信元の認証漏れを潰してから<code>quarantine</code>、最終的に<code>reject</code>へ引き上げます。" +
          "<code>sp=</code>はサブドメインをかたるなりすましへのポリシーです。</p>",
      },
    },
  ],

  // 4択クイズ（3問）
  quiz: [
    {
      question: "SPFが検証しているものとして正しいのはどれですか。",
      choices: [
        "メール本文が送信後に改ざんされていないこと",
        "利用者のメールソフトに表示されるFromヘッダーのドメインが正しいこと",
        "差出人が実在の人物であること",
        "メールを送ってきたサーバーのIPアドレスが、そのドメインの管理者がDNSで宣言した送信元に含まれること",
      ],
      answerIndex: 3,
      explanation: "<p>SPFは、エンベロープFrom（Return-Path）のドメインのTXTレコードと、実際の接続元IPアドレスを" +
        "突き合わせる仕組みです。本文の改ざん検知は電子署名を使うDKIMの役割で、" +
        "表示上のFromヘッダーとの一致はDMARCのアライメントで初めて検証されます。" +
        "差出人が実在の人物かどうかは、どの技術でも検証していません。</p>",
    },
    {
      question: "DMARCの「アライメント」の説明として正しいのはどれですか。",
      choices: [
        "SPFとDKIMの両方に合格しなければDMARCは合格しないという規則",
        "SPFやDKIMで検証されたドメインが、受信者に表示されるFromヘッダーのドメインと一致していることを求める規則",
        "送信サーバーのIPアドレスとDNSの逆引き結果が一致していることを求める規則",
        "送信側と受信側で同じ暗号方式を使うことを求める規則",
      ],
      answerIndex: 1,
      explanation: "<p>SPFやDKIM単体は「どこかのドメインとして検証に通った」ことしか示せず、攻撃者は自分のドメインで" +
        "SPFに合格しながらFromヘッダーにexample.comを表示できます。アライメントは検証結果を「利用者に見えるFrom」と" +
        "結び付けることで、この抜け道を塞ぎます。合格に必要なのはSPFとDKIMの両方ではなく、" +
        "どちらか一方がアライメント込みで合格することです。逆引きや暗号方式はDMARCの検証対象ではありません。</p>",
    },
    {
      question: "DMARCの導入手順として適切なのはどれですか。",
      choices: [
        "p=noneとruaレポートによる観測から始め、正規の送信元すべてがSPF/DKIMに合格するのを確認してからquarantine、rejectへ段階的に強化する",
        "被害を最小化するため、最初からp=rejectで設定し、問題が起きたらp=noneへ戻す",
        "DMARCを設定すればSPFとDKIMは不要になるので、DMARCだけを設定する",
        "送信ドメイン認証は受信側だけの仕組みなので、送信者側で設定することはない",
      ],
      answerIndex: 0,
      explanation: "<p>いきなり<code>p=reject</code>にすると、メール配信サービス経由の通知など認証設定が漏れていた" +
        "正規メールまで拒否される事故につながります。まず<code>p=none</code>とレポートで実態を観測し、" +
        "漏れを潰してから段階的に強化するのが定石です。DMARCはSPF/DKIMの検証結果の上に成り立つため単独では機能せず、" +
        "SPF/DKIM/DMARCのレコードを公開するのはすべて送信ドメイン側の作業です。</p>",
    },
  ],

  // 実務チェックリスト（5〜8項目）
  checklist: [
    "<code>dig txt 自ドメイン</code>でSPFレコードを確認し、<code>-all</code>（または<code>~all</code>）で締めている。<code>+all</code>にしていない",
    "SPFのDNSルックアップ回数が上限の10回以内に収まっている（<code>include:</code>の連鎖に注意）",
    "DKIM署名を有効にし、鍵は2048ビット以上で、セレクタを使って定期的にローテーションしている",
    "DMARCを<code>p=none</code>と<code>rua</code>レポートから導入し、観測後に<code>quarantine</code>／<code>reject</code>へ強化する計画がある",
    "メール配信サービスなど外部の送信元をすべて洗い出し、SPFの<code>include:</code>とDKIM署名の設定に含めている",
    "メールを送信しないドメインやサブドメインにも<code>v=spf1 -all</code>と<code>p=reject</code>のDMARCを設定している",
    "<code>rua</code>宛ての集計レポートを定期的に確認し、なりすましや設定漏れを検知する運用がある",
  ],

  // 参考資料（公式・一次情報。全URLはHTTP 200を確認済み）
  references: [
    { title: "RFC 7208: Sender Policy Framework (SPF)", url: "https://datatracker.ietf.org/doc/html/rfc7208", note: "SPFの仕様（英語）" },
    { title: "RFC 6376: DomainKeys Identified Mail (DKIM)", url: "https://datatracker.ietf.org/doc/html/rfc6376", note: "DKIM署名の仕様（英語）" },
    { title: "RFC 7489: DMARC", url: "https://datatracker.ietf.org/doc/html/rfc7489", note: "DMARCの仕様。アライメントの定義もここにある（英語）" },
    { title: "dmarc.org: Overview", url: "https://dmarc.org/overview/", note: "DMARCの全体像と導入の考え方（英語）" },
    { title: "Google: メール送信者のガイドライン", url: "https://support.google.com/a/answer/81126", note: "大手受信プロバイダが送信者に求める認証要件（日本語）" },
    { title: "なりすまし対策ポータル", url: "https://www.naritai.jp/", note: "迷惑メール対策推進協議会による送信ドメイン認証の解説（日本語）" },
  ],
});
