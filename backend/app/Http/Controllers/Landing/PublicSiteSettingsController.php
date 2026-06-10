<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;
use Illuminate\Http\JsonResponse;

class PublicSiteSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => SiteSettings::instance()]);
    }
}
