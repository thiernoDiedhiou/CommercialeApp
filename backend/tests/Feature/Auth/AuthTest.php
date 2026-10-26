<?php

it('allows login with valid credentials', function () {
    $tenant = $this->createTenant();
    $user = $this->createUser($tenant, ['password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'secret123',
    ], $this->makeHeaders($tenant))
        ->assertStatus(200)
        ->assertJsonStructure(['token', 'data' => ['user', 'permissions', 'tenant']]);
});

it('rejects login with wrong password', function () {
    $tenant = $this->createTenant();
    $user = $this->createUser($tenant);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ], $this->makeHeaders($tenant))
        ->assertStatus(401)
        ->assertJsonPath('code', 'INVALID_CREDENTIALS');
});

it('returns authenticated user on /me', function () {
    [$tenant, $user] = $this->createTenantWithUser();

    $this->actingAsTenant($tenant, $user)
        ->getJson('/api/v1/auth/me', $this->makeHeaders($tenant))
        ->assertStatus(200)
        ->assertJsonPath('data.user.id', $user->id);
});

it('logs out successfully', function () {
    [$tenant, $user] = $this->createTenantWithUser();

    $this->actingAsTenant($tenant, $user)
        ->postJson('/api/v1/auth/logout', [], $this->makeHeaders($tenant))
        ->assertStatus(200)
        ->assertJsonPath('message', 'Déconnexion réussie.');
});

it('returns 401 when X-Tenant-ID header is missing (auth bypasses tenant header)', function () {
    // La route /auth/* bypasse ResolveTenant — le header X-Tenant-ID n'est pas obligatoire.
    // Des identifiants invalides retournent 401 INVALID_CREDENTIALS, pas 400 TENANT_HEADER_MISSING.
    $this->postJson('/api/v1/auth/login', [
        'email' => 'user@test.com',
        'password' => 'password',
    ])->assertStatus(401)
        ->assertJsonPath('code', 'INVALID_CREDENTIALS');
});

it('returns 401 for unknown api_key in X-Tenant-ID (auth bypasses tenant header)', function () {
    // Même comportement : le header est ignoré sur /auth/*, les identifiants invalides = 401.
    $this->postJson('/api/v1/auth/login', [
        'email' => 'user@test.com',
        'password' => 'password',
    ], ['X-Tenant-ID' => 'not-a-real-key-000000000000', 'Accept' => 'application/json'])
        ->assertStatus(401)
        ->assertJsonPath('code', 'INVALID_CREDENTIALS');
});
