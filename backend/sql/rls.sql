-- database/rls.sql

-- Parent table
alter table tailor_resume_executions enable row level security;

drop policy if exists "Users can view their own executions" on tailor_resume_executions;
create policy "Users can view their own executions"
on tailor_resume_executions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own executions" on tailor_resume_executions;
create policy "Users can create their own executions"
on tailor_resume_executions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own executions" on tailor_resume_executions;
create policy "Users can update their own executions"
on tailor_resume_executions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own executions" on tailor_resume_executions;
create policy "Users can delete their own executions"
on tailor_resume_executions
for delete
using (auth.uid() = user_id);


-- Direct children of executions
alter table analysis_results enable row level security;
alter table synthesis_results enable row level security;

drop policy if exists "Users can view analysis results for their executions" on analysis_results;
create policy "Users can view analysis results for their executions"
on analysis_results
for select
using (
  exists (
    select 1
    from tailor_resume_executions tre
    where tre.id = analysis_results.tailor_resume_execution_id
      and tre.user_id = auth.uid()
  )
);

drop policy if exists "Users can view synthesis results for their executions" on synthesis_results;
create policy "Users can view synthesis results for their executions"
on synthesis_results
for select
using (
  exists (
    select 1
    from tailor_resume_executions tre
    where tre.id = synthesis_results.tailor_resume_execution_id
      and tre.user_id = auth.uid()
  )
);


-- Analysis children
alter table missing_keywords enable row level security;
alter table bullet_suggestions enable row level security;
alter table analysis_brush_up_topics enable row level security;

drop policy if exists "Users can view missing keywords for their analyses" on missing_keywords;
create policy "Users can view missing keywords for their analyses"
on missing_keywords
for select
using (
  exists (
    select 1
    from analysis_results ar
    join tailor_resume_executions tre
      on tre.id = ar.tailor_resume_execution_id
    where ar.id = missing_keywords.analysis_result_id
      and tre.user_id = auth.uid()
  )
);

drop policy if exists "Users can view bullet suggestions for their analyses" on bullet_suggestions;
create policy "Users can view bullet suggestions for their analyses"
on bullet_suggestions
for select
using (
  exists (
    select 1
    from analysis_results ar
    join tailor_resume_executions tre
      on tre.id = ar.tailor_resume_execution_id
    where ar.id = bullet_suggestions.analysis_result_id
      and tre.user_id = auth.uid()
  )
);

drop policy if exists "Users can view analysis brush ups for their analyses" on analysis_brush_up_topics;
create policy "Users can view analysis brush ups for their analyses"
on analysis_brush_up_topics
for select
using (
  exists (
    select 1
    from analysis_results ar
    join tailor_resume_executions tre
      on tre.id = ar.tailor_resume_execution_id
    where ar.id = analysis_brush_up_topics.analysis_result_id
      and tre.user_id = auth.uid()
  )
);


-- Synthesis children
alter table synthesis_brush_up_topics enable row level security;
alter table notable_model_differences enable row level security;
alter table recommended_next_steps enable row level security;

drop policy if exists "Users can view synthesis brush ups for their syntheses" on synthesis_brush_up_topics;
create policy "Users can view synthesis brush ups for their syntheses"
on synthesis_brush_up_topics
for select
using (
  exists (
    select 1
    from synthesis_results sr
    join tailor_resume_executions tre
      on tre.id = sr.tailor_resume_execution_id
    where sr.id = synthesis_brush_up_topics.synthesis_result_id
      and tre.user_id = auth.uid()
  )
);

drop policy if exists "Users can view notable differences for their syntheses" on notable_model_differences;
create policy "Users can view notable differences for their syntheses"
on notable_model_differences
for select
using (
  exists (
    select 1
    from synthesis_results sr
    join tailor_resume_executions tre
      on tre.id = sr.tailor_resume_execution_id
    where sr.id = notable_model_differences.synthesis_result_id
      and tre.user_id = auth.uid()
  )
);

drop policy if exists "Users can view recommended next steps for their syntheses" on recommended_next_steps;
create policy "Users can view recommended next steps for their syntheses"
on recommended_next_steps
for select
using (
  exists (
    select 1
    from synthesis_results sr
    join tailor_resume_executions tre
      on tre.id = sr.tailor_resume_execution_id
    where sr.id = recommended_next_steps.synthesis_result_id
      and tre.user_id = auth.uid()
  )
);


-- Shared lookup tables
alter table canonical_brush_up_topics enable row level security;
alter table brush_up_topic_aliases enable row level security;
alter table ai_providers enable row level security;
alter table ai_models enable row level security;

drop policy if exists "Authenticated users can view canonical brush up topics" on canonical_brush_up_topics;
create policy "Authenticated users can view canonical brush up topics"
on canonical_brush_up_topics
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can view brush up topic aliases" on brush_up_topic_aliases;
create policy "Authenticated users can view brush up topic aliases"
on brush_up_topic_aliases
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can view ai providers" on ai_providers;
create policy "Authenticated users can view ai providers"
on ai_providers
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can view ai models" on ai_models;
create policy "Authenticated users can view ai models"
on ai_models
for select
to authenticated
using (true);