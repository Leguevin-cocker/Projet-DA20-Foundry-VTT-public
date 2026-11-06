"""Sort les chaînes françaises du JavaScript de Noctis vers lang/fr.json (NOCTIS.js.*).

- Dans une fonction : "texte" -> t("NOCTIS.js.Cle") ; `texte ${x}` -> t("NOCTIS.js.Cle", { x })
- Au niveau du module (tables, options de classe) : "texte" -> "NOCTIS.js.Cle" (traduit à i18nInit par localizeDeep)
Usage : python3 i18n_js.py <racine> [--dry]
"""
import json, os, re, sys, unicodedata

ROOT = sys.argv[1]
DRY = "--dry" in sys.argv
LANG = os.path.join(ROOT, "lang", "fr.json")
STRINGS, KEYS = {}, {}
REPORT = []

FR_ACCENT = re.compile(r"[àâçéèêëîïôûùüÿœÀÂÇÉÈÊËÎÏÔÛÙÜŒ]")
FR_WORDS = re.compile(r"\b(le|la|les|des|du|un|une|et|est|pour|avec|sur|dans|pas|plus|au|aux|ne|qui|que|de|en|son|sa|ses|ce|cette|votre|vos|par|sans|ou|il|elle|on|à)\b", re.I)
SKIP_FILES = {"i18n.mjs"}


def slug(text):
    t = re.sub(r"<[^>]+>|\{[^}]*\}|\$\{[^}]*\}", " ", text)
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode()
    words = re.findall(r"[A-Za-z0-9]+", t)
    return ("".join(w.capitalize() for w in words[:6]) or "Text")[:40]


def key_for(text):
    if text in KEYS: return KEYS[text]
    base = "NOCTIS.js." + slug(text)
    k, n = base, 2
    while k in STRINGS: k, n = f"{base}{n}", n + 1
    KEYS[text] = k; STRINGS[k] = text
    return k


IDENT = {"Item", "Actor", "Compendium", "Folder", "JournalEntry", "Scene", "ChatMessage", "Combat", "User", "RollTable", "Macro",
         "Playlist", "Cards", "Adventure", "Token", "Combatant", "ActiveEffect", "Object", "Array", "String", "Number", "Boolean", "Escape", "Enter",
         "Shift", "Control", "Alt", "GM", "OWNER", "NONE", "LIMITED", "OBSERVER", "Noctis"}
REJECTED = []

def is_french(s):
    plain = re.sub(r"\$\{[^}]*\}|<[^>]+>", " ", s)
    if not re.search(r"[A-Za-zÀ-ÿ]{2,}", plain): return False
    st = plain.strip()
    if re.search(r"system\.|^\s*[.\[#]|data-(min|action|path)|Compendium\.|input\[|@init|noctis-dots|^details, |\.entry-name|\.blood-table|\.roll-tabs", s): return False
    if re.fullmatch(r"[\s{}\w+]*", re.sub(r"\$\{[^}]*\}", "", s)) and not re.search(r"[A-Za-zÀ-ÿ]{3,}", re.sub(r"\$\{[^}]*\}", "", s)): return False
    if FR_ACCENT.search(plain): return True
    if re.search(r"fa-(solid|regular|brands)|systems/|icons/|\{\{|\.(webp|png|svg|hbs|json|mjs)\b", plain): return False
    if re.fullmatch(r"[\w.\-/:#@\[\]]+", st):
        # un seul mot : traduit s'il commence par une majuscule et n'est pas un identifiant de Foundry
        if re.fullmatch(r"[A-ZÀ-Ü][a-zà-ÿ]+(?:[-'][A-Za-zà-ÿ]+)*[.!?]?", st) and st not in IDENT: return True
        return False
    if re.fullmatch(r"([a-z0-9-]+\s+)*[a-z0-9-]+", st) and "-" in st: return False   # listes de classes CSS
    if FR_WORDS.search(plain) or re.search(r"\b[dlnsjm]'|\bqu'", plain, re.I): return True
    if " " in st and re.search(r"[A-Za-z]{3,}", st):
        REJECTED.append(st); return True
    return False


class Lexer:
    """Parcourt le source JS et rend la liste des littéraux (début, fin, type, portée)."""
    def __init__(self, src):
        self.s = src; self.i = 0; self.out = []
        self.stack = []   # 'obj' | 'block' | 'class' | 'tpl'
        self.last = ""    # dernier jeton significatif

    def in_function(self):
        return "block" in self.stack

    def scan(self, end_on_brace=False):
        s = self.s
        while self.i < len(s):
            c = s[self.i]
            if s.startswith("//", self.i):
                j = s.find("\n", self.i); self.i = len(s) if j < 0 else j; continue
            if s.startswith("/*", self.i):
                j = s.find("*/", self.i + 2); self.i = len(s) if j < 0 else j + 2; continue
            if c in "\"'":
                j = self.i + 1
                while j < len(s) and s[j] != c:
                    j += 2 if s[j] == "\\" else 1
                self.out.append((self.i, j + 1, "str", self.in_function(), self.last))
                self.i = j + 1; self.last = "str"; continue
            if c == "`":
                start = self.i; self.i += 1; exprs = []
                while self.i < len(s) and s[self.i] != "`":
                    if s[self.i] == "\\": self.i += 2; continue
                    if s.startswith("${", self.i):
                        es = self.i + 2; self.i += 2
                        self.stack.append("tpl")
                        self.scan(end_on_brace=True)
                        self.stack.pop()
                        exprs.append((es, self.i)); self.i += 1; continue
                    self.i += 1
                self.out.append((start, self.i + 1, "tpl", self.in_function(), self.last, exprs))
                self.i += 1; self.last = "str"; continue
            if c == "/" and self.last in ("", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "return", "op"):
                # littéral regex
                j = self.i + 1; cls = False
                while j < len(s):
                    if s[j] == "\\": j += 2; continue
                    if s[j] == "[": cls = True
                    elif s[j] == "]": cls = False
                    elif s[j] == "/" and not cls: break
                    elif s[j] == "\n": break
                    j += 1
                self.i = j + 1
                while self.i < len(s) and s[self.i].isalpha(): self.i += 1
                self.last = "regex"; continue
            if c == "{":
                prev = s[:self.i].rstrip()
                if re.search(r"(\)|=>|\belse|\btry|\bfinally|\bdo|\bstatic)$", prev): kind = "block"
                elif re.search(r"\bclass\s+[\w$]+(\s+extends\s+[^{]+)?$", prev): kind = "class"
                elif self.stack and self.stack[-1] == "class": kind = "block"   # méthode
                else: kind = "obj"
                self.stack.append(kind); self.i += 1; self.last = "{"; continue
            if c == "}":
                if end_on_brace and self.stack and self.stack[-1] == "tpl": return
                if self.stack: self.stack.pop()
                self.i += 1; self.last = "}"; continue
            if c.isalnum() or c in "_$":
                m = re.match(r"[\w$]+", s[self.i:]); w = m.group(0)
                self.i += len(w); self.last = "return" if w in ("return", "typeof", "case", "in", "of") else "id"; continue
            if c in "(),=:[!&|?;":
                self.last = c if c in "(,=:[!&|?;" else ")"; self.i += 1; continue
            if c in "+-*%<>~^":
                self.last = "op"; self.i += 1; continue
            if c == ")" or c == "]":
                self.last = ")"; self.i += 1; continue
            self.i += 1


def var_name(expr, used):
    e = expr.strip()
    m = re.fullmatch(r"(?:[\w$]+\.)*([\w$]+)", e)
    n = m.group(1) if m else f"p{len(used)}"
    base, k = n, 2
    while n in used and used[n] != e: n, k = f"{base}{k}", k + 1
    used[n] = e
    return n


def process_file(path):
    src = open(path).read()
    lx = Lexer(src); lx.scan()
    edits = []
    for lit in lx.out:
        start, end, kind, infn, prev = lit[:5]
        raw = src[start:end]
        # contexte : clé d'objet ? comparaison ? import ?
        after = src[end:end + 3].lstrip()[:1]
        before = src[max(0, start - 12):start]
        if after == ":" and kind == "str" and not re.search(r"\?\s*$", before): continue   # clé d'objet (pas un ternaire)
        if re.search(r"(from|import)\s*$", before): continue
        if kind == "str":
            body = raw[1:-1]
            try: text = json.loads('"' + body.replace('\\\'', "'").replace('"', '\\"') + '"') if raw[0] == "'" else json.loads(raw)
            except Exception: text = body
            if not is_french(text): continue
            if re.search(r"(===|!==|==|!=)\s*$", before) or src[end:end + 6].lstrip().startswith(("===", "!==")):
                REPORT.append(f"{path}: comparaison {raw}"); continue
            k = key_for(text)
            edits.append((start, end, f'loc("{k}")' if infn else f'"{k}"'))
        else:
            exprs = lit[5]
            text = raw[1:-1]
            if not is_french(text): continue
            used, fmt, pos = {}, "", start + 1
            for es, ee in exprs:
                fmt += src[pos:es - 2]
                code = src[es:ee]
                fmt += "{" + var_name(code, used) + "}"
                pos = ee + 1
            fmt += src[pos:end - 1]
            if any(re.search(r"`", src[es:ee]) for es, ee in exprs):
                # sous-gabarits : on les laisse en place via des variables, traités au passage suivant
                pass
            if not infn:
                if exprs: REPORT.append(f"{path}: gabarit au niveau module {raw[:80]}"); continue
                k = key_for(fmt.replace("\\`", "`"))
                edits.append((start, end, f'"{k}"')); continue
            k = key_for(fmt.replace("\\`", "`").replace("\\$", "$"))
            if used:
                args = ", ".join(n if n == e else f"{n}: {e}" for n, e in used.items())
                edits.append((start, end, f'loc("{k}", {{ {args} }})'))
            else:
                edits.append((start, end, f'loc("{k}")'))
    # appliquer de la fin vers le début, en ignorant les littéraux imbriqués déjà couverts
    edits.sort(key=lambda e: e[0])
    final, last_end = [], -1
    for e in edits:
        if e[0] < last_end: continue   # imbriqué dans un gabarit remplacé : l'expression garde son code
        final.append(e); last_end = e[1]
    new = src
    for s0, e0, rep in reversed(final):
        new = new[:s0] + rep + new[e0:]
    if final and "loc(" in "".join(r for _, _, r in final) and not re.search(r"import \{[^}]*\bloc\b", new) and not path.endswith("i18n.mjs"):
        rel = os.path.relpath(os.path.join(ROOT, "module", "i18n.mjs"), os.path.dirname(path))
        if not rel.startswith("."): rel = "./" + rel
        lines = new.split("\n")
        idx = 0
        for n, l in enumerate(lines):
            if l.startswith("import "): idx = n + 1
        lines.insert(idx, f'import {{ loc }} from "{rel}";')
        new = "\n".join(lines)
    return src, new, len(final)


if __name__ == "__main__":
    data = json.load(open(LANG))
    for k, v in data.get("NOCTIS", {}).get("js", {}).items():
        STRINGS["NOCTIS.js." + k] = v; KEYS.setdefault(v, "NOCTIS.js." + k)
    files = [os.path.join(ROOT, "noctis.mjs")]
    for d, _, fs in os.walk(os.path.join(ROOT, "module")):
        files += [os.path.join(d, f) for f in fs if f.endswith(".mjs") and f not in SKIP_FILES]
    for f in sorted(files):
        src, new, n = process_file(f)
        if n and not DRY: open(f, "w").write(new)
        print(f"{os.path.relpath(f, ROOT)} : {n}")
    if not DRY:
        js = data["NOCTIS"].setdefault("js", {})
        for k, v in STRINGS.items(): js[k[len("NOCTIS.js."):]] = v
        json.dump(data, open(LANG, "w"), ensure_ascii=False, indent=2)
    print(len(STRINGS), "chaînes")
    open("/tmp/i18n_report.txt", "w").write("\n".join(REPORT))
    print(len(REPORT), "à revoir")
    open("/tmp/i18n_rejected.txt", "w").write("\n".join(sorted(set(REJECTED))))
