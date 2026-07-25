# JEDCO SERVICES S.A. — MASTER PROMPT ÉCOSYSTÈME DIGITAL
> Version: 2.0 | Auteur: Christopher JEROME | Mai 2026
> Ce fichier est le contexte maître complet à fournir à tout agent IA intervenant sur ce projet.
> Il contient : identité du projet, stack, architecture, base de données, tous les modules, l'AI layer, les règles de code, et les livrables attendus.

---

## 0. IDENTITÉ DU PROJET

- **Nom du système** : JEDCO Digital Ecosystem
- **Client** : JEDCO Services S.A. — première compagnie privée d'assainissement en Haïti, fondée en 1994
- **Siège** : 14 bis Rue Pélican, Route de l'Aéroport, Port-au-Prince, Haïti
- **Téléphones** : 2942-1109 / 2942-1110 / 2941-5159
- **Services offerts** : Vidange de fosses septiques, Collecte d'ordures, Location de toilettes mobiles, Pest Control, Nettoyage industriel, Contrats municipaux
- **Zones couvertes** : Port-au-Prince, Cap-Haïtien, Les Cayes, Jacmel, Saint-Marc
- **Développeur** : Christopher JEROME, Développeur Full-Stack, Port-au-Prince
- **Langue du système** : Français (interface, commentaires de code, messages d'erreur)
- **Monnaies** : HTG (gourdes) — stockage en base. USD affiché en parallèle (taux configurable)

---

## 1. STACK TECHNIQUE

### Backend
- **Runtime** : Node.js 20 LTS
- **Framework** : Fastify 4
- **ORM** : Prisma 5 + PostgreSQL 15
- **Validation** : Zod
- **Auth** : JWT (access token 15min + refresh token 7j)
- **Upload fichiers** : Multer + stockage local /uploads
- **PDF** : PDFKit
- **Jobs planifiés** : node-cron
- **Hébergement** : Railway (backend unifié + base de données PostgreSQL)

### Frontend
- **Framework** : React 18 + Vite
- **Styles** : Tailwind CSS 3
- **State** : Zustand
- **Data fetching** : TanStack Query (React Query)
- **Router** : React Router v6
- **Graphiques** : Recharts
- **Calendrier** : react-big-calendar
- **Formulaires** : React Hook Form + Zod resolver
- **Icônes** : Lucide React
- **Hébergement** : Vercel
  - Site vitrine public → `jedco.ht` (ou domaine Vercel par défaut)
  - Backoffice admin → même déploiement Vercel, route `/admin` protégée par auth

### AI Layer
- **SDK** : @anthropic-ai/sdk (dernière version)
- **Modèle** : claude-sonnet-4-20250514
- **Streaming** : SSE (Server-Sent Events) pour les réponses chat
- **Stockage conversations** : PostgreSQL (modèle Conversation)

---

## 2. THÈME & DESIGN

- **Couleur primaire** : `#1A4F8A` (bleu JEDCO)
- **Couleur secondaire** : `#FFFFFF` (blanc)
- **Fond doux** : `#E8F0F7` (bleu très clair pour les fonds de sections)
- **Texte principal** : `#1C1C1C`
- **Texte secondaire** : `#666666`
- **Succès** : `#2E8B57`
- **Danger** : `#DC2626`
- **Avertissement** : `#D97706`
- **Police** : Inter (Google Fonts)
- **Style général** : Professionnel, épuré, mobile-first
- **Logo** : Texte "JEDCO" en bleu `#1A4F8A`, bold, accompagné de "Services S.A." en regular

---

## 3. ARCHITECTURE DES DOSSIERS

```
jedco-ecosystem/
├── apps/
│   ├── api/                          # Backend Fastify — déployé sur Railway
│   │   ├── src/
│   │   │   ├── app.js
│   │   │   ├── config/
│   │   │   │   ├── database.js       # Prisma client singleton
│   │   │   │   ├── env.js            # Variables d'env validées par Zod
│   │   │   │   └── ai.js             # Anthropic SDK init
│   │   │   ├── plugins/
│   │   │   │   ├── auth.js           # JWT verify + RBAC
│   │   │   │   ├── cors.js
│   │   │   │   └── rateLimit.js
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── clients/
│   │   │   │   ├── contrats/
│   │   │   │   ├── interventions/
│   │   │   │   ├── vehicules/
│   │   │   │   ├── toilettes/
│   │   │   │   ├── techniciens/
│   │   │   │   ├── planning/
│   │   │   │   ├── factures/
│   │   │   │   ├── paiements/
│   │   │   │   ├── rapports/
│   │   │   │   └── ai/
│   │   │   └── utils/
│   │   │       ├── pdf.js
│   │   │       ├── codeGenerator.js
│   │   │       └── tarifsConverter.js
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.js
│   └── web/                          # React — déployé sur Vercel
│       ├── src/
│       │   ├── pages/
│       │   │   ├── public/           # Site vitrine
│       │   │   │   ├── Accueil.jsx
│       │   │   │   ├── Services.jsx
│       │   │   │   ├── Galerie.jsx
│       │   │   │   ├── Temoignages.jsx
│       │   │   │   ├── Zones.jsx
│       │   │   │   ├── Devis.jsx
│       │   │   │   ├── RendezVous.jsx
│       │   │   │   └── Contact.jsx
│       │   │   └── admin/            # Backoffice — /admin (protégé JWT)
│       │   │       ├── Dashboard.jsx
│       │   │       ├── Clients.jsx
│       │   │       ├── Contrats.jsx
│       │   │       ├── Interventions.jsx
│       │   │       ├── Planning.jsx
│       │   │       ├── Flotte.jsx
│       │   │       ├── Toilettes.jsx
│       │   │       ├── Techniciens.jsx
│       │   │       ├── Facturation.jsx
│       │   │       ├── Rapports.jsx
│       │   │       └── AIAssistant.jsx
│       │   ├── components/
│       │   ├── api/
│       │   │   └── client.js         # Axios centralisé
│       │   ├── store/                # Zustand stores
│       │   └── utils/
└── packages/
    └── shared/                       # Types et constantes partagés
```

---

## 4. BASE DE DONNÉES — SCHÉMA PRISMA COMPLET

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum Role {
  ADMIN
  SUPERVISEUR
  TECHNICIEN
}

enum TypeClient {
  PARTICULIER
  ENTREPRISE
  INSTITUTION
  ONG
}

enum TypeContrat {
  MENSUEL
  TRIMESTRIEL
  ANNUEL
  PONCTUEL
}

enum StatutContrat {
  ACTIF
  EXPIRE
  SUSPENDU
  RESILIE
}

enum TypeService {
  VIDANGE
  COLLECTE
  TOILETTE_MOBILE
  PEST_CONTROL
  NETTOYAGE
  AUTRE
}

enum StatutIntervention {
  EN_ATTENTE
  PLANIFIE
  EN_COURS
  COMPLETE
  ANNULE
}

enum Priorite {
  NORMALE
  URGENTE
}

enum TypeVehicule {
  CAMION_ASPIRATEUR
  CAMION_COLLECTE
  UTILITAIRE
}

enum StatutVehicule {
  DISPONIBLE
  EN_SERVICE
  EN_MAINTENANCE
  HORS_SERVICE
}

enum StatutToilette {
  DISPONIBLE
  LOUEE
  EN_MAINTENANCE
}

enum StatutFacture {
  EN_ATTENTE
  PAYEE
  PARTIELLEMENT_PAYEE
  EN_RETARD
  ANNULEE
}

enum ModePaiement {
  CASH
  VIREMENT
  CHEQUE
}

// ─── MODÈLES ─────────────────────────────────────────────────────────────────

model User {
  id         String      @id @default(cuid())
  email      String      @unique
  password   String
  nom        String
  prenom     String
  telephone  String?
  role       Role        @default(TECHNICIEN)
  actif      Boolean     @default(true)
  technicien Technicien?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
}

model Client {
  id            String           @id @default(cuid())
  code          String           @unique  // JED-0001
  nom           String
  type          TypeClient       @default(PARTICULIER)
  telephone     String
  email         String?
  adresse       String?
  ville         String           @default("Port-au-Prince")
  notes         String?
  actif         Boolean          @default(true)
  contrats      Contrat[]
  interventions Intervention[]
  factures      Facture[]
  toilettes     ToiletteMobile[]
  deletedAt     DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([ville, actif])
}

model Contrat {
  id                 String         @id @default(cuid())
  reference          String         @unique  // CTR-2026-0001
  clientId           String
  client             Client         @relation(fields: [clientId], references: [id])
  type               TypeContrat
  services           TypeService[]
  montantHTG         Int            // en centimes
  montantUSD         Int?           // en centimes
  dateDebut          DateTime
  dateFin            DateTime
  statut             StatutContrat  @default(ACTIF)
  renouvellementAuto Boolean        @default(false)
  interventions      Intervention[]
  factures           Facture[]
  deletedAt          DateTime?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  @@index([clientId, statut, dateFin])
}

model Intervention {
  id               String             @id @default(cuid())
  reference        String             @unique  // INT-2026-0001
  clientId         String
  client           Client             @relation(fields: [clientId], references: [id])
  contratId        String?
  contrat          Contrat?           @relation(fields: [contratId], references: [id])
  type             TypeService
  description      String?
  adresse          String
  ville            String
  statut           StatutIntervention @default(EN_ATTENTE)
  priorite         Priorite           @default(NORMALE)
  datePlanifiee    DateTime?
  dateExecution    DateTime?
  techniciens      Technicien[]
  vehiculeId       String?
  vehicule         Vehicule?          @relation(fields: [vehiculeId], references: [id])
  rapportExecution Json?              // {notes, heureDebut, heureFin, observations}
  photos           String[]
  facture          Facture?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  @@index([clientId, statut, datePlanifiee])
}

model Technicien {
  id             String         @id @default(cuid())
  userId         String         @unique
  user           User           @relation(fields: [userId], references: [id])
  matricule      String         @unique  // TECH-001
  specialites    TypeService[]
  zonesAssignees String[]
  disponible     Boolean        @default(true)
  interventions  Intervention[]
  presences      Presence[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model Presence {
  id           String     @id @default(cuid())
  technicienId String
  technicien   Technicien @relation(fields: [technicienId], references: [id])
  date         DateTime
  present      Boolean    @default(true)
  notes        String?
  createdAt    DateTime   @default(now())

  @@unique([technicienId, date])
  @@index([technicienId, date])
}

model Vehicule {
  id                String         @id @default(cuid())
  immatriculation   String         @unique
  marque            String
  modele            String
  type              TypeVehicule
  statut            StatutVehicule @default(DISPONIBLE)
  kilometrage       Int            @default(0)
  dernierEntretien  DateTime?
  prochainEntretien DateTime?
  notes             String?
  interventions     Intervention[]
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}

model ToiletteMobile {
  id                   String         @id @default(cuid())
  code                 String         @unique  // TLT-001
  statut               StatutToilette @default(DISPONIBLE)
  localisationActuelle String?
  clientId             String?
  client               Client?        @relation(fields: [clientId], references: [id])
  dateDebutLocation    DateTime?
  dateFinLocation      DateTime?
  notes                String?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
}

model Facture {
  id             String        @id @default(cuid())
  reference      String        @unique  // FAC-2026-0001
  clientId       String
  client         Client        @relation(fields: [clientId], references: [id])
  interventionId String?       @unique
  intervention   Intervention? @relation(fields: [interventionId], references: [id])
  contratId      String?
  contrat        Contrat?      @relation(fields: [contratId], references: [id])
  lignes         Json          // [{description, quantite, prixUnitaireHTG, totalHTG}]
  montantHTG     Int
  taxeHTG        Int           @default(0)
  totalHTG       Int
  statut         StatutFacture @default(EN_ATTENTE)
  modePaiement   ModePaiement?
  dateEmission   DateTime      @default(now())
  dateEcheance   DateTime
  datePaiement   DateTime?
  notes          String?
  paiements      Paiement[]
  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([clientId, statut, dateEcheance])
}

model Paiement {
  id           String       @id @default(cuid())
  factureId    String
  facture      Facture      @relation(fields: [factureId], references: [id])
  montantHTG   Int
  mode         ModePaiement
  reference    String?
  datePaiement DateTime     @default(now())
  createdBy    String
  createdAt    DateTime     @default(now())
}

model DemandeDevis {
  id        String      @id @default(cuid())
  nom       String
  telephone String
  email     String?
  service   TypeService
  ville     String
  message   String?
  traite    Boolean     @default(false)
  createdAt DateTime    @default(now())
}

model RendezVous {
  id          String      @id @default(cuid())
  nom         String
  telephone   String
  email       String?
  service     TypeService
  ville       String
  adresse     String?
  dateVoulue  DateTime
  message     String?
  statut      String      @default("EN_ATTENTE")  // EN_ATTENTE | CONFIRME | ANNULE
  createdAt   DateTime    @default(now())
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String?
  sessionId String   @unique @default(cuid())
  messages  Json[]   // [{role: "user"|"assistant", content: String, timestamp}]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Config {
  id        String   @id @default(cuid())
  cle       String   @unique  // ex: "TAUX_USD_HTG"
  valeur    String
  updatedAt DateTime @updatedAt
}
```

---

## 5. API BACKEND — ROUTES COMPLÈTES

### Convention de réponse (toujours respectée)
```json
{ "success": true, "data": {}, "message": "Opération réussie", "meta": { "page": 1, "limit": 20, "total": 150 } }
{ "success": false, "error": "Message d'erreur", "details": {} }
```

### AUTH — `/api/auth`
```
POST   /api/auth/login           Corps: {email, password} → {accessToken, refreshToken, user}
POST   /api/auth/refresh         Corps: {refreshToken} → {accessToken}
POST   /api/auth/logout
GET    /api/auth/me              [JWT] → profil utilisateur connecté
PUT    /api/auth/password        [JWT] Corps: {ancienPassword, nouveauPassword}
```

### SITE PUBLIC — `/api/public` (pas de JWT)
```
POST   /api/public/devis         Corps: {nom, telephone, email?, service, ville, message?}
POST   /api/public/rendez-vous   Corps: {nom, telephone, email?, service, ville, adresse?, dateVoulue, message?}
GET    /api/public/temoignages   → liste des témoignages actifs
POST   /api/public/ai-chat       Corps: {message, sessionId?} → SSE stream (assistant vitrine)
```

### CLIENTS — `/api/clients` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/clients              Query: ?ville=&type=&actif=&search=&page=&limit=
GET    /api/clients/:id
GET    /api/clients/:id/stats    → total interventions, factures, montant dû
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id          soft delete
```

### CONTRATS — `/api/contrats` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/contrats             Query: ?clientId=&statut=&type=&expirantDans=30
GET    /api/contrats/:id
POST   /api/contrats
PUT    /api/contrats/:id
DELETE /api/contrats/:id
POST   /api/contrats/:id/renouveler
```

### INTERVENTIONS — `/api/interventions` [JWT]
```
GET    /api/interventions                    Query: ?statut=&type=&ville=&technicienId=&date=&page=
GET    /api/interventions/:id
POST   /api/interventions                    [ADMIN, SUPERVISEUR]
PUT    /api/interventions/:id
PUT    /api/interventions/:id/statut         Corps: {statut}
POST   /api/interventions/:id/rapport        Corps: {notes, heureDebut, heureFin, observations, photos[]}
GET    /api/interventions/planning/:date     → interventions du jour groupées par technicien
```

### DEVIS & RENDEZ-VOUS — `/api/demandes` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/demandes/devis                   → liste des demandes non traitées
GET    /api/demandes/rendez-vous             Query: ?statut=&date=
PUT    /api/demandes/devis/:id/traiter       → marquer comme traité + créer client si besoin
PUT    /api/demandes/rendez-vous/:id/statut  Corps: {statut}
```

### VÉHICULES — `/api/vehicules` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/vehicules                   Query: ?statut=&type=
GET    /api/vehicules/:id
POST   /api/vehicules
PUT    /api/vehicules/:id
PUT    /api/vehicules/:id/statut        Corps: {statut}
GET    /api/vehicules/disponibles/:date → véhicules libres pour une date donnée
```

### TOILETTES MOBILES — `/api/toilettes` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/toilettes
GET    /api/toilettes/:id
POST   /api/toilettes
PUT    /api/toilettes/:id
POST   /api/toilettes/:id/louer         Corps: {clientId, dateDebut, dateFin, adresse}
POST   /api/toilettes/:id/retourner
```

### TECHNICIENS & RH — `/api/techniciens` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/techniciens                      Query: ?disponible=&zone=&specialite=
GET    /api/techniciens/:id
GET    /api/techniciens/:id/planning/:semaine → interventions de la semaine
GET    /api/techniciens/:id/performances      → stats: nb interventions, taux completion
POST   /api/techniciens
PUT    /api/techniciens/:id
POST   /api/techniciens/:id/presences        Corps: {date, present, notes?}
GET    /api/techniciens/:id/presences        Query: ?mois=&annee=
```

### FACTURATION — `/api/factures` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/factures               Query: ?clientId=&statut=&dateDebut=&dateFin=
GET    /api/factures/:id
POST   /api/factures
PUT    /api/factures/:id
DELETE /api/factures/:id           soft delete
GET    /api/factures/:id/pdf       → stream PDF
GET    /api/factures/stats         → revenus par service, par période, par ville
```

### PAIEMENTS — `/api/paiements` [JWT | ADMIN, SUPERVISEUR]
```
POST   /api/paiements              Corps: {factureId, montantHTG, mode, reference?}
GET    /api/paiements/facture/:factureId
```

### RAPPORTS — `/api/rapports` [JWT | ADMIN, SUPERVISEUR]
```
GET    /api/rapports/dashboard         → KPIs temps réel
GET    /api/rapports/interventions     Query: ?dateDebut=&dateFin=&type=&ville=&technicienId=
GET    /api/rapports/financier         Query: ?dateDebut=&dateFin=
GET    /api/rapports/flotte
GET    /api/rapports/techniciens       → performances + présences
GET    /api/rapports/satisfaction      → taux de satisfaction client
GET    /api/rapports/export            Query: ?type=&format=pdf|excel
```

### AI — `/api/ai` [JWT]
```
POST   /api/ai/chat          Corps: {message, sessionId?} → SSE stream
POST   /api/ai/analyse       Corps: {type, periode} → JSON structuré
GET    /api/ai/suggestions   → suggestions basées sur les données du jour
```

---

## 6. SITE WEB PUBLIC — DÉTAIL DES PAGES

### Pages & contenu

| Page | Contenu |
|------|---------|
| **Accueil** | Hero avec présentation JEDCO, services en aperçu, stats (30 ans, 5 villes, 1000+ clients), CTA "Demander un devis" |
| **Services** | Page dédiée par service : Vidange, Collecte, Toilettes mobiles, Pest Control, Nettoyage industriel — description, cas d'usage, CTA |
| **Devis en ligne** | Formulaire : nom, téléphone, email, type de service, ville, message → POST `/api/public/devis` |
| **Prise de rendez-vous** | Formulaire avec sélecteur de date/heure → POST `/api/public/rendez-vous` |
| **Galerie** | Photos et vidéos des interventions terrain, filtrables par type de service |
| **Témoignages** | Cards clients avec nom, type (entreprise/particulier), note, commentaire |
| **Zones desservies** | Carte visuelle Haïti avec les 5 villes surlignées + description de la couverture |
| **Contact** | Adresses, téléphones, Google Maps intégré, formulaire de contact rapide |

### Caractéristiques techniques
- Bilingue **Français / Créole haïtien** (bouton switch langue, i18n)
- SEO optimisé (meta tags, Open Graph, sitemap)
- Responsive mobile-first
- Déployé sur Vercel

---

## 7. BACKOFFICE ADMIN — DÉTAIL DES MODULES

### Accès
- Route protégée `/admin` — redirige vers `/admin/login` si pas de JWT valide
- Sidebar fixe à gauche, topbar fixe en haut, contenu scrollable à droite
- RBAC : ADMIN voit tout, SUPERVISEUR voit tout sauf gestion utilisateurs, TECHNICIEN accès limité à ses interventions

---

### 7.1 DASHBOARD

**KPIs temps réel :**
- Interventions du jour : planifiées / en cours / complétées / annulées
- Nouvelles demandes de devis non traitées (badge alerte)
- Rendez-vous du jour
- Véhicules disponibles vs en service vs en maintenance
- Techniciens actifs aujourd'hui
- Factures en retard (nombre + montant total HTG)
- Contrats expirant dans 30 jours

**Widgets graphiques :**
- Graphique barres : interventions par jour (30 derniers jours) — Recharts
- Graphique donut : répartition par type de service — Recharts
- Feed activité récente (10 dernières actions)

**Widget AI :**
- Zone de saisie rapide en bas du dashboard
- Appel `/api/ai/chat` avec contexte du jour injecté automatiquement
- Réponse en streaming SSE affichée progressivement

---

### 7.2 CLIENTS & CONTRATS

**Liste clients :**
- Table avec filtres : type, ville, statut actif/inactif, recherche texte
- Colonnes : code, nom, type, ville, téléphone, nb interventions, statut

**Fiche client (onglets) :**
1. **Infos** : coordonnées complètes, type, ville, notes
2. **Contrats** : liste contrats actifs + historique, bouton nouveau contrat
3. **Interventions** : timeline chronologique de toutes les interventions
4. **Factures** : liste avec statuts colorés, téléchargement PDF

**Gestion contrats :**
- Contrats récurrents : MENSUEL, TRIMESTRIEL, ANNUEL, PONCTUEL
- Services couverts par le contrat (multi-sélection)
- Renouvellement automatique configurable
- Alerte automatique J-30 avant expiration (badge dans le dashboard)
- Codification auto : `CTR-2026-0001`

---

### 7.3 COMMANDES & INTERVENTIONS

**Tableau de bord des demandes entrantes :**
- File des demandes reçues (web + saisie manuelle téléphone)
- Tri par priorité (URGENTE en rouge, NORMALE en bleu)
- Conversion demande → bon d'intervention en un clic

**Création d'un bon d'intervention :**
1. Sélection client (autocomplete par nom ou code)
2. Type de service + description détaillée
3. Adresse + ville
4. Date et heure planifiées
5. Priorité : NORMALE / URGENTE
6. Assignation technicien(s) disponibles à cette date
7. Assignation véhicule disponible à cette date
8. Lien optionnel à un contrat existant
9. Sauvegarde → statut initial EN_ATTENTE

**Workflow statut :**
```
EN_ATTENTE → PLANIFIE → EN_COURS → COMPLETE
                ↓
             ANNULE
```

**Calendrier des interventions :**
- Vue semaine et vue jour (react-big-calendar)
- Filtrable par technicien et par type de service
- Drag & drop pour replanifier une intervention
- Code couleur par statut

**Rapport d'exécution :**
- Notes et observations terrain
- Photos uploadées
- Heure de début et fin effective
- Rempli par le superviseur après retour terrain

---

### 7.4 FLOTTE & ÉQUIPEMENTS

**Véhicules :**
- Grille des véhicules avec statut coloré (vert = disponible, orange = en service, rouge = maintenance)
- Fiche véhicule : immatriculation, marque, modèle, type, kilométrage
- Suivi entretien préventif : date dernier entretien, date prochain entretien
- Alerte automatique si `prochainEntretien < aujourd'hui` → badge rouge dans la sidebar
- Historique des interventions par véhicule

**Toilettes mobiles :**
- Inventaire complet avec code unique (TLT-001)
- Statuts : DISPONIBLE / LOUEE / EN_MAINTENANCE
- Localisation actuelle pour les unités louées
- Client assigné + dates de début et fin de location
- Vue calendrier des locations

---

### 7.5 RESSOURCES HUMAINES

**Gestion des techniciens :**
- Fiche technicien : profil complet, matricule, spécialités (types de service maîtrisés), zones assignées
- Statut de disponibilité (actif/inactif)

**Planning des équipes :**
- Vue semaine : grille par technicien avec leurs interventions assignées
- Vue jour : liste des techniciens avec leurs missions du jour
- Filtrable par zone et par spécialité

**Suivi des présences :**
- Saisie journalière des présences / absences par technicien
- Vue mensuelle calendrier des présences (vert = présent, rouge = absent)
- Export mensuel des présences en Excel

**Performances :**
- Nb d'interventions complétées par technicien sur une période
- Taux de complétion (COMPLETE / total assigné)
- Comparatif entre techniciens (graphique barres Recharts)

---

### 7.6 FACTURATION & FINANCE

**Génération des factures :**
- Automatique à la complétion d'une intervention (proposition en un clic)
- Manuelle pour les contrats récurrents ou situations spéciales
- Cron mensuel pour les contrats récurrents (node-cron)

**Structure facture PDF :**
```
JEDCO Services S.A.
14 bis Rue Pélican, Route de l'Aéroport, PAP
Tél: 2942-1109 | 2942-1110

FACTURE N° FAC-2026-0001
Date d'émission : [date]     Échéance : [date + 30j]

FACTURER À : [Nom client] — Code : JED-0001

| Description              | Qté | Prix unit. (HTG) | Total (HTG) |
|--------------------------|-----|-----------------|-------------|
| Vidange fosse septique   |  1  |     25 000      |   25 000    |

                    Sous-total :   25 000 HTG
                    Taxe (0%) :         0 HTG
                    TOTAL DÛ :     25 000 HTG

Mode de paiement : [mode]
```

**Suivi des paiements :**
- Statuts colorés : PAYEE (vert), EN_ATTENTE (orange), EN_RETARD (rouge), PARTIELLEMENT_PAYEE (jaune)
- Paiements partiels supportés (plusieurs versements par facture)
- Modes : CASH, VIREMENT, CHEQUE

**Tableau de bord financier :**
- Revenus totaux par mois (graphique ligne)
- Revenus par type de service (graphique barres)
- Revenus par ville / région
- Montant total des impayés
- Taux de recouvrement

**Export comptable :**
- Export Excel de toutes les factures avec statuts sur une période
- Export PDF du rapport financier mensuel

---

### 7.7 REPORTING & ANALYTIQUE

**Rapports disponibles :**
- Interventions par service, par ville, par technicien, par période
- Taux de satisfaction client (basé sur les retours saisis manuellement)
- Performance des équipes (interventions, présences, complétion)
- Occupation de la flotte (véhicules + toilettes)
- Clients inactifs depuis X mois
- Contrats expirant prochainement

**Export :**
- PDF pour les rapports de direction
- Excel pour les données brutes

**Analyse IA :**
- Bouton "Générer analyse IA" sur chaque rapport
- Appel `/api/ai/analyse` avec les données filtrées
- Résultat affiché : résumé, points clés, tendances, alertes, recommandations

---

## 8. AI LAYER — PROMPTS SYSTÈME COMPLETS

### 8.1 Assistant Backoffice (opérateurs internes)

```
Tu es l'assistant intelligent de JEDCO Services S.A., la première compagnie
privée d'assainissement en Haïti, fondée en 1994. Tu assistes les opérateurs
et superviseurs dans la gestion quotidienne des opérations.

TES CAPACITÉS :
- Analyser les données opérationnelles injectées dans ton contexte
- Suggérer l'optimisation du planning d'interventions
- Identifier les clients à relancer (contrats expirés, impayés)
- Alerter sur les anomalies (véhicules en retard de maintenance, techniciens surchargés)
- Rédiger des synthèses opérationnelles

RÈGLES :
- Tu réponds toujours en français, de façon concise et professionnelle
- Tu bases tes réponses uniquement sur les données fournies dans le contexte
- Si une information manque, tu le signales clairement
- Tu utilises le format Markdown pour structurer tes réponses longues

CONTEXTE INJECTÉ DYNAMIQUEMENT :
[STATS_DU_JOUR]
[DONNÉES_DEMANDÉES]
```

### 8.2 Assistant Vitrine Publique (visiteurs du site)

```
Tu es l'assistant virtuel de JEDCO Services S.A., la première compagnie
d'assainissement professionnel en Haïti depuis 1994. Tu aides les visiteurs
du site à comprendre les services et à soumettre leurs demandes.

TES CAPACITÉS :
- Expliquer les services JEDCO : vidange de fosses septiques, collecte d'ordures,
  location de toilettes mobiles, pest control, nettoyage industriel
- Aider le visiteur à identifier le bon service selon son besoin
- Orienter vers le formulaire de devis ou de rendez-vous
- Informer sur les zones couvertes : PAP, Cap-Haïtien, Les Cayes, Jacmel, Saint-Marc

RÈGLES :
- Tu réponds en français ou en créole haïtien selon la langue du visiteur
- Tu es courtois, chaleureux et professionnel
- Tu NE donnes JAMAIS de tarifs précis — tu orientes : "Remplissez le formulaire de devis"
- Tu NE parles QUE des services JEDCO
- Contact JEDCO si urgence : 2942-1109 / 2942-1110
```

### 8.3 Analyse & Rapport Exécutif

```
Tu es un analyste de données senior pour JEDCO Services S.A.
Tu reçois des données opérationnelles brutes et produis des analyses structurées.

FORMAT DE SORTIE OBLIGATOIRE (JSON strict, sans texte autour) :
{
  "resume": "string (2-3 phrases)",
  "points_cles": ["string", ...],
  "tendances": [{"label": "string", "valeur": "string", "evolution": "hausse|baisse|stable"}],
  "alertes": ["string", ...],
  "recommandations": ["string", ...]
}

RÈGLES :
- JSON uniquement, aucun texte avant ni après
- Basé exclusivement sur les données fournies
- Recommandations concrètes et adaptées au contexte haïtien

DONNÉES INJECTÉES :
[DONNÉES_PÉRIODE]
```

---

## 9. RÈGLES DE CODE OBLIGATOIRES

### Backend
- Chaque module suit la structure : `router.js`, `controller.js`, `service.js`, `schema.js` (Zod)
- La logique métier est dans `service.js` uniquement — jamais dans le router
- Toute requête Prisma est dans `service.js` — jamais dans le controller
- Les erreurs sont catchées avec `try/catch` et retournées via le format uniforme
- Les variables d'environnement sont validées au démarrage via Zod dans `config/env.js`
- Les montants sont TOUJOURS stockés en centimes HTG (25 000 HTG = 2 500 000 en base)
- Les dates sont stockées en UTC, converties en `America/Port-au-Prince` à l'affichage
- Logger : Pino (intégré Fastify) — pas de `console.log` en production

### Frontend
- Les appels API passent tous par `api/client.js` centralisé (Axios + intercepteurs JWT)
- Les états serveur passent par TanStack Query — jamais de `useState` pour les données API
- Les formulaires utilisent React Hook Form + Zod resolver
- Les couleurs respectent strictement le thème défini en section 2
- Les routes `/admin/*` sont protégées par un composant `<PrivateRoute>` vérifiant le JWT

### Général
- Pas de secrets en dur dans le code — tout dans `.env`
- Commits au format : `feat:`, `fix:`, `chore:`, `docs:`

---

## 10. VARIABLES D'ENVIRONNEMENT

```env
# Base de données (Railway PostgreSQL)
DATABASE_URL="postgresql://user:password@railway.app:5432/jedco_db"

# JWT
JWT_SECRET="[secret_fort_256bits]"
JWT_REFRESH_SECRET="[secret_fort_256bits]"

# Anthropic AI
ANTHROPIC_API_KEY="sk-ant-..."

# App
PORT=3000
NODE_ENV=production
FRONTEND_URL="https://jedco.vercel.app"

# Taux de change (mis à jour manuellement ou via cron)
TAUX_USD_HTG=132
```

---

## 11. ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

```
Phase 1 — Fondation (Semaines 1-2)
  ✅ Setup repo + Railway + Vercel
  ✅ Schema Prisma + migrations + seed
  ✅ API Auth (login, JWT, RBAC)
  ✅ CRUD Clients + Contrats

Phase 2 — Opérations Core (Semaines 3-5)
  ✅ CRUD Interventions + workflow statuts
  ✅ Gestion Flotte (Véhicules + Toilettes)
  ✅ Gestion Techniciens + Présences
  ✅ Demandes devis & rendez-vous (site public → backoffice)

Phase 3 — Backoffice UI (Semaines 6-8)
  ✅ Layout admin + Auth front
  ✅ Dashboard avec KPIs + graphiques
  ✅ Pages Clients, Contrats, Interventions, Calendrier
  ✅ Pages Flotte, RH (Planning + Présences)
  ✅ Facturation + PDF + Paiements
  ✅ Reporting + Export

Phase 4 — Site Vitrine (Semaine 9)
  ✅ Toutes les pages publiques
  ✅ Formulaires devis + rendez-vous
  ✅ Galerie + Témoignages + Carte zones
  ✅ Bilingue FR/Créole (i18n)

Phase 5 — AI Layer (Semaine 10)
  ✅ Assistant backoffice (SSE streaming)
  ✅ Assistant vitrine publique
  ✅ Analyse & rapport exécutif IA
  ✅ Widget AI dans le dashboard

Phase 6 — Tests & Déploiement (Semaines 11-12)
  ✅ Tests end-to-end
  ✅ Configuration Railway + Vercel production
  ✅ Mise en production
  ✅ Formation équipe JEDCO
```

---

## 12. LIVRABLES ATTENDUS PAR TÂCHE

1. **Nouveau fichier** → chemin complet + contenu intégral
2. **Modification** → fichier concerné + section modifiée + nouveau code
3. **Migration Prisma** → fichier de migration complet
4. **Nouveau module backend** → les 4 fichiers : `router.js`, `controller.js`, `service.js`, `schema.js`
5. **Nouveau composant React** → fichier complet avec tous les imports
6. **Variable d'env ajoutée** → signalée explicitement avec sa description

---

*Fin du Master Prompt JEDCO v2.0 — Christopher JEROME — Mai 2026*
