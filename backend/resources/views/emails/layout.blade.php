<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Notification')</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">

<div style="max-width:580px;margin:40px auto 32px;">

    {{-- Logo / Nom tenant au dessus de la carte --}}
    <div style="padding:0 8px 20px;">
        @if(!empty($logoUrl))
            <img src="{{ $logoUrl }}" alt="{{ $tenantName ?? '' }}"
                 style="max-height:36px;max-width:140px;object-fit:contain;display:block;">
        @else
            <p style="font-size:15px;font-weight:700;margin:0;color:#0f172a;letter-spacing:-0.2px;">{{ $tenantName ?? config('app.name') }}</p>
        @endif
    </div>

    {{-- Carte principale --}}
    <div style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);">

        {{-- Bandeau accent fin --}}
        <div style="height:3px;background-color:{{ $primaryColor ?? '#2563eb' }};"></div>

        {{-- Contenu --}}
        <div style="padding:36px 40px;">
            @yield('content')
        </div>

    </div>

    {{-- Footer --}}
    <div style="padding:20px 8px 0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            © {{ date('Y') }} {{ $tenantName ?? config('app.name') }} &nbsp;·&nbsp; Ce message est généré automatiquement, merci de ne pas y répondre.
        </p>
    </div>

</div>

</body>
</html>
