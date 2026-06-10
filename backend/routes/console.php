<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Exemple de tâche planifiée — décommenter en Phase 5
// Schedule::command('stock:alert-expiring --days=30')->dailyAt('08:00');

// Expiration des abonnements + notifications J-7 / J-1 (quotidien à 7h00)
Schedule::command('subscription:expire')
    ->dailyAt('07:00')
    ->withoutOverlapping()
    ->runInBackground();

// Traitement de la file de notifications (Hostinger shared hosting sans Redis)
// Exécute les jobs en attente et s'arrête quand la file est vide
Schedule::command('queue:work --stop-when-empty --queue=notifications --tries=3')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();
