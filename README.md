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
| **Boutique en ligne** | Vitrine publique `/shop/{slug}` — hero personnalisable, catégories avec icônes, promotions (-X%), prix barré, stock faible, recherche URL, panier |
| **Produits** | CRUD, image upload, variantes, attributs, catégories, **marques**, **prix barré** (`compare_at_price`), import CSV, thumbnail dans la liste |
| **Fournisseurs** | CRUD, activation/désactivation, sélecteur pays + téléphone international |
| **Achats** | Bons de commande `ACH-YYYY-XXXXX`, workflow draft → ordered → partial → received, réception partielle idempotente |
| **Clients** | CRUD, historique des achats, sélecteur pays + téléphone — sous-menu **Créances** (`GREATEST(total-paid, 0)`) |
| **Stock** | Mouvements, ajustements, alertes seuil, lots expirants — **alertes email automatiques** |
| **Rapports** | CA par période, top produits, synthèse stock — export CSV (UTF-8 BOM, séparateur `;`) |
| **Paramètres** | Logo boutique, devise, secteur, coordonnées, SMTP tenant, profil utilisateur, groupes & permissions |
| **Toasts** | Notifications succès/erreur sur toutes les mutations — messages d'erreur Laravel traduits en français |
| **Charte graphique** | `--brand-primary` / `--brand-secondary` CSS variables — sidebar, boutons, badges, graphe, emails |
| **Notifications email** | 2 niveaux SMTP (global `.env` + par tenant), 3 jobs queue, templates HTML inline Gmail-compatible |
| **Landing page & SEO** | `react-helmet-async` + composant `SeoHead`, prérendu statique SSG par route (`npm run build:ssg`), `robots.txt`, `sitemap.xml`, `.htaccess`, JSON-LD (Organization, SoftwareApplication, FAQPage, Product), Open Graph 1200×630px |

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

# Build production avec prérendu SEO (à exécuter avant déploiement)
npm run build:ssg          # génère dist/ + dist/{route}/index.html par page landing
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
npm run dev        # dev server → http://localhost:5173
npm run build      # build production SPA → dist/
npm run build:ssg  # build + prérendu SEO des pages landing (recommandé en prod)
npm run preview    # prévisualise le build
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
│   │   ├── migrations/         # 33 migrations (préfixe 2026_MM_DD)
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
        │   │                   # CategoriesPage (CRUD arbre), BrandsPage (CRUD)
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

### Identifiants — Pattern `id + uid`

Tous les modèles métier exposent deux identifiants :

| Champ | Type | Usage |
| --- | --- | --- |
| `id` | Auto-increment | Clé primaire interne, jointures SQL uniquement |
| `uid` | UUID v4 NOT NULL UNIQUE | Routes API, URLs frontend — jamais `id` |

Le trait `HasUuid` (`app/Traits/HasUuid.php`) génère automatiquement l'UUID à la création. Toutes les routes utilisent le binding `{model:uid}` (Laravel résout via `WHERE uid = ?`). Cette approche élimine l'énumération séquentielle des ressources (IDOR).

**Modèles avec `uid` :** Tenant, User, Product, ProductVariant, Category, Brand, Customer, Supplier, Group, Sale, SaleReturn, PurchaseOrder, Invoice, ShopOrder, Plan.

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
| Stock | `/api/v1/stock` | adjust + movements + alerts + expiring (`?search=`, `?days=7\|15\|30\|60`) |
| POS | `/api/v1/pos` | products + session + sync offline + drafts |
| Utilisateurs | `/api/v1/users` | CRUD + syncGroups |
| Groupes | `/api/v1/groups` | CRUD + permissions |
| Paramètres | `/api/v1/settings` | GET + PUT/POST (logo + SMTP tenant) |

### Routes publiques Shop (sans authentification)

| Groupe | Préfixe | Endpoints |
| --- | --- | --- |
| Shop | `/api/v1/public/{slug}` | config, categories, products (filtrés par category_id / search / on_sale / sort), product detail |

### Routes Super Admin

| Groupe | Préfixe | Endpoints |
| --- | --- | --- |
| Auth Admin | `/api/v1/admin/auth` | login, logout, me |
| Stats | `/api/v1/admin/stats` | index (tenants total/actifs/suspendus, users total) |
| Plans | `/api/v1/admin/plans` | CRUD — paramètre `{plan:uid}` |
| Tenants | `/api/v1/admin/tenants` | CRUD + suspend + activate — paramètre `{tenant:uid}` |
| Abonnements | `/api/v1/admin/tenants/{tenant:uid}/subscription` | GET + POST + PUT + historique |

---

## Charte graphique par tenant

Les couleurs sont définies par le Super Admin (page détail tenant) et appliquées automatiquement :

```text
Super Admin → PUT /api/v1/admin/tenants/{uid} → primary_color + secondary_color sauvés en DB
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

### Digital Ocean Droplet — Nginx + PHP-FPM

```bash
# 1. Build frontend sur la machine de dev
cd frontend && npm run build:ssg   # génère dist/ avec pages SSG

# 2. Copier dist/ vers le serveur
rsync -avz dist/ user@<IP>:/var/www/saas-commercial/public/

# 3. Backend — depuis le serveur
cd /var/www/saas-commercial
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan config:cache && php artisan route:cache
php artisan migrate --force
php artisan storage:link
```

**Configuration Nginx** (équivalent du `.htaccess` pour le SPA + SSG) :

```nginx
server {
    listen 80;
    server_name didisphere.shop www.didisphere.shop;
    root /var/www/saas-commercial/public;
    index index.html;

    # ── Frontend SPA + SSG ────────────────────────────────────────────
    location / {
        # Sert la page SSG prérendue si elle existe (ex: /tarifs/index.html)
        try_files $uri $uri/index.html /index.html;
    }

    # ── Backend API Laravel ───────────────────────────────────────────
    location /api/ {
        root /var/www/saas-commercial/backend/public;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }

    # ── Fichiers statiques ─────────────────────────────────────────────
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

> ⚠ Le fichier `public/.htaccess` est pour **Apache uniquement** (Hostinger). Sur Nginx (Digital Ocean), il est ignoré — utiliser la config ci-dessus.

---

## URLs de boutique — 3 phases d'évolution

Les vitrines publiques supportent trois modes d'accès progressifs. Le code frontend (`useDomainTenant.ts`) et le backend (`PublicShopController::resolveByDomain`) gèrent les trois sans modification supplémentaire.

### Phase 1 — Path-based *(actif)*

```text
https://didisphere.shop/shop/boutique-fatou
```

Aucun prérequis infrastructure supplémentaire. URL résolue depuis le chemin React Router.

---

### Phase 2 — Sous-domaine wildcard

```text
https://boutique-fatou.didisphere.shop
```

#### 1. DNS wildcard (Digital Ocean → Networking → Domains)

```text
Type : A
Nom  : *
TTL  : 3600
IP   : <IP de votre Droplet>
```

#### 2. Certificat SSL wildcard

```bash
# Installer le plugin Digital Ocean pour Certbot (Ubuntu/Debian)
sudo apt install python3-certbot-dns-digitalocean

# Créer un token API Digital Ocean avec accès DNS
mkdir -p ~/.secrets/certbot
echo "dns_digitalocean_token = <VOTRE_TOKEN_DO>" > ~/.secrets/certbot/digitalocean.ini
chmod 600 ~/.secrets/certbot/digitalocean.ini

# Générer le certificat wildcard
sudo certbot certonly --dns-digitalocean \
  -d didisphere.shop \
  -d *.didisphere.shop \
  --dns-digitalocean-credentials ~/.secrets/certbot/digitalocean.ini
```

#### 3. Nginx wildcard

```bash
sudo cp nginx-subdomain.conf /etc/nginx/conf.d/didisphere-subdomain.conf
sudo nginx -t && sudo systemctl reload nginx
```

#### 4. Variable d'environnement frontend

```env
# frontend/.env (production)
VITE_MAIN_DOMAIN=didisphere.shop
```

Rebuild et redéployer le frontend après cette modification.

---

### Phase 3 — Domaine custom client

```text
https://www.boutique-fatou.com    →  géré par DiDi Sphere
```

#### Côté client (tenant)

Le client configure un CNAME chez son registrar :

```text
CNAME  www  →  didisphere.shop
```

#### Côté Super Admin

Dans l'interface Super Admin → Tenants → éditer → champ **Domaine custom** :

```text
www.boutique-fatou.com
```

#### Côté serveur (par domaine custom)

```bash
# Générer un certificat SSL pour ce domaine
sudo certbot --nginx -d www.boutique-fatou.com

# Nginx génère automatiquement un bloc server pour ce domaine
# Le frontend détecte le domaine via useDomainTenant.ts (mode 'custom')
# et appelle /api/v1/public/resolve-domain?domain=www.boutique-fatou.com
```

---

### Tableau récapitulatif

| | Phase 1 | Phase 2 | Phase 3 |
| --- | --- | --- | --- |
| **URL** | `/shop/slug` | `slug.didisphere.shop` | `www.client.com` |
| **DNS** | Aucun | Wildcard `*.didisphere.shop` | CNAME côté client |
| **SSL** | 1 certificat | 1 wildcard `*.didisphere.shop` | 1 cert par domaine |
| **Config Nginx** | Standard | `nginx-subdomain.conf` | `certbot --nginx` |
| **Variable env** | Aucune | `VITE_MAIN_DOMAIN` | Aucune |
| **Statut** | ✅ Actif | ⏳ Phase suivante | ⏳ Pour clients premium |

### Digital Ocean Droplet — Docker Compose

```bash
# Sur le serveur
git pull origin main
docker compose up -d --build
docker compose exec app php artisan migrate --force
docker compose exec app php artisan storage:link

# Build frontend (depuis la machine de dev, copier dist/ sur le serveur)
cd frontend && npm run build:ssg
rsync -avz dist/ user@<IP>:/var/www/saas-commercial/public/
```

### VPS / Docker (générique)

```bash
docker compose up -d
docker compose exec app php artisan migrate --force
docker compose exec app php artisan storage:link
```

---

## Configuration paiements (abonnements DiDi Sphere)

### Variables `.env` backend

```env
# Provider actif — changer cette ligne pour changer de prestataire
PAYMENT_PROVIDER=null          # null (dev/test) | paydunya | cinetpay | bictorys
PAYMENT_LINK_TTL=3600          # validité du lien de paiement en secondes (1h)
PAYMENT_NULL_FAIL=false        # true = simule un échec de paiement (tests)

# PayDunya — renseigner après création du compte marchand
PAYDUNYA_MASTER_KEY=           # depuis le dashboard PayDunya → Paramètres → API
PAYDUNYA_PRIVATE_KEY=
PAYDUNYA_TOKEN=
PAYDUNYA_MODE=test             # test → live uniquement après validation complète
```

### Activation en production

```bash
# 1. Renseigner les 3 clés PayDunya dans .env
# 2. Passer en mode test d'abord
PAYMENT_PROVIDER=paydunya
PAYDUNYA_MODE=test

# 3. Tester avec un vrai compte (petit montant)
php artisan billing:test-invoice --tenant=votre-slug

# 4. Passer en live uniquement après validation
PAYDUNYA_MODE=live
php artisan config:cache
```

### Scheduler — ajouter au cron serveur

```bash
# Nettoyage des paiements abandonnés (toutes les 30min)
# Déjà dans routes/console.php — s'active via le scheduler Laravel
* * * * * cd /var/www/saas-commercial/backend && php artisan schedule:run >> /dev/null 2>&1
```

### URL webhook à configurer dans PayDunya

```text
https://api.didisphere.shop/api/v1/billing/webhook/paydunya
```

À renseigner dans le dashboard PayDunya → Paramètres → Webhooks.

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
| CRUD Catégories & Marques | ✅ Terminée | Pages dédiées `/categories` (arbre parent/enfant, description) et `/brands` — sous-menu accordéon "Produits" dans la sidebar |
| Filtres Lots expirants | ✅ Terminée | Recherche par nom produit + sélecteur fenêtre (7 / 15 / 30 / 60 jours) + message vide dynamique |
| Charte graphique POS | ✅ Terminée | `applyBrandColors()` appelé au montage du POS — couleurs tenant cohérentes même après rechargement direct de la page |
| Boutique en ligne — socle | ✅ Terminée | `PublicShopController`, `ShopConfig`, routes `/api/v1/public/{slug}/*`, `shopStore`, vitrine multi-pages |
| Boutique en ligne — design & UX | ✅ Terminée | Hero overlay, CategoryStrip icônes sémantiques, `compare_at_price` (-X% badge + prix rayé), stock faible, "Offres du moment" auto-masquée, recherche URL-driven, menu mobile icônes |
| Migration UID | ✅ Terminée | Trait `HasUuid`, migration 3 phases (nullable→backfill→NOT NULL), routes `{model:uid}`, frontend `useParams<{ uid }>` — élimination IDOR |
| Profil utilisateur | ✅ Terminée | Page `/profile` accessible à tous les utilisateurs (hors settings), topbar enrichie (avatar initiales, Mon profil, déconnexion), changement de mot de passe avec révocation des sessions |
| Landing page & SEO | ✅ Terminée | `react-helmet-async`, composant `SeoHead`, prérendu SSG (`build:ssg`), `robots.txt`, `sitemap.xml`, `.htaccess`, JSON-LD multi-schémas, Open Graph 1200×630, Twitter Card, canonical par route |
