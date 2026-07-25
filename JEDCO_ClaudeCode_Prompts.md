# JEDCO — SÉQUENCE DE PROMPTS CLAUDE CODE
> Auteur: Christopher JEROME | Mai 2026
> Utilisation: Colle le contenu de JEDCO_MasterPrompt_V1.md en contexte au début de chaque session Claude Code, puis exécute les prompts ci-dessous dans l'ordre exact.

---

## 📌 INSTRUCTION PERMANENTE (à donner UNE FOIS au début de chaque session)

```
Voici le master prompt du projet JEDCO. Lis-le entièrement et garde-le 
comme contexte pour toute la session. Ne génère rien encore.
[COLLER LE CONTENU DE JEDCO_MasterPrompt_V1.md ICI]
```

---

## PHASE 1 — FONDATION

### Prompt 1.1 — Setup du repo et structure
```
En te basant sur le master prompt JEDCO, initialise le projet :
1. Crée la structure monorepo exacte définie dans la section 3 (Architecture)
2. Initialise apps/api avec Fastify 4 + les dépendances : fastify, @fastify/cors, 
   @fastify/jwt, @fastify/rate-limit, @fastify/multipart, prisma, @prisma/client, 
   zod, pino, pino-pretty, dotenv, node-cron, pdfkit
3. Initialise apps/web avec Vite + React 18 + les dépendances : react-router-dom, 
   axios, zustand, @tanstack/react-query, tailwindcss, react-hook-form, 
   @hookform/resolvers, zod, recharts, react-big-calendar, lucide-react
4. Crée le fichier .env.example avec toutes les variables définies en section 10
5. Crée un README.md avec les instructions de démarrage
Fournis tous les fichiers avec leur chemin complet et contenu intégral.
```

### Prompt 1.2 — Schema Prisma + configuration DB
```
En te basant sur le master prompt JEDCO section 4, génère :
1. Le fichier apps/api/prisma/schema.prisma complet avec tous les modèles 
   et enums exactement comme définis
2. Le fichier apps/api/src/config/database.js (Prisma client singleton)
3. Le fichier apps/api/src/config/env.js (validation Zod de toutes les variables d'env)
4. Le fichier apps/api/prisma/seed.js avec :
   - 1 user ADMIN (email: admin@jedco.ht, password: Admin1234!)
   - 1 user SUPERVISEUR
   - 2 Techniciens avec leurs profils
   - 3 Clients exemples (1 PARTICULIER, 1 ENTREPRISE, 1 ONG)
   - 2 Véhicules (1 CAMION_ASPIRATEUR, 1 CAMION_COLLECTE)
   - 3 ToiletteMobile
Fournis tous les fichiers complets.
```

### Prompt 1.3 — Setup Fastify + Auth
```
En te basant sur le master prompt JEDCO, génère :
1. apps/api/src/app.js — entry point Fastify avec enregistrement de tous les plugins
2. apps/api/src/plugins/auth.js — middleware JWT verify + RBAC (fonction checkRole)
3. apps/api/src/plugins/cors.js — CORS configuré pour accepter FRONTEND_URL
4. apps/api/src/plugins/rateLimit.js
5. apps/api/src/utils/codeGenerator.js — fonctions pour générer :
   - codeClient() → "JED-0001" auto-incrémenté depuis la DB
   - referenceContrat() → "CTR-2026-0001"
   - referenceIntervention() → "INT-2026-0001"
   - referenceFacture() → "FAC-2026-0001"
6. Le module auth complet (4 fichiers) :
   - src/modules/auth/router.js
   - src/modules/auth/controller.js
   - src/modules/auth/service.js
   - src/modules/auth/schema.js
   Routes : POST /login, POST /refresh, POST /logout, GET /me, PUT /password
Fournis tous les fichiers complets.
```

### Prompt 1.4 — Module Clients
```
En te basant sur le master prompt JEDCO sections 5 et 7.2, génère le module 
clients complet (4 fichiers) :
- src/modules/clients/router.js
- src/modules/clients/controller.js
- src/modules/clients/service.js
- src/modules/clients/schema.js

Routes à implémenter :
GET    /api/clients              (pagination + filtres ville, type, actif, search)
GET    /api/clients/:id
GET    /api/clients/:id/stats    (total interventions, factures, montant dû)
POST   /api/clients              (génère le code JED-XXXX automatiquement)
PUT    /api/clients/:id
DELETE /api/clients/:id          (soft delete via deletedAt)

Règles :
- Montants en centimes HTG
- Soft delete uniquement
- Format réponse uniforme {success, data, message, meta}
Fournis les 4 fichiers complets.
```

### Prompt 1.5 — Module Contrats
```
En te basant sur le master prompt JEDCO section 5, génère le module 
contrats complet (4 fichiers) :
- src/modules/contrats/router.js
- src/modules/contrats/controller.js
- src/modules/contrats/service.js
- src/modules/contrats/schema.js

Routes :
GET    /api/contrats             (filtres clientId, statut, type, expirantDans)
GET    /api/contrats/:id
POST   /api/contrats             (génère référence CTR-XXXX automatiquement)
PUT    /api/contrats/:id
DELETE /api/contrats/:id         (soft delete)
POST   /api/contrats/:id/renouveler

Inclure dans le service un cron node-cron qui tourne chaque jour à 8h 
et marque comme EXPIRE les contrats dont dateFin < aujourd'hui.
Fournis les 4 fichiers complets.
```

---

## PHASE 2 — OPÉRATIONS CORE

### Prompt 2.1 — Module Interventions
```
En te basant sur le master prompt JEDCO sections 5 et 7.3, génère le module 
interventions complet (4 fichiers) :
- src/modules/interventions/router.js
- src/modules/interventions/controller.js
- src/modules/interventions/service.js
- src/modules/interventions/schema.js

Routes :
GET    /api/interventions                    (filtres statut, type, ville, technicienId, date, page)
GET    /api/interventions/:id
POST   /api/interventions                    (génère référence INT-XXXX)
PUT    /api/interventions/:id
PUT    /api/interventions/:id/statut         (workflow EN_ATTENTE→PLANIFIE→EN_COURS→COMPLETE|ANNULE)
POST   /api/interventions/:id/rapport        (notes, heureDebut, heureFin, observations, photos[])
GET    /api/interventions/planning/:date     (interventions du jour groupées par technicien)

Règle : quand statut passe à COMPLETE, créer automatiquement une proposition 
de facture (flag dans la réponse : "factureProposee: true").
Fournis les 4 fichiers complets.
```

### Prompt 2.2 — Module Flotte (Véhicules + Toilettes)
```
En te basant sur le master prompt JEDCO sections 5 et 7.4, génère :

Module véhicules (4 fichiers) :
- src/modules/vehicules/router.js
- src/modules/vehicules/controller.js
- src/modules/vehicules/service.js
- src/modules/vehicules/schema.js
Routes : GET liste, GET :id, POST, PUT :id, PUT :id/statut, GET disponibles/:date

Module toilettes (4 fichiers) :
- src/modules/toilettes/router.js
- src/modules/toilettes/controller.js
- src/modules/toilettes/service.js
- src/modules/toilettes/schema.js
Routes : GET liste, GET :id, POST, PUT :id, POST :id/louer, POST :id/retourner

Ajouter un cron qui tourne chaque matin et alerte (log + flag en DB) 
les véhicules dont prochainEntretien < aujourd'hui.
Fournis les 8 fichiers complets.
```

### Prompt 2.3 — Module RH (Techniciens + Présences)
```
En te basant sur le master prompt JEDCO sections 5 et 7.5, génère le module 
techniciens complet (4 fichiers) :
- src/modules/techniciens/router.js
- src/modules/techniciens/controller.js
- src/modules/techniciens/service.js
- src/modules/techniciens/schema.js

Routes :
GET    /api/techniciens                       (filtres disponible, zone, specialite)
GET    /api/techniciens/:id
GET    /api/techniciens/:id/planning/:semaine  (interventions de la semaine ISO)
GET    /api/techniciens/:id/performances       (stats: nb interventions, taux complétion)
POST   /api/techniciens                        (crée User + Technicien en transaction)
PUT    /api/techniciens/:id
POST   /api/techniciens/:id/presences          (Corps: {date, present, notes?})
GET    /api/techniciens/:id/presences          (Query: ?mois=&annee=)
Fournis les 4 fichiers complets.
```

### Prompt 2.4 — Module Demandes (Devis + Rendez-vous)
```
En te basant sur le master prompt JEDCO section 5, génère le module demandes (4 fichiers) :
- src/modules/demandes/router.js
- src/modules/demandes/controller.js
- src/modules/demandes/service.js
- src/modules/demandes/schema.js

Routes publiques (sans JWT) :
POST   /api/public/devis
POST   /api/public/rendez-vous

Routes backoffice (JWT requis) :
GET    /api/demandes/devis                    (liste non traitées)
GET    /api/demandes/rendez-vous              (filtres statut, date)
PUT    /api/demandes/devis/:id/traiter        (marque traité + option créer client)
PUT    /api/demandes/rendez-vous/:id/statut
Fournis les 4 fichiers complets.
```

### Prompt 2.5 — Module Facturation + PDF
```
En te basant sur le master prompt JEDCO sections 5 et 7.6, génère :

Module factures (4 fichiers) :
- src/modules/factures/router.js
- src/modules/factures/controller.js
- src/modules/factures/service.js
- src/modules/factures/schema.js

Routes :
GET    /api/factures              (filtres clientId, statut, dateDebut, dateFin)
GET    /api/factures/:id
GET    /api/factures/:id/pdf      (stream PDF généré par PDFKit)
GET    /api/factures/stats        (revenus par service, période, ville)
POST   /api/factures
PUT    /api/factures/:id
DELETE /api/factures/:id          (soft delete)

Module paiements (4 fichiers) :
- src/modules/paiements/router.js
- src/modules/paiements/controller.js
- src/modules/paiements/service.js
- src/modules/paiements/schema.js

Routes :
POST   /api/paiements
GET    /api/paiements/facture/:factureId

Aussi générer apps/api/src/utils/pdf.js avec la fonction generateFacturePDF(facture) 
qui produit le layout exact défini dans le master prompt section 7.6.
Fournis tous les fichiers complets.
```

### Prompt 2.6 — Module Rapports
```
En te basant sur le master prompt JEDCO sections 5 et 7.7, génère le module 
rapports complet (4 fichiers) :
- src/modules/rapports/router.js
- src/modules/rapports/controller.js
- src/modules/rapports/service.js
- src/modules/rapports/schema.js

Routes :
GET    /api/rapports/dashboard       (KPIs temps réel)
GET    /api/rapports/interventions   (filtres dateDebut, dateFin, type, ville, technicienId)
GET    /api/rapports/financier       (filtres dateDebut, dateFin)
GET    /api/rapports/flotte
GET    /api/rapports/techniciens     (performances + présences)
GET    /api/rapports/satisfaction
GET    /api/rapports/export          (Query: type, format=pdf|excel)

Pour l'export Excel utiliser la librairie exceljs.
Fournis les 4 fichiers complets.
```

---

## PHASE 3 — BACKOFFICE UI

### Prompt 3.1 — Layout + Auth Frontend
```
En te basant sur le master prompt JEDCO section 2 (thème bleu #1A4F8A / blanc), 
génère pour apps/web/src :

1. Le composant Layout admin (src/components/admin/Layout.jsx) :
   - Sidebar fixe à gauche : logo JEDCO, navigation vers tous les modules, 
     badge rouge sur "Demandes" si demandes non traitées > 0
   - Topbar fixe en haut : breadcrumb, icône assistant AI, avatar utilisateur + logout
   - Zone de contenu scrollable à droite

2. Le composant PrivateRoute (src/components/PrivateRoute.jsx) :
   redirige vers /admin/login si pas de JWT valide dans Zustand store

3. Le store auth Zustand (src/store/authStore.js) :
   state: {user, accessToken, refreshToken}
   actions: login, logout, refreshToken

4. Le fichier src/api/client.js :
   Axios instance avec baseURL = VITE_API_URL
   Intercepteur request : injecte Authorization Bearer token
   Intercepteur response : refresh token auto si 401

5. La page src/pages/admin/Login.jsx :
   Formulaire email + password, appel POST /api/auth/login, 
   stockage dans Zustand, redirect vers /admin/dashboard

6. src/App.jsx avec React Router v6 :
   Routes publiques : /, /services, /devis, /rendez-vous, /galerie, /contact
   Routes admin protégées : /admin/*, toutes via <PrivateRoute>

Thème strict : bleu #1A4F8A, blanc, fond doux #E8F0F7.
Fournis tous les fichiers complets.
```

### Prompt 3.2 — Dashboard
```
En te basant sur le master prompt JEDCO section 7.1, génère la page 
src/pages/admin/Dashboard.jsx avec :

1. Grille de KPI cards en haut :
   - Interventions du jour (planifiées, en cours, complétées, annulées)
   - Nouvelles demandes non traitées (badge alerte cliquable → /admin/demandes)
   - Véhicules disponibles
   - Factures en retard (nombre + montant HTG)
   - Contrats expirant dans 30 jours

2. Graphique barres (Recharts) : interventions par jour sur 30 jours
3. Graphique donut (Recharts) : répartition par type de service
4. Feed activité récente (10 dernières actions)

5. Widget AI en bas de page :
   - Input texte + bouton Envoyer
   - Appel POST /api/ai/chat avec le message
   - Affichage de la réponse en streaming (SSE)
   - Bulle de réponse avec animation de frappe

Toutes les données via TanStack Query (GET /api/rapports/dashboard).
Thème bleu/blanc strict.
Fournis le fichier complet.
```

### Prompt 3.3 — Pages Clients & Contrats
```
En te basant sur le master prompt JEDCO section 7.2, génère :

1. src/pages/admin/Clients.jsx :
   - Table avec filtres (type, ville, actif, recherche texte)
   - Colonnes : code, nom, type, ville, téléphone, nb interventions, statut
   - Bouton "Nouveau client" → modal formulaire
   - Clic sur ligne → /admin/clients/:id

2. src/pages/admin/ClientDetail.jsx :
   - Header : nom, code, type, ville, bouton Modifier
   - Onglets : Infos | Contrats | Interventions | Factures
   - Onglet Infos : formulaire éditable
   - Onglet Contrats : liste + bouton "Nouveau contrat" → modal
   - Onglet Interventions : timeline verticale chronologique
   - Onglet Factures : table avec statuts colorés + bouton télécharger PDF

3. Composant src/components/admin/ContratModal.jsx :
   Formulaire : type, services (multi-select), montantHTG, dateDebut, dateFin, 
   renouvellementAuto

Toutes les données via TanStack Query.
Thème bleu/blanc strict.
Fournis les 3 fichiers complets.
```

### Prompt 3.4 — Pages Interventions + Calendrier
```
En te basant sur le master prompt JEDCO section 7.3, génère :

1. src/pages/admin/Interventions.jsx :
   - Toggle vue liste / vue calendrier
   - Vue liste : table avec filtres statut, type, ville, date
   - Vue calendrier (react-big-calendar) : interventions par technicien, 
     code couleur par statut, drag & drop pour replanifier
   - Bouton "Nouvelle intervention" → modal

2. src/components/admin/InterventionModal.jsx :
   Formulaire complet : client (autocomplete), type, description, adresse, ville, 
   datePlanifiee, priorité, techniciens disponibles (multi-select), véhicule disponible, 
   contrat lié (optionnel)

3. src/pages/admin/InterventionDetail.jsx :
   - Header : référence, type, statut (badge coloré), priorité
   - Timeline statut visuelle (stepper horizontal)
   - Boutons changement statut selon workflow
   - Section rapport d'exécution (formulaire si COMPLETE)
   - Section photos uploadées

Thème bleu/blanc strict.
Fournis les 3 fichiers complets.
```

### Prompt 3.5 — Pages Flotte
```
En te basant sur le master prompt JEDCO section 7.4, génère :

1. src/pages/admin/Flotte.jsx :
   - Onglets : Véhicules | Toilettes mobiles
   - Véhicules : grille de cards avec statut coloré (vert/orange/rouge)
     badge alerte rouge si entretien dépassé
   - Toilettes : table avec statut, localisation, client assigné, dates location
   - Bouton "Nouveau véhicule" et "Nouvelle toilette"

2. src/pages/admin/VehiculeDetail.jsx :
   - Infos du véhicule, statut, kilométrage
   - Formulaire mise à jour entretien
   - Historique des interventions effectuées avec ce véhicule

3. src/components/admin/LocationToiletteModal.jsx :
   Formulaire : sélection client, dateDebut, dateFin, adresse

Thème bleu/blanc strict.
Fournis les 3 fichiers complets.
```

### Prompt 3.6 — Pages RH
```
En te basant sur le master prompt JEDCO section 7.5, génère :

1. src/pages/admin/RH.jsx :
   - Onglets : Techniciens | Planning | Présences
   
   - Onglet Techniciens : table avec profil, matricule, spécialités (badges), 
     zones, disponibilité (toggle), bouton voir détail
   
   - Onglet Planning : 
     Sélecteur de semaine, grille techniciens × jours de la semaine
     Chaque cellule montre les interventions assignées ce jour
     Filtrable par zone et spécialité
   
   - Onglet Présences :
     Sélecteur mois/année, grille techniciens × jours du mois
     Chaque cellule : vert si présent, rouge si absent, gris si weekend
     Bouton export Excel mensuel

2. src/pages/admin/TechnicienDetail.jsx :
   - Profil complet, bouton modifier
   - Stats performances : nb interventions, taux complétion (graphique)
   - Planning de la semaine en cours
   - Historique des présences du mois

Thème bleu/blanc strict.
Fournis les 2 fichiers complets.
```

### Prompt 3.7 — Pages Facturation
```
En te basant sur le master prompt JEDCO section 7.6, génère :

1. src/pages/admin/Facturation.jsx :
   - Onglets : Factures | Tableau de bord financier
   
   - Onglet Factures : table avec filtres clientId, statut, période
     Colonnes : référence, client, montant HTG, statut (badge coloré), échéance
     Actions : voir détail, télécharger PDF, enregistrer paiement
   
   - Onglet Financier :
     Cards KPI : revenus du mois, total impayés, taux recouvrement
     Graphique ligne : revenus par mois (12 derniers mois)
     Graphique barres : revenus par type de service
     Graphique barres : revenus par ville
     Bouton export Excel

2. src/components/admin/FactureModal.jsx :
   Formulaire : client, intervention liée (optionnel), contrat lié (optionnel),
   lignes de facturation (ajout/suppression dynamique), notes
   Calcul automatique du total HTG

3. src/components/admin/PaiementModal.jsx :
   Formulaire : montantHTG, mode (CASH/VIREMENT/CHEQUE), référence, date

Thème bleu/blanc strict.
Fournis les 3 fichiers complets.
```

### Prompt 3.8 — Pages Reporting + Demandes
```
En te basant sur le master prompt JEDCO sections 7.7 et la route /api/demandes, génère :

1. src/pages/admin/Rapports.jsx :
   - Sélecteur de période (dateDebut, dateFin)
   - Onglets : Interventions | Financier | Flotte | Équipes | Satisfaction
   - Chaque onglet : graphiques Recharts + table de données
   - Bouton "Générer analyse IA" :
     appel POST /api/ai/analyse avec les données filtrées
     affichage du résultat dans un panel : résumé, points clés, tendances, 
     alertes, recommandations
   - Bouton export PDF et Excel par rapport

2. src/pages/admin/Demandes.jsx :
   - Onglets : Devis | Rendez-vous
   - Onglet Devis : table des demandes non traitées avec badge compteur
     Bouton "Traiter" → modal pour créer le client + intervention
   - Onglet Rendez-vous : table avec filtre statut + date
     Bouton confirmer / annuler

Thème bleu/blanc strict.
Fournis les 2 fichiers complets.
```

---

## PHASE 4 — SITE VITRINE PUBLIC

### Prompt 4.1 — Layout public + pages statiques
```
En te basant sur le master prompt JEDCO section 6, génère le site vitrine public :

1. src/components/public/Navbar.jsx :
   Logo JEDCO (texte bleu #1A4F8A), liens navigation, bouton switch FR/Créole,
   CTA "Demander un devis" en bleu, responsive avec menu hamburger mobile

2. src/components/public/Footer.jsx :
   Logo, description, liens services, coordonnées (14 bis Rue Pélican, 
   2942-1109 / 2942-1110), copyright

3. src/pages/public/Accueil.jsx :
   Hero plein écran fond bleu #1A4F8A : titre, sous-titre, CTA devis
   Section 6 services en cards avec icônes
   Section stats animées : 30+ ans, 5 villes, 1000+ clients, 100% mécanisé
   Section témoignages (3 cards)
   CTA final vers formulaire devis

4. src/pages/public/Services.jsx :
   Page dédiée par service avec description complète et CTA

5. src/pages/public/Galerie.jsx :
   Grille photos filtrables par type de service

6. src/pages/public/Zones.jsx :
   Visuel des 5 villes desservies avec badges et description couverture

7. src/pages/public/Contact.jsx :
   Coordonnées, Google Maps intégré (iframe), formulaire contact rapide

8. src/i18n/ :
   Fichiers de traduction fr.json et ht.json (créole haïtien) pour toutes les pages

Thème bleu #1A4F8A / blanc strict. Mobile-first.
Fournis tous les fichiers complets.
```

### Prompt 4.2 — Formulaires publics
```
En te basant sur le master prompt JEDCO section 6, génère :

1. src/pages/public/Devis.jsx :
   Formulaire : nom, téléphone, email (optionnel), type de service (select), 
   ville (select parmi les 5 zones), message
   Validation React Hook Form + Zod
   Appel POST /api/public/devis
   Message de confirmation après envoi
   Bilingue FR/Créole

2. src/pages/public/RendezVous.jsx :
   Formulaire : nom, téléphone, email (optionnel), type de service, ville, 
   adresse, date voulue (date picker), message
   Validation React Hook Form + Zod
   Appel POST /api/public/rendez-vous
   Message de confirmation après envoi
   Bilingue FR/Créole

Thème bleu/blanc strict. Mobile-first.
Fournis les 2 fichiers complets.
```

---

## PHASE 5 — AI LAYER

### Prompt 5.1 — Module AI Backend
```
En te basant sur le master prompt JEDCO section 8, génère le module AI complet :

1. apps/api/src/config/ai.js :
   Initialisation @anthropic-ai/sdk avec ANTHROPIC_API_KEY

2. apps/api/src/modules/ai/router.js
3. apps/api/src/modules/ai/controller.js
4. apps/api/src/modules/ai/service.js
5. apps/api/src/modules/ai/schema.js

Routes :
POST /api/ai/chat (JWT) :
  - Récupère ou crée une Conversation en DB
  - Injecte dans le system prompt les stats du jour (appel rapports/dashboard)
  - Appel Claude API claude-sonnet-4-20250514 en streaming
  - Retourne SSE stream
  - Sauvegarde les messages en DB

POST /api/ai/analyse (JWT) :
  - Reçoit {type, periode, data}
  - Appel Claude avec prompt section 8.3
  - Retourne JSON structuré {resume, points_cles, tendances, alertes, recommandations}

GET /api/ai/suggestions (JWT) :
  - Génère 3 suggestions contextuelles basées sur les données du jour

POST /api/public/ai-chat (sans JWT) :
  - Utilise le prompt section 8.2 (assistant vitrine)
  - Retourne SSE stream
  - Pas de sauvegarde DB

Fournis les 5 fichiers complets.
```

### Prompt 5.2 — Widget AI Frontend
```
Génère le composant AI chat réutilisable pour le backoffice JEDCO :

1. src/components/admin/AIAssistant.jsx :
   - Panel latéral ou modal (prop: mode="sidebar"|"modal")
   - Input texte + bouton envoyer
   - Historique de conversation (bulles user/assistant)
   - Affichage réponse en streaming (lecture du SSE token par token)
   - Animation curseur pendant la génération
   - Bouton effacer conversation
   - Suggestions rapides cliquables selon le contexte (prop: suggestions=[])

2. src/pages/admin/AIAssistant.jsx :
   Page dédiée plein écran avec historique des conversations précédentes 
   dans une sidebar gauche, conversation active à droite

Intégrer le widget dans le Dashboard (déjà généré) via import.
Thème bleu/blanc strict.
Fournis les 2 fichiers complets.
```

---

## PHASE 6 — DÉPLOIEMENT

### Prompt 6.1 — Configuration Railway
```
Génère les fichiers de configuration pour le déploiement Railway du backend JEDCO :

1. apps/api/railway.json :
   Configuration build et start commands

2. apps/api/Procfile :
   web: node src/app.js

3. apps/api/.railwayignore :
   Fichiers à exclure

4. Script apps/api/scripts/deploy.sh :
   npx prisma migrate deploy
   npx prisma db seed (si premier déploiement)
   pm2 start (si applicable)

5. Mise à jour apps/api/src/app.js pour :
   - Écouter sur process.env.PORT (Railway l'injecte automatiquement)
   - Health check endpoint GET /health → {status: "ok", timestamp}

6. Instructions README dans apps/api/DEPLOY_RAILWAY.md :
   Étapes exactes : créer projet Railway, connecter repo, 
   ajouter PostgreSQL plugin, configurer variables d'env

Fournis tous les fichiers complets.
```

### Prompt 6.2 — Configuration Vercel
```
Génère les fichiers de configuration pour le déploiement Vercel du frontend JEDCO :

1. apps/web/vercel.json :
   Rewrites pour React Router (toutes les routes → index.html)
   Headers de sécurité (CSP, X-Frame-Options, etc.)

2. apps/web/.env.production :
   VITE_API_URL=https://[railway-url].railway.app

3. apps/web/vite.config.js :
   Configuration optimisée pour la production (code splitting, etc.)

4. Instructions apps/web/DEPLOY_VERCEL.md :
   Étapes exactes : connecter repo Vercel, configurer VITE_API_URL,
   configurer domaine jedco.ht

Fournis tous les fichiers complets.
```

### Prompt 6.3 — Tests & validation finale
```
Pour le projet JEDCO, génère :

1. apps/api/src/tests/auth.test.js : tests des routes auth (login, refresh, me)
2. apps/api/src/tests/clients.test.js : tests CRUD clients
3. apps/api/src/tests/interventions.test.js : tests workflow statuts
4. apps/api/src/tests/factures.test.js : tests génération facture + PDF

Utiliser les librairies : vitest + supertest + @faker-js/faker

5. Script apps/api/scripts/healthCheck.js :
   Vérifie connexion DB, variables d'env, endpoint /health

6. Fichier JEDCO_CHECKLIST_PRODUCTION.md :
   Checklist complète avant mise en prod :
   - Variables d'env configurées
   - DB migrée
   - Seed exécuté
   - Health check OK
   - CORS configuré avec le bon domaine Vercel
   - Routes Railway accessibles depuis Vercel

Fournis tous les fichiers complets.
```

---

## 📌 NOTES D'UTILISATION

- **Toujours** redonner le master prompt en contexte en début de session Claude Code
- **Un prompt à la fois** — attendre la complétion avant de passer au suivant
- Si Claude Code s'arrête en cours de génération, relancer avec :
  ```
  Continue la génération du fichier [nom] à partir de [dernière ligne visible]
  ```
- Si un fichier généré diverge du master prompt, corriger avec :
  ```
  Ce fichier ne respecte pas [règle X du master prompt section Y]. 
  Corrige en tenant compte de [détail].
  ```
- Après chaque phase, tester avant de passer à la suivante

---

*Fin de la séquence de prompts JEDCO — Christopher JEROME — Mai 2026*
