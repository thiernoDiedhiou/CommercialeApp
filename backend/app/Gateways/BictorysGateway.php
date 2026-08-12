<?php

namespace App\Gateways;

use App\Contracts\PaymentGatewayInterface;
use App\DTOs\Payment\PaymentRequest;
use App\DTOs\Payment\PaymentResult;
use App\DTOs\Payment\PaymentStatus;
use App\DTOs\Payment\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Implémentation Bictorys.
 *
 * Documentation : https://docs.bictorys.com/docs/integration
 * Base URL       : https://api.bictorys.com (test et prod — clés différentes)
 *
 * Clés requises dans .env :
 *   BICTORYS_API_URL
 *   BICTORYS_API_KEY       (clé publique — charges et statuts)
 *   BICTORYS_WEBHOOK_SECRET (secret HMAC pour vérification des webhooks)
 *   BICTORYS_PAYMENT_TYPE  (optionnel — défaut : checkout)
 */
class BictorysGateway implements PaymentGatewayInterface
{
    private string $baseUrl;
    private string $privateKey;
    private string $webhookSecret;
    private string $paymentType;

    public function __construct()
    {
        $this->baseUrl       = rtrim(config('payment.bictorys.api_url', 'https://api.test.bictorys.com'), '/');
        $this->privateKey    = config('payment.bictorys.private_key', '');
        $this->webhookSecret = config('payment.bictorys.webhook_secret', '');
        $this->paymentType   = config('payment.bictorys.payment_type', 'checkout');
    }

    public function createInvoice(PaymentRequest $request): PaymentResult
    {
        $payload = [
            'amount'             => $request->amount,
            'currency'           => $request->currency,
            'country'            => config('payment.bictorys.country', 'SN'),
            'paymentReference'   => $request->idempotencyKey,
            'successRedirectUrl' => $request->returnUrl,
            'ErrorRedirectUrl'   => $request->cancelUrl,
        ];

        if ($request->customerName || $request->customerEmail || $request->customerPhone) {
            $payload['customerObject'] = array_filter([
                'name'    => $request->customerName,
                'email'   => $request->customerEmail,
                'phone'   => $request->customerPhone,
                'country' => config('payment.bictorys.country', 'SN'),
            ]);
        }

        $response = Http::withHeaders([
            'X-API-Key'    => $this->privateKey,
            'Content-Type' => 'application/json',
        ])
        ->timeout(15)
        ->post("{$this->baseUrl}/pay/v1/charges?payment_type={$this->paymentType}", $payload);

        if (! $response->successful()) {
            throw new RuntimeException(
                "Bictorys createInvoice failed [{$response->status()}] : " . $response->body()
            );
        }

        $data = $response->json();

        if (empty($data['transactionId'])) {
            throw new RuntimeException(
                "Bictorys: réponse invalide — transactionId absent. Body : " . json_encode($data)
            );
        }

        // Bictorys retourne redirectUrl (page checkout) — utiliser comme checkoutUrl.
        // Le lien direct (deep link mobile) est dans $data['link'] si besoin futur.
        $checkoutUrl = $data['redirectUrl'] ?? $data['link'] ?? '';

        if (empty($checkoutUrl)) {
            throw new RuntimeException(
                "Bictorys: aucune URL de checkout retournée. Body : " . json_encode($data)
            );
        }

        return new PaymentResult(
            checkoutUrl     : $checkoutUrl,
            providerToken   : $data['transactionId'],
            expiresInSeconds: config('payment.link_ttl', 3600),
        );
    }

    public function verifyPayment(string $providerToken): PaymentStatus
    {
        $response = Http::withHeaders([
            'X-API-Key'    => $this->privateKey,
            'Content-Type' => 'application/json',
        ])
        ->timeout(15)
        ->get("{$this->baseUrl}/pay/v1/transactions/{$providerToken}/status");

        if (! $response->successful()) {
            return PaymentStatus::Pending;
        }

        $data = $response->json();

        return $this->mapStatus($data['status'] ?? 'pending');
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        $secret = $this->webhookSecret;

        // Refuser si le secret n'est pas configuré — évite un bypass null === null.
        if (empty($secret)) {
            return false;
        }

        // Bictorys transmet la clé secrète dans le header X-Secret-Key.
        // Source : https://docs.bictorys.com/docs/how-to-validate-webhooks
        $headerKey = $request->header('X-Secret-Key');

        if (empty($headerKey)) {
            return false;
        }

        // Comparaison en temps constant — prévient les attaques de timing.
        return hash_equals($secret, $headerKey);
    }

    public function parseWebhook(Request $request): WebhookEvent
    {
        $payload = $request->all();

        // Bictorys : "id" = transactionId (notre provider_token)
        $transactionId     = $payload['id']           ?? '';
        $status            = $payload['status']       ?? 'pending';
        $pspName           = $payload['pspName']      ?? null;
        $paymentMeans      = $payload['paymentMeans'] ?? null;

        return new WebhookEvent(
            providerToken     : $transactionId,
            status            : $this->mapStatus($status),
            rawPayload        : $payload,
            paymentMethodLabel: $this->resolvePaymentMethodLabel($pspName, $paymentMeans),
        );
    }

    // ── Helpers privés ─────────────────────────────────────────────────────────

    private function mapStatus(string $status): PaymentStatus
    {
        return match ($status) {
            'succeeded', 'authorized' => PaymentStatus::Completed,
            'failed'                  => PaymentStatus::Failed,
            'cancelled', 'reversed'   => PaymentStatus::Cancelled,
            default                   => PaymentStatus::Pending,
        };
    }

    /**
     * Traduit le pspName Bictorys en label lisible pour la facture PDF.
     */
    private function resolvePaymentMethodLabel(?string $pspName, ?string $paymentMeans): ?string
    {
        if ($pspName === null) {
            return null;
        }

        $map = [
            'wave_money'   => 'Wave',
            'wave'         => 'Wave',
            'orange_money' => 'Orange Money',
            'mtn_money'    => 'MTN Money',
            'free_money'   => 'Free Money',
            'card'         => 'Carte bancaire',
            'visa'         => 'Visa',
            'mastercard'   => 'Mastercard',
        ];

        $label = $map[strtolower($pspName)]
            ?? ucfirst(strtolower(str_replace('_', ' ', $pspName)));

        // Ex : "Wave (+221 *** ** 67)"
        if ($paymentMeans) {
            return "{$label} ({$paymentMeans})";
        }

        return $label;
    }
}
