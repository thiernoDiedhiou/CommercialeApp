<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Notification')</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif; color: #18181b; }
        .info-label { color: #71717a; }
        .info-value { font-weight: 600; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger  { background: #fee2e2; color: #991b1b; }
        .badge-brand   { background-color: {{ $secondaryColor ?? ($primaryColor ?? '#111827') }}; color: #ffffff; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

    {{-- Header --}}
    <div style="background-color:{{ $primaryColor ?? '#111827' }};padding:24px 32px;text-align:center;">
        @if(!empty($logoUrl))
            <img src="{{ $logoUrl }}" alt="{{ $tenantName ?? '' }}" style="max-height:48px;max-width:180px;object-fit:contain;">
        @else
            <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0;">{{ $tenantName ?? config('app.name') }}</p>
        @endif
    </div>

    {{-- Body --}}
    <div style="padding:32px;">
        @yield('content')
    </div>

    {{-- Footer --}}
    <div style="padding:20px 32px;background-color:#f4f4f5;text-align:center;font-size:12px;color:#71717a;">
        <p style="margin:0;">© {{ date('Y') }} {{ $tenantName ?? config('app.name') }} — Ce message est généré automatiquement, merci de ne pas y répondre.</p>
    </div>

</div>
</body>
</html>
