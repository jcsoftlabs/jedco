# JEDCO — Étapes d'infrastructure à faire manuellement

Ce fichier liste ce que le code ne peut pas faire à votre place — accès aux
consoles Railway / Vercel / GitHub, secrets à générer, décisions qui
engagent le compte. À faire dans cet ordre avant la mise en production.

---

## 1. 🔴 Révoquer la clé Anthropic exposée (urgent, non lié à la Phase 0)

La clé `sk-ant-api03-cJf7_...` a été trouvée en clair dans `index.html.bak`
et a potentiellement été visible sur le déploiement Vercel public avant sa
correction. Si ce n'est pas déjà fait :

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → révoquer cette clé
2. Générer une nouvelle clé
3. La mettre dans `ANTHROPIC_API_KEY` (voir étape 5 ci-dessous), jamais dans le code

---

## 2. ✅ PgBouncer sur Railway — fait le 24/07/2026

Service PgBouncer installé sur Railway, exposé en réseau public via
`caboose.proxy.rlwy.net:51918` (le réseau interne `*.railway.internal` ne
suffit pas : Vercel n'est pas sur le réseau privé Railway, il faut le
TCP Proxy public — Settings → Networking → Generate Domain, mode TCP).

`.env` local mis à jour et revalidé :
- `DATABASE_URL` → pooler (`caboose.proxy.rlwy.net:51918?pgbouncer=true`)
- `DIRECT_URL` → base directe (`sakura.proxy.rlwy.net:16821`), migrations uniquement

Validé : suite de 38 tests verte à travers le pooler, `prisma migrate status`
confirme que les migrations passent bien par `DIRECT_URL`, et un test de
charge de 50 requêtes simultanées sur `/api/health` renvoie 200 OK sans
erreur de connexion.

**Reste à faire** : reporter les mêmes valeurs (`DATABASE_URL` pooler /
`DIRECT_URL` direct) dans les variables d'environnement Vercel de production
— voir étape 5. Les valeurs locales de `.env` ne sont pas automatiquement
reprises par Vercel.

---

## 3. Installer gitleaks localement (une fois, par machine de développement)

```bash
brew install gitleaks
git config core.hooksPath .githooks
```

Déjà configuré dans ce sandbox de développement — à refaire sur votre propre
machine si vous clonez ce dépôt ailleurs. Le hook `.githooks/pre-commit`
bloque un commit contenant une clé API ou un secret détectable, avant qu'il
n'entre dans l'historique git.

---

## 4. Créer le dépôt GitHub et pousser le code

```bash
gh repo create jedco-ecosystem --private --source=. --remote=origin
git add .
git commit -m "feat: fondations Phase 0 — schéma corrigé, auth, séquences, CI"
git push -u origin main
```

La CI (`.github/workflows/ci.yml`) tourne automatiquement sur chaque PR —
elle utilise une base Postgres jetable propre à GitHub Actions, jamais vos
identifiants Railway de production.

---

## 5. Variables d'environnement de production (Vercel)

Dans les paramètres du projet Vercel → Environment Variables :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | URL du pooler PgBouncer (étape 2) |
| `DIRECT_URL` | URL directe Railway (étape 2) |
| `SESSION_SECRET` | Généré avec `openssl rand -base64 32` — jamais la valeur `dev-only-change-me...` du `.env` local |
| `ANTHROPIC_API_KEY` | La nouvelle clé de l'étape 1 |
| `NODE_ENV` | `production` (Vercel le définit automatiquement) |

---

## 6. Créer le premier compte ADMIN en production

Une fois déployé, **depuis votre machine**, avec `DATABASE_URL` de
production temporairement exporté (jamais via un script automatisé — §1.20
du plan, le seed ne doit jamais tourner dans un pipeline de déploiement) :

```bash
DATABASE_URL="<url de production>" npx tsx scripts/bootstrap-admin.ts \
  votre-email@jedco.ht "MotDePasseSolide123!" Prénom Nom
```

Connectez-vous ensuite sur `https://<votre-domaine>/admin/login`.

---

## État actuel (24/07/2026)

- ✅ Base Railway provisionnée et migrée (schéma v1 corrigé)
- ✅ PgBouncer installé, exposé en public, validé par un test de charge
- ⬜ Clé Anthropic — à vérifier si déjà révoquée
- ⬜ Dépôt GitHub — pas encore créé (`git remote -v` est vide)
- ⬜ Déploiement Vercel de ce backend consolidé — pas encore fait
- ⬜ Premier compte ADMIN de production — pas encore créé
