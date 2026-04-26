'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import CourseChat from '@/components/CourseChat'
import AIAssistant from '@/components/AIAssistant'
import PythonPlayground from '@/components/PythonPlayground'
import FloatingActionMenu from '@/components/FloatingActionMenu'
import { PageLoading } from '@/components/ui/page-loading'
import DashboardHome from '@/components/pages/DashboardHome'
import UserManagementPage from '@/components/pages/UserManagementPage'
import MyStudentsPage from '@/components/pages/MyStudentsPage'
import CourseManagementPage from '@/components/pages/CourseManagementPage'
import MyCoursesPage from '@/components/pages/MyCoursesPage'
import AnalyticsPage from '@/components/pages/AnalyticsPage'
import SchedulePage from '@/components/pages/SchedulePage'
import ProfilePage from '@/components/pages/ProfilePage'
import SystemTrackerPage from '@/components/pages/SystemTrackerPage'
import CodeGeneratorPage from '@/components/pages/CodeGeneratorPage'
import FeatureRequestsPage from '@/components/pages/FeatureRequestsPage'
import TasksPage from '@/components/pages/TasksPage'
import AIAssistantPage from '@/components/pages/AIAssistantPage'
import LibraryPage from '@/components/pages/LibraryPage'
import BadgesPage from '@/components/pages/BadgesPage'
import GradesPage from '@/components/pages/GradesPage'
import CoursesPage from '@/components/pages/CoursesPage'
import ActivitiesPage from '@/components/pages/ActivitiesPage'
import WhatsNewPage from '@/components/pages/WhatsNewPage'
import SettingsPage from '@/components/pages/SettingsPage'
import DeletionWarningBanner from '@/components/DeletionWarningBanner'

export type PageType = 'dashboard' | 'user-management' | 'course-management' | 'my-courses' | 'courses' | 'activities' | 'whats-new' | 'schedule' | 'analytics' | 'profile' | 'settings' | 'system-tracker' | 'code-generator' | 'feature-requests' | 'tasks' | 'games' | 'activity' | 'ai-assistant' | 'library' | 'badges' | 'grades'

const SPOTIFY_LS_KEY = 'slate_spotify_url'

function SpotifyPanel({ initialUrl, userId, isOpen, onClose }: {
  initialUrl: string
  userId: string
  isOpen: boolean
  onClose: () => void
}) {
  // Restore from localStorage first (survives F5), fall back to DB value
  const [savedUrl, setSavedUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SPOTIFY_LS_KEY) || initialUrl
    }
    return initialUrl
  })
  const [inputUrl, setInputUrl] = useState(savedUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const popupRef = useRef<Window | null>(null)

  const handleSave = async () => {
    if (!inputUrl.trim()) return
    setSaving(true)
    const supabase = createClient()
    localStorage.setItem(SPOTIFY_LS_KEY, inputUrl)
    setSavedUrl(inputUrl)
    await supabase.from('profiles').update({ spotify_url: inputUrl }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const embedUrl = savedUrl
    ? savedUrl.replace('open.spotify.com/', 'open.spotify.com/embed/') + '?autoplay=1'
    : ''

  const handlePopOut = () => {
    if (!embedUrl) return
    // If popup already open, focus it
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus()
      return
    }
    const w = 340, h = 160
    const left = window.screen.width - w - 20
    const top = window.screen.height - h - 60
    popupRef.current = window.open(
      embedUrl,
      'spotify_player',
      `width=${w},height=${h},left=${left},top=${top},resizable=no,toolbar=no,menubar=no,scrollbars=no`
    )
  }

  return (
    <div
      className="fixed bottom-20 right-4 sm:right-6 z-50 rounded-xl overflow-hidden shadow-xl bg-white transition-all duration-200"
      style={{
        width: 320,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transform: isOpen ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: '#1DB954' }}>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span className="text-white text-[10px] font-bold">Spotify</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Pop-out button */}
          <button onClick={handlePopOut} title="Open in mini window" className="text-white hover:text-white/70 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button onClick={onClose} className="text-white hover:text-white/70 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Embed — always mounted, autoplay restores after F5 */}
      {embedUrl ? (
        <iframe
          src={embedUrl}
          width="320"
          height="80"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{ border: 'none', display: 'block' }}
        />
      ) : (
        <div className="px-3 py-3 text-xs text-gray-400 text-center">Paste a Spotify link below to start.</div>
      )}

      {/* URL input */}
      <div className="p-3 flex gap-2 border-t border-gray-100">
        <input
          type="text"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Paste Spotify link..."
          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400"
          style={{ minWidth: 0 }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0 transition-colors"
          style={{ backgroundColor: saved ? '#16a34a' : '#1DB954' }}
        >
          {saving ? '...' : saved ? '✓' : 'Set'}
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { signOut, user } = useAuth()
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentPage') as PageType
      const validPages: PageType[] = ['dashboard','user-management','course-management','my-courses','courses','activities','whats-new','schedule','analytics','profile','settings','system-tracker','code-generator','feature-requests','tasks','games','activity','ai-assistant','library','badges','grades']
      if (saved && validPages.includes(saved)) return saved
      localStorage.removeItem('currentPage')
    }
    return 'dashboard'
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [profileUserId, setProfileUserId] = useState<string | undefined>(undefined)
  const [initialCourseId, setInitialCourseId] = useState<string | undefined>(undefined)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)

  // Page transition loading effect — only on explicit navigation, not on mount/refresh
  const navigateToPage = (page: PageType, courseId?: string) => {
    setInitialCourseId(courseId)
    setCurrentPage(page)
    localStorage.setItem('currentPage', page)
    setIsPageTransitioning(true)
    setTimeout(() => setIsPageTransitioning(false), 1700)
  }
  const [showChat, setShowChat] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showSpotify, setShowSpotify] = useState(false)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const idleWarningRef = useRef<NodeJS.Timeout | null>(null)
  const [showPython, setShowPython] = useState(false)

  // Function to navigate to a user's profile
  const navigateToProfile = (userId?: string) => {
    setProfileUserId(userId)
    setCurrentPage('profile')
  }



  const signOutRef = useRef(signOut)
  useEffect(() => { signOutRef.current = signOut })

  const IDLE_TIME = 15 * 60 * 1000
  const WARNING_BEFORE = 60 * 1000 // warn 1 min before

  useIdleTimeout({
    onIdle: useCallback(() => {
      setShowIdleWarning(false)
      localStorage.removeItem('currentPage')
      signOutRef.current()
    }, []),
    onWarn: useCallback(() => setShowIdleWarning(true), []),
    onActivity: useCallback(() => setShowIdleWarning(false), []),
    idleTime: IDLE_TIME,
    warnBefore: WARNING_BEFORE,
  })

  const renderCurrentPage = () => {
    const userRole = user?.profile?.role || 'trainee'
    
    switch (currentPage) {
      case 'dashboard': return <DashboardHome key={refreshKey} onNavigate={navigateToPage} />
      case 'user-management': return userRole === 'instructor' ? <MyStudentsPage key={refreshKey} /> : <UserManagementPage key={refreshKey} onNavigateToProfile={navigateToProfile} />
      case 'course-management': return <CourseManagementPage key={refreshKey} initialCourseId={initialCourseId} />
      case 'my-courses': return <MyCoursesPage key={refreshKey} initialCourseId={initialCourseId} />
      case 'courses': return <CoursesPage key={refreshKey} />
      case 'activities': return <ActivitiesPage key={refreshKey} />
      case 'whats-new': return <WhatsNewPage key={refreshKey} />
      case 'schedule': return <SchedulePage key={refreshKey} />
      case 'analytics': return <AnalyticsPage key={refreshKey} />
      case 'profile': return <ProfilePage key={refreshKey} userId={profileUserId} onNavigateToProfile={navigateToProfile} />
      case 'settings': return <SettingsPage key={refreshKey} />
      case 'system-tracker': return <SystemTrackerPage key={refreshKey} />
      case 'code-generator': return <CodeGeneratorPage key={refreshKey} />
      case 'feature-requests': return <FeatureRequestsPage key={refreshKey} />
      case 'tasks': return <TasksPage key={refreshKey} />
      case 'ai-assistant': return <AIAssistantPage key={refreshKey} />
      case 'library': return <LibraryPage key={refreshKey} />
      case 'badges': return <BadgesPage key={refreshKey} />
      case 'grades': return <GradesPage key={refreshKey} />
      default: return <DashboardHome key={refreshKey} onNavigate={setCurrentPage} />
    }
  }

  return (
    <>
      {isPageTransitioning && <PageLoading />}
      <DeletionWarningBanner />
      <div className="min-h-screen flex" style={{ backgroundColor: '#f3f4f6' }}>
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={(page) => { setCurrentPage(page); localStorage.setItem('currentPage', page) }}
          hideHamburger={showChat || showAI || showPython}
        />
        <div className="flex-1 flex flex-col ml-0 lg:ml-16">
          <main className="flex-1">{renderCurrentPage()}</main>
        </div>
        {/* Floating Action Menu */}
        <FloatingActionMenu 
          onOpenPython={() => setShowPython(true)}
          onOpenAI={() => setShowAI(true)}
          onOpenChat={() => setShowChat(true)}
          onOpenSpotify={user?.profile?.role === 'developer' ? () => setShowSpotify(s => !s) : undefined}
        />
        
        <PythonPlayground isOpen={showPython} onClose={() => setShowPython(false)} />
        <AIAssistant isOpen={showAI} onClose={() => setShowAI(false)} />
        <CourseChat isOpen={showChat} onClose={() => setShowChat(false)} onNavigateToProfile={navigateToProfile} />
      </div>

      {/* Idle Warning Modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Still there?</h3>
            <p className="text-sm text-gray-500 mb-5">You'll be logged out in 1 minute due to inactivity.</p>
            <button
              onClick={() => setShowIdleWarning(false)}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#0f4c5c' }}
            >
              Keep me logged in
            </button>
          </div>
        </div>
      )}

      {/* Beta Test Label - fixed bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg tracking-widest uppercase">
          Beta Test
        </span>
      </div>

      {/* Spotify Player - always mounted for developer so audio keeps playing */}
      {user?.profile?.role === 'developer' && (
        <SpotifyPanel
          initialUrl={user?.profile?.spotify_url || ''}
          userId={user.id}
          isOpen={showSpotify}
          onClose={() => setShowSpotify(false)}
        />
      )}
    </>
  )
}
