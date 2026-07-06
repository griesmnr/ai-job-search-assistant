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

-- seed_brush_up_topics.sql

begin;

insert into canonical_brush_up_topics (canonical_key, display_name, category)
values
  ('aws', 'AWS', 'cloud'),
  ('azure', 'Azure', 'cloud'),
  ('gcp', 'GCP', 'cloud'),

  ('docker', 'Docker', 'devops'),
  ('kubernetes', 'Kubernetes', 'devops'),
  ('terraform', 'Terraform', 'devops'),
  ('ci/cd', 'CI/CD', 'devops'),

  ('java', 'Java', 'language'),
  ('javascript', 'JavaScript', 'language'),
  ('typescript', 'TypeScript', 'language'),
  ('python', 'Python', 'language'),
  ('go', 'Go', 'language'),
  ('c++', 'C++', 'language'),

  ('react', 'React', 'frontend'),
  ('angular', 'Angular', 'frontend'),

  ('node.js', 'Node.js', 'backend'),
  ('spring boot', 'Spring Boot', 'backend'),
  ('fastapi', 'FastAPI', 'backend'),
  ('rest api', 'REST API', 'backend'),
  ('graphql', 'GraphQL', 'backend'),

  ('sql', 'SQL', 'database'),
  ('postgresql', 'PostgreSQL', 'database'),
  ('sql server', 'SQL Server', 'database'),
  ('mysql', 'MySQL', 'database'),
  ('mongodb', 'MongoDB', 'database'),

  ('system design', 'System Design', 'architecture'),
  ('distributed systems', 'Distributed Systems', 'architecture'),
  ('microservices', 'Microservices', 'architecture'),
  ('scalability', 'Scalability', 'architecture'),
  ('design patterns', 'Design Patterns', 'architecture'),
  ('object-oriented design', 'Object-Oriented Design', 'architecture'),
  ('concurrency', 'Concurrency', 'architecture'),

  ('unit testing', 'Unit Testing', 'testing'),
  ('integration testing', 'Integration Testing', 'testing'),
  ('test automation', 'Test Automation', 'testing'),
  ('load testing', 'Load Testing', 'testing'),
  ('performance testing', 'Performance Testing', 'testing'),

  ('agile', 'Agile', 'process'),
  ('scrum', 'Scrum', 'process'),
  ('code review', 'Code Review', 'process'),

  ('llms', 'LLMs', 'ai'),
  ('prompt engineering', 'Prompt Engineering', 'ai'),
  ('rag', 'RAG', 'ai'),
  ('agentic workflows', 'Agentic Workflows', 'ai'),
  ('ai agents', 'AI Agents', 'ai'),

  ('oauth', 'OAuth', 'security'),
  ('authentication', 'Authentication', 'security'),
  ('authorization', 'Authorization', 'security')
on conflict (canonical_key) do nothing;

insert into brush_up_topic_aliases (canonical_brush_up_topic_id, alias)
select c.id, a.alias
from (
  values
    ('aws', 'amazon web services'),
    ('aws', 'aws services'),
    ('aws', 'aws cloud'),
    ('aws', 'aws platform'),

    ('azure', 'microsoft azure'),
    ('gcp', 'google cloud'),
    ('gcp', 'google cloud platform'),

    ('ci/cd', 'continuous integration'),
    ('ci/cd', 'continuous deployment'),
    ('ci/cd', 'continuous integration and deployment'),
    ('ci/cd', 'ci cd'),
    ('ci/cd', 'cicd'),

    ('node.js', 'node'),
    ('node.js', 'nodejs'),

    ('rest api', 'rest'),
    ('rest api', 'restful api'),
    ('rest api', 'restful apis'),
    ('rest api', 'rest apis'),

    ('graphql', 'graph ql'),

    ('postgresql', 'postgres'),
    ('sql server', 'microsoft sql server'),

    ('system design', 'system design and scalability'),
    ('system design', 'system architecture'),
    ('system design', 'software architecture'),

    ('scalability', 'system scalability'),
    ('scalability', 'scaling'),
    ('scalability', 'scalable systems'),

    ('distributed systems', 'distributed systems design'),
    ('distributed systems', 'distributed systems design and reliability'),
    ('distributed systems', 'distributed systems and reliability'),

    ('code review', 'code reviews'),
    ('code review', 'coding standards and code reviews'),
    ('code review', 'code reviews and coding standards'),

    ('object-oriented design', 'object oriented design'),
    ('object-oriented design', 'ood'),

    ('concurrency', 'multi-threading'),
    ('concurrency', 'multithreading'),
    ('concurrency', 'threading'),

    ('test automation', 'automated testing'),
    ('test automation', 'test automation frameworks'),
    ('test automation', 'test automation frameworks and scripting'),

    ('load testing', 'load testing and performance testing tools'),
    ('performance testing', 'performance testing tools'),

    ('agile', 'agile development'),
    ('agile', 'agile development practices'),
    ('scrum', 'scrum and agile development practices'),

    ('llms', 'large language models'),
    ('agentic workflows', 'agentic workflows and llm integration patterns'),
    ('ai agents', 'autonomous ai agent design and orchestration'),
    ('ai agents', 'autonomous ai agents'),

    ('oauth', 'oauth2'),
    ('oauth', 'oauth 2.0')
) as a(canonical_key, alias)
join canonical_brush_up_topics c
  on c.canonical_key = a.canonical_key
on conflict (alias) do nothing;

commit;