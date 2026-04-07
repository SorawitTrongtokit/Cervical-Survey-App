alter table public.survey_intents
  add column if not exists intent_choice text;

alter table public.survey_intents
  drop constraint if exists survey_intents_intent_choice_check;

alter table public.survey_intents
  add constraint survey_intents_intent_choice_check
  check (
    intent_choice is null
    or intent_choice in (
      'home_self_screening',
      'clinic_self_screening',
      'declined_screening'
    )
  );
