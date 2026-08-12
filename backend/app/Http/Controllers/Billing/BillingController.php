<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Services\PaymentService;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly TenantService  $tenantService,
    ) {}

    /**
     * Initie un renouvellement d'abonnement.
     *
     * POST /api/v1/billing/initiate
     * Body : { plan_uid: string, billing_cycle: 'monthly'|'yearly' }
     *
     * Retourne l'URL de checkout vers laquelle le frontend redirige le tenant.
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_uid'      => ['required', 'string'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ]);

        $plan = Plan::where('uid', $validated['plan_uid'])
            ->where('is_active', true)
            ->where('is_public', true)
            ->firstOrFail();

        $tenant = $this->tenantService->current();

        // Vérifier que le plan yearly est disponible
        if ($validated['billing_cycle'] === 'yearly' && ! $plan->price_yearly) {
            return response()->json([
                'message' => 'Ce plan ne propose pas de facturation annuelle.',
                'code'    => 'YEARLY_NOT_AVAILABLE',
            ], 422);
        }

        $checkoutUrl = $this->paymentService->initiateRenewal(
            $tenant,
            $plan,
            $validated['billing_cycle'],
        );

        return response()->json([
            'data' => ['checkout_url' => $checkoutUrl],
        ]);
    }

    /**
     * Vérification fallback — appelé depuis BillingSuccessPage si le webhook
     * n'est pas encore arrivé. Interroge directement le provider pour confirmer
     * le statut du paiement et activer l'abonnement si nécessaire.
     *
     * GET /api/v1/billing/verify?token={provider_token}
     *
     * Scénario couvert : PayDunya a encaissé mais le webhook est en retard.
     * Sans ce fallback, le tenant aurait payé sans avoir accès.
     */
    public function verify(Request $request): JsonResponse
    {
        $token  = $request->query('token');
        $tenant = $this->tenantService->current();

        if (! $token) {
            return response()->json(['message' => 'Token manquant.'], 422);
        }

        $transaction = PaymentTransaction::where('provider_token', $token)
            ->where('tenant_id', $tenant->id)
            ->first();

        if (! $transaction) {
            return response()->json([
                'message' => 'Transaction introuvable.',
                'code'    => 'TRANSACTION_NOT_FOUND',
            ], 404);
        }

        // Déjà complété — rien à faire
        if ($transaction->isCompleted()) {
            return response()->json([
                'data' => ['status' => 'completed', 'already_active' => true],
            ]);
        }

        // Interroger le provider pour obtenir le statut réel
        $status = $this->paymentService->checkAndComplete($transaction);

        return response()->json([
            'data' => ['status' => $status],
        ]);
    }

    /**
     * Historique des transactions du tenant connecté.
     *
     * GET /api/v1/billing/transactions
     */
    public function transactions(): JsonResponse
    {
        $tenant       = $this->tenantService->current();
        $transactions = $tenant->paymentTransactions()
            ->with('plan:id,name')
            ->latest()
            ->paginate(20);

        return response()->json($transactions);
    }
}
