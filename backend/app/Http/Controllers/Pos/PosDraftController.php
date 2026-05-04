<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StoreDraftRequest;
use App\Http\Requests\Pos\UpdateDraftRequest;
use App\Models\PosDraft;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosDraftController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $drafts = PosDraft::where('user_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'updated_at']);

        return response()->json(['data' => $drafts]);
    }

    public function show(Request $request, PosDraft $draft): JsonResponse
    {
        if ($draft->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return response()->json(['data' => $draft]);
    }

    public function store(StoreDraftRequest $request): JsonResponse
    {
        $draft = PosDraft::create([
            'user_id'   => $request->user()->id,
            'name'      => $request->input('name'),
            'cart_data' => $request->input('cart_data'),
        ]);

        return response()->json(['data' => $draft], 201);
    }

    public function update(UpdateDraftRequest $request, PosDraft $draft): JsonResponse
    {
        if ($draft->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $draft->update($request->only(['name', 'cart_data']));

        return response()->json(['data' => $draft->fresh()]);
    }

    public function destroy(Request $request, PosDraft $draft): JsonResponse
    {
        if ($draft->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $draft->delete();

        return response()->json(null, 204);
    }
}
