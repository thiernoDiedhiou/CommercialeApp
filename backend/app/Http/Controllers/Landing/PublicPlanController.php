<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PublicPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::where('is_active', true)
            ->where('is_public', true)
            ->orderBy('sort_order')
            ->orderBy('price_monthly')
            ->get([
                'id', 'name', 'slug', 'tagline', 'badge', 'description', 'features',
                'price_monthly', 'price_yearly', 'yearly_discount_pct', 'trial_days',
                'max_users', 'max_products', 'max_monthly_sales',
                'feature_pos', 'feature_invoicing', 'feature_purchases',
                'feature_reports', 'feature_shop', 'feature_import_csv',
                'feature_stock_alerts', 'feature_multi_user', 'feature_custom_domain',
            ]);

        return response()->json(['data' => $plans]);
    }
}
