@php
    $primaryColor   = $tenant->primary_color   ?? '#2563eb';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $tenantName     = $tenant->name;
    $logoUrl        = $tenant->logo_url ?? null;

    $customer = $invoice->customer;
    $dueDate  = $invoice->due_date
        ? \Carbon\Carbon::parse($invoice->due_date)->locale('fr')->isoFormat('D MMMM YYYY')
        : null;

    $isCreditNote = $invoice->credit_note_for_id !== null;
    $isQuote      = $invoice->type === 'quote';
    $docLabel     = $isQuote ? 'Devis' : ($isCreditNote ? 'Avoir' : 'Facture');
    $docLabelLc   = strtolower($docLabel);

    $remaining = max((float) $invoice->total - (float) $invoice->paid_amount, 0);
@endphp

@extends('emails.layout')

@section('title', "{$docLabel} {$invoice->reference}")

@section('content')

    {{-- Salutation --}}
    <p style="font-size:14px;color:#64748b;margin:0 0 24px;">
        Bonjour {{ $customer?->name ?? 'Client' }},
    </p>

    {{-- Titre principal --}}
    <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;margin:0 0 8px;color:#0f172a;">
        {{ $docLabel }} {{ $invoice->reference }}
    </h1>

    {{-- Sous-titre contextuel --}}
    @if($isCreditNote)
    <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6;">
        Cet avoir annule et remplace la facture <strong style="color:#0f172a;">{{ $invoice->creditNoteFor?->reference ?? '—' }}</strong>
        émise par <strong style="color:#0f172a;">{{ $tenantName }}</strong>.
    </p>
    @else
    <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6;">
        {{ ucfirst($docLabelLc) }} émis{{ $isQuote ? '' : 'e' }} par <strong style="color:#0f172a;">{{ $tenantName }}</strong>.
        @if($customMessage)
            <br>{{ $customMessage }}
        @endif
    </p>
    @endif

    {{-- Séparateur --}}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

    {{-- Récapitulatif --}}
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr>
            <td style="padding:8px 0;color:#64748b;">Référence</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">{{ $invoice->reference }}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">
                {{ $isCreditNote ? "Montant de l'avoir" : 'Montant total' }}
            </td>
            <td style="padding:8px 0;text-align:right;font-weight:700;font-size:16px;color:{{ $primaryColor }};border-top:1px solid #f1f5f9;">
                {{ number_format((float) $invoice->total, 0, ',', ' ') }} {{ $tenant->currency ?? 'FCFA' }}
            </td>
        </tr>
        @if(! $isCreditNote && (float) $invoice->paid_amount > 0)
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Déjà réglé</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#16a34a;border-top:1px solid #f1f5f9;">
                {{ number_format((float) $invoice->paid_amount, 0, ',', ' ') }} {{ $tenant->currency ?? 'FCFA' }}
            </td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Reste à payer</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#dc2626;border-top:1px solid #f1f5f9;">
                {{ number_format($remaining, 0, ',', ' ') }} {{ $tenant->currency ?? 'FCFA' }}
            </td>
        </tr>
        @endif
        @if(! $isCreditNote && $dueDate)
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Date d'échéance</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;border-top:1px solid #f1f5f9;">{{ $dueDate }}</td>
        </tr>
        @endif
    </table>

    {{-- Note de bas de carte --}}
    <p style="font-size:13px;color:#94a3b8;margin:28px 0 0;line-height:1.6;">
        Le {{ $docLabelLc }} PDF est joint à cet email.
        Pour toute question, répondez directement à ce message ou contactez-nous.
    </p>

@endsection
