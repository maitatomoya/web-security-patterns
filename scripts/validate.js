/**
 * 教材データの機械検証スクリプト
 *
 * 使い方:
 *   node scripts/validate.js                          # public/content/topic*.js を全件検証
 *   node scripts/validate.js public/content/topic01.js  # 指定ファイルのみ検証
 *
 * 方針:
 * - 存在するトピックファイルだけを検証する（未作成の番号はスキップ）
 * - registerTopic()で登録された構造がスキーマを満たすかを検証する
 * - referencesのURLはhttps形式かどうかだけを見る（到達性はcurlで別途確認）
 *
 * 終了コード: エラーがあれば1、なければ0
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "public", "content");

const CATEGORIES = ["インジェクション", "認証・認可", "設定ミス", "運用"];

const errors = [];
const warns = [];
function err(file, msg) { errors.push("[ERROR] " + file + ": " + msg); }
function warn(file, msg) { warns.push("[WARN]  " + file + ": " + msg); }

/** コード行数を数える（highlightsの範囲チェック用） */
function lineCount(code) {
  return String(code).replace(/\n+$/, "").split("\n").length;
}

function validatePane(file, cmp, kind) {
  var pane = cmp[kind];
  if (!pane) { err(file, "codeComparison: " + kind + " がない"); return; }
  if (pane.code == null || String(pane.code).trim() === "") {
    err(file, "codeComparison(" + kind + "): codeが空");
  }
  if (!pane.note) warn(file, "codeComparison(" + kind + "): note（注釈）がない");
  var max = lineCount(pane.code);
  (pane.highlights || []).forEach(function (n) {
    if (typeof n !== "number" || n < 1 || n > max) {
      err(file, "codeComparison(" + kind + "): highlights " + n + " が行数(" + max + ")の範囲外");
    }
  });
}

function validateComparison(file, cmp, i) {
  var label = "codeComparison[" + i + "]";
  if (!cmp.lang) warn(file, label + ": lang（言語表示）がない");
  validatePane(file, cmp, "vulnerable");
  validatePane(file, cmp, "fixed");
}

function validateAttack(file, a) {
  if (!a) { err(file, "attackがない"); return; }
  if (!a.steps || !a.steps.length) {
    err(file, "attack.steps（攻撃手順）がない");
    return;
  }
  a.steps.forEach(function (s, i) {
    if (!s.title) err(file, "attack.steps[" + i + "]: titleがない");
    if (!s.detail) err(file, "attack.steps[" + i + "]: detailがない");
  });
}

function validateQuiz(file, quiz) {
  if (!quiz || !quiz.length) { err(file, "quiz（クイズ）がない"); return; }
  if (quiz.length !== 3) warn(file, "quizは3問を推奨（現在" + quiz.length + "問）");
  quiz.forEach(function (q, i) {
    var lbl = "quiz[" + i + "]";
    if (!q.question) err(file, lbl + ": questionがない");
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      err(file, lbl + ": choicesは4つ必要（現在" + (q.choices ? q.choices.length : 0) + "）");
    }
    if (typeof q.answerIndex !== "number" || q.answerIndex < 0 || q.answerIndex > 3) {
      err(file, lbl + ": answerIndexは0〜3の数値");
    }
    if (!q.explanation) err(file, lbl + ": explanation（解説）がない");
    else if (q.explanation.length < 40) warn(file, lbl + ": explanationが短い（40字未満）");
  });
}

function validateReferences(file, refs) {
  if (!refs || !refs.length) { err(file, "references（参考資料）がない"); return; }
  refs.forEach(function (r, i) {
    var lbl = "references[" + i + "]";
    if (!r.title || !r.url) { err(file, lbl + ": title/urlがない"); return; }
    if (!/^https:\/\//.test(r.url)) err(file, lbl + ": httpsのURLにする " + r.url);
  });
}

function validateTopic(file, t, expectedId) {
  ["id", "category", "title", "summary", "overview"].forEach(function (k) {
    if (t[k] == null || t[k] === "") err(file, "必須フィールド " + k + " がない");
  });
  if (typeof t.id === "number" && expectedId != null && t.id !== expectedId) {
    err(file, "idがファイル名と不一致（id=" + t.id + " / ファイル=topic" + expectedId + "）");
  }
  if (t.category && CATEGORIES.indexOf(t.category) === -1) {
    warn(file, "categoryが定義済み4種以外「" + t.category + "」");
  }
  if (t.overview && t.overview.length < 200) {
    warn(file, "overviewが短い（概要は400〜800字程度を推奨）");
  }
  validateAttack(file, t.attack);
  if (!t.codeComparison || !t.codeComparison.length) {
    err(file, "codeComparison（コード比較）がない");
  } else {
    t.codeComparison.forEach(function (cmp, i) { validateComparison(file, cmp, i); });
  }
  validateQuiz(file, t.quiz);
  if (!t.checklist || t.checklist.length < 5 || t.checklist.length > 8) {
    warn(file, "checklistは5〜8項目を推奨（現在" + (t.checklist ? t.checklist.length : 0) + "）");
  }
  validateReferences(file, t.references);
}

var args = process.argv.slice(2);
var files = args.length
  ? args.map(function (a) { return path.resolve(a); })
  : (fs.existsSync(CONTENT)
      ? fs.readdirSync(CONTENT).filter(function (f) { return /^topic\d+\.js$/.test(f); })
          .map(function (f) { return path.join(CONTENT, f); })
      : []);

if (!files.length) {
  console.log("検証対象のトピックファイルがありません（public/content/topicNN.js は未作成）");
  process.exit(0);
}

var count = 0;
files.forEach(function (fp) {
  var name = path.basename(fp);
  var m = name.match(/^topic(\d+)\.js$/);
  var expectedId = m ? Number(m[1]) : null;
  var registered = null;
  global.registerTopic = function (t) { registered = t; };
  global.registerIntro = function () { /* introは検証対象外 */ };
  try {
    delete require.cache[fp];
    require(fp);
  } catch (e) {
    err(name, "読み込み失敗: " + e.message);
    return;
  }
  if (!registered) { err(name, "registerTopicが呼ばれていない"); return; }
  count++;
  validateTopic(name, registered, expectedId);
});

console.log("検証: " + count + "ファイル");
warns.forEach(function (w) { console.log(w); });
errors.forEach(function (e) { console.log(e); });
if (errors.length) {
  console.log("NG: エラー" + errors.length + "件 / 警告" + warns.length + "件");
  process.exit(1);
}
console.log("OK: エラー0件 / 警告" + warns.length + "件");
