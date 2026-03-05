'use client'

import { useState, useEffect, useRef } from 'react'
import { ButtonLoading } from '@/components/ui/loading'

// Declare Skulpt global
declare global {
  interface Window {
    Sk: any
  }
}

interface PythonPlaygroundProps {
  isOpen: boolean
  onClose: () => void
}

export default function PythonPlayground({ isOpen, onClose }: PythonPlaygroundProps) {
  const [code, setCode] = useState(`# Welcome to Slate Python IDE!
# Write your Python code here and click Run

def greet(name):
    return "Hello, " + name + "!"

print(greet("World"))

# Try some algorithms:
# Fibonacci sequence
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print("Fibonacci(10) =", fibonacci(10))
`)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [skulptReady, setSkulptReady] = useState(false)
  const [loadingSkulpt, setLoadingSkulpt] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)

  // Syntax highlighting function
  const highlightCode = (code: string) => {
    // Escape HTML entities
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    return code
      .split('\n')
      .map(line => {
        // Check if line is a comment
        const trimmed = line.trim()
        if (trimmed.startsWith('#')) {
          return `<span style="color: #4ade80;">${escapeHtml(line)}</span>` // green for comments
        }
        return `<span style="color: white;">${escapeHtml(line)}</span>` // white for code
      })
      .join('\n')
  }

  // Update highlight when code changes
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.innerHTML = highlightCode(code)
    }
  }, [code])

  // Force initial highlight render when modal opens
  useEffect(() => {
    if (isOpen && highlightRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.innerHTML = highlightCode(code)
        }
      }, 50)
    }
  }, [isOpen])

  // Load Skulpt when component mounts
  useEffect(() => {
    if (isOpen && !skulptReady && !loadingSkulpt) {
      loadSkulpt()
    }
  }, [isOpen])

  const loadSkulpt = async () => {
    setLoadingSkulpt(true)
    setOutput('Loading Python environment...\n')
    
    try {
      // Load Skulpt from CDN
      const script1 = document.createElement('script')
      script1.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js'
      script1.async = false
      
      const script2 = document.createElement('script')
      script2.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js'
      script2.async = false
      
      script1.onload = () => {
        script2.onload = () => {
          setSkulptReady(true)
          setOutput('✓ Python environment ready! You can now run your code.\n')
          setLoadingSkulpt(false)
        }
        
        script2.onerror = () => {
          setOutput('Failed to load Python environment. Please check your internet connection.\n')
          setLoadingSkulpt(false)
        }
        
        document.body.appendChild(script2)
      }
      
      script1.onerror = () => {
        setOutput('Failed to load Python environment. Please check your internet connection.\n')
        setLoadingSkulpt(false)
      }
      
      document.body.appendChild(script1)
    } catch (error: any) {
      setOutput(`Error: ${error.message}\n`)
      setLoadingSkulpt(false)
    }
  }

  const runCode = async () => {
    if (!skulptReady || !window.Sk) {
      setOutput('Python environment not ready. Please wait...\n')
      return
    }

    setIsRunning(true)
    setOutput('')

    try {
      let outputText = ''
      
      // Configure Skulpt
      window.Sk.configure({
        output: (text: string) => {
          outputText += text
        },
        read: (filename: string) => {
          if (window.Sk.builtinFiles === undefined || window.Sk.builtinFiles.files[filename] === undefined) {
            throw new Error(`File not found: '${filename}'`)
          }
          return window.Sk.builtinFiles.files[filename]
        }
      })

      // Run the code
      await window.Sk.misceval.asyncToPromise(() => {
        return window.Sk.importMainWithBody('<stdin>', false, code, true)
      })

      // Display output
      if (outputText.trim()) {
        setOutput(outputText)
      } else {
        setOutput('✓ Code executed successfully (no output)')
      }
    } catch (error: any) {
      setOutput(`Error: ${error.toString()}`)
    } finally {
      setIsRunning(false)
    }
  }

  const clearOutput = () => {
    setOutput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newCode = code.substring(0, start) + '    ' + code.substring(end)
      setCode(newCode)

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
    }

    // Ctrl/Cmd + Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runCode()
    }
  }

  const loadExample = (example: string) => {
    const examples: Record<string, string> = {
      hello: `# Hello World
print("Hello, World!")
print("Welcome to Python!")`,
      
      fibonacci: `# Fibonacci Sequence
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

for i in range(10):
    print("Fibonacci(" + str(i) + ") =", fibonacci(i))`,
      
      sorting: `# Bubble Sort Algorithm
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
print("Original:", numbers)
print("Sorted:", bubble_sort(numbers.copy()))`,
      
      loops: `# Loops and Conditionals
# For loop
print("For loop:")
for i in range(1, 6):
    print("  " + str(i) + " squared =", i**2)

# While loop
print("\\nWhile loop:")
count = 1
while count <= 5:
    print("  Count:", count)
    count += 1

# If-elif-else
print("\\nConditionals:")
score = 85
if score >= 90:
    print("  Grade: A")
elif score >= 80:
    print("  Grade: B")
else:
    print("  Grade: C")`,
      
      lists: `# Working with Lists
# Create a list
fruits = ["apple", "banana", "cherry", "date"]
print("Fruits:", fruits)

# List operations
fruits.append("elderberry")
print("After append:", fruits)

fruits.remove("banana")
print("After remove:", fruits)

# List comprehension
squares = [x**2 for x in range(1, 6)]
print("Squares:", squares)

# Filtering
even_squares = [x for x in squares if x % 2 == 0]
print("Even squares:", even_squares)`
    }

    setCode(examples[example] || examples.hello)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-2 md:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-[95vh] sm:max-w-7xl md:h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-500 to-blue-600">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white rounded-lg sm:rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white">Slate Python IDE</h2>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-green-100">
                {skulptReady ? 'Ready to code!' : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={clearOutput}
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-white/20 text-white rounded-md sm:rounded-lg hover:bg-white/30 transition-colors text-[10px] sm:text-xs md:text-sm"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 md:p-2 hover:bg-white/20 rounded-md sm:rounded-lg transition-colors text-white"
            >
              <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Examples Bar */}
        <div className="p-1.5 sm:p-2 md:p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Examples:</span>
            {['hello', 'fibonacci', 'sorting', 'loops', 'lists'].map((example) => (
              <button
                key={example}
                onClick={() => loadExample(example)}
                className="px-2 sm:px-2 md:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors whitespace-nowrap flex-shrink-0"
              >
                {example.charAt(0).toUpperCase() + example.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Editor and Output */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Code Editor */}
          <div className="h-1/2 md:h-auto md:flex-1 flex flex-col border-b md:border-b-0 md:border-r border-gray-200">
            <div className="p-1.5 sm:p-2 md:p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700">Code Editor</h3>
              <button
                onClick={runCode}
                disabled={isRunning || !skulptReady}
                className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-green-600 text-white rounded-md sm:rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm"
              >
                {isRunning ? (
                  <>
                    <ButtonLoading />
                    <span className="hidden sm:inline">Running...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Run</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
              {/* Syntax highlighted background */}
              <pre
                ref={highlightRef}
                className="absolute inset-0 p-2 sm:p-3 md:p-4 font-mono text-[10px] sm:text-xs md:text-sm overflow-auto pointer-events-none bg-gray-900 z-0"
                style={{
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
                aria-hidden="true"
              />
              {/* Transparent textarea overlay */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={(e) => {
                  // Sync scroll between textarea and highlight
                  if (highlightRef.current) {
                    highlightRef.current.scrollTop = e.currentTarget.scrollTop
                    highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
                  }
                }}
                className="absolute inset-0 p-2 sm:p-3 md:p-4 font-mono text-[10px] sm:text-xs md:text-sm resize-none focus:outline-none bg-transparent caret-white z-10 selection:bg-blue-500/30"
                style={{
                  caretColor: 'white',
                  lineHeight: '1.5',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent'
                }}
                spellCheck={false}
                placeholder="Write your Python code here..."
              />
            </div>
            <div className="p-1.5 sm:p-2 border-t border-gray-700 bg-gray-800 text-[9px] sm:text-[10px] md:text-xs text-gray-400">
              <span className="hidden md:inline">Press Ctrl+Enter to run • Tab for indentation</span>
              <span className="md:hidden">Tap Run button above</span>
            </div>
          </div>

          {/* Output */}
          <div className="h-1/2 md:h-auto md:flex-1 flex flex-col bg-gray-900">
            <div className="p-1.5 sm:p-2 md:p-3 border-b border-gray-700 bg-gray-800">
              <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-300">Output</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
              <pre className="font-mono text-[10px] sm:text-xs md:text-sm text-gray-300 whitespace-pre-wrap break-words">
                {output || 'Output will appear here...'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
