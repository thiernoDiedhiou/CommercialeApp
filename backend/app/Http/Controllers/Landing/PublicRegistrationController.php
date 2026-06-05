<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Services\MailService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class PublicRegistrationController extends Controller
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly MailService   $mailService,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name'   => ['required', 'string', 'max:150'],
            'sector'         => ['required', Rule::in(['general', 'food', 'fashion', 'cosmetic'])],
            'currency'       => ['nullable', Rule::in(['XOF', 'XAF', 'GNF', 'EUR', 'USD'])],
            'admin_name'     => ['required', 'string', 'max:150'],
            'admin_email'    => ['required', 'email', 'max:150', Rule::unique('users', 'email')],
            'admin_password' => ['required', 'string', 'min:8'],
        ]);

        [$tenant, $admin] = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'name'      => $validated['company_name'],
                'sector'    => $validated['sector'],
                'currency'  => $validated['currency'] ?? 'XOF',
                'is_active' => true,
            ]);

            $this->tenantService->setCurrentTenant($tenant);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name'      => $validated['admin_name'],
                'email'     => $validated['admin_email'],
                'password'  => Hash::make($validated['admin_password']),
                'is_active' => true,
            ]);

            $adminGroup = Group::where('tenant_id', $tenant->id)
                ->where('name', 'Administrateur')
                ->first();

            if ($adminGroup) {
                $user->groups()->attach($adminGroup->id);
            }

            return [$tenant, $user];
        });

        // Abonnement d'essai automatique — premier plan public disponible
        $plan = Plan::where('is_active', true)
            ->where('is_public', true)
            ->orderBy('sort_order')
            ->orderBy('price_monthly')
            ->first();

        if ($plan) {
            TenantSubscription::create([
                'tenant_id'     => $tenant->id,
                'plan_id'       => $plan->id,
                'billing_cycle' => 'trial',
                'status'        => 'trial',
                'starts_at'     => now(),
                'ends_at'       => now()->addDays($plan->trial_days),
            ]);
        }

        $this->mailService->sendTenantWelcome($tenant, $admin, $validated['admin_password']);

        $trialDays = $plan?->trial_days ?? 21;

        return response()->json([
            'message'   => "Compte créé. Votre essai gratuit de {$trialDays} jours commence maintenant.",
            'api_key'   => $tenant->api_key,
            'tenant'    => ['name' => $tenant->name, 'slug' => $tenant->slug],
        ], 201);
    }
}
