// Générateur CSV minimal — RFC 4180. Pas de dépendance externe pour un format
// aussi simple, et surtout pas de sérialisation JSON.stringify naïve : une
// virgule ou un guillemet dans un nom de client casserait silencieusement les
// colonnes d'un tableur sans cette fonction.
function echapperChamp(valeur: string | number | null | undefined): string {
  const s = valeur === null || valeur === undefined ? "" : String(valeur);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// BOM UTF-8 (U+FEFF), écrit en séquence d'échappement plutôt qu'en caractère
// invisible littéral dans la source. Sans lui, Excel (très répandu chez un
// comptable en Haïti) affiche les accents corrompus au lieu de les deviner
// depuis le contenu du fichier.
const BOM_UTF8 = "\uFEFF";

export function genererCsv(entetes: string[], lignes: (string | number | null | undefined)[][]): string {
  const corps = [entetes, ...lignes].map((ligne) => ligne.map(echapperChamp).join(",")).join("\r\n");
  return `${BOM_UTF8}${corps}`;
}
