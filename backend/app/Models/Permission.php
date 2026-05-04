<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

// Permission est globale — pas de tenant_id, pas de BelongsToTenant.
// Les groupes (tenant-scoped) y sont liés via group_permissions.
class Permission extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'module',
        'action',
    ];

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'group_permissions');
    }
}
