import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { ChevronRightIcon, BoltIcon, CheckBadgeIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { getShopProduct } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { ProductGallery, VariantPicker, AddToCartBar, SimilarProducts } from '@/shop/components/product'
import { SkeletonGrid } from '@/shop/components/shared'

// ── Typographies ──────────────────────────────────────────────────────────────
const GROTESK: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" }
const JAKARTA: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" }

function formatPrice(price: number): string {
  return Math.round(price).toLocaleString('fr-FR')
}

// ── Séparateur entre sections ─────────────────────────────────────────────────
function Sep() {
  return <div className="h-2 bg-slate-100 -mx-4 sm:-mx-6 my-4" />
}

// ── Points forts extraits de la description ───────────────────────────────────
function KeyHighlights({ description }: { description: string | null }) {
  if (!description) return null

  // Sépare le paragraphe d'intro (avant le premier •) des bullets
  const hasBulletChar = description.includes('•')
  const parts = hasBulletChar ? description.split('•') : description.split(/\n/)

  const intro = hasBulletChar
    ? parts[0].trim()
    : ''

  const bullets = (hasBulletChar ? parts.slice(1) : parts)
    .map((s) => s.replace(/^[-–—*\s]+/, '').trim())
    .filter((s) => s.length > 3)
    .slice(0, 6)

  // Aucun bullet détecté → paragraphe brut avec retours à la ligne préservés
  if (bullets.length < 2) {
    return (
      <div className="px-4">
        <h2
          className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3"
          style={JAKARTA}
        >
          <BoltIcon className="w-4 h-4 text-[var(--shop-primary,#006948)]" />
          Description du produit
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap" style={JAKARTA}>
          {description}
        </p>
      </div>
    )
  }

  // Bullets courts (≤ 60 chars) → grille 2 colonnes
  const allShort = bullets.every((b) => b.length <= 60)

  return (
    <div className="px-4 space-y-3">
      <h2
        className="text-sm font-bold text-slate-900 flex items-center gap-1.5"
        style={JAKARTA}
      >
        <BoltIcon className="w-4 h-4 text-[var(--shop-primary,#006948)]" />
        Points forts &amp; Atouts majeurs
      </h2>

      {/* Paragraphe d'intro si présent */}
      {intro && (
        <p className="text-sm text-slate-500 leading-relaxed" style={JAKARTA}>
          {intro}
        </p>
      )}

      {allShort ? (
        // Grille 2 colonnes pour les specs courtes (Gen: 8th, RAM: 32g…)
        <div className="grid grid-cols-2 gap-2">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <CheckCircleIcon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: 'var(--shop-primary, #006948)' }}
              />
              <p className="text-xs font-medium text-slate-700 leading-snug" style={JAKARTA}>
                {b}
              </p>
            </div>
          ))}
        </div>
      ) : (
        // Liste verticale pour les bullets longues (phrases complètes)
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircleIcon
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--shop-primary, #006948)' }}
              />
              <p className="text-sm text-slate-600 leading-relaxed" style={JAKARTA}>
                {b}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Piliers de réassurance ────────────────────────────────────────────────────
function ReassurancePillars() {
  const shopConfig  = useShopStore((s) => s.shopConfig)
  const trustBadges = (shopConfig?.trust_badges ?? []).filter((b) => b.active)

  const defaultPillars = [
    { icon: '🚚', title: 'Livraison disponible',     subtitle: 'Expédition sécurisée à domicile ou en point de retrait.' },
    { icon: '🏪', title: 'SAV & Boutique physique',  subtitle: 'Venez tester ou récupérer votre commande directement.' },
    { icon: '🛡️', title: 'Garantie authenticité',   subtitle: 'Produits neufs vérifiés avec assistance dédiée.' },
  ]

  const ICON_MAP: Record<string, string> = {
    delivery: '🚚',
    payment : '💳',
    quality : '🛡️',
    support : '💬',
  }

  const pillars = trustBadges.length >= 2
    ? trustBadges.slice(0, 3).map((b) => ({ icon: ICON_MAP[b.icon] ?? '✓', title: b.title, subtitle: b.subtitle ?? '' }))
    : defaultPillars

  return (
    <div className="px-4 space-y-2.5">
      {pillars.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white shadow-sm rounded-xl border border-slate-100">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: 'rgba(0,105,72,0.08)', color: 'var(--shop-primary,#006948)' }}
          >
            {p.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900" style={JAKARTA}>{p.title}</p>
            {p.subtitle && (
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5" style={JAKARTA}>
                {p.subtitle}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ShopProductDetailPage() {
  const navigate = useNavigate()
  const { slug = '', productId = '' } = useParams<{ slug: string; productId: string }>()
  const addItem   = useShopStore((s) => s.addItem)
  const openCart  = useShopStore((s) => s.openCart)
  const currency  = useShopStore((s) => s.shopConfig?.currency ?? 'FCFA')
  const shopName  = useShopStore((s) => s.shopConfig?.name ?? '')

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [quantity, setQuantity]                   = useState(1)

  const { data, isLoading } = useQuery({
    queryKey : ['shop-product', slug, productId],
    queryFn  : () => getShopProduct(slug, productId),
    staleTime: 2 * 60 * 1000,
    enabled  : !!slug && !!productId,
  })

  const product = data?.data

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId) ?? null
  const displayPrice    = selectedVariant?.price ?? product?.price ?? 0

  const resolvedStock = (() => {
    if (!product) return null
    if (!product.has_variants) return product.stock_quantity ?? 0
    if (!selectedVariantId)   return null
    return product.variants.find((v) => v.id === selectedVariantId)?.stock_quantity ?? 0
  })()

  const promoPercent = (() => {
    if (!product?.compare_at_price || product.compare_at_price <= product.price) return null
    return Math.round((1 - product.price / product.compare_at_price) * 100)
  })()

  const inStock = resolvedStock !== null ? resolvedStock > 0 : null
  const lowStockThreshold = product?.alert_threshold ?? null
  const lowStockQty = (
    !product?.has_variants &&
    lowStockThreshold !== null &&
    (product?.stock_quantity ?? 0) > 0 &&
    (product?.stock_quantity ?? 0) <= lowStockThreshold
  ) ? product!.stock_quantity : null

  const savings = promoPercent !== null && product?.compare_at_price
    ? product.compare_at_price - product.price
    : null

  const handleAddToCart = () => {
    if (!product) return
    if (product.has_variants && !selectedVariantId) return
    const price = selectedVariant?.price ?? product.price
    addItem({
      product_id     : product.id,
      variant_id     : selectedVariantId,
      product_name   : product.name,
      variant_name   : selectedVariant?.attribute_summary ?? null,
      image_url      : product.image_url,
      quantity,
      unit_price     : price,
      total          : price * quantity,
      is_weight_based: false,
      unit           : product.unit,
      stock_quantity : selectedVariant?.stock_quantity ?? product.stock_quantity ?? 0,
    })
    openCart()
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonGrid count={2} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-400">
        Produit introuvable.
      </div>
    )
  }

  const productTitle = shopName ? `${product.name} — ${shopName}` : product.name
  const rawDesc      = product.description
    ?? `${product.name}${product.category ? ` — ${product.category.name}` : ''}. Commandez en ligne.`
  const productDesc  = rawDesc.length > 160
    ? rawDesc.slice(0, (rawDesc.lastIndexOf(' ', 160) || 160)) + '…'
    : rawDesc

  return (
    <>
      <Helmet>
        <title>{productTitle}</title>
        <meta name="description" content={productDesc} />
        <link rel="canonical" href={`${window.location.origin}/shop/${slug}/products/${productId}`} />
        <meta property="og:title"   content={productTitle} />
        <meta property="og:description" content={productDesc} />
        <meta property="og:type"    content="product" />
        <meta property="og:locale"  content="fr_SN" />
        <meta property="og:url"     content={`${window.location.origin}/shop/${slug}/products/${productId}`} />
        {product.image_url && <meta property="og:image"           content={product.image_url} />}
        {product.image_url && <meta property="og:image:secure_url" content={product.image_url} />}
        {product.image_url && <meta property="og:image:alt"       content={product.name} />}
        <script type="application/ld+json">{JSON.stringify([
          {
            '@context': 'https://schema.org', '@type': 'Product',
            'name': product.name, 'description': productDesc,
            'image': product.image_url ?? undefined,
            'offers': {
              '@type': 'Offer',
              'price': String(product.price),
              'priceCurrency': currency,
              'availability': (product.stock_quantity ?? 1) > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          },
        ])}</script>
      </Helmet>

      {/* ── Barre contextuelle : retour + breadcrumb + actions ──────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path d="M15.75 19.5 8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Breadcrumb compact */}
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium overflow-hidden">
            {product.category && (
              <>
                <Link
                  to={`/shop/${slug}/catalog?category=${product.category.id}`}
                  className="hover:text-slate-800 transition-colors whitespace-nowrap"
                  style={JAKARTA}
                >
                  {product.category.name}
                </Link>
                <ChevronRightIcon className="w-3 h-3 shrink-0 text-slate-300" />
              </>
            )}
            <span className="text-slate-800 font-semibold truncate" style={JAKARTA}>
              {product.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Partager"
            onClick={() => navigator.share?.({ title: product.name, url: window.location.href }).catch(() => {})}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
          >
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Contenu principal ─────────────────────────────────────────────── */}
      {/* Desktop : 2 colonnes — Mobile : colonne unique */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-8">

        {/* ── Galerie ────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 pt-3 pb-0 lg:px-0 lg:sticky lg:top-6">
          <ProductGallery
            images={product.images ?? []}
            imageUrl={product.image_url}
            productName={product.name}
            promoPercent={promoPercent}
            inStock={inStock}
            lowStockQty={lowStockQty}
          />
        </div>

        {/* ── Colonne infos ──────────────────────────────────────────────── */}
        <div className="pb-32 sm:pb-28 lg:pb-8">

          {/* ── Badge catégorie + titre + prix ──────────────────────────── */}
          <div className="px-4 sm:px-6 lg:px-0 space-y-2.5 pt-4">

            {/* Badge catégorie */}
            <div className="flex items-center justify-between">
              {product.category ? (
                <Link
                  to={`/shop/${slug}/catalog?category=${product.category.id}`}
                  className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{ ...JAKARTA, color: 'var(--shop-primary,#006948)', background: 'rgba(0,105,72,0.08)' }}
                >
                  {product.category.name}
                </Link>
              ) : <div />}
              <div className="flex items-center gap-1 text-xs text-slate-400" style={JAKARTA}>
                <CheckBadgeIcon className="w-4 h-4 text-emerald-500" />
                Produit authentique
              </div>
            </div>

            {/* Titre */}
            <h1
              className="text-lg font-bold text-slate-900 leading-snug"
              style={GROTESK}
            >
              {product.name}
            </h1>

            {/* Section prix */}
            <div
              className="p-3.5 rounded-2xl flex items-baseline justify-between"
              style={{ background: 'linear-gradient(to right, rgba(0,105,72,0.07), rgba(248,250,252,0.6), transparent)' }}
            >
              <div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span
                    className="text-2xl font-black tracking-tight"
                    style={{ ...GROTESK, color: 'var(--shop-primary,#006948)' }}
                  >
                    {formatPrice(displayPrice)} {currency}
                    {product.is_weight_based && ` / ${product.unit ?? 'unité'}`}
                  </span>
                  {promoPercent !== null && product.compare_at_price !== null && (
                    <span className="text-sm font-semibold text-slate-400 line-through" style={JAKARTA}>
                      {formatPrice(product.compare_at_price)} {currency}
                    </span>
                  )}
                </div>
                {savings !== null && (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ ...JAKARTA, color: 'var(--shop-primary,#006948)', background: 'rgba(0,105,72,0.1)' }}
                    >
                      Économie : {formatPrice(savings)} {currency}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium" style={JAKARTA}>TVA incluse</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notice paiement mobile */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-100/80 rounded-xl text-xs text-slate-600" style={JAKARTA}>
              <span>💳</span>
              <p className="leading-tight">
                Paiement via <strong className="text-slate-800">Wave, Orange Money</strong> ou carte bancaire.
              </p>
            </div>
          </div>

          <Sep />

          {/* ── Variantes ──────────────────────────────────────────────── */}
          {product.has_variants && (
            <>
              <div className="px-4 sm:px-6 lg:px-0">
                <VariantPicker
                  product={product}
                  selectedVariantId={selectedVariantId}
                  onSelect={setSelectedVariantId}
                />
              </div>
              <Sep />
            </>
          )}

          {/* ── Stock faible ────────────────────────────────────────────── */}
          {lowStockQty !== null && (
            <div className="px-4 sm:px-6 lg:px-0 -mt-3 mb-3">
              <p className="text-[11px] text-orange-600 font-semibold" style={JAKARTA}>
                ⚠️ Plus que {lowStockQty} unité(s) disponible(s) — commandez rapidement !
              </p>
            </div>
          )}

          {/* ── Points forts / Description ──────────────────────────────── */}
          <div className="sm:px-2 lg:px-0">
            <KeyHighlights description={product.description ?? null} />
          </div>

          <Sep />

          {/* ── Réassurance ─────────────────────────────────────────────── */}
          <div className="sm:px-2 lg:px-0">
            <ReassurancePillars />
          </div>

          <Sep />

          {/* ── Produits similaires ─────────────────────────────────────── */}
          {product.category && (
            <div className="px-4 sm:px-6 lg:px-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900" style={GROTESK}>
                  Accessoires &amp; Produits similaires
                </h2>
                <Link
                  to={`/shop/${slug}/catalog?category=${product.category.id}`}
                  className="text-xs font-semibold transition-colors"
                  style={{ ...JAKARTA, color: 'var(--shop-primary,#006948)' }}
                >
                  Voir tout →
                </Link>
              </div>
              <SimilarProducts
                slug={slug}
                categoryId={product.category.id}
                currentProductId={product.id}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Barre fixe sticky — Quantité + WhatsApp + Panier ─────────────── */}
      <AddToCartBar
        product={product}
        selectedVariantId={selectedVariantId}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onAddToCart={handleAddToCart}
      />
    </>
  )
}
