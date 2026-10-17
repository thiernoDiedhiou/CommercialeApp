<?php

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Services\TenantService;

it('does not expose tenant B products to tenant A Eloquent queries', function () {
    [$tenantA] = $this->createTenantWithUser();
    [$tenantB] = $this->createTenantWithUser();

    $this->setCurrentTenant($tenantA);
    Product::factory()->create(['tenant_id' => $tenantA->id, 'name' => 'Produit A']);

    // Création explicite avec tenant_id de B (bypass creating hook)
    Product::factory()->create(['tenant_id' => $tenantB->id, 'name' => 'Produit Secret B']);

    // TenantScope filtre automatiquement sur tenantA
    $products = Product::pluck('name');

    expect($products)->toContain('Produit A')
        ->not->toContain('Produit Secret B');
});

it('does not expose tenant B customers to tenant A Eloquent queries', function () {
    [$tenantA] = $this->createTenantWithUser();
    [$tenantB] = $this->createTenantWithUser();

    $this->setCurrentTenant($tenantA);
    Customer::factory()->create(['tenant_id' => $tenantA->id, 'name' => 'Client A']);
    Customer::factory()->create(['tenant_id' => $tenantB->id, 'name' => 'Client Secret B']);

    $customers = Customer::pluck('name');

    expect($customers)->toContain('Client A')
        ->not->toContain('Client Secret B');
});

it('auto-injects tenant_id on model creation when tenant is set', function () {
    [$tenantA] = $this->createTenantWithUser();
    $this->setCurrentTenant($tenantA);

    // Sans passer tenant_id explicitement — le creating hook l'injecte
    $product = Product::factory()->make();
    $product->save();

    expect($product->tenant_id)->toBe($tenantA->id);
});

it('does not expose tenant B products through HTTP to tenant A', function () {
    [$tenantA, $userA] = $this->createTenantWithUser();
    [$tenantB]         = $this->createTenantWithUser();

    app(TenantService::class)->setCurrentTenant($tenantB);
    Product::factory()->create(['tenant_id' => $tenantB->id, 'name' => 'Produit Confidentiel B']);

    $response = $this->actingAs($userA)
        ->getJson('/api/v1/products', $this->makeHeaders($tenantA));

    $names = collect($response->json('data'))->pluck('name');
    expect($names)->not->toContain('Produit Confidentiel B');
});

it('withoutGlobalScopes without explicit tenant filter exposes all tenants data', function () {
    // Ce test documente le risque : withoutGlobalScopes() sans where(tenant_id)
    // est dangeureux — toujours ajouter un filtre tenant explicite dans ce cas.
    [$tenantA] = $this->createTenantWithUser();
    [$tenantB] = $this->createTenantWithUser();

    app(TenantService::class)->setCurrentTenant($tenantA);
    Product::factory()->create(['tenant_id' => $tenantA->id, 'name' => 'Produit A']);

    app(TenantService::class)->setCurrentTenant($tenantB);
    Product::factory()->create(['tenant_id' => $tenantB->id, 'name' => 'Produit B']);

    // Simulation d'un usage incorrect — withoutGlobalScopes sans filtre tenant
    $allProducts = Product::withoutGlobalScopes()->pluck('name');
    expect($allProducts)->toContain('Produit A')->toContain('Produit B')
        ->and($allProducts->count())->toBe(2); // prouve la fuite potentielle

    // Avec TenantScope actif, seul le tenant courant est visible
    $scoped = Product::pluck('name');
    expect($scoped)->toContain('Produit B')->not->toContain('Produit A');
});

it('scopes are not applied when no tenant is set (artisan/seed context)', function () {
    // TenantService frais (pas de setCurrentTenant)
    $tenantService = app(TenantService::class);
    expect($tenantService->hasCurrentTenant())->toBeFalse();

    [$tenantA] = $this->createTenantWithUser();
    [$tenantB] = $this->createTenantWithUser();

    Product::factory()->create(['tenant_id' => $tenantA->id]);
    Product::factory()->create(['tenant_id' => $tenantB->id]);

    // Sans tenant courant → TenantScope ne filtre pas → tous les produits visibles
    expect(Product::count())->toBe(2);
});
