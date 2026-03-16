'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string | number | null | undefined
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => String(o.value) === String(value ?? ''))

  // Position the portal dropdown under the trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const base =
    'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white flex items-center justify-between cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent'

  const dropdown = open ? (
    <ul
      ref={listRef}
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto py-1"
    >
      {options.map((opt) => (
        <li
          key={opt.value}
          onMouseDown={(e) => {
            e.preventDefault()
            onChange(opt.value)
            setOpen(false)
          }}
          className={`px-3 py-2 text-sm cursor-pointer transition-colors
            ${String(value ?? '') === String(opt.value)
              ? 'bg-primary-700 text-white'
              : 'text-gray-700 hover:bg-primary-700 hover:text-white'
            }`}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  ) : null

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${base} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-primary-400'} ${open ? 'ring-2 ring-primary-400 border-transparent' : ''}`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {typeof window !== 'undefined' && open && createPortal(dropdown, document.body)}
    </div>
  )
}
