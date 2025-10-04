// supabase/functions/calc/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { a, b } = await req.json();
  const result = a + b; // ← とりあえず足し算

  const { error } = await supabase.from("calc_results").insert([{ a, b, result }]);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ a, b, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
