const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // pdfkit charge ses fichiers de polices standards (.afm) via fs.readFileSync
  // avec des chemins relatifs résolus à l'exécution. Si Webpack bundle ce code
  // (comportement par défaut), ces fichiers ne sont pas copiés dans
  // .next/server/ et la lecture échoue avec ENOENT — vérifié empiriquement en
  // générant un PDF de facture. Exclure pdfkit du bundling le fait charger
  // nativement via require() depuis node_modules, où ces fichiers existent
  // réellement.
  serverExternalPackages: ["pdfkit"],
};

module.exports = nextConfig;
