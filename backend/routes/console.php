<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Exemple de tâche planifiée — décommenter en Phase 5
// Schedule::command('stock:alert-expiring --days=30')->dailyAt('08:00');
