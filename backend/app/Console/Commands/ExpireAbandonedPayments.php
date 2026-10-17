<?php

namespace App\Console\Commands;

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
    protected $signature = 'billing:expire-abandoned';

    protected $description = 'Marque les transactions pending expirées comme annulées';

    public function handle(): int
    {
        // UPDATE atomique — WHERE status='pending' garantit que les transactions
        // completed/failed ne sont jamais touchées, même sans le guard Eloquent.
        // rowsAffected() reflète l'état réel après l'opération, sans TOCTOU.
        $affected = DB::table('payment_transactions')
            ->where('status', 'pending')
            ->where('expires_at', '<', now())
            ->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);

        if ($affected === 0) {
            $this->info('Aucune transaction abandonnée.');

            return 0;
        }

        $this->info("✓ {$affected} transaction(s) abandonnée(s) marquées cancelled.");

        return 0;
    }
}
