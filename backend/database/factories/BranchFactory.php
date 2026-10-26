<?php

namespace Database\Factories;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;

class BranchFactory extends Factory
{
    protected $model = Branch::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->city().' '.ucfirst($this->faker->word()),
            'type' => 'sync',
            'address' => $this->faker->optional(0.5)->address(),
            'phone' => $this->faker->optional(0.5)->phoneNumber(),
            'is_active' => true,
            'display_order' => 0,
        ];
    }

    public function warehouse(): static
    {
        return $this->state(['type' => 'warehouse']);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
