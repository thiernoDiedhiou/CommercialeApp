<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class TenantService
{
    private ?Tenant $currentTenant = null;

    public function setCurrentTenant(Tenant $tenant): void
    {
        $this->currentTenant = $tenant;
    }

    public function current(): Tenant
    {
        if (! $this->currentTenant) {
            throw new RuntimeException('Aucun tenant résolu pour cette requête.');
        }

        return $this->currentTenant;
    }

    public function currentId(): int
    {
        return $this->current()->id;
    }

    public function hasCurrentTenant(): bool
    {
        return $this->currentTenant !== null;
    }

    public function sector(): string
    {
        return $this->current()->sector;
    }

    /**
     * Récupère un paramètre tenant avec cast automatique selon le type stocké.
     */
    public function setting(string $key, mixed $default = null): mixed
    {
        $cacheKey = "tenant:{$this->currentId()}:setting:{$key}";

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($key, $default) {
            $setting = $this->current()
                ->settings()
                ->where('key', $key)
                ->first();

            if (! $setting) {
                return $default;
            }

            return match ($setting->type) {
                'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
                'integer' => (int) $setting->value,
                'float' => (float) $setting->value,
                'json',
                'array' => json_decode($setting->value, true),
                default => $setting->value,
            };
        });
    }

    /**
     * Invalide le cache du tenant (après modification des paramètres ou désactivation).
     */
    public function flushCache(string $apiKey): void
    {
        Cache::forget("tenant:api_key:{$apiKey}");

        if ($this->currentTenant) {
            $tenantId = $this->currentId();
            // Cache::forget() ne supporte pas les wildcards — on itère sur chaque clé de setting.
            $this->currentTenant->settings()->pluck('key')->each(function (string $key) use ($tenantId) {
                Cache::forget("tenant:{$tenantId}:setting:{$key}");
            });
        }
    }
}
