<?php

namespace App\Http\Controllers\ActivityLog;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user:id,name')
            ->orderBy('created_at', 'desc');

        if ($userId = $request->integer('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($action = $request->string('action')->toString()) {
            $query->where('action', $action);
        }
        if ($module = $request->string('module')->toString()) {
            $query->where('module', $module);
        }
        if ($from = $request->string('from')->toString()) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->string('to')->toString()) {
            $query->whereDate('created_at', '<=', $to);
        }

        $perPage = min((int) $request->get('per_page', 25), 100);

        return response()->json($query->paginate($perPage));
    }
}
