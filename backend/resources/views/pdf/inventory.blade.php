<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Inventaire {{ $session->reference }}</title>
    @php
        $primaryColor = $tenant->primary_color ?? '#2563eb';
        $logoBase64   = null;
        $logoMime     = 'image/png';
        if ($tenant->logo_path) {
            $logoFullPath = \Illuminate\Support\Facades\Storage::disk('public')->path($tenant->logo_path);
            if (file_exists($logoFullPath)) {
                $logoBase64 = base64_encode(file_get_contents($logoFullPath));
                $ext        = strtolower(pathinfo($logoFullPath, PATHINFO_EXTENSION));
                $logoMime   = match($ext) {
                    'svg'        => 'image/svg+xml',
                    'jpg','jpeg' => 'image/jpeg',
                    'webp'       => 'image/webp',
                    default      => 'image/png',
                };
            }
        }

        $totalExpected = $session->items->sum('expected_qty');
        $totalCounted  = $session->items->sum('counted_qty');
        $totalDiff     = $totalCounted - $totalExpected;
        $diffCount     = $session->items->filter(fn($i) => abs($i->counted_qty - $i->expected_qty) > 0)->count();
    @endphp
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a1a1a; }

        .header { padding: 20px 20px 16px; border-bottom: 2px solid {{ $primaryColor }}; }
        .header-inner { display: flex; justify-content: space-between; align-items: flex-start; }
        .logo { max-height: 50px; max-width: 120px; }
        .tenant-name { font-size: 14px; font-weight: bold; color: {{ $primaryColor }}; }
        .title-block { text-align: right; }
        .title-block h1 { font-size: 16px; font-weight: bold; color: #111827; }
        .title-block .ref { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .status-badge { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; }
        .status-draft { background: #fef9c3; color: #854d0e; }
        .status-confirmed { background: #dcfce7; color: #166534; }

        .meta { padding: 12px 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .meta table { width: 100%; }
        .meta td { font-size: 9px; color: #374151; padding: 1px 0; }
        .meta td.label { color: #9ca3af; width: 100px; }

        .kpi-row { display: flex; gap: 0; border-bottom: 1px solid #e5e7eb; }
        .kpi { flex: 1; padding: 10px 16px; text-align: center; border-right: 1px solid #e5e7eb; }
        .kpi:last-child { border-right: none; }
        .kpi .val { font-size: 16px; font-weight: bold; color: #111827; }
        .kpi .lbl { font-size: 8px; color: #9ca3af; margin-top: 2px; }
        .kpi .val.pos { color: #16a34a; }
        .kpi .val.neg { color: #dc2626; }

        .section-title { padding: 10px 20px 6px; font-size: 9px; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }

        table.items { width: 100%; border-collapse: collapse; }
        table.items thead tr { background: {{ $primaryColor }}; color: white; }
        table.items th { padding: 6px 8px; text-align: left; font-size: 8.5px; font-weight: bold; }
        table.items th.right { text-align: right; }
        table.items tbody tr { border-bottom: 1px solid #f3f4f6; }
        table.items tbody tr:nth-child(even) { background: #f9fafb; }
        table.items td { padding: 5px 8px; font-size: 9px; vertical-align: middle; }
        table.items td.right { text-align: right; }
        table.items td.mono { font-family: Courier New, monospace; }
        table.items td.diff-pos { color: #16a34a; font-weight: bold; }
        table.items td.diff-neg { color: #dc2626; font-weight: bold; }
        table.items td.diff-zero { color: #9ca3af; }

        .footer { margin-top: 16px; padding: 10px 20px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; text-align: center; }

        .notes-block { margin: 0 20px 10px; padding: 8px 10px; background: #fffbeb; border-left: 3px solid #f59e0b; font-size: 9px; color: #78350f; }
    </style>
</head>
<body>

{{-- ── En-tête ──────────────────────────────────────────────────────────── --}}
<div class="header">
    <div class="header-inner">
        <div>
            @if($logoBase64)
                <img class="logo" src="data:{{ $logoMime }};base64,{{ $logoBase64 }}" alt="{{ $tenant->name }}">
            @else
                <div class="tenant-name">{{ $tenant->name }}</div>
            @endif
            <div style="font-size:9px; color:#6b7280; margin-top:4px;">{{ $tenant->name }}</div>
        </div>
        <div class="title-block">
            <h1>Inventaire physique</h1>
            <div class="ref">{{ $session->reference }}</div>
            @if($session->status === 'confirmed')
                <span class="status-badge status-confirmed">✓ Confirmé</span>
            @else
                <span class="status-badge status-draft">Brouillon</span>
            @endif
        </div>
    </div>
</div>

{{-- ── Méta ─────────────────────────────────────────────────────────────── --}}
<div class="meta">
    <table>
        <tr>
            <td class="label">Date</td>
            <td>{{ $session->created_at->format('d/m/Y') }}</td>
            <td class="label" style="padding-left:40px;">Créé par</td>
            <td>{{ $session->creator?->name ?? '—' }}</td>
            @if($session->status === 'confirmed')
            <td class="label" style="padding-left:40px;">Confirmé le</td>
            <td>{{ $session->confirmed_at->format('d/m/Y H:i') }}</td>
            @endif
        </tr>
    </table>
</div>

{{-- ── KPIs ─────────────────────────────────────────────────────────────── --}}
<div class="kpi-row">
    <div class="kpi">
        <div class="val">{{ $session->items->count() }}</div>
        <div class="lbl">Produits comptés</div>
    </div>
    <div class="kpi">
        <div class="val">{{ $diffCount }}</div>
        <div class="lbl">Avec écart</div>
    </div>
    <div class="kpi">
        <div class="val">{{ number_format($totalExpected, 0, ',', ' ') }}</div>
        <div class="lbl">Stock attendu</div>
    </div>
    <div class="kpi">
        <div class="val">{{ number_format($totalCounted, 0, ',', ' ') }}</div>
        <div class="lbl">Stock compté</div>
    </div>
    <div class="kpi">
        <div class="val {{ $totalDiff > 0 ? 'pos' : ($totalDiff < 0 ? 'neg' : '') }}">
            {{ ($totalDiff >= 0 ? '+' : '') . number_format($totalDiff, 0, ',', ' ') }}
        </div>
        <div class="lbl">Écart global</div>
    </div>
</div>

{{-- ── Notes ────────────────────────────────────────────────────────────── --}}
@if($session->notes)
<div style="padding: 6px 20px 0;">
    <div class="notes-block">{{ $session->notes }}</div>
</div>
@endif

{{-- ── Tableau des lignes ───────────────────────────────────────────────── --}}
<div class="section-title">Détail des lignes</div>
<div style="padding: 0 20px;">
    <table class="items">
        <thead>
            <tr>
                <th>Produit</th>
                <th>SKU</th>
                <th>Variante</th>
                <th>Catégorie</th>
                <th class="right">Attendu</th>
                <th class="right">Compté</th>
                <th class="right">Écart</th>
            </tr>
        </thead>
        <tbody>
            @foreach($session->items->sortBy('product.name') as $item)
            @php $diff = $item->counted_qty - $item->expected_qty; @endphp
            <tr>
                <td>{{ $item->product->name }}</td>
                <td class="mono">{{ $item->variant?->sku ?? ($item->product->sku ?? '—') }}</td>
                <td>{{ $item->variant?->attribute_summary ?? '—' }}</td>
                <td>{{ $item->product->category?->name ?? '—' }}</td>
                <td class="right">{{ number_format($item->expected_qty, 0, ',', ' ') }}</td>
                <td class="right">{{ number_format($item->counted_qty, 0, ',', ' ') }}</td>
                <td class="right {{ $diff > 0 ? 'diff-pos' : ($diff < 0 ? 'diff-neg' : 'diff-zero') }}">
                    {{ ($diff >= 0 ? '+' : '') . number_format($diff, 0, ',', ' ') }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>

{{-- ── Pied de page ─────────────────────────────────────────────────────── --}}
<div class="footer">
    Généré le {{ now()->format('d/m/Y à H:i') }} — {{ $tenant->name }} — {{ $session->reference }}
</div>

</body>
</html>
