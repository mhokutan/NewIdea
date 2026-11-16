#!/usr/bin/env python3
"""Writes one migration for a weekly batch of founder promos (web/landing/content/weekly/<week>.json).

Usage: python3 services/api/scripts/gen-promo-sql.py web/landing/content/weekly/2026-w47.json 0024_promos_2026_w47
Only adds rows. New creators are founder accounts (founder+<handle>@promovote.com) like the launch seed; if the
handle already exists live, its row is kept and only empty fields (avatar, banner, bio, main button) are filled.
Ids are uuid5 like scripts/gen-seed-sql.py, so the file is stable when regenerated.
"""
import json, sys, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
NS = uuid.UUID("6f1c2b0e-5d1a-4c7e-9a43-70726f6d6f76")
uid = lambda *parts: str(uuid.uuid5(NS, "/".join(parts)))
q = lambda v: "null" if v is None else "'" + str(v).replace("'", "''") + "'"
j = lambda v: q(json.dumps(v, ensure_ascii=False, separators=(",", ":")))
SITE = "https://promovote.com"
NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
KIND = {"games": "game_dev", "apps": "app_maker", "shops": "shop"}
CTA = {"appstore": "app_store", "shop": "shop", None: "etsy"}


def creator_sql(handle, c):
    user_id, prof_id = uid("user", handle), uid("profile", handle)
    android = (c.get("cta") or {}).get("android")
    play = android if android and android.startswith("https://") else None
    avatar = SITE + c["avatar"]["img"] if c["avatar"].get("img") else None
    banner = SITE + "/media/" + c["banner"]
    i18n = j({"bio": c["bio"], "kind": c["kind"], "mono": c["avatar"].get("mono")})
    out = [f"-- Creator @{handle} (founder account)."]
    out.append(f"insert into \"user\" (id, name, email, emailVerified, createdAt, updatedAt) select {q(user_id)}, {q(c['name'])}, {q('founder+' + handle + '@promovote.com')}, 1, {NOW}, {NOW} "
               f"where not exists (select 1 from profiles where handle = {q(handle)}) on conflict do nothing;")
    out.append(f"insert into account_private (user_id, account_type, birth_year, age_confirmed_at, country_code, terms_accepted_at, terms_version) "
               f"select id, 'creator', 1990, {NOW}, 'US', {NOW}, '2026-10-02' from \"user\" where id = {q(user_id)} on conflict do nothing;")
    out.append(f"insert into profiles (id, owner_user_id, type, handle, display_name, bio, i18n, avatar_url, banner_url, is_verified, verified_at) "
               f"select {q(prof_id)}, id, 'creator', {q(handle)}, {q(c['name'])}, {q(c['bio']['en'])}, {i18n}, {q(avatar)}, {q(banner)}, 1, {NOW} "
               f"from \"user\" where id = {q(user_id)} and not exists (select 1 from profiles where handle = {q(handle)}) on conflict do nothing;")
    out.append(f"update profiles set avatar_url = coalesce(avatar_url, {q(avatar)}), banner_url = coalesce(banner_url, {q(banner)}), "
               f"bio = coalesce(bio, {q(c['bio']['en'])}), i18n = coalesce(i18n, {i18n}) where handle = {q(handle)};")
    out.append(f"insert into profile_settings (profile_id) select id from profiles where handle = {q(handle)} on conflict do nothing;")
    out.append(f"insert into creator_details (profile_id, kind, category, primary_cta, founding_creator, founder_owned, release_status, android_status, ios_status) "
               f"select id, {q(KIND[c['category']])}, {q(c['category'])}, {q('google_play' if play else None)}, 1, 1, 'live', {q('live' if play else None)}, null "
               f"from profiles where handle = {q(handle)} on conflict do nothing;")
    if play:
        out.append(f"update creator_details set primary_cta = coalesce(primary_cta, 'google_play') where profile_id = (select id from profiles where handle = {q(handle)});")
        out.append(f"insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, verify_status, safety_status, verified_at, last_scanned_at) "
                   f"select {q(uid('link', handle, 'google_play'))}, id, 'google_play', {q(play)}, {q(play)}, 'Google Play', 0, 'verified', 'safe', {NOW}, {NOW} "
                   f"from profiles p where handle = {q(handle)} and not exists (select 1 from profile_links l where l.profile_id = p.id and l.platform = 'google_play') on conflict do nothing;")
    return out


def promo_sql(p, creators):
    c = creators[p["creator"]]
    pid = uid("promo", p["id"])
    if p.get("link"):
        cta_kind, cta_url = CTA.get(p.get("linkKind")), p["link"]
    else:
        android = (c.get("cta") or {}).get("android")
        cta_kind, cta_url = ("google_play", android) if android and android.startswith("https://") else (None, None)
    v = p["video"]
    out = [f"-- Promo {p['id']} (@{p['creator']}, {p['dur']} s)."]
    out.append(
        f"insert into promos (id, creator_profile_id, slug, lang, title, description, i18n, status, cta_kind, cta_url, cta_safety_status, has_perk, rights_confirmed_at, submitted_at, approved_at, live_at) "
        f"select {q(pid)}, id, {q(p['id'])}, {q(p['lang'])}, {q(p['title']['en'][:60])}, {q(p['desc']['en'][:280])}, {j({'title': p['title'], 'desc': p['desc']})}, 'live', "
        f"{q(cta_kind)}, {q(cta_url)}, {q('safe' if cta_url else 'pending')}, 0, {NOW}, {NOW}, {NOW}, {NOW} from profiles where handle = {q(p['creator'])} on conflict do nothing;")
    out.append(
        f"insert into promo_videos (id, promo_id, label, mp4_url, webm_url, poster_url, duration_ms, width, height) "
        f"select {q(uid('video', p['id']))}, id, 'A', {q(f'{SITE}/media/{v}.mp4')}, {q(f'{SITE}/media/{v}.webm')}, {q(f'{SITE}/media/{v}-poster.jpg')}, {p['dur'] * 1000}, 720, 1280 "
        f"from promos where id = {q(pid)} on conflict do nothing;")
    tags = p.get("tags", [])
    if tags:
        out.append("insert into hashtags (tag, use_count) values " + ", ".join(f"({q(t)}, 1)" for t in tags) + " on conflict (tag) do update set use_count = use_count + 1;")
        out.append("insert into promo_hashtags (promo_id, tag, position) select id, t.tag, t.pos from promos, (" +
                   " union all ".join(f"select {q(t)} as tag, {i} as pos" for i, t in enumerate(tags)) +
                   f") t where promos.id = {q(pid)} on conflict do nothing;")
    return out


def main(batch_path, name):
    batch = json.loads((ROOT / batch_path).read_text() if not Path(batch_path).is_absolute() else Path(batch_path).read_text())
    all_creators = json.loads((ROOT / "web/landing/content/promos.json").read_text())["creators"]
    out = [f"-- Generated by scripts/gen-promo-sql.py from {batch_path}. Do not edit by hand. Adds rows only."]
    for h, c in batch.get("creators", {}).items():
        out += creator_sql(h, c)
    for p in batch["promos"]:
        out += promo_sql(p, all_creators)
    path = Path(__file__).resolve().parents[1] / "migrations" / f"{name}.sql"
    path.write_text("\n".join(out) + "\n")
    print(f"wrote {path.name}: {len(batch.get('creators', {}))} creators, {len(batch['promos'])} promos")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
