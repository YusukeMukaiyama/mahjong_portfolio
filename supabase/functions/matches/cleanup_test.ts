import { cleanupCreateGameFailure } from "./cleanup.ts";

type DeleteCall = {
  table: string;
  filters: Array<{ col: string; val: string | number }>;
};

class FakeSupabase {
  calls: DeleteCall[] = [];

  from(table: string) {
    return {
      delete: () => {
        const call: DeleteCall = { table, filters: [] };
        this.calls.push(call);
        return {
          eq: (col: string, val: string | number) => {
            call.filters.push({ col, val });
            return {
              eq: async (col2: string, val2: string | number) => {
                call.filters.push({ col: col2, val: val2 });
                return { error: null };
              },
            };
          },
        };
      },
    };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) throw new Error(`${message} (actual=${String(actual)}, expected=${String(expected)})`);
}

Deno.test("ロールバック: game_scores 挿入失敗時は games のみ削除する", async () => {
  const fake = new FakeSupabase();
  await cleanupCreateGameFailure(fake, "insert_scores", "m1", 3);

  assertEqual(fake.calls.length, 1, "削除呼び出し回数が不正");
  assertEqual(fake.calls[0].table, "games", "削除対象テーブルが不正");
});

Deno.test("ロールバック: game_seats 挿入失敗時は game_scores と games を削除する", async () => {
  const fake = new FakeSupabase();
  await cleanupCreateGameFailure(fake, "insert_seats", "m2", 9);

  assertEqual(fake.calls.length, 2, "削除呼び出し回数が不正");
  assertEqual(fake.calls[0].table, "game_scores", "1つ目の削除対象が不正");
  assertEqual(fake.calls[1].table, "games", "2つ目の削除対象が不正");

  const scoreFilters = fake.calls[0].filters;
  const gameFilters = fake.calls[1].filters;
  assert(scoreFilters.some((x) => x.col === "match_id" && x.val === "m2"), "game_scores の match_id 条件が不足");
  assert(scoreFilters.some((x) => x.col === "game_number" && x.val === 9), "game_scores の game_number 条件が不足");
  assert(gameFilters.some((x) => x.col === "match_id" && x.val === "m2"), "games の match_id 条件が不足");
  assert(gameFilters.some((x) => x.col === "number" && x.val === 9), "games の number 条件が不足");
});
