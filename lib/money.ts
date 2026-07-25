// Toutes les sommes du système sont stockées en centimes HTG, en BigInt (§1.7) :
// un INTEGER Postgres plafonne à ~21,4M HTG, insuffisant pour un contrat
// municipal pluriannuel. Ne jamais faire d'arithmétique monétaire en `number`.

export type Centimes = bigint;

export function htgToCentimes(montantHTG: number): Centimes {
  if (!Number.isFinite(montantHTG)) {
    throw new Error(`Montant HTG invalide : ${montantHTG}`);
  }
  return BigInt(Math.round(montantHTG * 100));
}

export function centimesToHTG(centimes: Centimes): number {
  return Number(centimes) / 100;
}

export function formatHTG(centimes: Centimes): string {
  // Intl.NumberFormat("fr-FR") utilise l'espace insécable fine U+202F comme
  // séparateur de milliers (rendu correct en français) — comportement natif
  // conservé tel quel.
  const montant = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimesToHTG(centimes));
  return `${montant} HTG`;
}

export function additionner(...montants: Centimes[]): Centimes {
  return montants.reduce((total, m) => total + m, 0n);
}

export function soustraire(a: Centimes, b: Centimes): Centimes {
  return a - b;
}

// ─── Taux de change ──────────────────────────────────────────────────────────
// Le taux est encodé en entier (× 10 000) pour préserver 4 décimales sans
// arithmétique flottante. `tauxEncode` représente le nombre de HTG pour 1 USD.
const TAUX_SCALE = 10_000;

export function encoderTaux(tauxHtgParUsd: number): number {
  return Math.round(tauxHtgParUsd * TAUX_SCALE);
}

export function decoderTaux(tauxEncode: number): number {
  return tauxEncode / TAUX_SCALE;
}

// À utiliser uniquement pour un affichage indicatif (ex: Contrat, taux courant).
// Pour une Facture déjà émise, utiliser `centimesEnUSDAvecTauxFige` avec le
// `tauxUsdApplique` stocké sur la ligne — jamais ce taux courant (§1.11) :
// un document comptable émis ne doit plus jamais bouger.
export function centimesEnUSD(centimes: Centimes, tauxHtgParUsdCourant: number): number {
  return centimesToHTG(centimes) / tauxHtgParUsdCourant;
}

export function centimesEnUSDAvecTauxFige(centimes: Centimes, tauxEncode: number): number {
  return centimesToHTG(centimes) / decoderTaux(tauxEncode);
}

export function formatUSD(montant: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(montant);
}

// JSON.stringify lève une erreur sur un BigInt — à utiliser pour toute réponse
// d'API dont le payload contient des champs monétaires.
export function serialiserPourJSON<T>(valeur: T): T {
  return JSON.parse(
    JSON.stringify(valeur, (_key, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}
