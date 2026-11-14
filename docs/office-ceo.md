# Office: how the CEO session writes (2026-11-12)

The office tables live in their OWN Cloudflare D1 database `office-db` (founder decision 2026-11-12), not in
promovote-db. Database id: **3419c845-6e07-4dca-97de-dde5446bf70f** (created 2026-11-12, migration `services/api/office-migrations/0001_office.sql`
applied the same day; promovote-api reads it through the `OFFICE_DB` binding).

Paragraph for the CEO Claude session (the founder passes it on):

```
The office page promovote.com/admin/office reads two tables in the Cloudflare D1 database office-db (id 3419c845-6e07-4dca-97de-dde5446bf70f). Write to them directly with the Cloudflare D1 tool (d1_database_query on office-db); there is no API endpoint and no key. Only use office-db; never write to any other database. Table office_agents: id (text, 2 to 40 characters, a to z, 0 to 9 and -, for example ceo, hauling-dev, empire-desktop, robo-works), role (text up to 60, the shown name, for example "Hauling Geliştirici"), status (one of working, idle, waiting_owner, blocked, offline), last_action (text up to 160 or NULL), needs_owner (text up to 300 or NULL; the yes you need from the founder), updated_at (ISO time UTC). Example: INSERT INTO office_agents (id, role, status, last_action, needs_owner, updated_at) VALUES ('hauling-dev', 'Hauling Geliştirici', 'waiting_owner', '2.5.2 derlemesi hazır', '2.5.2 derlemesi için evet', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO UPDATE SET role=excluded.role, status=excluded.status, last_action=excluded.last_action, needs_owner=excluded.needs_owner, updated_at=excluded.updated_at; Remove a session with DELETE FROM office_agents WHERE id = '...'. Table office_notes (for later: notes from the founder): id (text, a UUID), created_at (ISO time), text (up to 1000), status (new, read or answered), answer (text up to 2000 or NULL). Never write personal data (e-mails, player or customer names, keys, secrets). Set needs_owner back to NULL once the founder answered. The page refreshes every 30 seconds.
```

## Version 3 (2026-11-13): departments, notes and mail

Departments come from the id PREFIX (founder 2026-11-13, 52 person team), so a new row needs no code change:
`ceo` = GENEL MÜDÜR; `hauling-*`, `empire-desktop` = HAULING EMPIRE; `dropolis-*`, `robo-works` = DROPOLIS;
`dovelet-*` = DOVELET; `promovote-*` = PROMOVOTE; `dopazon-*` = DOPAZON; `salesforce-*` = SALESFORCE;
`store-*` = MAĞAZA VE BÜYÜME; `social-*` = SOSYAL MEDYA; `panel-*` = TEST PANELİ; `ortak-*`, `analyst`,
`mac-mini-test` = ORTAK BİRİMLER; anything else = DİĞER (the room opens when the first such id arrives). Rooms size
themselves by member count (one spare desk, at most 9 desks; a tenth member sits in DİĞER). One BOŞ ODA always stays.
Put the model in brackets at the end of `role`, for example `Hauling QA (Haiku)`: the side panel shows it as a tag,
bubbles show the name without it. The API returns up to 200 rows.

**Notes from the founder.** The bottom bar "CEO'ya not bırak" writes a row to `office_notes` with status `new` (admin
login only, 1 to 1000 characters; the only write endpoint, `POST /v1/admin/office/notes` on promovote-api). Read them:
`SELECT id, created_at, text FROM office_notes WHERE status = 'new' ORDER BY created_at;` then
`UPDATE office_notes SET status = 'answered', answer = '...' WHERE id = '...';`

**Mail animation** (table `office_mail`, migration `services/api/office-migrations/0002_office_mail.sql`, apply only
after the founder's yes). One row = one character walks with an envelope from `from_id`'s desk to `to_id`'s desk.
The page plays rows from the last 10 minutes, once per browser. Label 1 to 60 characters, no personal data. Example:

```sql
INSERT INTO office_mail (id, from_id, to_id, label)
VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-a' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
        'ceo', 'hauling-dev', '2.5.2 derleme görevi');
```

## Task board ("Görevler", 2026-11-13)

New table `office_tasks` (migration `services/api/office-migrations/0003_office_tasks.sql`, apply only after the
founder's yes). The board next to the 3D office has four columns: Senden bekleyen (`waiting_owner`), Yapılıyor
(`doing`), Bitti (`done`), Takıldı (`blocked`). "Senden beklenen: N evet" counts `waiting_owner` cards with no answer.

The CEO session creates and moves cards with the D1 tool. The page can set ONLY `owner_answer` (yes/no), `owner_note`
and `answered_at` on a `waiting_owner` card (`POST /v1/admin/office/tasks/:id/answer`). Read the owner's answers:

```sql
SELECT id, title, owner_answer, owner_note, answered_at FROM office_tasks WHERE owner_answer IS NOT NULL ORDER BY answered_at DESC;
```

Create a card (project is a department key: hauling, dropolis, dovelet, promovote, salesforce, store, social, panel,
ortak, dopazon, ceo). priority 1 is high. kind is yes, info or question:

```sql
INSERT INTO office_tasks (id, title, detail, project, assignee_id, status, kind, priority)
VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-a' || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
        'Hauling 2.5.2 iOS ve Android derlemesi', 'Derlemeler hazir. Magazaya yuklemek icin evet gerekiyor.',
        'hauling', 'hauling-dev', 'waiting_owner', 'yes', 1);
```

After the founder answers, move the card: `UPDATE office_tasks SET status = 'doing', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = '...';`
Store, publish, budget and live data work still needs the founder's yes in the CEO chat; the card's answer is the first step.

**Asks on a session row (2026-11-13).** A session with `status = 'waiting_owner'` or a `needs_owner` text and no
unanswered waiting card also appears on the board ("Oturumdan" tag). The founder's Evet / Hayır on it arrives as an
`office_notes` row like `EVET (empire-desktop, Hauling Masaüstü Derleme): Masaüstü oturumunda gönderim için bir kez evet`.
After acting on it, clear the ask: `UPDATE office_agents SET needs_owner = NULL, status = 'working' WHERE id = '...';`
Better: open a real card in `office_tasks` for each ask, then the answer lands on the card itself.

## Stage, progress and timeline (2026-11-14)

Migration `services/api/office-migrations/0004_office_task_stage.sql` (apply only after the founder's yes) adds
`office_tasks.stage` (text up to 120, for example `2/5 Reklam düzeltmesi`), `office_tasks.progress` (0 to 100) and
the table `office_task_log` (id, task_id, at, text up to 300). The board shows the stage line and a thin progress bar
on each card; the card's drawer shows the timeline, newest first, in New York time (the API sends the last 10 lines
per card). A card in "Yapılıyor" with no change for 2 hours (neither `updated_at` nor a new log line) gets an "eski"
tag, so keep `updated_at` fresh whenever you move a card.

Move a card to its next stage and log it (two statements, run together):

```sql
UPDATE office_tasks SET stage = '2/5 Reklam düzeltmesi', progress = 40, status = 'doing',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = '<task id>';
INSERT INTO office_task_log (id, task_id, text)
VALUES (lower(hex(randomblob(16))), '<task id>', 'Hauling QA reklam akışını düzeltti, test oyuncusuna verildi');
```

Read a card's timeline: `SELECT at, text FROM office_task_log WHERE task_id = '<task id>' ORDER BY at DESC LIMIT 10;`
Stuck cards (what the "eski" tag shows): `SELECT id, title, stage, updated_at FROM office_tasks WHERE status = 'doing' AND updated_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 hours');`
Log text is short work text only: no personal data, keys or player names.

## Skills and models (2026-11-14)

Migration `services/api/office-migrations/0005_office_skills.sql` (after 0004; apply only after the founder's yes)
adds `office_agents.skills` (comma separated skill names, up to 300) and `office_agents.model` (Opus, Sonnet or Haiku),
`office_tasks.skills_used` and `office_tasks.model_used`, and `office_task_log.skill` (one skill per step, up to 60).
The page shows them as chips: a person's side panel (model and skills), a department label (its main skills on hover,
tap opens them), each card (model and skills used) and each timeline step (the skill that ran). The "Beceriler" tab
next to "Görevler" is a matrix: skills by department (how many people hold each), with when each skill last ran and
on which task; a skill nobody used shows "Kullanılmadı", one idle for 7 days "7 gündür boşta". Use the same skill
name everywhere (lower case, for example `playwright`, `unity`, `store-release`); matching ignores case.

```sql
-- Who has which skills and model
UPDATE office_agents SET skills = 'unity, csharp, store-release', model = 'Opus' WHERE id = 'hauling-dev';
-- What a card used
UPDATE office_tasks SET skills_used = 'playwright, cloudflare-workers', model_used = 'Opus',
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = '<task id>';
-- A step with the skill that ran
INSERT INTO office_task_log (id, task_id, text, skill)
VALUES (lower(hex(randomblob(16))), '<task id>', 'Uçtan uca testler geçti', 'playwright');
```
