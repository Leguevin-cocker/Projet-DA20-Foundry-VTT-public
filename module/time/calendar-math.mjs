/**
 * Calendrier julien (en usage en Europe au Moyen Âge), lune, soleil et fêtes.
 * Le temps absolu est compté en minutes depuis le jour julien 0.
 */

export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const isLeap = (y) => y % 4 === 0;
export const monthLength = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

/** Jour julien d'une date du calendrier julien. */
export function toJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - 32083;
}

/** Date julienne d'un jour julien. */
export function fromJdn(j) {
  const c = j + 32082;
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return { day: e - Math.floor((153 * m + 2) / 5) + 1, month: m + 3 - 12 * Math.floor(m / 10), year: d - 4800 + Math.floor(m / 10) };
}

/** 0 = dimanche. */
export const weekday = (jdn) => (jdn + 1) % 7;

/** Phase de la lune : âge 0-1 (0 = nouvelle lune). */
export function moonAge(jdn) {
  const age = ((jdn - 2451550.1) / 29.530588853) % 1;
  return age < 0 ? age + 1 : age;
}

const MOON_PHASES = [
  { icon: "🌑", label: "Nouvelle lune" }, { icon: "🌒", label: "Premier croissant" },
  { icon: "🌓", label: "Premier quartier" }, { icon: "🌔", label: "Lune gibbeuse croissante" },
  { icon: "🌕", label: "Pleine lune" }, { icon: "🌖", label: "Lune gibbeuse décroissante" },
  { icon: "🌗", label: "Dernier quartier" }, { icon: "🌘", label: "Dernier croissant" }
];
export function moonPhase(jdn) {
  const age = moonAge(jdn + 0.5);
  const i = Math.floor(age * 8 + 0.5) % 8;
  // « Jour remarquable » : la phase principale tombe ce jour-là
  const prev = Math.floor(moonAge(jdn - 0.5) * 8 + 0.5) % 8;
  return { ...MOON_PHASES[i], index: i, marked: i % 2 === 0 && prev !== i, illumination: Math.round((1 - Math.cos(age * 2 * Math.PI)) / 2 * 100) };
}

/**
 * Lever et coucher du soleil (heure solaire, en heures décimales) pour une latitude.
 * Indépendant du calendrier : on part du solstice d'hiver de référence.
 */
export function sunTimes(jdn, lat = 46) {
  const angle = 2 * Math.PI * (jdn - 2451900) / 365.2422; // 21 déc. 2000 ≈ solstice
  const decl = -23.44 * Math.cos(angle) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  // −0,833° : réfraction et demi-disque
  const h0 = -0.833 * Math.PI / 180;
  const cosH = (Math.sin(h0) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * 180 / Math.PI / 15;
  return { rise: 12 - H, set: 12 + H, dayLength: 2 * H };
}

export function fmtHour(h) {
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh += 1; mm = 0; }
  return `${hh % 24} h ${String(mm).padStart(2, "0")}`;
}

/** Pâques (comput julien). */
export function easter(y) {
  const a = y % 4, b = y % 7, c = y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return toJdn(y, month, day);
}

const FIXED_FEASTS = {
  "1-1": "Circoncision du Seigneur", "1-6": "Épiphanie", "2-2": "Chandeleur", "3-25": "Annonciation",
  "4-23": "Saint-Georges", "6-24": "Saint-Jean-Baptiste", "6-29": "Saints Pierre et Paul", "8-15": "Assomption",
  "8-20": "Saint-Étienne de Hongrie", "9-29": "Saint-Michel", "11-1": "Toussaint", "11-2": "Jour des morts",
  "11-11": "Saint-Martin", "12-6": "Saint-Nicolas", "12-25": "Noël", "12-28": "Saints Innocents"
};

/** Fêtes du jour (fixes et mobiles). */
export function feasts(jdn) {
  const { year, month, day } = fromJdn(jdn);
  const out = [];
  if (FIXED_FEASTS[`${month}-${day}`]) out.push(FIXED_FEASTS[`${month}-${day}`]);
  const e = easter(year);
  const movable = { [e - 46]: "Mercredi des Cendres", [e - 7]: "Rameaux", [e - 2]: "Vendredi saint", [e]: "Pâques", [e + 39]: "Ascension", [e + 49]: "Pentecôte" };
  if (movable[jdn]) out.push(movable[jdn]);
  return out;
}

export const MIN_PER_DAY = 1440;

/** Temps absolu (minutes) ↔ date et heure. */
export function toAbs(t) { return toJdn(t.year, t.month, t.day) * MIN_PER_DAY + Math.round((t.hour ?? 0) * 60 + (t.minute ?? 0)); }
export function fromAbs(abs) {
  const jdn = Math.floor(abs / MIN_PER_DAY);
  const rest = abs - jdn * MIN_PER_DAY;
  return { ...fromJdn(jdn), hour: Math.floor(rest / 60), minute: rest % 60, jdn };
}

export function longDate(y, m, d) {
  const j = toJdn(y, m, d);
  const wd = WEEKDAYS[weekday(j)];
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d === 1 ? "1er" : d} ${MONTHS[m - 1]} ${y}`;
}

/** Ajoute des années, mois et jours à une date (fin de mois bornée). */
export function addDate({ year, month, day }, { years = 0, months = 0, days = 0 }) {
  let y = year + years, m = month + months;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  const d = Math.min(day, monthLength(y, m));
  return fromJdn(toJdn(y, m, d) + days);
}

/** Durée lisible entre deux temps absolus. */
export function fmtDuration(minutes) {
  const days = Math.floor(minutes / MIN_PER_DAY);
  if (days >= 730) return `${Math.floor(days / 365.25)} ans`;
  if (days >= 60) return `${Math.floor(days / 30.4)} mois`;
  if (days >= 2) return `${days} jours`;
  const h = Math.floor(minutes / 60), mn = minutes % 60;
  return h ? `${h} h${mn ? ` ${String(mn).padStart(2, "0")}` : ""}` : `${mn} min`;
}
