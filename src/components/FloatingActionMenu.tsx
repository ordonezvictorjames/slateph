'use client'

import { useState } from 'react'

interface FloatingActionMenuProps {
  onOpenPython: () => void
  onOpenAI: () => void
  onOpenChat: () => void
}

export default function FloatingActionMenu({ onOpenPython, onOpenAI, onOpenChat }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false) // Close menu after action
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {/* Menu Items - appear when open */}
      <div className={`absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {/* Python IDE Button */}
        <div className="flex items-center gap-3">
          <span className={`bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
          }`} style={{ transitionDelay: '100ms' }}>
            Python IDE
          </span>
          <button
            onClick={() => handleAction(onOpenPython)}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110"
            title="Slate Python IDE"
            style={{ transitionDelay: '150ms' }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
        </div>

        {/* AI Assistant Button */}
        <div className="flex items-center gap-3">
          <span className={`bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
          }`} style={{ transitionDelay: '200ms' }}>
            AI Assistant
          </span>
          <button
            onClick={() => handleAction(onOpenAI)}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110"
            title="AI Assistant"
            style={{ transitionDelay: '200ms' }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        </div>

        {/* Chat Button */}
        <div className="flex items-center gap-3">
          <span className={`bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
          }`} style={{ transitionDelay: '300ms' }}>
            Group Chat
          </span>
          <button
            onClick={() => handleAction(onOpenChat)}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110 hover:bg-primary-600"
            title="Open Chat"
            style={{ transitionDelay: '250ms' }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Menu Button */}
      <button
        onClick={toggleMenu}
        className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110 ${
          isOpen ? 'rotate-45 shadow-2xl' : 'rotate-0'
        }`}
        title="Quick Actions"
      >
        <svg 
          className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          )}
        </svg>
      </button>

      {/* Backdrop - close menu when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 -z-10" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}