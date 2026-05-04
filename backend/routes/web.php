<?php

use Illuminate\Support\Facades\Route;

// Application API pure — aucune route web.
// Toutes les routes sont définies dans routes/api.php.

Route::get('/', fn() => response()->json([
    'name'    => config('app.name'),
    'version' => config('app.version', '1.0.0'),
    'status'  => 'running',
]));
