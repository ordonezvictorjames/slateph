import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'leaf' | 'wood' | 'earth' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({ 
  children, 
  variant = 'leaf', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full border transition-all duration-200'
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  }
  
  const variantStyles = {
    leaf: 'bg-fern-100 text-fern-700 border-fern-200 hover:bg-fern-200',
    wood: 'bg-sage-100 text-sage-700 border-sage-200 hover:bg-sage-200',
    earth: 'bg-dust-100 text-dust-700 border-dust-200 hover:bg-dust-200',
    success: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
    error: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  }

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
