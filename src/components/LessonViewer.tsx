'use client'

import { useState, useEffect } from 'react'

interface Module {
  id: string
  subject_id: string
  title: string
  description: string
  content_type: 'video' | 'text' | 'canva_presentation' | 'online_conference' | 'online_document' | 'pdf_document' | 'slide_presentation'
  order_index: number
  status?: 'active' | 'inactive' | 'draft'
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
  useEffect(() => {
    if (isOpen) {
      console.log('LessonViewer opened:', module.title, module.content_type)
      if (module.content_type === 'online_conference' && module.conference_url) {
        window.open(module.conference_url, '_blank')
      }
      // Hide body scrollbar when viewer is open
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      // Restore body scrollbar when viewer closes
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, module])

  // Add ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getCanvaEmbedUrl = (url: string) => {
    if (url.includes('canva.com/design/')) {
      const designId = url.match(/design\/([^\/\?]+)/)?.[1]
      if (designId) return `https://www.canva.com/design/${designId}/view?embed`
    }
    return url
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/)?.[1]
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }

  const getVimeoEmbedUrl = (url: string) => {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url
  }

  const getGoogleDocsEmbedUrl = (url: string) => {
    if (url.includes('docs.google.com/document')) {
      const docId = url.match(/\/d\/([^\/]+)/)?.[1]
      if (docId) return `https://docs.google.com/document/d/${docId}/preview`
    }
    if (url.includes('docs.google.com/presentation')) {
      const docId = url.match(/\/d\/([^\/]+)/)?.[1]
      if (docId) return `https://docs.google.com/presentation/d/${docId}/embed`
    }
    if (url.includes('drive.google.com/file')) {
      const fileId = url.match(/\/d\/([^\/]+)/)?.[1]
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return url
  }

  const renderContent = () => {
    switch (module.content_type) {
      case 'video':
        if (!module.video_url) {
          return (
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="text-center text-white">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-semibold mb-2">No Video URL</h3>
                <p className="text-gray-400">This video lesson doesn't have a valid video URL.</p>
              </div>
            </div>
          )
        }

        let videoEmbedUrl = module.video_url
        if (module.video_url.includes('youtube.com') || module.video_url.includes('youtu.be')) {
          videoEmbedUrl = getYouTubeEmbedUrl(module.video_url)
        } else if (module.video_url.includes('vimeo.com')) {
          videoEmbedUrl = getVimeoEmbedUrl(module.video_url)
        }

        return (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="w-full max-w-6xl aspect-video">
              <iframe
                src={videoEmbedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={module.title}
              />
            </div>
          </div>
        )

      case 'canva_presentation':
        if (!module.canva_url) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Presentation URL</h3>
                <p className="text-gray-600">This Canva presentation doesn't have a valid URL.</p>
              </div>
            </div>
          )
        }

        // Canva often blocks iframe embedding due to security restrictions
        // Show "Open in New Tab" button for better compatibility
        return (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-50 to-blue-50 p-6">
            <div className="text-center max-w-md">
              <svg className="w-20 h-20 mx-auto mb-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Canva Presentation</h3>
              <p className="text-gray-600 mb-6">
                For the best viewing experience, open this Canva presentation in a new tab.
              </p>
              <a
                href={module.canva_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <span>Open Presentation</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )

      case 'online_document':
      case 'pdf_document':
      case 'slide_presentation':
        if (!module.document_url) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document</h3>
                <p className="text-gray-600">This module doesn't have a document attached.</p>
              </div>
            </div>
          )
        }

        const isSupabaseStorage = module.document_url.includes('supabase.co/storage')
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        
        // On mobile, provide download/open option instead of iframe
        if (isMobileDevice) {
          const getDocumentIcon = () => {
            if (module.content_type === 'slide_presentation') {
              return (
                <svg className="w-20 h-20 mx-auto mb-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              )
            }
            return (
              <svg className="w-20 h-20 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          }

          const getDocumentType = () => {
            if (module.content_type === 'slide_presentation') return 'Presentation'
            if (module.content_type === 'pdf_document') return 'PDF Document'
            return 'Document'
          }

          return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <div className="text-center max-w-md">
                {getDocumentIcon()}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{getDocumentType()}</h3>
                <p className="text-gray-600 mb-6">
                  Documents work best when opened in your device's native viewer or browser.
                </p>
                <a
                  href={module.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  <span>Open Document</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )
        }
        
        // Desktop: Choose viewer based on content type
        let docEmbedUrl = module.document_url
        
        if (isSupabaseStorage) {
          if (module.content_type === 'slide_presentation') {
            // Use Microsoft Office Online Viewer for PowerPoint files (better slide navigation)
            docEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(module.document_url)}`
          } else if (module.content_type === 'pdf_document') {
            // For PDFs, modify URL to force inline display instead of download
            // Add download parameter to control behavior
            const url = new URL(module.document_url)
            url.searchParams.set('download', '') // Empty value forces inline display
            docEmbedUrl = url.toString()
          } else {
            // Use Google Docs Viewer for other documents
            docEmbedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(module.document_url)}&embedded=true`
          }
        } else {
          // For external URLs (like Google Docs), use the helper function
          docEmbedUrl = getGoogleDocsEmbedUrl(module.document_url)
        }

        return (
          <div className="w-full h-full">
            <iframe
              src={docEmbedUrl}
              className="w-full h-full border-0"
              title={module.title}
            />
          </div>
        )

      case 'text':
        return (
          <div className="w-full h-full overflow-y-auto bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{module.title}</h1>
              {module.description && (
                <p className="text-lg text-gray-600 mb-6 pb-6 border-b">{module.description}</p>
              )}
              {module.text_content ? (
                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {module.text_content}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">No text content available for this lesson.</p>
                </div>
              )}
            </div>
          </div>
        )

      case 'online_conference':
        return (
          <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.title}</h1>
                  <p className="text-gray-600">{module.description}</p>
                </div>

                {module.conference_url ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 className="font-semibold text-green-900 mb-1">Conference Link Ready</h3>
                          <p className="text-green-700 text-sm">
                            A new tab has been opened with your conference link. If it didn't open, click the button below.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <a
                        href={module.conference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Conference
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Conference Link</h3>
                    <p className="text-gray-600">The conference link will be available closer to the scheduled time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Preview</h3>
              <p className="text-gray-600">{module.description}</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-white z-50 overflow-hidden"
      style={{ overflow: 'hidden', margin: 0, padding: 0 }}
    >
      {/* Close Button Overlay */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shadow-lg"
        title="Close (ESC)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div 
        className="w-full h-full overflow-hidden"
        style={{ overflow: 'hidden' }}
      >
        {renderContent()}
      </div>
    </div>
  )
}
