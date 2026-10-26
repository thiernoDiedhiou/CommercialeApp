<?php

namespace App\Http\Controllers\Stock;

use App\Http\Controllers\Controller;
use App\Http\Resources\Stock\StockTransferResource;
use App\Models\Branch;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockTransfer;
use App\Services\BranchService;
use App\Services\StockTransferService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockTransferController extends Controller
{
    public function __construct(
        private readonly StockTransferService $transferService,
        private readonly BranchService $branchService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $currentBranchId = $this->branchService->currentId();

        $transfers = StockTransfer::with(['fromBranch', 'toBranch', 'items'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('branch_uid'), function ($q, $uid): void {
                $branch = Branch::where('uid', $uid)->firstOrFail();
                $q->where(fn ($q2) => $q2
                    ->where('from_branch_id', $branch->id)
                    ->orWhere('to_branch_id', $branch->id)
                );
            })
            // Filtre automatique par succursale courante si aucun filtre explicite
            ->when(! $request->input('branch_uid') && $currentBranchId, fn ($q) => $q->where(
                fn ($q2) => $q2
                    ->where('from_branch_id', $currentBranchId)
                    ->orWhere('to_branch_id', $currentBranchId)
            ))
            ->latest('id')
            ->paginate(20);

        return StockTransferResource::collection($transfers);
    }

    public function store(Request $request): StockTransferResource
    {
        $data = $request->validate([
            'from_branch_uid' => ['required', 'string'],
            'to_branch_uid' => ['required', 'string', 'different:from_branch_uid'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_uid' => ['required', 'string'],
            'items.*.product_variant_uid' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $fromBranch = Branch::where('uid', $data['from_branch_uid'])->firstOrFail();
        $toBranch = Branch::where('uid', $data['to_branch_uid'])->firstOrFail();

        $items = collect($data['items'])->map(function (array $row): array {
            $product = Product::where('uid', $row['product_uid'])->firstOrFail();
            $variant = null;

            if (! empty($row['product_variant_uid'])) {
                $variant = ProductVariant::where('uid', $row['product_variant_uid'])->firstOrFail();
            }

            return [
                'product_id' => $product->id,
                'product_variant_id' => $variant?->id,
                'quantity' => $row['quantity'],
                'notes' => $row['notes'] ?? null,
            ];
        })->all();

        $transfer = $this->transferService->create(
            fromBranch: $fromBranch,
            toBranch: $toBranch,
            items: $items,
            notes: $data['notes'] ?? null,
        );

        return new StockTransferResource($transfer);
    }

    public function show(StockTransfer $stockTransfer): StockTransferResource
    {
        $stockTransfer->load(['fromBranch', 'toBranch', 'items.product', 'items.variant', 'createdBy', 'receivedBy']);

        return new StockTransferResource($stockTransfer);
    }

    public function send(StockTransfer $stockTransfer): StockTransferResource
    {
        $transfer = $this->transferService->send($stockTransfer);

        return new StockTransferResource($transfer->load(['fromBranch', 'toBranch', 'items.product', 'items.variant']));
    }

    public function receive(StockTransfer $stockTransfer): StockTransferResource
    {
        $transfer = $this->transferService->receive($stockTransfer);

        return new StockTransferResource($transfer->load(['fromBranch', 'toBranch', 'items.product', 'items.variant']));
    }

    public function cancel(StockTransfer $stockTransfer): StockTransferResource
    {
        $transfer = $this->transferService->cancel($stockTransfer);

        return new StockTransferResource($transfer->load(['fromBranch', 'toBranch', 'items.product', 'items.variant']));
    }
}
