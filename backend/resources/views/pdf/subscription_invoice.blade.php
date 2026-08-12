<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #18181b; background: #fff; }

  .page { padding: 48px 56px; }

  /* ── En-tête ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .header-title { font-size: 28px; font-weight: 700; color: #111827; }
  .logo { max-height: 44px; max-width: 160px; object-fit: contain; }
  .logo-text { font-size: 20px; font-weight: 700; color: #{{ ltrim($primaryColor ?? '#111827', '#') }}; }

  /* ── Montant dû ── */
  .amount-due { margin-bottom: 32px; }
  .amount-due .label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
  .amount-due .value { font-size: 22px; font-weight: 700; color: #111827; }

  /* ── Méta : numéros, dates ── */
  .meta { display: flex; gap: 48px; margin-bottom: 36px; }
  .meta-item { display: flex; flex-direction: column; gap: 4px; }
  .meta-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
  .meta-value { font-size: 13px; color: #111827; font-weight: 600; }

  /* ── Parties (De / À) ── */
  .parties { display: flex; gap: 64px; margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid #e5e7eb; }
  .party-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 8px; }
  .party-name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
  .party-detail { font-size: 12px; color: #6b7280; line-height: 1.6; }

  /* ── Tableau lignes ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; font-weight: 600;
             padding: 8px 0; border-bottom: 2px solid #e5e7eb; }
  thead th:last-child { text-align: right; }
  thead th:nth-child(2), thead th:nth-child(3) { text-align: center; }
  tbody td { padding: 14px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #111827; vertical-align: top; }
  tbody td.desc .desc-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody td:nth-child(2), tbody td:nth-child(3) { text-align: center; }

  /* ── Totaux ── */
  .totals { float: right; width: 260px; margin-top: 8px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .totals-row.total { font-weight: 700; font-size: 14px; padding-top: 10px; border-top: 2px solid #111827; margin-top: 6px; }
  .totals-row .totals-label { color: #6b7280; }
  .totals-row.total .totals-label { color: #111827; }

  /* ── Historique paiement ── */
  .payment-history { clear: both; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .payment-history h3 { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 16px; }
  .payment-row { display: flex; justify-content: space-between; font-size: 12px; color: #374151; padding: 6px 0; }
  .payment-row.header { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 4px; }
  .payment-col { flex: 1; }
  .payment-col.right { text-align: right; }

  /* ── Footer ── */
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
<div class="page">

  {{-- ── En-tête (table pour DomPDF — flexbox non supporté) ── --}}
  <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
    <tr>
      <td style="vertical-align:top;text-align:left;">
        <span style="font-size:28px;font-weight:700;color:#111827;">Facture</span>
      </td>
      <td style="vertical-align:top;text-align:right;">
        @if(!empty($logoUrl))
          <img src="{{ $logoUrl }}" style="max-height:44px;max-width:160px;object-fit:contain;" alt="{{ $appName }}" />
        @else
          <span style="font-size:18px;font-weight:700;color:#111827;">{{ $appName }}</span>
        @endif
      </td>
    </tr>
  </table>

  {{-- ── Montant dû / payé ──────────────────────────────────── --}}
  <div class="amount-due">
    <div class="label">{{ $isPaid ? 'Montant payé' : 'Montant dû' }}</div>
    <div class="value">
      {{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}
      {{ $isPaid ? 'payé le ' . \Carbon\Carbon::parse($paidAt)->locale('fr')->isoFormat('D MMMM YYYY') : 'dû le ' . \Carbon\Carbon::parse($dueAt)->locale('fr')->isoFormat('D MMMM YYYY') }}
    </div>
  </div>

  {{-- ── Méta ────────────────────────────────────────────────── --}}
  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">N° Facture</span>
      <span class="meta-value">{{ $transaction->invoice_number }}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Date d'émission</span>
      <span class="meta-value">{{ \Carbon\Carbon::parse($transaction->created_at)->locale('fr')->isoFormat('D MMMM YYYY') }}</span>
    </div>
    @if($isPaid)
    <div class="meta-item">
      <span class="meta-label">Date de paiement</span>
      <span class="meta-value">{{ \Carbon\Carbon::parse($paidAt)->locale('fr')->isoFormat('D MMMM YYYY') }}</span>
    </div>
    @endif
  </div>

  {{-- ── Parties (2 colonnes — table pour DomPDF) ──────────── --}}
  <table style="width:100%;border-collapse:collapse;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid #e5e7eb;">
    <tr>
      {{-- Colonne gauche : DiDi Sphere --}}
      <td style="width:50%;vertical-align:top;padding-right:32px;">
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin:0 0 8px;">De</p>
        <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px;">{{ $appName }}</p>
        <p style="font-size:12px;color:#6b7280;line-height:1.7;margin:0;">
          {{ $appAddress ?? 'Thiès, Sénégal' }}<br>
          {{ $appEmail ?? 'contact@didisphere.shop' }}
          @if(!empty($appWhatsApp))
            <br>{{ $appWhatsApp }}
          @endif
        </p>
      </td>

      {{-- Colonne droite : Tenant (Bill to) — text-align:left explicite pour DomPDF --}}
      <td style="width:50%;vertical-align:top;padding-left:32px;text-align:left;">
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;margin:0 0 8px;text-align:left;">Facturer à</p>
        <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px;text-align:left;">{{ $tenant->name }}</p>
        <p style="font-size:12px;color:#6b7280;line-height:1.7;margin:0;text-align:left;">
          @if($tenant->city){{ $tenant->city }}<br>@endif
          @if($tenant->address){{ $tenant->address }}<br>@endif
          @if($tenant->country){{ $tenant->country }}<br>@endif
          {{ $tenantEmail }}
        </p>
      </td>
    </tr>
  </table>

  {{-- ── Lignes ──────────────────────────────────────────────── --}}
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Description</th>
        <th>Qté</th>
        <th>Prix unitaire</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="desc">
          Abonnement {{ $appName }} — Plan {{ $plan->name }}
          <div class="desc-sub">
            {{ $cycleLabel }} · du {{ \Carbon\Carbon::parse($subscription->starts_at)->locale('fr')->isoFormat('D MMMM YYYY') }} au {{ \Carbon\Carbon::parse($subscription->ends_at)->locale('fr')->isoFormat('D MMMM YYYY') }}
          </div>
        </td>
        <td>1</td>
        <td>{{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}</td>
        <td>{{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}</td>
      </tr>
    </tbody>
  </table>

  {{-- ── Totaux ──────────────────────────────────────────────── --}}
  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">Sous-total</span>
      <span>{{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}</span>
    </div>
    <div class="totals-row total">
      <span class="totals-label">{{ $isPaid ? 'Montant payé' : 'Montant dû' }}</span>
      <span>{{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}</span>
    </div>
  </div>

  {{-- ── Historique paiement ────────────────────────────────── --}}
  @if($isPaid)
  @php
    $providerLabels = [
      'paydunya' => 'PayDunya',
      'cinetpay' => 'CinetPay',
      'bictorys' => 'Bictorys',
      'null'     => 'Paiement en ligne',
    ];
    $methodLabel = $transaction->payment_method_label
      ?? $providerLabels[$transaction->provider]
      ?? ucfirst($transaction->provider);
  @endphp
  <div class="payment-history">
    <h3>Historique de paiement</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <th style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;padding:6px 0;text-align:left;">Méthode de paiement</th>
          <th style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;padding:6px 0;text-align:left;">Date</th>
          <th style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;padding:6px 0;text-align:right;">Montant payé</th>
          <th style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600;padding:6px 0;text-align:right;">N° reçu</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-size:12px;color:#374151;padding:10px 0;text-align:left;">{{ $methodLabel }}</td>
          <td style="font-size:12px;color:#374151;padding:10px 0;text-align:left;">{{ \Carbon\Carbon::parse($paidAt)->locale('fr')->isoFormat('D MMMM YYYY') }}</td>
          <td style="font-size:12px;color:#374151;padding:10px 0;text-align:right;">{{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}</td>
          <td style="font-size:12px;color:#374151;padding:10px 0;text-align:right;">{{ $transaction->invoice_number }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  @endif

  {{-- ── Footer ──────────────────────────────────────────────── --}}
  <div class="footer">
    {{ $appName }} · {{ $appEmail ?? 'contact@didisphere.shop' }} · {{ $appWebsite ?? 'https://didisphere.shop' }}
  </div>

</div>
</body>
</html>
