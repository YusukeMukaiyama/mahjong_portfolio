export type CreateGameFailureStage = "insert_scores" | "insert_seats";

export async function cleanupCreateGameFailure(
  supabase: any,
  stage: CreateGameFailureStage,
  matchId: string | number,
  gameNumber: number,
) {
  if (stage === "insert_scores") {
    await supabase.from("games").delete().eq("match_id", matchId).eq("number", gameNumber);
    return;
  }

  await supabase.from("game_scores").delete().eq("match_id", matchId).eq("game_number", gameNumber);
  await supabase.from("games").delete().eq("match_id", matchId).eq("number", gameNumber);
}
