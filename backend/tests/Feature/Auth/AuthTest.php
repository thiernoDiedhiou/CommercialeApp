<?php

it('allows login with valid credentials', function () {
    $tenant = $this->createTenant();
    $user   = $this->createUser($tenant, ['password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', [
        'email'    => $user->email,
        'password' => 'secret123',
    ], $this->makeHeaders($tenant))
        ->assertStatus(200)
        ->assertJsonStructure(['token', 'data' => ['user', 'permissions', 'tenant']]);
});

it('rejects login with wrong password', function () {
    $tenant = $this->createTenant();
    $user   = $this->createUser($tenant);

    $this->postJson('/api/v1/auth/login', [
        'email'    => $user->email,
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

it('returns 400 when X-Tenant-ID header is missing', function () {
    $this->postJson('/api/v1/auth/login', [
        'email'    => 'user@test.com',
        'password' => 'password',
    ])->assertStatus(400)
      ->assertJsonPath('code', 'TENANT_HEADER_MISSING');
});

it('returns 404 for unknown api_key in X-Tenant-ID', function () {
    $this->postJson('/api/v1/auth/login', [
        'email'    => 'user@test.com',
        'password' => 'password',
    ], ['X-Tenant-ID' => 'not-a-real-key-000000000000', 'Accept' => 'application/json'])
        ->assertStatus(404)
        ->assertJsonPath('code', 'TENANT_NOT_FOUND');
});
