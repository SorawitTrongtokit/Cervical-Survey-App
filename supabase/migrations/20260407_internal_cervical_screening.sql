create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  village_code text not null check (village_code ~ '^\d{2}$'),
  full_name text not null,
  volunteer_citizen_id text not null unique,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists volunteers_village_code_full_name_idx
  on public.volunteers (village_code, full_name);

create table if not exists public.citizens (
  id uuid primary key default gen_random_uuid(),
  source_row integer not null,
  sequence_no integer,
  village_code text not null check (village_code ~ '^\d{2}$'),
  house_no text,
  prefix text,
  first_name text not null,
  last_name text not null,
  gender text,
  birth_date date,
  age_years integer,
  national_id text not null unique,
  screening_status_raw text not null,
  screening_state text not null check (screening_state in ('pending', 'completed')),
  assigned_volunteer_id uuid references public.volunteers(id) on delete set null,
  source_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists citizens_village_code_idx
  on public.citizens (village_code);

create index if not exists citizens_assigned_volunteer_id_idx
  on public.citizens (assigned_volunteer_id);

create index if not exists citizens_screening_state_idx
  on public.citizens (screening_state);

create table if not exists public.survey_intents (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null unique references public.citizens(id) on delete cascade,
  volunteer_id uuid not null references public.volunteers(id) on delete restrict,
  contact_phone text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists survey_intents_volunteer_id_idx
  on public.survey_intents (volunteer_id);

drop trigger if exists volunteers_set_updated_at on public.volunteers;
create trigger volunteers_set_updated_at
before update on public.volunteers
for each row
execute function public.set_updated_at();

drop trigger if exists citizens_set_updated_at on public.citizens;
create trigger citizens_set_updated_at
before update on public.citizens
for each row
execute function public.set_updated_at();

drop trigger if exists survey_intents_set_updated_at on public.survey_intents;
create trigger survey_intents_set_updated_at
before update on public.survey_intents
for each row
execute function public.set_updated_at();

alter table public.volunteers enable row level security;
alter table public.citizens enable row level security;
alter table public.survey_intents enable row level security;

drop policy if exists "Volunteers are readable internally" on public.volunteers;
create policy "Volunteers are readable internally"
  on public.volunteers
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Citizens are readable internally" on public.citizens;
create policy "Citizens are readable internally"
  on public.citizens
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Survey intents are readable internally" on public.survey_intents;
create policy "Survey intents are readable internally"
  on public.survey_intents
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Survey intents can be inserted internally" on public.survey_intents;
create policy "Survey intents can be inserted internally"
  on public.survey_intents
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Survey intents can be updated internally" on public.survey_intents;
create policy "Survey intents can be updated internally"
  on public.survey_intents
  for update
  to anon, authenticated
  using (true)
  with check (true);
