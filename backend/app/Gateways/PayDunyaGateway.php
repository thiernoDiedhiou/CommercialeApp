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
 * Implémentation PayDunya.
 *
 * Documentation : https://paydunya.com/developers
 * Base URL test : https://app.paydunya.com/sandbox-api/v1
 * Base URL live : https://app.paydunya.com/api/v1
 *
 * Clés requises dans .env :
 *   PAYDUNYA_MASTER_KEY
 *   PAYDUNYA_PRIVATE_KEY
 *   PAYDUNYA_TOKEN
 *   PAYDUNYA_MODE=test|live
 */
class PayDunyaGateway implements PaymentGatewayInterface
{
    private string $baseUrl;
    private array  $headers;

    public function __construct()
    {
        $mode = config('payment.paydunya.mode', 'test');

        $this->baseUrl = $mode === 'live'
            ? 'https://app.paydunya.com/api/v1'
            : 'https://app.paydunya.com/sandbox-api/v1';

        $this->headers = [
            'PAYDUNYA-MASTER-KEY'  => config('payment.paydunya.master_key'),
            'PAYDUNYA-PRIVATE-KEY' => config('payment.paydunya.private_key'),
            'PAYDUNYA-TOKEN'       => config('payment.paydunya.token'),
            'Content-Type'         => 'application/json',
        ];
    }

    public function createInvoice(PaymentRequest $request): PaymentResult
    {
        $payload = [
            'invoice' => [
                'total_amount'    => $request->amount,
                'description'     => $request->description,
            ],
            'store' => [
                'name'    => config('app.name', 'DiDi Sphere'),
                'website' => config('app.frontend_url', 'https://didisphere.shop'),
            ],
            'actions' => [
                'cancel_url' => $request->cancelUrl,
                'return_url' => $request->returnUrl,
                // PayDunya appelle ce webhook après paiement
                'callback_url' => route('billing.webhook.paydunya'),
            ],
            'custom_data' => [
                'idempotency_key' => $request->idempotencyKey,
            ],
        ];

        if ($request->customerName || $request->customerEmail || $request->customerPhone) {
            $payload['customer'] = array_filter([
                'name'  => $request->customerName,
                'email' => $request->customerEmail,
                'phone' => $request->customerPhone,
            ]);
        }

        $response = Http::withHeaders($this->headers)
            ->timeout(15)
            ->post("{$this->baseUrl}/checkout-invoice/create", $payload);

        if (! $response->successful()) {
            throw new RuntimeException(
                "PayDunya createInvoice failed [{$response->status()}] : " . $response->body()
            );
        }

        $data = $response->json();

        if (($data['response_code'] ?? null) !== '00') {
            throw new RuntimeException(
                "PayDunya invoice error : " . ($data['response_text'] ?? 'Unknown error')
            );
        }

        return new PaymentResult(
            checkoutUrl    : $data['hosted_checkout_url'],
            providerToken  : $data['token'],
            expiresInSeconds: 3600,
        );
    }

    public function verifyPayment(string $providerToken): PaymentStatus
    {
        $response = Http::withHeaders($this->headers)
            ->timeout(15)
            ->get("{$this->baseUrl}/checkout-invoice/confirm/{$providerToken}");

        if (! $response->successful()) {
            return PaymentStatus::Pending;
        }

        $data = $response->json();

        return match ($data['invoice']['status'] ?? 'pending') {
            'completed'           => PaymentStatus::Completed,
            'cancelled', 'cancel' => PaymentStatus::Cancelled,
            'failed'              => PaymentStatus::Failed,
            default               => PaymentStatus::Pending,
        };
    }

    public function verifyWebhookSignature(Request $request): bool
    {
        $configKey = config('payment.paydunya.master_key');

        // Refuser explicitement si la clé n'est pas configurée.
        // Évite le bypass null === null quand PAYDUNYA_MASTER_KEY est vide.
        if (empty($configKey)) {
            return false;
        }

        $masterKey = $request->header('PAYDUNYA-MASTER-KEY')
            ?? $request->input('PAYDUNYA-MASTER-KEY');

        return ! empty($masterKey) && $masterKey === $configKey;
    }

    public function parseWebhook(Request $request): WebhookEvent
    {
        $payload = $request->all();
        $invoice = $payload['invoice'] ?? $payload['data']['invoice'] ?? [];

        $token  = $invoice['token']  ?? '';
        $status = $invoice['status'] ?? 'pending';

        // Canal de paiement réel — PayDunya renvoie un code dans payment_method
        $paymentMethodLabel = $this->resolvePaymentMethodLabel(
            $invoice['payment_method'] ?? null,
            $invoice['card_last4']     ?? null,
            $invoice['card_brand']     ?? null,
        );

        return new WebhookEvent(
            providerToken      : $token,
            status             : match ($status) {
                'completed'           => PaymentStatus::Completed,
                'cancelled', 'cancel' => PaymentStatus::Cancelled,
                'failed'              => PaymentStatus::Failed,
                default               => PaymentStatus::Pending,
            },
            rawPayload         : $payload,
            paymentMethodLabel : $paymentMethodLabel,
        );
    }

    /**
     * Traduit le code canal PayDunya en label lisible.
     * Les codes exacts sont à vérifier avec la documentation PayDunya finale.
     */
    private function resolvePaymentMethodLabel(?string $method, ?string $last4, ?string $brand): ?string
    {
        if ($method === null) {
            return null;
        }

        $map = [
            'ORANGE_MONEY_SN'  => 'Orange Money',
            'ORANGE_MONEY_CI'  => 'Orange Money',
            'WAVE_SN'          => 'Wave',
            'WAVE_CI'          => 'Wave',
            'FREE_MONEY'       => 'Free Money',
            'CARD'             => 'Carte bancaire',
            'VISA'             => 'Visa',
            'MASTERCARD'       => 'Mastercard',
        ];

        $label = $map[strtoupper($method)] ?? ucfirst(strtolower(str_replace('_', ' ', $method)));

        // Pour les cartes : ajouter les 4 derniers chiffres si disponibles
        if ($last4 && in_array(strtoupper($method), ['CARD', 'VISA', 'MASTERCARD'], true)) {
            $cardBrand = $brand ? ucfirst(strtolower($brand)) : $label;
            return "{$cardBrand} **** {$last4}";
        }

        return $label;
    }
}
