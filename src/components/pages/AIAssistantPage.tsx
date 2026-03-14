'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ButtonLoading } from '@/components/ui/loading'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  language?: 'python' | 'ladder' | 'dart' | 'hmi' | 'general'
}

type ProgrammingLanguage = 'python' | 'ladder' | 'dart' | 'hmi' | 'general'
type AIProvider = 'gemini' | 'openai'
type AIModel = 'gemini-2.0-flash-exp' | 'gemini-pro' | 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo'

const SYSTEM_PROMPTS = {
  python: `You are an expert Python programming instructor specializing in robotics and automation. 
Help students with Python code for robot control, data processing, and automation tasks. 
Provide clear explanations, best practices, and working code examples.`,
  
  ladder: `You are an expert in Ladder Logic programming for PLCs (Programmable Logic Controllers).
Help students understand ladder diagrams, relay logic, timers, counters, and industrial automation sequences.
Explain concepts clearly and provide practical examples for manufacturing and automation.`,
  
  dart: `You are an expert in Doosan Dart Studio and Doosan Robot Language (DRL).
Help students with robot programming, motion commands, I/O operations, and robot automation.
Provide clear examples of DRL syntax, motion planning, and safety considerations.
Key commands include: movej, movel, movejx, movelx, wait, set_digital_output, get_digital_input, etc.`,
  
  hmi: `You are an expert in Human-Machine Interface (HMI) design and programming.
Help students with HMI development, SCADA systems, touchscreen interfaces, and industrial visualization.
Provide guidance on user interface design, data visualization, and operator interaction.`,
  
  general: `You are a helpful AI assistant specializing in robotics, automation, and industrial programming.
You can help with Python, Ladder Logic, Doosan Dart Studio, and HMI programming.
Provide clear, educational responses with code examples when appropriate.`
}

export default function AIAssistantPage() {
  const { user } = useAuth()
  const { showError } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>('general')
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini')
  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-2.0-flash-exp')
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Load API key, provider, and model from localStorage
    const savedKey = localStorage.getItem('ai_api_key')
    const savedProvider = localStorage.getItem('ai_provider') as AIProvider
    const savedModel = localStorage.getItem('ai_model') as AIModel
    
    if (savedKey) {
      setApiKey(savedKey)
    } else {
      setShowApiKeyInput(true)
    }
    if (savedProvider) {
      setSelectedProvider(savedProvider)
    }
    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim())
      setShowApiKeyInput(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    if (!apiKey) {
      showError('API Key Required', 'Please enter your OpenAI API key to use the AI assistant')
      setShowApiKeyInput(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      language: selectedLanguage
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Prepare messages for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      if (selectedProvider === 'gemini') {
        // Google Gemini API - Simplified request format
        // Map model names to ensure compatibility
        let modelName = selectedModel
        if (selectedModel === 'gemini-2.0-flash-exp') {
          modelName = 'gemini-2.0-flash-exp'
        } else if (selectedModel === 'gemini-pro') {
          // Fallback to 2.0 flash if gemini-pro not available
          modelName = 'gemini-2.0-flash-exp'
        }
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${SYSTEM_PROMPTS[selectedLanguage]}\n\nConversation history:\n${
                    messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
                  }\n\nUser: ${userMessage.content}\n\nAssistant:`
                }]
              }]
            })
          }
        )

        if (!response.ok) {
          const error = await response.json()
          console.error('Gemini API Error:', error)
          throw new Error(error.error?.message || `Failed to get response from Gemini. Model: ${modelName}. Try selecting "Gemini 2.0 Flash" in Settings.`)
        }

        const data = await response.json()
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error('Invalid response from Gemini API')
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.candidates[0].content.parts[0].text,
          timestamp: new Date(),
          language: selectedLanguage
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        // OpenAI API
        const apiMessages = [
          {
            role: 'system',
            content: SYSTEM_PROMPTS[selectedLanguage]
          },
          ...messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          {
            role: 'user',
            content: userMessage.content
          }
        ]

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 2000
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Failed to get response from AI')
        }

        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date(),
          language: selectedLanguage
        }

        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error: any) {
      console.error('Error calling OpenAI API:', error)
      showError('AI Error', error.message || 'Failed to get response from AI assistant')
      
      // Remove the user message if API call failed
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([])
    }
  }

  const getLanguageIcon = (lang: ProgrammingLanguage) => {
    switch (lang) {
      case 'python':
        return '🐍'
      case 'ladder':
        return '⚡'
      case 'dart':
        return '🤖'
      case 'hmi':
        return '🖥️'
      default:
        return '💬'
    }
  }

  const getLanguageColor = (lang: ProgrammingLanguage) => {
    switch (lang) {
      case 'python':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'ladder':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'dart':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'hmi':
        return 'bg-green-100 text-green-700 border-green-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getModelInfo = (model: AIModel) => {
    switch (model) {
      case 'gemini-2.0-flash-exp':
        return { name: 'Gemini 2.0 Flash', speed: 'Very Fast', cost: 'FREE', quality: 'Excellent', provider: 'Google' }
      case 'gemini-pro':
        return { name: 'Gemini Pro', speed: 'Fast', cost: 'FREE', quality: 'Good', provider: 'Google' }
      case 'gemini-1.5-flash':
        return { name: 'Gemini 1.5 Flash', speed: 'Very Fast', cost: 'FREE', quality: 'Good', provider: 'Google', note: 'May require upgraded API key' }
      case 'gemini-1.5-pro':
        return { name: 'Gemini 1.5 Pro', speed: 'Fast', cost: 'FREE', quality: 'Excellent', provider: 'Google', note: 'May require upgraded API key' }
      case 'gpt-3.5-turbo':
        return { name: 'GPT-3.5 Turbo', speed: 'Fast', cost: 'Low', quality: 'Good', provider: 'OpenAI' }
      case 'gpt-4':
        return { name: 'GPT-4', speed: 'Moderate', cost: 'High', quality: 'Excellent', provider: 'OpenAI' }
      case 'gpt-4-turbo':
        return { name: 'GPT-4 Turbo', speed: 'Fast', cost: 'Moderate', quality: 'Excellent', provider: 'OpenAI' }
    }
  }

  const getProviderModels = (provider: AIProvider): AIModel[] => {
    if (provider === 'gemini') {
      return ['gemini-2.0-flash-exp', 'gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
    } else {
      return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">AI Assistant Settings</h3>
            
            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                AI Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setSelectedProvider('gemini')
                    setSelectedModel('gemini-1.5-flash')
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedProvider === 'gemini'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Google Gemini</span>
                    {selectedProvider === 'gemini' && (
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-green-600">✓ FREE</span>
                    </div>
                    <div>1,500 requests/day</div>
                    <div>Good for learning</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedProvider('openai')
                    setSelectedModel('gpt-3.5-turbo')
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedProvider === 'openai'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">OpenAI</span>
                    {selectedProvider === 'openai' && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-orange-600">$ Paid</span>
                    </div>
                    <div>Premium quality</div>
                    <div>Best for complex tasks</div>
                  </div>
                </button>
              </div>
            </div>

            {/* API Key Section */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {selectedProvider === 'gemini' ? 'Google AI Studio API Key' : 'OpenAI API Key'}
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Get your API key from{' '}
                <a 
                  href={selectedProvider === 'gemini' 
                    ? 'https://aistudio.google.com/app/apikey' 
                    : 'https://platform.openai.com/api-keys'
                  } 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  {selectedProvider === 'gemini' ? 'aistudio.google.com' : 'platform.openai.com'}
                </a>
                {selectedProvider === 'gemini' && (
                  <span className="ml-1 text-green-600 font-semibold">(FREE - No credit card needed!)</span>
                )}
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={selectedProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                AI Model
              </label>
              <div className="space-y-2">
                {getProviderModels(selectedProvider).map((model) => {
                  const info = getModelInfo(model)
                  return (
                    <button
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedModel === model
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{info.name}</span>
                        {selectedModel === model && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-600 flex-wrap">
                        <span>Speed: {info.speed}</span>
                        <span className={info.cost === 'FREE' ? 'text-green-600 font-semibold' : ''}>
                          Cost: {info.cost}
                        </span>
                        <span>Quality: {info.quality}</span>
                      </div>
                      {info.note && (
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ {info.note}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedProvider === 'gemini' 
                  ? '💡 Gemini 2.0 Flash is recommended (newest, fastest, and completely FREE!)'
                  : '💡 GPT-3.5 Turbo is recommended for most users (faster and cheaper)'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (apiKey.trim()) {
                    localStorage.setItem('ai_api_key', apiKey.trim())
                    localStorage.setItem('ai_provider', selectedProvider)
                    localStorage.setItem('ai_model', selectedModel)
                    setShowSettings(false)
                    setShowApiKeyInput(false)
                  }
                }}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Welcome to AI Assistant!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose your AI provider to get started. We recommend Google Gemini - it's completely FREE!
            </p>
            
            {/* Quick Provider Selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setSelectedProvider('gemini')
                  setSelectedModel('gemini-1.5-flash')
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedProvider === 'gemini'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900 mb-1">Google Gemini</div>
                  <div className="text-xs text-green-600 font-semibold">✓ FREE</div>
                  <div className="text-xs text-gray-600">No credit card</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedProvider('openai')
                  setSelectedModel('gpt-3.5-turbo')
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedProvider === 'openai'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900 mb-1">OpenAI</div>
                  <div className="text-xs text-orange-600 font-semibold">$ Paid</div>
                  <div className="text-xs text-gray-600">Premium quality</div>
                </div>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                API Key
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Get your {selectedProvider === 'gemini' ? 'FREE ' : ''}API key from{' '}
                <a 
                  href={selectedProvider === 'gemini' 
                    ? 'https://aistudio.google.com/app/apikey' 
                    : 'https://platform.openai.com/api-keys'
                  } 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  {selectedProvider === 'gemini' ? 'Google AI Studio' : 'OpenAI Platform'}
                </a>
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={selectedProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  saveApiKey()
                  setShowSettings(true)
                }}
                disabled={!apiKey.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Settings
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

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Coding Assistant</h1>
                <p className="text-sm text-gray-600">Specialized in Robotics & Automation</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={clearChat}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['general', 'python', 'ladder', 'dart', 'hmi'] as ProgrammingLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                  selectedLanguage === lang
                    ? getLanguageColor(lang) + ' font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{getLanguageIcon(lang)}</span>
                {lang === 'general' ? 'General' : 
                 lang === 'python' ? 'Python' :
                 lang === 'ladder' ? 'Ladder Logic' :
                 lang === 'dart' ? 'Doosan Dart' :
                 'HMI Design'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AI Coding Assistant!</h3>
              <p className="text-gray-600 mb-6">Ask me anything about:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🐍</div>
                  <div className="font-semibold text-sm">Python</div>
                  <div className="text-xs text-gray-600">Robot control & automation</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="font-semibold text-sm">Ladder Logic</div>
                  <div className="text-xs text-gray-600">PLC programming</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🤖</div>
                  <div className="font-semibold text-sm">Doosan Dart</div>
                  <div className="text-xs text-gray-600">Robot programming</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🖥️</div>
                  <div className="font-semibold text-sm">HMI Design</div>
                  <div className="text-xs text-gray-600">Interface development</div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                        : 'bg-gradient-to-br from-green-500 to-teal-600'
                    }`}>
                      {message.role === 'user' ? (
                        <span className="text-white font-bold text-sm">
                          {user?.profile?.first_name?.charAt(0) || 'U'}
                        </span>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
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
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
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
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${selectedLanguage === 'general' ? 'robotics programming' : 
                selectedLanguage === 'python' ? 'Python code' :
                selectedLanguage === 'ladder' ? 'Ladder Logic' :
                selectedLanguage === 'dart' ? 'Doosan Dart Studio' :
                'HMI design'}...`}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <ButtonLoading />
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line • Powered by {getModelInfo(selectedModel).name}
          </p>
        </div>
      </div>
    </div>
  )
}
