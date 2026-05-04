<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Groups\StoreGroupRequest;
use App\Http\Requests\Groups\SyncPermissionsRequest;
use App\Http\Requests\Groups\UpdateGroupRequest;
use App\Models\Group;
use App\Models\Permission;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;

class GroupController extends Controller
{
    public function __construct(private readonly PermissionService $permissionService) {}

    public function index(): JsonResponse
    {
        $groups = Group::with('permissions:id,name,display_name,module')
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function store(StoreGroupRequest $request): JsonResponse
    {
        $group = Group::create($request->safe()->except('permission_ids'));

        if ($request->filled('permission_ids')) {
            $group->permissions()->sync($request->permission_ids);
        }

        $group->load('permissions:id,name,display_name,module');

        return response()->json($group, 201);
    }

    public function update(UpdateGroupRequest $request, Group $group): JsonResponse
    {
        $group->update($request->validated());

        return response()->json($group->fresh('permissions:id,name,display_name,module'));
    }

    public function destroy(Group $group): JsonResponse
    {
        // Invalide le cache pour tous les membres avant la suppression
        $this->permissionService->flushGroup($group);

        $group->delete();

        return response()->json(null, 204);
    }

    public function syncPermissions(SyncPermissionsRequest $request, Group $group): JsonResponse
    {
        $group->permissions()->sync($request->permission_ids);

        // Invalide le cache de permissions pour tous les utilisateurs du groupe
        $this->permissionService->flushGroup($group);

        $group->load('permissions:id,name,display_name,module');

        return response()->json($group);
    }

    public function availablePermissions(): JsonResponse
    {
        $permissions = Permission::orderBy('module')->orderBy('action')->get();

        // Regroupées par module pour l'affichage UI
        $grouped = $permissions->groupBy('module')->map(fn($perms) => $perms->values());

        return response()->json(['data' => $grouped]);
    }
}
