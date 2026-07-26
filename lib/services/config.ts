import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";

export const CLE_TAUX_USD = "TAUX_USD_HTG";

// Bornes larges et volontairement peu contraignantes : la gourde est volatile
// et personne ne sait où elle sera dans cinq ans. Elles ne sont là que pour
// arrêter une faute de frappe grossière (0, négatif, ou un chiffre absurde),
// pas pour juger d'un taux plausible.
//
// Le plafond découle aussi d'une contrainte technique : le taux est stocké
// multiplié par 10 000 dans un entier PostgreSQL, qui plafonne à ~2,1 milliards.
const TAUX_MIN = 1;
const TAUX_MAX = 100_000;

export type TauxUsd = {
  valeur: number | null;
  misAJourLe: Date | null;
};

export async function obtenirTauxUsd(): Promise<TauxUsd> {
  const config = await prisma.config.findUnique({ where: { cle: CLE_TAUX_USD } });
  if (!config) return { valeur: null, misAJourLe: null };

  const valeur = Number(config.valeur);
  if (!Number.isFinite(valeur) || valeur <= 0) return { valeur: null, misAJourLe: config.updatedAt };

  return { valeur, misAJourLe: config.updatedAt };
}

export async function definirTauxUsd(valeur: number): Promise<TauxUsd> {
  if (!Number.isFinite(valeur) || valeur < TAUX_MIN || valeur > TAUX_MAX) {
    throw new ErreurMetier(
      `Le taux doit être un nombre entre ${TAUX_MIN} et ${TAUX_MAX} HTG pour 1 USD`,
      400
    );
  }

  // Stocké en texte tel que saisi (la table Config est générique), relu et
  // converti à l'usage. On normalise à 4 décimales, la précision de l'encodage
  // entier utilisé sur les factures (§1.11) — au-delà, l'admin croirait à tort
  // que sa saisie est conservée intégralement.
  const normalisee = String(Math.round(valeur * 10_000) / 10_000);

  const config = await prisma.config.upsert({
    where: { cle: CLE_TAUX_USD },
    create: { cle: CLE_TAUX_USD, valeur: normalisee },
    update: { valeur: normalisee },
  });

  return { valeur: Number(config.valeur), misAJourLe: config.updatedAt };
}

// Retire le taux : les factures et devis émis ensuite n'afficheront plus
// d'équivalent USD (tauxUsdCourantEncode renvoie null, et lib/pdf.ts omet
// alors la ligne). Les documents déjà émis gardent leur taux figé.
export async function desactiverTauxUsd(): Promise<void> {
  await prisma.config.deleteMany({ where: { cle: CLE_TAUX_USD } });
}
