import { ReactNode } from 'react'
import { tokens } from './tokens'

type HeadingProps = {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

type TextProps = {
  children: ReactNode
  className?: string
  variant?: 'body' | 'lead' | 'small' | 'caption'
  weight?: keyof typeof tokens.typography.fontWeight
}

export function Heading({ 
  children, 
  className = '', 
  as = 'h2' 
}: HeadingProps) {
  const Component = as
  
  const sizeClasses = {
    h1: 'text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight',
    h2: 'text-4xl sm:text-5xl font-bold tracking-tight',
    h3: 'text-3xl sm:text-4xl font-semibold',
    h4: 'text-2xl sm:text-3xl font-semibold',
    h5: 'text-xl sm:text-2xl font-medium',
    h6: 'text-lg sm:text-xl font-medium',
  }
  
  return (
    <Component className={`${sizeClasses[as]} ${className}`}>
      {children}
    </Component>
  )
}

export function Text({ 
  children, 
  className = '', 
  variant = 'body',
  weight = 'normal'
}: TextProps) {
  const variantClasses = {
    body: 'text-base',
    lead: 'text-lg sm:text-xl',
    small: 'text-sm',
    caption: 'text-xs',
  }
  
  const weightClasses = {
    thin: 'font-thin',
    extralight: 'font-extralight',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
    black: 'font-black',
  }
  
  return (
    <p className={`${variantClasses[variant]} ${weightClasses[weight]} ${className}`}>
      {children}
    </p>
  )
}

export function Badge({ 
  children, 
  variant = 'default',
  className = '' 
}: {
  children: ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  className?: string
}) {
  const variantClasses = {
    default: 'bg-neutral-100 text-neutral-700',
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-secondary-100 text-secondary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}