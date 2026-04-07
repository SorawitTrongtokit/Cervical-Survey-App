alter table public.volunteers enable row level security;
alter table public.citizens enable row level security;
alter table public.survey_intents enable row level security;

drop policy if exists "Volunteers are readable internally" on public.volunteers;
create policy "Volunteers are readable internally"
  on public.volunteers
  for select
  to authenticated
  using (true);

drop policy if exists "Volunteers can be updated internally" on public.volunteers;
create policy "Volunteers can be updated internally"
  on public.volunteers
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Citizens are readable internally" on public.citizens;
create policy "Citizens are readable internally"
  on public.citizens
  for select
  to authenticated
  using (true);

drop policy if exists "Citizens can be updated internally" on public.citizens;
create policy "Citizens can be updated internally"
  on public.citizens
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Survey intents are readable internally" on public.survey_intents;
create policy "Survey intents are readable internally"
  on public.survey_intents
  for select
  to authenticated
  using (true);

drop policy if exists "Survey intents can be inserted internally" on public.survey_intents;
create policy "Survey intents can be inserted internally"
  on public.survey_intents
  for insert
  to authenticated
  with check (true);

drop policy if exists "Survey intents can be updated internally" on public.survey_intents;
create policy "Survey intents can be updated internally"
  on public.survey_intents
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Survey intents can be deleted internally" on public.survey_intents;
create policy "Survey intents can be deleted internally"
  on public.survey_intents
  for delete
  to authenticated
  using (true);
