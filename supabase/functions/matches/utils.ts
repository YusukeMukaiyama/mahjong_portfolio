export type ParsedMatchesPath = {
  matchId: string | null;
  subPath: string | null;
  gameNumberSeg: string | null;
};

export type MatchRouteKind =
  | "GET_DETAIL"
  | "POST_GAMES"
  | "PATCH_GAME"
  | "GET_LIST"
  | "POST_MATCH"
  | "UNSUPPORTED";

export function parseMatchesPath(pathname: string): ParsedMatchesPath {
  const parts = String(pathname || "").split("/");
  const idx = parts.findIndex((p) => p === "matches");
  const matchId = idx >= 0 && parts.length > idx + 1 && parts[idx + 1] ? decodeURIComponent(parts[idx + 1]) : null;
  const subPath = idx >= 0 && parts.length > idx + 2 ? parts[idx + 2] : null;
  const gameNumberSeg = idx >= 0 && parts.length > idx + 3 && parts[idx + 3] ? decodeURIComponent(parts[idx + 3]) : null;
  return { matchId, subPath, gameNumberSeg };
}

export function resolveMatchRoute(method: string, pathname: string): MatchRouteKind {
  const { matchId, subPath, gameNumberSeg } = parseMatchesPath(pathname);
  if (method === "GET" && !!matchId && !subPath) return "GET_DETAIL";
  if (method === "POST" && !!matchId && subPath === "games" && !gameNumberSeg) return "POST_GAMES";
  if (method === "PATCH" && !!matchId && subPath === "games" && !!gameNumberSeg) return "PATCH_GAME";
  if (method === "GET") return "GET_LIST";
  if (method === "POST") return "POST_MATCH";
  return "UNSUPPORTED";
}

export function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null | undefined;
  if (!err) return false;
  if (err.code === "23505") return true;
  const msg = String(err.message || "");
  return /duplicate key|unique constraint/i.test(msg);
}

export function mapCreateGameInsertError(error: unknown): { status: number; message: string } | null {
  if (isUniqueViolation(error)) {
    return { status: 409, message: "同時更新が発生しました。再読み込みしてもう一度お試しください。" };
  }
  return null;
}
