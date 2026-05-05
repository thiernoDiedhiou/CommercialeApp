<?php

/**
 * Fichier de stubs pour l'IDE (Intelephense).
 * NON exécuté — uniquement pour la résolution statique des types.
 *
 * Pest lie $this dynamiquement aux classes de test via uses() dans Pest.php.
 * Intelephense ne comprend pas ce mécanisme → P1013/P1014 dans les closures.
 * Ce stub déclare les propriétés et méthodes disponibles via TestCase.
 *
 * @mixin \Tests\TestCase
 */

// Propriétés injectées dans beforeEach() des tests Feature
/** @var \App\Models\Tenant $tenant */
/** @var \App\Models\User $user */
/** @var \App\Services\PurchaseService $service */
/** @var \App\Services\SaleService $saleService */
/** @var \App\Services\StockService $stockService */
/** @var \App\Services\InvoiceService $invoiceService */
