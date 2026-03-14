'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ButtonLoading } from '@/components/ui/loading'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  image?: string // Base64 image data
  file?: {
    name: string
    type: string
    content: string // Text content or base64 for images
  }
}

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
}

const SYSTEM_PROMPT = `You are an expert programming instructor specializing in robotics and industrial automation.
Help students with:
- Python programming for robot control and automation
- Ladder Logic for PLCs and industrial control
- Doosan Dart Studio and Doosan Robot Language (DRL)
- HMI design and SCADA systems

You are integrated into Slate LMS (Learning Management System), a comprehensive educational platform built with Next.js, React, and Supabase.
Slate LMS was developed by Victor James Ordonez, a skilled full-stack developer specializing in modern web technologies and educational platforms.

When asked about the LMS or platform you're running on, mention:
- Platform: Slate LMS
- Developer: Victor James Ordonez
- Technologies: Next.js, React, TypeScript, Supabase, Tailwind CSS
- Purpose: Comprehensive learning management system for robotics and industrial automation education

Provide clear, educational responses with code examples when appropriate. Keep answers concise and practical.`

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-flash-lite'>('gemini-2.5-flash')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<{name: string, type: string, content: string} | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key')
    const savedModel = localStorage.getItem('gemini_model') as 'gemini-2.5-flash' | 'gemini-2.5-flash-lite'
    if (savedKey) {
      setApiKey(savedKey)
    } else {
      setShowApiKeyInput(true)
    }
    if (savedModel && (savedModel === 'gemini-2.5-flash' || savedModel === 'gemini-2.5-flash-lite')) {
      setSelectedModel(savedModel)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim())
      setShowApiKeyInput(false)
    }
  }

  const saveSettings = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim())
      localStorage.setItem('gemini_model', selectedModel)
      setShowSettings(false)
      setShowApiKeyInput(false)
    }
  }

  const getModelDisplayName = () => {
    switch (selectedModel) {
      case 'gemini-2.5-flash-lite':
        return 'Gemini 2.5 Flash-Lite'
      default:
        return 'Gemini 2.5 Flash'
    }
  }

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage && !selectedFile) || isLoading) return

    if (!apiKey) {
      setShowApiKeyInput(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      image: selectedImage || undefined,
      file: selectedFile || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setSelectedImage(null)
    setSelectedFile(null)
    setIsLoading(true)

    try {
      const conversationContext = messages.map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n')

      // Build parts array for the API request
      const parts: any[] = []
      
      // Add image if present
      if (userMessage.image) {
        const base64Data = userMessage.image.split(',')[1]
        const mimeType = userMessage.image.split(';')[0].split(':')[1]
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        })
      }
      
      // Add file content if present
      let fileContext = ''
      if (userMessage.file) {
        if (userMessage.file.type.startsWith('image/')) {
          // Handle image files
          const base64Data = userMessage.file.content.split(',')[1]
          const mimeType = userMessage.file.content.split(';')[0].split(':')[1]
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          })
          fileContext = `\n\nUser uploaded an image file: ${userMessage.file.name}`
        } else {
          // Handle text-based files
          fileContext = `\n\nUser uploaded a file: ${userMessage.file.name}\nFile content:\n\`\`\`\n${userMessage.file.content}\n\`\`\``
        }
      }
      
      // Add text with system prompt
      const textContent = userMessage.image || userMessage.file
        ? `${SYSTEM_PROMPT}${fileContext}\n\nUser asks: ${userMessage.content || 'Please analyze this file.'}`
        : `${SYSTEM_PROMPT}\n\n${conversationContext}\n\nUser: ${userMessage.content}\n\nAssistant:`
      
      parts.push({
        text: textContent
      })

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: parts
            }]
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to get response from AI')
      }

      const data = await response.json()
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from AI')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.candidates[0].content.parts[0].text,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('AI Error:', error)
      alert(`AI Error: ${error.message}\n\nMake sure you're using a valid Gemini API key from https://aistudio.google.com/app/apikey`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (confirm('Clear chat history?')) {
      setMessages([])
      setSelectedImage(null)
      setSelectedFile(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    const reader = new FileReader()

    // Handle different file types
    if (file.type.startsWith('image/')) {
      // Image files - read as data URL
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else if (
      file.type === 'text/plain' ||
      file.type === 'application/json' ||
      file.type === 'text/csv' ||
      file.type === 'text/html' ||
      file.type === 'text/css' ||
      file.type === 'text/javascript' ||
      file.type === 'application/javascript' ||
      file.type === 'application/x-python' ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.jsx') ||
      file.name.endsWith('.java') ||
      file.name.endsWith('.cpp') ||
      file.name.endsWith('.c') ||
      file.name.endsWith('.h') ||
      file.name.endsWith('.cs') ||
      file.name.endsWith('.php') ||
      file.name.endsWith('.rb') ||
      file.name.endsWith('.go') ||
      file.name.endsWith('.rs') ||
      file.name.endsWith('.swift') ||
      file.name.endsWith('.kt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.xml') ||
      file.name.endsWith('.yaml') ||
      file.name.endsWith('.yml') ||
      file.name.endsWith('.sql') ||
      file.name.endsWith('.sh') ||
      file.name.endsWith('.bat') ||
      file.name.endsWith('.log')
    ) {
      // Text-based files - read as text
      reader.onload = (event) => {
        setSelectedFile({
          name: file.name,
          type: file.type || 'text/plain',
          content: event.target?.result as string
        })
      }
      reader.readAsText(file)
    } else if (file.type === 'application/pdf') {
      alert('PDF support coming soon! For now, please copy and paste the text content.')
      return
    } else {
      alert('Unsupported file type. Supported: Images, Text files, Code files (.py, .js, .java, etc.)')
      return
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">AI Settings</h3>
            
            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Google Gemini API Key
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Get your FREE API key from{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                AI Model
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedModel('gemini-2.5-flash-lite')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedModel === 'gemini-2.5-flash-lite'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">Gemini 2.5 Flash-Lite</span>
                    {selectedModel === 'gemini-2.5-flash-lite' && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    ⚡ Fastest • 1,000 requests/day • Best for quick questions
                  </div>
                </button>

                <button
                  onClick={() => setSelectedModel('gemini-2.5-flash')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedModel === 'gemini-2.5-flash'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">Gemini 2.5 Flash</span>
                    {selectedModel === 'gemini-2.5-flash' && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    ⚖️ Balanced • 250 requests/day • Recommended for most users
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                disabled={!apiKey.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyInput && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Welcome to AI Assistant!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get started by entering your FREE Google Gemini API key and choosing your preferred model.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Key
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Get your FREE API key from{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Choose AI Model
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedModel('gemini-2.5-flash-lite')}
                  className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                    selectedModel === 'gemini-2.5-flash-lite'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Flash-Lite</div>
                      <div className="text-xs text-gray-600">⚡ Fastest • 1,000/day</div>
                    </div>
                    {selectedModel === 'gemini-2.5-flash-lite' && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setSelectedModel('gemini-2.5-flash')}
                  className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                    selectedModel === 'gemini-2.5-flash'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Flash (Recommended)</div>
                      <div className="text-xs text-gray-600">⚖️ Balanced • 250/day</div>
                    </div>
                    {selectedModel === 'gemini-2.5-flash' && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                disabled={!apiKey.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Continue
              </button>
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Window */}
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[calc(100vh-2rem)] md:h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base md:text-lg font-semibold text-white">AI Coding Assistant</h2>
              <p className="text-[10px] md:text-xs text-blue-100">Powered by {getModelDisplayName()}</p>
            </div>
          </div>
          <div className="flex gap-1 md:gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="API Settings"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={clearChat}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="Clear Chat"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-sm text-gray-500">Start a conversation with the AI assistant</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                        : 'bg-gradient-to-br from-green-500 to-teal-600'
                    }`}>
                      {message.role === 'user' ? (
                        <span className="text-white font-bold text-sm">
                          {user?.profile?.first_name?.charAt(0) || 'U'}
                        </span>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                    </div>
                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-4 py-2 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                      }`}>
                        {message.image && (
                          <img 
                            src={message.image} 
                            alt="Uploaded" 
                            className="rounded-lg mb-2 max-w-full h-auto max-h-64 object-contain"
                          />
                        )}
                        {message.file && !message.file.type.startsWith('image/') && (
                          <div className="mb-2 p-2 bg-gray-100 rounded-lg border border-gray-300">
                            <div className="flex items-center gap-2 text-xs">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-medium">{message.file.name}</span>
                            </div>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {message.content}
                        </div>
                      </div>
                      <div className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-gray-200 bg-white rounded-b-2xl">
          {(selectedImage || selectedFile) && (
            <div className="mb-2 flex gap-2">
              {selectedImage && (
                <div className="relative inline-block">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="h-20 w-20 object-cover rounded-lg border-2 border-blue-500"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              {selectedFile && (
                <div className="relative inline-block p-3 bg-gray-100 rounded-lg border-2 border-blue-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{selectedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt,.py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.h,.cs,.php,.rb,.go,.rs,.swift,.kt,.md,.json,.xml,.yaml,.yml,.sql,.sh,.bat,.log,.html,.css"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload File (Images, Code, Text)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Python, Ladder Logic, Doosan Dart, or HMI..."
              className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm md:text-base"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && !selectedImage && !selectedFile) || isLoading}
              className="px-4 md:px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <ButtonLoading />
              ) : (
                <>
                  <span className="hidden sm:inline text-sm md:text-base">Send</span>
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] md:text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line • Click 📎 to upload files (images, code, text) • FREE with Google Gemini
          </p>
        </div>
      </div>
    </div>
  )
}
