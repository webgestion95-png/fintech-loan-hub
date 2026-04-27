# LoanFlow

Plateforme MVP de gestion de prêts en ligne (UI 100% en français). Inspirée d'une néobanque française moderne — confiance, calme, polish.

## Stack
- Monorepo pnpm (`pnpm-workspace.yaml`)
- Frontend : `artifacts/loanflow` — React 19 + Vite + Tailwind v4 + shadcn-ui + Wouter
- API : `artifacts/api-server` — Express 5 + Clerk + Drizzle + pino
- DB : PostgreSQL (Replit-managed) via `lib/db` (Drizzle)
- Auth : Clerk (proxy + `@clerk/express` + `@clerk/react`) — pas de JWT/bcrypt maison
- Spec API : `lib/api-spec/openapi.yaml` (orval -> hooks React Query + Zod)

## Modèle de données (`lib/db/src/schema/`)
- `users` (id uuid, clerkUserId unique, email, fullName, role enum USER|ADMIN, walletBalance, createdAt)
- `loans` (id, userId fk, applicantName, applicantEmail, amount numeric, durationMonths int, monthlyIncome numeric, purpose, status enum, adminNote, decisionAt, contractSignedAt, processingUntil, fundsAvailableAt, withdrawnAmount, createdAt, updatedAt)
- `loan_documents` (id, loanId fk, filename, contentType, dataBase64) — uploads stockés en base64 dans la DB pour l'MVP
- `contracts` (id, loanId fk, kind enum GENERATED|SIGNED, filename, contentType, dataBase64) — contrat généré + contrat signé téléversé
- `timeline_events` (id, loanId fk, kind, message, createdAt)
- `loan_status` enum : `EN_ATTENTE | ACCEPTE | REFUSE | CONTRAT_ENVOYE | CONTRAT_SIGNE | EN_TRAITEMENT | FONDS_DISPONIBLES`

## Cycle de vie d'un prêt
1. `EN_ATTENTE` — utilisateur soumet la demande (formulaire + documents)
2. Admin décide : `ACCEPTE` (email envoyé) ou `REFUSE` (terminal, email envoyé)
3. `CONTRAT_ENVOYE` — admin clique "Envoyer le contrat" → PDF généré côté serveur (pdfkit), stocké en DB, email avec PDF en pièce jointe + email de demande de signature
4. `CONTRAT_SIGNE` — utilisateur upload le PDF signé depuis son espace
5. `EN_TRAITEMENT` — admin clique "Lancer le traitement (72h)" → `processingUntil = now + 72h`
6. `FONDS_DISPONIBLES` — débloqué automatiquement quand `processingUntil < now` (vérifié à chaque lecture utilisateur ou liste admin), ou manuellement via le bouton admin "Débloquer maintenant"
7. Wallet : `availableBalance = amount - withdrawnAmount`, retraits via `POST /api/loans/:id/withdraw`

## Bootstrap admin + 2FA
- Variable `ADMIN_EMAILS` (CSV d'emails) dans secrets — quand un user signe avec un de ces emails, son `role` est mis à `ADMIN` à la création
- Alternative : Clerk `publicMetadata.role = "ADMIN"`
- Le rôle est persisté dans la table `users` à la première connexion
- **2FA TOTP obligatoire** pour tout email présent dans `ADMIN_EMAILS` (ex. `webgestion95@gmail.com`)
  - Tables : `admin_two_factor` (secret + enabledAt), `admin_audit_log` (toutes les actions admin)
  - `requireAdmin` middleware bloque tout `/admin/*` sans cookie `lf_admin_mfa` valide (HMAC SESSION_SECRET, TTL 8h)
  - Routes `/admin/2fa/{status,setup,enable,verify,logout}`
  - Frontend : `<AdminGate>` affiche `SetupTwoFactor` (QR + code) ou `VerifyTwoFactor` (saisie code) avant le contenu admin

## Emails
- `lib/email.ts` envoie via Resend si `RESEND_API_KEY` est défini, sinon log structuré (mode simulé)
- L'utilisateur a refusé l'intégration Resend pour l'instant — les emails sont actuellement loggés. Pour activer la livraison réelle, ajouter `RESEND_API_KEY` (et optionnellement `EMAIL_FROM`) en secret OU re-proposer l'intégration Resend
- 6 templates : ACCEPTED, REFUSED, CONTRACT_SENT (avec PDF en pj), SIGNATURE_REQUEST, PROCESSING, FUNDS_AVAILABLE

## Endpoints clés (`/api`)
User :
- `GET /me` — profil + role
- `GET /loans` / `POST /loans` / `GET /loans/:id`
- `POST /loans/:id/upload-signed-contract` — body `{ filename, contentType, dataBase64 }`
- `POST /loans/:id/withdraw` — body `{ amount }`
- `GET /loans/:id/contract.pdf` — stream PDF généré
- `GET /loans/:loanId/documents/:docId` — stream pièce jointe
- `GET /loans/:loanId/signed-contract` — stream PDF signé

Admin (tous gardés par `requireAdmin` qui enforce 2FA si email ∈ ADMIN_EMAILS) :
- `GET /admin/loans`, `GET /admin/loans/:id`, `GET /admin/stats`, `GET /admin/activity`
- `GET /admin/documents` — liste de tous les documents (joins loans + users)
- `GET /admin/audit-log` — 100 dernières actions admin (sécurité)
- `PATCH /admin/loans/:id/decision` — `{ decision: ACCEPT|REFUSE, adminNote? }`
- `POST /admin/loans/:id/advance` — `{ action: SEND_CONTRACT|START_PROCESSING|RELEASE_FUNDS }`
- `GET/POST /admin/2fa/{status,setup,enable,verify,logout}` (gardés par `requireAdminPreMfa`)

## Frontend (routes wouter, basées sur `BASE_URL`)
- `/` landing (signed-out) → redirige `/admin` si ADMIN, sinon `/loans`
- `/sign-in/*?` `/sign-up/*?` — pages Clerk customisées (theme shadcn + localisation FR)
- **Espace utilisateur** (Layout clair) : `/loans` mes prêts ; `/loans/new` formulaire ; `/loans/:id` détail
  - `<UserOnlyRoute>` redirige les ADMIN vers `/admin` (séparation stricte des espaces)
- **Espace admin** (Layout sombre dédié `<AdminLayout>` + `<AdminGate>` 2FA) :
  - `/admin` tableau de bord ; `/admin/loans` liste ; `/admin/loans/:id` détail
  - `/admin/documents` table pro de tous les documents (preview modal + téléchargement)
  - `/admin/audit` journal de sécurité
- 404 français
- Libellés client (banking terms) : "Étude du dossier", "Accord de principe", "Contrat reçu", "Validation finale (72h)", "Fonds disponibles" — voir `lib/status.tsx` + `lib/utils.ts`

## Theme
- Palette : pine/teal profond (couleur signature) + neutres chauds
- Typo : Fraunces (serif éditoriale) + Inter (sans système)
- Fichier : `artifacts/loanflow/src/index.css`

## Build / dev
- API server : `pnpm --filter @workspace/api-server run dev` — esbuild bundle ; `pdfkit`, `fontkit`, `brotli` sont **externalisés** dans `build.mjs`
- Frontend : workflow `artifacts/loanflow: web` (Vite)
- DB push : `pnpm --filter @workspace/db run push`
- Codegen API : `pnpm --filter @workspace/api-spec run codegen`

## À savoir (gotchas)
- Tailwind v4 + Clerk : `index.css` doit déclarer `@layer theme, base, clerk, components, utilities;` AVANT `@import 'tailwindcss';` puis `@import '@clerk/themes/shadcn.css';` après. `vite.config.ts` passe `tailwindcss({ optimize: false })`
- Les hooks générés (`@workspace/api-client-react`) attendent une `queryKey` dans `query.queryKey` — toujours utiliser `getXxxQueryKey()` helpers
- Auto-release des fonds : appelé dans `requireAdmin` listings et dans `getLoan`/`withdraw` côté user — pas besoin d'un cron
