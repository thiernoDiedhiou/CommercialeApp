<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    // Devises supportées
    private const CURRENCIES = ['XOF', 'XAF', 'GNF', 'EUR', 'USD', 'GBP', 'MAD', 'MRU'];

    // Secteurs supportés
    private const SECTORS = ['general', 'food', 'fashion', 'cosmetic'];

    public function __construct(private readonly TenantService $tenantService) {}

    /**
     * Retourne les paramètres modifiables du tenant courant.
     */
    public function show(): JsonResponse
    {
        $tenant = $this->tenantService->current();

        return response()->json([
            'data' => [
                'name'            => $tenant->name,
                'sector'          => $tenant->sector,
                'currency'        => $tenant->currency,
                'phone'           => $tenant->phone,
                'email'           => $tenant->email,
                'address'         => $tenant->address,
                'city'            => $tenant->city,
                'primary_color'   => $tenant->primary_color,
                'secondary_color' => $tenant->secondary_color,
            ],
        ]);
    }

    /**
     * Met à jour les paramètres du tenant courant.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'            => ['sometimes', 'string', 'max:150'],
            'sector'          => ['sometimes', Rule::in(self::SECTORS)],
            'currency'        => ['sometimes', Rule::in(self::CURRENCIES)],
            'phone'           => ['nullable', 'string', 'max:30'],
            'email'           => ['nullable', 'email', 'max:150'],
            'address'         => ['nullable', 'string', 'max:255'],
            'city'            => ['nullable', 'string', 'max:100'],
            'primary_color'   => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $tenant = $this->tenantService->current();
        /** @var string $apiKey */
        $apiKey = $tenant->api_key;
        $tenant->update($validated);

        // Purge le cache tenant pour que le nouveau header refresh immédiatement
        $this->tenantService->flushCache($apiKey);

        return response()->json([
            'data' => [
                'name'            => $tenant->name,
                'sector'          => $tenant->sector,
                'currency'        => $tenant->currency,
                'phone'           => $tenant->phone,
                'email'           => $tenant->email,
                'address'         => $tenant->address,
                'city'            => $tenant->city,
                'primary_color'   => $tenant->primary_color,
                'secondary_color' => $tenant->secondary_color,
            ],
        ]);
    }
}
