# JEDCO — Étapes d'infrastructure à faire manuellement

Ce fichier liste ce que le code ne peut pas faire à votre place — accès aux
consoles Railway / Vercel / GitHub / Cloudflare, secrets à générer, décisions
qui engagent le compte. À faire dans cet ordre avant la mise en production.

---

## 1. 🔴 Révoquer la clé Anthropic exposée (urgent, non lié à la Phase 0)

La clé `sk-ant-api03-cJf7_...` a été trouvée en clair dans l'ancien
`index.html.bak` (supprimé du dépôt) et a potentiellement été visible sur le
déploiement Vercel public avant sa correction. Si ce n'est pas déjà fait :

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → révoquer cette clé
2. Générer une nouvelle clé
3. La mettre dans `ANTHROPIC_API_KEY` (voir étape 6 ci-dessous), jamais dans le code

---

## 2. ✅ PgBouncer sur Railway — fait le 24/07/2026

Service PgBouncer installé sur Railway, exposé en réseau public via
`caboose.proxy.rlwy.net:51918` (le réseau interne `*.railway.internal` ne
suffit pas : Vercel n'est pas sur le réseau privé Railway, il faut le
TCP Proxy public — Settings → Networking → Generate Domain, mode TCP).

`.env` local mis à jour et revalidé :
- `DATABASE_URL` → pooler (`caboose.proxy.rlwy.net:51918?pgbouncer=true`)
- `DIRECT_URL` → base directe (`sakura.proxy.rlwy.net:16821`), migrations uniquement

Validé : suite de tests verte à travers le pooler, `prisma migrate status`
confirme que les migrations passent bien par `DIRECT_URL`, et un test de
charge de 50 requêtes simultanées sur `/api/health` renvoie 200 OK sans
erreur de connexion.

**Reste à faire** : reporter les mêmes valeurs dans les variables
d'environnement Vercel de production — voir étape 6. `.env` local n'est pas
repris automatiquement par Vercel.

---

## 3. ✅ Cloudflare R2 — fait le 25/07/2026

Bucket `jedco` créé, accès public activé via le sous-domaine `*.r2.dev`,
token API de type **Account API token** (pas User token — scopé au compte,
indépendant d'un utilisateur particulier) avec permission Object Read &
Write.

`.env` local mis à jour :
- `R2_ACCOUNT_ID` = `59e63ff171af57e4becbaccd8fe79057`
- `R2_BUCKET_NAME` = `jedco`
- `R2_PUBLIC_URL` = `https://pub-131b13c1d5584172869142ab61635e11.r2.dev`
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — définies (non reproduites ici)

Validé par un test réel de bout en bout : URL présignée générée, upload PUT
dessus (200), lecture du fichier via l'URL publique (200, contenu identique),
suppression de l'objet. Aucune donnée de test résiduelle dans le bucket.

**Reste à faire** : reporter ces 5 variables dans Vercel — voir étape 6.

---

## 4. Installer gitleaks localement (une fois, par machine de développement)

```bash
brew install gitleaks
git config core.hooksPath .githooks
```

Déjà configuré dans ce sandbox de développement — à refaire sur votre propre
machine si vous clonez ce dépôt ailleurs. Le hook `.githooks/pre-commit`
bloque un commit contenant une clé API ou un secret détectable, avant qu'il
n'entre dans l'historique git.

---

## 5. ✅ Dépôt GitHub — fait le 24/07/2026

Poussé sur [github.com/jcsoftlabs/jedco](https://github.com/jcsoftlabs/jedco),
branche `main`. La CI (`.github/workflows/ci.yml`) tourne automatiquement sur
chaque PR — elle utilise une base Postgres jetable propre à GitHub Actions,
jamais vos identifiants Railway de production.

---

## 6. Variables d'environnement de production (Vercel)

Dans les paramètres du projet Vercel → Environment Variables :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL du pooler PgBouncer (étape 2) |
| `DIRECT_URL` | URL directe Railway (étape 2) |
| `SESSION_SECRET` | Généré avec `openssl rand -base64 32` — jamais la valeur `dev-only-change-me...` du `.env` local |
| `ANTHROPIC_API_KEY` | La nouvelle clé de l'étape 1 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Valeurs de l'étape 3 |
| `NODE_ENV` | `production` (Vercel le définit automatiquement) |

---

## 7. Créer le premier compte ADMIN en production

Une fois déployé, **depuis votre machine**, avec `DATABASE_URL` de
production temporairement exporté (jamais via un script automatisé — §1.20
du plan, le seed ne doit jamais tourner dans un pipeline de déploiement) :

```bash
DATABASE_URL="<url de production>" npx tsx scripts/bootstrap-admin.ts \
  votre-email@jedco.ht "MotDePasseSolide123!" Prénom Nom
```

Connectez-vous ensuite sur `https://<votre-domaine>/admin/login`.

---

## État actuel (25/07/2026)

- ✅ Base Railway provisionnée et migrée (schéma v1 corrigé)
- ✅ PgBouncer installé, exposé en public, validé par un test de charge
- ✅ Dépôt GitHub créé et poussé (`jcsoftlabs/jedco`)
- ✅ Bucket Cloudflare R2 créé, testé de bout en bout (upload/lecture/suppression)
- ⬜ Clé Anthropic — à vérifier si déjà révoquée
- ⬜ Déploiement Vercel de ce backend consolidé — pas encore fait
- ⬜ Premier compte ADMIN de production — pas encore créé
