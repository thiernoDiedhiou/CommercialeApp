<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = $this->faker->company();

        return [
            'name'      => $name,
            'slug'      => Str::slug($name) . '-' . Str::random(4),
            'email'     => $this->faker->unique()->safeEmail(),
            'phone'     => '+221' . $this->faker->numerify('7########'),
            'sector'    => 'retail',
            'currency'  => 'XOF',
            'locale'    => 'fr',
            'timezone'  => 'Africa/Dakar',
            'is_active' => true,
        ];
        // api_key auto-généré par Tenant::boot() si absent
    }
}
