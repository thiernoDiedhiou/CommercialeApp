@php
    $primaryColor   = $tenant->primary_color   ?? '#111827';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $tenantName     = $tenant->name;
    $logoUrl        = null; // logo pas encore disponible à la création
    $appUrl         = rtrim(config('app.url'), '/');
@endphp

@extends('emails.layout')

@section('title', "Bienvenue sur {$tenant->name}")

@section('content')
    <h1 style="font-size:20px;margin:0 0 16px;color:{{ $primaryColor }};">Bienvenue sur {{ $tenant->name }} 🎉</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Bonjour {{ $admin->name }},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        Votre espace de gestion commerciale a été créé avec succès.
        Voici vos identifiants pour vous connecter :
    </p>

    <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin:16px 0;border-left:3px solid {{ $secondaryColor }};">

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Espace</span>
            <span style="font-weight:600;">{{ $tenant->name }}</span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Email</span>
            <span style="font-weight:600;">{{ $admin->email }}</span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Mot de passe temporaire</span>
            <span style="font-weight:600;">{{ $plainPassword }}</span>
        </div>

    </div>

    <p style="text-align:center;margin:24px 0;">
        <a href="{{ $appUrl }}/login"
           style="display:inline-block;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;background-color:{{ $primaryColor }};color:#ffffff;">
            Accéder à mon espace
        </a>
    </p>

    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
        <strong>Conseil sécurité :</strong> changez votre mot de passe dès votre première
        connexion via les paramètres de votre profil.
    </p>
    <p style="font-size:14px;line-height:1.6;margin:0;">Si vous avez des questions, notre équipe support est disponible pour vous aider.</p>
@endsection
