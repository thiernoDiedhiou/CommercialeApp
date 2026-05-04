<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'name'      => $this->faker->name(),
            'phone'     => '+221' . $this->faker->numerify('7########'),
            'email'     => $this->faker->optional(0.6)->safeEmail(),
            'address'   => $this->faker->optional(0.4)->address(),
            'is_active' => true,
        ];
    }
}
