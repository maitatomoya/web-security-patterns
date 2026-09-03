/**
 * Web Security Patterns フロントエンド
 *
 * サイドバーにカテゴリ別のトピック一覧、メインにトピック解説を表示する。
 * トピック詳細は「概要→攻撃の仕組み→コード比較→クイズ→チェックリスト→参考資料」
 * の縦積み構成。クイズは選択すると即時に正誤と解説を表示する。
 * 学習状態（読了・クイズの回答）はlocalStorageに保存する。
 * 複数タブ対策として、読了の保存時はlocalStorageの最新値とマージする。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "websec.state.v1";
  var SITE_TITLE = "Web Security Patterns";
  var TOTAL_PLANNED = 15;

  // カテゴリの表示順。トピック側のcategoryはこの文字列と完全一致させる
  var CATEGORY_ORDER = ["インジェクション", "認証・認可", "設定ミス", "運用"];
  var CATEGORY_DESC = {
    "インジェクション": "外部からの入力が、コードや命令として解釈されてしまう問題群",
    "認証・認可": "本人確認と権限チェックの穴を突かれる問題群",
    "設定ミス": "ヘッダーや境界の設定不備が、そのまま攻撃の入口になる問題群",
    "運用": "開発・運用のプロセスに潜む問題群",
  };

  var topics = (window.WEBSEC_TOPICS || []).slice().sort(function (a, b) { return a.id - b.id; });
  var topicById = {};
  topics.forEach(function (t) { topicById[t.id] = t; });

  // ---- 状態管理 ----

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return {
            done: parsed.done || {},
            quiz: parsed.quiz || {},
            lastTopic: parsed.lastTopic || null,
          };
        }
      }
    } catch (e) { /* 壊れた保存データは無視して初期状態に戻す */ }
    return { done: {}, quiz: {}, lastTopic: null };
  }
  var state = loadState();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 無視 */ }
  }

  /**
   * 読了チェックの保存。他タブのチェックを消さないよう最新値とマージした上で、
   * 該当トピックのみを確定的に更新する。
   */
  function setDone(id, checked) {
    var latest = loadState();
    Object.keys(state.done).forEach(function (k) { latest.done[k] = true; });
    if (checked) latest.done[id] = true; else delete latest.done[id];
    state.done = latest.done;
    persist();
  }

  /** クイズの回答を保存する。choiceIndexにnullを渡すと回答を取り消す */
  function setQuizAnswer(topicId, qIndex, choiceIndex) {
    if (!state.quiz[topicId]) state.quiz[topicId] = {};
    if (choiceIndex === null) delete state.quiz[topicId][qIndex];
    else state.quiz[topicId][qIndex] = choiceIndex;
    persist();
  }

  function getQuizAnswer(topicId, qIndex) {
    var t = state.quiz[topicId];
    if (!t) return null;
    var v = t[qIndex];
    return typeof v === "number" ? v : null;
  }

  // ---- DOMユーティリティ ----

  var $ = function (id) { return document.getElementById(id); };
  var elToc = $("toc");
  var elTopicView = $("topic-view");
  var elPageView = $("page-view");
  var elSearch = $("toc-search");
  var current = null;       // 表示中のトピック
  var currentPage = null;   // "home" | "intro" | null

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** 属性値に埋め込む文字列のエスケープ */
  function escAttr(s) {
    return esc(s).replace(/"/g, "&quot;");
  }

  function h(html) { return html || ""; }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function setTitle(prefix) {
    document.title = prefix ? prefix + "｜" + SITE_TITLE : SITE_TITLE;
  }

  /** 遷移後にメイン見出しへフォーカスを移し、スクリーンリーダーに画面の変化を伝える */
  function focusHeading(container) {
    var heading = container.querySelector("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
    }
  }

  function scrollTopAll() {
    window.scrollTo(0, 0);
    var main = $("main");
    if (main) main.scrollTop = 0;
  }

  /**
   * 本文中の「トピックN」（N=1〜15）を該当トピックへのリンクに置換する。
   * 未登録トピックへの参照はリンクにしない（行き止まり防止）。
   */
  function linkTopicRefs(html) {
    return String(html).replace(/トピック(1[0-5]|[1-9])(?![0-9])/g, function (m, n) {
      var t = topicById[Number(n)];
      if (!t) return m;
      return '<a href="#topic-' + n + '">トピック' + n + "</a>";
    });
  }

  // ---- 検索インデックス ----
  // タイトル・カテゴリ・概要1行・keywords（別名や用語）で検索できるようにする
  var searchIndex = {};
  topics.forEach(function (t) {
    var parts = [t.title || "", t.category || "", t.summary || ""];
    (t.keywords || []).forEach(function (k) { parts.push(k); });
    searchIndex[t.id] = parts.join(" ").toLowerCase();
  });

  // ---- 進捗表示 ----

  function doneCount() {
    return topics.filter(function (t) { return state.done[t.id]; }).length;
  }

  function renderProgress() {
    var total = topics.length;
    $("progress-label").textContent = doneCount() + " / " + total;
    $("progress-fill").style.width = (total ? (doneCount() / total) * 100 : 0) + "%";
    var bar = $("progress-bar");
    if (bar) {
      bar.setAttribute("aria-valuemax", String(total));
      bar.setAttribute("aria-valuenow", String(doneCount()));
    }
  }

  // ---- サイドバーの目次 ----

  // カテゴリ名 → 開閉状態。renderTocの全再構築後も開閉状態を引き継ぐ
  var tocOpen = {};
  var tocForceOpen = null;
  var tocLastFiltered = false;

  function renderToc() {
    var query = elSearch ? elSearch.value.trim().toLowerCase() : "";
    var filtering = query !== "";
    var visible = filtering
      ? topics.filter(function (t) { return searchIndex[t.id].indexOf(query) !== -1; })
      : topics;

    // 前回が通常表示のときだけ、ユーザーの開閉状態を現在のDOMから引き継ぐ
    if (!tocLastFiltered) {
      Array.prototype.forEach.call(elToc.querySelectorAll("details.toc-cat"), function (d) {
        var s = d.querySelector("summary .toc-cat-name");
        if (s) tocOpen[s.textContent] = d.open;
      });
    }
    if (tocForceOpen) {
      tocOpen[tocForceOpen] = true;
      tocForceOpen = null;
    }
    tocLastFiltered = filtering;

    elToc.innerHTML = "";

    var homeLink = document.createElement("a");
    homeLink.href = "#home";
    homeLink.className = "toc-page" + (currentPage === "home" ? " active" : "");
    homeLink.textContent = "トピック一覧";
    elToc.appendChild(homeLink);

    if (window.WEBSEC_INTRO) {
      var introLink = document.createElement("a");
      introLink.href = "#intro";
      introLink.className = "toc-page" + (currentPage === "intro" ? " active" : "");
      introLink.textContent = window.WEBSEC_INTRO.tocTitle || "はじめに：脅威モデルの考え方";
      elToc.appendChild(introLink);
    }

    if (filtering && visible.length === 0) {
      var empty = document.createElement("p");
      empty.className = "toc-empty";
      empty.textContent = "「" + (elSearch ? elSearch.value.trim() : "") + "」に一致するトピックはありません";
      elToc.appendChild(empty);
    }

    // 登録済みトピックのカテゴリを表示順に並べる（未知カテゴリは末尾に足す）
    var categories = CATEGORY_ORDER.slice();
    visible.forEach(function (t) {
      if (categories.indexOf(t.category) === -1) categories.push(t.category);
    });

    categories.forEach(function (cat) {
      var inCat = visible.filter(function (t) { return t.category === cat; });
      if (!inCat.length) return;
      var details = document.createElement("details");
      details.className = "toc-cat";
      if (filtering) {
        details.open = true;
      } else if (Object.prototype.hasOwnProperty.call(tocOpen, cat)) {
        details.open = tocOpen[cat];
      } else {
        details.open = true; // 初回はすべて開いて全体像を見せる
      }
      var summary = document.createElement("summary");
      summary.innerHTML = '<span class="toc-cat-name">' + esc(cat) + "</span>" +
        '<span class="toc-cat-count">' + inCat.length + "</span>";
      details.appendChild(summary);
      var ul = document.createElement("ul");
      inCat.forEach(function (t) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#topic-" + t.id;
        a.className = "toc-topic" +
          (state.done[t.id] ? " done" : "") +
          (current && current.id === t.id ? " active" : "");
        a.innerHTML = '<span class="toc-no">' + pad2(t.id) + "</span>" +
          '<span class="toc-title-text">' + esc(t.title) + "</span>" +
          (state.done[t.id] ? '<span class="toc-done-badge">済</span>' : "");
        li.appendChild(a);
        ul.appendChild(li);
      });
      details.appendChild(ul);
      elToc.appendChild(details);
    });
  }

  // ---- トピック詳細：各セクションのHTML ----

  var sectionCounter = 0;
  function sectionHead(label) {
    sectionCounter++;
    return '<div class="sec-head"><span class="sec-no">' + pad2(sectionCounter) +
      '</span><h3>' + esc(label) + "</h3></div>";
  }

  function overviewHtml(t) {
    if (!t.overview) return "";
    return '<section class="sec">' + sectionHead("概要：何が起きるのか") +
      '<div class="sec-body">' + h(t.overview) + "</div></section>";
  }

  function attackHtml(t) {
    var a = t.attack;
    if (!a) return "";
    var html = '<section class="sec">' + sectionHead("攻撃の仕組み");
    html += '<div class="sec-body">';
    if (a.scenario) html += '<div class="attack-scenario">' + h(a.scenario) + "</div>";
    if (a.steps && a.steps.length) {
      html += '<ol class="attack-steps">';
      a.steps.forEach(function (s, i) {
        html += '<li class="attack-step">' +
          '<span class="step-no" aria-hidden="true">' + (i + 1) + "</span>" +
          '<div class="step-body"><span class="step-title">' + esc(s.title) + "</span>" +
          '<div class="step-detail">' + h(s.detail) + "</div></div></li>";
      });
      html += "</ol>";
    }
    if (a.note) html += '<div class="attack-note"><span class="attack-note-label">補足</span>' + h(a.note) + "</div>";
    html += "</div></section>";
    return html;
  }

  /**
   * コード1ペイン分のHTML。行番号付きで描画し、highlightsで指定された行
   * （1始まり）に脆弱側は赤系、修正側は緑系の面ハイライトを付ける。
   */
  function codePaneHtml(cmp, kind) {
    var pane = cmp[kind];
    if (!pane || pane.code == null) return "";
    var isVuln = kind === "vulnerable";
    var badge = isVuln ? "脆弱" : "修正済み";
    var defaultLabel = isVuln ? "脆弱なコード" : "修正したコード";
    var lines = String(pane.code).replace(/\n+$/, "").split("\n");
    var hl = {};
    (pane.highlights || []).forEach(function (n) { hl[n] = true; });

    var rows = lines.map(function (line, i) {
      var no = i + 1;
      var cls = "ln" + (hl[no] ? (isVuln ? " ln-hl-vuln" : " ln-hl-fixed") : "");
      return '<span class="' + cls + '"><span class="ln-no" aria-hidden="true">' + no +
        '</span><span class="ln-code">' + (esc(line) || " ") + "</span></span>";
    }).join("");

    var html = '<div class="code-pane ' + (isVuln ? "pane-vuln" : "pane-fixed") + '">';
    html += '<div class="pane-head">' +
      '<span class="pane-badge ' + (isVuln ? "badge-vuln" : "badge-fixed") + '">' + badge + "</span>" +
      '<span class="pane-label">' + esc(pane.label || defaultLabel) + "</span>" +
      (cmp.lang ? '<span class="pane-lang">' + esc(cmp.lang) + "</span>" : "") +
      "</div>";
    html += '<div class="code-scroll" tabindex="0" role="group" aria-label="' +
      escAttr(badge + "コード。矢印キーで横スクロールできます") + '">' +
      '<pre class="code-block">' + rows + "</pre></div>";
    if (pane.note) {
      html += '<div class="pane-note"><span class="pane-note-label">' +
        (isVuln ? "どこが問題か" : "どう直したか") + "</span>" + h(pane.note) + "</div>";
    }
    html += "</div>";
    return html;
  }

  function comparisonsHtml(t) {
    var list = t.codeComparison;
    if (!list || !list.length) return "";
    var html = '<section class="sec">' + sectionHead("脆弱なコードと修正コード");
    html += '<div class="sec-body">';
    list.forEach(function (cmp) {
      html += '<div class="compare-block">';
      if (cmp.title) html += '<h4 class="compare-title">' + esc(cmp.title) + "</h4>";
      if (cmp.description) html += '<div class="compare-desc">' + h(cmp.description) + "</div>";
      html += '<div class="compare-grid">' +
        codePaneHtml(cmp, "vulnerable") + codePaneHtml(cmp, "fixed") + "</div>";
      html += "</div>";
    });
    html += "</div></section>";
    return html;
  }

  function checklistHtml(t) {
    if (!t.checklist || !t.checklist.length) return "";
    var html = '<section class="sec">' + sectionHead("実務チェックリスト");
    html += '<div class="sec-body"><ul class="checklist">';
    t.checklist.forEach(function (item) {
      html += '<li>' + h(item) + "</li>";
    });
    html += "</ul></div></section>";
    return html;
  }

  function referencesHtml(t) {
    if (!t.references || !t.references.length) return "";
    var html = '<section class="sec">' + sectionHead("参考資料（公式・一次情報）");
    html += '<div class="sec-body"><ul class="ref-list">';
    t.references.forEach(function (r) {
      var note = r.note ? ' <span class="ref-note">— ' + esc(r.note) + "</span>" : "";
      html += '<li><a href="' + escAttr(r.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(r.title) + "</a>" + note + "</li>";
    });
    html += "</ul></div></section>";
    return html;
  }

  // ---- クイズ ----

  /**
   * クイズ全体を描画してイベントを結び付ける。
   * 回答済みの問題は選択肢を確定表示し、解説と「選び直す」ボタンを出す。
   * 回答するたびにこの関数で該当コンテナを再描画する。
   */
  function renderQuiz(container, t) {
    var quiz = t.quiz || [];
    var answered = 0;
    var correct = 0;
    quiz.forEach(function (q, i) {
      var ans = getQuizAnswer(t.id, i);
      if (ans !== null) {
        answered++;
        if (ans === q.answerIndex) correct++;
      }
    });

    var html = '<p class="quiz-score" role="status">' +
      (answered === 0
        ? "全" + quiz.length + "問。選択肢を選ぶと、その場で正誤と解説が表示されます。"
        : "回答済み" + answered + " / " + quiz.length + "問（正解" + correct + "問）") +
      "</p>";

    quiz.forEach(function (q, i) {
      var ans = getQuizAnswer(t.id, i);
      var isAnswered = ans !== null;
      html += '<div class="quiz-item">';
      html += '<p class="quiz-q"><span class="quiz-qno">問' + (i + 1) + "</span>" + esc(q.question) + "</p>";
      html += '<div class="quiz-choices" role="group" aria-label="問' + (i + 1) + 'の選択肢">';
      q.choices.forEach(function (choice, ci) {
        var cls = "quiz-choice";
        if (isAnswered) {
          if (ci === q.answerIndex) cls += " is-answer";
          if (ci === ans && ci !== q.answerIndex) cls += " is-wrong";
        }
        html += '<button type="button" class="' + cls + '" data-q="' + i + '" data-c="' + ci + '"' +
          (isAnswered ? " disabled" : "") + ">" +
          '<span class="choice-key" aria-hidden="true">' + "ABCD".charAt(ci) + "</span>" +
          '<span class="choice-text">' + esc(choice) + "</span></button>";
      });
      html += "</div>";
      html += '<div class="quiz-feedback" aria-live="polite">';
      if (isAnswered) {
        var ok = ans === q.answerIndex;
        html += '<div class="feedback-box ' + (ok ? "feedback-ok" : "feedback-ng") + '">' +
          '<p class="feedback-verdict">' +
          (ok ? "正解です。" : "不正解。正解は「" + "ABCD".charAt(q.answerIndex) + "．" +
            esc(q.choices[q.answerIndex]) + "」です。") + "</p>" +
          '<div class="feedback-explain">' + h(q.explanation) + "</div>" +
          '<button type="button" class="quiz-retry" data-q="' + i + '">選び直す</button></div>';
      }
      html += "</div></div>";
    });

    container.innerHTML = html;

    Array.prototype.forEach.call(container.querySelectorAll(".quiz-choice"), function (btn) {
      btn.addEventListener("click", function () {
        var qi = Number(btn.getAttribute("data-q"));
        var ci = Number(btn.getAttribute("data-c"));
        setQuizAnswer(t.id, qi, ci);
        renderQuiz(container, t);
        // 再描画でフォーカスが失われるため、解説へ移して読み上げにもつなげる
        var boxes = container.querySelectorAll(".feedback-box");
        var idx = 0;
        var count = -1;
        (t.quiz || []).forEach(function (q, i) {
          if (getQuizAnswer(t.id, i) !== null) {
            count++;
            if (i === qi) idx = count;
          }
        });
        var box = boxes[idx];
        if (box) {
          box.setAttribute("tabindex", "-1");
          try { box.focus({ preventScroll: true }); } catch (e) { box.focus(); }
        }
      });
    });

    Array.prototype.forEach.call(container.querySelectorAll(".quiz-retry"), function (btn) {
      btn.addEventListener("click", function () {
        var qi = Number(btn.getAttribute("data-q"));
        setQuizAnswer(t.id, qi, null);
        renderQuiz(container, t);
        var first = container.querySelector('.quiz-choice[data-q="' + qi + '"]');
        if (first) first.focus();
      });
    });
  }

  // ---- 画面表示 ----

  /** 前後の登録済みトピックid。欠番があっても近い方へ飛べるようにする */
  function neighborId(id, dir) {
    var best = null;
    topics.forEach(function (t) {
      if (dir > 0 && t.id > id && (best === null || t.id < best)) best = t.id;
      if (dir < 0 && t.id < id && (best === null || t.id > best)) best = t.id;
    });
    return best;
  }

  function showTopic(id) {
    var t = topicById[id];
    if (!t) return;
    var prevCategory = current ? current.category : null;
    current = t;
    currentPage = null;
    state.lastTopic = id;
    persist();
    if (t.category !== prevCategory) tocForceOpen = t.category;
    elPageView.hidden = true;
    elTopicView.hidden = false;
    sectionCounter = 0;

    var html = "";
    html += '<p class="breadcrumb"><span class="cat-badge">' + esc(t.category) + "</span>" +
      '<span class="breadcrumb-pos">トピック ' + t.id + " / " + TOTAL_PLANNED + "</span></p>";
    html += "<h2>" + esc(t.title) + "</h2>";
    if (t.summary) html += '<p class="topic-lead">' + esc(t.summary) + "</p>";
    html += overviewHtml(t);
    html += attackHtml(t);
    html += comparisonsHtml(t);
    // クイズは動的描画なので入れ物だけ置く
    if (t.quiz && t.quiz.length) {
      html += '<section class="sec">' + sectionHead("理解度チェック") +
        '<div class="sec-body"><div id="quiz-root"></div></div></section>';
    }
    html += checklistHtml(t);
    html += referencesHtml(t);

    var prevId = neighborId(t.id, -1);
    var nextId = neighborId(t.id, 1);
    html += '<nav id="topic-nav" aria-label="トピック移動">';
    html += '<button type="button" id="btn-prev"' + (prevId === null ? " disabled" : "") + ">前のトピック</button>";
    html += '<label id="done-toggle"><input type="checkbox" id="chk-done"' +
      (state.done[t.id] ? " checked" : "") + "> 学習した</label>";
    html += '<button type="button" id="btn-next" class="primary"' + (nextId === null ? " disabled" : "") + ">次のトピック</button>";
    html += "</nav>";

    elTopicView.innerHTML = linkTopicRefs(html);

    var quizRoot = $("quiz-root");
    if (quizRoot) renderQuiz(quizRoot, t);

    $("btn-prev").addEventListener("click", function () {
      if (prevId !== null) location.hash = "#topic-" + prevId;
    });
    $("btn-next").addEventListener("click", function () {
      if (nextId !== null) location.hash = "#topic-" + nextId;
    });
    $("chk-done").addEventListener("change", function () {
      setDone(t.id, this.checked);
      renderToc();
      renderProgress();
    });

    renderToc();
    renderProgress();
    setTitle("トピック" + t.id + " " + t.title);
    scrollTopAll();
    focusHeading(elTopicView);
  }

  function showHome() {
    current = null;
    currentPage = "home";
    elTopicView.hidden = true;
    elPageView.hidden = false;

    var html = '<div class="home-page">';
    html += '<p class="home-kicker">攻撃の仕組みと修正コードで学ぶ</p>';
    html += "<h2>Webセキュリティの実践パターン</h2>";
    html += '<p class="home-lead">脆弱性は「知らないうちに書いてしまうコード」から生まれます。' +
      "各トピックでは、攻撃者の手順を追ってから、脆弱なコードと修正コードを横に並べて比較します。" +
      "読むだけで終わらないよう、理解度チェックと実務チェックリストも用意しています。</p>";
    if (window.WEBSEC_INTRO) {
      html += '<p class="home-intro-link"><a href="#intro">' +
        "はじめての方は「脅威モデルの考え方」から読むのがおすすめです</a></p>";
    }

    CATEGORY_ORDER.forEach(function (cat) {
      var inCat = topics.filter(function (t) { return t.category === cat; });
      html += '<section class="home-cat">';
      html += '<div class="home-cat-head"><h3>' + esc(cat) + "</h3>" +
        '<p class="home-cat-desc">' + esc(CATEGORY_DESC[cat] || "") + "</p></div>";
      if (inCat.length) {
        html += '<div class="topic-cards">';
        inCat.forEach(function (t) {
          html += '<a class="topic-card' + (state.done[t.id] ? " done" : "") + '" href="#topic-' + t.id + '">' +
            '<span class="card-no">' + pad2(t.id) + "</span>" +
            '<span class="card-title">' + esc(t.title) + "</span>" +
            '<span class="card-summary">' + esc(t.summary || "") + "</span>" +
            (state.done[t.id] ? '<span class="card-done">学習済み</span>' : "") +
            "</a>";
        });
        html += "</div>";
      } else {
        html += '<p class="home-cat-empty">このカテゴリのトピックは準備中です。</p>';
      }
      html += "</section>";
    });
    html += "</div>";

    elPageView.innerHTML = html;
    renderToc();
    renderProgress();
    setTitle(null);
    scrollTopAll();
    focusHeading(elPageView);
  }

  function showIntro() {
    var intro = window.WEBSEC_INTRO;
    if (!intro) { showHome(); return; }
    current = null;
    currentPage = "intro";
    elTopicView.hidden = true;
    elPageView.hidden = false;
    elPageView.innerHTML = "";
    var page = document.createElement("div");
    page.className = "intro-page";
    page.innerHTML = linkTopicRefs(intro.content);
    var actions = document.createElement("div");
    actions.className = "intro-actions";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary";
    btn.textContent = topicById[1] ? "トピック1から始める" : "トピック一覧へ";
    btn.addEventListener("click", function () {
      location.hash = topicById[1] ? "#topic-1" : "#home";
    });
    actions.appendChild(btn);
    page.appendChild(actions);
    elPageView.appendChild(page);
    renderToc();
    setTitle(intro.tocTitle || "はじめに");
    scrollTopAll();
    focusHeading(elPageView);
  }

  // ---- ルーティング ----

  function route() {
    var m = location.hash.match(/^#topic-(\d+)$/);
    if (m && topicById[Number(m[1])]) showTopic(Number(m[1]));
    else if (location.hash === "#intro") showIntro();
    else showHome();
  }

  window.addEventListener("hashchange", route);

  // 他タブでの読了チェック・クイズ回答の変更を取り込んで表示へ反映する
  window.addEventListener("storage", function (e) {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    var latest = loadState();
    state.done = latest.done;
    state.quiz = latest.quiz;
    renderToc();
    renderProgress();
    var chk = $("chk-done");
    if (chk && current) chk.checked = !!state.done[current.id];
  });

  if (elSearch) {
    elSearch.addEventListener("input", function () { renderToc(); });
  }

  // ---- 初期表示 ----

  if (topics.length === 0 && !window.WEBSEC_INTRO) {
    elPageView.innerHTML = "<h2>教材データが見つかりません</h2>" +
      "<p>public/content/ にトピックファイルを配置してください。</p>";
  } else {
    var m = location.hash.match(/^#topic-(\d+)$/);
    if (m && topicById[Number(m[1])]) {
      showTopic(Number(m[1]));
    } else if (location.hash === "#intro" && window.WEBSEC_INTRO) {
      showIntro();
    } else if (state.lastTopic && topicById[state.lastTopic] && location.hash === "") {
      showTopic(state.lastTopic);
      location.hash = "#topic-" + state.lastTopic;
    } else {
      showHome();
    }
  }
})();
