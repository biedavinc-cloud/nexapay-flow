# Migration Base44 → Neon + Cloudflare Pages

## Contexte

Ce projet était construit à 100% sur Base44 (auth, entities, functions serverless
via `base44/entities` et `base44/functions`, backend hébergé Base44). Il n'y avait
pas de base Neon ni de backend Cloudflare — seulement un front Vite statique
déployé sur Cloudflare Pages qui appelait le backend hébergé Base44.

## Phase 1 — Auth (ce commit)

Remplace `base44.auth.*` par un backend maison :

- **DB** : Neon Postgres, table `users` (`migrations/0001_users.sql`)
- **Backend** : Cloudflare Pages Functions sous `functions/api/auth/*`
  - `register`, `verify-otp`, `resend-otp` (inscription + OTP email)
  - `login`, `logout`, `me` (GET/PATCH)
  - `forgot-password`, `reset-password`
  - `google/start`, `google/callback` (OAuth Google complet)
- **Sessions** : cookie JWT httpOnly (`nexapay_session`), pas de token côté client
- **Frontend** : `src/lib/authClient.js` remplace le SDK Base44 pour l'auth ;
  `AuthContext.jsx`, `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`,
  `ResetPassword.jsx`, `Layout.jsx`, `AdminLayout.jsx`, `MerchantSettings.jsx`,
  `Onboarding.jsx`, `ApprovalPending.jsx`, `PageNotFound.jsx`, `adminAudit.js`
  rebranchés dessus.

### Bug corrigé au passage
`Layout.jsx`, `MerchantSettings.jsx`, `ApprovalPending.jsx` lisaient
`me.data.tenant_id` alors que l'objet utilisateur est plat (`me.tenant_id`,
comme le confirme `me.role`/`me.email` utilisés juste à côté). `me.data` était
`undefined`, donc `!me.data?.tenant_id` était toujours vrai : des marchands
déjà approuvés étaient probablement renvoyés vers `/onboarding` à chaque
chargement. Corrigé aux 3 endroits.

### À faire avant de déployer en prod (setup, pas du code)
1. Créer la base Neon et exécuter `migrations/0001_users.sql`.
2. Configurer les variables d'env Cloudflare Pages listées dans `ENV_VARS.example.txt`
   (DATABASE_URL, JWT_SECRET, APP_URL, RESEND_API_KEY, EMAIL_FROM,
   GOOGLE_CLIENT_ID/SECRET).
3. Déclarer `${APP_URL}/api/auth/google/callback` comme redirect URI autorisé
   dans Google Cloud Console.
4. `npm install` (nouvelles deps : `@neondatabase/serverless`, `jose`).

## ⚠️ Ce qui NE fonctionnera PAS tant que la Phase 2 n'est pas faite

Ces fonctionnalités appellent encore `base44.entities.*` / `base44.functions.invoke()`
/ `base44.integrations.*`, qui dépendaient d'un token Base44 obtenu via l'ancien
flux `base44.auth.login...`. Ce flux n'existe plus : **ces appels n'auront plus de
token valide et échoueront** dès que Phase 1 est déployée seule :

- Onboarding marchand → création de `Tenant` (`base44.entities.Tenant.create`)
- Paiement au checkout → `base44.functions.invoke("processCheckoutPayment", ...)`
- Dashboard marchand / admin → lecture des `Tenant`, `Transaction`, etc.
- Upload de logo/documents KYC → `base44.integrations.Core.UploadPublicFile`
- Audit log superadmin → `base44.entities.SuperadminAuditLog.create`
- Provisioning des rôles superadmin → `base44.functions.invoke("superadminRoles", ...)`
- La page `OAuthConsent.jsx` (consentement MCP) reste entièrement liée à
  l'infrastructure MCP hébergée par Base44 — hors périmètre de cette migration,
  à traiter séparément si besoin.

**Ne pas merger cette branche seule sur `main` en prod** : le login fonctionnera,
mais onboarding, paiement et dashboards casseront. Phase 2 = migrer les entities
(`base44/entities/*.jsonc`) vers des tables Neon et les functions
(`base44/functions/*`) vers des Cloudflare Pages Functions, en particulier
`processCheckoutPayment` (paiement réel) en priorité.
