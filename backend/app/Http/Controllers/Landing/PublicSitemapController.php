<?php

namespace App\Http\Controllers\Landing;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Response;

class PublicSitemapController extends Controller
{
    public function shops(): Response
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'https://didisphere.shop'), '/');

        $tenants = Tenant::where('is_active', true)
            ->whereNull('deleted_at')
            ->whereNull('scheduled_deletion_at')
            ->orderBy('updated_at', 'desc')
            ->get(['slug', 'updated_at']);

        $urls = [];
        foreach ($tenants as $tenant) {
            $lastmod = $tenant->updated_at->toDateString();
            $base    = "{$frontendUrl}/shop/{$tenant->slug}";

            $urls[] = [
                'loc'        => $base,
                'lastmod'    => $lastmod,
                'changefreq' => 'weekly',
                'priority'   => '0.7',
            ];
            $urls[] = [
                'loc'        => "{$base}/catalog",
                'lastmod'    => $lastmod,
                'changefreq' => 'daily',
                'priority'   => '0.6',
            ];
        }

        $xml = $this->buildSitemap($urls);

        return response($xml, 200, [
            'Content-Type'  => 'application/xml; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function buildSitemap(array $urls): string
    {
        $items = '';
        foreach ($urls as $url) {
            $items .= "\n  <url>";
            $items .= "\n    <loc>" . e($url['loc']) . "</loc>";
            $items .= "\n    <lastmod>{$url['lastmod']}</lastmod>";
            $items .= "\n    <changefreq>{$url['changefreq']}</changefreq>";
            $items .= "\n    <priority>{$url['priority']}</priority>";
            $items .= "\n  </url>";
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{$items}
</urlset>
XML;
    }
}
