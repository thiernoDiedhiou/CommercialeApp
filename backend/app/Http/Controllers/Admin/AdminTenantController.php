<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Group;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminTenantController extends Controller
{
    private const SECTORS    = ['general', 'food', 'fashion', 'cosmetic'];
    private const CURRENCIES = ['XOF', 'XAF', 'GNF', 'EUR', 'USD', 'GBP', 'MAD', 'MRU'];

    public function __construct(private readonly TenantService $tenantService) {}

    public function index(Request $request): JsonResponse
    {
        $tenants = Tenant::withTrashed()
            ->withCount('users')
            ->when($request->search, fn ($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
            )
            ->when($request->filled('is_active'), fn ($q) =>
                $q->where('is_active', $request->boolean('is_active'))
            )
            ->orderByDesc('created_at')
            ->paginate(20);

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
            'primary_color'   => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            // Premier utilisateur admin du tenant

            'admin_name'    => ['required', 'string', 'max:150'],
            'admin_email'   => ['required', 'email', 'max:150'],
            'admin_password'=> ['required', 'string', 'min:8'],
        ]);

        $tenant = DB::transaction(function () use ($validated) {
            $tenant = Tenant::create([
                'name'          => $validated['name'],
                'sector'        => $validated['sector'],
                'currency'      => $validated['currency'],
                'phone'         => $validated['phone'] ?? null,
                'email'         => $validated['email'] ?? null,
                'address'       => $validated['address'] ?? null,
                'city'          => $validated['city'] ?? null,
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

            return $tenant;
        });

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
            'sector'        => ['sometimes', Rule::in(self::SECTORS)],
            'currency'      => ['sometimes', Rule::in(self::CURRENCIES)],
            'phone'         => ['nullable', 'string', 'max:30'],
            'email'         => ['nullable', 'email', 'max:150'],
            'address'       => ['nullable', 'string', 'max:255'],
            'city'          => ['nullable', 'string', 'max:100'],
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
            'created_at'      => $tenant->created_at?->format('d/m/Y'),
        ];
    }
}
