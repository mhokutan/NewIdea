-- Test account for Apple App Review and Google Play review (founder request 2026-10-07).
-- Sign in: email review@promovote.com with a fixed 6 digit code stored only as the Worker secret REVIEW_CODE.
-- No email is sent for this address. It is a normal scout account so reviewers can vote, save, follow,
-- report, block and delete the account.
insert into "user" (id, name, email, emailVerified, createdAt, updatedAt)
values ('7d0c5a8e-2f4b-4c1e-9a6d-5b3e8f1a2c90', 'App Review', 'review@promovote.com', 1, '2026-10-07T00:00:00.000Z', '2026-10-07T00:00:00.000Z');
insert into account_private (user_id, account_type, birth_year, age_confirmed_at, country_code, language, terms_accepted_at, terms_version)
values ('7d0c5a8e-2f4b-4c1e-9a6d-5b3e8f1a2c90', 'scout', 1990, '2026-10-07T00:00:00.000Z', 'US', 'en', '2026-10-07T00:00:00.000Z', '2026-10-02');
insert into profiles (id, owner_user_id, type, handle, display_name, bio)
values ('2a9f6c1d-8e3b-4d7a-b5c2-9e1f0a6d3b48', '7d0c5a8e-2f4b-4c1e-9a6d-5b3e8f1a2c90', 'scout', 'appreview', 'App Review', 'Test account for app store review.');
insert into profile_settings (profile_id) values ('2a9f6c1d-8e3b-4d7a-b5c2-9e1f0a6d3b48');
insert into scout_stats (profile_id) values ('2a9f6c1d-8e3b-4d7a-b5c2-9e1f0a6d3b48');
