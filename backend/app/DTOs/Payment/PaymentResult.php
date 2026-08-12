<?php

namespace App\DTOs\Payment;

/**
 * Résultat de la création d'une facture chez le provider.
 */
readonly class PaymentResult
{
    public function __construct(
        /** URL vers laquelle rediriger le tenant pour effectuer le paiement */
        public string $checkoutUrl,

        /** Token / référence unique retourné par le provider */
        public string $providerToken,

        /** Durée de validité du lien (en secondes) — null si illimité */
        public ?int $expiresInSeconds = 3600,
    ) {}
}
