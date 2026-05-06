# SaaS Gestion Commerciale

Plateforme SaaS multi-tenant de gestion commerciale pour PME — Afrique de l'Ouest (Sénégal).

**Backend :** API REST Laravel 11 · PHP 8.3 · MySQL 8.0  
**Frontend :** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Zustand  
**Devises :** XOF · XAF · GNF · EUR · USD · GBP · MAD · MRU (configurable par tenant, décimales adaptées)  
**Secteurs :** `general` | `food` | `fashion` | `cosmetic`

---

## Fonctionnalités

| Module | Détail |
| --- | --- |
| **Tableau de bord** | KPIs du jour, graphique CA 7 jours, top produits, alertes stock |
| **Caisse POS** | Fullscreen, panier, variantes, pesée, paiement multi-méthode, mode hors-ligne |
| **Ventes** | Liste paginée, détail, annulation, téléchargement PDF |
| **Factures** | Workflow `draft→sent→paid/overdue/cancelled`, remise, TVA, paiement partiel, PDF |
| **Produits** | CRUD, image upload, variantes, attributs, catégories imbriquées, import CSV |
| **Fournisseurs** | CRUD, activation/désactivation |
| **Achats** | Bons de commande `ACH-YYYY-XXXXX`, workflow draft → ordered → partial → received, réception partielle idempotente |
| **Clients** | CRUD, historique des achats |
| **Stock** | Mouvements, ajustements, alertes seuil, lots expirants |
| **Rapports** | CA par période, top produits, synthèse stock — export CSV (UTF-8 BOM, séparateur `;`) |
| **Paramètres** | Onglet Boutique (devise, secteur, couleur, coordonnées), profil utilisateur, groupes & permissions (57 permissions) |
| **Multi-devise** | `formatCurrency()` lit la devise du tenant automatiquement — toast global pour toutes les erreurs API |

---

## Démarrage rapide

### Option A — Docker (recommandé)

```bash
cp backend/.env.example backend/.env
# Éditer backend/.env si besoin (DB_HOST=mysql déjà configuré)

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
php artisan storage:link   # lien symbolique pour les images produits (une seule fois)
php artisan serve
# → http://localhost:8000

# ── Frontend (autre terminal) ──────────────────────────────────────────
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

> **Redis non requis en dev** — `.env.example` utilise `CACHE_STORE=file` et `SESSION_DRIVER=file` par défaut.

### Compte de démonstration

Après `php artisan migrate --seed` :

| Champ | Valeur |
| --- | --- |
| Email | `admin@demo.sn` |
| Mot de passe | `password` |
| X-Tenant-ID | `demo-api-key-change-in-production-64chars00000000000000000000000` |

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
composer test                              # Pest — tous les tests (107 tests)
php vendor/bin/pest tests/Feature/Stock/  # un dossier
php vendor/bin/pest --filter "InvoiceService"  # un test précis
composer lint                             # Laravel Pint (corrige)
composer lint:check                       # vérifie sans modifier
php artisan route:list --path=api/v1      # liste les routes API
php artisan db:seed --class=PermissionSeeder   # (re)créer les permissions
php artisan db:seed --class=DefaultGroupSeeder # (re)créer les groupes par défaut
php artisan view:clear                    # vider le cache des vues Blade (PDF)
php artisan tinker

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
│   │   │   ├── Stock/          # StockController
│   │   │   └── Users/          # UserController, GroupController
│   │   ├── Models/             # Tenant, User, Product, Sale, Invoice,
│   │   │                       # Supplier, PurchaseOrder, PurchaseOrderItem…
│   │   ├── Services/           # TenantService, StockService, SaleService,
│   │   │                       # PosService, ProductService, PurchaseService,
│   │   │                       # InvoiceService, ProductImportService
│   │   └── Traits/             # BelongsToTenant
│   ├── database/
│   │   ├── factories/          # ProductFactory, CustomerFactory, UserFactory…
│   │   ├── migrations/         # Préfixe 2026_MM_DD — 29 migrations
│   │   └── seeders/            # DatabaseSeeder + DemoDataSeeder
│   ├── resources/views/pdf/    # invoice.blade.php (ventes), invoice_doc.blade.php (factures)
│   ├── routes/api.php          # ~95 endpoints sous /api/v1/
│   └── tests/Feature/          # 107 tests — Auth, Invoice, Pos, Product,
│                               # Purchase, Report, Sales, Stock, Tenant
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── dashboard/      # DashboardPage
        │   ├── pos/            # PosPage
        │   ├── sales/          # SalesPage, SaleDetailPage
        │   ├── products/       # ProductsPage (import CSV intégré), ProductFormPage
        │   ├── purchases/      # SuppliersPage, PurchaseOrdersPage,
        │   │                   # PurchaseFormPage, PurchaseDetailPage
        │   ├── invoices/       # InvoicesPage, InvoiceFormPage, InvoiceDetailPage
        │   ├── customers/      # CustomersPage, CustomerDetailPage
        │   ├── stock/          # StockPage
        │   ├── reports/        # ReportsPage (3 onglets + export CSV)
        │   └── settings/       # SettingsPage
        ├── components/         # ui/, layout/, dashboard/, pos/, stock/, products/, customers/
        ├── hooks/              # useCurrency() — devise du tenant + formatAmount()
        ├── services/api/       # auth, dashboard, products, categories, customers,
        │                       # sales, stock, suppliers, purchases, invoices,
        │                       # reports, import, settings, users, groups
        ├── store/              # authStore, cartStore, toastStore (Zustand)
        ├── lib/
        │   ├── axios.ts        # intercepteur global (401→logout, erreurs→toast)
        │   ├── errors.ts       # getApiErrorMessage() — messages précis par code HTTP
        │   └── utils.ts        # formatCurrency() lit la devise du tenant automatiquement
        └── types/              # Types TypeScript centralisés (index.ts)
```

---

## Architecture multi-tenant

Toutes les routes API exigent :

- **Header** `X-Tenant-ID: <api_key>` — 400 si absent, 404 si inconnu, 401 si suspendu
- **Bearer token** Sanctum (obtenu via `POST /api/v1/auth/login`)

```text
X-Tenant-ID → ResolveTenant → TenantService::setCurrentTenant()
                             → TenantScope injecte WHERE tenant_id = ?
                             → BelongsToTenant::creating() injecte tenant_id
```

---

## Services métier

| Service | Responsabilité clé |
| --- | --- |
| `TenantService` | Singleton de contexte — `current()`, `currentId()`, `setting()` |
| `StockService` | `adjust()` — atomique, idempotent via `source+source_id`, journal immuable |
| `SaleService` | Transaction + verrous stock ASC (anti-deadlock) + bcmath + idempotence `offline_id` |
| `PosService` | `syncOffline()` — ventes hors-ligne idempotentes |
| `ProductService` | `generateVariantCombinations()` — produit cartésien des attributs |
| `PurchaseService` | `create/confirm/receive/cancel` — réception partielle idempotente (sourceId composite), mise à jour stock via `StockService` |
| `InvoiceService` | `create/send/recordPayment/markOverdue/cancel/update` — bcmath, tolérance 1 FCFA, référence `FAC-YYYY-XXXXX` |
| `ProductImportService` | Import CSV — séparateur `;`, BOM UTF-8, cache catégories, `update_existing` par SKU |
| `SettingsController` | `GET/PUT /api/v1/settings` — devise, secteur, couleurs, coordonnées + `flushCache` |

---

## Endpoints API principaux

| Groupe | Préfixe | Endpoints |
| --- | --- | --- |
| Auth | `/api/v1/auth` | login, logout, me |
| Dashboard | `/api/v1/dashboard` | summary |
| Rapports | `/api/v1/reports` | sales, products, stock (+ `?format=csv`) |
| Produits | `/api/v1/products` | CRUD + variantes + attributs + mouvements stock + import CSV + template |
| Catégories | `/api/v1/categories` | CRUD |
| Fournisseurs | `/api/v1/suppliers` | CRUD |
| Achats | `/api/v1/purchases` | CRUD + confirm + receive + cancel |
| Factures | `/api/v1/invoices` | CRUD + send + payment + cancel + PDF |
| Ventes | `/api/v1/sales` | CRUD + paiements + annulation + PDF |
| Clients | `/api/v1/customers` | CRUD + historique |
| Stock | `/api/v1/stock` | adjust + movements + alerts + expiring |
| POS | `/api/v1/pos` | products + session + sync offline + drafts |
| Utilisateurs | `/api/v1/users` | CRUD + syncGroups |
| Groupes | `/api/v1/groups` | CRUD + permissions |
| Paramètres | `/api/v1/settings` | GET (info boutique) + PUT (devise, secteur, couleurs…) |

---

## Test rapide de l'API

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: demo-api-key-change-in-production-64chars00000000000000000000000" \
  -d '{"email":"admin@demo.sn","password":"password"}'

# Appel authentifié
curl http://localhost:8000/api/v1/dashboard/summary \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: demo-api-key-change-in-production-64chars00000000000000000000000"

# Rapport CA du mois (export CSV)
curl "http://localhost:8000/api/v1/reports/sales?from=2026-05-01&to=2026-05-31&format=csv" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: demo-api-key-change-in-production-64chars00000000000000000000000" \
  --output ventes.csv

# Import produits CSV
curl -X POST http://localhost:8000/api/v1/products/import \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: demo-api-key-change-in-production-64chars00000000000000000000000" \
  -F "file=@produits.csv" \
  -F "update_existing=1"
```

---

## Créer un nouveau tenant

```bash
php artisan tinker
```

```php
$tenant = App\Models\Tenant::create([
    'name'     => 'Boutique Diallo',
    'sector'   => 'fashion',   // general | food | fashion | cosmetic
    'currency' => 'XOF',
    'email'    => 'contact@boutique-diallo.sn',
    'city'     => 'Dakar',
]);
// api_key et 3 groupes générés automatiquement (TenantObserver)

$admin = App\Models\User::create([
    'tenant_id' => $tenant->id,
    'name'      => 'Mamadou Diallo',
    'email'     => 'admin@boutique-diallo.sn',
    'password'  => bcrypt('motdepasse-securise'),
]);
$admin->groups()->attach(
    App\Models\Group::where('tenant_id', $tenant->id)->where('name', 'Administrateur')->first()->id
);
echo $tenant->api_key;
```

---

## Déploiement

### Hostinger Shared Hosting

```bash
# Sur le serveur
composer install --no-dev --optimize-autoloader
php artisan key:generate          # NE PAS committer le .env
php artisan config:cache && php artisan route:cache
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=DefaultGroupSeeder
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

Pour activer Horizon (queues Redis) : décommenter le service `horizon` dans `docker-compose.yml`.

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
| Tests | ✅ Terminée | 107 tests Pest 3 — Auth, Invoice, Purchase, Product, Report, Sales, Stock, Tenant |
| Frontend — Complet | ✅ Terminée | Dashboard, POS, Ventes, Factures, Produits, Fournisseurs, Achats, Clients, Stock, Rapports, Paramètres |
| Données démo | ✅ Terminée | DemoDataSeeder — 15 produits, 7 clients, ~17 ventes |
| Multi-devise & UX | ✅ Terminée | `useCurrency()` hook, `formatCurrency()` auto-tenant, toast global, onglet Boutique dans paramètres |
