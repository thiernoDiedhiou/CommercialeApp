<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $campaign->subject }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">

<div style="max-width:600px;margin:40px auto 32px;">

    {{-- Logo / Nom boutique --}}
    <div style="padding:0 8px 20px;">
        @if(!empty($logoUrl))
            <img src="{{ $logoUrl }}" alt="{{ $shopName }}"
                 style="max-height:40px;max-width:160px;object-fit:contain;display:block;">
        @else
            <p style="font-size:16px;font-weight:700;margin:0;color:#0f172a;letter-spacing:-0.3px;">{{ $shopName }}</p>
        @endif
    </div>

    {{-- Carte principale --}}
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07);">

        {{-- Bandeau couleur tenant --}}
        <div style="height:4px;background-color:{{ $primaryColor }};"></div>

        {{-- Sujet mis en avant --}}
        <div style="padding:32px 40px 0;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;letter-spacing:-0.3px;">
                {{ $campaign->subject }}
            </h1>
            @if($campaign->preview_text)
                <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
                    {{ $campaign->preview_text }}
                </p>
            @endif
            <div style="border-top:1px solid #e2e8f0;margin-bottom:28px;"></div>
        </div>

        {{-- Corps de la campagne (HTML riche) --}}
        <div style="padding:0 40px 36px;font-size:15px;line-height:1.7;color:#374151;">
            {!! $campaign->body !!}
        </div>

        {{-- CTA boutique --}}
        @if(!empty($shopUrl))
        <div style="padding:0 40px 36px;text-align:center;">
            <a href="{{ $shopUrl }}"
               style="display:inline-block;padding:12px 28px;background-color:{{ $primaryColor }};color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
                Visiter la boutique
            </a>
        </div>
        @endif

    </div>

    {{-- Footer avec lien désabonnement --}}
    <div style="padding:20px 8px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.6;">
            © {{ date('Y') }} {{ $shopName }} &nbsp;·&nbsp; Vous recevez ce message car vous vous êtes abonné(e) à nos actualités.
        </p>
        @if(!empty($unsubscribeUrl))
        <p style="margin:0;font-size:11px;">
            <a href="{{ $unsubscribeUrl }}" style="color:#94a3b8;text-decoration:underline;">
                Se désabonner
            </a>
        </p>
        @endif
    </div>

</div>
</body>
</html>
