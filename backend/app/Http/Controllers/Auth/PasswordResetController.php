<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    public function send(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $tenant = $this->tenantService->current();
        $user   = User::where('email', $request->email)->first();

        // Toujours 200 — ne jamais révéler si l'email existe
        if ($user) {
            $plain = Str::random(64);

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

            // Utilise le slug (public) plutôt que l'api_key dans l'URL
            $resetUrl = rtrim(config('saas.frontend_url'), '/')
                . '/reinitialisation'
                . '?token='  . urlencode($plain)
                . '&email='  . urlencode($request->email)
                . '&tenant=' . urlencode($tenant->slug);

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

        $tenant = $this->tenantService->current();

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->where('tenant_id', $tenant->id)
            ->first();

        if (! $record || ! hash_equals($record->token, hash('sha256', $validated['token']))) {
            return response()->json([
                'message' => 'Lien de réinitialisation invalide ou expiré.',
            ], 422);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')
                ->where('email', $validated['email'])
                ->where('tenant_id', $tenant->id)
                ->delete();

            return response()->json([
                'message' => 'Lien expiré (valide 60 min). Demandez-en un nouveau.',
            ], 422);
        }

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 422);
        }

        $user->update(['password' => Hash::make($validated['password'])]);
        $user->tokens()->delete();

        DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->where('tenant_id', $tenant->id)
            ->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.',
        ]);
    }
}
