<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\SyncGroupsRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(private readonly PermissionService $permissionService) {}

    public function index(): JsonResponse
    {
        $users = User::with('groups:id,name')
            ->orderBy('name')
            ->paginate(20);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->safe()->except('group_ids'));

        if ($request->filled('group_ids')) {
            $user->groups()->sync($request->group_ids);
        }

        $user->load('groups:id,name');

        return response()->json($user, 201);
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
                'code'    => 'SELF_DELETE_FORBIDDEN',
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
}
