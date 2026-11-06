import { loc } from "../i18n.mjs";
/** Helpers Handlebars du système. */
export function registerHandlebars() {
  const H = Handlebars;

  /**
   * Rangée de points cliquables.
   * {{{noctisDots value=3 max=5 path="system.attributes.strength.value" mod=1 free=false min=0}}}
   */
  H.registerHelper("noctisDots", function (options) {
    const h = options.hash;
    const value = Number(h.value) || 0;
    const mod = Number(h.mod) || 0;
    const max = Math.max(5, Number(h.max) || 5, value + Math.max(0, mod));
    const locked = !!h.locked;
    let out = `<span class="noctis-dots${locked ? " locked" : ""}${max > 5 ? " wide" : ""}" data-path="${h.path ?? ""}" data-value="${value}" data-free="${!!h.free}"${h.min !== undefined ? ` data-min="${h.min}"` : ""}>`;
    for (let i = 1; i <= max; i++) {
      let cls = "dot";
      if (i <= value) cls += " filled";
      else if (mod > 0 && i <= value + mod) cls += " bonus";
      if (mod < 0 && i > value + mod && i <= value) cls += " malus";
      if (i === 6) cls += " sep";
      out += `<span class="${cls}"${locked ? "" : ` data-action="setDots" data-dot="${i}"`}></span>`;
    }
    out += "</span>";
    return new H.SafeString(out);
  });


  /** Carte d'atout / handicap du créateur. */
  H.registerPartial("mfCard", `<article class="mf-card {{kind}} {{#if checked}}on{{/if}}" data-action="toggleMF" data-kind="{{kind}}" data-id="{{id}}">
    <header><span class="mf-check"><i class="fa-regular {{#if checked}}fa-square-check{{else}}fa-square{{/if}}"></i></span><b class="mf-name">{{name}}</b>
      {{#if multi}}<span class="mf-cost">{{costText}} pts</span>{{else}}<span class="mf-cost">{{cost}} pt{{#if (noctisGt cost 1)}}s{{/if}}</span>{{/if}}</header>
    {{#if multi}}<div class="mf-levels">{{#each levels}}<button type="button" class="mf-lv {{#if active}}active{{/if}}" data-action="toggleMF" data-kind="{{../kind}}" data-id="{{../id}}" data-level="{{value}}" data-tooltip="{{text}}">{{value}}</button>{{/each}}</div>
      {{#if levelText}}<p class="mf-level-text"><b>{{localize "NOCTIS.ui.NiveauColon" level=level}}</b> {{levelText}}</p>{{/if}}{{/if}}
    <details><summary>{{short}}</summary><p>{{desc}}</p></details>
  </article>`);

  H.registerHelper("noctisMfIcon", (c) => ({ physical: "💪", mental: "🧠", social: "👄", supernatural: "⛤" }[c] ?? "•"));
  H.registerHelper("noctisEq", (a, b) => a === b);
  H.registerHelper("noctisPct", (a, b) => Math.max(0, Math.min(100, Math.round((Number(a) || 0) / (Number(b) || 1) * 100))));
  H.registerHelper("noctisGt", (a, b) => Number(a) > Number(b));
  H.registerHelper("noctisAbs", (n) => Math.abs(Number(n) || 0));
  H.registerHelper("noctisOr", (...args) => args.slice(0, -1).some(Boolean));
  H.registerHelper("noctisAnd", (...args) => args.slice(0, -1).every(Boolean));
  H.registerHelper("noctisNot", (a) => !a);
  H.registerHelper("noctisSum", (...args) => args.slice(0, -1).reduce((a, b) => a + (Number(b) || 0), 0));
  H.registerHelper("noctisJson", (a) => JSON.stringify(a));
  H.registerHelper("noctisSigned", (n) => (Number(n) > 0 ? `+${n}` : `${n}`));
  H.registerHelper("noctisLower", (s) => String(s ?? "").toLowerCase());

  /** <option> à partir d'un objet {clé: libellé}. */
  H.registerHelper("noctisOptions", function (choices, selected) {
    let out = "";
    for (const [k, v] of Object.entries(choices ?? {})) {
      out += `<option value="${H.escapeExpression(k)}"${String(k) === String(selected ?? "") ? " selected" : ""}>${H.escapeExpression(v)}</option>`;
    }
    return new H.SafeString(out);
  });
}
