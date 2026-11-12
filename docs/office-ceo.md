# Office: how the CEO session writes (2026-11-12)

The office tables live in their OWN Cloudflare D1 database `office-db` (founder decision 2026-11-12), not in
promovote-db. Database id: **not created yet**. It is filled in here when the founder says yes and the database is
created (`npx wrangler d1 create office-db`), then the migration `services/api/office-migrations/0001_office.sql` is
applied and promovote-api is deployed with the `OFFICE_DB` binding.

Paragraph for the CEO Claude session (the founder passes it on once the id is filled in):

```
The office page promovote.com/admin/office reads two tables in the Cloudflare D1 database office-db (id: <filled in after creation>). Write to them directly with the Cloudflare D1 tool (d1_database_query on office-db); there is no API endpoint and no key. Only use office-db; never write to any other database. Table office_agents: id (text, 2 to 40 characters, a to z, 0 to 9 and -, for example ceo, hauling-dev, empire-desktop, robo-works), role (text up to 60, the shown name, for example "Hauling Geliştirici"), status (one of working, idle, waiting_owner, blocked, offline), last_action (text up to 160 or NULL), needs_owner (text up to 300 or NULL; the yes you need from the founder), updated_at (ISO time UTC). Example: INSERT INTO office_agents (id, role, status, last_action, needs_owner, updated_at) VALUES ('hauling-dev', 'Hauling Geliştirici', 'waiting_owner', '2.5.2 derlemesi hazır', '2.5.2 derlemesi için evet', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO UPDATE SET role=excluded.role, status=excluded.status, last_action=excluded.last_action, needs_owner=excluded.needs_owner, updated_at=excluded.updated_at; Remove a session with DELETE FROM office_agents WHERE id = '...'. Table office_notes (for later: notes from the founder): id (text, a UUID), created_at (ISO time), text (up to 1000), status (new, read or answered), answer (text up to 2000 or NULL). Never write personal data (e-mails, player or customer names, keys, secrets). Set needs_owner back to NULL once the founder answered. The page refreshes every 30 seconds.
```
