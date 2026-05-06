<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminStatsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'tenants_total'    => Tenant::withTrashed()->count(),
                'tenants_active'   => Tenant::where('is_active', true)->count(),
                'tenants_inactive' => Tenant::where('is_active', false)->count(),
                'users_total'      => User::count(),
                'tenants_recent'   => Tenant::latest()->limit(5)->get(['id', 'name', 'sector', 'is_active', 'created_at']),
            ],
        ]);
    }
}
