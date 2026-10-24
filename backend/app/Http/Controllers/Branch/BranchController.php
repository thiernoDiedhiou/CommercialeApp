<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    public function index(): JsonResponse
    {
        $branches = Branch::orderBy('display_order')->orderBy('name')->get();

        return response()->json(['data' => BranchResource::collection($branches)]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant    = $this->tenantService->current();
        $tenantId  = $tenant->id;

        // Vérification de la limite plan
        $maxBranches = $tenant->activeSubscription?->plan?->max_branches ?? 1;

        if ($maxBranches > 0 && Branch::count() >= $maxBranches) {
            return response()->json([
                'message' => "Votre plan ne permet pas plus de {$maxBranches} succursale(s).",
                'code'    => 'BRANCH_LIMIT_REACHED',
            ], 422);
        }

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:120',
                Rule::unique('branches')->where('tenant_id', $tenantId),
            ],
            'type'          => ['required', Rule::in(['principal', 'sync', 'warehouse'])],
            'address'       => ['nullable', 'string', 'max:500'],
            'phone'         => ['nullable', 'string', 'max:30'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        // Un seul Principal autorisé par tenant
        if ($validated['type'] === 'principal' && Branch::where('type', 'principal')->exists()) {
            return response()->json([
                'message' => 'Une succursale principale existe déjà pour ce tenant.',
                'code'    => 'PRINCIPAL_ALREADY_EXISTS',
            ], 422);
        }

        $branch = Branch::create($validated);

        return response()->json(['data' => new BranchResource($branch)], 201);
    }

    public function show(Branch $branch): JsonResponse
    {
        return response()->json(['data' => new BranchResource($branch)]);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        $validated = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:120',
                Rule::unique('branches')->where('tenant_id', $tenantId)->ignore($branch->id),
            ],
            'type'          => ['sometimes', Rule::in(['principal', 'sync', 'warehouse'])],
            'address'       => ['nullable', 'string', 'max:500'],
            'phone'         => ['nullable', 'string', 'max:30'],
            'is_active'     => ['sometimes', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        // Le type de la succursale principale est immuable
        if ($branch->isPrincipal() && isset($validated['type']) && $validated['type'] !== 'principal') {
            return response()->json([
                'message' => 'Le type de la succursale principale ne peut pas être modifié.',
                'code'    => 'PRINCIPAL_TYPE_IMMUTABLE',
            ], 422);
        }

        // La succursale principale ne peut pas être désactivée
        if ($branch->isPrincipal() && isset($validated['is_active']) && ! $validated['is_active']) {
            return response()->json([
                'message' => 'La succursale principale ne peut pas être désactivée.',
                'code'    => 'PRINCIPAL_UNDELETABLE',
            ], 422);
        }

        $branch->update($validated);

        return response()->json(['data' => new BranchResource($branch->fresh())]);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        if ($branch->isPrincipal()) {
            return response()->json([
                'message' => 'La succursale principale ne peut pas être supprimée.',
                'code'    => 'PRINCIPAL_UNDELETABLE',
            ], 422);
        }

        $hasSales = DB::table('sales')
            ->where('branch_id', $branch->id)
            ->exists();

        if ($hasSales) {
            return response()->json([
                'message' => 'Cette succursale a des ventes associées et ne peut pas être supprimée.',
                'code'    => 'BRANCH_HAS_SALES',
            ], 422);
        }

        $branch->delete();

        return response()->json(null, 204);
    }
}
