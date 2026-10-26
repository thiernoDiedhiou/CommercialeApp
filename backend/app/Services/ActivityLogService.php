<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

class ActivityLogService
{
    public static function log(
        string $action,
        string $module,
        string $description,
        array $properties = [],
    ): void {
        try {
            $tenantService = app(TenantService::class);
            if (! $tenantService->hasCurrentTenant()) {
                return;
            }

            $user = Auth::user();
            ActivityLog::create([
                'tenant_id' => $tenantService->currentId(),
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'Système',
                'user_role' => 'user',
                'action' => $action,
                'module' => $module,
                'description' => $description,
                'properties' => $properties ?: null,
                'ip_address' => Request::ip(),
            ]);
        } catch (\Throwable $e) {
            // Le journal ne doit jamais bloquer une opération métier
            Log::error('ActivityLog échec', [
                'action' => $action,
                'module' => $module,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
