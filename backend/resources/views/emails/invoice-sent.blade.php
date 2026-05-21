@php
    $primaryColor   = $tenant->primary_color   ?? '#111827';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $tenantName     = $tenant->name;
    $logoUrl        = $tenant->logo_url ?? null;

    $customer = $invoice->customer;
    $dueDate  = $invoice->due_date
        ? \Carbon\Carbon::parse($invoice->due_date)->locale('fr')->isoFormat('D MMMM YYYY')
        : null;
    $remaining = max((float) $invoice->total - (float) $invoice->amount_paid, 0);
@endphp

@extends('emails.layout')

@section('title', "Facture {$invoice->reference}")

@section('content')
    <h1 style="font-size:20px;margin:0 0 16px;color:{{ $primaryColor }};">Votre facture {{ $invoice->reference }}</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Bonjour {{ $customer?->name ?? 'Client' }},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        Veuillez trouver ci-joint votre facture <strong>{{ $invoice->reference }}</strong>
        émise par <strong>{{ $tenant->name }}</strong>.
    </p>

    <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin:16px 0;border-left:3px solid {{ $secondaryColor }};">

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Référence</span>
            <span style="font-weight:600;">{{ $invoice->reference }}</span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Montant total</span>
            <span style="font-weight:600;">{{ number_format((float) $invoice->total, 0, ',', ' ') }} FCFA</span>
        </div>

        @if((float) $invoice->amount_paid > 0)
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Déjà réglé</span>
            <span style="font-weight:600;">{{ number_format((float) $invoice->amount_paid, 0, ',', ' ') }} FCFA</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Reste à payer</span>
            <span style="font-weight:600;">{{ number_format($remaining, 0, ',', ' ') }} FCFA</span>
        </div>
        @endif

        @if($dueDate)
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Date d'échéance</span>
            <span style="font-weight:600;">{{ $dueDate }}</span>
        </div>
        @endif

    </div>

    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">La facture PDF est jointe à cet email. Pour toute question, contactez-nous directement.</p>
@endsection
