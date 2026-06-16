<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Plan;
use App\Models\SuperAdmin;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Notifications\NewTenantRegisteredNotification;
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
        $validated = $request->validate(
            [
                'company_name'   => ['required', 'string', 'max:150'],
                'sector'         => ['required', Rule::in(['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services', 'ecommerce'])],
                'currency'       => ['nullable', Rule::in(['XOF', 'XAF', 'GNF', 'EUR', 'USD'])],
                'phone'          => ['required', 'string', 'min:8', 'max:30'],
                'admin_name'     => ['required', 'string', 'max:150'],
                'admin_email'    => ['required', 'email', 'max:150', Rule::unique('users', 'email')],
                'admin_password' => ['required', 'string', 'min:8'],
            ],
            [
                'phone.required'         => 'Le numéro de téléphone est obligatoire.',
                'phone.min'             => 'Veuillez saisir un numéro complet (indicatif + numéro local).',
                'company_name.required'   => 'Le nom de votre boutique est obligatoire.',
                'company_name.max'        => 'Le nom de la boutique ne peut pas dépasser 150 caractères.',
                'sector.required'         => 'Veuillez sélectionner un secteur d\'activité.',
                'sector.in'              => 'Le secteur sélectionné est invalide.',
                'admin_name.required'    => 'Votre nom complet est obligatoire.',
                'admin_email.required'   => 'L\'adresse email est obligatoire.',
                'admin_email.email'      => 'L\'adresse email est invalide.',
                'admin_email.unique'     => 'Cette adresse email est déjà associée à un compte. Utilisez une autre adresse ou connectez-vous.',
                'admin_password.required' => 'Le mot de passe est obligatoire.',
                'admin_password.min'     => 'Le mot de passe doit contenir au moins 8 caractères.',
            ]
        );

        [$tenant, $admin] = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'name'      => $validated['company_name'],
                'sector'    => $validated['sector'],
                'currency'  => $validated['currency'] ?? 'XOF',
                'phone'     => $validated['phone'] ?? null,
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

        // Notifie tous les Super Admins (email + in-app) — source landing page
        SuperAdmin::all()->each(
            fn ($sa) => $sa->notify(new NewTenantRegisteredNotification($tenant, $admin, 'landing'))
        );

        $trialDays = $plan?->trial_days ?? 21;

        return response()->json([
            'message'   => "Compte créé. Votre essai gratuit de {$trialDays} jours commence maintenant.",
            'api_key'   => $tenant->api_key,
            'tenant'    => ['name' => $tenant->name, 'slug' => $tenant->slug],
        ], 201);
    }
}
