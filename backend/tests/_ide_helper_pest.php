<?php

use App\Models\Tenant;
use App\Models\User;
use App\Services\InvoiceService;
use App\Services\PurchaseService;
use App\Services\SaleService;
use App\Services\StockService;
use Tests\TestCase;

/**
 * Fichier de stubs pour l'IDE (Intelephense).
 * NON exécuté — uniquement pour la résolution statique des types.
 *
 * Pest lie $this dynamiquement aux classes de test via uses() dans Pest.php.
 * Intelephense ne comprend pas ce mécanisme → P1013/P1014 dans les closures.
 * Ce stub déclare les propriétés et méthodes disponibles via TestCase.
 *
 * @mixin TestCase
 */

// Propriétés injectées dans beforeEach() des tests Feature
/** @var Tenant $tenant */
/** @var User $user */
/** @var PurchaseService $service */
/** @var SaleService $saleService */
/** @var StockService $stockService */
/** @var InvoiceService $invoiceService */
