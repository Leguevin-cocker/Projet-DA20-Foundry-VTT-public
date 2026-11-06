"""Sort les textes français des templates Handlebars de Noctis vers lang/fr.json.

Remplace chaque segment de texte par {{localize "NOCTIS.ui.<clé>" var=chemin}}.
Les balises de mise en forme simples (<b>, <i>, <em>…) restent dans la chaîne ({{{localize}}}).
Usage : python3 i18n_tpl.py <racine du système> [--dry]
"""
import json, os, re, sys, unicodedata

ROOT = sys.argv[1]
DRY = "--dry" in sys.argv
KEYS = {}           # texte -> clé
STRINGS = {}        # clé -> texte
LANG = os.path.join(ROOT, "lang", "fr.json")

INLINE = {"b", "i", "em", "strong", "u", "small", "br", "sup", "sub"}
ATTRS = ["data-tooltip", "placeholder", "title", "aria-label", "alt", "data-confirm"]
SIMPLE_VAR = re.compile(r"^\{\{\s*(?!else\b)((?:\.\./)*[@\w][@\w.\[\]-]*|this)\s*\}\}$")
TOKEN = re.compile(r"(\{\{!--.*?--\}\}|\{\{\{.*?\}\}\}|\{\{.*?\}\}|<!--.*?-->|<[^>]*?(?:\{\{.*?\}\}[^>]*?)*>)", re.S)


def slug(text):
    t = re.sub(r"<[^>]+>|\{[^}]*\}", " ", text)
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode()
    words = re.findall(r"[A-Za-z0-9]+", t)
    s = "".join(w.capitalize() for w in words[:6]) or "Text"
    return s[:40]


def key_for(text):
    if text in KEYS: return KEYS[text]
    base = "NOCTIS.ui." + slug(text)
    k, n = base, 2
    while k in STRINGS: k, n = f"{base}{n}", n + 1
    KEYS[text] = k; STRINGS[k] = text
    return k


def var_name(path, used):
    if path == "this": n = "value"
    elif path.startswith("@"): n = path[1:]
    else: n = re.split(r"[./]", path.replace("../", ""))[-1] or "value"
    n = re.sub(r"\W", "", n) or "value"
    base, i = n, 2
    while n in used and used[n] != path: n, i = f"{base}{i}", i + 1
    used[n] = path
    return n


def has_words(s):
    plain = re.sub(r"\{[^}]*\}|<[^>]+>|&[a-z]+;", " ", s)
    return re.search(r"[A-Za-zÀ-ÿŒœ]{2,}", plain) is not None


def localize_segment(tokens):
    """tokens : liste de (kind, text) ; renvoie le texte de remplacement."""
    # retirer les espaces de bord
    lead = trail = ""
    if tokens and tokens[0][0] == "text":
        m = re.match(r"^\s*", tokens[0][1]); lead = m.group(0); tokens[0] = ("text", tokens[0][1][len(lead):])
    if tokens and tokens[-1][0] == "text":
        m = re.search(r"\s*$", tokens[-1][1]); trail = m.group(0); tokens[-1] = ("text", tokens[-1][1][:len(tokens[-1][1]) - len(trail)])
    fmt, used, raw = "", {}, False
    for kind, txt in tokens:
        if kind == "text": fmt += txt
        elif kind == "var":
            fmt += "{" + var_name(SIMPLE_VAR.match(txt).group(1), used) + "}"
        elif kind == "inline": fmt += txt; raw = True
    fmt = re.sub(r"\s+", " ", fmt)
    if not has_words(fmt): return None
    k = key_for(fmt)
    args = "".join(f" {n}={p}" for n, p in used.items())
    call = f'localize "{k}"{args}'
    return lead + ("{{{" + call + "}}}" if raw else "{{" + call + "}}") + trail


def is_close(t): return t.startswith("</")
def is_open(t): return not t.startswith("</") and not t.rstrip(">").rstrip().endswith("/") and not re.match(r"<\s*br", t, re.I)

def process_text_run(run):
    """run : liste de (kind, text) entre deux frontières."""
    run = list(run)
    pre, post = [], []
    # balises fermantes en tête et ouvrantes en queue (et espaces) : hors de la chaîne
    while run and (run[0][0] == "inline" and is_close(run[0][1]) or (run[0][0] == "text" and not run[0][1].strip())):
        pre.append(run.pop(0))
    while run and (run[-1][0] == "inline" and is_open(run[-1][1]) or (run[-1][0] == "text" and not run[-1][1].strip())):
        post.insert(0, run.pop())
    raw = lambda xs: "".join(t for _, t in xs)
    if not any(k == "text" and t.strip() for k, t in run): return raw(pre) + raw(run) + raw(post)
    out = localize_segment(list(run))
    return raw(pre) + (out if out is not None else raw(run)) + raw(post)


def process_attr_value(val):
    # découpe sur les blocs handlebars
    parts = TOKEN.split(val)
    out, run = [], []
    def flush():
        if run: out.append(process_text_run(run)); run.clear()
    for p in parts:
        if not p: continue
        if p.startswith("{{"):
            if SIMPLE_VAR.match(p): run.append(("var", p))
            else: flush(); out.append(p)
        else: run.append(("text", p))
    flush()
    return "".join(out)


def process_tag(tag):
    if tag.startswith("<!--"): return tag
    def rep(m):
        name, q, val = m.group(1), m.group(2), m.group(3)
        return f'{name}={q}{process_attr_value(val)}{q}'
    pat = r'(' + "|".join(re.escape(a) for a in ATTRS) + r')=(")((?:[^"{]|\{\{.*?\}\})*)"'
    return re.sub(pat, rep, tag, flags=re.S)


def process(src):
    parts = TOKEN.split(src)
    out, run = [], []
    def flush():
        if run: out.append(process_text_run(run)); run.clear()
    for p in parts:
        if not p: continue
        if p.startswith("{{"):
            if SIMPLE_VAR.match(p) and not p.startswith("{{{"): run.append(("var", p))
            else: flush(); out.append(p)
        elif p.startswith("<"):
            m = re.match(r"</?\s*([a-zA-Z0-9-]+)", p)
            tag = m.group(1).lower() if m else ""
            bare = re.fullmatch(r"</?\s*[a-zA-Z0-9]+\s*/?>", p) is not None
            if tag in INLINE and bare: run.append(("inline", p))
            else: flush(); out.append(process_tag(p))
        else: run.append(("text", p))
    flush()
    return "".join(out)


if os.path.exists(LANG):
    existing = json.load(open(LANG))
    for k, v in existing.get("NOCTIS", {}).get("ui", {}).items():
        STRINGS["NOCTIS.ui." + k] = v; KEYS.setdefault(v, "NOCTIS.ui." + k)

files = []
for d, _, fs in os.walk(os.path.join(ROOT, "templates")):
    for f in fs:
        if f.endswith(".hbs"): files.append(os.path.join(d, f))
for f in sorted(files):
    src = open(f).read()
    new = process(src)
    if new != src and not DRY: open(f, "w").write(new)
    print(f"{os.path.relpath(f, ROOT)} : {len(re.findall('localize \"NOCTIS.ui', new)) - len(re.findall('localize \"NOCTIS.ui', src))} textes")

if not DRY:
    data = json.load(open(LANG)) if os.path.exists(LANG) else {}
    ui = data.setdefault("NOCTIS", {}).setdefault("ui", {})
    for k, v in STRINGS.items(): ui[k[len("NOCTIS.ui."):]] = v
    json.dump(data, open(LANG, "w"), ensure_ascii=False, indent=2)
print(len(STRINGS), "chaînes")
