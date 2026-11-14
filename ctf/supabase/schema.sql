-- Red vs Blue CTF – Supabase adatbázis
-- Futtatás: Supabase projekt → SQL Editor → ennek a fájlnak a teljes tartalma.
-- Beállítás: Authentication → Providers → Email: "Confirm email" KIKAPCSOLVA
-- (a játékosok felhasználónévvel lépnek be; a háttérben egy kitalált e-mail-címet kapnak).

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9._-]{3,24}$'),
  role text not null default 'player' check (role in ('player', 'instructor')),
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  side text not null default 'blue' check (side in ('blue', 'red')),  -- blue=incidenskezelés, red=behatolásteszt
  mode text not null check (mode in ('easy', 'hard')),
  state jsonb not null,
  score integer not null default 0,
  layer integer not null default 1,
  closed boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  game_id uuid references public.games on delete cascade,
  type text not null,
  data jsonb not null default '{}',
  at timestamptz not null default now()
);

-- Profil automatikusan, regisztrációkor. A szerepkör MINDIG 'player';
-- oktatói jogot csak az adatbázis gazdája adhat (lásd lent).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_instructor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'instructor');
$$;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.events enable row level security;

-- A profilt mindenki csak olvashatja (a saját szerepkörét sem írhatja át).
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_instructor());

drop policy if exists games_read on public.games;
create policy games_read on public.games for select to authenticated
  using (user_id = auth.uid() or public.is_instructor());
drop policy if exists games_insert on public.games;
create policy games_insert on public.games for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists games_update on public.games;
create policy games_update on public.games for update to authenticated
  using (user_id = auth.uid() and not closed) with check (user_id = auth.uid());

-- Játszmák törlése: csak oktató (az eseménynapló a játszmával együtt törlődik).
drop policy if exists games_delete on public.games;
create policy games_delete on public.games for delete to authenticated
  using (public.is_instructor());

drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated
  using (user_id = auth.uid() or public.is_instructor());
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (user_id = auth.uid());

-- Ranglista: mindenki látja, de csak ezeket az oszlopokat.
create or replace view public.leaderboard as
  select p.username, g.side, g.mode, g.score, g.layer, g.closed, g.updated_at
  from public.games g join public.profiles p on p.id = g.user_id;
grant select on public.leaderboard to authenticated;
-- A nézet a tulajdonos jogaival fut, ezért a be nem jelentkezett (anon) látogatótól el kell venni.
revoke all on public.leaderboard from anon, public;

-- Oktatói jog megadása (csak itt, az SQL Editorban):
-- update public.profiles set role = 'instructor' where username = 'oktato';

-- ---------------------------------------------------------------------------
-- Biztonsági megerősítés (2026-11, SECURITY_CHECKLIST.md). Újrafuttatható.
-- A pontszámot a böngésző számolja, ezért a szerver legalább a lehetetlen értékeket elutasítja.
-- ---------------------------------------------------------------------------

-- A be nem jelentkezett (anon) szerepkör semmit se érjen el közvetlenül a táblákból.
revoke all on public.profiles, public.games, public.events from anon;

-- Játszmák: elérhető maximum (könnyű 2800, nehéz 4208 pont), réteg 1–7, állapot legfeljebb 64 KB.
-- Frissítéskor a tulajdonos, oldal, mód és kezdési idő nem változhat, a pontszám nem csökkenhet.
create or replace function public.games_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.score < 0 or new.score > (case new.mode when 'hard' then 4208 else 2800 end) then
    raise exception 'invalid score';
  end if;
  if new.layer < 1 or new.layer > 7 then raise exception 'invalid layer'; end if;
  if pg_column_size(new.state) > 65536 then raise exception 'state too large'; end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.side <> old.side or new.mode <> old.mode
       or new.started_at <> old.started_at then
      raise exception 'immutable column changed';
    end if;
    if new.score < old.score then raise exception 'score cannot decrease'; end if;
  end if;
  return new;
end $$;
drop trigger if exists games_guard on public.games;
create trigger games_guard before insert or update on public.games
  for each row execute function public.games_guard();

-- Eseménynapló: csak ismert típus, legfeljebb 2 KB adat, és csak a saját játszmához.
create or replace function public.events_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.type not in ('start', 'open_layer', 'view_file', 'download', 'submit', 'hint', 'unlock', 'finish', 'close') then
    raise exception 'invalid event type';
  end if;
  if pg_column_size(new.data) > 2048 then raise exception 'event data too large'; end if;
  new.at := now();  -- az időbélyeget a szerver adja
  return new;
end $$;
drop trigger if exists events_guard on public.events;
create trigger events_guard before insert on public.events
  for each row execute function public.events_guard();

drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (user_id = auth.uid() and (game_id is null or exists (
    select 1 from public.games g where g.id = game_id and g.user_id = auth.uid())));
