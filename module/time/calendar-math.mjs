import { loc, registerLocalizable } from "../i18n.mjs";
/**
 * Calendrier julien (en usage en Europe au Moyen Âge), lune, soleil et fêtes.
 * Le temps absolu est compté en minutes depuis le jour julien 0.
 */

export const MONTHS = ["NOCTIS.js.Month1", "NOCTIS.js.Month2", "NOCTIS.js.Month3", "NOCTIS.js.Month4", "NOCTIS.js.Month5", "NOCTIS.js.Month6", "NOCTIS.js.Month7", "NOCTIS.js.Month8", "NOCTIS.js.Month9", "NOCTIS.js.Month10", "NOCTIS.js.Month11", "NOCTIS.js.Month12"];
export const MONTHS_SHORT = ["NOCTIS.js.MonthShort1", "NOCTIS.js.MonthShort2", "NOCTIS.js.MonthShort3", "NOCTIS.js.MonthShort4", "NOCTIS.js.MonthShort5", "NOCTIS.js.MonthShort6", "NOCTIS.js.MonthShort7", "NOCTIS.js.MonthShort8", "NOCTIS.js.MonthShort9", "NOCTIS.js.MonthShort10", "NOCTIS.js.MonthShort11", "NOCTIS.js.MonthShort12"];
export const WEEKDAYS = ["NOCTIS.js.Weekday0", "NOCTIS.js.Weekday1", "NOCTIS.js.Weekday2", "NOCTIS.js.Weekday3", "NOCTIS.js.Weekday4", "NOCTIS.js.Weekday5", "NOCTIS.js.Weekday6"];
export const WEEKDAYS_SHORT = ["NOCTIS.js.Lun", "NOCTIS.js.Mar", "NOCTIS.js.Mer", "NOCTIS.js.Jeu", "NOCTIS.js.Ven", "NOCTIS.js.Sam", "NOCTIS.js.Dim"];

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
  { icon: "🌑", label: "NOCTIS.js.NouvelleLune" }, { icon: "🌒", label: "NOCTIS.js.PremierCroissant" },
  { icon: "🌓", label: "NOCTIS.js.PremierQuartier" }, { icon: "🌔", label: "NOCTIS.js.LuneGibbeuseCroissante" },
  { icon: "🌕", label: "NOCTIS.js.PleineLune" }, { icon: "🌖", label: "NOCTIS.js.LuneGibbeuseDecroissante" },
  { icon: "🌗", label: "NOCTIS.js.DernierQuartier" }, { icon: "🌘", label: "NOCTIS.js.DernierCroissant" }
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
  "1-1": "NOCTIS.js.CirconcisionDuSeigneur", "1-6": "NOCTIS.js.Epiphanie", "2-2": "NOCTIS.js.Chandeleur", "3-25": "NOCTIS.js.Annonciation",
  "4-23": "NOCTIS.js.SaintGeorges", "6-24": "NOCTIS.js.SaintJeanBaptiste", "6-29": "NOCTIS.js.SaintsPierreEtPaul", "8-15": "NOCTIS.js.Assomption",
  "8-20": "NOCTIS.js.SaintEtienneDeHongrie", "9-29": "NOCTIS.js.SaintMichel", "11-1": "NOCTIS.js.Toussaint", "11-2": "NOCTIS.js.JourDesMorts",
  "11-11": "NOCTIS.js.SaintMartin", "12-6": "NOCTIS.js.SaintNicolas", "12-25": "NOCTIS.js.Noel", "12-28": "NOCTIS.js.SaintsInnocents"
};

/** Fêtes du jour (fixes et mobiles). */
export function feasts(jdn) {
  const { year, month, day } = fromJdn(jdn);
  const out = [];
  if (FIXED_FEASTS[`${month}-${day}`]) out.push(FIXED_FEASTS[`${month}-${day}`]);
  const e = easter(year);
  const movable = { [e - 46]: loc("NOCTIS.js.MercrediDesCendres"), [e - 7]: loc("NOCTIS.js.Rameaux"), [e - 2]: loc("NOCTIS.js.VendrediSaint"), [e]: loc("NOCTIS.js.Paques"), [e + 39]: loc("NOCTIS.js.Ascension"), [e + 49]: loc("NOCTIS.js.Pentecote") };
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
  return loc("NOCTIS.js.LongDate", { weekday: `${wd.charAt(0).toUpperCase()}${wd.slice(1)}`, day: dayLabel(d), month: MONTHS[m - 1], year: y });
}

/** « 1er » en français, « 1 » en anglais. */
export function dayLabel(d) { return d === 1 ? loc("NOCTIS.js.DayFirst") : String(d); }

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

registerLocalizable(MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT, MOON_PHASES, FIXED_FEASTS);
