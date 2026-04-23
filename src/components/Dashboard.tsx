'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
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
import SettingsPage from '@/components/pages/SettingsPage'
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

export type PageType = 'dashboard' | 'user-management' | 'course-management' | 'my-courses' | 'courses' | 'activities' | 'whats-new' | 'schedule' | 'analytics' | 'profile' | 'settings' | 'system-tracker' | 'code-generator' | 'feature-requests' | 'tasks' | 'games' | 'activity' | 'ai-assistant' | 'library' | 'badges' | 'grades'

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
  const [showPython, setShowPython] = useState(false)

  // Function to navigate to a user's profile
  const navigateToProfile = (userId?: string) => {
    setProfileUserId(userId)
    setCurrentPage('profile')
  }



  useIdleTimeout({
    onIdle: () => {
      localStorage.removeItem('currentPage')
      signOut()
    },
    idleTime: 15 * 60 * 1000
  })

  const renderCurrentPage = () => {
    const user = useAuth().user
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
        />
        
        <PythonPlayground isOpen={showPython} onClose={() => setShowPython(false)} />
        <AIAssistant isOpen={showAI} onClose={() => setShowAI(false)} />
        <CourseChat isOpen={showChat} onClose={() => setShowChat(false)} onNavigateToProfile={navigateToProfile} />
      </div>

      {/* Beta Test Label - fixed bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg tracking-widest uppercase">
          Beta Test
        </span>
      </div>
    </>
  )
}
