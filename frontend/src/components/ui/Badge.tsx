import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'
type Size    = 'sm' | 'md'

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  info:    'bg-brand-secondary/10 text-brand-secondary',
  brand:   'bg-brand-primary/10 text-brand-primary',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

interface BadgeProps {
  variant?: Variant
  size?: Size
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-gray-500':   variant === 'default',
            'bg-green-500':  variant === 'success',
            'bg-amber-500':  variant === 'warning',
            'bg-red-500':    variant === 'danger',
            'bg-brand-secondary': variant === 'info',
            'bg-brand-primary': variant === 'brand',
          })}
        />
      )}
      {children}
    </span>
  )
}
