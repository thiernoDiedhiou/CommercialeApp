<?php

namespace App\DTOs\Payment;

/**
 * Statut normalisé d'un paiement — indépendant du provider.
 * Chaque gateway traduit ses propres codes vers ces valeurs.
 */
enum PaymentStatus: string
{
    case Pending   = 'pending';
    case Completed = 'completed';
    case Failed    = 'failed';
    case Cancelled = 'cancelled';
}
