<?php

namespace App\Contracts;

use App\DTOs\Payment\PaymentRequest;
use App\DTOs\Payment\PaymentResult;
use App\DTOs\Payment\PaymentStatus;
use App\DTOs\Payment\WebhookEvent;
use Illuminate\Http\Request;

/**
 * Contrat que tout provider de paiement doit respecter.
 *
 * Changer de provider = créer une nouvelle implémentation de cette interface
 * et mettre à jour PAYMENT_PROVIDER dans .env.
 * Aucune autre modification du code métier n'est nécessaire.
 */
interface PaymentGatewayInterface
{
    /**
     * Crée une facture de paiement et retourne l'URL de checkout.
     * Le tenant est redirigé vers cette URL pour effectuer le paiement.
     */
    public function createInvoice(PaymentRequest $request): PaymentResult;

    /**
     * Vérifie le statut d'un paiement via le token du provider.
     * Appelé en fallback si le webhook n'arrive pas dans les temps.
     */
    public function verifyPayment(string $providerToken): PaymentStatus;

    /**
     * Vérifie l'authenticité cryptographique d'un webhook entrant.
     * Doit retourner false si la signature est invalide — le webhook sera ignoré.
     */
    public function verifyWebhookSignature(Request $request): bool;

    /**
     * Parse le payload du webhook en événement normalisé.
     * Appelé uniquement après que verifyWebhookSignature() ait retourné true.
     */
    public function parseWebhook(Request $request): WebhookEvent;
}
