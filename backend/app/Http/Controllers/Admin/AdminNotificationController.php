<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admin = $request->attributes->get('super_admin');

        $notifications = $admin->notifications()
            ->latest()
            ->take(30)
            ->get()
            ->map(fn ($n) => [
                'id'      => $n->id,
                'type'    => $n->data['type'] ?? 'unknown',
                'data'    => $n->data,
                'read_at' => $n->read_at?->toISOString(),
                'created_at' => $n->created_at->toISOString(),
            ]);

        return response()->json([
            'data'         => $notifications,
            'unread_count' => $admin->unreadNotifications()->count(),
        ]);
    }

    public function markRead(string $id, Request $request): JsonResponse
    {
        $admin = $request->attributes->get('super_admin');

        $notification = $admin->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $admin = $request->attributes->get('super_admin');
        $admin->unreadNotifications->markAsRead();

        return response()->json(['message' => 'Toutes les notifications marquées comme lues.']);
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $admin = $request->attributes->get('super_admin');
        $admin->notifications()->where('id', $id)->delete();

        return response()->json(['message' => 'Notification supprimée.']);
    }
}
