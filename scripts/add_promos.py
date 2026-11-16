#!/usr/bin/env python3
"""Adds a weekly batch of founder promos to web/landing/content/promos.json, keeping its hand formatting.

Usage: python3 scripts/add_promos.py web/landing/content/weekly/2026-w47.json
Batch file: {"creators": {handle: {...}}, "promos": [{...}]}. New creators and promos only; an id or handle that
already exists stops the script. Then run web/landing/build.py and services/api/scripts/gen-promo-sql.py.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROMOS = ROOT / "web/landing/content/promos.json"
J = lambda v: json.dumps(v, ensure_ascii=False)


def creator(h, c):
    out = [f'    "{h}": {{', f'      "name": {J(c["name"])}, "category": {J(c["category"])},',
           f'      "avatar": {J(c["avatar"])},', f'      "kind": {J(c["kind"])},', f'      "banner": {J(c["banner"])},',
           '      "bio": {']
    langs = list(c["bio"])
    out += [f'        "{k}": {J(c["bio"][k])}' + ("," if k != langs[-1] else "") for k in langs]
    out.append("      },")
    for k in ("link", "cta"):
        if k in c:
            out.append(f'      "{k}": {J(c[k])},')
    out += [f'      "disclosure": {J(c["disclosure"])}', "    }"]
    return "\n".join(out)


def promo(x):
    head = {k: x[k] for k in ("id", "creator", "lang", "video", "dur", "tags")}
    out = ["    {" + J(head)[1:-1] + ","]
    link = {k: x[k] for k in ("link", "linkKind") if k in x}
    if link:
        out.append("     " + J(link)[1:-1] + ",")
    out.append(f'     "title": {J(x["title"])},')
    d = x["desc"]
    out += [f'     "desc": {{"en": {J(d["en"])},', f'              "es": {J(d["es"])},', f'              "tr": {J(d["tr"])}}}}}']
    return "\n".join(out)


def main(batch_path):
    batch = json.loads(Path(batch_path).read_text())
    text = PROMOS.read_text()
    data = json.loads(text)
    for h in batch.get("creators", {}):
        assert h not in data["creators"], f"creator {h} exists"
    ids = {p["id"] for p in data["promos"]}
    for p in batch["promos"]:
        assert p["id"] not in ids, f"promo {p['id']} exists"
        assert p["creator"] in data["creators"] or p["creator"] in batch.get("creators", {}), p["creator"]
    if batch.get("creators"):
        marker = '\n  },\n  "promos": ['
        assert text.count(marker) == 1
        text = text.replace(marker, ",\n" + ",\n".join(creator(h, c) for h, c in batch["creators"].items()) + marker)
    end = "\n  ]\n}"
    assert text.rstrip("\n").endswith(end)
    text = text.rstrip("\n")[: -len(end)] + ",\n" + ",\n".join(promo(p) for p in batch["promos"]) + end + "\n"
    new = json.loads(text)
    assert len(new["promos"]) == len(data["promos"]) + len(batch["promos"])
    PROMOS.write_text(text)
    print(f"added {len(batch.get('creators', {}))} creators, {len(batch['promos'])} promos")


if __name__ == "__main__":
    main(sys.argv[1])
