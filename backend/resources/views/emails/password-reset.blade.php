@php
    $primaryColor   = $tenant->primary_color   ?? '#2465ed';
    $secondaryColor = $tenant->secondary_color ?? '#11b67e';
    $tenantName     = $tenant->name            ?? config('app.name');
@endphp
@extends('emails.layout')

@section('title', 'Réinitialisation du mot de passe')

@section('content')
<p style="font-size:15px;color:#374151;margin:0 0 16px;">Bonjour <strong>{{ $user->name }}</strong>,</p>

<p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">
    Nous avons reçu une demande de réinitialisation du mot de passe associé à votre compte sur <strong>{{ $tenantName }}</strong>.
</p>

<p style="font-size:14px;color:#374151;margin:0 0 24px;line-height:1.6;">
    Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien est <strong>valable 60 minutes</strong>.
</p>

<div style="text-align:center;margin:28px 0;">
    <a href="{{ $resetUrl }}"
       style="display:inline-block;background-color:{{ $primaryColor }};color:#ffffff;font-size:15px;font-weight:700;
              text-decoration:none;padding:14px 32px;border-radius:10px;">
        Réinitialiser mon mot de passe →
    </a>
</div>

<p style="font-size:13px;color:#6b7280;margin:24px 0 8px;line-height:1.6;">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
</p>
<p style="font-size:12px;color:#2465ed;word-break:break-all;margin:0 0 24px;">
    {{ $resetUrl }}
</p>

<div style="border-top:1px solid #f3f4f6;padding-top:20px;margin-top:8px;">
    <p style="font-size:13px;color:#9ca3af;margin:0;line-height:1.6;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        Votre mot de passe ne sera pas modifié.
    </p>
</div>
@endsection
