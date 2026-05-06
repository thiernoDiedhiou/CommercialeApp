<?php

namespace Database\Seeders;

use App\Models\SuperAdmin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        SuperAdmin::firstOrCreate(
            ['email' => 'superadmin@saas.sn'],
            [
                'name'      => 'Super Admin',
                'password'  => Hash::make('superadmin123'),
                'is_active' => true,
            ]
        );

        $this->command->info('Super Admin créé : superadmin@saas.sn / superadmin123');
        $this->command->warn('⚠  Changez ce mot de passe en production !');
    }
}
