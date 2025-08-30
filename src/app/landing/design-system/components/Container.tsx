import { ReactNode } from 'react'

type ContainerProps = {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
}

export function Container({
  children,
  className = '',
  maxWidth = 'xl',
  padding = true,
}: ContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }
  
  const paddingClass = padding ? 'px-4 sm:px-6 lg:px-8' : ''
  
  return (
    <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${paddingClass} ${className}`}>
      {children}
    </div>
  )
}

type SectionProps = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  background?: 'white' | 'gray' | 'primary' | 'secondary' | 'gradient'
}

export function Section({
  children,
  className = '',
  padding = 'xl',
  background = 'white',
}: SectionProps) {
  const paddingClasses = {
    sm: 'py-8 sm:py-12',
    md: 'py-12 sm:py-16',
    lg: 'py-16 sm:py-20',
    xl: 'py-20 sm:py-24',
    '2xl': 'py-24 sm:py-32',
  }
  
  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-neutral-50',
    primary: 'bg-primary-50',
    secondary: 'bg-secondary-50',
    gradient: 'bg-gradient-to-br from-primary-50 via-white to-secondary-50',
  }
  
  return (
    <section className={`${paddingClasses[padding]} ${backgroundClasses[background]} ${className}`}>
      {children}
    </section>
  )
}