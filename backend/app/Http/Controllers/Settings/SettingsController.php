<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\ActivityLogService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    private const CURRENCIES = ['XOF', 'XAF', 'GNF', 'EUR', 'USD', 'GBP', 'MAD', 'MRU'];

    private const SECTORS = ['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services'];

    // Clés des settings SMTP stockés dans tenant_settings (group='smtp').
    // Note : smtp_password est stocké en clair — envisager un chiffrement applicatif en production.
    private const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_encryption', 'smtp_username', 'smtp_password', 'smtp_from_address', 'smtp_from_name'];

    // Clés des settings documents stockés dans tenant_settings (group='documents').
    private const DOCUMENT_KEYS = ['pdf_template', 'invoice_footer', 'invoice_prefix'];

    public function __construct(private readonly TenantService $tenantService) {}

    /**
     * Retourne les paramètres modifiables du tenant courant.
     */
    public function show(): JsonResponse
    {
        $tenant = $this->tenantService->current();

        return response()->json(['data' => $this->formatTenant($tenant)]);
    }

    /**
     * Met à jour les paramètres du tenant courant.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'sector' => ['sometimes', Rule::in(self::SECTORS)],
            'currency' => ['sometimes', Rule::in(self::CURRENCIES)],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'rccm' => ['nullable', 'string', 'max:100'],
            'ninea' => ['nullable', 'string', 'max:50'],
            // primary_color et secondary_color sont gérés exclusivement par le Super Admin
            'logo' => ['nullable', 'mimes:jpeg,png,webp,svg', 'max:2048'],
            'remove_logo' => ['boolean'],
            // SMTP tenant
            'smtp_host' => ['nullable', 'string', 'max:255'],
            'smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_encryption' => ['nullable', Rule::in(['tls', 'ssl'])],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string', 'max:255'],
            'smtp_from_address' => ['nullable', 'email', 'max:255'],
            'smtp_from_name' => ['nullable', 'string', 'max:255'],
            // Documents
            'pdf_template'   => ['sometimes', 'nullable', Rule::in(['classic', 'moderne'])],
            'invoice_footer' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:10'],
        ]);

        $tenant = $this->tenantService->current();
        /** @var string $apiKey */
        $apiKey = $tenant->api_key;

        // ── Logo ────────────────────────────────────────────────────────────
        if ($request->hasFile('logo')) {
            if ($tenant->logo_path) {
                Storage::disk('public')->delete($tenant->logo_path);
            }
            $validated['logo_path'] = $request->file('logo')->store('logos', 'public');
        } elseif ($request->boolean('remove_logo') && $tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
            $validated['logo_path'] = null;
        }

        // ── Séparer champs tenant, SMTP et documents ───────────────────────
        $smtpData = array_intersect_key($validated, array_flip(self::SMTP_KEYS));
        $documentData = array_intersect_key($validated, array_flip(self::DOCUMENT_KEYS));
        $tenantData = array_diff_key($validated, array_flip(array_merge(self::SMTP_KEYS, self::DOCUMENT_KEYS)));
        unset($tenantData['logo'], $tenantData['remove_logo']);

        DB::transaction(function () use ($tenant, $tenantData, $smtpData, $documentData) {
            $tenant->update($tenantData);

            // ── Upsert SMTP dans tenant_settings ────────────────────────────
            foreach ($smtpData as $key => $val) {
                if ($val === null || $val === '') {
                    $tenant->settings()->where('key', $key)->delete();
                } else {
                    $tenant->settings()->updateOrCreate(
                        ['key' => $key],
                        ['value' => (string) $val, 'type' => 'string', 'group' => 'smtp'],
                    );
                }
            }

            // ── Upsert documents dans tenant_settings ───────────────────────
            foreach ($documentData as $key => $val) {
                if ($val === null || $val === '') {
                    $tenant->settings()->where('key', $key)->delete();
                } else {
                    $tenant->settings()->updateOrCreate(
                        ['key' => $key],
                        ['value' => (string) $val, 'type' => 'string', 'group' => 'documents'],
                    );
                }
            }
        });

        $tenant->refresh();
        $this->tenantService->flushCache($apiKey);

        ActivityLogService::log('update', 'settings', 'Paramètres mis à jour');

        return response()->json(['data' => $this->formatTenant($tenant)]);
    }

    private function formatTenant(Tenant $tenant): array
    {
        $allKeys = array_merge(self::SMTP_KEYS, self::DOCUMENT_KEYS); // DOCUMENT_KEYS inclut maintenant invoice_footer et invoice_prefix
        $settings = $tenant->settings()
            ->whereIn('key', $allKeys)
            ->pluck('value', 'key');

        return [
            'name' => $tenant->name,
            'sector' => $tenant->sector,
            'currency' => $tenant->currency,
            'phone' => $tenant->phone,
            'email' => $tenant->email,
            'address' => $tenant->address,
            'city' => $tenant->city,
            'rccm' => $tenant->rccm,
            'ninea' => $tenant->ninea,
            'primary_color' => $tenant->primary_color,
            'secondary_color' => $tenant->secondary_color,
            'logo_url' => $tenant->logo_path
                ? Storage::disk('public')->url($tenant->logo_path)
                : null,
            // SMTP
            'smtp_host' => $settings['smtp_host'] ?? null,
            'smtp_port' => isset($settings['smtp_port']) ? (int) $settings['smtp_port'] : null,
            'smtp_encryption' => $settings['smtp_encryption'] ?? 'tls',
            'smtp_username' => $settings['smtp_username'] ?? null,
            'smtp_password' => $settings['smtp_password'] ?? null,
            'smtp_from_address' => $settings['smtp_from_address'] ?? null,
            'smtp_from_name' => $settings['smtp_from_name'] ?? null,
            // Documents
            'pdf_template'   => $settings['pdf_template']   ?? 'classic',
            'invoice_footer' => $settings['invoice_footer'] ?? null,
            'invoice_prefix' => $settings['invoice_prefix'] ?? null,
        ];
    }
}
