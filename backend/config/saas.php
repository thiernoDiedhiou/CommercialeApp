<?php

return [
    /*
     * URL du frontend (landing + app React).
     * Utilisé pour construire les liens dans les emails (reset password, bienvenue).
     * Lire via config('saas.frontend_url') — JAMAIS env() hors des fichiers config/.
     */
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
];
