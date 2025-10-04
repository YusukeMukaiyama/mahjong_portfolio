export type ScoreInput = { seat_index: number; raw_score: number };

export type GameResultRow = {
  seat_index: number;
  rank: number;
  raw_score: number;
  pt_soten: number;
  pt_uma: number;
  pt_oka_bonus: number;
  pt_total: number;
};

export function validateScores(scores: ScoreInput[]): string | null {
  if (!Array.isArray(scores) || scores.length !== 4) {
    return "scores must have 4 items";
  }
  const seen = new Set<number>();
  let sum = 0;
  for (const s of scores) {
    if (typeof s?.seat_index !== "number" || typeof s?.raw_score !== "number") {
      return "invalid score item";
    }
    if (!Number.isInteger(s.seat_index) || s.seat_index < 0 || s.seat_index > 3) {
      return "seat_index must be 0..3";
    }
    if (!Number.isInteger(s.raw_score) || s.raw_score % 100 !== 0) {
      return "raw_score must be multiple of 100";
    }
    if (seen.has(s.seat_index)) {
      return "each seat_index must appear once";
    }
    seen.add(s.seat_index);
    sum += s.raw_score;
  }
  if (seen.size !== 4) {
    return "scores must include seat_index 0..3";
  }
  if (sum !== 100000) {
    return "sum must be 100000";
  }
  return null;
}

export function computeGameResults(
  scores: ScoreInput[],
  start_points: number,
  oka_points: number,
  uma_low: number,
  uma_high: number,
): GameResultRow[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.raw_score !== a.raw_score) return b.raw_score - a.raw_score;
    return a.seat_index - b.seat_index;
  });
  const rankBySeat = new Map<number, number>();
  sorted.forEach((s, i) => rankBySeat.set(s.seat_index, i + 1));

  const high = Math.abs(uma_high);
  const low = Math.abs(uma_low);
  const umaByRank = [high, low, -low, -high];
  const okaBonusForFirst = ((oka_points - start_points) / 1000) * 4;

  return scores.map((s) => {
    const pt_soten = s.raw_score / 1000 - oka_points / 1000;
    const rank = rankBySeat.get(s.seat_index)!;
    const pt_uma = umaByRank[rank - 1] ?? 0;
    const pt_oka_bonus = rank === 1 ? okaBonusForFirst : 0;
    const pt_total = pt_soten + pt_uma + pt_oka_bonus;
    return { seat_index: s.seat_index, rank, raw_score: s.raw_score, pt_soten, pt_uma, pt_oka_bonus, pt_total };
  });
}

