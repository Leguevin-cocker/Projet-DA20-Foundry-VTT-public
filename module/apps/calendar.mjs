/**
 * Calendrier de la chronique : vue du mois, détail du jour, chronologie des événements révélés.
 * Le MJ voit tout (événements cachés compris), règle le temps et révèle les événements au fil du jeu.
 * Les joueurs voient les événements révélés et peuvent ajouter leurs propres souvenirs.
 */
import * as C from "../time/calendar-math.mjs";
import * as T from "../time/time.mjs";
import { playerCharacters } from "./xp-ledger.mjs";
import { hasStatus } from "../status.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

export class ChronicleCalendar extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "noctis-calendar",
    tag: "div",
    classes: ["noctis", "noctis-window", "noctis-calendar", "player-view"],
    window: { title: "Chronique — vue des joueurs", icon: "fa-solid fa-calendar-days", resizable: true },
    position: { width: 1040, height: 760 },
    actions: {
      calTab: ChronicleCalendar.#onTab,
      prev: ChronicleCalendar.#onPrev,
      next: ChronicleCalendar.#onNext,
      prevYear: ChronicleCalendar.#onPrevYear,
      nextYear: ChronicleCalendar.#onNextYear,
      today: ChronicleCalendar.#onToday,
      pick: ChronicleCalendar.#onPick,
      addEvent: ChronicleCalendar.#onAddEvent,
      editEvent: ChronicleCalendar.#onEditEvent,
      deleteEvent: ChronicleCalendar.#onDeleteEvent,
      toggleReveal: ChronicleCalendar.#onToggleReveal,
      advance: ChronicleCalendar.#onAdvance,
      nextNight: ChronicleCalendar.#onNextNight,
      ellipse: ChronicleCalendar.#onEllipse,
      setDate: ChronicleCalendar.#onSetDate,
      setToday: ChronicleCalendar.#onSetToday,
      filterCat: ChronicleCalendar.#onFilterCat,
      gotoMonth: ChronicleCalendar.#onGotoMonth,
      gotoYear: ChronicleCalendar.#onGotoYear
    }
  };

  static PARTS = { body: { template: "systems/noctis/templates/apps/calendar.hbs", scrollable: [".cal-side-body", ".timeline", ".cal-yearlist"] } };

  /** Vue du MJ (tous les événements, réglage du temps) ou vue des joueurs (seulement ce qui est révélé). */
  static GM_VIEW = false;
  get gmView() { return this.constructor.GM_VIEW && game.user.isGM; }

  constructor(options = {}) {
    super(options);
    const t = T.getTime();
    this.view = { year: t.year, month: t.month };
    this.sel = { year: t.year, month: t.month, day: t.day };
    this.tab = "month";
    this.catFilter = null;
    this.search = "";
  }

  static open(date) {
    if (this.GM_VIEW && !game.user.isGM) return ui.notifications.warn("La vue du MJ est réservée au conteur.");
    const app = foundry.applications.instances?.get?.(this.DEFAULT_OPTIONS.id) ?? new this();
    if (date?.year) { app.view = { year: date.year, month: date.month }; app.sel = { ...date }; app.tab = "month"; }
    return app.render({ force: true });
  }

  refresh() { if (this.rendered) this.render(); }

  async _prepareContext() {
    const now = T.describeNow();
    const isGM = this.gmView;
    const events = isGM ? T.getEvents() : T.getEvents().filter(e => e.revealed);
    const byDay = new Map();
    for (const e of events) {
      if ((e.precision ?? "day") !== "day") continue;
      const k = `${e.year}-${e.month}-${e.day}`;
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }
    const cat = (e) => T.CATEGORIES[e.category] ?? T.CATEGORIES.other;
    const decorate = (e) => ({ ...e, cat: cat(e), dateLabel: T.eventDateLabel(e), hidden: !e.revealed, approx: (e.precision ?? "day") !== "day" });

    // Grille du mois (semaine du lundi au dimanche)
    const { year, month } = this.view;
    const first = C.toJdn(year, month, 1);
    const offset = (C.weekday(first) + 6) % 7;
    const len = C.monthLength(year, month);
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push({ empty: true });
    for (let d = 1; d <= len; d++) {
      const j = first + d - 1;
      const evs = (byDay.get(`${year}-${month}-${d}`) ?? []).map(decorate);
      const moon = C.moonPhase(j);
      cells.push({
        day: d, jdn: j, events: evs.slice(0, 3), more: Math.max(0, evs.length - 3), count: evs.length,
        today: now.year === year && now.month === month && now.day === d,
        selected: this.sel.year === year && this.sel.month === month && this.sel.day === d,
        past: j < now.jdn, moon: moon.marked ? moon : null, feast: C.feasts(j)[0] ?? ""
      });
    }
    while (cells.length % 7) cells.push({ empty: true });

    // Détail du jour choisi
    const sj = C.toJdn(this.sel.year, this.sel.month, this.sel.day);
    const sun = C.sunTimes(sj, game.settings.get("noctis", "latitude"));
    const selEvents = (byDay.get(`${this.sel.year}-${this.sel.month}-${this.sel.day}`) ?? []).map(decorate);
    const day = {
      label: C.longDate(this.sel.year, this.sel.month, this.sel.day), moon: C.moonPhase(sj),
      sunrise: C.fmtHour(sun.rise), sunset: C.fmtHour(sun.set), night: C.fmtDuration(Math.round((24 - sun.dayLength) * 60)),
      feasts: C.feasts(sj), events: selEvents, isToday: sj === now.jdn,
      relative: sj === now.jdn ? "aujourd'hui" : (sj < now.jdn ? `il y a ${C.fmtDuration((now.jdn - sj) * C.MIN_PER_DAY)}` : `dans ${C.fmtDuration((sj - now.jdn) * C.MIN_PER_DAY)}`)
    };

    // Événements sans jour précis : ce mois-ci (mois, saison) et cette année-là (année, plage, décennie)
    const inMonth = (e) => (e.precision === "month" && e.year === year && e.month === month) || (e.precision === "season" && e.year === year && ({ spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], winter: [12, 1, 2] }[e.season] ?? []).includes(month));
    const inYear = (e) => ["year", "decade"].includes(e.precision) && year >= e.year && year <= (e.endYear ?? (e.precision === "decade" ? e.year + 9 : e.year));
    const monthEvents = events.filter(inMonth).map(decorate);
    const yearEvents = events.filter(inYear).map(decorate);

    // Chronologie
    const q = this.search.trim().toLowerCase();
    const filtered = events
      .filter(e => !this.catFilter || e.category === this.catFilter)
      .filter(e => !q || `${e.title} ${e.text}`.toLowerCase().includes(q))
      .map(decorate)
      .sort((a, b) => T.eventJdn(a) - T.eventJdn(b));
    const years = [];
    let nowPlaced = false;
    for (const e of filtered) {
      const j = T.eventJdn(e);
      if (!nowPlaced && j > now.jdn) { nowPlaced = true; e.nowBefore = true; }
      let y = years.at(-1);
      if (!y || y.year !== e.year) { y = { year: e.year, events: [] }; years.push(y); }
      e.monthLabel = e.approx ? e.dateLabel : `${e.day === 1 ? "1er" : e.day} ${C.MONTHS[e.month - 1]}`;
      y.events.push(e);
    }

    // Dormeurs (MJ)
    const sleepers = isGM ? game.actors.filter(a => hasStatus(a, "torpor") || a.getFlag("noctis", "torpor")).map(a => ({ name: a.name, img: a.img, info: T.torporInfo(a) })) : [];

    // Vue de l'année : douze petits mois
    const vy = this.view.year;
    const countDay = new Map();
    for (const e of events) if ((e.precision ?? "day") === "day" && e.year === vy) {
      const k = `${e.month}-${e.day}`;
      if (!countDay.has(k)) countDay.set(k, []);
      countDay.get(k).push(cat(e).color);
    }
    const yearMonths = C.MONTHS.map((name, i) => {
      const m = i + 1, f = C.toJdn(vy, m, 1), off = (C.weekday(f) + 6) % 7;
      const days = Array.from({ length: off }, () => ({ empty: true }));
      for (let d = 1; d <= C.monthLength(vy, m); d++) {
        const cols = countDay.get(`${m}-${d}`) ?? [];
        days.push({ day: d, month: m, year: vy, count: cols.length, color: cols[0] ?? "", today: now.year === vy && now.month === m && now.day === d });
      }
      const n = events.filter(e => e.year === vy && ((e.precision ?? "day") === "day" || ["month"].includes(e.precision)) && e.month === m).length;
      return { name, month: m, days, count: n, current: now.year === vy && now.month === m };
    });
    const overlaps = (e, y) => y >= e.year && y <= (e.endYear ?? (e.precision === "decade" ? e.year + 9 : e.year));
    const yearList = events.filter(e => overlaps(e, vy)).map(decorate).sort((a, b) => T.eventJdn(a) - T.eventJdn(b));

    // Vue du siècle : cent années, colorées selon le nombre d'événements
    const c0 = Math.floor((vy - 1) / 100) * 100 + 1;
    const perYear = new Map();
    for (const e of events) {
      const end = Math.min(e.endYear ?? (e.precision === "decade" ? e.year + 9 : e.year), c0 + 99);
      for (let y = Math.max(e.year, c0); y <= end; y++) perYear.set(y, (perYear.get(y) ?? 0) + 1);
    }
    const max = Math.max(1, ...perYear.values());
    const decades = [];
    for (let d = 0; d < 10; d++) {
      const yrs = [];
      for (let k = 0; k < 10; k++) {
        const y = c0 + d * 10 + k, n = perYear.get(y) ?? 0;
        yrs.push({ year: y, count: n, heat: n ? Math.ceil(n / max * 4) : 0, now: y === now.year, view: y === vy });
      }
      decades.push({ label: `${c0 + d * 10}-${c0 + d * 10 + 9}`, years: yrs, count: yrs.reduce((a, b) => a + b.count, 0) });
    }
    const roman = (n) => [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]].reduce((acc, [r, v]) => { while (n >= v) { acc += r; n -= v; } return acc; }, "");
    const centuryNum = Math.floor((vy - 1) / 100) + 1;
    const centuryList = events.filter(e => e.year >= c0 && e.year <= c0 + 99).map(decorate).sort((a, b) => T.eventJdn(a) - T.eventJdn(b));

    const navLabel = { month: `${C.MONTHS[month - 1].charAt(0).toUpperCase()}${C.MONTHS[month - 1].slice(1)} ${year}`, year: `${vy}`, century: `${roman(centuryNum)}e siècle`, timeline: "" }[this.tab];
    return {
      gmView: isGM, centuryRange: `${c0} – ${c0 + 99}`, navLabel, isYear: this.tab === "year", isCentury: this.tab === "century",
      yearMonths, yearList, decades, centuryList, centuryCount: centuryList.length,
      isGM, now, tab: this.tab, isMonth: this.tab === "month", isTimeline: this.tab === "timeline",
      monthLabel: `${C.MONTHS[month - 1]} ${year}`, weekdays: C.WEEKDAYS_SHORT, cells, day, monthEvents, yearEvents, viewYear: year, viewMonthName: C.MONTHS[month - 1],
      years, hasTimeline: years.length > 0, search: this.search,
      categories: Object.entries(T.CATEGORIES).map(([key, v]) => ({ key, ...v, active: this.catFilter === key })),
      catFilter: this.catFilter, sleepers, hasSleepers: sleepers.length > 0,
      hiddenCount: isGM ? T.getEvents().filter(e => !e.revealed).length : 0
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const s = this.element.querySelector("input[name=search]");
    if (s) s.addEventListener("input", foundry.utils.debounce(ev => { this.search = ev.target.value; this.render(); }, 300));
  }

  /* ---- Navigation ---- */
  static #onTab(event, target) { this.tab = target.dataset.tab; this.render(); }
  static #shift(app, months) {
    let { year, month } = app.view;
    month += months;
    while (month > 12) { month -= 12; year++; }
    while (month < 1) { month += 12; year--; }
    app.view = { year, month };
    app.render();
  }
  static #step(app, dir, big = false) {
    const k = { month: big ? 12 : 1, year: big ? 120 : 12, century: big ? 12000 : 1200 }[app.tab] ?? 1;
    ChronicleCalendar.#shift(app, dir * k);
  }
  static #onPrev() { ChronicleCalendar.#step(this, -1); }
  static #onNext() { ChronicleCalendar.#step(this, 1); }
  static #onPrevYear() { ChronicleCalendar.#step(this, -1, true); }
  static #onNextYear() { ChronicleCalendar.#step(this, 1, true); }
  static #onGotoMonth(event, target) {
    this.view = { year: Number(target.dataset.year ?? this.view.year), month: Number(target.dataset.month) };
    this.tab = "month";
    this.render();
  }
  static #onGotoYear(event, target) {
    this.view = { year: Number(target.dataset.year), month: this.view.month };
    this.tab = "year";
    this.render();
  }
  static #onToday() {
    const t = T.getTime();
    this.view = { year: t.year, month: t.month };
    this.sel = { year: t.year, month: t.month, day: t.day };
    this.tab = "month";
    this.render();
  }
  static #onPick(event, target) {
    const d = target.closest("[data-day]");
    const y = Number(d.dataset.year ?? this.view.year), m = Number(d.dataset.month ?? this.view.month);
    this.sel = { year: y, month: m, day: Number(d.dataset.day) };
    if (d.dataset.year) { this.view = { year: y, month: m }; this.tab = "month"; }
    this.render();
  }
  static #onFilterCat(event, target) {
    const k = target.dataset.cat;
    this.catFilter = this.catFilter === k ? null : k;
    this.render();
  }

  /* ---- Événements ---- */
  static async #eventForm(ev = {}, { player = false } = {}) {
    const cats = Object.entries(T.CATEGORIES).filter(([k]) => !player || k === "memory");
    const date = ev.year ? ev : null;
    const content = `<div class="noctis-mini-form cal-form">
      <label>Titre <input type="text" name="title" value="${foundry.utils.escapeHTML(ev.title ?? "")}" required></label>
      <div class="cal-form-row">
        <label>Jour <input type="number" name="day" min="1" max="31" value="${date?.day ?? ""}"></label>
        <label>Mois <select name="month">${C.MONTHS.map((m, i) => `<option value="${i + 1}" ${date?.month === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select></label>
        <label>Année <input type="number" name="year" value="${date?.year ?? ""}"></label>
      </div>
      ${player ? "" : `<div class="cal-form-row">
        <label>Précision <select name="precision">${[["day", "Jour précis"], ["month", "Mois"], ["season", "Saison"], ["year", "Année (ou plage)"], ["decade", "Décennie"]].map(([k, l]) => `<option value="${k}" ${(ev.precision ?? "day") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Saison <select name="season"><option value="">—</option>${[["spring", "Printemps"], ["summer", "Été"], ["autumn", "Automne"], ["winter", "Hiver"]].map(([k, l]) => `<option value="${k}" ${ev.season === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Jusqu'en <input type="number" name="endYear" value="${ev.endYear ?? ""}" placeholder="année de fin"></label>
      </div>`}
      ${player ? "" : `<label>Catégorie <select name="category">${cats.map(([k, v]) => `<option value="${k}" ${ev.category === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></label>`}
      <label>Récit <textarea name="text" rows="4" placeholder="Ce qui s'est passé, vu par les personnages">${foundry.utils.escapeHTML(ev.text ?? "")}</textarea></label>
      ${player ? "" : `<label>Note du MJ (jamais montrée aux joueurs) <textarea name="gmNote" rows="2">${foundry.utils.escapeHTML(ev.gmNote ?? "")}</textarea></label>
      <label class="check"><input type="checkbox" name="revealed" ${ev.revealed ? "checked" : ""}> Révélé aux joueurs</label>`}
    </div>`;
    return DialogV2.prompt({
      window: { title: ev.id ? "Modifier l'événement" : (player ? "Ajouter un souvenir" : "Nouvel événement"), icon: "fa-solid fa-feather" },
      content,
      ok: { label: "Enregistrer", icon: "fa-solid fa-check", callback: (e, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      rejectClose: false
    }).catch(() => null);
  }

  static async #onAddEvent() {
    const player = !this.gmView;
    const data = await ChronicleCalendar.#eventForm({ ...this.sel, category: player ? "memory" : "other" }, { player });
    if (!data?.title) return;
    await T.addEvent({ title: data.title, text: data.text ?? "", year: Number(data.year), month: Number(data.month), day: Number(data.day),
      category: player ? "memory" : data.category, revealed: player ? true : !!data.revealed, gmNote: data.gmNote ?? "",
      precision: data.precision || "day", season: data.season || undefined, endYear: Number(data.endYear) || undefined });
    if (player) ui.notifications.info("Souvenir envoyé à la chronique.");
  }

  static async #onEditEvent(event, target) {
    const id = target.closest("[data-event-id]").dataset.eventId;
    const ev = T.getEvents().find(e => e.id === id);
    if (!ev) return;
    const data = await ChronicleCalendar.#eventForm(ev);
    if (!data?.title) return;
    await T.updateEvent(id, { title: data.title, text: data.text ?? "", year: Number(data.year), month: Number(data.month), day: Number(data.day) || 1, category: data.category, revealed: !!data.revealed, gmNote: data.gmNote ?? "",
      precision: data.precision || "day", season: data.season || undefined, endYear: Number(data.endYear) || undefined, dateLabel: undefined });
  }

  static async #onDeleteEvent(event, target) {
    const id = target.closest("[data-event-id]").dataset.eventId;
    const ok = await DialogV2.confirm({ window: { title: "Supprimer l'événement" }, content: "<p>Supprimer définitivement cet événement ?</p>", rejectClose: false });
    if (ok) await T.deleteEvent(id);
  }

  static async #onToggleReveal(event, target) {
    const id = target.closest("[data-event-id]").dataset.eventId;
    const ev = T.getEvents().find(e => e.id === id);
    if (ev) await T.updateEvent(id, { revealed: !ev.revealed });
  }

  /* ---- Temps (MJ) ---- */
  static async #onAdvance(event, target) { await T.advance(Number(target.dataset.minutes) || 60); }
  static async #onNextNight() { await T.nextNight(); }
  static async #onSetToday() {
    const s = this.sel;
    const ok = await DialogV2.confirm({ window: { title: "Changer la date" }, content: `<p>Placer la chronique au <b>${C.longDate(s.year, s.month, s.day)}</b>, à la tombée de la nuit ? Aucun effet n'est appliqué (sang, réveils…).</p>`, rejectClose: false });
    if (!ok) return;
    const set = Math.ceil(C.sunTimes(C.toJdn(s.year, s.month, s.day), game.settings.get("noctis", "latitude")).set * 60);
    await T.setDate({ ...s, hour: Math.floor(set / 60), minute: set % 60 });
  }

  static async #onSetDate() {
    const t = T.getTime();
    const data = await DialogV2.prompt({
      window: { title: "Régler la date et l'heure", icon: "fa-solid fa-clock" },
      content: `<div class="noctis-mini-form cal-form"><div class="cal-form-row">
        <label>Jour <input type="number" name="day" min="1" max="31" value="${t.day}"></label>
        <label>Mois <select name="month">${C.MONTHS.map((m, i) => `<option value="${i + 1}" ${t.month === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select></label>
        <label>Année <input type="number" name="year" value="${t.year}"></label></div>
        <div class="cal-form-row"><label>Heure <input type="number" name="hour" min="0" max="23" value="${t.hour}"></label><label>Minutes <input type="number" name="minute" min="0" max="59" step="5" value="${t.minute ?? 0}"></label></div>
        <p class="hint">Calendrier julien, en usage dans l'Europe médiévale. Changer la date n'applique aucun effet.</p></div>`,
      ok: { label: "Valider", icon: "fa-solid fa-check", callback: (e, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      rejectClose: false
    }).catch(() => null);
    if (!data) return;
    const y = Number(data.year) || t.year, m = Math.min(12, Math.max(1, Number(data.month) || 1));
    await T.setDate({ year: y, month: m, day: Math.min(C.monthLength(y, m), Math.max(1, Number(data.day) || 1)), hour: Math.min(23, Math.max(0, Number(data.hour) || 0)), minute: Math.min(59, Math.max(0, Number(data.minute) || 0)) });
    this.view = { year: y, month: m };
  }

  static async #onEllipse() {
    const ghouls = playerCharacters().list.filter(a => a.type === "ghoul");
    const data = await DialogV2.prompt({
      window: { title: "Ellipse", icon: "fa-solid fa-hourglass-half" },
      content: `<div class="noctis-mini-form cal-form">
        <p>Faire passer du temps entre deux histoires. La chronique reprend à la tombée de la nuit du jour d'arrivée.</p>
        <div class="cal-form-row"><label>Années <input type="number" name="years" min="0" value="0"></label><label>Mois <input type="number" name="months" min="0" value="0"></label><label>Jours <input type="number" name="days" min="0" value="0"></label></div>
        <label>Ce qui s'est passé (visible des joueurs) <textarea name="note" rows="2" placeholder="ex. La coterie hiverne à Brasov pendant que la guerre ravage la Moldavie."></textarea></label>
        <label class="check"><input type="checkbox" name="feed" checked> Les vampires se sont nourris : réserves de sang pleines</label>
        <label class="check"><input type="checkbox" name="restoreWP" checked> Volonté entièrement regagnée</label>
        <div class="cal-form-row"><label>XP de la période (par personnage) <input type="number" name="xp" min="0" value="0"></label><label>Motif <input type="text" name="xpLabel" placeholder="Années d'étude et d'intrigues"></label></div>
        ${ghouls.length ? `<fieldset><legend>Goules</legend>${ghouls.map(g => `<label class="check"><input type="checkbox" name="ghoul.${g.id}" checked> ${g.name} a bu de la vitae chaque mois</label>`).join("")}</fieldset>` : ""}
      </div>`,
      ok: { label: "Faire passer le temps", icon: "fa-solid fa-hourglass-half", callback: (e, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      rejectClose: false
    }).catch(() => null);
    if (!data) return;
    const years = Number(data.years) || 0, months = Number(data.months) || 0, days = Number(data.days) || 0;
    if (!years && !months && !days) return ui.notifications.warn("Indiquez une durée.");
    const ghoulsFed = Object.fromEntries(ghouls.map(g => [g.id, !!data[`ghoul.${g.id}`]]));
    await T.ellipse({ years, months, days, feed: !!data.feed, restoreWP: !!data.restoreWP, xp: Number(data.xp) || 0, xpLabel: data.xpLabel, ghoulsFed, note: data.note });
    const t = T.getTime();
    this.view = { year: t.year, month: t.month };
    this.sel = { year: t.year, month: t.month, day: t.day };
  }
}

/** Vue du MJ : tous les événements (cachés compris), réglage du temps, notes du conteur. */
export class ChronicleCalendarGM extends ChronicleCalendar {
  static GM_VIEW = true;
  static DEFAULT_OPTIONS = {
    id: "noctis-calendar-gm",
    classes: ["noctis", "noctis-window", "noctis-calendar", "gm-view"],
    window: { title: "Chronique — vue du MJ", icon: "fa-solid fa-user-secret" }
  };
}

/** Rafraîchit les deux vues ouvertes. */
export function refreshCalendars() {
  for (const id of ["noctis-calendar", "noctis-calendar-gm"]) foundry.applications.instances?.get?.(id)?.refresh();
}
