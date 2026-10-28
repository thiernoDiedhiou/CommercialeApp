<?php

namespace App\Console\Commands;

use App\Mail\NewsletterCampaignMail;
use App\Models\NewsletterCampaign;
use App\Models\NewsletterSubscriber;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestNewsletterMail extends Command
{
    protected $signature   = 'newsletter:test-send {slug}';
    protected $description = '[DEV] Envoie la première campagne brouillon au premier abonné du tenant';

    public function handle(): int
    {
        $tenant     = Tenant::where('slug', $this->argument('slug'))->firstOrFail();
        $campaign   = NewsletterCampaign::where('tenant_id', $tenant->id)->first();
        $subscriber = NewsletterSubscriber::where('tenant_id', $tenant->id)->first();

        if (! $campaign)   { $this->error('Aucune campagne trouvée.'); return 1; }
        if (! $subscriber) { $this->error('Aucun abonné trouvé.'); return 1; }

        $this->info("Tenant   : {$tenant->name}");
        $this->info("Campaign : {$campaign->subject}");
        $this->info("To       : {$subscriber->email}");

        try {
            Mail::to($subscriber->email)->send(
                new NewsletterCampaignMail($campaign, $tenant, $subscriber)
            );
            $this->info('✓ Email envoyé avec succès !');
        } catch (\Throwable $e) {
            $this->error('✗ Erreur : ' . $e->getMessage());
            $this->line($e->getFile() . ':' . $e->getLine());
            return 1;
        }

        return 0;
    }
}
