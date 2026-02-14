// supabase/functions/matches/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { computeGameResults, validateScores, type ScoreInput, type GameResultRow } from "./domain.ts";
import { cleanupCreateGameFailure } from "./cleanup.ts";
import { mapCreateGameInsertError, parseMatchesPath, resolveMatchRoute } from "./utils.ts";

type MatchRow = {
  id: string;
  title: string;
  start_points: number;
  oka_points: number;
  uma_low: number;
  uma_high: number;
  created_at?: string;
  updated_at: string;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders,
    ...init,
  });
}

function errorResponse(message: string, status = 422) {
  return jsonResponse({ error: message }, { status });
}

function isInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value);
}

// domain helpers moved to domain.ts

async function getMatchDetail(
  supabase: any,
  matchId: string,
): Promise<Response> {
  const { data: m, error: mErr } = await supabase
    .from("matches")
    .select("id, title, start_points, oka_points, uma_low, uma_high, updated_at")
    .eq("id", matchId)
    .maybeSingle();

  if (mErr) {
    return await logAndRespondError(null, 'GET /matches/:id', `Failed to fetch match: ${mErr.message}`, 500, matchId);
  }
  if (!m) {
    return await logAndRespondError(null, 'GET /matches/:id', 'not found', 404, matchId);
  }

  const matchPk = m.id;

  const { data: partsData, error: pErr } = await supabase
    .from("participants")
    .select("id, name, seat_priority")
    .eq("match_id", matchPk)
    .order("seat_priority", { ascending: true });
  if (pErr) {
    return await logAndRespondError(null, 'GET /matches/:id', `Failed to fetch participants: ${pErr.message}`, 500, matchPk);
  }

  // Fetch games and scores
  const { data: games, error: gErr } = await supabase
    .from("games")
    .select("number, created_at")
    .eq("match_id", matchPk)
    .order("number", { ascending: true });
  if (gErr) {
    return await logAndRespondError(null, 'GET /matches/:id', `Failed to fetch games: ${gErr.message}`, 500, matchPk);
  }
  const { data: scores, error: scErr } = await supabase
    .from("game_scores")
    .select("game_number, seat_index, raw_score")
    .eq("match_id", matchPk)
    .order("game_number", { ascending: true })
    .order("seat_index", { ascending: true });
  if (scErr) {
    return await logAndRespondError(null, 'GET /matches/:id', `Failed to fetch game_scores: ${scErr.message}`, 500, matchPk);
  }

  // Fetch seat mapping (participant per seat per game)
  const { data: seats, error: seatErr } = await supabase
    .from("game_seats")
    .select("game_number, seat_index, participant_id, display_name")
    .eq("match_id", matchPk);
  if (seatErr) {
    return await logAndRespondError(null, 'GET /matches/:id', `Failed to fetch game_seats: ${seatErr.message}`, 500, matchPk);
  }

  const scoresByGame = new Map<number, ScoreInput[]>();
  (scores || []).forEach((r: { game_number: number; seat_index: number; raw_score: number }) => {
    const arr = scoresByGame.get(r.game_number) || [];
    arr.push({ seat_index: r.seat_index, raw_score: r.raw_score });
    scoresByGame.set(r.game_number, arr);
  });

  // Build fast lookup maps
  const seatMap = new Map<string, { participant_id: string | null; display_name: string | null }>();
  (seats || []).forEach((r: { game_number: number; seat_index: number; participant_id: string; display_name?: string }) => {
    seatMap.set(`${r.game_number}:${r.seat_index}`, { participant_id: r.participant_id, display_name: r.display_name ?? null });
  });
  const fallbackPidBySeat = new Map<number, string>();
  (partsData || []).forEach((p: { id: string; seat_priority: number }) => {
    if (!fallbackPidBySeat.has(p.seat_priority)) fallbackPidBySeat.set(p.seat_priority, p.id);
  });

  const gameResults = (games || []).map((g: { number: number; created_at: string }) => {
    const arr = scoresByGame.get(g.number) || [];
    if (arr.length === 4) {
      const results = computeGameResults(arr, m.start_points, m.oka_points, m.uma_low, m.uma_high);
      const enriched = results.map((r) => {
        const key = `${g.number}:${r.seat_index}`;
        const mapVal = seatMap.get(key);
        const participant_id = mapVal?.participant_id ?? fallbackPidBySeat.get(r.seat_index) ?? null;
        const display_name = mapVal?.display_name ?? null;
        return { ...r, participant_id, display_name };
      });
      return { number: g.number, created_at: g.created_at, results: enriched };
    }
    return { number: g.number, created_at: g.created_at, results: [] as (GameResultRow & {participant_id?: string|null; display_name?: string|null})[] };
  });

  // cumulative scores (sum by participant_id if available; fallback to seat_index)
  const totalsByPid = new Map<string, number>();
  gameResults.forEach((gr: any) => {
    (gr.results || []).forEach((r: any) => {
      const pid = r.participant_id as string | undefined;
      if (pid) {
        totalsByPid.set(pid, (totalsByPid.get(pid) || 0) + r.pt_total);
      } else {
        // fallback to seat-based id mapping
        const fb = fallbackPidBySeat.get(r.seat_index);
        if (fb) totalsByPid.set(fb, (totalsByPid.get(fb) || 0) + r.pt_total);
      }
    });
  });


  return jsonResponse({
    id: m.id,
    title: m.title,
    start_points: m.start_points,
    oka_points: m.oka_points,
    uma_low: m.uma_low,
    uma_high: m.uma_high,
    participants: (partsData || []).map((p: any) => ({ id: p.id, name: p.name, seat_priority: p.seat_priority })),
    games: gameResults,
    cumulative_scores: Array.from(totalsByPid.entries()).map(([participant_id, total]) => ({ participant_id, total })),
    updated_at: m.updated_at,
  });
}

async function logAndRespondError(
  _supabase: any,
  scope: string,
  message: string,
  status = 422,
  matchId?: string | number,
  details?: unknown,
) {
  const entry = {
    ts: new Date().toISOString(),
    level: 'error',
    scope,
    status,
    message,
    match_id: matchId != null ? String(matchId) : undefined,
    details,
  };
  try {
    const logFile = Deno.env.get('FUNCTION_LOG_FILE') || 'logs/matches.log';
    const parts = logFile.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/') || '.';
      try { await Deno.mkdir(dir, { recursive: true }); } catch (_) {}
    }
    await Deno.writeTextFile(logFile, JSON.stringify(entry) + "\n", { append: true, create: true });
  } catch (e) {
    console.error('log write failed', e, entry);
  }
  const publicMsg = status >= 500
    ? 'システムエラーが発生しました。時間を置いて再度お試しください。'
    : message;
  return errorResponse(publicMsg, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey) {
    return await logAndRespondError(null, 'bootstrap', 'Server configuration error.', 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const pathname = url.pathname;
  const { matchId: idFromPath, gameNumberSeg } = parseMatchesPath(pathname);
  const routeKind = resolveMatchRoute(req.method, pathname);

  try {
    if (routeKind === "GET_DETAIL" && idFromPath) {
      return await getMatchDetail(supabase, idFromPath);
    }

    if (routeKind === "POST_GAMES" && idFromPath) {
      // Create a game for the match
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Invalid JSON.", 400);
      }
      const scoresInput: ScoreInput[] = Array.isArray(body?.scores) ? body.scores : [];
      const playersInput: any[] = Array.isArray(body?.players) ? body.players : [];
      const vErr = validateScores(scoresInput);
      if (vErr) return await logAndRespondError(null, 'POST /matches/:id/games', vErr, 422, idFromPath, { scores: scoresInput });

      // Ensure match exists and get config
      const { data: m, error: mErr } = await supabase
        .from("matches")
        .select("id, start_points, oka_points, uma_low, uma_high")
        .eq("id", idFromPath)
        .maybeSingle();
      if (mErr) return await logAndRespondError(null, 'POST /matches/:id/games', `Failed to fetch match: ${mErr.message}`, 500, idFromPath);
      if (!m) return await logAndRespondError(null, 'POST /matches/:id/games', 'not found', 404, idFromPath);

      // Resolve participants for players mapping
      const { data: parts, error: pErr } = await supabase
        .from("participants")
        .select("id, name, seat_priority")
        .eq("match_id", idFromPath);
      if (pErr) return await logAndRespondError(null, 'POST /matches/:id/games', `Failed to fetch participants: ${pErr.message}`, 500, idFromPath);
      const byName = new Map<string, string>();
      (parts || []).forEach((p: any) => byName.set((p.name || '').toLowerCase(), p.id));

      // Validate players mapping
      if (!Array.isArray(playersInput) || playersInput.length !== 4) {
        return errorResponse("players must have 4 items", 422);
      }
      const seenSeats = new Set<number>();
      const seenPids = new Set<string>();
      const seatRows: { seat_index: number; participant_id: string; display_name?: string }[] = [];
      for (const pl of playersInput) {
        const seat_index = Number(pl?.seat_index);
        if (!Number.isInteger(seat_index) || seat_index < 0 || seat_index > 3) {
          return errorResponse("players seat_index must be 0..3", 422);
        }
        if (seenSeats.has(seat_index)) return errorResponse("each seat_index must appear once (players)", 422);
        let pid: string | undefined = typeof pl?.participant_id === 'string' ? pl.participant_id : undefined;
        if (!pid && typeof pl?.name === 'string') {
          pid = byName.get(pl.name.toLowerCase());
        }
        if (!pid) return errorResponse("players must include participant_id or resolvable name", 422);
        if (seenPids.has(pid)) return errorResponse("same participant cannot appear twice in one game", 422);
        seenSeats.add(seat_index); seenPids.add(pid);
        seatRows.push({ seat_index, participant_id: pid, display_name: typeof pl?.display_name === 'string' ? pl.display_name : (typeof pl?.name === 'string' ? pl.name : undefined) });
      }

      // Next game number
      const matchPk = m.id;
      const { data: lastGame, error: lErr } = await supabase
        .from("games")
        .select("number")
        .eq("match_id", matchPk)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lErr) return await logAndRespondError(null, 'POST /matches/:id/games', `Failed to read last game number: ${lErr.message}`, 500, matchPk);
      const nextNumber = (lastGame?.number ?? 0) + 1;

      // Insert game and scores
      const { error: gErr } = await supabase.from("games").insert([{ match_id: matchPk, number: nextNumber }]);
      if (gErr) {
        const mapped = mapCreateGameInsertError(gErr);
        if (mapped) return errorResponse(mapped.message, mapped.status);
        return await logAndRespondError(null, 'POST /matches/:id/games', `Failed to create game: ${gErr.message}`, 500, matchPk);
      }

      const rows = scoresInput.map((s) => ({ match_id: matchPk, game_number: nextNumber, seat_index: s.seat_index, raw_score: s.raw_score }));
      const { error: sErr } = await supabase.from("game_scores").insert(rows);
      if (sErr) {
        await cleanupCreateGameFailure(supabase, "insert_scores", matchPk, nextNumber);
        return await logAndRespondError(null, 'POST /matches/:id/games', `Failed to insert scores: ${sErr.message}`, 500, matchPk, { scores: scoresInput, number: nextNumber });
      }

      // Insert seat mapping
      const seatIns = seatRows.map(r => ({ match_id: matchPk, game_number: nextNumber, seat_index: r.seat_index, participant_id: r.participant_id, display_name: r.display_name }));
      const { error: seatInsErr } = await supabase.from("game_seats").insert(seatIns);
      if (seatInsErr) {
        await cleanupCreateGameFailure(supabase, "insert_seats", matchPk, nextNumber);
        return await logAndRespondError(null, 'POST /matches/:id/games', `Failed to insert game_seats: ${seatInsErr.message}`, 500, matchPk, { players: playersInput, number: nextNumber });
      }

      // touch matches.updated_at to bump ordering
      await supabase.from("matches").update({ updated_at: new Date().toISOString() }).eq("id", matchPk);

      // Return detail including the newly registered game
      return await getMatchDetail(supabase, String(matchPk));
    }

    if (routeKind === "PATCH_GAME" && idFromPath && gameNumberSeg) {
      const gameNumber = Number(gameNumberSeg);
      if (!Number.isInteger(gameNumber) || gameNumber <= 0) {
        return errorResponse("game number must be a positive integer", 422);
      }

      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Invalid JSON.", 400);
      }

      const scoresInput: ScoreInput[] = Array.isArray(body?.scores) ? body.scores : [];
      const vErr = validateScores(scoresInput);
      if (vErr) return await logAndRespondError(null, "PATCH /matches/:id/games/:number", vErr, 422, idFromPath, { game_number: gameNumber, scores: scoresInput });

      const { data: m, error: mErr } = await supabase
        .from("matches")
        .select("id")
        .eq("id", idFromPath)
        .maybeSingle();
      if (mErr) return await logAndRespondError(null, "PATCH /matches/:id/games/:number", `Failed to fetch match: ${mErr.message}`, 500, idFromPath);
      if (!m) return await logAndRespondError(null, "PATCH /matches/:id/games/:number", "not found", 404, idFromPath);

      const matchPk = m.id;
      const { data: game, error: gErr } = await supabase
        .from("games")
        .select("number")
        .eq("match_id", matchPk)
        .eq("number", gameNumber)
        .maybeSingle();
      if (gErr) return await logAndRespondError(null, "PATCH /matches/:id/games/:number", `Failed to fetch game: ${gErr.message}`, 500, matchPk, { game_number: gameNumber });
      if (!game) return await logAndRespondError(null, "PATCH /matches/:id/games/:number", "not found", 404, matchPk, { game_number: gameNumber });

      const rows = scoresInput.map((s) => ({
        match_id: matchPk,
        game_number: gameNumber,
        seat_index: s.seat_index,
        raw_score: s.raw_score,
      }));
      const { error: upErr } = await supabase
        .from("game_scores")
        .upsert(rows, { onConflict: "match_id,game_number,seat_index" });
      if (upErr) return await logAndRespondError(null, "PATCH /matches/:id/games/:number", `Failed to update scores: ${upErr.message}`, 500, matchPk, { game_number: gameNumber, scores: scoresInput });

      await supabase.from("matches").update({ updated_at: new Date().toISOString() }).eq("id", matchPk);
      return await getMatchDetail(supabase, String(matchPk));
    }

    if (routeKind === "GET_LIST") {
      const { data: matches, error } = await supabase
        .from("matches")
        .select("id, title, start_points, oka_points, uma_low, uma_high, updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        return await logAndRespondError(null, 'GET /matches', `Failed to fetch matches: ${error.message}`, 500);
      }

      if (!matches || matches.length === 0) {
        return jsonResponse([]);
      }

      const ids = matches.map((m: MatchRow) => m.id);
      const { data: parts, error: pErr } = await supabase
        .from("participants")
        .select("id, match_id, name, seat_priority")
        .in("match_id", ids);

      if (pErr) {
        return await logAndRespondError(null, 'GET /matches', `Failed to fetch participants: ${pErr.message}`, 500);
      }

      const byMatch = new Map<string, { name: string; seat_priority: number }[]>();
      (parts || []).forEach((p: { match_id: string; name: string; seat_priority: number }) => {
        const arr = byMatch.get(p.match_id) || [];
        arr.push({ name: p.name, seat_priority: p.seat_priority });
        byMatch.set(p.match_id, arr);
      });

      // Fetch game counts per match
      const { data: games, error: gErr } = await supabase
        .from("games")
        .select("match_id").in("match_id", ids);
      if (gErr) {
        return await logAndRespondError(null, 'GET /matches', `Failed to fetch games: ${gErr.message}`, 500);
      }
      const countByMatch = new Map<string, number>();
      (games || []).forEach((g: { match_id: string }) => {
        countByMatch.set(g.match_id, (countByMatch.get(g.match_id) || 0) + 1);
      });

      const result = (matches as MatchRow[]).map((m) => {
        const names = (byMatch.get(m.id) || [])
          .sort((a, b) => a.seat_priority - b.seat_priority)
          .map((x) => x.name);
        return {
          id: m.id,
          title: m.title,
          start_points: m.start_points,
          oka_points: m.oka_points,
          uma_low: m.uma_low,
          uma_high: m.uma_high,
          participants: names,
          game_count: countByMatch.get(m.id) || 0,
          updated_at: m.updated_at,
        };
      });

      return jsonResponse(result);
    }

    if (routeKind === "POST_MATCH") {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return errorResponse("Invalid JSON.", 400);
      }

      const titleRaw = typeof body.title === "string" ? body.title : undefined;
      const title = (titleRaw?.trim() || "eguchiman").slice(0, 100);

      const start_points = 25000; // default per spec
      const oka_points = Number(body.oka_points);
      const uma_low = Number(body.uma_low);
      const uma_high = Number(body.uma_high);
      const participantsInput = Array.isArray(body.participants) ? body.participants : [];

      // Validate participants: exactly 4, non-empty, unique
      const names = participantsInput.map((n: any) => (typeof n === "string" ? n.trim() : "")).filter((n: any) => n.length > 0);
      if (participantsInput.length !== 4) {
        return errorResponse("参加者は4人必要です (participants must have exactly 4 names)");
      }
      if (names.length !== 4) {
        return errorResponse("名前は空欄不可です (participant names must be non-empty)");
      }
      const uniqueNames = new Set(names.map((n: any) => n.toLowerCase()));
      if (uniqueNames.size !== 4) {
        return errorResponse("名前は重複不可です (participant names must be unique)");
      }

      // Validate integers and uma domain rules
      if (!isInteger(oka_points) || !isInteger(uma_low) || !isInteger(uma_high)) {
        return errorResponse("oka_points / uma_low / uma_high は整数で入力してください");
      }
      if (uma_low <= 0 || uma_high <= 0) {
        return errorResponse("ウマは自然数で入力してください（例: low=5, high=10）");
      }
      if (uma_high < uma_low) {
        return errorResponse("ウマは high >= low となるように入力してください");
      }

      // Insert match (try without id first; if NOT NULL error, retry with generated id)
      let match: any = null;
      let mErr: any = null;
      {
        const res = await supabase
          .from("matches")
          .insert([{ title, start_points, oka_points, uma_low, uma_high }])
          .select("id, title, start_points, oka_points, uma_low, uma_high, updated_at")
          .single();
        match = res.data;
        mErr = res.error;
      }
      if (mErr) {
        const needId = mErr.code === '23502' || /null value.*column\s+"?id"?/i.test(mErr.message || '');
        if (needId) {
          const generatedId = crypto.randomUUID();
          const res2 = await supabase
            .from("matches")
            .insert([{ id: generatedId, title, start_points, oka_points, uma_low, uma_high }])
            .select("id, title, start_points, oka_points, uma_low, uma_high, updated_at")
            .single();
          match = res2.data;
          mErr = res2.error;
        }
      }
      if (mErr || !match) {
        return await logAndRespondError(null, 'POST /matches', `対局の作成に失敗しました: ${mErr?.message || 'unknown error'}`, 500);
      }

      // Insert participants with seat_priority
      // Try without id first (works for bigint/bigserial or uuid default). If NOT NULL on id w/o default, retry with generated uuid text id.
      const rowsNoId = names.map((name: any, idx: any) => ({ match_id: match.id, name, seat_priority: idx }));
      let pErr: any = null;
      {
        const res = await supabase.from("participants").insert(rowsNoId);
        pErr = res.error;
      }
      if (pErr) {
        const needId = pErr.code === '23502' || /null value.*column\s+"?id"?/i.test(pErr.message || '');
        if (needId) {
          const rowsWithId = names.map((name: any, idx: any) => ({ id: crypto.randomUUID(), match_id: match.id, name, seat_priority: idx }));
          const res2 = await supabase.from("participants").insert(rowsWithId);
          pErr = res2.error;
        }
      }
      if (pErr) {
        // Best-effort cleanup to avoid orphaned match
        await supabase.from("matches").delete().eq("id", match.id);
        return await logAndRespondError(null, 'POST /matches', `参加者の作成に失敗しました: ${pErr.message}`, 500, match.id);
      }

      return jsonResponse({
        id: match.id,
        title: match.title,
        start_points: match.start_points,
        oka_points: match.oka_points,
        uma_low: match.uma_low,
        uma_high: match.uma_high,
        participants: names,
        game_count: 0,
        updated_at: match.updated_at,
      }, { status: 201 });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (e) {
    const msg = `Unexpected error: ${e instanceof Error ? e.message : String(e)}`;
    return await logAndRespondError(null, 'matches function', msg, 500);
  }
});
