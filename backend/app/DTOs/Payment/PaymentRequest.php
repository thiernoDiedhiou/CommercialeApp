<?php

namespace App\DTOs\Payment;

/**
 * Données nécessaires pour créer une facture de paiement.
 * Provider-agnostic — identique pour PayDunya, CinetPay, etc.
 */
readonly class PaymentRequest
{
    public function __construct(
        /** Clé d'idempotence — garantit qu'une seule facture est créée par période */
        public string $idempotencyKey,

        /** Montant en entier (XOF ne supporte pas les décimales) */
        public int $amount,

        /** Code ISO de la devise */
        public string $currency,

        /** Description affichée au payeur */
        public string $description,

        /** URL appelée après paiement réussi (page de succès) */
        public string $returnUrl,

        /** URL appelée si le tenant annule */
        public string $cancelUrl,

        /** Informations optionnelles sur le payeur */
        public ?string $customerName  = null,
        public ?string $customerEmail = null,
        public ?string $customerPhone = null,
    ) {}
}
