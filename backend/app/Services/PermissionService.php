<?php

namespace App\Services;

use App\Models\Group;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PermissionService
{
    private const TTL_MINUTES = 30;

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Retourne la liste des permissions d'un utilisateur.
     * Lecture depuis Redis si disponible, sinon depuis la DB.
     * Résultat mis en cache pendant 30 minutes.
     */
    public function getPermissions(User $user): array
    {
        return Cache::remember(
            $this->userCacheKey($user),
            now()->addMinutes(self::TTL_MINUTES),
            fn() => $this->loadFromDatabase($user),
        );
    }

    /**
     * Vérifie si un utilisateur possède une permission donnée.
     */
    public function hasPermission(User $user, string $permission): bool
    {
        return in_array($permission, $this->getPermissions($user), true);
    }

    /**
     * Invalide le cache d'un utilisateur.
     * Appeler après changement de groupe d'un utilisateur.
     */
    public function flushUser(User $user): void
    {
        Cache::forget($this->userCacheKey($user));
    }

    /**
     * Invalide le cache de tous les utilisateurs d'un groupe.
     * Appeler après modification des permissions d'un groupe.
     */
    public function flushGroup(Group $group): void
    {
        // Charge uniquement les IDs pour limiter la mémoire
        $group->users()->select('users.id')->each(function (User $user) {
            $this->flushUser($user);
        });
    }

    // ─── Privé ────────────────────────────────────────────────────────────────

    private function loadFromDatabase(User $user): array
    {
        return $user->groups()
            ->with('permissions:id,name')
            ->get()
            ->flatMap(fn(Group $group) => $group->permissions->pluck('name'))
            ->unique()
            ->sort()
            ->values()
            ->toArray();
    }

    private function userCacheKey(User $user): string
    {
        return "permissions:user:{$user->id}";
    }
}
