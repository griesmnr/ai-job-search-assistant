create table ai_providers (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null unique
);

create table ai_models (
  id uuid primary key default gen_random_uuid(),
  ai_provider_id uuid not null references ai_providers(id),
  model_name text not null,
  unique (ai_provider_id, model_name)
);

create table tailor_resume_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_description text not null,
  user_resume text not null,
  company_name text not null,
  job_title text not null,
  is_active boolean not null default true,
  final_chosen_resume text,
  created_at timestamptz not null default now()
);

create table analysis_results (
  id uuid primary key default gen_random_uuid(),
  tailor_resume_execution_id uuid not null references tailor_resume_executions(id) on delete cascade,
  ai_model_id uuid not null references ai_models(id),
  success boolean not null default true,
  error_message text,
  match_score int,
  match_score_explanation text,
  raw_response_json jsonb,
  created_at timestamptz not null default now()
);

create table missing_keywords (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null references analysis_results(id) on delete cascade,
  priority int,
  keyword text not null,
  why_it_matters text
);

create table bullet_suggestions (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null references analysis_results(id) on delete cascade,
  suggestion text not null
);

create table canonical_brush_up_topics (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  display_name text not null,
  category text
);

create table analysis_brush_up_topics (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null references analysis_results(id) on delete cascade,
  canonical_brush_up_topic_id uuid references canonical_brush_up_topics(id),
  priority int,
  topic text not null,
  why_it_matters text
);

create table synthesis_results (
  id uuid primary key default gen_random_uuid(),
  tailor_resume_execution_id uuid not null references tailor_resume_executions(id) on delete cascade,
  ai_model_id uuid not null references ai_models(id),
  overall_summary text,
  average_original_match_score int,
  estimated_new_match_score int,
  estimated_new_match_score_explanation text,
  new_proposed_resume text,
  cover_letter text,
  raw_response_json jsonb,
  created_at timestamptz not null default now()
);

create table notable_model_differences (
  id uuid primary key default gen_random_uuid(),
  synthesis_result_id uuid not null references synthesis_results(id) on delete cascade,
  topic text not null,
  difference text
);

create table recommended_next_steps (
  id uuid primary key default gen_random_uuid(),
  synthesis_result_id uuid not null references synthesis_results(id) on delete cascade,
  priority int,
  action text not null
);

create table synthesis_brush_up_topics (
  id uuid primary key default gen_random_uuid(),
  synthesis_result_id uuid not null references synthesis_results(id) on delete cascade,
  canonical_brush_up_topic_id uuid references canonical_brush_up_topics(id),
  topic text not null,
  priority int,
  why_it_matters text
);


create table brush_up_topic_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_brush_up_topic_id uuid not null references canonical_brush_up_topics(id) on delete cascade,
  alias text not null unique
);