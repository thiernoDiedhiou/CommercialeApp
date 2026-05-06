<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = SuperAdmin::where('email', $request->email)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            return response()->json([
                'message' => 'Email ou mot de passe incorrect.',
                'code'    => 'INVALID_CREDENTIALS',
            ], 401);
        }

        if (! $admin->is_active) {
            return response()->json([
                'message' => 'Ce compte est désactivé.',
                'code'    => 'ACCOUNT_DISABLED',
            ], 403);
        }

        $admin->update(['last_login_at' => now()]);

        // Révoquer les anciens tokens pour cet admin
        $admin->tokens()->delete();
        $token = $admin->createToken('super-admin')->plainTextToken;

        return response()->json([
            'token' => $token,
            'data'  => [
                'id'    => $admin->id,
                'name'  => $admin->name,
                'email' => $admin->email,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $superAdmin = $request->attributes->get('super_admin');
        if ($superAdmin) {
            $superAdmin->tokens()->delete();
        }

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        $superAdmin = $request->attributes->get('super_admin');

        return response()->json([
            'data' => [
                'id'    => $superAdmin->id,
                'name'  => $superAdmin->name,
                'email' => $superAdmin->email,
            ],
        ]);
    }
}
