<?php

namespace App\Console\Commands;

use App\Models\PaymentTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Expire les transactions en attente abandonnées par le tenant.
 *
 * Planifié toutes les 30 minutes via le scheduler.
 * Ne touche jamais une transaction completed ou failed.
 */
class ExpireAbandonedPayments extends Command
{
    protected $signature   = 'billing:expire-abandoned';
    protected $description = 'Marque les transactions pending expirées comme annulées';

    public function handle(): int
    {
        $count = PaymentTransaction::where('status', 'pending')
            ->where('expires_at', '<', now())
            ->count();

        if ($count === 0) {
            $this->info('Aucune transaction abandonnée.');
            return 0;
        }

        // Mise à jour directe via DB pour contourner le boot() immuable
        // (on passe de pending → cancelled, ce n'est pas une mutation d'un état final)
        DB::table('payment_transactions')
            ->where('status', 'pending')
            ->where('expires_at', '<', now())
            ->update([
                'status'     => 'cancelled',
                'updated_at' => now(),
            ]);

        $this->info("✓ {$count} transaction(s) abandonnée(s) marquées cancelled.");

        return 0;
    }
}
