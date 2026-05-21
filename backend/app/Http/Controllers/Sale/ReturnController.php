<?php

namespace App\Http\Controllers\Sale;

use App\Exceptions\SaleException;
use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Services\ReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReturnController extends Controller
{
    public function __construct(
        private readonly ReturnService $returnService,
    ) {}

    /**
     * Liste paginée des retours du tenant courant.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from'          => ['nullable', 'date'],
            'to'            => ['nullable', 'date', 'after_or_equal:from'],
            'refund_method' => ['nullable', 'in:cash,credit,none'],
            'sale_id'       => ['nullable', 'integer'],
        ]);

        $returns = SaleReturn::with(['sale:id,reference', 'user:id,name'])
            ->withCount('items')
            ->when($request->search, fn($q) => $q->where('reference', 'like', "%{$request->search}%"))
            ->when($request->sale_id, fn($q) => $q->where('sale_id', $request->sale_id))
            ->when($request->from && $request->to, fn($q) => $q->whereBetween('created_at', [$request->from, $request->to]))
            ->when($request->refund_method, fn($q) => $q->where('refund_method', $request->refund_method))
            ->latest('id')
            ->paginate(20);

        return response()->json($returns);
    }

    /**
     * Détail d'un retour.
     */
    public function show(SaleReturn $return): JsonResponse
    {
        $return->load([
            'sale:id,reference,confirmed_at',
            'user:id,name',
            'items.product:id,name,unit',
            'items.variant:id,attribute_summary',
            'items.lot:id,lot_number',
        ]);

        return response()->json(['data' => $return]);
    }

    /**
     * Crée un retour sur une vente confirmée.
     *
     * POST /api/v1/sales/{sale}/returns
     */
    public function store(Request $request, Sale $sale): JsonResponse
    {
        $validated = $request->validate([
            'reason'                   => ['nullable', 'string', 'max:500'],
            'refund_method'            => ['required', 'in:cash,credit,none'],
            'items'                    => ['required', 'array', 'min:1'],
            'items.*.sale_item_id'     => ['required', 'integer'],
            'items.*.quantity'         => ['required', 'numeric', 'min:0.001'],
        ]);

        try {
            $saleReturn = $this->returnService->create($sale, $validated, $request->user());

            return response()->json(['data' => $saleReturn], 201);
        } catch (SaleException $e) {
            return response()->json($e->toArray(), 422);
        }
    }
}
