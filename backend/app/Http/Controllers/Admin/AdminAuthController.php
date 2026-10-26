<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = SuperAdmin::where('email', $request->email)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            return response()->json([
                'message' => 'Email ou mot de passe incorrect.',
                'code' => 'INVALID_CREDENTIALS',
            ], 401);
        }

        if (! $admin->is_active) {
            return response()->json([
                'message' => 'Ce compte est désactivé.',
                'code' => 'ACCOUNT_DISABLED',
            ], 403);
        }

        $admin->update(['last_login_at' => now()]);

        // Révoquer les anciens tokens pour cet admin
        $admin->tokens()->delete();
        $token = $admin->createToken('super-admin')->plainTextToken;

        return response()->json([
            'token' => $token,
            'data' => [
                'id' => $admin->id,
                'name' => $admin->name,
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
            'data' => $this->formatAdmin($superAdmin),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $superAdmin = $request->attributes->get('super_admin');

        if ($superAdmin->avatar_path) {
            Storage::disk('public')->delete($superAdmin->avatar_path);
        }

        $path = $request->file('avatar')->store('admin-avatars', 'public');
        $superAdmin->update(['avatar_path' => $path]);

        return response()->json([
            'avatar' => Storage::disk('public')->url($path),
        ]);
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $superAdmin = $request->attributes->get('super_admin');

        if ($superAdmin->avatar_path) {
            Storage::disk('public')->delete($superAdmin->avatar_path);
            $superAdmin->update(['avatar_path' => null]);
        }

        return response()->json(['message' => 'Avatar supprimé.']);
    }

    private function formatAdmin(SuperAdmin $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'avatar' => $admin->avatar_path
                ? Storage::disk('public')->url($admin->avatar_path)
                : null,
        ];
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $superAdmin = $request->attributes->get('super_admin');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! empty($validated['password'])) {
            if (empty($validated['current_password']) || ! Hash::check($validated['current_password'], $superAdmin->password)) {
                return response()->json([
                    'message' => 'Le mot de passe actuel est incorrect.',
                    'errors' => ['current_password' => ['Le mot de passe actuel est incorrect.']],
                ], 422);
            }
            $superAdmin->password = Hash::make($validated['password']);
        }

        $superAdmin->name = $validated['name'];
        $superAdmin->save();

        return response()->json([
            'data' => $this->formatAdmin($superAdmin),
        ]);
    }
}
