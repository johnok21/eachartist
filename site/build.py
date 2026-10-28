#!/usr/bin/env python3
"""Build eachartist.org from site/pages/*.html + site/layout.html.

Each page file starts with a meta block:
    <!--meta
    {"title": "...", "description": "...", "nav": "Events", "og_image": "...", "scripts": ["luma"]}
    -->
followed by the page body (what goes inside <main>).

The Resource Hub is special: its body is resources/resource-hub.template.html and the
sheet-backed data is injected by resources/bake.py, which calls build_page("resource-hub").

Run:  python3 site/build.py            # all pages
      python3 site/build.py events     # one page
"""
import json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PAGES = os.path.join(HERE, "pages")
LAYOUT = open(os.path.join(HERE, "layout.html"), encoding="utf-8").read()
CONFIG = json.load(open(os.path.join(HERE, "config.json"), encoding="utf-8"))
BUILD = time.strftime("%Y%m%d%H%M")

WINBTNS = '''<svg width="60" height="16" viewBox="0 0 60 16" aria-hidden="true"><g><rect x="0" y="0" width="18" height="16" fill="#f4f1e8"/><path d="M0 15.5 V0.5 H17.5" stroke="#fff" fill="none"/><path d="M0.5 15.5 H18 V0" stroke="#0a0a0a" fill="none"/><path d="M1.5 14.5 H17 V1" stroke="#9a9385" fill="none"/><rect x="5" y="11" width="7" height="2" fill="#0a0a0a"/></g><g><rect x="20" y="0" width="18" height="16" fill="#f4f1e8"/><path d="M20 15.5 V0.5 H37.5" stroke="#fff" fill="none"/><path d="M20.5 15.5 H38 V0" stroke="#0a0a0a" fill="none"/><path d="M21.5 14.5 H37 V1" stroke="#9a9385" fill="none"/><rect x="24.5" y="3.5" width="9" height="8" fill="none" stroke="#0a0a0a"/><rect x="24" y="3" width="10" height="2" fill="#0a0a0a"/></g><g><rect x="42" y="0" width="18" height="16" fill="#f4f1e8"/><path d="M42 15.5 V0.5 H59.5" stroke="#fff" fill="none"/><path d="M42.5 15.5 H60 V0" stroke="#0a0a0a" fill="none"/><path d="M43.5 14.5 H59 V1" stroke="#9a9385" fill="none"/><path d="M47 4 L55 12 M55 4 L47 12" stroke="#0a0a0a" stroke-width="2"/></g></svg>'''

NAV = [("Navigators", "navigators.html"), ("Shared Spaces", "shared-spaces.html"), ("Resources", "resource-hub.html"),
       ("Events", "events.html"), ("Contribute", "contribute.html"), ("Contact", "contact.html")]

EXTRA_SCRIPTS = {
    "luma": '<script id="luma-checkout" src="https://embed.lu.ma/checkout-button.js"></script>',
    "instagram": '<script async src="https://www.instagram.com/embed.js"></script>',
    "paint": '<script src="paint.js?v={{BUILD}}" defer></script>',
}

def nav_html(current):
    out = []
    for label, href in NAV:
        cur = ' aria-current="page"' if label == current else ""
        out.append(f'      <li><a href="{href}"{cur}>{label}</a></li>')
    return "\n".join(out)

def split_meta(src):
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", src, re.S)
    if not m:
        raise SystemExit("page is missing its <!--meta {...} --> block")
    return json.loads(m.group(1)), src[m.end():]

def render(meta, body, out_name):
    ev = CONFIG["next_event"]
    html = LAYOUT
    rep = {
        "{{TITLE}}": meta["title"],
        "{{DESCRIPTION}}": meta["description"],
        "{{CANONICAL}}": "" if out_name == "index.html" else out_name,
        "{{OG_IMAGE}}": meta.get("og_image", "each-logo-full-still.png"),
        "{{NAV}}": nav_html(meta.get("nav", "")),
        "{{BODY}}": body,
        "{{HEAD_EXTRA}}": meta.get("head_extra", ""),
        "{{SCRIPTS_EXTRA}}": "\n".join(EXTRA_SCRIPTS[s] for s in meta.get("scripts", [])),
        "{{TICKER_TAG}}": ev["tag"], "{{TICKER_TEXT}}": ev["text"], "{{TICKER_URL}}": ev["url"],
        "{{COUNT}}": CONFIG["artists_connected"], "{{LAST_SAVED}}": CONFIG["last_saved"],
    }
    for k, v in rep.items():
        html = html.replace(k, v)
    html = html.replace("{{WINBTNS}}", WINBTNS)
    html = re.sub(r"\{\{PARTIAL:([\w-]+)\}\}", lambda m: open(os.path.join(HERE, "partials", m.group(1) + ".html"), encoding="utf-8").read(), html)
    html = html.replace("{{BUILD}}", BUILD)
    with open(os.path.join(ROOT, out_name), "w", encoding="utf-8") as f:
        f.write(html)
    return out_name

def build_page(name, body_override=None):
    """name: page stem. body_override: pre-rendered body (used by resources/bake.py)."""
    path = os.path.join(PAGES, name + ".html")
    src = open(path, encoding="utf-8").read()
    meta, body = split_meta(src)
    if body_override is not None:
        body = body_override
    return render(meta, body, meta.get("out", name + ".html"))

def main(argv):
    names = argv or sorted(p[:-5] for p in os.listdir(PAGES) if p.endswith(".html"))
    for n in names:
        if n == "resource-hub":
            # data injection lives in resources/bake.py; it calls build_page itself
            sys.path.insert(0, os.path.join(ROOT, "resources"))
            import bake; bake.main([]); continue
        print("built", build_page(n))

if __name__ == "__main__":
    main(sys.argv[1:])
