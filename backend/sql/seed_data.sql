insert into ai_providers (provider_name)
values
  ('openai'),
  ('claude'),
  ('gemini')
on conflict (provider_name) do nothing;

insert into ai_models (ai_provider_id, model_name)
select id, 'gpt-4.1-mini'
from ai_providers
where provider_name = 'openai'
on conflict do nothing;

insert into ai_models (ai_provider_id, model_name)
select id, 'claude-haiku-4-5-20251001'
from ai_providers
where provider_name = 'claude'
on conflict do nothing;

insert into ai_models (ai_provider_id, model_name)
select id, 'gemini-3.5-flash'
from ai_providers
where provider_name = 'gemini'
on conflict do nothing;