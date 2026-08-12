<?php

namespace App\Gateways;

use App\Contracts\PaymentGatewayInterface;
use App\DTOs\Payment\PaymentRequest;
use App\DTOs\Payment\PaymentResult;
use App\DTOs\Payment\PaymentStatus;
use App\DTOs\Payment\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Gateway factice pour le développement local et les tests.
 *
 * Simule un paiement accepté instantanément sans aucun appel réseau.
 * Activé via PAYMENT_PROVIDER=nullgateway dans .env.
 *
 * Pour simuler un échec : PAYMENT_NULL_FAIL=true
 */
class NullGateway implements PaymentGatewayInterface
{
    public function createInvoice(PaymentRequest $request): PaymentResult
    {
        $token       = 'null-' . Str::random(16);
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        // Redirige directement vers la page de succès (ou d'échec selon la config)
        $checkoutUrl = config('payment.null_fail', false)
            ? $request->cancelUrl
            : "{$frontendUrl}/billing/success?token={$token}";

        return new PaymentResult(
            checkoutUrl    : $checkoutUrl,
            providerToken  : $token,
            expiresInSeconds: 3600,
        );
    }

    public function verifyPayment(string $providerToken): PaymentStatus
    {
        return config('payment.null_fail', false)
            ? PaymentStatus::Failed
            : PaymentStatus::Completed;
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        // Le NullGateway accepte tous les webhooks en développement
        return true;
    }

    public function parseWebhook(Request $request): WebhookEvent
    {
        $payload = $request->all();

        return new WebhookEvent(
            providerToken: $payload['token'] ?? 'null-token',
            status       : PaymentStatus::Completed,
            rawPayload   : $payload,
        );
    }
}
