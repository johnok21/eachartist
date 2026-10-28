#!/usr/bin/env python3
"""Bake the Resource Hub page.

Reads resources/opportunities.json, resources/readings.json and resources/config.json,
injects them into site/pages/resource-hub.html, wraps it in site/layout.html via site/build.py,
and writes ../resource-hub.html.

Run from anywhere:  python3 resources/bake.py

To refresh the baked copy from the Google Sheet first:
    python3 resources/bake.py --from-sheet
(downloads the Opportunities and Readings tabs as CSV using SHEET_ID from config.json,
 rewrites the two JSON files, then bakes)
"""
import csv, io, json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGE = os.path.join(ROOT, "site", "pages", "resource-hub.html")   # body + page styles; the shell is site/layout.html
OUT = os.path.join(ROOT, "resource-hub.html")
OPPS = os.path.join(HERE, "opportunities.json")
READS = os.path.join(HERE, "readings.json")
CONF = os.path.join(HERE, "config.json")

OPP_COLS = ["section","title","who","what","cost","deadline","recurring","location","url","link_label","verified_on","status"]
READ_COLS = ["category","subsection","badge_class","badge","title","description","url","link_label","url2","label2","url3","label3","url4","label4","status"]

def load(path, default):
    try:
        with open(path, encoding="utf-8") as f: return json.load(f)
    except FileNotFoundError:
        return default

def fetch_tab(sheet_id, tab):
    sel = "gid=0" if tab == "Opportunities" else f"sheet={tab}"
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&{sel}"
    with urllib.request.urlopen(url, timeout=20) as r:
        text = r.read().decode("utf-8")
    rows = list(csv.DictReader(io.StringIO(text)))
    return [{(k or "").strip().lower().replace(" ", "_"): (v or "").strip() for k, v in row.items()} for row in rows]

def readings_from_rows(rows):
    out = []
    for r in rows:
        if not r.get("title"): continue
        links = []
        for u, l in (("url","link_label"),("url2","label2"),("url3","label3"),("url4","label4")):
            if r.get(u): links.append({"url": r[u], "label": r.get(l) or "Open"})
        out.append({"category": r.get("category",""), "subsection": r.get("subsection",""),
                    "badge_class": r.get("badge_class","article"), "badge": r.get("badge",""),
                    "title": r["title"], "description": r.get("description",""),
                    "links": links, "status": r.get("status","live")})
    return out

def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    conf = load(CONF, {})
    if "--from-sheet" in argv:
        sid = conf.get("SHEET_ID")
        if not sid: sys.exit("config.json has no SHEET_ID")
        opps = [ {k: r.get(k,"") for k in OPP_COLS} for r in fetch_tab(sid, "Opportunities") if r.get("title") ]
        json.dump(opps, open(OPPS,"w",encoding="utf-8"), indent=1, ensure_ascii=False)
        try:
            reads = readings_from_rows(fetch_tab(sid, "Readings"))
            if reads: json.dump(reads, open(READS,"w",encoding="utf-8"), indent=1, ensure_ascii=False)
        except Exception:
            reads = None  # no Readings tab yet; keep the repo copy
        print(f"refreshed from sheet: {len(opps)} opportunities" + (f", {len(reads)} readings" if reads else " (readings kept from repo)"))
    opps = load(OPPS, []); reads = load(READS, [])
    sys.path.insert(0, os.path.join(ROOT, "site"))
    import build
    meta, body = build.split_meta(open(PAGE, encoding="utf-8").read())
    def j(x): return json.dumps(x, ensure_ascii=False).replace("</", "<\\/")
    body = (body.replace("/*__OPPS__*/", j(opps)).replace("/*__READINGS__*/", j(reads))
                .replace("/*__SHEET_ID__*/", conf.get("SHEET_ID","")).replace("/*__TALLY__*/", conf.get("TALLY_FORM_URL","")))
    build.render(meta, body, "resource-hub.html")
    live_o = sum(1 for o in opps if (o.get("status","live").lower()=="live"))
    live_r = sum(1 for r in reads if (r.get("status","live").lower()=="live"))
    print(f"baked {OUT}: {live_o}/{len(opps)} opportunities live, {live_r}/{len(reads)} readings live")

if __name__ == "__main__":
    main()
