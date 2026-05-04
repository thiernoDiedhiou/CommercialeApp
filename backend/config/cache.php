<?php

use Illuminate\Support\Str;

return [

    /*
    |--------------------------------------------------------------------------
    | Driver par défaut
    |--------------------------------------------------------------------------
    | Configurable via .env CACHE_STORE :
    |   redis    → production VPS/Docker (recommandé)
    |   database → fallback Hostinger sans Redis
    |   file     → développement local
    |   array    → tests (aucune persistance)
    */
    'default' => env('CACHE_STORE', 'database'),

    'stores' => [

        'array' => [
            'driver'    => 'array',
            'serialize' => false,
        ],

        'database' => [
            'driver'     => 'database',
            'connection' => env('DB_CACHE_CONNECTION', null),
            'table'      => env('DB_CACHE_TABLE', 'cache'),
            'lock_table' => env('DB_CACHE_LOCK_TABLE', 'cache_locks'),
        ],

        'file' => [
            'driver' => 'file',
            'path'   => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],

        /*
        |----------------------------------------------------------------------
        | Redis — recommandé en production
        | Client : predis (défini dans .env REDIS_CLIENT=predis)
        | Séparé du Redis sessions (DB 0 = cache, DB 1 = sessions si besoin)
        |----------------------------------------------------------------------
        */
        'redis' => [
            'driver'     => 'redis',
            'connection' => env('REDIS_CACHE_CONNECTION', 'cache'),
            'lock_connection' => env('REDIS_CACHE_LOCK_CONNECTION', 'default'),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Préfixe des clés de cache
    |--------------------------------------------------------------------------
    | Isole les entrées cache de ce projet en cas de Redis partagé.
    */
    'prefix' => env('CACHE_PREFIX', Str::slug(env('APP_NAME', 'saas'), '_') . '_cache'),

];
