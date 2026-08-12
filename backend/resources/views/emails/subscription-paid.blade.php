<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Facture {{ $transaction->invoice_number }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#18181b;">

<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

  {{-- ── Logo ────────────────────────────────────────────────────── --}}
  <div style="padding:32px 40px 0;text-align:left;">
    @if(!empty($logoUrl))
      <img src="{{ $logoUrl }}" alt="{{ $appName }}" style="height:32px;width:auto;object-fit:contain;" />
    @else
      <span style="font-size:18px;font-weight:700;color:#111827;">{{ $appName }}</span>
    @endif
  </div>

  {{-- ── Corps ───────────────────────────────────────────────────── --}}
  <div style="padding:32px 40px;">

    {{-- Montant en vedette --}}
    <p style="font-size:28px;font-weight:700;color:#111827;margin:0 0 4px;">
      {{ number_format($transaction->amount, 0, ',', ' ') }} {{ $transaction->currency }}
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
      Payé le {{ \Carbon\Carbon::parse($transaction->updated_at)->format('d/m/Y') }}
    </p>

    {{-- Carte récapitulatif --}}
    <div style="background:#f9fafb;border-radius:6px;padding:20px 24px;margin-bottom:24px;">

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:5px 0;border-bottom:1px solid #e5e7eb;">N° Facture</td>
          <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:5px 0;border-bottom:1px solid #e5e7eb;">{{ $transaction->invoice_number }}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:5px 0;border-bottom:1px solid #e5e7eb;">Plan</td>
          <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:5px 0;border-bottom:1px solid #e5e7eb;">{{ $plan->name }}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:5px 0;border-bottom:1px solid #e5e7eb;">Cycle</td>
          <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:5px 0;border-bottom:1px solid #e5e7eb;">{{ $cycleLabel }}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#9ca3af;padding:5px 0;">Valide jusqu'au</td>
          <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding:5px 0;">{{ \Carbon\Carbon::parse($subscription->ends_at)->format('d/m/Y') }}</td>
        </tr>
      </table>

    </div>

    {{-- Note PDF --}}
    <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
      La facture <strong>{{ $transaction->invoice_number }}</strong> est jointe à cet email en PDF.
    </p>

    {{-- CTA --}}
    <a href="{{ $dashboardUrl }}"
       style="display:inline-block;background:#111827;color:#ffffff;font-size:13px;font-weight:600;padding:11px 24px;border-radius:6px;text-decoration:none;margin-bottom:24px;">
      Accéder à mon espace →
    </a>

    {{-- Séparateur --}}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />

    {{-- Question --}}
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      Une question ? Contactez-nous à
      <a href="mailto:{{ $appEmail }}" style="color:#6b7280;text-decoration:underline;">{{ $appEmail }}</a>
    </p>

  </div>

  {{-- ── Footer ──────────────────────────────────────────────────── --}}
  <div style="padding:16px 40px;border-top:1px solid #f3f4f6;text-align:left;">
    <p style="font-size:11px;color:#d1d5db;margin:0;">
      © {{ date('Y') }} {{ $appName }} · Ce message est généré automatiquement.
    </p>
  </div>

</div>
</body>
</html>
