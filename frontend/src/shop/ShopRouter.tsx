import { Routes, Route } from 'react-router-dom'
import ShopLayout from '@/shop/components/layout/ShopLayout'
import ShopHomePage from '@/shop/pages/ShopHomePage'
import ShopCatalogPage from '@/shop/pages/ShopCatalogPage'
import ShopProductDetailPage from '@/shop/pages/ShopProductDetailPage'

export default function ShopRouter() {
  return (
    <Routes>
      <Route element={<ShopLayout />}>
        <Route index                       element={<ShopHomePage />} />
        <Route path="catalog"              element={<ShopCatalogPage />} />
        <Route path="products/:productId"  element={<ShopProductDetailPage />} />
      </Route>
    </Routes>
  )
}
