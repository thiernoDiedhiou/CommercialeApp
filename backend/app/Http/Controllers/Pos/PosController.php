<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CloseSessionRequest;
use App\Http\Requests\Pos\OpenSessionRequest;
use App\Http\Requests\Pos\SyncOfflineRequest;
use App\Models\PosSession;
use App\Services\PosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController extends Controller
{
    public function __construct(private readonly PosService $posService) {}

    public function products(Request $request): JsonResponse
    {
        $products = $this->posService->getProducts(
            search:     $request->input('search'),
            categoryId: $request->integer('category_id') ?: null,
        );

        return response()->json($products);
    }

    public function currentSession(Request $request): JsonResponse
    {
        $session = $this->posService->currentSession($request->user());

        return response()->json(['session' => $session]);
    }

    public function openSession(OpenSessionRequest $request): JsonResponse
    {
        try {
            $session = $this->posService->openSession(
                user:         $request->user(),
                openingCash:  (float) $request->input('opening_cash', 0),
                notes:        $request->input('notes'),
            );

            return response()->json(['session' => $session], 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }

    public function closeSession(CloseSessionRequest $request, PosSession $session): JsonResponse
    {
        // Un vendeur ne peut fermer que sa propre session
        if ($session->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        try {
            $result = $this->posService->closeSession(
                session:     $session,
                closingCash: (float) $request->input('closing_cash'),
                notes:       $request->input('notes'),
            );

            return response()->json($result);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }

    public function syncOffline(SyncOfflineRequest $request): JsonResponse
    {
        $result = $this->posService->syncOffline(
            sales: $request->input('sales'),
            user:  $request->user(),
        );

        return response()->json($result);
    }
}
