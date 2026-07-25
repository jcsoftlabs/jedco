// Le décalage horaire d'Haïti varie selon la saison (GMT-4 en été, GMT-5 en
// hiver, selon les règles IANA du fuseau America/Port-au-Prince — vérifié
// empiriquement, ne pas supposer un décalage fixe). Un calcul de "aujourd'hui"
// en heure serveur (souvent UTC) se trompe de jour pour tout ce qui se passe
// en soirée heure locale — les interventions du soir et les rapports saisis
// en fin de journée (§1.14). Toute borne de journée doit passer par ce module,
// qui ne fait aucune hypothèse sur le décalage : il interroge Intl, source de
// vérité des règles de fuseaux IANA (DST comprises).
//
// Implémentation via Intl.DateTimeFormat plutôt que date-fns-tz : la version 3
// de cette librairie calcule un décalage horaire incorrect selon le fuseau du
// système d'exécution (vérifié empiriquement — écart d'une heure reproductible
// sur ce projet).

export const HAITI_TZ = "America/Port-au-Prince";

function decalageMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const commeUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return commeUTC - date.getTime();
}

export function debutJourLocal(date: Date, timeZone: string = HAITI_TZ): Date {
  const decalage = decalageMs(date, timeZone);
  const shifted = new Date(date.getTime() + decalage);
  const minuitCommeUTC = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  // Deuxième passe : recalcule le décalage exactement au voisinage de minuit
  // local — nécessaire car le décalage d'Haïti change selon la saison.
  const approx = new Date(minuitCommeUTC - decalage);
  const decalagePrecis = decalageMs(approx, timeZone);
  return new Date(minuitCommeUTC - decalagePrecis);
}

export function finJourLocal(date: Date, timeZone: string = HAITI_TZ): Date {
  const debut = debutJourLocal(date, timeZone);
  // Avance largement dans le jour suivant (marge de sécurité pour les jours
  // de 23h lors d'un changement d'heure) puis reprend son début de journée.
  const lendemain = new Date(debut.getTime() + 25 * 3_600_000);
  const debutLendemain = debutJourLocal(lendemain, timeZone);
  return new Date(debutLendemain.getTime() - 1);
}

export function plageAujourdhui(
  timeZone: string = HAITI_TZ,
  maintenant: Date = new Date()
): { debut: Date; fin: Date } {
  return { debut: debutJourLocal(maintenant, timeZone), fin: finJourLocal(maintenant, timeZone) };
}

export function memeJourLocal(a: Date, b: Date, timeZone: string = HAITI_TZ): boolean {
  return debutJourLocal(a, timeZone).getTime() === debutJourLocal(b, timeZone).getTime();
}
