<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Services\BranchService;
use App\Services\TenantService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Résout la succursale active depuis le header X-Branch-ID.
 *
 * Chaîne de validation (6 étapes) :
 *   1. Authentification Sanctum (déjà garantie par auth:sanctum en amont)
 *   2. Tenant courant résolu (déjà garanti par ResolveTenant en amont)
 *   3. Lecture X-Branch-ID — si absent, on passe (contexte non obligatoire)
 *   4. Branch appartient au tenant courant et est active
 *   5. Si l'utilisateur a des restrictions de succursale (user_branches), vérifier l'accès
 *   6. Injection dans BranchService
 *
 * Le header X-Branch-ID transporte le contexte mais n'est PAS une autorisation —
 * toutes les vérifications se font côté serveur, jamais en faisant confiance au header seul.
 */
class ResolveBranch
{
    public function __construct(
        private readonly BranchService $branchService,
        private readonly TenantService $tenantService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $branchUid = $request->header('X-Branch-ID');

        // Étape 2 — Pas de tenant résolu (routes auth/* se résolvent elles-mêmes après) : skip.
        if (! $this->tenantService->hasCurrentTenant()) {
            return $next($request);
        }

        // Étape 3 — Header absent : contexte succursale optionnel, on passe.
        if (empty($branchUid)) {
            return $next($request);
        }

        // Étape 4 — La branch doit appartenir au tenant courant et être active.
        // Utilise TenantScope (BelongsToTenant) implicitement + filtre explicite tenant_id
        // pour garantir l'isolation même si le scope était désactivé.
        $branch = Branch::withoutGlobalScopes()
            ->where('uid', $branchUid)
            ->where('tenant_id', $this->tenantService->currentId())
            ->whereNull('deleted_at')
            ->first();

        if (! $branch) {
            return response()->json([
                'message' => 'Succursale introuvable.',
                'code' => 'BRANCH_NOT_FOUND',
            ], 404);
        }

        if (! $branch->is_active) {
            return response()->json([
                'message' => 'Cette succursale est désactivée.',
                'code' => 'BRANCH_INACTIVE',
            ], 403);
        }

        // Étape 5 — Restrictions utilisateur : si user_branches existe pour cet utilisateur,
        // il est limité aux succursales explicitement attribuées.
        $user = $request->user();
        if ($user) {
            $hasRestrictions = DB::table('user_branches')
                ->where('user_id', $user->id)
                ->exists();

            if ($hasRestrictions) {
                $hasAccess = DB::table('user_branches')
                    ->where('user_id', $user->id)
                    ->where('branch_id', $branch->id)
                    ->exists();

                if (! $hasAccess) {
                    return response()->json([
                        'message' => 'Accès à cette succursale refusé.',
                        'code' => 'BRANCH_ACCESS_DENIED',
                    ], 403);
                }
            }
        }

        // Étape 6 — Injection dans le service de contexte.
        $this->branchService->setCurrentBranch($branch);
        $request->attributes->set('branch', $branch);

        return $next($request);
    }
}
