<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    | Application API pure (pas de SPA same-domain).
    | Laisser vide — toute authentification passe par token Bearer.
    */
    'stateful' => [],

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    */
    'guard' => ['api'],

    /*
    |--------------------------------------------------------------------------
    | Expiration des tokens
    |--------------------------------------------------------------------------
    | null = pas d'expiration automatique.
    | La révocation est gérée manuellement via POST /api/v1/auth/logout.
    | Pour ajouter une expiration : mettre un nombre de minutes (ex: 10080 = 7j).
    */
    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    */
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    */
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies'      => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token'  => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
