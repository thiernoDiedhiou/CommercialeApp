<?php

namespace App\DTOs\Payment;

/**
 * Événement webhook normalisé — indépendant du provider.
 *
 * PayDunya envoie : { "invoice": { "token": "...", "status": "completed" } }
 * CinetPay envoie : { "cpm_trans_id": "...", "cpm_result": "00" }
 *
 * Les deux sont traduits vers ce DTO par leur gateway respectif.
 */
readonly class WebhookEvent
{
    public function __construct(
        /** Token / référence du provider pour retrouver la PaymentTransaction */
        public string $providerToken,

        /** Statut normalisé */
        public PaymentStatus $status,

        /** Payload brut du provider — archivé dans webhook_payload pour audit */
        public array $rawPayload,

        /**
         * Label lisible du moyen de paiement réel.
         * Ex : "Orange Money", "Wave", "Mastercard ****4467"
         * Extrait par chaque gateway depuis son propre format de webhook.
         */
        public ?string $paymentMethodLabel = null,
    ) {}
}
