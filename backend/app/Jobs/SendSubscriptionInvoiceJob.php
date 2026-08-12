<?php

namespace App\Jobs;

use App\Mail\SubscriptionPaidMail;
use App\Models\PaymentTransaction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendSubscriptionInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 120; // 2 minutes entre les retries

    public function __construct(
        public readonly PaymentTransaction $transaction,
    ) {}

    public function handle(): void
    {
        $transaction  = $this->transaction->fresh(['tenant', 'plan', 'subscription']);
        $tenant       = $transaction->tenant;
        $plan         = $transaction->plan;
        $subscription = $transaction->subscription;

        if (! $tenant || ! $plan || ! $subscription) {
            return; // Relations absentes — ne pas bloquer la queue
        }

        // Destinataire : administrateur du tenant (email de compte)
        $adminUser = $tenant->users()
            ->whereHas('groups', fn ($q) => $q->where('name', 'Administrateur'))
            ->first();

        $recipientEmail = $adminUser?->email ?? $tenant->email;
        $recipientName  = $adminUser?->name  ?? $tenant->name;

        if (! $recipientEmail) {
            return; // Pas d'email configuré
        }

        Mail::send(new SubscriptionPaidMail(
            transaction  : $transaction,
            tenant       : $tenant,
            plan         : $plan,
            subscription : $subscription,
            recipientName : $recipientName,
            recipientEmail: $recipientEmail,
        ));
    }

    public function failed(Throwable $e): void
    {
        report($e);
    }
}
