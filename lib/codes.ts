import { prisma } from "@/lib/db";

// Génération de codes via les séquences PostgreSQL créées dans la migration
// 20260725015137_sequences_codes (§1.4) — nextval() est atomique côté base,
// contrairement à un "lire le max, ajouter 1" côté application qui produit
// des doublons sous concurrence.

type Prefixe = "JED" | "CTR" | "INT" | "FAC" | "TECH" | "TLT";

const SEQUENCES: Record<Prefixe, string> = {
  JED: "jed_client_seq",
  CTR: "jed_contrat_seq",
  INT: "jed_intervention_seq",
  FAC: "jed_facture_seq",
  TECH: "jed_technicien_seq",
  TLT: "jed_toilette_seq",
};

async function prochainNumero(prefixe: Prefixe): Promise<number> {
  const sequence = SEQUENCES[prefixe];
  const rows = await prisma.$queryRaw<
    { nextval: bigint }[]
  >`SELECT nextval(${sequence}::regclass) AS nextval`;
  return Number(rows[0].nextval);
}

function pad(n: number, largeur: number): string {
  return String(n).padStart(largeur, "0");
}

export async function codeClient(): Promise<string> {
  return `JED-${pad(await prochainNumero("JED"), 4)}`;
}

export async function referenceContrat(): Promise<string> {
  const annee = new Date().getFullYear();
  return `CTR-${annee}-${pad(await prochainNumero("CTR"), 4)}`;
}

export async function referenceIntervention(): Promise<string> {
  const annee = new Date().getFullYear();
  return `INT-${annee}-${pad(await prochainNumero("INT"), 4)}`;
}

export async function referenceFacture(): Promise<string> {
  const annee = new Date().getFullYear();
  return `FAC-${annee}-${pad(await prochainNumero("FAC"), 4)}`;
}

export async function matriculeTechnicien(): Promise<string> {
  return `TECH-${pad(await prochainNumero("TECH"), 3)}`;
}

export async function codeToilette(): Promise<string> {
  return `TLT-${pad(await prochainNumero("TLT"), 3)}`;
}
