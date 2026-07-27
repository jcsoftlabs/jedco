import { readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  formatHTG,
  centimesEnUSDAvecTauxFige,
  decoderTaux,
  formatUSD,
  type Centimes,
} from "@/lib/money";
import type { Facture, LigneFacture, Devis, LigneDevis, Client, Paiement } from "@/app/generated/prisma/client";

type FactureAvecDetails = Facture & {
  lignes: LigneFacture[];
  client: Client;
  paiements?: Paiement[];
};

type DevisAvecDetails = Devis & {
  lignes: LigneDevis[];
  client: Client;
};

// Forme commune aux lignes de Facture et de Devis — suffisante pour dessiner
// le tableau et les totaux sans dupliquer cette logique entre les deux
// documents (mêmes colonnes, mêmes calculs).
type LigneMontant = {
  description: string;
  quantite: number;
  prixUnitaireHTG: Centimes;
  totalHTG: Centimes;
};

// ─── Charte graphique ────────────────────────────────────────────────────────
// Le bleu du logo (#013298, échantillonné sur public/jedco-logo.png) est plus
// soutenu que le bleu du thème web (#1A4F8A). On utilise celui du logo pour
// tout ce qui l'entoure, pour éviter deux bleus concurrents sur la même page.
const BLEU = "#013298";
const BLEU_SOMBRE = "#001F5E";
const GRIS_TEXTE = "#1C1C1C";
const GRIS_DOUX = "#666666";
const GRIS_LIGNE = "#DDE3EC";
const GRIS_FOND = "#F4F7FB";

const MARGE = 45;
const LARGEUR_PAGE = 595.28; // A4 en points
const HAUTEUR_PAGE = 841.89;
const LARGEUR_UTILE = LARGEUR_PAGE - MARGE * 2;

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "EN ATTENTE",
  PARTIELLEMENT_PAYEE: "PARTIELLEMENT PAYÉE",
  PAYEE: "PAYÉE",
  EN_RETARD: "EN RETARD",
  ANNULEE: "ANNULÉE",
};

const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "#8A6D1F",
  PARTIELLEMENT_PAYEE: "#8A5A1F",
  PAYEE: "#1F6B3F",
  EN_RETARD: "#A31D1D",
  ANNULEE: "#5A5A5A",
};

const FOND_STATUT: Record<string, string> = {
  EN_ATTENTE: "#FDF6E3",
  PARTIELLEMENT_PAYEE: "#FDF0E3",
  PAYEE: "#E9F6EE",
  EN_RETARD: "#FBEAEA",
  ANNULEE: "#EFEFEF",
};

const LIBELLE_STATUT_DEVIS: Record<string, string> = {
  BROUILLON: "BROUILLON",
  ENVOYE: "ENVOYÉ",
  ACCEPTE: "ACCEPTÉ",
  REFUSE: "REFUSÉ",
  EXPIRE: "EXPIRÉ",
  CONVERTI: "CONVERTI EN FACTURE",
};

const COULEUR_STATUT_DEVIS: Record<string, string> = {
  BROUILLON: "#5A5A5A",
  ENVOYE: "#8A6D1F",
  ACCEPTE: "#1F6B3F",
  REFUSE: "#A31D1D",
  EXPIRE: "#8A5A1F",
  CONVERTI: "#013298",
};

const FOND_STATUT_DEVIS: Record<string, string> = {
  BROUILLON: "#EFEFEF",
  ENVOYE: "#FDF6E3",
  ACCEPTE: "#E9F6EE",
  REFUSE: "#FBEAEA",
  EXPIRE: "#FDF0E3",
  CONVERTI: "#E9EEFB",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

// Pour une date-only venant d'un filtre d'URL (ex : "2026-02-01", interprétée
// par le navigateur comme minuit UTC) : formatDate() ci-dessus utilise le
// fuseau du serveur et afficherait la veille si celui-ci est en retard sur
// UTC. Les composants UTC de la date évitent ce décalage — la borne d'un
// intervalle représente un jour civil entier, pas un instant précis.
function formatDateUTC(date: Date): string {
  const jour = String(date.getUTCDate()).padStart(2, "0");
  const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${jour}/${mois}/${date.getUTCFullYear()}`;
}

// Intl.NumberFormat("fr-FR") sépare les milliers avec une espace insécable
// fine (U+202F) — typographiquement correct en français et rendu correctement
// en HTML, mais que pdfkit encode en « / » avec les polices standard, donnant
// « 25 /000,00 HTG » sur la facture du client (vérifié empiriquement en
// inspectant le flux de contenu du PDF généré). L'espace insécable ordinaire
// U+00A0 subit exactement le même sort. On retombe donc sur une espace ASCII,
// seule option qui traverse l'encodage WinAnsi intacte ; le non-retour à la
// ligne n'a de toute façon aucun effet dans une cellule de tableau à largeur
// fixe.
//
// Les deux codepoints sont écrits en séquences d'échappement plutôt qu'en
// caractères littéraux : un caractère invisible dans le source peut être
// normalisé en ASCII par un outil d'édition, ce qui transformerait ce
// remplacement en no-op silencieux — c'est arrivé une fois sur ce fichier.
function texteMonetaire(centimes: Centimes): string {
  return formatHTG(centimes).replace(/[\u202F\u00A0]/g, " ");
}

function montantSansDevise(centimes: Centimes): string {
  return texteMonetaire(centimes).replace(" HTG", "");
}

// Le logo est lu depuis public/ à l'exécution. next.config.js le déclare dans
// outputFileTracingIncludes pour qu'il soit bien copié dans le bundle
// serverless Vercel (sinon ENOENT en production alors que tout marche en
// local). Une facture doit rester générable même si le fichier manque — on
// bascule alors sur un en-tête typographique sans logo plutôt que d'échouer.
let logoCache: Buffer | null | undefined;

function chargerLogo(): Buffer | null {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = readFileSync(path.join(process.cwd(), "public", "jedco-logo.png"));
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export async function genererFacturePDF(facture: FactureAvecDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGE, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    dessinerEntete(doc);
    const lignesDates: [string, string][] = [
      ["Date d'émission", formatDate(facture.dateEmission)],
      ["Échéance", formatDate(facture.dateEcheance)],
    ];
    if (facture.periode) lignesDates.push(["Période", facture.periode]);
    if (facture.datePaiement) lignesDates.push(["Payée le", formatDate(facture.datePaiement)]);

    const yApresBlocs = dessinerBlocsInfo(doc, {
      titre: "FACTURE",
      reference: facture.reference,
      statutLibelle: LIBELLE_STATUT[facture.statut] ?? facture.statut,
      statutCouleur: COULEUR_STATUT[facture.statut] ?? GRIS_TEXTE,
      statutFond: FOND_STATUT[facture.statut] ?? GRIS_FOND,
      client: facture.client,
      lignesDates,
    });
    const yApresTableau = dessinerTableau(doc, facture.lignes, yApresBlocs);
    const yApresTotaux = dessinerTotaux(
      doc,
      facture.montantHTG,
      facture.taxeHTG,
      facture.totalHTG,
      facture.tauxUsdApplique,
      yApresTableau
    );
    dessinerPaiementsEtNotes(doc, facture, yApresTotaux);
    dessinerPiedDePage(doc);

    doc.end();
  });
}

export async function genererDevisPDF(devis: DevisAvecDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGE, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    dessinerEntete(doc);
    const yApresBlocs = dessinerBlocsInfo(doc, {
      titre: "DEVIS",
      reference: devis.reference,
      statutLibelle: LIBELLE_STATUT_DEVIS[devis.statut] ?? devis.statut,
      statutCouleur: COULEUR_STATUT_DEVIS[devis.statut] ?? GRIS_TEXTE,
      statutFond: FOND_STATUT_DEVIS[devis.statut] ?? GRIS_FOND,
      client: devis.client,
      lignesDates: [
        ["Date d'émission", formatDate(devis.dateEmission)],
        ["Valable jusqu'au", formatDate(devis.dateValidite)],
      ],
    });
    const yApresTableau = dessinerTableau(doc, devis.lignes, yApresBlocs);
    const yApresTotaux = dessinerTotaux(
      doc,
      devis.montantHTG,
      devis.taxeHTG,
      devis.totalHTG,
      devis.tauxUsdApplique,
      yApresTableau,
      "TOTAL ESTIMÉ"
    );
    if (devis.notes) dessinerNotes(doc, devis.notes, yApresTotaux);
    dessinerPiedDePage(doc);

    doc.end();
  });
}

function dessinerEntete(doc: PDFKit.PDFDocument) {
  const logo = chargerLogo();
  const hautLogo = MARGE;

  if (logo) {
    // Ratio d'origine 232×182 — on fixe la hauteur et laisse pdfkit calculer
    // la largeur pour ne pas déformer le logo.
    doc.image(logo, MARGE, hautLogo, { height: 46 });
  } else {
    doc.font("Helvetica-Bold").fontSize(20).fillColor(BLEU).text("JEDCO", MARGE, hautLogo + 8);
  }

  // Coordonnées de l'entreprise, alignées à droite face au logo.
  const largeurBloc = 260;
  const xBloc = LARGEUR_PAGE - MARGE - largeurBloc;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(BLEU_SOMBRE);
  doc.text("JEDCO Services S.A.", xBloc, hautLogo + 2, { width: largeurBloc, align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor(GRIS_DOUX);
  doc.text("14 bis Rue Pélican, Route de l'Aéroport", xBloc, doc.y + 1, {
    width: largeurBloc,
    align: "right",
  });
  doc.text("Port-au-Prince, Haïti", xBloc, doc.y, { width: largeurBloc, align: "right" });
  doc.text("Tél : 2942-1109  ·  2942-1110", xBloc, doc.y, { width: largeurBloc, align: "right" });

  // Filet de séparation aux couleurs de la marque.
  const yFilet = hautLogo + 60;
  doc.rect(MARGE, yFilet, LARGEUR_UTILE, 3).fill(BLEU);
  doc.rect(MARGE, yFilet + 3, LARGEUR_UTILE * 0.28, 3).fill(BLEU_SOMBRE);
}

function dessinerBlocsInfo(
  doc: PDFKit.PDFDocument,
  opts: {
    titre: string;
    reference: string;
    statutLibelle: string;
    statutCouleur: string;
    statutFond: string;
    client: Client;
    lignesDates: [string, string][];
  }
): number {
  const yDepart = MARGE + 82;

  // Titre + référence, à gauche.
  doc.font("Helvetica-Bold").fontSize(24).fillColor(BLEU_SOMBRE).text(opts.titre, MARGE, yDepart);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BLEU).text(opts.reference, MARGE, yDepart + 27);

  // Pastille de statut, à droite.
  const libelle = opts.statutLibelle;
  doc.font("Helvetica-Bold").fontSize(8);
  const largeurPastille = doc.widthOfString(libelle) + 20;
  const xPastille = LARGEUR_PAGE - MARGE - largeurPastille;
  doc.roundedRect(xPastille, yDepart + 4, largeurPastille, 19, 9.5).fill(opts.statutFond);
  doc
    .fillColor(opts.statutCouleur)
    .text(libelle, xPastille, yDepart + 10, { width: largeurPastille, align: "center" });

  // Deux encadrés côte à côte : destinataire et dates.
  const yBlocs = yDepart + 52;
  const hauteurBloc = 74;
  const largeurGauche = LARGEUR_UTILE * 0.54;
  const largeurDroite = LARGEUR_UTILE - largeurGauche - 12;
  const xDroite = MARGE + largeurGauche + 12;

  doc.roundedRect(MARGE, yBlocs, largeurGauche, hauteurBloc, 4).fill(GRIS_FOND);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLEU);
  doc.text("FACTURER À", MARGE + 12, yBlocs + 11, { characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(GRIS_TEXTE);
  doc.text(opts.client.nom, MARGE + 12, yBlocs + 25, { width: largeurGauche - 24 });
  doc.font("Helvetica").fontSize(8.5).fillColor(GRIS_DOUX);
  doc.text(`Code client : ${opts.client.code}`, MARGE + 12, doc.y + 2, {
    width: largeurGauche - 24,
  });
  const adresse = [opts.client.adresse, opts.client.ville].filter(Boolean).join(", ");
  if (adresse) doc.text(adresse, MARGE + 12, doc.y, { width: largeurGauche - 24 });
  // Téléphone et e-mail sur une seule ligne — le bloc a une hauteur fixe
  // (hauteurBloc) pour s'aligner avec le bloc des dates à droite, pas de
  // place pour une ligne de plus si les deux coordonnées sont renseignées.
  const contact = [
    opts.client.telephone ? `Tél : ${opts.client.telephone}` : null,
    opts.client.email,
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) doc.text(contact, MARGE + 12, doc.y, { width: largeurGauche - 24 });

  doc.roundedRect(xDroite, yBlocs, largeurDroite, hauteurBloc, 4).fill(GRIS_FOND);

  let yLigne = yBlocs + 12;
  for (const [etiquette, valeur] of opts.lignesDates) {
    doc.font("Helvetica").fontSize(8).fillColor(GRIS_DOUX);
    doc.text(etiquette, xDroite + 12, yLigne, { width: largeurDroite - 24 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(GRIS_TEXTE);
    doc.text(valeur, xDroite + 12, yLigne, { width: largeurDroite - 24, align: "right" });
    yLigne += 15;
  }

  return yBlocs + hauteurBloc + 26;
}

function dessinerTableau(
  doc: PDFKit.PDFDocument,
  lignes: LigneMontant[],
  yDepart: number
): number {
  const colDescription = LARGEUR_UTILE * 0.46;
  const colQte = LARGEUR_UTILE * 0.1;
  const colPrix = LARGEUR_UTILE * 0.22;
  const colTotal = LARGEUR_UTILE - colDescription - colQte - colPrix;

  const xDescription = MARGE;
  const xQte = xDescription + colDescription;
  const xPrix = xQte + colQte;
  const xTotal = xPrix + colPrix;

  const hauteurEntete = 24;
  doc.rect(MARGE, yDepart, LARGEUR_UTILE, hauteurEntete).fill(BLEU);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF");
  const yTexteEntete = yDepart + 8;
  doc.text("DESCRIPTION", xDescription + 10, yTexteEntete, { width: colDescription - 10 });
  doc.text("QTÉ", xQte, yTexteEntete, { width: colQte - 6, align: "right" });
  doc.text("PRIX UNIT. (HTG)", xPrix, yTexteEntete, { width: colPrix - 6, align: "right" });
  doc.text("TOTAL (HTG)", xTotal, yTexteEntete, { width: colTotal - 10, align: "right" });

  let y = yDepart + hauteurEntete;
  const hauteurLigne = 22;

  lignes.forEach((ligne, index) => {
    if (index % 2 === 1) doc.rect(MARGE, y, LARGEUR_UTILE, hauteurLigne).fill(GRIS_FOND);

    const yTexte = y + 7;
    doc.font("Helvetica").fontSize(9).fillColor(GRIS_TEXTE);
    doc.text(ligne.description, xDescription + 10, yTexte, {
      width: colDescription - 16,
      ellipsis: true,
      height: 12,
    });
    doc.text(String(ligne.quantite), xQte, yTexte, { width: colQte - 6, align: "right" });
    doc.text(montantSansDevise(ligne.prixUnitaireHTG), xPrix, yTexte, {
      width: colPrix - 6,
      align: "right",
    });
    doc.font("Helvetica-Bold");
    doc.text(montantSansDevise(ligne.totalHTG), xTotal, yTexte, {
      width: colTotal - 10,
      align: "right",
    });

    y += hauteurLigne;
  });

  doc.moveTo(MARGE, y).lineTo(MARGE + LARGEUR_UTILE, y).lineWidth(0.8).stroke(GRIS_LIGNE);
  return y + 16;
}

function dessinerTotaux(
  doc: PDFKit.PDFDocument,
  montantHTG: Centimes,
  taxeHTG: Centimes,
  totalHTG: Centimes,
  tauxUsdApplique: number | null,
  yDepart: number,
  libelleTotal = "TOTAL DÛ"
): number {
  const largeurBloc = 250;
  const xBloc = LARGEUR_PAGE - MARGE - largeurBloc;
  let y = yDepart;

  const tauxTaxePourcent = montantHTG > 0n ? Number((taxeHTG * 10_000n) / montantHTG) / 100 : 0;

  const lignesTotaux: [string, string][] = [
    ["Sous-total", texteMonetaire(montantHTG)],
    [`Taxe (${tauxTaxePourcent} %)`, texteMonetaire(taxeHTG)],
  ];

  for (const [etiquette, valeur] of lignesTotaux) {
    doc.font("Helvetica").fontSize(9.5).fillColor(GRIS_DOUX);
    doc.text(etiquette, xBloc, y, { width: largeurBloc * 0.5 });
    doc.font("Helvetica").fontSize(9.5).fillColor(GRIS_TEXTE);
    doc.text(valeur, xBloc + largeurBloc * 0.5, y, { width: largeurBloc * 0.5, align: "right" });
    y += 16;
  }

  // Bandeau du total, aux couleurs de la marque.
  y += 4;
  const hauteurTotal = 32;
  doc.roundedRect(xBloc, y, largeurBloc, hauteurTotal, 4).fill(BLEU);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#FFFFFF");
  doc.text(libelleTotal, xBloc + 12, y + 11, { width: largeurBloc * 0.4 });
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#FFFFFF");
  doc.text(texteMonetaire(totalHTG), xBloc + largeurBloc * 0.4, y + 9, {
    width: largeurBloc * 0.6 - 12,
    align: "right",
  });
  y += hauteurTotal + 6;

  // Équivalent USD au taux figé à l'émission (§1.11) — jamais le taux courant,
  // sinon le montant affiché changerait après coup avec le cours de la
  // gourde, aussi bien sur une facture déjà émise que sur un devis déjà remis.
  if (tauxUsdApplique) {
    const usd = centimesEnUSDAvecTauxFige(totalHTG, tauxUsdApplique);
    const taux = decoderTaux(tauxUsdApplique);
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(GRIS_DOUX);
    doc.text(`Équivalent indicatif : ${formatUSD(usd)} (taux figé 1 USD = ${taux} HTG)`, xBloc, y, {
      width: largeurBloc,
      align: "right",
    });
    y += 14;
  }

  return y + 10;
}

function dessinerPaiementsEtNotes(
  doc: PDFKit.PDFDocument,
  facture: FactureAvecDetails,
  yDepart: number
) {
  let y = yDepart;
  const paiements = facture.paiements ?? [];

  if (paiements.length > 0) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BLEU);
    doc.text("PAIEMENTS REÇUS", MARGE, y, { characterSpacing: 0.6 });
    y += 14;

    const totalPaye = paiements.reduce((s, p) => s + p.montantHTG, 0n);
    for (const paiement of paiements) {
      doc.font("Helvetica").fontSize(8.5).fillColor(GRIS_DOUX);
      doc.text(
        `${formatDate(paiement.datePaiement)}  ·  ${paiement.mode}${paiement.reference ? `  ·  réf. ${paiement.reference}` : ""}`,
        MARGE,
        y,
        { width: 300 }
      );
      doc.fillColor(GRIS_TEXTE).text(texteMonetaire(paiement.montantHTG), MARGE + 300, y, {
        width: 140,
        align: "right",
      });
      y += 13;
    }

    const resteDu = facture.totalHTG - totalPaye;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(resteDu > 0n ? "#A31D1D" : "#1F6B3F");
    doc.text(resteDu > 0n ? "Reste dû" : "Soldée", MARGE, y + 3, { width: 300 });
    doc.text(texteMonetaire(resteDu), MARGE + 300, y + 3, { width: 140, align: "right" });
    y += 24;
  }

  if (facture.notes) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(BLEU);
    doc.text("NOTES", MARGE, y, { characterSpacing: 0.6 });
    y += 12;
    doc.font("Helvetica").fontSize(8.5).fillColor(GRIS_DOUX);
    doc.text(facture.notes, MARGE, y, { width: LARGEUR_UTILE * 0.7 });
  }
}

function dessinerNotes(doc: PDFKit.PDFDocument, notes: string, yDepart: number) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLEU);
  doc.text("NOTES", MARGE, yDepart, { characterSpacing: 0.6 });
  doc.font("Helvetica").fontSize(8.5).fillColor(GRIS_DOUX);
  doc.text(notes, MARGE, yDepart + 12, { width: LARGEUR_UTILE * 0.7 });
}

// ─── Export comptable groupé ─────────────────────────────────────────────────
// Un rapport tabulaire (paysage, plusieurs factures par page) — à ne pas
// confondre avec genererFacturePDF ci-dessus qui produit une facture
// individuelle pleine page. Le comptable veut ici la liste du trimestre, pas
// un document par facture.

export type LigneRapportComptable = {
  reference: string;
  dateEmission: Date;
  clientNom: string;
  clientCode: string;
  statut: string;
  totalHTG: Centimes;
  payeHTG: Centimes;
};

const MARGE_PAYSAGE = 40;
const LARGEUR_PAGE_PAYSAGE = 841.89; // A4 paysage en points
const HAUTEUR_PAGE_PAYSAGE = 595.28;
const LARGEUR_UTILE_PAYSAGE = LARGEUR_PAGE_PAYSAGE - MARGE_PAYSAGE * 2;

const COL_REF = 85;
const COL_DATE = 65;
const COL_CLIENT = 210;
const COL_STATUT = 95;
const COL_TOTAL = 100;
const COL_PAYE = 100;
// Le solde prend le reliquat, pour que la somme des colonnes retombe pile
// sur LARGEUR_UTILE_PAYSAGE quelle que soit la largeur choisie ci-dessus.
const COL_SOLDE = LARGEUR_UTILE_PAYSAGE - COL_REF - COL_DATE - COL_CLIENT - COL_STATUT - COL_TOTAL - COL_PAYE;

function xColonnes() {
  const xRef = MARGE_PAYSAGE;
  const xDate = xRef + COL_REF;
  const xClient = xDate + COL_DATE;
  const xStatut = xClient + COL_CLIENT;
  const xTotal = xStatut + COL_STATUT;
  const xPaye = xTotal + COL_TOTAL;
  const xSolde = xPaye + COL_PAYE;
  return { xRef, xDate, xClient, xStatut, xTotal, xPaye, xSolde };
}

function dessinerEnteteTableauComptable(doc: PDFKit.PDFDocument, y: number): number {
  const { xRef, xDate, xClient, xStatut, xTotal, xPaye, xSolde } = xColonnes();
  const hauteur = 22;
  doc.rect(MARGE_PAYSAGE, y, LARGEUR_UTILE_PAYSAGE, hauteur).fill(BLEU);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
  const yTexte = y + 7;
  doc.text("RÉFÉRENCE", xRef + 8, yTexte, { width: COL_REF - 8 });
  doc.text("DATE", xDate, yTexte, { width: COL_DATE - 6 });
  doc.text("CLIENT", xClient, yTexte, { width: COL_CLIENT - 6 });
  doc.text("STATUT", xStatut, yTexte, { width: COL_STATUT - 6 });
  doc.text("TOTAL HTG", xTotal, yTexte, { width: COL_TOTAL - 6, align: "right" });
  doc.text("PAYÉ HTG", xPaye, yTexte, { width: COL_PAYE - 6, align: "right" });
  doc.text("SOLDE HTG", xSolde, yTexte, { width: COL_SOLDE - 10, align: "right" });
  return y + hauteur;
}

export async function genererRapportComptablePDF(
  lignes: LigneRapportComptable[],
  periode: { dateDebut?: Date; dateFin?: Date }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: MARGE_PAYSAGE, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // En-tête de la première page : titre, période couverte, date de
    // génération. Pas le même bloc que dessinerEntete() (logo + adresse),
    // trop lourd pour un rapport de plusieurs pages relu en interne.
    doc.font("Helvetica-Bold").fontSize(18).fillColor(BLEU_SOMBRE).text("EXPORT COMPTABLE", MARGE_PAYSAGE, MARGE_PAYSAGE);
    doc.font("Helvetica").fontSize(9).fillColor(GRIS_DOUX);
    const periodeTexte =
      periode.dateDebut || periode.dateFin
        ? `Période : ${periode.dateDebut ? formatDateUTC(periode.dateDebut) : "…"} - ${periode.dateFin ? formatDateUTC(periode.dateFin) : "…"}`
        : "Période : toutes les factures";
    doc.text(periodeTexte, MARGE_PAYSAGE, MARGE_PAYSAGE + 24);
    doc.text(`Généré le ${formatDate(new Date())} — ${lignes.length} facture(s)`, MARGE_PAYSAGE, doc.y);

    const yFilet = MARGE_PAYSAGE + 58;
    doc.rect(MARGE_PAYSAGE, yFilet, LARGEUR_UTILE_PAYSAGE, 2).fill(BLEU);

    const { xRef, xDate, xClient, xStatut, xTotal, xPaye, xSolde } = xColonnes();
    const hauteurLigne = 20;
    const hauteurPied = 40;
    let y = dessinerEnteteTableauComptable(doc, yFilet + 12);

    let totalHTG = 0n;
    let payeHTG = 0n;

    lignes.forEach((ligne, index) => {
      if (y + hauteurLigne > HAUTEUR_PAGE_PAYSAGE - MARGE_PAYSAGE - hauteurPied) {
        doc.addPage({ size: "A4", layout: "landscape", margin: MARGE_PAYSAGE });
        y = dessinerEnteteTableauComptable(doc, MARGE_PAYSAGE);
      }

      const solde = ligne.totalHTG - ligne.payeHTG;
      totalHTG += ligne.totalHTG;
      payeHTG += ligne.payeHTG;

      if (index % 2 === 1) doc.rect(MARGE_PAYSAGE, y, LARGEUR_UTILE_PAYSAGE, hauteurLigne).fill(GRIS_FOND);

      const yTexte = y + 5;
      doc.font("Helvetica").fontSize(8).fillColor(GRIS_TEXTE);
      doc.text(ligne.reference, xRef + 8, yTexte, { width: COL_REF - 8, ellipsis: true, height: 11 });
      doc.text(formatDate(ligne.dateEmission), xDate, yTexte, { width: COL_DATE - 6 });
      doc.text(`${ligne.clientNom} (${ligne.clientCode})`, xClient, yTexte, {
        width: COL_CLIENT - 6,
        ellipsis: true,
        height: 11,
      });
      doc.fillColor(COULEUR_STATUT[ligne.statut] ?? GRIS_TEXTE);
      doc.text(LIBELLE_STATUT[ligne.statut] ?? ligne.statut, xStatut, yTexte, { width: COL_STATUT - 6 });
      doc.fillColor(GRIS_TEXTE);
      doc.text(montantSansDevise(ligne.totalHTG), xTotal, yTexte, { width: COL_TOTAL - 6, align: "right" });
      doc.text(montantSansDevise(ligne.payeHTG), xPaye, yTexte, { width: COL_PAYE - 6, align: "right" });
      doc.font("Helvetica-Bold");
      doc.fillColor(solde > 0n ? "#A31D1D" : "#1F6B3F");
      doc.text(montantSansDevise(solde), xSolde, yTexte, { width: COL_SOLDE - 10, align: "right" });

      y += hauteurLigne;
    });

    doc.moveTo(MARGE_PAYSAGE, y).lineTo(MARGE_PAYSAGE + LARGEUR_UTILE_PAYSAGE, y).lineWidth(0.8).stroke(GRIS_LIGNE);
    y += 14;

    // Bandeau de totaux, même traitement visuel que dessinerTotaux() sur la
    // facture individuelle : le total est toujours dans le bandeau bleu.
    const soldeTotal = totalHTG - payeHTG;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(GRIS_DOUX);
    doc.text("TOTAUX", xClient, y, { width: COL_CLIENT - 6 });
    doc.fillColor(GRIS_TEXTE);
    doc.text(montantSansDevise(totalHTG), xTotal, y, { width: COL_TOTAL - 6, align: "right" });
    doc.text(montantSansDevise(payeHTG), xPaye, y, { width: COL_PAYE - 6, align: "right" });
    doc.fillColor(soldeTotal > 0n ? "#A31D1D" : "#1F6B3F");
    doc.text(montantSansDevise(soldeTotal), xSolde, y, { width: COL_SOLDE - 10, align: "right" });

    doc.end();
  });
}

function dessinerPiedDePage(doc: PDFKit.PDFDocument) {
  // Le bloc entier doit tenir au-dessus de la marge basse : pdfkit ajoute
  // automatiquement une page dès qu'un doc.text() dépasserait cette limite, ce
  // qui produisait une seconde page vierge sur chaque facture (vérifié
  // empiriquement — le PDF annonçait /Count 2). On réserve donc la hauteur des
  // deux lignes du pied plus une marge de sécurité.
  const HAUTEUR_PIED = 30;
  const yPied = HAUTEUR_PAGE - MARGE - HAUTEUR_PIED;

  doc.moveTo(MARGE, yPied).lineTo(MARGE + LARGEUR_UTILE, yPied).lineWidth(0.8).stroke(GRIS_LIGNE);

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLEU_SOMBRE);
  doc.text("JEDCO Services S.A.", MARGE, yPied + 8, {
    width: LARGEUR_UTILE * 0.5,
    lineBreak: false,
  });
  doc.font("Helvetica").fontSize(7.5).fillColor(GRIS_DOUX);
  doc.text(
    "L'assainissement au service de la santé publique haïtienne — depuis 1994",
    MARGE,
    yPied + 17,
    { width: LARGEUR_UTILE * 0.7, lineBreak: false }
  );
  doc.text("Merci de votre confiance.", MARGE + LARGEUR_UTILE * 0.7, yPied + 12, {
    width: LARGEUR_UTILE * 0.3,
    align: "right",
    lineBreak: false,
  });
}
