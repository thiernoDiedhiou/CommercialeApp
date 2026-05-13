# SaaS Gestion Commerciale

Plateforme SaaS multi-tenant de gestion commerciale pour PME — Afrique de l'Ouest (Sénégal).

**Backend :** API REST Laravel 11 · PHP 8.3 · MySQL 8.0  
**Frontend :** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query v5 · Zustand  
**Devises :** XOF · XAF · GNF · EUR · USD · GBP · MAD · MRU (configurable par tenant)  
**Secteurs :** `general` | `food` | `fashion` | `cosmetic`

---

## Fonctionnalités

| Module | Détail |
| --- | --- |
| **Super Admin** | Interface dédiée `/admin` — CRUD tenants, charte graphique, utilisateurs, stats globales |
| **Tableau de bord** | KPIs du jour, graphique CA 7 jours (couleurs bi-chrome tenant), top produits, alertes stock |
| **Caisse POS** | Fullscreen, panier, variantes, pesée, paiement multi-méthode + partiel, mode hors-ligne |
| **Ventes** | Liste paginée, détail, annulation, PDF — sous-menu **Retours/Avoirs** (`RET-YYYY-XXXXX`) |
| **Factures** | Workflow `draft→sent→paid/overdue/cancelled`, remise, TVA, paiement partiel, PDF, envoi email auto |
| **Produits** | CRUD, image upload, variantes, attributs, catégories, **marques**, import CSV, thumbnail dans la liste |
| **Fournisseurs** | CRUD, activation/désactivation, sélecteur pays + téléphone international |
| **Achats** | Bons de commande `ACH-YYYY-XXXXX`, workflow draft → ordered → partial → received, réception partielle idempotente |
| **Clients** | CRUD, historique des achats, sélecteur pays + téléphone — sous-menu **Créances** (`GREATEST(total-paid, 0)`) |
| **Stock** | Mouvements, ajustements, alertes seuil, lots expirants — **alertes email automatiques** |
| **Rapports** | CA par période, top produits, synthèse stock — export CSV (UTF-8 BOM, séparateur `;`) |
| **Paramètres** | Logo boutique, devise, secteur, coordonnées, SMTP tenant, profil utilisateur, groupes & permissions |
| **Toasts** | Notifications succès/erreur sur toutes les mutations — messages d'erreur Laravel traduits en français |
| **Charte graphique** | `--brand-primary` / `--brand-secondary` CSS variables — sidebar, boutons, badges, graphe, emails |
| **Notifications email** | 2 niveaux SMTP (global `.env` + par tenant), 3 jobs queue, templates HTML inline Gmail-compatible |

---

## Démarrage rapide

### Option A — Docker (recommandé)

```bash
cp backend/.env.example backend/.env
docker compose up -d
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
docker compose exec app php artisan storage:link
```

API disponible sur `http://localhost:80`.

### Option B — Local (sans Redis requis)

```bash
# ── Backend ────────────────────────────────────────────────────────────
cd backend
composer install
cp .env.example .env && php artisan key:generate
# Éditer .env : DB_DATABASE, DB_USERNAME, DB_PASSWORD
php artisan migrate --seed
php artisan storage:link   # lien symbolique pour images et logos (une seule fois)
php artisan serve          # → http://localhost:8000

# ── Frontend (autre terminal) ──────────────────────────────────────────
cd frontend
npm install
npm run dev                # → http://localhost:5173
```

> **Redis non requis en dev** — `.env.example` utilise `CACHE_STORE=file` et `SESSION_DRIVER=file` par défaut.

### Comptes de démonstration

Après `php artisan migrate --seed` :

#### Tenant démo

| Champ | Valeur |
| --- | --- |
| Email | `admin@demo.sn` |
| Mot de passe | `password` |
| X-Tenant-ID | `demo-api-key-change-in-production-64chars00000000000000000000000` |

#### Super Admin

| Champ | Valeur |
| --- | --- |
| URL | `http://localhost:5173/admin/login` |
| Email | `superadmin@saas.sn` |
| Mot de passe | `superadmin123` |

> ⚠ Changer le mot de passe Super Admin en production.

Le seed insère : 5 catégories · 15 produits · stock initial · 7 clients · ~17 ventes sur 7 jours.

---

## Prérequis

| Outil | Version | Notes |
| --- | --- | --- |
| PHP | 8.2+ | pdo_mysql, mbstring, gd, zip, intl |
| Composer | 2.x | |
| MySQL | 8.0+ | |
| Node.js | 18+ | |
| npm | 9+ | |
| Redis | 7.x | Optionnel — fallback `file` / `database` si absent |

---

## Commandes utiles

```bash
# Backend (depuis backend/)
composer test                                  # Pest — tous les tests
php vendor/bin/pest tests/Feature/Stock/       # un dossier
php vendor/bin/pest --filter "InvoiceService"  # un test précis
composer lint                                  # Laravel Pint (corrige)
composer lint:check                            # vérifie sans modifier
php artisan route:list --path=api/v1           # liste les routes tenant
php artisan route:list --path=api/v1/admin     # liste les routes super admin
php artisan db:seed --class=PermissionSeeder   # (re)créer les permissions
php artisan db:seed --class=SuperAdminSeeder   # (re)créer le compte super admin
php artisan storage:link                       # lien public/storage (images, logos)
php artisan view:clear                         # vider le cache des vues Blade (PDF)

# Frontend (depuis frontend/)
npm run dev      # dev server → http://localhost:5173
npm run build    # build production → dist/
npm run preview  # prévisualise le build
```

---

## Structure du projet

```text
saas-commercial/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Admin/          # AdminAuthController, AdminTenantController, AdminStatsController
│   │   │   ├── Auth/           # AuthController
│   │   │   ├── Category/       # CategoryController
│   │   │   ├── Customer/       # CustomerController
│   │   │   ├── Dashboard/      # DashboardController
│   │   │   ├── Invoice/        # InvoiceController
│   │   │   ├── Pos/            # PosController, PosDraftController
│   │   │   ├── Product/        # ProductController, VariantController,
│   │   │   │                   # AttributeController, ProductImportController
│   │   │   ├── Purchase/       # SupplierController, PurchaseOrderController
│   │   │   ├── Report/         # ReportController
│   │   │   ├── Sale/           # SaleController
│   │   │   ├── Settings/       # SettingsController
│   │   │   ├── Stock/          # StockController
│   │   │   └── Users/          # UserController, GroupController
│   │   ├── Http/Middleware/
│   │   │   ├── ResolveTenant.php    # Skip automatique des routes /api/v1/admin/*
│   │   │   ├── CheckPermission.php
│   │   │   └── EnsureSuperAdmin.php # Auth super admin via Sanctum (tokenable_type)
│   │   ├── Models/             # Tenant, SuperAdmin, User, Product, Sale, Invoice…
│   │   ├── Services/           # TenantService, StockService, SaleService,
│   │   │                       # PosService, ProductService, PurchaseService,
│   │   │                       # InvoiceService, ProductImportService
│   │   └── Traits/             # BelongsToTenant
│   ├── database/
│   │   ├── migrations/         # 32 migrations (préfixe 2026_MM_DD)
│   │   └── seeders/            # DatabaseSeeder, DemoDataSeeder, SuperAdminSeeder
│   ├── resources/views/pdf/    # invoice.blade.php, invoice_doc.blade.php
│   ├── routes/api.php          # Routes tenant + routes super admin /api/v1/admin/*
│   └── tests/Feature/          # Auth, Invoice, Pos, Product, Purchase, Report,
│                               # Sales, Stock, Tenant
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── admin/          # AdminLoginPage, AdminDashboardPage,
        │   │                   # AdminTenantsPage, AdminTenantDetailPage
        │   ├── dashboard/      # DashboardPage
        │   ├── pos/            # PosPage
        │   ├── sales/          # SalesPage, SaleDetailPage
        │   ├── products/       # ProductsPage (import CSV + thumbnails), ProductFormPage
        │   ├── purchases/      # SuppliersPage, PurchaseOrdersPage,
        │   │                   # PurchaseFormPage, PurchaseDetailPage
        │   ├── invoices/       # InvoicesPage, InvoiceFormPage, InvoiceDetailPage
        │   ├── customers/      # CustomersPage, CustomerDetailPage
        │   ├── stock/          # StockPage
        │   ├── reports/        # ReportsPage (3 onglets + export CSV)
        │   └── settings/       # SettingsPage (Boutique, Profil, Utilisateurs, Groupes)
        ├── components/
        │   ├── ui/             # Button, Modal, Badge, Skeleton, CanDo,
        │   │                   # PhoneInput (pays + indicatif auto), ToastContainer
        │   ├── layout/         # Layout (refresh auth au montage), Sidebar, Topbar
        │   ├── admin/          # AdminLayout
        │   └── dashboard/, pos/, stock/, products/, customers/
        ├── services/api/
        │   ├── admin.ts        # Super Admin : auth, stats, CRUD tenants
        │   ├── settings.ts     # GET/POST settings + logo upload (FormData)
        │   ├── products.ts     # CRUD + variantes + image upload (multipart)
        │   └── …               # dashboard, categories, customers, sales,
        │                       # suppliers, purchases, invoices, reports, stock,
        │                       # import, users, groups
        ├── store/
        │   ├── authStore.ts        # Zustand — user, token, permissions, tenant
        │   ├── superAdminStore.ts  # Zustand — super admin auth (localStorage séparé)
        │   ├── cartStore.ts        # Zustand — panier POS
        │   └── toastStore.ts       # Zustand — notifications toast
        ├── lib/
        │   ├── axios.ts        # intercepteur tenant (401→logout, erreurs→toast)
        │   ├── adminAxios.ts   # intercepteur super admin (pas de X-Tenant-ID)
        │   ├── errors.ts       # getApiErrorMessage() + traductions Laravel→FR
        │   └── utils.ts        # formatCurrency(), formatDate(), cn()
        └── types/              # Types TypeScript centralisés (index.ts)
```

---

## Architecture multi-tenant

### Routes tenant (avec X-Tenant-ID)

```text
X-Tenant-ID → ResolveTenant → TenantService::setCurrentTenant()
                             → TenantScope injecte WHERE tenant_id = ?
                             → BelongsToTenant::creating() injecte tenant_id
```

Toutes les routes API exigent :

- **Header** `X-Tenant-ID: <api_key>` — 400 si absent, 404 si inconnu, 401 si suspendu
- **Bearer token** Sanctum (obtenu via `POST /api/v1/auth/login`)

### Routes Super Admin (sans X-Tenant-ID)

```text
/api/v1/admin/* → ResolveTenant skippe (str_starts_with check)
               → EnsureSuperAdmin → PersonalAccessToken::findToken()
                                  → tokenable_type = App\Models\SuperAdmin
```

Interface accessible sur `/admin/login` — store Zustand `superAdminStore` séparé de `authStore`.

---

## Services métier

| Service | Responsabilité clé |
| --- | --- |
| `TenantService` | Singleton de contexte — `current()`, `currentId()`, `setting()`, `flushCache()` |
| `StockService` | `adjust()` — atomique, idempotent via `source+source_id`, journal immuable |
| `SaleService` | Transaction + verrous stock ASC (anti-deadlock) + bcmath + idempotence `offline_id` |
| `PosService` | `syncOffline()` — ventes hors-ligne idempotentes |
| `ProductService` | `generateVariantCombinations()` — produit cartésien des attributs |
| `PurchaseService` | `create/confirm/receive/cancel` — réception partielle idempotente (sourceId composite) |
| `InvoiceService` | `create/send/recordPayment/markOverdue/cancel/update` — bcmath, tolérance 1 FCFA |
| `ProductImportService` | Import CSV — séparateur `;`, BOM UTF-8, cache catégories, `update_existing` par SKU |

---

## Endpoints API principaux

### Routes tenant

| Groupe | Préfixe | Endpoints |
| --- | --- | --- |
| Auth | `/api/v1/auth` | login, logout, me |
| Dashboard | `/api/v1/dashboard` | summary |
| Rapports | `/api/v1/reports` | sales, products, stock (+ `?format=csv`) |
| Produits | `/api/v1/products` | CRUD + variantes + attributs + mouvements stock + import CSV |
| Marques | `/api/v1/brands` | CRUD — permission `products.*` |
| Catégories | `/api/v1/categories` | CRUD |
| Fournisseurs | `/api/v1/suppliers` | CRUD |
| Achats | `/api/v1/purchases` | CRUD + confirm + receive + cancel |
| Factures | `/api/v1/invoices` | CRUD + send (→ email auto) + payment + cancel + PDF |
| Ventes | `/api/v1/sales` | CRUD + paiements + annulation + PDF |
| Retours | `/api/v1/returns` | CRUD — permission `returns.*` |
| Clients | `/api/v1/customers` | CRUD + historique |
| Créances | `/api/v1/debts` | liste paginée + `global_outstanding` — permission `debts.view` |
| Stock | `/api/v1/stock` | adjust + movements + alerts + expiring |
| POS | `/api/v1/pos` | products + session + sync offline + drafts |
| Utilisateurs | `/api/v1/users` | CRUD + syncGroups |
| Groupes | `/api/v1/groups` | CRUD + permissions |
| Paramètres | `/api/v1/settings` | GET + PUT/POST (logo + SMTP tenant) |

### Routes Super Admin

| Groupe | Préfixe | Endpoints |
| --- | --- | --- |
| Auth Admin | `/api/v1/admin/auth` | login, logout, me |
| Stats | `/api/v1/admin/stats` | index (tenants total/actifs/suspendus, users total) |
| Tenants | `/api/v1/admin/tenants` | CRUD + suspend + activate |

---

## Charte graphique par tenant

Les couleurs sont définies par le Super Admin (page détail tenant) et appliquées automatiquement :

```text
Super Admin → PUT /api/v1/admin/tenants/{id} → primary_color + secondary_color sauvés en DB
Tenant login → GET /api/v1/auth/me → retourne les couleurs fraîches
Layout.tsx → applyBrandColors() → CSS variables --brand-primary / --brand-secondary
Tailwind → bg-brand-primary, text-brand-secondary, etc.
```

Rafraîchissement silencieux : `Layout.tsx` appelle `/api/v1/auth/me` à chaque montage — les couleurs mises à jour par le Super Admin sont visibles sans reconnexion.

Le tenant peut modifier son logo, sa devise et ses coordonnées mais **pas** ses couleurs.

---

## Déploiement

### Hostinger Shared Hosting

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan config:cache && php artisan route:cache
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=DefaultGroupSeeder
php artisan db:seed --class=SuperAdminSeeder
php artisan storage:link
```

Dans `.env` :

```env
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database
```

### VPS / Docker

```bash
docker compose up -d
docker compose exec app php artisan migrate --force
docker compose exec app php artisan storage:link
```

---

## Configuration email

### Niveau 1 — SMTP global (`.env`)

Utilisé comme fallback pour tous les tenants qui n'ont pas configuré leur propre SMTP, et pour les emails Super Admin (bienvenue tenant).

```env
# Production Hostinger
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=noreply@votre-domaine.sn
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@votre-domaine.sn"
MAIL_FROM_NAME="${APP_NAME}"

# Dev — écriture dans storage/logs/laravel.log (pas d'envoi réel)
MAIL_MAILER=log
```

### Niveau 2 — SMTP par tenant (Paramètres → Boutique)

Chaque tenant peut configurer son propre serveur SMTP via l'interface **Paramètres → Boutique**. Ces valeurs sont stockées en base dans `tenant_settings` et prennent le pas sur le SMTP global.

| Clé setting | Description |
| --- | --- |
| `smtp_host` | Serveur SMTP (ex: `smtp.hostinger.com`) |
| `smtp_port` | Port (587 pour TLS, 465 pour SSL) |
| `smtp_user` | Nom d'utilisateur SMTP |
| `smtp_pass` | Mot de passe SMTP |
| `smtp_from` | Adresse expéditeur (ex: `contact@boutique.sn`) |
| `smtp_from_name` | Nom affiché (ex: `Boutique Dakar`) |

### Emails envoyés automatiquement

| Événement | Destinataire | Template |
| --- | --- | --- |
| Stock passe sous le seuil d'alerte | Utilisateurs avec permission `stock.view` | `emails.stock-alert` |
| Facture envoyée (`POST /api/v1/invoices/{id}/send`) | Client de la facture | `emails.invoice-sent` + PDF en pièce jointe |
| Nouveau tenant créé (Super Admin) | Admin du tenant | `emails.tenant-welcome` |

### File d'attente

Les emails passent par la queue `notifications`. Sur Hostinger (pas de `redis`), configurer :

```env
QUEUE_CONNECTION=database
```

Le scheduler lance `queue:work --stop-when-empty` chaque minute via `routes/console.php` — aucun worker permanent n'est nécessaire.

### Tester l'envoi email en production

```bash
# Test SMTP global
php artisan tinker
Mail::raw('Test email', fn($m) => $m->to('votre@email.com')->subject('Test'));

# Vérifier que le job est bien créé dans la table jobs
php artisan tinker
DB::table('jobs')->count(); // doit augmenter après une action déclenchante

# Traiter la file manuellement (si le scheduler n'est pas encore actif)
php artisan queue:work --queue=notifications --stop-when-empty
```

---

## Roadmap

| Phase | Statut | Contenu |
| --- | --- | --- |
| Backend — Infrastructure | ✅ Terminée | Multi-tenant, RBAC, Auth Sanctum, 57 permissions |
| Backend — Produits & Stock | ✅ Terminée | Produits + images, variantes, attributs, catégories, mouvements de stock |
| Backend — Commerce | ✅ Terminée | Ventes, POS, clients, dashboard, PDF, sync offline |
| Backend — Achats | ✅ Terminée | Fournisseurs, bons de commande, réception partielle idempotente |
| Backend — Facturation | ✅ Terminée | Factures `FAC-YYYY-XXXXX`, paiements partiels, PDF |
| Backend — Rapports | ✅ Terminée | CA par période, top produits, synthèse stock, export CSV |
| Backend — Import CSV | ✅ Terminée | Import produits CSV, template téléchargeable, rapport d'erreurs |
| Backend — Super Admin | ✅ Terminée | `super_admins` table, `EnsureSuperAdmin`, CRUD tenants + charte graphique |
| Tests | ✅ Terminée | Tests Pest 3 — Auth, Invoice, Purchase, Product, Report, Sales, Stock, Tenant |
| Frontend — Tenant | ✅ Terminée | Dashboard, POS, Ventes, Factures, Produits (images), Fournisseurs, Achats, Clients, Stock, Rapports, Paramètres |
| Frontend — Super Admin | ✅ Terminée | Login dark, Dashboard stats globales, Tenants (liste + détail + édition + charte graphique) |
| UX — Toasts & notifications | ✅ Terminée | Toast success/error sur toutes les mutations, messages Laravel traduits FR |
| UX — Charte graphique | ✅ Terminée | `brand-secondary` appliqué sur badges info, icônes KPI alternées, graphe bi-chrome |
| UX — Téléphone international | ✅ Terminée | `PhoneInput` avec sélecteur pays, indicatif auto-préfixé, validation par pays |
| Marques produits | ✅ Terminée | Table `brands` tenant-scoped, `BrandSelect` avec création inline, affiché sous le nom produit |
| Retours / Avoirs | ✅ Terminée | `RET-YYYY-XXXXX`, réintégration stock idempotente, `ReturnsPage`, section dans `SaleDetailPage` |
| Créances clients | ✅ Terminée | `DebtController` SQL LIMIT/OFFSET + `global_outstanding`, `DebtsPage`, sidebar accordion |
| Notifications email | ✅ Terminée | 2 niveaux SMTP, 3 Jobs queue, 3 Mailables, templates HTML inline compatibles Gmail |
