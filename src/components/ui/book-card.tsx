import React from 'react'

interface BookCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  spine?: boolean
  onClick?: () => void
}

export function BookCard({ 
  children, 
  className = '', 
  hover = true,
  spine = false,
  onClick 
}: BookCardProps) {
  const baseStyles = 'bg-white rounded-lg shadow-soft border border-fern-100 p-6 transition-all duration-300'
  const hoverStyles = hover ? 'hover:shadow-soft-lg hover:border-fern-200 hover:-translate-y-1 cursor-pointer' : ''
  const spineStyles = spine ? 'book-spine' : ''
  
  return (
    <div 
      className={`${baseStyles} ${hoverStyles} ${spineStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface BookCardHeaderProps {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function BookCardHeader({ children, icon, className = '' }: BookCardHeaderProps) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 bg-fern-100 rounded-xl flex items-center justify-center text-fern-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-display font-bold text-hunter-900">{children}</h3>
    </div>
  )
}

interface BookCardContentProps {
  children: React.ReactNode
  className?: string
}

export function BookCardContent({ children, className = '' }: BookCardContentProps) {
  return (
    <div className={`text-pine-600 ${className}`}>
      {children}
    </div>
  )
}

interface BookCardFooterProps {
  children: React.ReactNode
  className?: string
}

export function BookCardFooter({ children, className = '' }: BookCardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-dust-200 ${className}`}>
      {children}
    </div>
  )
}
