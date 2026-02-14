const test = require("node:test");
const assert = require("node:assert/strict");

require("../historyUtils.js");
const resolveHistoryRowName = globalThis.resolveHistoryRowName;

if (typeof resolveHistoryRowName !== "function") {
  throw new TypeError("resolveHistoryRowName が読み込めませんでした");
}

test("履歴表示名: participant_id対応の参加者名を最優先で使う", () => {
  const row = { seat_index: 2, participant_id: "10", display_name: "Aki" };
  const byId = new Map([["10", "Suzuki"]]);
  const fallback = ["E", "S", "W", "N"];
  assert.equal(resolveHistoryRowName(row, byId, fallback), "Suzuki");
});

test("履歴表示名: display_name が空なら participant_id から解決する", () => {
  const row = { seat_index: 1, participant_id: "42", display_name: "" };
  const byId = new Map([["42", "Tanaka"]]);
  const fallback = ["E", "S", "W", "N"];
  assert.equal(resolveHistoryRowName(row, byId, fallback), "Tanaka");
});

test("履歴表示名: participant_id が無い場合は display_name を使う", () => {
  const row = { seat_index: 0, participant_id: null, display_name: "Ito" };
  const byId = new Map();
  const fallback = ["E", "S", "W", "N"];
  assert.equal(resolveHistoryRowName(row, byId, fallback), "Ito");
});

test("履歴表示名: 参加者解決できない場合は席名にフォールバックする", () => {
  const row = { seat_index: 3, participant_id: null };
  const byId = new Map();
  const fallback = ["東", "南", "西", "北"];
  assert.equal(resolveHistoryRowName(row, byId, fallback), "北");
});

test("履歴表示名: seat_index が壊れている入力は Seat ? を返す", () => {
  const row = { participant_id: null, seat_index: "x" };
  const byId = new Map();
  const fallback = ["E", "S", "W", "N"];
  assert.equal(resolveHistoryRowName(row, byId, fallback), "Seat ?");
});
