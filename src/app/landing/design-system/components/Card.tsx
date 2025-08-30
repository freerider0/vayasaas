import { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  hover?: boolean
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none'
  padding?: 'sm' | 'md' | 'lg' | 'xl' | 'none'
}

export function Card({
  children,
  className = '',
  hover = false,
  shadow = 'md',
  padding = 'lg',
}: CardProps) {
  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    none: '',
  }
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
    none: '',
  }
  
  const hoverClass = hover ? 'transition-transform hover:scale-105 hover:shadow-xl' : ''
  
  return (
    <div
      className={`bg-white rounded-xl ${shadowClasses[shadow]} ${paddingClasses[padding]} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  )
}

type CardHeaderProps = {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

type CardContentProps = {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

type CardFooterProps = {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-6 pt-6 border-t border-neutral-200 ${className}`}>
      {children}
    </div>
  )
}