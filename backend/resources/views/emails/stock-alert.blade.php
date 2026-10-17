@php
    $primaryColor   = $tenant->primary_color   ?? '#2563eb';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $tenantName     = $tenant->name;
    $logoUrl        = $tenant->logo_url ?? null;
@endphp

@extends('emails.layout')

@section('title', 'Alerte stock bas')

@section('content')

    <p style="font-size:14px;color:#64748b;margin:0 0 24px;">Bonjour,</p>

    <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;margin:0 0 8px;color:#0f172a;">
        Stock bas — action requise
    </h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 28px;line-height:1.6;">
        Le produit ci-dessous est passé sous son seuil d'alerte configuré.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr>
            <td style="padding:8px 0;color:#64748b;">Produit</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">{{ $product->name }}</td>
        </tr>
        @if($variant)
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Variante</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;border-top:1px solid #f1f5f9;">{{ $variant->sku }}</td>
        </tr>
        @endif
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">SKU</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;border-top:1px solid #f1f5f9;">{{ $variant?->sku ?? $product->sku }}</td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Stock actuel</td>
            <td style="padding:8px 0;text-align:right;border-top:1px solid #f1f5f9;">
                @if($currentStock <= 0)
                    <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#fee2e2;color:#991b1b;">
                        {{ number_format($currentStock, 0, ',', ' ') }} {{ $product->unit ?: 'unité(s)' }}
                    </span>
                @else
                    <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;">
                        {{ number_format($currentStock, 0, ',', ' ') }} {{ $product->unit ?: 'unité(s)' }}
                    </span>
                @endif
            </td>
        </tr>
        <tr>
            <td style="padding:8px 0;color:#64748b;border-top:1px solid #f1f5f9;">Seuil d'alerte</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;border-top:1px solid #f1f5f9;">
                {{ number_format($threshold, 0, ',', ' ') }} {{ $product->unit ?: 'unité(s)' }}
            </td>
        </tr>
    </table>

    <p style="font-size:13px;color:#94a3b8;margin:28px 0 0;line-height:1.6;">
        Pensez à réapprovisionner ce produit pour éviter toute rupture de stock.
    </p>

@endsection
