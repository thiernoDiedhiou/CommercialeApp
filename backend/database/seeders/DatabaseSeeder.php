<?php

namespace Database\Seeders;

use App\Models\Group;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Permissions globales (toujours en premier)
        $this->call(PermissionSeeder::class);

        // 2. Tenant de démonstration
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'demo'],
            [
                'name'     => 'Commerce Démo',
                'api_key'  => 'demo-api-key-change-in-production-64chars00000000000000000000000',
                'sector'   => 'general',
                'currency' => 'XOF',
                'locale'   => 'fr',
                'email'    => 'demo@exemple.sn',
                'city'     => 'Dakar',
            ]
        );

        // 3. Groupes par défaut pour le tenant démo
        DefaultGroupSeeder::createForTenant($tenant);

        // 4. Utilisateur administrateur démo
        $adminGroup = Group::where('tenant_id', $tenant->id)->where('name', 'Administrateur')->first();

        $admin = User::firstOrCreate(
            ['tenant_id' => $tenant->id, 'email' => 'admin@demo.sn'],
            [
                'name'     => 'Admin Démo',
                'password' => Hash::make('password'),
                'is_active'=> true,
            ]
        );

        if ($adminGroup && ! $admin->groups()->where('group_id', $adminGroup->id)->exists()) {
            $admin->groups()->attach($adminGroup->id);
        }

        $this->command->info("✓ Tenant démo prêt — X-Tenant-ID: {$tenant->api_key}");
        $this->command->info('✓ Admin : admin@demo.sn / password');
    }
}
