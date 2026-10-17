<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    @php
        $isCreditNote = $invoice->credit_note_for_id !== null;
        $docTitle = $invoice->type === 'quote' ? 'Devis' : ($isCreditNote ? 'Avoir' : 'Facture');
    @endphp
    <title>{{ $docTitle }} {{ $invoice->reference }}</title>
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
        $template = $template ?? 'classic';
    @endphp
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; }

        /* ── En-tête ── */
        .header-grid  { display: table; width: 100%; }
        .header-left  { display: table-cell; width: 60%; vertical-align: middle; }
        .header-right { display: table-cell; width: 40%; vertical-align: middle; text-align: right; }
        .header h1  { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .doc-title  { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .doc-ref    { font-size: 12px; margin-top: 3px; }

        @if($template === 'moderne')
        .header { background: #ffffff; border-top: 4px solid {{ $primaryColor }}; color: #0f172a; padding: 24px 28px 20px; }
        .header h1   { font-size: 17px; color: #0f172a; }
        .header .sub { font-size: 10px; color: #64748b; margin-top: 2px; }
        .doc-title   { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: {{ $primaryColor }}; text-transform: none; }
        .doc-ref     { font-size: 13px; color: #64748b; margin-top: 2px; letter-spacing: 0; }
        @else {{-- classic (défaut) --}}
        .header { background-color: {{ $primaryColor }}; color: #ffffff; padding: 14px 24px; }
        .header h1   { color: #ffffff; font-size: 17px; }
        .header .sub { font-size: 9.5px; opacity: 0.85; margin-top: 1px; line-height: 1.5; }
        .doc-title   { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .doc-ref     { color: rgba(255,255,255,0.9); font-size: 12px; }
        @endif

        .body { padding: 20px 24px; }

        .meta-grid { display: table; width: 100%; margin-bottom: 18px; }
        .meta-col  { display: table-cell; width: 50%; vertical-align: top; }
        .meta-col + .meta-col { padding-left: 16px; }
        .meta-box  { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; }
        .meta-box h3 { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 5px; }
        .meta-box p  { font-size: 11px; line-height: 1.6; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-top: 4px; }
        .badge-draft    { background:#f1f5f9; color:#475569; }
        .badge-sent     { background:#f0f9ff; color:{{ $primaryColor }}; }
        .badge-paid     { background:#dcfce7; color:#15803d; }
        .badge-overdue  { background:#fef2f2; color:#b91c1c; }
        .badge-cancelled{ background:#f1f5f9; color:#94a3b8; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .items-table th { padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
        .items-table th.num { text-align: right; }
        .items-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
        .items-table td.num { text-align: right; }
        .items-table tbody tr:nth-child(even) td { background-color: #fafafa; }
        .item-sub { font-size: 10px; color: #64748b; }

        @if($template === 'moderne')
        .items-table thead tr { background-color: #ffffff; }
        .items-table th       { color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
        .items-table tbody tr:nth-child(even) td { background-color: #f8fafc; }
        @else
        .items-table thead tr { background-color: #f1f5f9; }
        .items-table th       { color: #475569; }
        @endif

        .totals-wrap   { display: table; width: 100%; margin-bottom: 16px; }
        .totals-spacer { display: table-cell; width: 55%; }
        .totals-box    { display: table-cell; width: 45%; }
        .totals-row    { display: table; width: 100%; }
        .totals-label  { display: table-cell; padding: 4px 8px; color: #475569; }
        .totals-value  { display: table-cell; padding: 4px 8px; text-align: right; }
        .totals-divider { border-top: 1px solid #e2e8f0; margin: 4px 0; }
        .totals-total .totals-label,
        .totals-total .totals-value {
            font-size: 13px; font-weight: 700;
            color: {{ $primaryColor }};
            padding-top: 6px;
        }

        .due-box  { background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 8px 12px; margin-top: 4px; }
        .due-box p { color: #b91c1c; font-weight: 600; font-size: 12px; }
        .paid-box  { background: #dcfce7; border: 1px solid #86efac; border-radius: 4px; padding: 8px 12px; margin-top: 4px; }
        .paid-box p { color: #15803d; font-weight: 600; font-size: 12px; }

        .notes-section    { margin-top: 16px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 4px; }
        .notes-section h3 { font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; }
        .notes-section p  { font-size: 11px; line-height: 1.5; color: #475569; }

        .footer {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            border-top: 1px solid #e2e8f0;
            padding: 10px 24px;
            text-align: center;
            color: #94a3b8;
            font-size: 10px;
            background: #ffffff;
        }
        /* Évite que le contenu passe sous le footer fixe */
        .body { padding-bottom: 60px; }
    </style>
</head>
<body>

{{-- ── En-tête ─────────────────────────────────────────────────────────────── --}}
@if($template === 'moderne')
{{-- ── Moderne : fond blanc, fine barre top ──────────────────────────────── --}}
<div class="header">
    <div class="header-grid">
        <div class="header-left">
            @if($logoBase64)
                <img src="data:{{ $logoMime }};base64,{{ $logoBase64 }}"
                     alt="{{ $tenant->name }}"
                     style="max-height:70px; max-width:180px; object-fit:contain; display:block; margin-bottom:6px;">
            @endif
            <h1>{{ $tenant->name }}</h1>
            @if($tenant->address ?? null) <p class="sub">{{ $tenant->address }}</p> @endif
            @if($tenant->phone   ?? null) <p class="sub">{{ $tenant->phone }}</p>   @endif
            @if($tenant->email   ?? null) <p class="sub">{{ $tenant->email }}</p>   @endif
            @if($tenant->rccm    ?? null) <p class="sub">RCCM : {{ $tenant->rccm }}</p> @endif
            @if($tenant->ninea   ?? null) <p class="sub">NINEA : {{ $tenant->ninea }}</p> @endif
        </div>
        <div class="header-right">
            <p class="doc-title">{{ $docTitle }}</p>
            <p class="doc-ref">{{ $invoice->reference }}</p>
        </div>
    </div>
</div>
@else
{{-- ── Classique : bandeau coloré compact ────────────────────────────────── --}}
<div class="header">
    <div class="header-grid">

        {{-- Gauche : logo inline + nom + infos condensées --}}
        <div class="header-left">
            <div style="display:table; width:100%;">
                @if($logoBase64)
                <div style="display:table-cell; vertical-align:middle; padding-right:10px; width:1%;">
                    <img src="data:{{ $logoMime }};base64,{{ $logoBase64 }}"
                         alt="{{ $tenant->name }}"
                         style="max-height:88px; max-width:200px; object-fit:contain; display:block;">
                </div>
                @endif
                <div style="display:table-cell; vertical-align:middle;">
                    <h1>{{ $tenant->name }}</h1>
                    @php
                        $line1 = implode(' · ', array_filter([
                            $tenant->address ?? null,
                            $tenant->phone   ?? null,
                        ]));
                        $line2 = implode(' · ', array_filter([
                            $tenant->email   ?? null,
                        ]));
                        $line3 = implode(' · ', array_filter([
                            $tenant->rccm  ? 'RCCM : ' . $tenant->rccm  : null,
                            $tenant->ninea ? 'NINEA : ' . $tenant->ninea : null,
                        ]));
                    @endphp
                    @if($line1) <p class="sub">{{ $line1 }}</p> @endif
                    @if($line2) <p class="sub">{{ $line2 }}</p> @endif
                    @if($line3) <p class="sub">{{ $line3 }}</p> @endif
                </div>
            </div>
        </div>

        {{-- Droite : type + référence + dates --}}
        <div class="header-right">
            <p class="doc-title">{{ $docTitle }}</p>
            <p class="doc-ref" style="margin-top:2px;">N° {{ $invoice->reference }}</p>
            <p class="doc-ref" style="margin-top:6px; opacity:0.75;">Date : {{ $invoice->issue_date->format('d/m/Y') }}</p>
            @if($invoice->due_date)
            <p class="doc-ref" style="opacity:0.75;">Échéance : {{ $invoice->due_date->format('d/m/Y') }}</p>
            @endif
            @if($invoice->isPaid())
            <p class="doc-ref" style="margin-top:4px; color:rgba(255,255,255,0.95); font-weight:700;">Payé le : {{ optional($invoice->payments()->latest('paid_at')->first())->paid_at?->format('d/m/Y') ?? '—' }}</p>
            @endif
        </div>

    </div>
</div>
@endif

<div class="body">

    {{-- ── Méta : facture & client ─────────────────────────────────────────── --}}
    <div class="meta-grid" style="margin-top:16px">
        <div class="meta-col">
            <div class="meta-box">
                @php
                    $startsWithVowel = in_array(mb_strtolower(mb_substr($docTitle, 0, 1)), ['a','e','i','o','u','h']);
                    $detailsLabel = 'Détails ' . ($startsWithVowel ? "de l'" : 'du ') . strtolower($docTitle);
                @endphp
                <h3>{{ $detailsLabel }}</h3>
                <p><strong>Date d'émission :</strong> {{ $invoice->issue_date->format('d/m/Y') }}</p>
                @if($invoice->due_date)
                    <p><strong>Date d'échéance :</strong> {{ $invoice->due_date->format('d/m/Y') }}</p>
                @endif
                @if($invoice->credit_note_for_id)
                    <p><strong>Avoir pour :</strong> {{ $invoice->creditNoteFor?->reference ?? '—' }}</p>
                @endif
                <p><strong>Émis{{ $invoice->isQuote() ? '' : ($isCreditNote ? '' : 'e') }} par :</strong> {{ $invoice->user?->name ?? '—' }}</p>
                @php
                    $badges = [
                        'draft'     => ['label' => 'Brouillon',   'class' => 'badge-draft'],
                        'sent'      => ['label' => 'Envoyée',     'class' => 'badge-sent'],
                        'paid'      => ['label' => 'Payée',       'class' => 'badge-paid'],
                        'overdue'   => ['label' => 'En retard',   'class' => 'badge-overdue'],
                        'cancelled' => ['label' => 'Annulée',     'class' => 'badge-cancelled'],
                    ];
                    $b = $badges[$invoice->status] ?? ['label' => $invoice->status, 'class' => 'badge-draft'];
                @endphp
                <br><span class="badge {{ $b['class'] }}">{{ $b['label'] }}</span>
            </div>
        </div>
        <div class="meta-col">
            <div class="meta-box">
                <h3>Facturé à</h3>
                @if($invoice->customer)
                    <p><strong>{{ $invoice->customer->name }}</strong></p>
                    @if($invoice->customer->phone)   <p>{{ $invoice->customer->phone }}</p>   @endif
                    @if($invoice->customer->email)   <p>{{ $invoice->customer->email }}</p>   @endif
                    @if($invoice->customer->address) <p>{{ $invoice->customer->address }}</p> @endif
                @else
                    <p style="color:#94a3b8">Client non spécifié</p>
                @endif
            </div>
        </div>
    </div>

    {{-- ── Lignes ───────────────────────────────────────────────────────────── --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:42%">Désignation</th>
                <th class="num" style="width:12%">Qté</th>
                <th class="num" style="width:16%">Prix unit.</th>
                <th class="num" style="width:12%">Remise</th>
                <th class="num" style="width:18%">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
            <tr>
                <td>
                    {{ $item->description }}
                    @if($item->product?->name && $item->product->name !== $item->description)
                        <br><span class="item-sub">{{ $item->product->name }}</span>
                    @endif
                </td>
                <td class="num">
                    {{ number_format($item->quantity, $item->quantity == floor($item->quantity) ? 0 : 3) }}
                    {{ $item->product?->unit ?? '' }}
                </td>
                <td class="num">{{ number_format($item->unit_price, 0, ',', ' ') }}</td>
                <td class="num">
                    @if($item->discount > 0)
                        {{ number_format($item->discount, 0, ',', ' ') }}
                    @else
                        —
                    @endif
                </td>
                <td class="num"><strong>{{ number_format($item->total, 0, ',', ' ') }}</strong></td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- ── Totaux ───────────────────────────────────────────────────────────── --}}
    <div class="totals-wrap">
        <div class="totals-spacer"></div>
        <div class="totals-box">
            <div class="totals-row">
                <div class="totals-label">Sous-total</div>
                <div class="totals-value">{{ number_format($invoice->subtotal, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @if($invoice->discount_amount > 0)
            <div class="totals-row">
                <div class="totals-label">
                    Remise{{ $invoice->discount_type === 'percent' ? ' (' . number_format($invoice->discount_value, 0) . '%)' : '' }}
                </div>
                <div class="totals-value" style="color:#b91c1c">− {{ number_format($invoice->discount_amount, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @endif
            @if($invoice->tax_amount > 0)
            <div class="totals-row">
                <div class="totals-label">TVA ({{ number_format($invoice->tax_rate, 0) }}%)</div>
                <div class="totals-value">{{ number_format($invoice->tax_amount, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @endif
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <div class="totals-label">TOTAL</div>
                <div class="totals-value">{{ number_format($invoice->total, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>

            @if($invoice->paid_amount > 0)
            <div class="totals-row" style="margin-top:4px">
                <div class="totals-label" style="color:#15803d">Encaissé</div>
                <div class="totals-value" style="color:#15803d">{{ number_format($invoice->paid_amount, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @endif
        </div>
    </div>

    {{-- ── Solde ────────────────────────────────────────────────────────────── --}}
    @php $due = $invoice->amountDue(); @endphp
    @if(! $invoice->isPaid() && $due > 0)
        @if($isCreditNote)
        <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:4px; padding:8px 12px; margin-top:4px;">
            <p style="color:#c2410c; font-weight:600; font-size:12px;">Crédit client : {{ number_format($due, 0, ',', ' ') }} {{ $tenant->currency }}</p>
        </div>
        @else
        <div class="due-box">
            <p>Reste dû : {{ number_format($due, 0, ',', ' ') }} {{ $tenant->currency }}</p>
        </div>
        @endif
    @endif

    {{-- ── Notes ───────────────────────────────────────────────────────────── --}}
    @if($invoice->notes)
    <div class="notes-section" style="margin-top:16px">
        <h3>Notes</h3>
        <p>{{ $invoice->notes }}</p>
    </div>
    @endif

</div>

{{-- ── Pied de page ────────────────────────────────────────────────────────── --}}
<div class="footer">
    <p>{{ $footer }}</p>
    <p style="margin-top:4px; color:#cbd5e1">Imprimé le {{ now()->format('d/m/Y à H:i') }}</p>
</div>

{{-- ── Watermark (position:fixed = toutes les pages en DomPDF) ─────────────── --}}
@if($invoice->isPaid())
<div style="position:fixed; top:38%; left:0; width:100%; text-align:center; z-index:1000;
            font-size:100px; font-weight:900; letter-spacing:12px;
            color:rgba(22,163,74,0.10);
            transform:rotate(-30deg);">
    PAYÉ
</div>
@elseif($isCreditNote && $invoice->amountDue() == 0)
<div style="position:fixed; top:38%; left:0; width:100%; text-align:center; z-index:1000;
            font-size:80px; font-weight:900; letter-spacing:8px;
            color:rgba(234,88,12,0.10);
            transform:rotate(-30deg);">
    REMBOURSÉ
</div>
@endif

</body>
</html>
