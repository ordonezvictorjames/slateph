'use client'

import { useState, useEffect } from 'react'

interface Module {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  duration_minutes?: number
  canva_url?: string
  conference_url?: string
  text_content?: string
  video_url?: string
  document_url?: string
  created_at: string
}

interface LessonViewerProps {
  module: Module
  isOpen: boolean
  onClose: () => void
}

export default function LessonViewer({ module, isOpen, onClose }: LessonViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Debug: Log module data when component opens
  useEffect(() => {
    if (isOpen) {
      console.log('LessonViewer opened with module:', module)
      console.log('Module video_url:', module.video_url)
    }
  }, [isOpen, module])

  // Auto-redirect to conference URL when opening an online conference module
  useEffect(() => {
    if (isOpen && module.content_type === 'online_conference' && module.conference_url) {
      window.open(module.conference_url, '_blank')
    }
  }, [isOpen, module.content_type, module.conference_url])

  if (!isOpen) return null

  // Helper function to get Canva embed URL
  const getCanvaEmbedUrl = (canvaUrl: string) => {
    try {
      // Convert Canva share URL to embed URL
      if (canvaUrl.includes('canva.com/design/')) {
        const designId = canvaUrl.match(/design\/([^\/\?]+)/)?.[1]
        if (designId) {
          return `https://www.canva.com/design/${designId}/view?embed`
        }
      }
      return canvaUrl
    } catch (error) {
      console.error('Error processing Canva URL:', error)
      return canvaUrl
    }
  }

  // Helper function to get content type icon
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      case 'online_conference':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      case 'online_document':
      case 'pdf_document':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      case 'canva_presentation':
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zm-4 3v14h14V6H5zm2 3h10v2H7V9zm0 4h10v2H7v-2z" /></svg>
      default:
        return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
    }
  }

  // Helper function to render lesson content
  const renderLessonContent = () => {
    switch (module.content_type) {
      case 'canva_presentation':
        if (module.canva_url) {
          const embedUrl = getCanvaEmbedUrl(module.canva_url)
          return (
            <div className="w-full h-full">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0 rounded-lg"
                allowFullScreen
                title={`${module.title} - Canva Presentation`}
              />
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">No Presentation URL</h3>
              <p className="text-gray-600">This Canva presentation module doesn't have a valid URL.</p>
            </div>
          </div>
        )
      
      case 'text':
        return (
          <div className="w-full h-full p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-8">
                <h1 className="text-3xl font-bold text-black mb-6">{module.title}</h1>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed text-lg mb-8">{module.description}</p>
                  
                  {/* Display actual text content */}
                  {module.text_content ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-black mb-4">Lesson Content</h3>
                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {module.text_content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <p className="text-yellow-800">No text content available for this lesson yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'video':
        if (module.video_url) {
          // Helper function to get YouTube embed URL
          const getYouTubeEmbedUrl = (url: string) => {
            try {
              const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/)?.[1]
              if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`
              }
              return url
            } catch (error) {
              return url
            }
          }

          // Helper function to get Vimeo embed URL
          const getVimeoEmbedUrl = (url: string) => {
            try {
              const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
              if (videoId) {
                return `https://player.vimeo.com/video/${videoId}`
              }
              return url
            } catch (error) {
              return url
            }
          }

          let embedUrl = module.video_url
          if (module.video_url.includes('youtube.com') || module.video_url.includes('youtu.be')) {
            embedUrl = getYouTubeEmbedUrl(module.video_url)
          } else if (module.video_url.includes('vimeo.com')) {
            embedUrl = getVimeoEmbedUrl(module.video_url)
          }

          return (
            <div className="w-full h-full flex flex-col bg-black">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-6xl aspect-video">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title={module.title}
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-900">
                <h3 className="text-xl font-semibold text-white mb-2">{module.title}</h3>
                <p className="text-gray-300">{module.description}</p>
              </div>
            </div>
          )
        }
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <div className="w-20 h-20 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-4">No Video URL</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">This video lesson doesn't have a valid video URL.</p>
            </div>
          </div>
        )
      
      case 'online_conference':
        return (
          <div className="w-full h-full p-8 overflow-y-auto bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-black mb-4">{module.title}</h1>
                  <p className="text-gray-600 text-lg">{module.description}</p>
                </div>
                
                {module.conference_url ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                      <div className="flex items-start">
                        <svg className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="text-lg font-semibold text-green-800 mb-2">Conference Opened</h3>
                          <p className="text-green-700 mb-3">
                            A new tab has been opened with your conference link. If it didn't open automatically, click the button below.
                          </p>
                          <ul className="list-disc list-inside text-green-700 space-y-1 text-sm">
                            <li>Make sure your camera and microphone are working</li>
                            <li>Duration: {module.duration_minutes ? `${module.duration_minutes} minutes` : 'To be announced'}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <a 
                        href={module.conference_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Open Conference Again
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-3">Conference Details</h3>
                      <ul className="list-disc list-inside text-yellow-700 space-y-2">
                        <li>Join the online conference at the scheduled time</li>
                        <li>Make sure your camera and microphone are working</li>
                        <li>Duration: {module.duration_minutes ? `${module.duration_minutes} minutes` : 'To be announced'}</li>
                      </ul>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-gray-100 rounded-lg p-8">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Conference Link</h3>
                        <p className="text-gray-600 mb-6">The conference link will be available closer to the scheduled time.</p>
                        <div className="inline-flex items-center px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Link Not Available
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      
      case 'online_document':
      case 'pdf_document':
      case 'slide_presentation':
        console.log('=== DOCUMENT/PRESENTATION MODULE DEBUG ===')
        console.log('Full module data:', JSON.stringify(module, null, 2))
        console.log('Document URL:', module.document_url)
        console.log('Content type:', module.content_type)
        console.log('==========================================')
        
        if (module.document_url) {
          // Helper function to get Google Docs embed URL
          const getGoogleDocsEmbedUrl = (url: string) => {
            try {
              if (url.includes('docs.google.com/document')) {
                const docId = url.match(/\/d\/([^\/]+)/)?.[1]
                if (docId) {
                  return `https://docs.google.com/document/d/${docId}/preview`
                }
              } else if (url.includes('docs.google.com/presentation')) {
                const docId = url.match(/\/d\/([^\/]+)/)?.[1]
                if (docId) {
                  return `https://docs.google.com/presentation/d/${docId}/embed`
                }
              } else if (url.includes('drive.google.com/file')) {
                const fileId = url.match(/\/d\/([^\/]+)/)?.[1]
                if (fileId) {
                  return `https://drive.google.com/file/d/${fileId}/preview`
                }
              }
              return url
            } catch (error) {
              return url
            }
          }

          const embedUrl = getGoogleDocsEmbedUrl(module.document_url)
          const isSupabaseStorage = module.document_url.includes('supabase.co/storage')
          const contentTypeLabel = module.content_type === 'slide_presentation' ? 'Slide Presentation' : 
                                   module.content_type === 'pdf_document' ? 'PDF Document' : 'Document'

          return (
            <div className="w-full h-full flex flex-col bg-gray-100">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full h-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden">
                  {(module.content_type === 'pdf_document' || module.content_type === 'slide_presentation') && isSupabaseStorage ? (
                    // Use iframe for Supabase Storage PDFs and presentations with #toolbar=0 to hide toolbar
                    <iframe
                      src={`${module.document_url}#toolbar=0`}
                      className="w-full h-full border-0"
                      title={`${module.title} - ${contentTypeLabel}`}
                    />
                  ) : (
                    // Use iframe for Google Docs and other documents
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0"
                      title={`${module.title} - ${contentTypeLabel}`}
                    />
                  )}
                </div>
              </div>
              <div className="p-6 bg-gray-900">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{module.title}</h3>
                    <p className="text-gray-300">{module.description}</p>
                  </div>
                  <a
                    href={module.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in New Tab
                  </a>
                </div>
              </div>
            </div>
          )
        }
        return (
          <div className="w-full h-full p-8 overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-black">{module.title}</h1>
                    <p className="text-gray-600">Document Resource</p>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">No Document URL</h3>
                  <p className="text-red-700 mb-4">This document module doesn't have a valid document URL.</p>
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Content Preview</h3>
              <p className="text-gray-600">{module.description}</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col">
        {/* Floating Close Button - Always Visible */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Close lesson"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getContentTypeIcon(module.content_type)}
              <h2 className="text-xl font-semibold text-white">{module.title}</h2>
            </div>
            <span className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full">
              {module.content_type === 'canva_presentation' ? 'Canva Presentation' : module.content_type}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {module.duration_minutes && (
              <span className="text-white text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                {module.duration_minutes} min
              </span>
            )}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isFullscreen ? "M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" : "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"} />
              </svg>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Close lesson"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="w-full h-full bg-white rounded-lg overflow-hidden">
            {renderLessonContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-white text-sm">
              <p className="opacity-75">{module.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close Lesson
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}