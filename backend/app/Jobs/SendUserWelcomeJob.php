<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendUserWelcomeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 60;
    public array $backoff = [60, 300];

    public function __construct(
        public readonly Tenant $tenant,
        public readonly User $user,
        public readonly string $plainPassword,
    ) {}

    public function handle(MailService $mailService): void
    {
        $mailService->sendUserWelcome($this->tenant, $this->user, $this->plainPassword);
    }
}
