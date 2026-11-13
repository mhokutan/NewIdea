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
