# SaaS Gestion Commerciale

Plateforme SaaS multi-tenant de gestion commerciale pour PME — Afrique de l'Ouest (Sénégal).

**Backend :** API REST Laravel 11 · PHP 8.3 · MySQL 8.0 · Redis  
**Frontend :** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Zustand  
**Devise :** XOF (FCFA) — secteurs : `retail` | `food` | `fashion` | `cosmetic`

---

## Démarrage rapide

### Option A — Docker (recommandé)

```bash
cp backend/.env.example backend/.env
# Éditer backend/.env si besoin (DB_HOST=mysql, REDIS_HOST=redis déjà configurés)

docker compose up -d
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

API disponible sur `http://localhost:80`.

### Option B — Local

```bash
# Backend
cd backend
composer install
cp .env.example .env && php artisan key:generate
# → Éditer .env : DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD
php artisan migrate --seed
php artisan serve
# → http://localhost:8000

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Accès démo (après `db:seed`)

```
Email       : admin@demo.sn
Mot de passe: password
Tenant slug : demo
```

---

## Backend

### Prérequis

| Outil | Version | Notes |
|---|---|---|
| PHP | 8.3 | pdo_mysql, mbstring, gd, zip, intl, redis |
| Composer | 2.x | |
| MySQL | 8.0 | |
| Redis | 7.x | Optionnel — fallback `database` si absent |

### Commandes utiles

```bash
# Depuis backend/
composer test                                   # Pest (clear-config + tous les tests)
./vendor/bin/pest --filter "nom du test"        # un seul test
./vendor/bin/pest tests/Feature/Sales/          # un dossier
./vendor/bin/pest --coverage                    # avec couverture

composer lint                                   # Laravel Pint (corrige)
composer lint:check                             # vérifie sans modifier

php artisan route:list --path=api/v1
php artisan tinker
```

### Architecture multi-tenant

Toutes les routes API exigent le header `X-Tenant-ID: <api_key>`.

```
X-Tenant-ID → ResolveTenant middleware → TenantService::setCurrentTenant()
                                       → TenantScope injecte WHERE tenant_id = ?
                                       → BelongsToTenant::creating() injecte tenant_id
```

- **400** si header absent · **404** si tenant inconnu · **401** si tenant suspendu
- Cache Redis 24h sur la résolution du tenant (`tenant:api_key:{key}`)

### Services métier

| Service | Responsabilité |
|---|---|
| `TenantService` | Singleton de contexte — `current()`, `currentId()`, `setting()` |
| `StockService` | `adjust()` — atomique, idempotent via `source+source_id`, journal immuable |
| `SaleService` | Transaction + verrous stock ASC (anti-deadlock) + bcmath + idempotence `offline_id` |
| `PosService` | `syncOffline()` — ventes hors-ligne idempotentes via `offline_id` |
| `ProductService` | `generateVariantCombinations()` — produit cartésien des `attribute_value_ids` |

### Authentification et test de l'API

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: {api_key}" \
  -d '{"email":"admin@demo.sn","password":"password"}'

# Réponse
# { "token": "1|xxx", "data": { "user": {...}, "permissions": [...], "tenant": {...} } }

# Appel authentifié
curl http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer 1|xxx" \
  -H "X-Tenant-ID: {api_key}" \
  -H "Accept: application/json"
```

### Créer un tenant (production)

```bash
php artisan tinker
```

```php
$tenant = App\Models\Tenant::create([
    'name'     => 'Boutique Diallo',
    'sector'   => 'fashion',   // retail | food | fashion | cosmetic
    'currency' => 'XOF',
    'email'    => 'contact@boutique-diallo.sn',
    'city'     => 'Dakar',
]);
// api_key générée automatiquement, 3 groupes créés (TenantObserver)

$admin = App\Models\User::create([
    'tenant_id' => $tenant->id,
    'name'      => 'Mamadou Diallo',
    'email'     => 'admin@boutique-diallo.sn',
    'password'  => bcrypt('motdepasse-securise'),
]);
$admin->groups()->attach(
    $tenant->groups()->where('name', 'Administrateur')->first()->id
);
echo $tenant->api_key;
```

---

## Frontend

### Prérequis

| Outil | Version |
|---|---|
| Node.js | 20.x |
| npm | 10.x |

### Stack

| Catégorie | Librairie |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Style | Tailwind CSS 3 |
| Routing | React Router v6 |
| État global | Zustand 5 |
| Requêtes | TanStack Query v5 |
| Formulaires | React Hook Form 7 + Zod |
| HTTP | Axios |
| UI headless | Headless UI v2 + Heroicons v2 |
| Graphiques | Recharts 2 |

### Variables d'environnement

```bash
# frontend/.env.local  (optionnel — proxy Vite utilisé en dev)
VITE_API_BASE_URL=http://localhost:8000
```

### Commandes

```bash
cd frontend
npm install    # installe toutes les dépendances (dont recharts)
npm run dev    # serveur de développement http://localhost:5173
npm run build  # build production dans dist/
npm run preview
```

---

## Structure du projet

```
saas-commercial/
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/        ← Auth, Products, Variants, Sales, POS, Customers…
│   │   │   ├── Middleware/         ← ResolveTenant, CheckPermission
│   │   │   └── Requests/           ← Validation typée par ressource
│   │   ├── Models/                 ← Tenant, User, Product, Sale, StockMovement…
│   │   ├── Observers/              ← TenantObserver
│   │   ├── Scopes/                 ← TenantScope
│   │   ├── Services/               ← TenantService, StockService, SaleService, PosService
│   │   └── Traits/                 ← BelongsToTenant
│   ├── database/
│   │   ├── factories/              ← Tenant, User, Product, Customer
│   │   ├── migrations/
│   │   └── seeders/
│   ├── tests/Feature/
│   │   ├── Auth/                   ← AuthTest
│   │   ├── Pos/                    ← PosOfflineSyncTest
│   │   ├── Sales/                  ← SaleServiceTest
│   │   ├── Stock/                  ← StockServiceTest
│   │   └── Tenant/                 ← TenantIsolationTest
│   └── routes/api.php
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/                 ← Button, Input, Badge, Modal, Table, Pagination…
│       │   ├── layout/             ← Layout, Sidebar, Topbar
│       │   ├── dashboard/          ← KpiCard, WeekChart, StockAlertList, RecentSalesList
│       │   └── products/           ← CategorySelect, VariantManager
│       ├── pages/
│       │   ├── auth/               ← LoginPage
│       │   ├── dashboard/          ← DashboardPage
│       │   └── products/           ← ProductsPage, ProductFormPage
│       ├── services/api/           ← dashboard, products, categories, customers, attributes
│       ├── store/                  ← authStore, tenantStore (Zustand)
│       ├── hooks/                  ← usePermission
│       ├── lib/                    ← axios, utils (cn, formatCurrency, formatDate…)
│       └── types/                  ← interfaces TypeScript complètes
│
├── nginx/default.conf
├── docker-compose.yml
├── CLAUDE.md                       ← Guide pour Claude Code
└── README.md
```

---

## Déploiement

### Hostinger (Shared Hosting)

```bash
cd public_html/api
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan config:cache && php artisan route:cache
php artisan migrate --force
```

Pointer le Document Root vers `backend/public`.  
`QUEUE_CONNECTION=database` et `CACHE_STORE=database` (Redis optionnel).

### VPS / Docker

```bash
docker compose up -d
docker compose exec app php artisan migrate --force
```

Pour activer Horizon (queues Redis) : décommenter le service `horizon` dans `docker-compose.yml`.

---

## Roadmap

| Phase | Statut | Contenu |
|---|---|---|
| Backend P1 | ✅ Terminée | Auth · RBAC · Tenants · Produits · Variantes · Attributs · Stock · Catégories |
| Backend P2 | ✅ Terminée | Ventes · POS · Clients · Dashboard · POS offline |
| Backend P3 | ✅ Terminée | Tests Pest (Auth, TenantIsolation, Stock, Sales, POS) · Factories |
| Frontend P4 | 🔄 En cours | Setup · Composants UI · Dashboard · Produits |
| Frontend P5 | 🔜 Planifiée | Clients · Ventes · POS · Stock · Paramètres |
| Frontend P6 | 🔜 Planifiée | Rapports · Exports PDF · Notifications |
