<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Customer;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use App\Models\Group;
use App\Services\MailService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminTenantController extends Controller
{
    private const SECTORS    = ['general', 'food', 'fashion', 'cosmetic', 'pharmacy', 'electronics', 'services'];
    private const CURRENCIES = ['XOF', 'XAF', 'GNF', 'EUR', 'USD', 'GBP', 'MAD', 'MRU'];

    public function __construct(
        private readonly TenantService $tenantService,
        private readonly MailService $mailService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenants = Tenant::withCount('users')
            ->with(['activeSubscription.plan:id,name,slug'])
            ->when($request->search, fn ($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
            )
            ->when($request->filled('is_active'), fn ($q) =>
                $q->where('is_active', $request->boolean('is_active'))
            )
            ->when($request->filled('plan_id'), fn ($q) =>
                $q->whereHas('activeSubscription', fn ($s) =>
                    $s->where('plan_id', $request->integer('plan_id'))
                )
            )
            ->orderByDesc('created_at')
            ->paginate(20);

        // Enrichit chaque tenant avec les infos d'abonnement actif
        $tenants->through(function (Tenant $tenant) {
            $sub = $tenant->activeSubscription;
            $data = $this->formatTenant($tenant);
            $data['subscription'] = $sub ? [
                'status'        => $sub->status,
                'plan_name'     => $sub->plan?->name,
                'plan_slug'     => $sub->plan?->slug,
                'billing_cycle' => $sub->billing_cycle,
                'ends_at'       => $sub->ends_at?->toISOString(),
                'days_remaining'=> $sub->daysUntilExpiry(),
            ] : null;
            return $data;
        });

        return response()->json($tenants);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:150'],
            'sector'        => ['required', Rule::in(self::SECTORS)],
            'currency'      => ['required', Rule::in(self::CURRENCIES)],
            'phone'         => ['nullable', 'string', 'max:30'],
            'email'         => ['nullable', 'email', 'max:150'],
            'address'       => ['nullable', 'string', 'max:255'],
            'city'          => ['nullable', 'string', 'max:100'],
            'custom_domain'   => ['nullable', 'string', 'max:253', Rule::unique('tenants', 'custom_domain')],
            'primary_color'   => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            // Premier utilisateur admin du tenant

            'admin_name'    => ['required', 'string', 'max:150'],
            'admin_email'   => ['required', 'email', 'max:150'],
            'admin_password'=> ['required', 'string', 'min:8'],
        ]);

        [$tenant, $admin] = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'name'          => $validated['name'],
                'sector'        => $validated['sector'],
                'currency'      => $validated['currency'],
                'phone'         => $validated['phone'] ?? null,
                'email'         => $validated['email'] ?? null,
                'address'       => $validated['address'] ?? null,
                'city'          => $validated['city'] ?? null,
                'custom_domain'   => $validated['custom_domain'] ?? null,
                'primary_color'   => $validated['primary_color'] ?? null,
                'secondary_color' => $validated['secondary_color'] ?? null,
                'is_active'       => true,
            ]);

            // Initialise le contexte tenant pour TenantObserver (groupes par défaut)
            $this->tenantService->setCurrentTenant($tenant);

            // Crée l'utilisateur administrateur
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name'      => $validated['admin_name'],
                'email'     => $validated['admin_email'],
                'password'  => Hash::make($validated['admin_password']),
                'is_active' => true,
            ]);

            // Assigne le groupe Administrateur
            $adminGroup = Group::where('tenant_id', $tenant->id)
                ->where('name', 'Administrateur')
                ->first();

            if ($adminGroup) {
                $user->groups()->attach($adminGroup->id);
            }

            return [$tenant, $user];
        });

        // Essai gratuit automatique — plan Business pendant trial_days jours
        $businessPlan = Plan::where('slug', 'business')->where('is_active', true)->first();
        if ($businessPlan) {
            TenantSubscription::create([
                'tenant_id'     => $tenant->id,
                'plan_id'       => $businessPlan->id,
                'billing_cycle' => 'trial',
                'status'        => 'trial',
                'starts_at'     => now(),
                'ends_at'       => now()->addDays($businessPlan->trial_days),
            ]);
        }

        // Email de bienvenue avec le mot de passe en clair (disponible uniquement ici)
        $this->mailService->sendTenantWelcome($tenant, $admin, $validated['admin_password']);

        return response()->json(['data' => $this->formatTenant($tenant)], 201);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        $tenant->loadCount('users');
        $users = $tenant->users()->select('id', 'name', 'email', 'is_active', 'created_at')->get();

        return response()->json([
            'data'  => $this->formatTenant($tenant),
            'users' => $users,
        ]);
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name'          => ['sometimes', 'string', 'max:150'],
            'slug'          => ['sometimes', 'string', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('tenants', 'slug')->ignore($tenant->id)],
            'sector'        => ['sometimes', Rule::in(self::SECTORS)],
            'currency'      => ['sometimes', Rule::in(self::CURRENCIES)],
            'phone'         => ['nullable', 'string', 'max:30'],
            'email'         => ['nullable', 'email', 'max:150'],
            'address'       => ['nullable', 'string', 'max:255'],
            'city'          => ['nullable', 'string', 'max:100'],
            'custom_domain'   => ['nullable', 'string', 'max:253', Rule::unique('tenants', 'custom_domain')->ignore($tenant->id)],
            'primary_color'   => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $tenant->update($validated);
        $this->tenantService->flushCache($tenant->api_key);

        return response()->json(['data' => $this->formatTenant($tenant)]);
    }

    public function suspend(Tenant $tenant): JsonResponse
    {
        $tenant->update(['is_active' => false]);
        $this->tenantService->flushCache($tenant->api_key);

        return response()->json(['data' => $this->formatTenant($tenant)]);
    }

    public function activate(Tenant $tenant): JsonResponse
    {
        $tenant->update(['is_active' => true]);
        $this->tenantService->flushCache($tenant->api_key);

        return response()->json(['data' => $this->formatTenant($tenant)]);
    }

    // ── GET /api/v1/admin/tenants/{tenant}/stats ──────────────────────────────

    public function stats(Tenant $tenant): JsonResponse
    {
        $tid = $tenant->id;

        $productsCount  = Product::withTrashed()->where('tenant_id', $tid)->count();
        $salesCount     = Sale::where('tenant_id', $tid)->count();
        $customersCount = Customer::where('tenant_id', $tid)->count();
        $usersCount     = User::where('tenant_id', $tid)->count();

        $salesRevenue = Sale::where('tenant_id', $tid)
            ->where('status', 'confirmed')
            ->sum('total');

        // first() retourne un modèle avec cast Carbon — value() retourne un string brut
        $lastSale = Sale::where('tenant_id', $tid)->latest()->first(['created_at']);

        return response()->json([
            'data' => [
                'products_count'  => $productsCount,
                'sales_count'     => $salesCount,
                'customers_count' => $customersCount,
                'users_count'     => $usersCount,
                'sales_revenue'   => (float) $salesRevenue,
                'last_sale_at'    => $lastSale?->created_at?->toISOString(),
            ],
        ]);
    }

    public function destroy(Tenant $tenant): JsonResponse
    {
        $this->tenantService->flushCache($tenant->api_key);

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
        }

        $tenant->delete();

        return response()->json(null, 204);
    }

    private function formatTenant(Tenant $tenant): array
    {
        return [
            'id'              => $tenant->id,
            'name'            => $tenant->name,
            'slug'            => $tenant->slug,
            'custom_domain'   => $tenant->custom_domain,
            'api_key'         => $tenant->api_key, // exposé au Super Admin uniquement
            'sector'          => $tenant->sector,
            'currency'        => $tenant->currency,
            'phone'           => $tenant->phone,
            'email'           => $tenant->email,
            'address'         => $tenant->address,
            'city'            => $tenant->city,
            'primary_color'   => $tenant->primary_color,
            'secondary_color' => $tenant->secondary_color,
            'logo_url'        => $tenant->logo_path
                ? Storage::disk('public')->url($tenant->logo_path)
                : null,
            'is_active'       => $tenant->is_active,
            'users_count'     => $tenant->users_count ?? 0,
            'created_at'      => $tenant->created_at?->toISOString(),
        ];
    }
}
