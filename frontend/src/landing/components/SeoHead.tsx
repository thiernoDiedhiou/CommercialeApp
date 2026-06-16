import { Helmet } from 'react-helmet-async'

interface SeoHeadProps {
  title:        string
  description:  string
  canonical?:   string
  noIndex?:     boolean
  ogImage?:     string
  ogType?:      'website' | 'article'
  jsonLd?:      object | object[]
}

const SITE_NAME      = 'DiDi Sphere'
const BASE_URL       = 'https://didisphere.shop'
const DEFAULT_OG_IMG = `${BASE_URL}/og-image.png`
const OG_IMG_W       = 1200
const OG_IMG_H       = 630

export default function SeoHead({
  title,
  description,
  canonical,
  noIndex  = false,
  ogImage  = DEFAULT_OG_IMG,
  ogType   = 'website',
  jsonLd,
}: SeoHeadProps) {
  const fullTitle    = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title"        content={fullTitle} />
      <meta property="og:description"  content={description} />
      <meta property="og:type"         content={ogType} />
      <meta property="og:site_name"    content={SITE_NAME} />
      <meta property="og:locale"       content="fr_SN" />
      <meta property="og:image"        content={ogImage} />
      <meta property="og:image:width"  content={String(OG_IMG_W)} />
      <meta property="og:image:height" content={String(OG_IMG_H)} />
      <meta property="og:image:alt"    content={fullTitle} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={ogImage} />
      <meta name="twitter:image:alt"   content={fullTitle} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  )
}
