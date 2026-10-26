<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckSubscription;
use App\Models\Branch;
use App\Models\Plan;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Services\BranchService;
use App\Services\TenantService;
use Illuminate\Support\Facades\DB;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(function () {
    [$this->tenant, $this->user] = $this->createTenantWithUser();
    app(TenantService::class)->setCurrentTenant($this->tenant);
    $this->headers = $this->makeHeaders($this->tenant);
    // La succursale principale est créée par TenantObserver à la création du tenant
    $this->principal = Branch::where('tenant_id', $this->tenant->id)
        ->where('type', 'principal')
        ->first();

    // Plan avec max_branches=5 pour pouvoir tester la création de plusieurs succursales
    $plan = Plan::create([
        'name' => 'Test', 'slug' => 'test-'.uniqid(), 'price_monthly' => 0,
        'is_active' => true, 'is_public' => false, 'max_branches' => 5,
        'max_users' => 0, 'max_products' => 0, 'max_monthly_sales' => 0,
        'feature_pos' => true, 'feature_invoicing' => false, 'feature_purchases' => false,
        'feature_reports' => false, 'feature_shop' => false, 'feature_import_csv' => false,
        'feature_stock_alerts' => false, 'feature_multi_user' => false,
        'feature_custom_domain' => false, 'sort_order' => 0,
    ]);
    TenantSubscription::create([
        'tenant_id' => $this->tenant->id, 'plan_id' => $plan->id,
        'billing_cycle' => 'monthly', 'status' => 'active',
        'starts_at' => now()->subDay(), 'ends_at' => now()->addYear(),
    ]);

    // Bypass abonnement + permissions (testés dans TenantIsolationTest) mais garde ResolveTenant + ResolveBranch actifs
    $this->withoutMiddleware([
        CheckSubscription::class,
        CheckPermission::class,
    ]);
});

// ─── TenantObserver ───────────────────────────────────────────────────────────

it('crée automatiquement une succursale principale à la création du tenant', function () {
    expect($this->principal)->not->toBeNull()
        ->and($this->principal->type)->toBe('principal')
        ->and($this->principal->is_active)->toBeTrue();
});

// ─── CRUD Succursales ─────────────────────────────────────────────────────────

it('liste les succursales du tenant', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', $this->headers);

    $response->assertOk()
        ->assertJsonPath('data.0.type', 'principal');
});

it('crée une nouvelle succursale de type sync', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/branches', [
            'name' => 'Annexe Plateau',
            'type' => 'sync',
        ], $this->headers);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Annexe Plateau')
        ->assertJsonPath('data.type', 'sync');

    expect(Branch::where('tenant_id', $this->tenant->id)->count())->toBe(2);
});

it('refuse la création d\'une deuxième succursale principale', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/branches', [
            'name' => 'Deuxième Principal',
            'type' => 'principal',
        ], $this->headers);

    $response->assertStatus(422)
        ->assertJsonPath('code', 'PRINCIPAL_ALREADY_EXISTS');
});

it('refuse deux succursales avec le même nom dans le même tenant', function () {
    $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/branches', ['name' => 'Depot', 'type' => 'sync'], $this->headers)
        ->assertCreated();

    $response = $this->actingAs($this->user, 'sanctum')
        ->postJson('/api/v1/branches', ['name' => 'Depot', 'type' => 'warehouse'], $this->headers);

    $response->assertStatus(422);
});

it('met à jour le nom d\'une succursale', function () {
    $branch = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Vieux nom',
    ]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->putJson("/api/v1/branches/{$branch->uid}", [
            'name' => 'Nouveau nom',
        ], $this->headers);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Nouveau nom');
});

it('refuse de modifier le type de la succursale principale', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->putJson("/api/v1/branches/{$this->principal->uid}", [
            'type' => 'sync',
        ], $this->headers);

    $response->assertStatus(422)
        ->assertJsonPath('code', 'PRINCIPAL_TYPE_IMMUTABLE');
});

it('refuse de désactiver la succursale principale', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->putJson("/api/v1/branches/{$this->principal->uid}", [
            'is_active' => false,
        ], $this->headers);

    $response->assertStatus(422)
        ->assertJsonPath('code', 'PRINCIPAL_UNDELETABLE');
});

it('supprime une succursale sync sans ventes', function () {
    $branch = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'À supprimer',
    ]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/branches/{$branch->uid}", [], $this->headers);

    $response->assertNoContent();
    expect(Branch::where('id', $branch->id)->exists())->toBeFalse();
});

it('refuse de supprimer la succursale principale', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->deleteJson("/api/v1/branches/{$this->principal->uid}", [], $this->headers);

    $response->assertStatus(422)
        ->assertJsonPath('code', 'PRINCIPAL_UNDELETABLE');
});

// ─── Isolation multi-tenant ───────────────────────────────────────────────────

it('isole les succursales entre tenants', function () {
    [$otherTenant] = $this->createTenantWithUser();
    $otherBranch = Branch::where('tenant_id', $otherTenant->id)->first();

    // L'utilisateur du tenant A ne doit pas voir la succursale du tenant B
    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson("/api/v1/branches/{$otherBranch->uid}", $this->headers);

    $response->assertNotFound();
});

// ─── ResolveBranch middleware ─────────────────────────────────────────────────

it('résout le contexte de succursale via X-Branch-ID', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', array_merge($this->headers, [
            'X-Branch-ID' => $this->principal->uid,
        ]));

    $response->assertOk();
    expect(app(BranchService::class)->currentId())->toBe($this->principal->id);
});

it('retourne 404 si X-Branch-ID est inconnu', function () {
    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', array_merge($this->headers, [
            'X-Branch-ID' => 'uid-inexistant-000',
        ]));

    $response->assertNotFound()
        ->assertJsonPath('code', 'BRANCH_NOT_FOUND');
});

it('retourne 403 si X-Branch-ID appartient à une autre succursale du même tenant — mais inactive', function () {
    $inactive = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Inactive',
        'is_active' => false,
    ]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', array_merge($this->headers, [
            'X-Branch-ID' => $inactive->uid,
        ]));

    $response->assertForbidden()
        ->assertJsonPath('code', 'BRANCH_INACTIVE');
});

// ─── Restrictions utilisateur (user_branches) ─────────────────────────────────

it('refuse l\'accès si l\'utilisateur n\'a pas accès à la succursale demandée', function () {
    $restricted = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Restreinte',
    ]);
    $otherBranch = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'warehouse',
        'name' => 'Entrepôt',
    ]);

    // Restreindre l'utilisateur à `$otherBranch` uniquement
    DB::table('user_branches')->insert([
        'user_id' => $this->user->id,
        'branch_id' => $otherBranch->id,
    ]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', array_merge($this->headers, [
            'X-Branch-ID' => $restricted->uid,
        ]));

    $response->assertForbidden()
        ->assertJsonPath('code', 'BRANCH_ACCESS_DENIED');
});

it('autorise l\'accès si l\'utilisateur est dans user_branches pour cette succursale', function () {
    $branch = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Autorisée',
    ]);

    DB::table('user_branches')->insert([
        'user_id' => $this->user->id,
        'branch_id' => $branch->id,
    ]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', array_merge($this->headers, [
            'X-Branch-ID' => $branch->uid,
        ]));

    $response->assertOk();
});

it('autorise l\'accès sans restrictions si user_branches est vide', function () {
    // Aucune entrée dans user_branches → accès à toutes les succursales
    $response = $this->actingAs($this->user, 'sanctum')
        ->getJson('/api/v1/branches', array_merge($this->headers, [
            'X-Branch-ID' => $this->principal->uid,
        ]));

    $response->assertOk();
});

// ─── available_branches dans /auth/me ────────────────────────────────────────

it('retourne available_branches dans /auth/me filtré par restrictions', function () {
    $allowed = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Permise',
    ]);
    $forbidden = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'warehouse',
        'name' => 'Interdite',
    ]);

    // Restreindre l'utilisateur à `$allowed` uniquement
    DB::table('user_branches')->insert([
        'user_id' => $this->user->id,
        'branch_id' => $allowed->id,
    ]);

    $token = $this->user->createToken('test')->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/v1/auth/me', $this->headers);

    $response->assertOk();

    $uids = collect($response->json('data.available_branches'))->pluck('uid');
    expect($uids)->toContain($allowed->uid)
        ->and($uids)->not->toContain($forbidden->uid);
});

it('retourne toutes les succursales actives si aucune restriction', function () {
    Branch::factory()->create(['tenant_id' => $this->tenant->id, 'type' => 'sync', 'name' => 'B1']);
    Branch::factory()->create(['tenant_id' => $this->tenant->id, 'type' => 'warehouse', 'name' => 'B2']);

    $token = $this->user->createToken('test')->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/v1/auth/me', $this->headers);

    $response->assertOk();

    $uids = collect($response->json('data.available_branches'))->pluck('uid');
    expect($uids)->toHaveCount(3); // principal + B1 + B2
});

// ─── Sync user ↔ branches ────────────────────────────────────────────────────

it('synchronise les succursales d\'un utilisateur via POST /users/{uid}/branches', function () {
    $branch = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Depot',
    ]);

    $targetUser = User::factory()->create(['tenant_id' => $this->tenant->id]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/users/{$targetUser->uid}/branches", [
            'branch_uids' => [$branch->uid],
        ], $this->headers);

    $response->assertOk();

    expect(DB::table('user_branches')
        ->where('user_id', $targetUser->id)
        ->where('branch_id', $branch->id)
        ->exists()
    )->toBeTrue();
});

it('vide les restrictions quand branch_uids est un tableau vide', function () {
    $branch = Branch::factory()->create([
        'tenant_id' => $this->tenant->id,
        'type' => 'sync',
        'name' => 'Depot',
    ]);
    $targetUser = User::factory()->create(['tenant_id' => $this->tenant->id]);

    DB::table('user_branches')->insert([
        'user_id' => $targetUser->id,
        'branch_id' => $branch->id,
    ]);

    $response = $this->actingAs($this->user, 'sanctum')
        ->postJson("/api/v1/users/{$targetUser->uid}/branches", [
            'branch_uids' => [],
        ], $this->headers);

    $response->assertOk();

    expect(DB::table('user_branches')->where('user_id', $targetUser->id)->count())->toBe(0);
});
