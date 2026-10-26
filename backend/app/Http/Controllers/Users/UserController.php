<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\SyncGroupsRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Jobs\SendUserWelcomeJob;
use App\Models\Branch;
use App\Models\User;
use App\Services\PermissionService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(
        private readonly PermissionService $permissionService,
        private readonly TenantService $tenantService,
    ) {}

    public function index(): JsonResponse
    {
        $users = User::with('groups:id,name')
            ->orderBy('name')
            ->paginate(20);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        // Mot de passe généré automatiquement — jamais saisi par l'admin.
        // Retourné une seule fois dans la réponse pour que l'admin puisse le copier/transmettre.
        $plainPassword = Str::password(12, symbols: false);

        $user = User::create(array_merge(
            $request->safe()->except('group_ids'),
            ['password' => $plainPassword],
        ));

        if ($request->filled('group_ids')) {
            $user->groups()->sync($request->group_ids);
        }

        $user->load('groups:id,name');

        $tenant = $this->tenantService->current();
        SendUserWelcomeJob::dispatch($tenant, $user, $plainPassword)
            ->onQueue('notifications');

        return response()->json(array_merge(
            $user->toArray(),
            ['generated_password' => $plainPassword],
        ), 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->safe()->except('password');

        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        $user->update($data);

        return response()->json($user->fresh('groups:id,name'));
    }

    public function destroy(User $user): JsonResponse
    {
        // Empêche la suppression de son propre compte
        if ($user->id === request()->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
                'code' => 'SELF_DELETE_FORBIDDEN',
            ], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(null, 204);
    }

    public function syncGroups(SyncGroupsRequest $request, User $user): JsonResponse
    {
        $user->groups()->sync($request->group_ids);

        // Invalide le cache des permissions de cet utilisateur
        $this->permissionService->flushUser($user);

        return response()->json($user->fresh('groups:id,name'));
    }

    // ─── GET /api/v1/users/{user}/branches ────────────────────────────────────

    public function getBranches(User $user): JsonResponse
    {
        $branches = Branch::whereIn('id', function ($q) use ($user) {
            $q->select('branch_id')
                ->from('user_branches')
                ->where('user_id', $user->id);
        })->get(['id', 'uid', 'name', 'type', 'is_active']);

        return response()->json(['data' => $branches]);
    }

    // ─── POST /api/v1/users/{user}/branches ───────────────────────────────────

    public function syncBranches(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'branch_uids' => ['present', 'array'],
            'branch_uids.*' => ['string', 'exists:branches,uid'],
        ]);

        $branchIds = Branch::whereIn('uid', $validated['branch_uids'])->pluck('id');

        DB::table('user_branches')
            ->where('user_id', $user->id)
            ->delete();

        if ($branchIds->isNotEmpty()) {
            $rows = $branchIds->map(fn ($id) => ['user_id' => $user->id, 'branch_id' => $id])->all();
            DB::table('user_branches')->insert($rows);
        }

        return response()->json(['data' => $branchIds->values()]);
    }
}
