<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/permissions.json');
        $json = file_get_contents($path);
        $data = $json !== false ? json_decode($json, true) : null;

        if (! is_array($data)) {
            $this->command->error("Fichier introuvable ou JSON invalide : {$path}");
            return;
        }

        // Nettoyage des permissions renommées (détacher des groupes avant suppression)
        $obsolete = Permission::whereIn('name', ['customers.debts'])->get();
        foreach ($obsolete as $p) {
            $p->groups()->detach();
            $p->delete();
        }

        $count = 0;
        foreach ($data as $module) {
            foreach ($module['permissions'] as $perm) {
                Permission::firstOrCreate(
                    ['name' => $perm['name']],
                    [
                        'display_name' => $perm['display_name'],
                        'module'       => $module['module'],
                        'action'       => $perm['action'],
                    ]
                );
                $count++;
            }
        }

        $this->command->info("✓ {$count} permissions vérifiées/créées.");
    }
}
