# SaaS Gestion Commerciale

Plateforme SaaS multi-tenant de gestion commerciale pour PME — Afrique de l'Ouest (Sénégal).

**Backend :** API REST Laravel 11 · PHP 8.3 · MySQL 8.0  
**Frontend :** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Zustand  
**Devise :** XOF (FCFA) — secteurs : `general` | `food` | `fashion` | `cosmetic`

---

## Fonctionnalités

| Module | Détail |
|---|---|
| **Tableau de bord** | KPIs du jour, graphique CA 7 jours, top produits, alertes stock |
| **Caisse POS** | Fullscreen, panier, variantes, pesée, paiement multi-méthode, mode hors-ligne |
| **Ventes** | Liste paginée, détail, annulation, téléchargement PDF |
| **Produits** | CRUD, variantes, attributs, catégories imbriquées |
| **Clients** | CRUD, historique des achats |
| **Stock** | Mouvements, ajustements, alertes seuil, lots expirants |
| **Paramètres** | Profil utilisateur, gestion des utilisateurs, groupes & permissions |

---

## Démarrage rapide

### Option A — Docker (recommandé)

```bash
cp backend/.env.example backend/.env
# Éditer backend/.env si besoin (DB_HOST=mysql déjà configuré)

docker compose up -d
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
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
|---|---|
| Email | `admin@demo.sn` |
| Mot de passe | `password` |
| X-Tenant-ID | `demo-api-key-change-in-production-64chars00000000000000000000000` |

Le seed insère : 5 catégories · 15 produits · stock initial · 7 clients · ~17 ventes sur 7 jours.

---

## Prérequis

| Outil | Version | Notes |
|---|---|---|
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
composer test                              # Pest — tous les tests
./vendor/bin/pest --filter "SaleService"  # un test précis
./vendor/bin/pest tests/Feature/Stock/    # un dossier
./vendor/bin/pest --coverage              # avec couverture
composer lint                             # Laravel Pint (corrige)
composer lint:check                       # vérifie sans modifier
php artisan route:list --path=api/v1      # liste les routes API
php artisan tinker

# Frontend (depuis frontend/)
npm run dev      # dev server → http://localhost:5173
npm run build    # build production → dist/
npm run preview  # prévisualise le build
```

---

## Structure du projet

```
saas-commercial/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/   # 14 contrôleurs (fins — logique dans Services/)
│   │   ├── Models/             # Tenant, User, Product, Sale, StockMovement…
│   │   ├── Services/           # TenantService, StockService, SaleService, PosService
│   │   └── Traits/             # BelongsToTenant
│   ├── database/
│   │   ├── migrations/         # Préfixe 2026_MM_DD
│   │   └── seeders/            # DatabaseSeeder + DemoDataSeeder
│   ├── routes/api.php          # ~60 endpoints sous /api/v1/
│   └── tests/Feature/          # Auth, Pos, Sales, Stock, Tenant (Pest 3)
│
└── frontend/
    └── src/
        ├── pages/              # Dashboard, POS, Ventes, Produits, Clients, Stock, Paramètres
        ├── components/         # ui/, layout/, dashboard/, pos/, stock/, products/, customers/
        ├── services/api/       # 8 modules axios
        ├── store/              # authStore, cartStore (Zustand)
        └── types/              # Types TypeScript centralisés
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
|---|---|
| `TenantService` | Singleton de contexte — `current()`, `currentId()`, `setting()` |
| `StockService` | `adjust()` — atomique, idempotent via `source+source_id`, journal immuable |
| `SaleService` | Transaction + verrous stock ASC (anti-deadlock) + bcmath + idempotence `offline_id` |
| `PosService` | `syncOffline()` — ventes hors-ligne idempotentes |
| `ProductService` | `generateVariantCombinations()` — produit cartésien des attributs |

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
php artisan config:cache && php artisan route:cache
php artisan migrate --force
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
```

Pour activer Horizon (queues Redis) : décommenter le service `horizon` dans `docker-compose.yml`.

---

## Roadmap

| Phase | Statut | Contenu |
|---|---|---|
| Backend — Infrastructure | ✅ Terminée | Multi-tenant, RBAC, Auth Sanctum, 37 permissions |
| Backend — Produits & Stock | ✅ Terminée | Produits, variantes, attributs, catégories, mouvements de stock |
| Backend — Commerce | ✅ Terminée | Ventes, POS, clients, dashboard, PDF, sync offline |
| Backend — Tests | ✅ Terminée | Pest 3 (Auth, TenantIsolation, Stock, Sales, POS) |
| Frontend — Complet | ✅ Terminée | Dashboard, POS, Ventes, Produits, Clients, Stock, Paramètres |
| Données démo | ✅ Terminée | DemoDataSeeder — 15 produits, 7 clients, ~17 ventes |
| Rapports avancés | 🔜 Planifiée | Exports Excel/PDF, rapports périodiques |
| Multi-devise | 🔜 Planifiée | EUR, USD, GNF |
