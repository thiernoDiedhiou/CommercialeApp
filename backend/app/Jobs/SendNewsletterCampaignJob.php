<?php

namespace App\Jobs;

use App\Mail\NewsletterCampaignMail;
use App\Models\NewsletterCampaign;
use App\Models\NewsletterSubscriber;
use App\Models\Tenant;
use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendNewsletterCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries      = 1;
    public int $timeout    = 300; // 5 min max

    public function __construct(
        public readonly NewsletterCampaign $campaign,
        public readonly Tenant $tenant,
    ) {}

    public function handle(MailService $mailService): void
    {
        $this->campaign->update(['status' => 'sending']);

        $mailer    = $mailService->resolveMail($this->tenant);
        $sent      = 0;

        NewsletterSubscriber::where('tenant_id', $this->tenant->id)
            ->where('is_active', true)
            ->orderBy('id')
            ->chunk(50, function ($subscribers) use ($mailer, &$sent): void {
                foreach ($subscribers as $subscriber) {
                    try {
                        $mailer->to($subscriber->email)
                            ->send(new NewsletterCampaignMail($this->campaign, $this->tenant, $subscriber));
                        $sent++;
                    } catch (\Throwable) {
                        // On continue malgré une erreur sur un destinataire
                    }
                }
            });

        $this->campaign->update([
            'status'           => 'sent',
            'sent_at'          => now(),
            'recipients_count' => $sent,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendNewsletterCampaignJob failed', [
            'campaign_id' => $this->campaign->id,
            'error'       => $e->getMessage(),
            'file'        => $e->getFile().':'.$e->getLine(),
        ]);
        $this->campaign->update(['status' => 'draft']);
    }

}
