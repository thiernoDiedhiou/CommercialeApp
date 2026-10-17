@php
    $primaryColor   = $tenant->primary_color   ?? '#2563eb';
    $loginUrl = rtrim(config('saas.frontend_url'), '/') . '/login';
@endphp

@extends('emails.layout')

@section('title', "Vos accès à {$tenant->name}")

@section('content')

    <p style="font-size:14px;color:#64748b;margin:0 0 24px;">Bonjour {{ $user->name }},</p>

    <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;margin:0 0 8px;color:#0f172a;">
        Vous avez été ajouté(e) à {{ $tenant->name }}
    </h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6;">
        Un compte a été créé pour vous sur <strong style="color:#0f172a;">{{ $tenant->name }}</strong>.
        Voici vos identifiants de connexion :
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr>
            <td style="padding:8px 0;color:#64748b;">Espace</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">{{ $tenant->name }}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Email</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;border-top:1px solid #f1f5f9;">{{ $user->email }}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Mot de passe</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;font-size:16px;color:{{ $primaryColor }};border-top:1px solid #f1f5f9;letter-spacing:0.5px;">
                {{ $plainPassword }}
            </td>
        </tr>
    </table>

    <p style="text-align:center;margin:32px 0 0;">
        <a href="{{ $loginUrl }}"
           style="display:inline-block;padding:13px 28px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;background-color:{{ $primaryColor }};color:#ffffff;letter-spacing:0.1px;">
            Accéder à mon espace →
        </a>
    </p>

    <p style="font-size:13px;color:#94a3b8;margin:28px 0 0;line-height:1.6;">
        <strong style="color:#64748b;">Conseil :</strong> changez votre mot de passe dès votre première connexion
        via <em>Paramètres → Profil</em>.
    </p>

@endsection
