/**
 * 教材データ登録用のグローバル関数。
 * 各content/topicNN.jsがregisterTopic()を呼んでトピックを登録し、
 * content/intro.jsがregisterIntro()で「はじめに」を登録する。
 * app.jsより先に読み込まれる必要がある（index.htmlのscript順で保証）。
 */
window.WEBSEC_TOPICS = [];
window.WEBSEC_INTRO = null;

function registerTopic(t) {
  window.WEBSEC_TOPICS.push(t);
}

function registerIntro(intro) {
  window.WEBSEC_INTRO = intro;
}
