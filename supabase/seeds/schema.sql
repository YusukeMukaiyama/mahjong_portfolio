-- Schema aligned with provided TBL definitions

-- Matches
create table if not exists public.matches (
  id text primary key,
  title text not null default 'eguchiman',
  start_points integer not null default 25000,
  oka_points integer not null,
  uma_low integer not null,
  uma_high integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Participants
create table if not exists public.participants (
  id text primary key,
  match_id text not null references public.matches(id) on delete cascade,
  name text not null,
  seat_priority smallint not null check (seat_priority between 0 and 3),
  unique (match_id, name),
  unique (match_id, seat_priority)
);

-- Games
create table if not exists public.games (
  match_id text not null references public.matches(id) on delete cascade,
  number integer not null,
  created_at timestamptz not null default now(),
  primary key (match_id, number)
);

-- Game Scores
create table if not exists public.game_scores (
  match_id text not null references public.matches(id) on delete cascade,
  game_number integer not null,
  seat_index smallint not null check (seat_index between 0 and 3),
  raw_score integer not null check (raw_score % 100 = 0),
  primary key (match_id, game_number, seat_index)
);

-- (local file logging is used instead of DB error_logs)
