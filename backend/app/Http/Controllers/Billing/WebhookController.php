<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class WebhookController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService,
    ) {}

    /**
     * Reçoit les webhooks de PayDunya.
     *
     * POST /api/v1/billing/webhook/paydunya
     * IMPORTANT : route exclue des middlewares auth et ResolveTenant.
     */
    public function paydunya(Request $request): Response
    {
        try {
            $this->paymentService->handleWebhook($request);
        } catch (Throwable $e) {
            report($e);
        }

        return response('OK', 200);
    }

    /**
     * Reçoit les webhooks de Bictorys.
     *
     * POST /api/v1/billing/webhook/bictorys
     *
     * Bictorys signe chaque webhook via HMAC-SHA256 + timestamp (header X-Webhook-Signature).
     * La route doit retourner 200 même en cas d'erreur pour éviter les retentatives Bictorys.
     * IMPORTANT : route exclue des middlewares auth et ResolveTenant.
     */
    public function bictorys(Request $request): Response
    {
        try {
            $this->paymentService->handleWebhook($request);
        } catch (Throwable $e) {
            report($e);
        }

        return response('OK', 200);
    }
}
