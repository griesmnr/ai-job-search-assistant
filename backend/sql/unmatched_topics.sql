with unmatched_topics as (
  select
    'analysis' as source,
    abt.topic,
    abt.priority,
    abt.why_it_matters,
    ar.tailor_resume_execution_id
  from analysis_brush_up_topics abt
  join analysis_results ar
    on ar.id = abt.analysis_result_id
  where abt.canonical_brush_up_topic_id is null
    and abt.topic is not null
    and trim(abt.topic) <> ''

  union all

  select
    'synthesis' as source,
    sbt.topic,
    sbt.priority,
    sbt.why_it_matters,
    sr.tailor_resume_execution_id
  from synthesis_brush_up_topics sbt
  join synthesis_results sr
    on sr.id = sbt.synthesis_result_id
  where sbt.canonical_brush_up_topic_id is null
    and sbt.topic is not null
    and trim(sbt.topic) <> ''
)

select
  lower(trim(topic)) as normalized_topic,
  count(*) as occurrence_count,
  count(distinct tailor_resume_execution_id) as execution_count,
  min(priority) as best_priority,
  array_agg(distinct source order by source) as sources,
  array_agg(distinct topic order by topic) as original_variants,
  array_agg(distinct why_it_matters)
    filter (where why_it_matters is not null) as reasons
from unmatched_topics
group by lower(trim(topic))
order by
  execution_count desc,
  occurrence_count desc,
  best_priority asc,
  normalized_topic;