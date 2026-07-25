# JEDCO — PLAN D'IMPLÉMENTATION PRODUCTION-READY
> Analyse critique de `JEDCO_MasterPrompt_V1.md` + `JEDCO_ClaudeCode_Prompts.md`
> Objectif : rendre le système réellement dynamique, robuste et exploitable en production.
> Établi le 24 juillet 2026.

---

## 0. CE QUE LES DOCUMENTS ACTUELS FONT BIEN

Il faut le dire clairement, parce que la suite est une liste de défauts et ce serait trompeur sans ça :

- Le **périmètre fonctionnel est juste**. Les 7 modules correspondent à ce qu'une entreprise d'assainissement fait réellement. Rien d'inventé, rien d'inutile.
- La **discipline de structure** (4 fichiers par module, logique métier dans `service.js`, format de réponse uniforme) est saine et tiendra à l'échelle.
- Les **montants en centimes** et les **dates en UTC** sont les bons réflexes.
- La **séparation des trois prompts système IA** (backoffice / vitrine / analyse) est bien pensée, notamment la règle « ne jamais donner de tarif » sur l'assistant public.

Le problème n'est pas la vision. Le problème est que la spécification décrit **un système qui a l'air de marcher en démo**, pas un système qui survit à deux dispatchers qui cliquent en même temps, à un redéploiement, ou à un audit comptable.

---

## 1. DÉFAUTS BLOQUANTS — À CORRIGER AVANT D'ÉCRIRE UNE LIGNE

Classés par gravité réelle, pas par ordre d'apparition dans le document.

### 1.1 🔴 Le modèle de l'IA est retiré du service

`claude-sonnet-4-20250514` (section 1 et 8 du master prompt) a été **retiré le 15 juin 2026**. Nous sommes en juillet 2026 : tout appel avec cet identifiant renvoie une erreur 404.

> ⚠️ **Ce bug est déjà en production dans ce dépôt** : `app/api/chat/route.ts` utilise cet identifiant, hérité de l'ancien `index.html`.

**Correction** : `claude-opus-4-8` (modèle par défaut recommandé). Pour le widget public à fort volume, `claude-sonnet-5` ou `claude-haiku-4-5` sont des arbitrages coût/qualité valables — c'est une décision à prendre explicitement, pas un défaut par omission.

### 1.2 🔴 Les photos d'intervention vont disparaître

Section 1 : *« Upload fichiers : Multer + stockage local /uploads »*, hébergé sur Railway.

Le système de fichiers d'un conteneur Railway est **éphémère**. À chaque redéploiement, redémarrage ou changement d'instance, `/uploads` est vidé. Les photos de rapport d'exécution — c'est-à-dire la **preuve du travail effectué**, potentiellement la pièce justificative d'un litige avec une mairie — sont perdues.

Ce n'est pas un risque, c'est une certitude au premier `git push`.

**Correction** : stockage objet S3-compatible. Cloudflare R2 (pas de frais d'egress) ou Backblaze B2. Upload direct navigateur → bucket via URL présignée, jamais via l'API.

### 1.3 🔴 Rien n'empêche de réserver deux fois le même camion

C'est le défaut le plus grave sur le plan métier, et il est invisible dans la spécification.

Le flux prévu est : `GET /api/vehicules/disponibles/:date` → l'utilisateur choisit → `POST /api/interventions`. Entre la lecture et l'écriture, rien ne verrouille. Deux dispatchers qui planifient à 9h le même camion aspirateur créent **deux interventions valides sur un véhicule unique**. Le système ne s'en apercevra jamais ; le terrain, si.

Même problème pour les techniciens et pour les locations de toilettes mobiles (deux clients, dates qui se chevauchent, une seule cabine).

**Correction** : contrainte d'exclusion PostgreSQL sur plages temporelles (`tstzrange` + `EXCLUDE USING gist`). Prisma ne sait pas l'exprimer nativement → migration SQL manuelle. C'est la base de données qui doit refuser, pas le code applicatif.

### 1.4 🔴 Les codes clients vont entrer en collision

`codeClient() → "JED-0001" auto-incrémenté depuis la DB` (prompt 1.3) : lire le max, ajouter 1, insérer. Deux requêtes simultanées lisent le même max et produisent le même code.

**Correction** : `SEQUENCE` PostgreSQL par préfixe. Les trous de numérotation sont acceptables sur un code interne ; les doublons ne le sont pas.

### 1.5 🔴 Un double-clic crée un double paiement

`POST /api/paiements` n'a aucune clé d'idempotence. Un réseau instable (contexte haïtien courant), un utilisateur qui reclique, un retry automatique → deux versements enregistrés pour un seul reçu. Le solde client devient faux, et personne ne saura lequel des deux supprimer.

**Correction** : en-tête `Idempotency-Key` + index unique. Et le statut de la facture doit être **recalculé depuis la somme des paiements dans la même transaction** que l'insertion, jamais mis à jour séparément.

### 1.6 🔴 Un technicien peut lire toute la base clients

Section 7 définit un rôle `TECHNICIEN`, mais toutes les routes ne portent qu'un contrôle **au niveau de la route** (`[JWT]`). `GET /api/interventions` sans filtre par identité renvoie les interventions de tout le monde : adresses privées, téléphones, notes clients.

**Correction** : filtrage au niveau ligne, centralisé (`scopeFor(user)` appliqué à chaque requête), pas route par route. Et un test automatisé qui vérifie qu'un technicien A ne peut pas lire l'intervention du technicien B — ce test doit exister avant la mise en production.

### 1.7 🟠 Le montant maximum d'un contrat est ~21 millions HTG

`montantHTG Int` en centimes. Un `INTEGER` PostgreSQL plafonne à 2 147 483 647, soit **21 474 836 HTG** (~160 000 USD). Un contrat municipal pluriannuel dépasse ce plafond et l'insertion échouera avec une erreur brute.

**Correction** : `BigInt` sur tous les champs monétaires.

### 1.8 🟠 La contrainte d'unicité sur les présences ne sert à rien

```prisma
model Presence {
  date DateTime
  @@unique([technicienId, date])
}
```

`date` étant un `DateTime`, deux saisies le même jour à des heures différentes produisent deux lignes. La contrainte ne protège rien.

**Correction** : `@db.Date` (date pure) ou normalisation à minuit UTC dans le service.

### 1.9 🟠 Les crons vont s'exécuter en double

`node-cron` en processus, sur Railway. Dès qu'il y a plus d'une instance, chaque tâche s'exécute N fois. Pour la facturation mensuelle des contrats récurrents, cela signifie **N factures pour un même contrat**.

**Correction** : verrou consultatif (`pg_try_advisory_lock`) autour de chaque tâche, **et** contrainte unique `(contratId, periode)` sur les factures récurrentes. La ceinture et les bretelles : le verrou évite le travail inutile, la contrainte garantit la correction.

### 1.10 🟠 Cinq fonctionnalités promises n'ont pas de table

| Fonctionnalité annoncée | Modèle manquant |
|---|---|
| `GET /api/public/temoignages` + page Témoignages | `Temoignage` |
| Page Galerie (photos filtrables) | `Media` |
| `GET /api/rapports/satisfaction` | Aucun champ de satisfaction nulle part |
| Dashboard « feed activité récente » | `AuditLog` |
| `POST /api/auth/logout` | Aucun stockage de refresh token → **la déconnexion ne déconnecte rien** |

Ce dernier point mérite d'être souligné : sans table de sessions, un JWT reste valide jusqu'à expiration même après « déconnexion » et même après changement de mot de passe. C'est un trou de sécurité, pas un détail.

### 1.11 🟠 Le taux USD stocké falsifie l'historique comptable

`Contrat.montantUSD` et `TAUX_USD_HTG` en variable d'environnement. La gourde est volatile. Une facture payée en 2026 verra son équivalent USD changer rétroactivement quand le taux sera mis à jour.

**Correction** : ne jamais stocker un montant USD dérivé. Stocker le **taux appliqué au moment de l'émission** (`tauxApplique`) sur la facture, et calculer l'affichage à partir de lui. Un document comptable émis ne doit plus jamais bouger.

### 1.12 🟠 Le soft delete va fuiter

`deletedAt` existe sur Client, Contrat, Facture — mais pas sur Intervention, Vehicule, Technicien. Et rien n'impose le filtre : chaque requête doit penser à `where: { deletedAt: null }`. Un oubli et un client supprimé réapparaît dans une liste ou sur une facture.

**Correction** : extensions Prisma (`$extends`) qui injectent le filtre globalement, et cohérence du choix sur toutes les entités.

### 1.13 🟠 Les lignes de facture en JSON empêchent le reporting demandé

`Facture.lignes Json` : pas d'intégrité référentielle, pas d'agrégation SQL. Or `GET /api/factures/stats` demande *« revenus par service »*. Impossible à calculer proprement pour une facture de contrat couvrant plusieurs services.

**Correction** : modèle `LigneFacture` avec un `TypeService` optionnel.

### 1.14 🟠 Le fuseau horaire va fausser « les interventions du jour »

Haïti est en UTC-5. Un serveur en UTC qui calcule « aujourd'hui » avec `new Date().setHours(0,0,0,0)` se trompe de jour pour tout ce qui se passe entre 19h et minuit heure locale — c'est-à-dire les interventions du soir et les rapports saisis en fin de journée.

**Correction** : un module unique de gestion des bornes de journée en `America/Port-au-Prince`, testé, utilisé partout. Jamais de calcul de date en heure serveur.

### 1.15 🟡 L'assistant public est un robinet à dépenses ouvert

`POST /api/public/ai-chat` sans authentification, sans limite. N'importe qui peut scripter des milliers d'appels sur votre clé Anthropic. Idem pour `/api/public/devis` : la file des demandes se remplit de spam.

**Correction** : limite par IP, budget quotidien de jetons avec coupure automatique, captcha (Turnstile) sur les formulaires, et un interrupteur d'arrêt manuel.

### 1.16 🟡 Le prompt système IA détruit le cache à chaque requête

Section 8.1 injecte `[STATS_DU_JOUR]` **à l'intérieur du prompt système**. Le cache de prompt fonctionne par correspondance de préfixe : un contenu qui change chaque jour (ou chaque requête) au milieu du prompt système invalide tout ce qui suit. Vous paierez le plein tarif sur un prompt système volumineux, à chaque appel.

**Correction** : prompt système figé ; les statistiques passent dans un **message**, après le point de cache. Gain immédiat sur le coût de l'assistant backoffice.

### 1.17 🟡 Le format JSON de l'analyse repose sur de la supplication

Section 8.3 : *« JSON uniquement, aucun texte avant ni après »*. Ça marche la plupart du temps. « La plupart du temps » n'est pas une garantie pour un parseur en production.

**Correction** : sorties structurées (`output_config.format` avec un JSON Schema). La conformité devient garantie par l'API, pas espérée.

### 1.18 🟡 Les tests en phase 6 sont des tests qui n'existeront jamais

C'est le classique. Semaine 11, la pression de livraison est maximale, les tests sautent. Or les deux zones qui **doivent** être testées — l'arithmétique monétaire et les conflits de planning — sont écrites en phases 2 et 3.

**Correction** : harnais de test en phase 0, et règle non négociable : tout code touchant à l'argent ou au planning arrive avec ses tests.

### 1.19 🟡 Pas d'observabilité

Aucune mention de suivi d'erreurs, de journalisation corrélée, ni de supervision de disponibilité. Vous apprendrez que le système est tombé quand un client de JEDCO téléphonera.

**Correction** : Sentry, identifiant de corrélation par requête, et une sonde de disponibilité qui alerte sur un téléphone que quelqu'un porte réellement.

### 1.20 🟡 Le déploiement seed la production

Prompt 6.1 : `npx prisma db seed (si premier déploiement)`. Ce « si » est une condition humaine dans un script automatisé. Le jour où il s'exécute par erreur sur la base de production, vous réinsérez des données de démonstration dans les données réelles.

**Correction** : le seed ne s'exécute jamais depuis le pipeline de déploiement. Commande manuelle, environnement de développement uniquement.

---

## 2. CONTRAINTES DU CONTEXTE HAÏTIEN — ABSENTES DE LA SPÉCIFICATION

Le master prompt décrit un système comme s'il tournait à Paris. Trois réalités opérationnelles à trancher explicitement :

**Connectivité intermittente.** La section 7.3 précise que le rapport d'exécution est *« rempli par le superviseur après retour terrain »* — c'est une décision prudente et il faut s'y tenir en v1. Si vous voulez plus tard que les techniciens saisissent depuis le terrain, ce n'est pas une case à cocher : c'est un projet PWA avec file d'attente hors-ligne et résolution de conflits. À planifier séparément, pas à improviser.

**Coupures d'électricité et de session.** Les formulaires longs (bon d'intervention, facture multi-lignes) doivent sauvegarder un brouillon local automatiquement. Perdre 10 minutes de saisie sur une coupure est le genre de friction qui fait abandonner un outil.

**Coût de la bande passante mobile.** Les photos d'intervention doivent être compressées côté navigateur avant envoi. Une photo de 4 Mo depuis un téléphone sur données mobiles, plusieurs fois par jour, par technicien, c'est un coût réel pour l'entreprise.

---

## 3. DÉCISION D'ARCHITECTURE — LE POINT DE BASCULE

C'est l'arbitrage qui conditionne tout le reste du plan.

**Le master prompt prévoit** : backend Fastify sur Railway + SPA React/Vite sur Vercel. Deux applications, deux déploiements, CORS entre les deux, JWT stocké côté navigateur.

**Ce qui existe aujourd'hui** : un site Next.js 15 (App Router) sur Vercel, avec une route API serveur fonctionnelle.

**✅ DÉCISION RETENUE (24/07/2026) : consolider sur Next.js**, avec **PostgreSQL sur Railway**. Une seule application, Route Handlers comme API.

Pourquoi :

| Critère | Fastify + Vite | Next.js unifié |
|---|---|---|
| SEO du site vitrine | SPA → rendu client, mauvais | SSR natif, requis par la section 6 |
| Authentification | JWT en localStorage → vulnérable au XSS | Cookie `httpOnly` `SameSite` same-origin |
| Déploiements | 2 cibles, 2 jeux de variables, CORS | 1 cible |
| Développeur solo | 2 bases de code à maintenir | 1 |
| Existant | À jeter et reconstruire | Déjà en place |

Le vrai contre-argument est honnête : les tâches longues (gros exports Excel, génération PDF en masse) s'accommodent mal du serverless. La réponse n'est pas de garder deux stacks « au cas où », c'est d'ajouter **plus tard** un petit service worker dédié si le besoin apparaît réellement. Ne payez pas aujourd'hui la complexité d'un problème que vous n'avez pas encore.

Deux pièges à traiter dans ce choix, et ils sont réels :

1. 🔴 **Épuisement des connexions PostgreSQL — point d'attention n°1 de ce plan.**
   Chaque invocation serverless Vercel ouvre sa propre connexion Prisma. Sous charge, la base atteint son `max_connections` et l'application renvoie des erreurs de connexion **alors que rien n'est en panne** — symptôme typiquement diagnostiqué à tort comme un problème de code.

   Railway PostgreSQL **ne fournit pas de pooler intégré** (contrairement à Neon ou Supabase). Il faut donc l'ajouter explicitement. Trois options, par ordre de simplicité :
   - **PgBouncer déployé comme service Railway** en mode `transaction`, l'application pointe vers le pooler et non vers la base directe. Solution classique et gratuite.
   - **Prisma Accelerate** — pooling managé, zéro infrastructure, mais dépendance et coût supplémentaires.
   - Migrer vers Neon plus tard si le pooler devient une charge d'exploitation.

   Contraintes qui découlent du mode `transaction` de PgBouncer : pas d'instructions préparées côté serveur (ajouter `?pgbouncer=true` à l'URL Prisma), et **les migrations doivent viser l'URL directe**, pas le pooler. À câbler en phase 0, avec deux variables distinctes : `DATABASE_URL` (pooler, runtime) et `DIRECT_URL` (base, migrations).

2. **Crons.** Vercel Cron remplace `node-cron`, mais il est déclenché par HTTP : le verrou consultatif et l'idempotence du §1.9 restent **obligatoires**. La route de cron doit aussi être authentifiée par un secret, sinon n'importe qui peut déclencher la facturation mensuelle.

**Conséquence du choix Railway** : le stockage des photos (§1.2) reste un composant à part entière (Cloudflare R2 ou Backblaze B2). Supabase l'aurait fourni dans le même service ; ici c'est une dépendance distincte à provisionner en phase 3.

---

## 4. PLAN PAR PHASES

Le découpage du master prompt (tout le backend, puis toute l'UI, puis l'IA, puis les tests et le déploiement) est un découpage en cascade : vous découvrez en semaine 11 si ça se déploie. Le découpage ci-dessous livre des **tranches verticales déployées**, et place les risques au début.

Chaque phase a un critère d'acceptation vérifiable. « Les fichiers ont été générés » n'est pas un critère d'acceptation.

---

### Phase 0 — Socle (1 semaine) — *aucune fonctionnalité métier*

C'est la phase qu'on est tenté de sauter. C'est celle qui détermine si le reste tiendra.

- Dépôt, `CLAUDE.md`, conventions de commit
- Base Railway PostgreSQL **+ PgBouncer en mode transaction**, avec `DATABASE_URL` (pooler) et `DIRECT_URL` (migrations) séparées — voir §3
- Schéma Prisma v1 **corrigé** (§1.7, 1.8, 1.10, 1.12, 1.13)
- Validation des variables d'environnement au démarrage (Zod) — l'application refuse de démarrer si une clé manque
- Analyse de secrets en pre-commit (gitleaks) — vous avez déjà été touché une fois
- Auth : sessions en cookie `httpOnly`, table de sessions révocables, helper RBAC **et** helper de portée par ligne
- Module monétaire : BigInt en centimes, un seul formateur, type « montant + taux appliqué » — **avec tests**
- Module dates : bornes de journée Port-au-Prince — **avec tests**
- Génération de codes par séquences PostgreSQL
- Enveloppe d'erreur uniforme, journalisation, Sentry, identifiant de corrélation
- CI : typecheck + tests + vérification des migrations sur chaque PR
- **Déploiement en production dès le jour 1**, avec seulement `/health` et l'écran de connexion

> **Critère d'acceptation** : `/health` est vert en production, un administrateur peut se connecter et se déconnecter, la déconnexion invalide réellement la session, une ligne d'audit est écrite, la CI passe. **Et** : 50 requêtes simultanées sur `/health` ne provoquent aucune erreur de connexion PostgreSQL — c'est le test qui valide le pooler.

---

### Phase 1 — Noyau opérationnel (2 à 3 semaines)

Trois tranches verticales successives, chacune déployée : **Clients → Contrats → Interventions**.

C'est dans les interventions que se joue le travail de robustesse :

- Contraintes d'exclusion PostgreSQL contre le double-booking véhicule et technicien (§1.3)
- Machine à états du statut implémentée **en un seul endroit**, pas en `if` dispersés
- Écriture dans l'`AuditLog` à chaque transition
- Rattachement optionnel à un contrat

> **Critère d'acceptation** : un dispatcher enchaîne client → contrat → intervention planifiée ; le système **refuse** l'affectation d'un camion déjà pris, et un test automatisé le prouve.

---

### Phase 2 — Argent (2 semaines)

Le module où une erreur ne se rattrape pas.

- `LigneFacture` en lignes réelles, montants BigInt, taux figé à l'émission (§1.11)
- Statut recalculé depuis la somme des paiements, dans la transaction ; garde-fou contre le surpaiement
- Clés d'idempotence sur les paiements (§1.5)
- PDF PDFKit
- Facturation mensuelle des contrats récurrents : idempotente, unique `(contratId, periode)`, sous verrou (§1.9)

> **Critère d'acceptation** : tests unitaires sur l'arithmétique des soldes, y compris paiements partiels et surpaiement ; une requête de paiement rejouée trois fois crée exactement un paiement ; une facture PDF est identique à la seconde génération.

---

### Phase 3 — Terrain (2 semaines)

- Véhicules et toilettes mobiles, avec les mêmes contraintes de chevauchement sur les locations
- Présences en date pure, unicité effective (§1.8)
- **Photos vers R2/S3 en upload présigné**, compression navigateur (§1.2, §2)
- Portée par ligne réellement appliquée pour le rôle TECHNICIEN

> **Critère d'acceptation** : une suite de tests d'autorisation prouve qu'un technicien ne peut lire ni modifier les données d'un autre ; une photo survit à un redéploiement.

---

### Phase 4 — Vitrine dynamique (1 à 2 semaines)

C'est la réponse directe à « rendre le site vraiment dynamique ». Aujourd'hui, services, témoignages, zones et statistiques sont **codés en dur** dans les composants React.

- Services, Témoignages, Zones, Galerie, Statistiques servis depuis la base
- Interface d'administration pour les éditer sans développeur
- ISR / revalidation, sitemap, Open Graph, i18n FR/Créole
- Formulaires Devis et Rendez-vous → base, avec limite de débit et captcha (§1.15), plus notification à l'équipe
- Migration des composants actuels vers les données en base

> **Critère d'acceptation** : le directeur de JEDCO ajoute un témoignage depuis `/admin` et il apparaît en ligne sans intervention technique.

---

### Phase 5 — Pilotage (2 semaines)

- Dashboard : KPIs en **une requête agrégée** (ou vue matérialisée) avec cache court — pas douze allers-retours
- Rapports avec plages de dates et regroupement correct en fuseau local (§1.14)
- Exports Excel et PDF
- Feed d'activité alimenté par l'`AuditLog` écrit depuis la phase 0 — *c'est précisément pourquoi il y est*

> **Critère d'acceptation** : le dashboard répond en moins de 500 ms sur un jeu de données réaliste (10 000 interventions).

---

### Phase 6 — Couche IA (1 à 2 semaines)

- SDK officiel `@anthropic-ai/sdk`, modèle `claude-opus-4-8`, clé strictement côté serveur (§1.1)
- Assistant public : **aucun outil, aucun accès base**, limite par IP, budget quotidien de jetons, interrupteur d'arrêt (§1.15)
- Assistant backoffice : lecture seule, statistiques passées **en message** et non dans le prompt système, pour préserver le cache (§1.16) ; réponse en streaming
- Analyse : sorties structurées garanties par schéma (§1.17)
- Journalisation du coût par appel et alerte de seuil

> **Critère d'acceptation** : le budget quotidien coupe réellement le service quand il est atteint ; le taux de lecture du cache est mesuré et non nul ; l'assistant public ne peut divulguer aucune donnée client.

**Note de sécurité** : si l'assistant backoffice lit un jour des champs saisis par des tiers (notes clients, messages de demandes), ce contenu est **non fiable**. En v1, l'IA reste en lecture seule et sans outil d'écriture — c'est la protection la plus simple et la plus solide contre l'injection de prompt.

---

### Phase 7 — Durcissement et bascule réelle (1 à 2 semaines)

- **Exercice de restauration** : restaurer réellement une sauvegarde dans une base jetable et vérifier l'intégrité. Une sauvegarde jamais restaurée n'est pas une sauvegarde.
- Plafonnement de la pagination (§1.19), test de charge
- Revue d'autorisation complète
- Runbook d'exploitation, plan de retour arrière, formation de l'équipe JEDCO
- Supervision de disponibilité avec alerte effective

> **Critère d'acceptation** : la base est restaurée depuis une sauvegarde en moins de 30 minutes, avec un rapport écrit.

---

## 5. CORRECTION DE LA MÉTHODE DE TRAVAIL AVEC CLAUDE CODE

`JEDCO_ClaudeCode_Prompts.md` prescrit : recoller le master prompt à chaque session, un prompt à la fois, « fournis les 4 fichiers complets ».

Trois problèmes :

1. **Recoller 30 000 caractères à chaque session** est coûteux et fragile. → Un `CLAUDE.md` à la racine, chargé automatiquement, contenant les règles stables (conventions, thème, règles monétaires, format de réponse). Le master prompt devient une référence consultable, pas un copier-coller rituel.

2. **Le critère de succès est « les fichiers ont été générés »**, pas « ça fonctionne ». → Chaque prompt doit se terminer par une étape de vérification exécutable : lancer les tests, appeler la route, constater le résultat.

3. **Aucune vérification entre les étapes.** → Après chaque tranche, exécuter la CI et la vérification d'acceptation avant de passer à la suivante. Une erreur en phase 1 non détectée devient dix fichiers à réécrire en phase 3.

---

## 6. ACTION IMMÉDIATE

Indépendamment du plan, deux choses sont à traiter maintenant sur le dépôt existant :

1. **Révoquer la clé Anthropic** exposée dans `index.html.bak` et dans l'historique du déploiement Vercel actuel.
2. **Corriger l'identifiant de modèle** dans `app/api/chat/route.ts` — il est retiré du service depuis le 15 juin 2026 et l'assistant renverra une erreur dès qu'une clé valide sera configurée.

---

*Plan établi le 24 juillet 2026 — à valider avant démarrage de la phase 0.*
