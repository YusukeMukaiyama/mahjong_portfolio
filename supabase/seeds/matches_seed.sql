-- Seed match data (fresh load; no schema changes)
-- This wipes ALL existing match-related data and inserts demo data.

begin;

-- Reset all match-related data (order doesn't matter with CASCADE)
truncate table public.game_scores restart identity cascade;
truncate table public.games restart identity cascade;
truncate table public.participants restart identity cascade;
truncate table public.matches restart identity cascade;
truncate table public.game_seats restart identity cascade;

-- Helper note:
-- For each match below we generate N games (3..15) and cycle deterministic
-- score patterns per game, while rotating who gets which score.
-- Patterns (sum to 100000):
-- P0 [40000,30000,20000,10000]
-- P1 [30000,30000,20000,20000]
-- P2 [35000,30000,25000,10000]
-- P3 [42000,25000,20000,13000]
-- P4 [50000,25000,15000,10000]
-- P5 [25000,25000,25000,25000]

-- =========================
-- Match 1
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Pro League 2024 Rd.1', 25000, 30000, 10, 20)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Eguchi', 0),
  ('Sato',   1),
  ('Suzuki', 2),
  ('Tanaka', 3)
) as v(name, seat) on true;

-- Games (7)
with m as (select id from public.matches where title = 'Pro League 2024 Rd.1'),
g as (select generate_series(1,7) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

-- Seat mapping (fixed by participants.seat_priority for seed)
with m as (select id from public.matches where title = 'Pro League 2024 Rd.1')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Pro League 2024 Rd.1'),
g as (select generate_series(1,7) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 2
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Tokyo Night League #3', 25000, 25000, 5, 10)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Aki',   0),
  ('Beni',  1),
  ('Chika', 2),
  ('Dai',   3)
) as v(name, seat) on true;

-- Games (5)
with m as (select id from public.matches where title = 'Tokyo Night League #3'),
g as (select generate_series(1,5) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'Tokyo Night League #3')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Tokyo Night League #3'),
g as (select generate_series(1,5) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 3
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Classic Cup Vol.7', 25000, 33000, 15, 25)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Kato',  0),
  ('Ito',   1),
  ('Mori',  2),
  ('Ueda',  3)
) as v(name, seat) on true;

-- Games (9)
with m as (select id from public.matches where title = 'Classic Cup Vol.7'),
g as (select generate_series(1,9) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'Classic Cup Vol.7')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Classic Cup Vol.7'),
g as (select generate_series(1,9) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 4
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Weekend Open Finals', 20000, 30000, 10, 20)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Hayashi',   0),
  ('Kobayashi', 1),
  ('Yamada',    2),
  ('Nakamura',  3)
) as v(name, seat) on true;

-- Games (12)
with m as (select id from public.matches where title = 'Weekend Open Finals'),
g as (select generate_series(1,12) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'Weekend Open Finals')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Weekend Open Finals'),
g as (select generate_series(1,12) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 5
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Spring Series 2', 25000, 40000, 20, 40)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Okada',    0),
  ('Fujita',   1),
  ('Takahashi',2),
  ('Watanabe', 3)
) as v(name, seat) on true;

-- Games (6)
with m as (select id from public.matches where title = 'Spring Series 2'),
g as (select generate_series(1,6) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'Spring Series 2')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Spring Series 2'),
g as (select generate_series(1,6) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 6
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('City Masters 2024', 25000, 30000, 7, 13)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Ishii',  0),
  ('Kondo',  1),
  ('Maeda',  2),
  ('Saito',  3)
) as v(name, seat) on true;

-- Games (15)
with m as (select id from public.matches where title = 'City Masters 2024'),
g as (select generate_series(1,15) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'City Masters 2024')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'City Masters 2024'),
g as (select generate_series(1,15) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 7
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Autumn Cup Group A', 25000, 30000, 10, 30)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Yamamoto',  0),
  ('Shimizu',   1),
  ('Inoue',     2),
  ('Matsumoto', 3)
) as v(name, seat) on true;

-- Games (4)
with m as (select id from public.matches where title = 'Autumn Cup Group A'),
g as (select generate_series(1,4) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'Autumn Cup Group A')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Autumn Cup Group A'),
g as (select generate_series(1,4) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

-- =========================
-- Match 8
with m as (
  insert into public.matches (title, start_points, oka_points, uma_low, uma_high)
  values ('Rookies Clash R1', 25000, 30000, 5, 15)
  returning id
)
insert into public.participants (match_id, name, seat_priority)
select m.id, v.name, v.seat
from m
join (values
  ('Miura',     0),
  ('Endo',      1),
  ('Hasegawa',  2),
  ('Ogawa',     3)
) as v(name, seat) on true;

-- Games (3)
with m as (select id from public.matches where title = 'Rookies Clash R1'),
g as (select generate_series(1,3) as number)
insert into public.games(match_id, number)
select m.id, g.number from m cross join g;

with m as (select id from public.matches where title = 'Rookies Clash R1')
insert into public.game_seats(match_id, game_number, seat_index, participant_id)
select g.match_id, g.number, p.seat_priority, p.id
from public.games g
join m on g.match_id = m.id
join public.participants p on p.match_id = g.match_id;

with m as (select id from public.matches where title = 'Rookies Clash R1'),
g as (select generate_series(1,3) as number),
s as (select 0 as seat_index union all select 1 union all select 2 union all select 3)
insert into public.game_scores(match_id, game_number, seat_index, raw_score)
select m.id, g.number, s.seat_index,
case (g.number % 6)
  when 0 then (ARRAY[40000,30000,20000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 1 then (ARRAY[30000,30000,20000,20000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 2 then (ARRAY[35000,30000,25000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 3 then (ARRAY[42000,25000,20000,13000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  when 4 then (ARRAY[50000,25000,15000,10000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
  else       (ARRAY[25000,25000,25000,25000])[ ((s.seat_index + ((g.number-1) % 4)) % 4) + 1 ]
end
from m cross join g cross join s;

commit;
