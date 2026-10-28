<?php

namespace App\Http\Controllers\Marketing;

use App\Http\Controllers\Controller;
use App\Jobs\SendNewsletterCampaignJob;
use App\Models\NewsletterCampaign;
use App\Models\NewsletterSubscriber;
use App\Services\TenantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NewsletterController extends Controller
{
    public function __construct(private readonly TenantService $tenantService) {}

    // ── GET /api/v1/marketing/subscribers ────────────────────────────────────

    public function subscribers(Request $request): JsonResponse
    {
        $query = NewsletterSubscriber::orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where('email', 'like', '%'.$request->search.'%');
        }

        if ($request->filled('active')) {
            $query->where('is_active', (bool) $request->active);
        }

        $paginator = $query->paginate(50);

        return response()->json($paginator);
    }

    // ── DELETE /api/v1/marketing/subscribers/{id} ─────────────────────────────

    public function destroySubscriber(int $id): JsonResponse
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);
        $subscriber->delete();

        return response()->json(['message' => 'Abonné supprimé.']);
    }

    // ── PATCH /api/v1/marketing/subscribers/{id}/toggle ──────────────────────

    public function toggleSubscriber(int $id): JsonResponse
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);
        $subscriber->update(['is_active' => ! $subscriber->is_active]);

        return response()->json([
            'data'    => $subscriber,
            'message' => $subscriber->is_active ? 'Abonné réactivé.' : 'Abonné désactivé.',
        ]);
    }

    // ── GET /api/v1/marketing/subscribers/export ─────────────────────────────

    public function exportSubscribers(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $subscribers = NewsletterSubscriber::where('is_active', true)
            ->orderBy('created_at')
            ->get(['email', 'created_at']);

        return response()->streamDownload(function () use ($subscribers): void {
            $fp = fopen('php://output', 'w');
            fputs($fp, "\xEF\xBB\xBF"); // BOM UTF-8
            fputcsv($fp, ['Email', 'Date inscription'], ';');
            foreach ($subscribers as $s) {
                fputcsv($fp, [$s->email, $s->created_at->format('d/m/Y H:i')], ';');
            }
            fclose($fp);
        }, 'abonnes-newsletter-'.now()->format('Ymd').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    // ── GET /api/v1/marketing/campaigns ──────────────────────────────────────

    public function index(): JsonResponse
    {
        $campaigns = NewsletterCampaign::orderByDesc('created_at')->paginate(20);

        return response()->json($campaigns);
    }

    // ── POST /api/v1/marketing/campaigns ─────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject'      => ['required', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:200'],
            'body'         => ['required', 'string'],
            'design'       => ['nullable', 'string'],
        ]);

        $campaign = NewsletterCampaign::create($validated);

        return response()->json(['data' => $campaign], 201);
    }

    // ── GET /api/v1/marketing/campaigns/{campaign} ────────────────────────────

    public function show(NewsletterCampaign $campaign): JsonResponse
    {
        return response()->json(['data' => $campaign]);
    }

    // ── PUT /api/v1/marketing/campaigns/{campaign} ────────────────────────────

    public function update(Request $request, NewsletterCampaign $campaign): JsonResponse
    {
        if ($campaign->isSent()) {
            return response()->json(['message' => 'Une campagne envoyée ne peut pas être modifiée.'], 422);
        }

        $validated = $request->validate([
            'subject'      => ['sometimes', 'string', 'max:255'],
            'preview_text' => ['nullable', 'string', 'max:200'],
            'body'         => ['sometimes', 'string'],
            'design'       => ['nullable', 'string'],
        ]);

        $campaign->update($validated);

        return response()->json(['data' => $campaign]);
    }

    // ── DELETE /api/v1/marketing/campaigns/{campaign} ─────────────────────────

    public function destroy(NewsletterCampaign $campaign): JsonResponse
    {
        if (! $campaign->isDraft()) {
            return response()->json(['message' => 'Seules les campagnes en brouillon peuvent être supprimées.'], 422);
        }

        $campaign->delete();

        return response()->json(['message' => 'Campagne supprimée.']);
    }

    // ── POST /api/v1/marketing/campaigns/{campaign}/send ─────────────────────

    public function send(NewsletterCampaign $campaign): JsonResponse
    {
        if (! $campaign->isDraft()) {
            return response()->json(['message' => 'Cette campagne a déjà été envoyée ou est en cours d\'envoi.'], 422);
        }

        $count = NewsletterSubscriber::where('tenant_id', $this->tenantService->currentId())
            ->where('is_active', true)
            ->count();

        if ($count === 0) {
            return response()->json(['message' => 'Aucun abonné actif pour cette boutique.'], 422);
        }

        $tenant = $this->tenantService->current();
        SendNewsletterCampaignJob::dispatch($campaign, $tenant)
            ->onQueue('notifications');

        return response()->json([
            'message'     => "Envoi en cours vers {$count} abonné(s).",
            'subscribers' => $count,
        ]);
    }

    // ── POST /api/v1/marketing/media ─────────────────────────────────────────

    public function uploadMedia(Request $request): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpeg,png,gif,webp', 'max:5120']]);
        $path = $request->file('image')->store('marketing', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    // ── GET /api/v1/marketing/stats ──────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $tenantId = $this->tenantService->currentId();

        return response()->json([
            'data' => [
                'subscribers_total'  => NewsletterSubscriber::where('tenant_id', $tenantId)->count(),
                'subscribers_active' => NewsletterSubscriber::where('tenant_id', $tenantId)->where('is_active', true)->count(),
                'campaigns_total'    => NewsletterCampaign::where('tenant_id', $tenantId)->count(),
                'campaigns_sent'     => NewsletterCampaign::where('tenant_id', $tenantId)->where('status', 'sent')->count(),
                'emails_sent'        => (int) NewsletterCampaign::where('tenant_id', $tenantId)->sum('recipients_count'),
            ],
        ]);
    }
}
