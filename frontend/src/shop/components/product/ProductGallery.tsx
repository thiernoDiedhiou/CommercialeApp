interface Props {
  imageUrl    : string | null
  productName : string
}

export default function ProductGallery({ imageUrl, productName }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden aspect-square sm:aspect-[4/3] lg:aspect-auto lg:h-full w-full min-h-[280px]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <span className="text-6xl font-bold text-gray-300 select-none">
            {productName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}
