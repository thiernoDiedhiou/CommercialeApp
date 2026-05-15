import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getShopProduct } from '@/shop/services/shop'
import { useShopStore } from '@/shop/store/shopStore'
import { ProductGallery, VariantPicker, AddToCartBar } from '@/shop/components/product'
import { SkeletonGrid } from '@/shop/components/shared'

export default function ShopProductDetailPage() {
  const { slug = '', productId = '' } = useParams<{ slug: string; productId: string }>()
  const addItem  = useShopStore((s) => s.addItem)
  const openCart = useShopStore((s) => s.openCart)

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [quantity, setQuantity]                   = useState(1)

  const { data, isLoading } = useQuery({
    queryKey : ['shop-product', slug, productId],
    queryFn  : () => getShopProduct(slug, Number(productId)),
    staleTime: 2 * 60 * 1000,
    enabled  : !!slug && !!productId,
  })

  const product = data?.data

  // Stock à afficher selon le contexte
  const resolvedStock = (() => {
    if (!product) return null
    if (!product.has_variants) return product.stock_quantity ?? 0
    if (!selectedVariantId)   return null
    return product.variants.find((v) => v.id === selectedVariantId)?.stock_quantity ?? 0
  })()

  const handleAddToCart = () => {
    if (!product) return
    if (product.has_variants && !selectedVariantId) return

    const variant = product.variants.find((v) => v.id === selectedVariantId)
    const price   = variant?.price ?? product.price

    addItem({
      product_id     : product.id,
      variant_id     : selectedVariantId,
      product_name   : product.name,
      variant_name   : variant?.attribute_summary ?? null,
      image_url      : product.image_url,
      quantity,
      unit_price     : price,
      total          : price * quantity,
      is_weight_based: false,
      unit           : product.unit,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-500">
        Produit introuvable.
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={`/shop/${slug}`} className="hover:text-gray-600 transition-colors">
          Accueil
        </Link>
        <span>/</span>
        <Link to={`/shop/${slug}/catalog`} className="hover:text-gray-600 transition-colors">
          Catalogue
        </Link>
        <span>/</span>
        <span className="text-gray-700 truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* ── Contenu (2 colonnes desktop) ─────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 flex flex-col gap-6">

        {/* ── Colonne gauche — Galerie ───────────────────────────────────── */}
        <ProductGallery imageUrl={product.image_url} productName={product.name} />

        {/* ── Colonne droite — Infos ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 pb-24 lg:pb-0">

          {/* Catégorie */}
          {product.category && (
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {product.category.name}
            </span>
          )}

          {/* Nom */}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>
          )}

          <hr className="border-gray-100" />

          {/* VariantPicker */}
          {product.has_variants && (
            <VariantPicker
              product={product}
              selectedVariantId={selectedVariantId}
              onSelect={setSelectedVariantId}
            />
          )}

          {/* Badge stock */}
          {resolvedStock !== null && (
            resolvedStock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                En stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Rupture de stock
              </span>
            )
          )}

          {product.has_variants && !selectedVariantId && (
            <span className="text-sm text-gray-400 italic">
              Sélectionnez une option pour voir la disponibilité
            </span>
          )}

          {/* AddToCartBar */}
          <AddToCartBar
            product={product}
            selectedVariantId={selectedVariantId}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>
    </div>
  )
}
