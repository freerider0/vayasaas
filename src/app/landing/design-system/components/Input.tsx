import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

type InputProps = {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
  fullWidth?: boolean
  className?: string
} & InputHTMLAttributes<HTMLInputElement>

export function Input({
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  className = '',
  ...props
}: InputProps) {
  const widthClass = fullWidth ? 'w-full' : ''
  const errorClass = error ? 'border-error-500 focus:ring-error-500' : 'border-neutral-300 focus:ring-primary-500'
  
  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`
            block w-full rounded-lg border ${errorClass}
            ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2
            text-neutral-900 placeholder-neutral-400
            focus:outline-none focus:ring-2 focus:border-transparent
            transition-colors duration-200
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-error-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  )
}

type TextareaProps = {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  rows?: number
  className?: string
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({
  label,
  error,
  helperText,
  fullWidth = false,
  rows = 4,
  className = '',
  ...props
}: TextareaProps) {
  const widthClass = fullWidth ? 'w-full' : ''
  const errorClass = error ? 'border-error-500 focus:ring-error-500' : 'border-neutral-300 focus:ring-primary-500'
  
  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          block w-full rounded-lg border ${errorClass}
          px-3 py-2
          text-neutral-900 placeholder-neutral-400
          focus:outline-none focus:ring-2 focus:border-transparent
          transition-colors duration-200
          resize-y
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-error-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  )
}