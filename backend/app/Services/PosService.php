<?php

namespace App\Services;

use App\Exceptions\SaleException;
use App\Models\PosSession;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Pagination\LengthAwarePaginator;

class PosService
{
    public function __construct(
        private readonly SaleService $saleService,
    ) {}

    // ─── Catalogue produits ───────────────────────────────────────────────────

    public function getProducts(?string $search = null, ?int $categoryId = null): LengthAwarePaginator
    {
        return Product::select([
            'id', 'name', 'sku', 'barcode', 'image_path', 'unit', 'price',
            'stock_quantity', 'has_variants', 'is_weight_based', 'has_expiry', 'category_id',
        ])
        ->where('is_active', true)
        ->with(['variants' => function ($q) {
            $q->select(['id', 'product_id', 'sku', 'attribute_summary', 'price', 'stock_quantity'])
              ->where('is_active', true);
        }])
        ->when($search, fn($q) => $q->where(function ($inner) use ($search) {
            $inner->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', '=', $search);
        }))
        ->when($categoryId, fn($q) => $q->where('category_id', $categoryId))
        ->paginate(50);
    }

    // ─── Sessions ─────────────────────────────────────────────────────────────

    public function currentSession(User $user): ?PosSession
    {
        return PosSession::open()
            ->where('user_id', $user->id)
            ->latest('opened_at')
            ->first();
    }

    public function openSession(User $user, float $openingCash = 0, ?string $notes = null): PosSession
    {
        if ($this->currentSession($user)) {
            throw new \DomainException('Une session est déjà ouverte pour cet utilisateur.');
        }

        return PosSession::create([
            'user_id'      => $user->id,
            'opened_at'    => now(),
            'opening_cash' => $openingCash,
            'status'       => 'open',
            'notes'        => $notes,
        ]);
    }

    /**
     * Ferme la session et retourne un résumé de caisse complet.
     *
     * Formule écart : closing_cash − (opening_cash + ventes_cash_session)
     * Un écart positif = surplus, négatif = manque.
     *
     * @return array{session: PosSession, summary: array}
     */
    public function closeSession(PosSession $session, float $closingCash, ?string $notes = null): array
    {
        if (! $session->isOpen()) {
            throw new \DomainException('Cette session est déjà fermée.');
        }

        $sessionEnd = now();

        // Ventes confirmées par ce vendeur pendant la session
        $sales = Sale::confirmed()
            ->where('user_id', $session->user_id)
            ->whereBetween('confirmed_at', [$session->opened_at, $sessionEnd])
            ->with('payments:sale_id,method,amount')
            ->get();

        $salesCount     = $sales->count();
        $totalConfirmed = (float) $sales->sum('total');

        $byPaymentMethod = $sales
            ->flatMap(fn($s) => $s->payments)
            ->groupBy('method')
            ->map(fn($payments) => round((float) $payments->sum('amount'), 2))
            ->toArray();

        // Écart de caisse = clôture − (ouverture + encaissements cash)
        $cashSales    = $byPaymentMethod['cash'] ?? 0.0;
        $expectedCash = round((float) $session->opening_cash + $cashSales, 2);
        $difference   = round($closingCash - $expectedCash, 2);

        $session->update([
            'closing_cash' => $closingCash,
            'closed_at'    => $sessionEnd,
            'status'       => 'closed',
            'notes'        => $notes,
        ]);

        return [
            'session' => $session->fresh(),
            'summary' => [
                'sales_count'       => $salesCount,
                'total_confirmed'   => $totalConfirmed,
                'by_payment_method' => $byPaymentMethod,
                'opening_cash'      => (float) $session->opening_cash,
                'closing_cash'      => $closingCash,
                'difference'        => $difference,
            ],
        ];
    }

    // ─── Synchronisation hors-ligne ────────────────────────────────────────────

    /**
     * Traite un lot de ventes hors-ligne envoyées par le POS.
     *
     * Chaque vente est traitée indépendamment — une erreur sur l'une
     * ne bloque pas les autres. L'idempotence est garantie par offline_id :
     * une vente déjà synchronisée est comptée "skipped" sans lever d'erreur.
     *
     * @return array{processed: int, skipped: int, failed: list<array{offline_id: string, error: string}>}
     */
    public function syncOffline(array $sales, User $user): array
    {
        $processed = 0;
        $skipped   = 0;
        $failed    = [];

        foreach ($sales as $saleData) {
            $offlineId = $saleData['offline_id'];

            // Vérification optimiste avant tentative — évite une transaction inutile
            $alreadySynced = Sale::where('tenant_id', $user->tenant_id)
                ->where('offline_id', $offlineId)
                ->exists();

            if ($alreadySynced) {
                $skipped++;
                continue;
            }

            try {
                $this->saleService->create($saleData, $user);
                $processed++;
            } catch (UniqueConstraintViolationException) {
                // Race condition : deux appareils ont envoyé la même vente simultanément
                $skipped++;
            } catch (SaleException $e) {
                $failed[] = ['offline_id' => $offlineId, 'error' => $e->getMessage()];
            } catch (\Throwable) {
                $failed[] = ['offline_id' => $offlineId, 'error' => 'Erreur inattendue lors de la synchronisation.'];
            }
        }

        return compact('processed', 'skipped', 'failed');
    }
}
