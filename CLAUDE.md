# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SaaS multi-tenant de gestion commerciale pour PME d'Afrique de l'Ouest (Sénégal). Backend Laravel 11 REST API uniquement — le frontend React n'existe pas encore.

- **Devise :** XOF (FCFA) — montants entiers sans centimes en pratique
- **Langue :** Français (messages d'erreur, commentaires, réponses API)
- **Secteurs supportés :** `retail` | `food` | `fashion` | `cosmetic`

## Commands

Tous les scripts s'exécutent depuis `backend/`.

```bash
# Développement local
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve

# Docker (recommandé)
docker compose up -d
docker compose exec app php artisan migrate --seed

# Tests (Pest 3)
composer test                        # clear-config + pest (tous les tests)
./vendor/bin/pest --filter "nom du test"   # un seul test
./vendor/bin/pest tests/Feature/Stock/    # un dossier
./vendor/bin/pest --coverage              # avec couverture

# Lint (Laravel Pint)
composer lint        # corrige automatiquement
composer lint:check  # vérifie sans modifier

# Artisan utiles
php artisan route:list --path=api/v1
php artisan tinker
```

## Architecture Multi-Tenant

**Flux de résolution du tenant :**
1. `ResolveTenant` middleware lit le header `X-Tenant-ID` (valeur = `api_key` du tenant)
2. Cherche `tenant_id` en cache Redis 24h (clé `tenant:api_key:{key}`)
3. Charge le tenant frais depuis la DB → appelle `TenantService::setCurrentTenant()`
4. Toutes les requêtes Eloquent des modèles `BelongsToTenant` ajoutent automatiquement `WHERE tenant_id = ?` via `TenantScope`
5. Le creating hook de `BelongsToTenant` injecte `tenant_id` si absent

**`TenantService`** est un singleton. Méthodes clés : `setCurrentTenant()`, `current()`, `currentId()`, `hasCurrentTenant()`, `setting(string $key)`. Sans `hasCurrentTenant()`, les scopes sont désactivés (safe pour Artisan/seeds).

**Header obligatoire sur toutes les routes :** `X-Tenant-ID: <api_key>` → 400 si absent, 404 si inconnu, 401 si tenant suspendu.

## RBAC

- `Permission` → `Group` (many-to-many) → `User` (many-to-many via `user_groups`)
- Middleware : `->middleware('permission:resource.action')`
- `PermissionService::getPermissions($user)` retourne la liste plate depuis Redis (TTL 30min)
- Groupes par défaut créés par `TenantObserver` : Administrateur / Gestionnaire / Vendeur

## Services Métier

Les controllers sont fins — toute la logique est dans les services :

| Service | Responsabilité clé |
|---|---|
| `StockService` | `adjust()` — atomique, idempotent via `source`+`source_id`, `StockMovement` immuable (LogicException sur update/delete) |
| `SaleService` | `create()` — transaction + verrou tenant (référence unique) + verrous stock ASC (anti-deadlock) + bcmath pour calculs financiers |
| `PosService` | `syncOffline()` — ventes hors-ligne idempotentes via `offline_id`, attrape `UniqueConstraintViolationException` comme "skipped" |
| `ProductService` | `generateVariantCombinations()` — produit cartésien des `attribute_value_ids` |
| `TenantService` | Singleton de contexte tenant, settings cachés, `flushCache()` sur modification |

**Idempotence SaleService :** avant la transaction, `create()` vérifie si `offline_id` existe déjà et retourne la vente existante.

**StockMovement :** journal append-only. `boot()` lève `LogicException` sur les événements `updating` et `deleting`.

## Modèles importants

- **`Tenant`** — `api_key` dans `$hidden` (accessible en PHP direct `$tenant->api_key`, pas en JSON). `boot()` auto-génère `slug` et `api_key`.
- **`ProductVariant`** — `BelongsToTenant` mais **pas** `HasFactory`. Créer directement via `ProductVariant::create([...])`.
- **`Product`** — `SoftDeletes`. `destroy()` dans le contrôleur vérifie `SaleItem` → soft delete si historique, hard delete sinon.
- **`Sale`** — référence format `VNT-YYYY-XXXXX`, générée dans la transaction après `lockForUpdate()` sur Tenant.

## Structure des tests

```
tests/
├── Pest.php          # uses(TestCase::class, RefreshDatabase::class)->in('Feature')
├── TestCase.php      # helpers: createTenant, createUser, createTenantWithUser,
│                     #          makeHeaders (X-Tenant-ID), actingAsTenant
└── Feature/
    ├── Auth/
    ├── Pos/
    ├── Sales/
    ├── Stock/
    └── Tenant/
```

**Pour les tests de service** (sans HTTP) : appeler `app(TenantService::class)->setCurrentTenant($tenant)` ET `$this->actingAs($user)` — StockService utilise `auth()->id()`.

**Pour les tests Feature HTTP** : passer `$this->makeHeaders($tenant)` comme 3e argument de `postJson/getJson`. Les routes nécessitent les permissions — les tests de service bypassent le middleware.

## Conventions de code

- **PHP 8.3 strict** — named arguments, readonly properties, match expressions
- **Pas de float natif pour les finances** — utiliser `bcmath` (`bcadd`, `bcmul`, `bcdiv`, `bccomp`)
- **Verrous stock** — toujours `lockForUpdate()` par ID ASC pour éviter les deadlocks
- **Réponses API** — `response()->json(['data' => ...])` pour les resources, `response()->json($paginator)` pour les listes paginées
- **Permissions dans routes** — `->middleware('permission:resource.action')` directement sur chaque route

## Hostinger / Production

- `QUEUE_CONNECTION=database` (Redis optionnel — Redis peut être indisponible sur shared hosting)
- `CACHE_STORE=database` comme fallback si Redis absent
- Horizon (queue monitoring) commenté dans `docker-compose.yml` — décommenter quand `QUEUE_CONNECTION=redis`
- Logs : rotation daily, niveau `error` en production

## Démo / Seed

```
Tenant : slug=demo
User   : admin@demo.sn / password
Rôles  : Administrateur (toutes permissions)
```
