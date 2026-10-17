<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Reçu {{ $sale->reference }}</title>
    @php
        $primaryColor   = $tenant->primary_color   ?? '#2563eb';
        $secondaryColor = $tenant->secondary_color ?? $primaryColor;
        $logoBase64     = null;
        $logoMime       = 'image/png';
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
        // Normalise les anciens noms de template
        $tpl = match($template ?? 'classic') {
            'classique', 'classic' => 'classic',
            'epure', 'pro'         => 'classic',
            'moderne'              => 'moderne',
            default                => 'classic',
        };
        $isFullyPaid = $sale->amountRemaining() <= 0 && $sale->payments->isNotEmpty();
    @endphp
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; background: #ffffff; }

        /* ── Watermark PAYÉ ── */
        .watermark {
            position: fixed;
            top: 38%; left: 0; width: 100%;
            text-align: center; z-index: 1000;
            font-size: 100px; font-weight: 900; letter-spacing: 12px;
            color: rgba(22,163,74,0.10);
            transform: rotate(-30deg);
        }

        /* ── Footer fixe ── */
        .footer {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            border-top: 1px solid #e2e8f0;
            padding: 10px 24px;
            text-align: center;
            color: #94a3b8; font-size: 10px;
            background: #ffffff;
        }
        .body { padding-bottom: 60px; }

        /* ── Méta ── */
        .meta-grid { display: table; width: 100%; margin-bottom: 18px; }
        .meta-col  { display: table-cell; width: 50%; vertical-align: top; }
        .meta-col + .meta-col { padding-left: 16px; }
        .meta-box  { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; }
        .meta-box h3 { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 5px; }
        .meta-box p  { font-size: 11px; line-height: 1.5; }

        /* ── Tableau des lignes ── */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .items-table thead tr { background-color: #f1f5f9; }
        .items-table th { padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .items-table th.num { text-align: right; }
        .items-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: top; }
        .items-table td.num { text-align: right; }
        .items-table tbody tr:nth-child(even) td { background-color: #fafafa; }
        .item-variant { font-size: 10px; color: #64748b; }

        /* ── Totaux ── */
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
            color: {{ $primaryColor }}; padding-top: 6px;
        }

        /* ── Paiements ── */
        .payments-section h3 { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px; }
        .payments-table { width: 100%; border-collapse: collapse; }
        .payments-table td { padding: 5px 8px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
        .payments-table td.num { text-align: right; }
        .badge-due { display: inline-block; background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-top: 8px; }
    </style>
</head>
<body>

@if($isFullyPaid)
<div class="watermark">PAYÉ</div>
@endif

{{-- ══ EN-TÊTE ══ --}}
@if($tpl === 'moderne')
{{-- Moderne : fond blanc + ligne couleur en haut + titre en couleur --}}
<div style="border-top: 5px solid {{ $primaryColor }}; padding: 22px 28px 18px; background: #ffffff;">
    <div style="display:table; width:100%;">
        <div style="display:table-cell; width:60%; vertical-align:middle;">
            @if($logoBase64)
                <img src="data:{{ $logoMime }};base64,{{ $logoBase64 }}"
                     alt="{{ $tenant->name }}"
                     style="max-height:70px; max-width:180px; object-fit:contain; display:block; margin-bottom:8px;">
            @endif
            <p style="font-size:16px; font-weight:700; color:#0f172a; margin-bottom:4px;">{{ $tenant->name }}</p>
            @php
                $contactParts = array_filter([$tenant->address ?? null, $tenant->phone ?? null, $tenant->email ?? null]);
                $legalLine = '';
                if ($tenant->rccm ?? null) {
                    $legalLine = 'RCCM : ' . $tenant->rccm;
                    if ($tenant->ninea ?? null) { $legalLine .= ' · NINEA : ' . $tenant->ninea; }
                }
            @endphp
            <p style="font-size:10px; color:#64748b; line-height:1.6;">
                {{ implode(' · ', $contactParts) }}
                @if($legalLine)<br>{{ $legalLine }}@endif
            </p>
        </div>
        <div style="display:table-cell; width:40%; vertical-align:middle; text-align:right;">
            <p style="font-size:22px; font-weight:800; letter-spacing:2px; color:{{ $primaryColor }}; text-transform:uppercase;">
                Reçu de vente
            </p>
            <p style="font-size:12px; color:#64748b; margin-top:4px;">{{ $sale->reference }}</p>
            <p style="font-size:11px; color:#94a3b8; margin-top:2px;">
                {{ $sale->confirmed_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}
            </p>
        </div>
    </div>
</div>
@else
{{-- Classique : bandeau coloré compact (même structure que les factures) --}}
<div style="background-color:{{ $primaryColor }}; color:#ffffff; padding:14px 24px;">
    <div style="display:table; width:100%;">

        {{-- Gauche : logo inline + nom + infos condensées --}}
        <div style="display:table-cell; width:60%; vertical-align:middle;">
            <div style="display:table; width:100%;">
                @if($logoBase64)
                <div style="display:table-cell; vertical-align:middle; padding-right:10px; width:1%;">
                    <img src="data:{{ $logoMime }};base64,{{ $logoBase64 }}"
                         alt="{{ $tenant->name }}"
                         style="max-height:88px; max-width:200px; object-fit:contain; display:block;">
                </div>
                @endif
                <div style="display:table-cell; vertical-align:middle;">
                    <p style="font-size:17px; font-weight:700; color:#ffffff;">{{ $tenant->name }}</p>
                    @php
                        $line1 = implode(' · ', array_filter([$tenant->address ?? null, $tenant->phone ?? null]));
                        $line2 = $tenant->email ?? null;
                        $line3 = implode(' · ', array_filter([
                            $tenant->rccm  ? 'RCCM : '  . $tenant->rccm  : null,
                            $tenant->ninea ? 'NINEA : ' . $tenant->ninea : null,
                        ]));
                    @endphp
                    @if($line1) <p style="font-size:9.5px; opacity:0.85; margin-top:1px; line-height:1.5;">{{ $line1 }}</p> @endif
                    @if($line2) <p style="font-size:9.5px; opacity:0.85; margin-top:1px; line-height:1.5;">{{ $line2 }}</p> @endif
                    @if($line3) <p style="font-size:9.5px; opacity:0.85; margin-top:1px; line-height:1.5;">{{ $line3 }}</p> @endif
                </div>
            </div>
        </div>

        {{-- Droite : titre + référence + date --}}
        <div style="display:table-cell; width:40%; vertical-align:middle; text-align:right;">
            <p style="font-size:22px; font-weight:800; letter-spacing:2px; color:#ffffff; text-transform:uppercase;">Reçu de vente</p>
            <p style="font-size:12px; color:rgba(255,255,255,0.9); margin-top:2px;">{{ $sale->reference }}</p>
            <p style="font-size:11px; color:rgba(255,255,255,0.75); margin-top:6px;">
                {{ $sale->confirmed_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}
            </p>
        </div>

    </div>
</div>
@endif

<div class="body" style="padding:20px 24px 60px;">

    {{-- ── Méta : vendeur & client ────────────────────────────────────── --}}
    <div class="meta-grid" style="margin-top:16px">
        <div class="meta-col">
            <div class="meta-box">
                <h3>Informations</h3>
                <p><strong>Date :</strong> {{ $sale->confirmed_at?->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i') }}</p>
                <p><strong>Vendeur :</strong> {{ $sale->user?->name ?? '—' }}</p>
                @if($sale->note)
                    <p><strong>Note :</strong> {{ $sale->note }}</p>
                @endif
            </div>
        </div>
        <div class="meta-col">
            <div class="meta-box">
                <h3>Client</h3>
                @if($sale->customer)
                    <p><strong>{{ $sale->customer->name }}</strong></p>
                    @if($sale->customer->phone)  <p>{{ $sale->customer->phone }}</p>  @endif
                    @if($sale->customer->email)  <p>{{ $sale->customer->email }}</p>  @endif
                    @if($sale->customer->address)<p>{{ $sale->customer->address }}</p>@endif
                @else
                    <p style="color:#94a3b8">Client de passage</p>
                @endif
            </div>
        </div>
    </div>

    {{-- ── Lignes de vente ─────────────────────────────────────────────── --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:40%">Désignation</th>
                <th class="num" style="width:15%">Qté</th>
                <th class="num" style="width:15%">Prix unit.</th>
                <th class="num" style="width:12%">Remise</th>
                <th class="num" style="width:18%">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sale->items as $item)
            <tr>
                <td>
                    {{ $item->product?->name ?? 'Produit supprimé' }}
                    @if($item->variant?->attribute_summary)
                        <br><span class="item-variant">{{ $item->variant->attribute_summary }}</span>
                    @endif
                    @if($item->lot?->lot_number)
                        <br><span class="item-variant">Lot : {{ $item->lot->lot_number }}</span>
                    @endif
                </td>
                <td class="num">
                    @if($item->unit_weight)
                        {{ number_format($item->unit_weight, 3) }} kg
                    @else
                        {{ number_format($item->quantity, $item->quantity == floor($item->quantity) ? 0 : 2) }}
                        {{ $item->product?->unit ?? '' }}
                    @endif
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

    {{-- ── Résumé financier ────────────────────────────────────────────── --}}
    <div class="totals-wrap">
        <div class="totals-spacer"></div>
        <div class="totals-box">
            <div class="totals-row">
                <div class="totals-label">Sous-total</div>
                <div class="totals-value">{{ number_format($sale->subtotal, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @if($sale->discount_amount > 0)
            <div class="totals-row">
                <div class="totals-label">
                    Remise {{ $sale->discount_type === 'percent' ? '(' . number_format($sale->discount_value, 0) . '%)' : '' }}
                </div>
                <div class="totals-value" style="color:#b91c1c">− {{ number_format($sale->discount_amount, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @endif
            @if($sale->tax_amount > 0)
            <div class="totals-row">
                <div class="totals-label">Taxes</div>
                <div class="totals-value">{{ number_format($sale->tax_amount, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
            @endif
            <div class="totals-divider"></div>
            <div class="totals-row totals-total">
                <div class="totals-label">TOTAL</div>
                <div class="totals-value">{{ number_format($sale->total, 0, ',', ' ') }} {{ $tenant->currency }}</div>
            </div>
        </div>
    </div>

    {{-- ── Paiements ───────────────────────────────────────────────────── --}}
    @if($sale->payments->isNotEmpty())
    <div class="payments-section">
        <h3>Règlements</h3>
        <table class="payments-table">
            @foreach($sale->payments as $payment)
            <tr>
                <td>{{ \App\Models\Payment::METHOD_LABELS[$payment->method] ?? $payment->method }}</td>
                @if($payment->reference)
                    <td style="color:#64748b; font-size:10px">Réf. {{ $payment->reference }}</td>
                @else
                    <td></td>
                @endif
                <td class="num">{{ number_format($payment->amount, 0, ',', ' ') }} {{ $tenant->currency }}</td>
            </tr>
            @endforeach
        </table>

        @if($sale->amountRemaining() > 0)
            <p class="badge-due">Reste dû : {{ number_format($sale->amountRemaining(), 0, ',', ' ') }} {{ $tenant->currency }}</p>
        @endif
    </div>
    @endif

</div>

{{-- ── Pied de page fixé en bas de page ───────────────────────────────── --}}
<div class="footer">
    <p>{{ $footer }}</p>
    <p style="margin-top:3px; color:#cbd5e1">Imprimé le {{ now()->format('d/m/Y à H:i') }}</p>
</div>

</body>
</html>
