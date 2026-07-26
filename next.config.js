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
  // Le logo de l'en-tête de facture est lu depuis public/ à l'exécution
  // (lib/pdf.ts). Les fichiers de public/ sont servis statiquement mais ne
  // sont pas automatiquement présents sur le système de fichiers d'une
  // fonction serverless Vercel — sans cette déclaration, la génération PDF
  // perdrait le logo en production alors qu'il s'affiche en local.
  outputFileTracingIncludes: {
    "/api/factures/[id]/pdf": ["./public/jedco-logo.png"],
  },
};

module.exports = nextConfig;
