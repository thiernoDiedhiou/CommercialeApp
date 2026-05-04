<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name'      => $this->faker->name(),
            'email'     => $this->faker->unique()->safeEmail(),
            'password'  => 'password',  // cast 'hashed' auto-hashes on save
            'is_active' => true,
        ];
        // tenant_id fourni explicitement à la création : ->create(['tenant_id' => $tenant->id])
    }
}
