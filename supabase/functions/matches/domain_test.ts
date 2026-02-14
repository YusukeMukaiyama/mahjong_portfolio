import { computeGameResults, validateScores, type ScoreInput } from "./domain.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (actual=${String(actual)}, expected=${String(expected)})`);
  }
}

function findSeat(results: ReturnType<typeof computeGameResults>, seat: number) {
  const row = results.find((r) => r.seat_index === seat);
  assert(row, `seat_index=${seat} の結果が見つかりません`);
  return row;
}

Deno.test("バリデーション: 正常な4人スコアはエラーにならない", () => {
  const scores: ScoreInput[] = [
    { seat_index: 0, raw_score: 35000 },
    { seat_index: 1, raw_score: 25000 },
    { seat_index: 2, raw_score: 20000 },
    { seat_index: 3, raw_score: 20000 },
  ];
  assertEqual(validateScores(scores), null, "正常ケースは null を返すべき");
});

Deno.test("バリデーション: 合計100000でない場合はエラー", () => {
  const scores: ScoreInput[] = [
    { seat_index: 0, raw_score: 30000 },
    { seat_index: 1, raw_score: 25000 },
    { seat_index: 2, raw_score: 20000 },
    { seat_index: 3, raw_score: 20000 },
  ];
  assertEqual(validateScores(scores), "sum must be 100000", "合計不一致エラーを返すべき");
});

Deno.test("バリデーション: 同一 seat_index 重複はエラー", () => {
  const scores: ScoreInput[] = [
    { seat_index: 0, raw_score: 30000 },
    { seat_index: 0, raw_score: 25000 },
    { seat_index: 2, raw_score: 25000 },
    { seat_index: 3, raw_score: 20000 },
  ];
  assertEqual(validateScores(scores), "each seat_index must appear once", "seat_index 重複エラーを返すべき");
});

Deno.test("順位決定: 同点時は seat_index が小さい方が上位", () => {
  const scores: ScoreInput[] = [
    { seat_index: 0, raw_score: 30000 },
    { seat_index: 1, raw_score: 30000 },
    { seat_index: 2, raw_score: 25000 },
    { seat_index: 3, raw_score: 15000 },
  ];
  const results = computeGameResults(scores, 25000, 30000, 10, 20);
  assertEqual(findSeat(results, 0).rank, 1, "seat 0 は 1位のはず");
  assertEqual(findSeat(results, 1).rank, 2, "seat 1 は 2位のはず");
});

Deno.test("計算: 1位にのみオカボーナスが付与される", () => {
  const scores: ScoreInput[] = [
    { seat_index: 0, raw_score: 40000 },
    { seat_index: 1, raw_score: 25000 },
    { seat_index: 2, raw_score: 20000 },
    { seat_index: 3, raw_score: 15000 },
  ];
  const results = computeGameResults(scores, 25000, 30000, 10, 20);
  assertEqual(findSeat(results, 0).pt_oka_bonus, 20, "1位のオカボーナスが不正");
  assertEqual(findSeat(results, 1).pt_oka_bonus, 0, "2位にオカボーナスは付かない");
  assertEqual(findSeat(results, 2).pt_oka_bonus, 0, "3位にオカボーナスは付かない");
  assertEqual(findSeat(results, 3).pt_oka_bonus, 0, "4位にオカボーナスは付かない");
});

Deno.test("計算: 各プレイヤーの pt_total 合計は0になる", () => {
  const scores: ScoreInput[] = [
    { seat_index: 0, raw_score: 42000 },
    { seat_index: 1, raw_score: 25000 },
    { seat_index: 2, raw_score: 20000 },
    { seat_index: 3, raw_score: 13000 },
  ];
  const results = computeGameResults(scores, 25000, 30000, 10, 20);
  const sum = results.reduce((acc, r) => acc + r.pt_total, 0);
  assert(Math.abs(sum) < 1e-9, `pt_total 合計は 0 であるべき (actual=${sum})`);
});
