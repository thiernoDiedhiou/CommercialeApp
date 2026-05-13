<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Services\MailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMailCommand extends Command
{
    protected $signature = 'mail:test
                            {--to= : Adresse destinataire (défaut : MAIL_FROM_ADDRESS)}
                            {--invoice= : ID de facture à envoyer}';

    protected $description = 'Teste la configuration SMTP';

    public function handle(MailService $mailService): int
    {
        $to = $this->option('to') ?? config('mail.from.address');

        // ── Test 1 : SMTP brut ────────────────────────────────────────────
        $this->info("► Test SMTP brut → {$to}");

        try {
            Mail::raw('Test SMTP depuis Gestion Commerciale — si vous recevez cet email, la config SMTP est correcte.', function ($m) use ($to) {
                $m->to($to)->subject('[Test] SMTP Gestion Commerciale');
            });
            $this->line('  <fg=green>✓ SMTP OK — email envoyé</>');
        } catch (\Throwable $e) {
            $this->line("  <fg=red>✗ SMTP ERREUR : {$e->getMessage()}</>");
            return self::FAILURE;
        }

        // ── Test 2 : facture avec PDF (optionnel) ─────────────────────────
        $invoiceId = $this->option('invoice');
        if ($invoiceId) {
            $this->info("► Test envoi facture #{$invoiceId}");
            $invoice = Invoice::find($invoiceId);

            if (! $invoice) {
                $this->line("  <fg=red>✗ Facture #{$invoiceId} introuvable</>");
                return self::FAILURE;
            }

            try {
                $result = $mailService->sendInvoice($invoice);
                if ($result) {
                    $this->line('  <fg=green>✓ Facture envoyée</>');
                } else {
                    $this->line('  <fg=yellow>⚠ Client sans email — envoi ignoré</>');
                }
            } catch (\Throwable $e) {
                $this->line("  <fg=red>✗ ERREUR facture : {$e->getMessage()}</>");
                return self::FAILURE;
            }
        }

        return self::SUCCESS;
    }
}
