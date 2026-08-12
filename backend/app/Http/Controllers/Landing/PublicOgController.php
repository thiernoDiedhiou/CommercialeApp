<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Retourne un HTML minimal avec les bonnes balises OG pour les crawlers sociaux
 * (WhatsApp, Facebook, Twitter/X, LinkedIn) qui n'exécutent pas JavaScript.
 *
 * À configurer côté Nginx : si User-Agent est un bot connu, proxy vers ce endpoint.
 *
 * Route : GET /og/{slug}           → homepage shop
 *         GET /og/{slug}/catalog   → catalogue
 *         GET /og/{slug}/products/{id} → fiche produit (via PublicShopController)
 */
class PublicOgController extends Controller
{
    public function shop(Request $request, string $slug): Response
    {
        $tenant = Tenant::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $tenant) {
            return $this->fallback();
        }

        $shop        = $tenant->shopSettings;
        $frontendUrl = rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/');
        $shopUrl     = "{$frontendUrl}/shop/{$slug}";

        $title  = $shop?->meta_title    ?? $shop?->shop_name  ?? $tenant->name;
        $desc   = $shop?->meta_description ?? "Découvrez la boutique en ligne de {$tenant->name}. Commandez facilement.";
        $image  = $shop?->logo_url      ?? $shop?->favicon_url ?? "{$frontendUrl}/og-image.png";

        return $this->render($title, $desc, $image, $shopUrl);
    }

    public function catalog(Request $request, string $slug): Response
    {
        $tenant = Tenant::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $tenant) {
            return $this->fallback();
        }

        $shop        = $tenant->shopSettings;
        $frontendUrl = rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/');
        $shopUrl     = "{$frontendUrl}/shop/{$slug}/catalog";
        $shopName    = $shop?->shop_name ?? $tenant->name;

        $title = "Catalogue — {$shopName}";
        $desc  = "Parcourez tous les produits de {$shopName}. Commandez en ligne.";
        $image = $shop?->logo_url ?? "{$frontendUrl}/og-image.png";

        return $this->render($title, $desc, $image, $shopUrl);
    }

    private function render(string $title, string $desc, string $image, string $url): Response
    {
        // Échapper toutes les données user-controlled avant insertion HTML (XSS)
        $eTitle = htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $eDesc  = htmlspecialchars($desc,  ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $eImage = htmlspecialchars($image, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $eUrl   = htmlspecialchars($url,   ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>{$eTitle}</title>
  <meta name="description" content="{$eDesc}" />
  <meta property="og:title"            content="{$eTitle}" />
  <meta property="og:description"      content="{$eDesc}" />
  <meta property="og:type"             content="website" />
  <meta property="og:url"              content="{$eUrl}" />
  <meta property="og:image"            content="{$eImage}" />
  <meta property="og:image:secure_url" content="{$eImage}" />
  <meta property="og:locale"           content="fr_SN" />
  <meta name="twitter:card"            content="summary_large_image" />
  <meta name="twitter:title"           content="{$eTitle}" />
  <meta name="twitter:description"     content="{$eDesc}" />
  <meta name="twitter:image"           content="{$eImage}" />
  <!-- Redirige les vrais utilisateurs vers la SPA React -->
  <meta http-equiv="refresh" content="0;url={$eUrl}" />
  <link rel="canonical" href="{$eUrl}" />
</head>
<body>
  <p>Redirection vers <a href="{$eUrl}">{$eTitle}</a>…</p>
</body>
</html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    private function fallback(): Response
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/');
        return $this->render(
            'DiDi Sphere — Logiciel de gestion commerciale',
            "Gérez vos ventes, stocks et clients en un seul endroit.",
            "{$frontendUrl}/og-image.png",
            $frontendUrl,
        );
    }
}
