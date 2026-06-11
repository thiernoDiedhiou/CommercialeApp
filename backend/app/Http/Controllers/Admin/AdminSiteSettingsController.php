<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSiteSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => SiteSettings::instance()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_email'    => ['nullable', 'email',   'max:150'],
            'contact_whatsapp' => ['nullable', 'string',  'max:50'],
            'contact_address'  => ['nullable', 'string',  'max:200'],
            'contact_hours'    => ['nullable', 'string',  'max:100'],
            'facebook_url'     => ['nullable', 'url',     'max:255'],
            'twitter_url'      => ['nullable', 'url',     'max:255'],
            'linkedin_url'     => ['nullable', 'url',     'max:255'],
            'instagram_url'    => ['nullable', 'url',     'max:255'],
            'tenant_deletion_grace_days' => ['nullable', 'integer', 'min:7', 'max:365'],
        ]);

        $settings = SiteSettings::instance();
        $settings->update($validated);

        return response()->json(['data' => $settings]);
    }
}
