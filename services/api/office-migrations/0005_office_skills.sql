-- office-db, migration 0005 (founder request 2026-11-14): skills are why the teams are split, so the office shows them.
-- office_agents: the skills a session has (comma separated names) and its model. office_tasks: the skills and model a
-- card used. office_task_log: the skill that ran at that step. The CEO session writes all of it with the D1 tool;
-- the page only reads it. Needs 0004 first (office_task_log). Apply only after the founder's yes: npx wrangler d1
-- migrations apply office-db --remote (from services/api), or the same SQL through the D1 tool plus a d1_migrations row.
alter table office_agents add column skills text check (skills is null or length(skills) <= 300);   -- "unity, csharp, store-release"
alter table office_agents add column model text check (model is null or model in ('Opus', 'Sonnet', 'Haiku'));
alter table office_tasks add column skills_used text check (skills_used is null or length(skills_used) <= 300);
alter table office_tasks add column model_used text check (model_used is null or model_used in ('Opus', 'Sonnet', 'Haiku'));
alter table office_task_log add column skill text check (skill is null or length(skill) <= 60);
