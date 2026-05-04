<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = ucwords($this->faker->words(2, true));

        return [
            'name'            => $name,
            'slug'            => Str::slug($name) . '-' . Str::random(4),
            'price'           => $this->faker->randomFloat(2, 500, 50000),
            'cost_price'      => $this->faker->randomFloat(2, 200, 30000),
            'stock_quantity'  => $this->faker->numberBetween(10, 100),
            'has_variants'    => false,
            'is_weight_based' => false,
            'has_expiry'      => false,
            'is_active'       => true,
        ];
        // tenant_id fourni explicitement ou via le creating hook (BelongsToTenant)
    }

    public function withVariants(): static
    {
        return $this->state(['has_variants' => true, 'stock_quantity' => 0]);
    }

    public function outOfStock(): static
    {
        return $this->state(['stock_quantity' => 0]);
    }
}
