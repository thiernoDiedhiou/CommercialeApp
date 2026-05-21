@php
    $primaryColor   = $tenant->primary_color   ?? '#111827';
    $secondaryColor = $tenant->secondary_color ?? $primaryColor;
    $tenantName     = $tenant->name;
    $logoUrl        = $tenant->logo_url ?? null;
@endphp

@extends('emails.layout')

@section('title', 'Alerte stock bas')

@section('content')
    <h1 style="font-size:20px;margin:0 0 16px;color:{{ $primaryColor }};">⚠️ Alerte stock bas</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Bonjour,</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Le stock du produit suivant est passé en dessous du seuil d'alerte configuré.</p>

    <div style="background:#f4f4f5;border-radius:6px;padding:16px;margin:16px 0;border-left:3px solid {{ $secondaryColor }};">

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Produit</span>
            <span style="font-weight:600;">{{ $product->name }}</span>
        </div>

        @if($variant)
        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Variante</span>
            <span style="font-weight:600;">{{ $variant->sku }}</span>
        </div>
        @endif

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">SKU</span>
            <span style="font-weight:600;">{{ $variant?->sku ?? $product->sku }}</span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Stock actuel</span>
            <span style="font-weight:600;">
                @if($currentStock <= 0)
                    <span class="badge badge-danger" style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#fee2e2;color:#991b1b;">
                        {{ number_format($currentStock, 0, ',', ' ') }} {{ $product->unit ?: 'unité(s)' }}
                    </span>
                @else
                    <span class="badge badge-warning" style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;">
                        {{ number_format($currentStock, 0, ',', ' ') }} {{ $product->unit ?: 'unité(s)' }}
                    </span>
                @endif
            </span>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;">
            <span style="color:#71717a;">Seuil d'alerte</span>
            <span style="font-weight:600;">{{ number_format($threshold, 0, ',', ' ') }} {{ $product->unit ?: 'unité(s)' }}</span>
        </div>

    </div>

    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Pensez à réapprovisionner ce produit pour éviter toute rupture de stock.</p>
@endsection
