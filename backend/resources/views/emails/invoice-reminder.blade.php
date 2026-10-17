@php
    $primaryColor   = $tenant->primary_color   ?? '#111827';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $customer       = $invoice->customer;
    $dueDate        = $invoice->due_date
        ? \Carbon\Carbon::parse($invoice->due_date)->locale('fr')->isoFormat('D MMMM YYYY')
        : null;
    $amountDue = max((float) $invoice->total - (float) $invoice->paid_amount, 0);
    $count     = $invoice->reminder_count;
@endphp

@extends('emails.layout')

@section('title', "Rappel : Facture {$invoice->reference}")

@section('content')
    <h1 style="font-size:20px;margin:0 0 16px;color:#dc2626;">
        @if($count > 1) Relance n°{{ $count }} — @endif
        Facture {{ $invoice->reference }} en attente de règlement
    </h1>

    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Bonjour {{ $customer?->name ?? 'Client' }},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture
        <strong>{{ $invoice->reference }}</strong>
        @if($dueDate) dont l'échéance était fixée au <strong>{{ $dueDate }}</strong>@endif.
    </p>

    <div style="background:#fef2f2;border-radius:6px;padding:16px;margin:16px 0;border-left:3px solid #dc2626;">
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Référence</span>
            <span style="font-weight:600;">{{ $invoice->reference }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Montant total</span>
            <span style="font-weight:600;">{{ number_format((float) $invoice->total, 0, ',', ' ') }} FCFA</span>
        </div>
        @if((float) $invoice->paid_amount > 0)
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Déjà réglé</span>
            <span style="font-weight:600;">{{ number_format((float) $invoice->paid_amount, 0, ',', ' ') }} FCFA</span>
        </div>
        @endif
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;border-top:1px solid #fca5a5;margin-top:8px;padding-top:8px;">
            <span style="color:#dc2626;font-weight:600;">Reste à régler</span>
            <span style="font-weight:700;color:#dc2626;">{{ number_format($amountDue, 0, ',', ' ') }} FCFA</span>
        </div>
    </div>

    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        Nous vous prions de procéder au règlement dans les meilleurs délais. La facture PDF est jointe à cet email.
        En cas de règlement déjà effectué, veuillez ignorer ce message.
    </p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="font-size:12px;color:#71717a;margin:0;">
        Pour toute question, n'hésitez pas à nous contacter directement.
    </p>
@endsection
