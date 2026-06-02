@php
    $primaryColor   = $tenant->primary_color   ?? '#111827';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $tenantName     = $tenant->name;
    $logoUrl        = null;
    $appUrl         = rtrim(config('app.url'), '/');
    $planName       = $subscription->plan?->name ?? 'votre plan';
    $endsAt         = $subscription->ends_at?->format('d/m/Y') ?? '—';
    $isUrgent       = $daysLeft <= 1;
    $alertColor     = $isUrgent ? '#dc2626' : '#d97706';
    $alertBg        = $isUrgent ? '#fee2e2' : '#fef3c7';
    $alertText      = $isUrgent
        ? 'Votre abonnement expire <strong>demain</strong>.'
        : "Votre abonnement expire dans <strong>{$daysLeft} jours</strong>.";
@endphp

@extends('emails.layout')

@section('title', "Abonnement expirant — {$tenantName}")

@section('content')

    {{-- Alerte urgence ──────────────────────────────────────────────────────── --}}
    <div style="background-color:{{ $alertBg }};border-left:4px solid {{ $alertColor }};border-radius:4px;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:{{ $alertColor }};">
            {!! $alertText !!}
        </p>
    </div>

    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        Bonjour {{ $recipient->name }},
    </p>

    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
        Votre abonnement <strong>{{ $planName }}</strong> pour l'espace
        <strong>{{ $tenantName }}</strong> arrive à expiration.
        Sans renouvellement, votre accès sera automatiquement suspendu.
    </p>

    {{-- Détails abonnement ──────────────────────────────────────────────────── --}}
    <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin:0 0 20px;border-left:3px solid {{ $secondaryColor }};">

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Plan</span>
            <span style="font-weight:600;">{{ $planName }}</span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Cycle</span>
            <span style="font-weight:600;">
                @switch($subscription->billing_cycle)
                    @case('trial')   Essai gratuit @break
                    @case('monthly') Mensuel       @break
                    @case('yearly')  Annuel        @break
                    @default         {{ $subscription->billing_cycle }}
                @endswitch
            </span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Date d'expiration</span>
            <span style="font-weight:600;color:{{ $alertColor }};">{{ $endsAt }}</span>
        </div>

    </div>

    {{-- CTA ─────────────────────────────────────────────────────────────────── --}}
    <p style="text-align:center;margin:24px 0;">
        <a href="{{ $appUrl }}/settings"
           style="display:inline-block;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;background-color:{{ $primaryColor }};color:#ffffff;">
            Accéder à mon espace
        </a>
    </p>

    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">

    <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0;">
        Pour renouveler votre abonnement ou obtenir de l'aide, contactez votre administrateur de plateforme.
        Ce message est envoyé automatiquement — merci de ne pas y répondre directement.
    </p>

@endsection
