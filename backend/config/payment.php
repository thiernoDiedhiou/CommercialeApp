<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Provider actif
    |--------------------------------------------------------------------------
    | paydunya | cinetpay | bictorys | null (dev/test)
    */
    'provider' => env('PAYMENT_PROVIDER', 'null'),

    /*
    |--------------------------------------------------------------------------
    | PayDunya
    |--------------------------------------------------------------------------
    */
    'paydunya' => [
        'master_key'  => env('PAYDUNYA_MASTER_KEY'),
        'private_key' => env('PAYDUNYA_PRIVATE_KEY'),
        'token'       => env('PAYDUNYA_TOKEN'),
        'mode'        => env('PAYDUNYA_MODE', 'test'), // test | live
    ],

    /*
    |--------------------------------------------------------------------------
    | Bictorys
    |--------------------------------------------------------------------------
    | Documentation : https://docs.bictorys.com/docs/integration
    | Les clés test et live sont distinctes — utiliser les clés test pour dev.
    | payment_type : "checkout" (hosted, multi-méthodes) | "wave_money" | "orange_money" | etc.
    | country      : "SN" (Sénégal) | "CI" (Côte d'Ivoire) | "BJ" | "ML" | "TG"
    */
    'bictorys' => [
        'api_url'        => env('BICTORYS_API_URL', 'https://api.test.bictorys.com'),
        'api_key'        => env('BICTORYS_API_KEY'),         // clé publique (frontend/mobile)
        'private_key'    => env('BICTORYS_PRIVATE_KEY'),     // clé privée (backend — CheckoutsWr + TransactionsRd)
        'webhook_secret' => env('BICTORYS_WEBHOOK_SECRET'),
        'payment_type'   => env('BICTORYS_PAYMENT_TYPE', 'checkout'),
        'country'        => env('BICTORYS_COUNTRY', 'SN'),
    ],

    /*
    |--------------------------------------------------------------------------
    | NullGateway (développement)
    |--------------------------------------------------------------------------
    | null_fail=true simule un paiement refusé pour tester le flux d'échec.
    */
    'null_fail' => env('PAYMENT_NULL_FAIL', false),

    /*
    |--------------------------------------------------------------------------
    | Durée de validité d'un lien de paiement (secondes)
    |--------------------------------------------------------------------------
    */
    'link_ttl' => env('PAYMENT_LINK_TTL', 3600), // 1 heure
];
