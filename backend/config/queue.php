<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Connexion par défaut
    |--------------------------------------------------------------------------
    | Configurable via .env QUEUE_CONNECTION :
    |   sync     → exécution immédiate, pas de worker (Hostinger shared)
    |   database → file d'attente en base MySQL (fallback VPS sans Redis)
    |   redis    → Laravel Horizon (VPS/Docker recommandé)
    */
    'default' => env('QUEUE_CONNECTION', 'database'),

    'connections' => [

        'sync' => [
            'driver' => 'sync',
        ],

        /*
        |----------------------------------------------------------------------
        | Database — fallback Hostinger
        | Nécessite : php artisan queue:table && php artisan migrate
        | Worker    : php artisan queue:work --sleep=3 --tries=3
        |----------------------------------------------------------------------
        */
        'database' => [
            'driver'      => 'database',
            'connection'  => env('DB_QUEUE_CONNECTION', null),
            'table'       => env('DB_QUEUE_TABLE', 'jobs'),
            'queue'       => env('DB_QUEUE', 'default'),
            'retry_after' => (int) env('DB_QUEUE_RETRY_AFTER', 90),
            'after_commit'=> false,
        ],

        /*
        |----------------------------------------------------------------------
        | Redis + Laravel Horizon — production VPS/Docker
        | Worker : php artisan horizon
        |----------------------------------------------------------------------
        */
        'redis' => [
            'driver'      => 'redis',
            'connection'  => env('REDIS_QUEUE_CONNECTION', 'default'),
            'queue'       => env('REDIS_QUEUE', 'default'),
            'retry_after' => (int) env('REDIS_QUEUE_RETRY_AFTER', 90),
            'block_for'   => null,
            'after_commit'=> false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Batching
    |--------------------------------------------------------------------------
    */
    'batching' => [
        'database'   => env('DB_CONNECTION', 'mysql'),
        'table'      => 'job_batches',
    ],

    /*
    |--------------------------------------------------------------------------
    | Tentatives échouées
    |--------------------------------------------------------------------------
    */
    'failed' => [
        'driver'   => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'mysql'),
        'table'    => 'failed_jobs',
    ],

];
