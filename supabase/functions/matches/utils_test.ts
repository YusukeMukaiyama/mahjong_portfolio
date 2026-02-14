import { mapCreateGameInsertError, parseMatchesPath, resolveMatchRoute } from "./utils.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (actual=${String(actual)}, expected=${String(expected)})`);
  }
}

Deno.test("APIルーティング: GET /matches/:id は詳細取得ルート", () => {
  assertEqual(resolveMatchRoute("GET", "/functions/v1/matches/42"), "GET_DETAIL", "詳細ルート判定が不正");
});

Deno.test("APIルーティング: POST /matches/:id/games は半荘登録ルート", () => {
  assertEqual(resolveMatchRoute("POST", "/functions/v1/matches/42/games"), "POST_GAMES", "半荘登録ルート判定が不正");
});

Deno.test("APIルーティング: PATCH /matches/:id/games/:number は半荘修正ルート", () => {
  assertEqual(resolveMatchRoute("PATCH", "/functions/v1/matches/42/games/3"), "PATCH_GAME", "半荘修正ルート判定が不正");
});

Deno.test("APIルーティング: GET /matches は一覧取得ルート", () => {
  assertEqual(resolveMatchRoute("GET", "/functions/v1/matches"), "GET_LIST", "一覧取得ルート判定が不正");
});

Deno.test("APIルーティング: POST /matches は対局作成ルート", () => {
  assertEqual(resolveMatchRoute("POST", "/functions/v1/matches"), "POST_MATCH", "対局作成ルート判定が不正");
});

Deno.test("APIルーティング: サポート外メソッドは UNSUPPORTED", () => {
  assertEqual(resolveMatchRoute("DELETE", "/functions/v1/matches/42"), "UNSUPPORTED", "サポート外メソッド判定が不正");
});

Deno.test("パス解析: matchId/subPath/gameNumberSeg を正しく抽出する", () => {
  const parsed = parseMatchesPath("/functions/v1/matches/%E5%AF%BE%E5%B1%80/games/11");
  assertEqual(parsed.matchId, "対局", "matchId のデコードが不正");
  assertEqual(parsed.subPath, "games", "subPath が不正");
  assertEqual(parsed.gameNumberSeg, "11", "gameNumberSeg が不正");
});

Deno.test("同時更新判定: 一意制約違反は409マッピングする", () => {
  const mapped = mapCreateGameInsertError({ code: "23505", message: "duplicate key value violates unique constraint" });
  assert(mapped, "競合エラーのマッピング結果が null");
  assertEqual(mapped?.status, 409, "競合時のHTTPステータスが不正");
});

Deno.test("同時更新判定: 非競合エラーはマッピングしない", () => {
  const mapped = mapCreateGameInsertError({ code: "XX000", message: "unexpected error" });
  assertEqual(mapped, null, "非競合エラーは null を返すべき");
});
