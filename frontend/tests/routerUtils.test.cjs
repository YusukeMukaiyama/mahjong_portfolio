const test = require("node:test");
const assert = require("node:assert/strict");

require("../routerUtils.js");
const resolveRouteView = globalThis.resolveRouteView;

if (typeof resolveRouteView !== "function") {
  throw new TypeError("resolveRouteView が読み込めませんでした");
}

test("画面遷移: ハッシュの対局詳細URLは detail を返す", () => {
  const out = resolveRouteView("#/matches/abc123", "/");
  assert.deepEqual(out, { view: "detail", matchId: "abc123" });
});

test("画面遷移: 直接パスの対局詳細URLは detail を返す", () => {
  const out = resolveRouteView("", "/matches/match-77");
  assert.deepEqual(out, { view: "detail", matchId: "match-77" });
});

test("画面遷移: エンコード済みIDはデコードされる", () => {
  const out = resolveRouteView("#/matches/%E5%AF%BE%E5%B1%80-1", "/");
  assert.deepEqual(out, { view: "detail", matchId: "対局-1" });
});

test("画面遷移: 一覧URLは home を返す", () => {
  const out = resolveRouteView("#/", "/");
  assert.deepEqual(out, { view: "home", matchId: null });
});
