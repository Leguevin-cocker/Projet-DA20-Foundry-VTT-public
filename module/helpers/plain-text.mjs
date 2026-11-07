/**
 * Champs de texte simples (comme les résumés de pouvoirs) pour les descriptions et notes,
 * stockées en HTML pour l'affichage ailleurs (panneau, chat).
 */

/** HTML -> texte brut (paragraphes et retours à la ligne conservés). */
export function htmlToText(html) {
  if (!html) return "";
  const prepared = String(html)
    .replace(/\r/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ");
  const el = document.createElement("div");
  el.innerHTML = prepared;
  return (el.textContent ?? "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Texte brut -> HTML : un paragraphe par bloc, <br> pour les retours simples. */
export function textToHtml(text) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return String(text ?? "").replace(/\r/g, "").trim().split(/\n{2,}/).filter(b => b.trim())
    .map(b => `<p>${esc(b.trim()).replace(/\n/g, "<br>")}</p>`).join("");
}

/**
 * Dans les données d'un formulaire : remplace le champ texte `field` par `path` en HTML,
 * seulement si le texte a changé (on garde la mise en forme d'origine sinon).
 */
export function applyPlainText(data, field, path, currentHtml) {
  if (!(field in data)) return;
  const text = data[field];
  delete data[field];
  if (text.replace(/\s+/g, " ").trim() === htmlToText(currentHtml).replace(/\s+/g, " ").trim()) return;
  foundry.utils.setProperty(data, path, textToHtml(text));
}
