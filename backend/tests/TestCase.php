<?php

namespace Tests;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function createTenant(array $overrides = []): Tenant
    {
        return Tenant::factory()->create($overrides);
    }

    protected function createUser(Tenant $tenant, array $overrides = []): User
    {
        return User::factory()->create(
            array_merge(['tenant_id' => $tenant->id], $overrides)
        );
    }

    protected function setCurrentTenant(Tenant $tenant): void
    {
        app(TenantService::class)->setCurrentTenant($tenant);
    }

    /**
     * Retourne les headers HTTP pour les tests Feature (résolution du tenant).
     * api_key accessible directement depuis le modèle PHP (non JSON).
     */
    protected function makeHeaders(Tenant $tenant): array
    {
        return [
            'X-Tenant-ID' => $tenant->api_key,
            'Accept'      => 'application/json',
        ];
    }

    /**
     * Définit le tenant courant dans TenantService et authentifie l'utilisateur.
     * Utilisé pour les tests Feature qui passent par les middlewares HTTP.
     */
    protected function actingAsTenant(Tenant $tenant, User $user): static
    {
        $this->setCurrentTenant($tenant);

        return $this->actingAs($user, 'sanctum');
    }

    /**
     * Crée un tenant + un utilisateur en une seule ligne.
     *
     * @return array{0: Tenant, 1: User}
     */
    protected function createTenantWithUser(
        array $tenantOverrides = [],
        array $userOverrides   = [],
    ): array {
        $tenant = $this->createTenant($tenantOverrides);
        $user   = $this->createUser($tenant, $userOverrides);

        return [$tenant, $user];
    }
}
