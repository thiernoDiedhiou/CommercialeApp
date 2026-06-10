<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{

    public function send(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // Lookup global — email unique sur toute la plateforme, pas de X-Tenant-ID requis
        $user = User::withoutGlobalScopes()
            ->where('email', $request->email)
            ->where('is_active', true)
            ->with('tenant')
            ->first();

        // Toujours 200 — ne jamais révéler si l'email existe
        if ($user && $user->tenant) {
            $tenant = $user->tenant;
            $plain  = Str::random(64);

            DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->where('tenant_id', $tenant->id)
                ->delete();

            DB::table('password_reset_tokens')->insert([
                'email'      => $request->email,
                'tenant_id'  => $tenant->id,
                'token'      => hash('sha256', $plain),
                'created_at' => now(),
            ]);

            $resetUrl = rtrim(config('saas.frontend_url'), '/')
                . '/reinitialisation'
                . '?token=' . urlencode($plain)
                . '&email=' . urlencode($request->email);

            try {
                Mail::to($user->email, $user->name)->send(
                    new PasswordResetMail($user, $tenant, $resetUrl)
                );
            } catch (\Throwable) {
                // L'email échoue silencieusement — la réponse reste 200
            }
        }

        return response()->json([
            'message' => 'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'                 => ['required', 'email'],
            'token'                 => ['required', 'string'],
            'password'              => ['required', 'string', 'min:8'],
            'password_confirmation' => ['required', 'same:password'],
        ]);

        // Lookup global — trouver l'user et son tenant depuis l'email seul
        $user = User::withoutGlobalScopes()
            ->where('email', $validated['email'])
            ->with('tenant')
            ->first();

        if (! $user || ! $user->tenant?->is_active) {
            return response()->json(['message' => 'Lien de réinitialisation invalide ou expiré.'], 422);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (! $record || ! hash_equals($record->token, hash('sha256', $validated['token']))) {
            return response()->json([
                'message' => 'Lien de réinitialisation invalide ou expiré.',
            ], 422);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')
                ->where('email', $validated['email'])
                ->where('tenant_id', $user->tenant_id)
                ->delete();

            return response()->json([
                'message' => 'Lien expiré (valide 60 min). Demandez-en un nouveau.',
            ], 422);
        }

        $user->update(['password' => Hash::make($validated['password'])]);
        $user->tokens()->delete();

        DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->where('tenant_id', $user->tenant_id)
            ->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
