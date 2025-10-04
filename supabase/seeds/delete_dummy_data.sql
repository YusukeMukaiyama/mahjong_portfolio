-- Delete only demo seed data inserted by seeds/matches_seed.sql
-- Safe: relies on ON DELETE CASCADE to cleanup participants/games/game_scores
-- Run with: supabase db seed -f supabase/seeds/delete_dummy_data.sql

begin;

-- Known demo match titles from seeds/matches_seed.sql
with demo as (
  select unnest(array[
    'Pro League 2024 Rd.1',
    'Tokyo Night League #3',
    'Classic Cup Vol.7',
    'Weekend Open Finals',
    'Spring Series 2',
    'City Masters 2024',
    'Autumn Cup Group A',
    'Rookies Clash R1'
  ]) as title
)
delete from public.matches m
using demo d
where m.title = d.title;

commit;

-- Note:
-- If you want to wipe ALL match data (including non-demo), you can use:
--   truncate table public.game_scores restart identity cascade;
--   truncate table public.games restart identity cascade;
--   truncate table public.participants restart identity cascade;
--   truncate table public.matches restart identity cascade;
-- But the above is destructive. Keep it commented out unless intended.

