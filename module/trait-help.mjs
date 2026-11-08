import { loc, registerLocalizable } from "./i18n.mjs";
/**
 * Infobulles des traits : descriptions courtes, écrites pour ce système (aucun texte repris d'un livre).
 * Chaque entrée : { desc, levels: ["• Nom. texte", …], spec, poss }.
 */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const SCALE_ATTR = ["NOCTIS.js.Faible", "NOCTIS.js.Moyen", "NOCTIS.js.Bon", "NOCTIS.js.Exceptionnel", "NOCTIS.js.HorsDuCommun"];
const SCALE_ABIL = ["NOCTIS.js.Novice", "NOCTIS.js.Praticien", "NOCTIS.js.Confirme", "NOCTIS.js.Expert", "NOCTIS.js.Maitre"];
const mk = (desc, texts, scale, spec = "") => ({ desc, levels: texts.map((t, i) => `${"•".repeat(i + 1)} ${scale[i]}. ${t}`), spec, poss: "" });

export const ATTRIBUTE_HELP = {
  strength: mk("NOCTIS.js.PuissanceMusculaireSouleverPorterBriserF",
    ["NOCTIS.js.UnFardeauOrdinaireVousEpuise", "NOCTIS.js.LaForceDUnAdulteEn", "NOCTIS.js.VousPortezSansPeineCeQue", "NOCTIS.js.VousSoulevezUnHommeABout", "NOCTIS.js.UneForceDontOnParleDans"], SCALE_ATTR, "NOCTIS.js.PoignePriseSouleverCoupsPuissants"),
  dexterity: mk("NOCTIS.js.AgiliteRapiditeDesGestesEtPrecision",
    ["NOCTIS.js.MaladroitVousTrebuchezSouvent", "NOCTIS.js.DesGestesSursSansEclat", "NOCTIS.js.VifEtPrecis", "NOCTIS.js.DUneGraceDeFelin", "NOCTIS.js.VosGestesSemblentDefierLeRegard"], SCALE_ATTR, "NOCTIS.js.ReflexesEquilibreMainsAgiles"),
  stamina: mk("NOCTIS.js.EnduranceEtResistanceDuCorpsAjoute",
    ["NOCTIS.js.FragileViteABoutDeSouffle", "NOCTIS.js.UneConstitutionOrdinaire", "NOCTIS.js.VousEncaissezMieuxQueLaMoyenne", "NOCTIS.js.DurAuMalInfatigable", "NOCTIS.js.PresqueImpossibleAAbattre"], SCALE_ATTR, "NOCTIS.js.ResistanceALaDouleurTenacite"),
  charisma: mk("NOCTIS.js.CapaciteAAttirerEntrainerEtConvaincre",
    ["NOCTIS.js.OnVousOublieDesQueVous", "NOCTIS.js.VousPlaisezACeuxQuiVous", "NOCTIS.js.OnAimeVousEcouter", "NOCTIS.js.LesFoulesSeTournentVersVous", "NOCTIS.js.UneAuraQuePeuSaventIgnorer"], SCALE_ATTR, "NOCTIS.js.EloquenceAutoriteNaturelleChaleur"),
  manipulation: mk("NOCTIS.js.ArtDAmenerLesAutresA",
    ["NOCTIS.js.VosIntentionsSeLisentSurVotre", "NOCTIS.js.VousObtenezDePetitesFaveurs", "NOCTIS.js.VousSavezQuelLevierActionner", "NOCTIS.js.VousRetournezUnAdversaireEnUne", "NOCTIS.js.LesGensVousServentEnCroyant"], SCALE_ATTR, "NOCTIS.js.PersuasionMensongeFlatterie"),
  appearance: mk("NOCTIS.js.BeauteAllureEtImpressionProduiteAu",
    ["NOCTIS.js.RepoussantOuTerne", "NOCTIS.js.Banal", "NOCTIS.js.AgreableARegarder", "NOCTIS.js.Remarquable", "NOCTIS.js.DUneBeauteQuiTrouble"], SCALE_ATTR, "NOCTIS.js.PrestanceRegardElegance"),
  perception: mk("NOCTIS.js.AcuiteDesSensEtAttentionAux",
    ["NOCTIS.js.DistraitPerduDansVosPensees", "NOCTIS.js.VousVoyezCeQuiEstEvident", "NOCTIS.js.RienDeNotableNeVousEchappe", "NOCTIS.js.VousLisezLesDetailsCommeUn", "NOCTIS.js.VosSensFrolentLeSurnaturel"], SCALE_ATTR, "NOCTIS.js.VuePercanteOuieFineIntuition"),
  intelligence: mk("NOCTIS.js.MemoireRaisonnementEtSavoirSertA",
    ["NOCTIS.js.LentAComprendre", "NOCTIS.js.UnEspritOrdinaire", "NOCTIS.js.VifEtCurieux", "NOCTIS.js.Brillant", "NOCTIS.js.UnGenieDeSonTemps"], SCALE_ATTR, "NOCTIS.js.LogiqueMemoireErudition"),
  wits: mk("NOCTIS.js.PresenceDEspritEtRapiditeDe",
    ["NOCTIS.js.ToujoursUnTempsDeRetard", "NOCTIS.js.VousReagissezAPeuPresA", "NOCTIS.js.VousAvezLaRepartieFacile", "NOCTIS.js.RarementPrisAuDepourvu", "NOCTIS.js.VousSemblezAvoirPrevuChaqueSurprise"], SCALE_ATTR, "NOCTIS.js.ReflexesRepartieSangFroid")
};

const ab = (desc, spec) => mk(desc, ["NOCTIS.js.QuelquesNotions", "NOCTIS.js.UnePratiqueReguliere", "NOCTIS.js.UnSavoirFaireSolideReconnu", "NOCTIS.js.ParmiLesMeilleursDeLaRegion", "NOCTIS.js.UneReferenceQueLOnVient"], SCALE_ABIL, spec);

export const ABILITY_HELP = {
  legerdemain: ab("NOCTIS.js.VolALaTireToursDe", "NOCTIS.js.BoursesSerruresEscamotage"),
  athletics: ab("NOCTIS.js.CourirSauterGrimperNagerLancerSert", "NOCTIS.js.CourseEscaladeEsquive"),
  brawl: ab("NOCTIS.js.CombatSansArmeCoupsPrisesLutte", "NOCTIS.js.LutteCoupsDePoingMorsure"),
  leadership: ab("NOCTIS.js.DonnerDesOrdresInspirerTenirUne", "NOCTIS.js.HarangueCommandementMilitaire"),
  empathy: ab("NOCTIS.js.ComprendreLesEmotionsDAutruiEt", "NOCTIS.js.MensongesHumeursChagrins"),
  expression: ab("NOCTIS.js.SExprimerAvecForceEtJustesse", "NOCTIS.js.PoesieSermonsLettres"),
  intimidation: ab("NOCTIS.js.FairePlierParLaMenaceLa", "NOCTIS.js.MenaceVoileeViolencePhysique"),
  awareness: ab("NOCTIS.js.PressentirLeDangerEtSentirL", "NOCTIS.js.PiegesPresencesEmbuscades"),
  subterfuge: ab("NOCTIS.js.MentirTromperCacherSesButsEt", "NOCTIS.js.FaussesPistesFlatterieSeduction"),
  alertness: ab("NOCTIS.js.ResterSurSesGardesRemarquerCe", "NOCTIS.js.EmbuscadesBruitsMouvements"),
  animalken: ab("NOCTIS.js.ComprendreDresserEtApaiserLesAnimaux", "NOCTIS.js.ChevauxChiensFaucons"),
  crafts: ab("NOCTIS.js.FabriquerEtReparerForgeMenuiserieCouture", "NOCTIS.js.ForgeEbenisterieOrfevrerie"),
  commerce: ab("NOCTIS.js.AcheterVendreMarchanderEtEvaluer", "NOCTIS.js.MarchandageChangeEvaluation"),
  ride: ab("NOCTIS.js.MonterDirigerEtCombattreACheval", "NOCTIS.js.ChargeLongsTrajetsTerrainsDifficiles"),
  etiquette: ab("NOCTIS.js.ConnaitreLesUsagesDesCoursEt", "NOCTIS.js.CourClergeGuildes"),
  stealth: ab("NOCTIS.js.SeDeplacerSansEtreVuNi", "NOCTIS.js.OmbresFilatureSilence"),
  melee: ab("NOCTIS.js.CombatAvecArmesBlanchesEpeesHaches", "NOCTIS.js.EpeeHacheParade"),
  performance: ab("NOCTIS.js.ChanterJouerDanserConterDevantUn", "NOCTIS.js.ChantLuthConte"),
  survival: ab("NOCTIS.js.VivreEtSeDirigerEnPleine", "NOCTIS.js.PistageAbrisForets"),
  archery: ab("NOCTIS.js.TirerALArcEtA", "NOCTIS.js.ArcLongArbaleteTirRapide"),
  law: ab("NOCTIS.js.ConnaitreLoisCoutumesEtProceduresEt", "NOCTIS.js.DroitCanonCoutumeProces"),
  enigmas: ab("NOCTIS.js.ResoudreEnigmesChiffresEtCasseTete", "NOCTIS.js.CodesEnigmesJeux"),
  academics: ab("NOCTIS.js.SavoirDesLettresHistoirePhilosophieLangu", "NOCTIS.js.HistoireRhetoriqueLatin"),
  investigation: ab("NOCTIS.js.ChercherDesIndicesInterrogerReconstituer", "NOCTIS.js.FouilleInterrogatoireDeduction"),
  medicine: ab("NOCTIS.js.SoignerLesBlessuresEtLesMaladies", "NOCTIS.js.ChirurgieHerbesDiagnostic"),
  occult: ab("NOCTIS.js.SavoirCeQuOnRaconteDu", "NOCTIS.js.RituelsDemonsSuperstitions"),
  politics: ab("NOCTIS.js.ComprendreLesJeuxDePouvoirEt", "NOCTIS.js.IntriguesAlliancesFactions"),
  hearthwisdom: ab("NOCTIS.js.LeSavoirDesGensSimplesRemedes", "NOCTIS.js.RemedesPresagesProtections"),
  seneschal: ab("NOCTIS.js.GererUnDomaineUneMaisonDes", "NOCTIS.js.IntendanceComptesPersonnel"),
  theology: ab("NOCTIS.js.ConnaitreLesDogmesLesTextesEt", "NOCTIS.js.EcrituresHeresiesClerge")
};

const bg = (desc, texts) => ({ desc, levels: texts.map((t, i) => `${"•".repeat(i + 1)} ${t}`), spec: "", poss: "" });

export const BACKGROUND_HELP = {
  allies: bg("NOCTIS.js.DesMortelsQuiVousAidentDe",
    ["NOCTIS.js.UnAllieDInfluenceModeste", "NOCTIS.js.DeuxAllies", "NOCTIS.js.TroisAlliesDontUnInfluent", "NOCTIS.js.QuatreAlliesDontUnTresInfluent", "NOCTIS.js.CinqAlliesDontUnPuissantPersonnage"]),
  contacts: bg("NOCTIS.js.DesSourcesDInformationDansDivers",
    ["NOCTIS.js.UnContactMajeur", "NOCTIS.js.DeuxContactsMajeurs", "NOCTIS.js.TroisContactsMajeurs", "NOCTIS.js.QuatreContactsMajeurs", "NOCTIS.js.CinqContactsMajeurs"]),
  domain: bg("NOCTIS.js.UnTerritoireReconnuOuVousChassez",
    ["NOCTIS.js.QuelquesRuellesOuUnHameau", "NOCTIS.js.UnQuartierOuUnVillage", "NOCTIS.js.PlusieursQuartiersUnBourg", "NOCTIS.js.UneBonnePartDUneVille", "NOCTIS.js.UneVilleEntiereOuUneContree"]),
  falseidentity: bg("NOCTIS.js.UneIdentiteDEmpruntAvecPapiers",
    ["NOCTIS.js.UneCouvertureFragile", "NOCTIS.js.UneIdentiteQuiTientUneEnquete", "NOCTIS.js.UneIdentiteSolideConnueDansLa", "NOCTIS.js.UneVieEntiereInventeeEtAttestee", "NOCTIS.js.PlusieursIdentitesIrreprochables"]),
  generation: bg("NOCTIS.js.LaDistanceQuiVousSepareDes",
    ["NOCTIS.js.OnziemeGeneration", "NOCTIS.js.DixiemeGeneration", "NOCTIS.js.NeuviemeGeneration", "NOCTIS.js.HuitiemeGeneration", "NOCTIS.js.SeptiemeGeneration"]),
  influence: bg("NOCTIS.js.VotrePoidsSurLesAffairesDes",
    ["NOCTIS.js.UneVoixQuOnEcouteParfois", "NOCTIS.js.UnNotableDUnePetiteVille", "NOCTIS.js.UneInfluenceReelleDansUneCite", "NOCTIS.js.UnPouvoirQuiCompteDansLa", "NOCTIS.js.OnNeDecideRienDImportant"]),
  mentor: bg("NOCTIS.js.UnAineQuiVousGuideVous",
    ["NOCTIS.js.UnMentorDePeuDePoids", "NOCTIS.js.UnMentorRespecte", "NOCTIS.js.UnMentorInfluent", "NOCTIS.js.UnMentorPuissant", "NOCTIS.js.UnMentorDUnePuissanceRare"]),
  fame: bg("NOCTIS.js.VotreReputationParmiLesMortels",
    ["NOCTIS.js.ConnuDansVotreQuartier", "NOCTIS.js.ConnuDansLaVille", "NOCTIS.js.UnNomQuOnCiteDans", "NOCTIS.js.CelebreDansLeRoyaume", "NOCTIS.js.UneLegendeDeVotreVivant"]),
  resources: bg("NOCTIS.js.RichessesBiensEtRevenus",
    ["NOCTIS.js.DeQuoiVivreModestement", "NOCTIS.js.LAisanceDUnArtisanProspere", "NOCTIS.js.LaFortuneDUnMarchand", "NOCTIS.js.LaRichesseDUnSeigneur", "NOCTIS.js.UneFortunePrinciere"]),
  retainers: bg("NOCTIS.js.DesServiteursFidelesSouventLiesPar",
    ["NOCTIS.js.UnServiteur", "NOCTIS.js.DeuxServiteurs", "NOCTIS.js.TroisServiteurs", "NOCTIS.js.QuatreServiteurs", "NOCTIS.js.CinqServiteurs"]),
  status: bg("NOCTIS.js.VotreRangDansLaSocieteDes",
    ["NOCTIS.js.ConnuDeQuelquesUns", "NOCTIS.js.Respecte", "NOCTIS.js.Influent", "NOCTIS.js.Puissant", "NOCTIS.js.ParmiLesPlusEminents"]),
  herd: bg("NOCTIS.js.DesMortelsDontVousPouvezBoire",
    ["NOCTIS.js.TroisCalices", "NOCTIS.js.SeptCalices", "NOCTIS.js.QuinzeCalices", "NOCTIS.js.TrenteCalices", "NOCTIS.js.SoixanteCalices"])
};

const vt = (desc, texts) => ({ desc, levels: texts.map((t, i) => `${"•".repeat(i + 1)} ${t}`), spec: "", poss: "" });

export const VIRTUE_HELP = {
  conscience: vt("NOCTIS.js.LeSensMoralDistinguerLeBien",
    ["NOCTIS.js.UnVagueMalaiseApresLesPires", "NOCTIS.js.UneMoraleOrdinaire", "NOCTIS.js.DesPrincipesSolides", "NOCTIS.js.UneConscienceExigeante", "NOCTIS.js.UneDroiturePresqueSainte"]),
  conviction: vt("NOCTIS.js.LaFermeteDUnePhilosophieQui",
    ["NOCTIS.js.DesPrincipesFlottants", "NOCTIS.js.DesConvictionsOrdinaires", "NOCTIS.js.UneLigneDeConduiteClaire", "NOCTIS.js.UneVolonteDeFer", "NOCTIS.js.UneFoiAbsolueEnSaVoie"]),
  selfcontrol: vt("NOCTIS.js.LaMaitriseDeLaBeteResister",
    ["NOCTIS.js.LaMoindreProvocationVousEmporte", "NOCTIS.js.VousTenezLaPlupartDuTemps", "NOCTIS.js.VousGardezVotreCalme", "NOCTIS.js.IlEnFautBeaucoupPourVous", "NOCTIS.js.UneMaitrisePresqueParfaite"]),
  instinct: vt("NOCTIS.js.AccepterLaBeteEtChevaucherLa",
    ["NOCTIS.js.LaBeteVousMene", "NOCTIS.js.VousLEcoutezSansLaComprendre", "NOCTIS.js.VousLaGuidezParfois", "NOCTIS.js.VousChevauchezSaRage", "NOCTIS.js.BeteEtEspritNeFontPlus"]),
  courage: vt("NOCTIS.js.FaireFaceALaPeurAu",
    ["NOCTIS.js.PromptAFuir", "NOCTIS.js.Ordinaire", "NOCTIS.js.Brave", "NOCTIS.js.Intrepide", "NOCTIS.js.RienNeVousFaitReculer"])
};

/** Pouvoirs listés dans les infobulles de disciplines : vide (chaque table crée ses disciplines). */
export const DISCIPLINE_POWERS = {};

export const LEVELS = {
  road: ["NOCTIS.js.AuBordDeLAbime", "NOCTIS.js.TresCompromis", "NOCTIS.js.Fragile", "NOCTIS.js.Vacillant", "NOCTIS.js.Ordinaire", "NOCTIS.js.Ferme", "NOCTIS.js.Solide", "NOCTIS.js.Exemplaire", "NOCTIS.js.Rare", "NOCTIS.js.ProcheDeLIdeal"],
  willpower: ["NOCTIS.js.SansRessort", "NOCTIS.js.Faible2", "NOCTIS.js.Hesitant", "NOCTIS.js.Ordinaire", "NOCTIS.js.Determine", "NOCTIS.js.Resolu", "NOCTIS.js.Tenace", "NOCTIS.js.Inebranlable", "NOCTIS.js.Indomptable", "NOCTIS.js.Absolue"]
};

export function traitTooltip(kind, key, label, cost) {
  const EXTRA = {
    road: loc("NOCTIS.js.VotreMoraleHumaniteOuAutreVoie"),
    willpower: loc("NOCTIS.js.ForceDeCaractereDepenser1Point"),
    discipline: loc("NOCTIS.js.PouvoirSurnaturelDeVotreSangOuvrez")
  };
  const custom = kind === "background" ? CONFIG.NOCTIS?.backgroundInfo?.[key] : null;
  if (custom?.custom) return `<div class="noctis-tip"><h4>${esc(label)}</h4>${custom.description ? `<p>${esc(custom.description).replace(/\n/g, "<br>")}</p>` : ""}${cost ? `<p class="cost">${esc(cost)}</p>` : ""}</div>`;
  const desc = { attribute: ATTRIBUTE_HELP, ability: ABILITY_HELP, background: BACKGROUND_HELP, virtue: VIRTUE_HELP }[kind]?.[key] ?? EXTRA[kind];
  let h = `<div class="noctis-tip"><h4>${esc(label)}</h4>`;
  if (desc && typeof desc === "object") {
    h += `<p>${esc(desc.desc)}</p>`;
    h += `<ul class="levels">${desc.levels.map(l => { const m = l.match(/^(•+)\s*([^.]+\.)?\s*(.*)$/); const nm = m[2] && m[2].length <= 28 ? m[2] : ""; const tx = nm ? m[3] : (m[2] ?? "") + " " + m[3]; return `<li><b>${m[1].replace(/•/g, "●")}</b> ${nm ? `<strong>${esc(nm)}</strong> ` : ""}${esc(tx.trim())}</li>`; }).join("")}</ul>`;
    if (desc.spec) h += loc("NOCTIS.js.Specialites", { p0: esc(desc.spec) });
    if (cost) h += `<p class="cost">${esc(cost)}</p>`;
    return h + "</div>";
  }
  if (desc) h += `<p>${esc(desc)}</p>`;
  if (LEVELS[kind]?.length) h += `<ul class="levels">${LEVELS[kind].map((l, i) => `<li><b>${"●".repeat(i + 1)}</b> ${l}</li>`).join("")}</ul>`;
  if (cost) h += `<p class="cost">${esc(cost)}</p>`;
  return h + "</div>";
}

registerLocalizable(ATTRIBUTE_HELP, ABILITY_HELP, BACKGROUND_HELP, VIRTUE_HELP, LEVELS);
