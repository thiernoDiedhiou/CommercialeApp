<?php

namespace App\Services;

use App\Models\Branch;
use RuntimeException;

/**
 * Singleton de contexte succursale — même pattern que TenantService.
 * Injecté par le middleware ResolveBranch sur chaque requête qui envoie X-Branch-ID.
 * Sans injection, hasCurrentBranch() retourne false (safe pour Artisan/seeds).
 */
class BranchService
{
    private ?Branch $currentBranch = null;

    public function setCurrentBranch(Branch $branch): void
    {
        $this->currentBranch = $branch;
    }

    public function current(): Branch
    {
        if (! $this->currentBranch) {
            throw new RuntimeException('Aucune succursale résolue pour cette requête.');
        }

        return $this->currentBranch;
    }

    public function currentId(): ?int
    {
        return $this->currentBranch?->id;
    }

    public function hasCurrentBranch(): bool
    {
        return $this->currentBranch !== null;
    }

    public function reset(): void
    {
        $this->currentBranch = null;
    }
}
