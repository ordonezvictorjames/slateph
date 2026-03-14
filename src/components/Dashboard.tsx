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

export type PageType = 'dashboard' | 'user-management' | 'course-management' | 'my-courses' | 'schedule' | 'analytics' | 'profile' | 'settings' | 'system-tracker' | 'code-generator' | 'feature-requests' | 'tasks' | 'games' | 'activity' | 'ai-assistant' | 'library'

export default function Dashboard() {
  const { signOut } = useAuth()
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [profileUserId, setProfileUserId] = useState<string | undefined>(undefined)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showPython, setShowPython] = useState(false)

  // Function to navigate to a user's profile
  const navigateToProfile = (userId?: string) => {
    setProfileUserId(userId)
    setCurrentPage('profile')
  }

  // Page transition loading effect
  useEffect(() => {
    setIsPageTransitioning(true)
    const timer = setTimeout(() => {
      setIsPageTransitioning(false)
    }, 1700)
    return () => clearTimeout(timer)
  }, [currentPage])

  useIdleTimeout({
    onIdle: () => {
      signOut()
    },
    idleTime: 30 * 60 * 1000
  })

  const renderCurrentPage = () => {
    const user = useAuth().user
    const userRole = user?.profile?.role || 'trainee'
    
    switch (currentPage) {
      case 'dashboard': return <DashboardHome onNavigate={setCurrentPage} />
      case 'user-management': return userRole === 'instructor' ? <MyStudentsPage /> : <UserManagementPage onNavigateToProfile={navigateToProfile} />
      case 'course-management': return <CourseManagementPage />
      case 'my-courses': return <MyCoursesPage />
      case 'schedule': return <SchedulePage />
      case 'analytics': return <AnalyticsPage />
      case 'profile': return <ProfilePage userId={profileUserId} onNavigateToProfile={navigateToProfile} />
      case 'settings': return <SettingsPage />
      case 'system-tracker': return <SystemTrackerPage />
      case 'code-generator': return <CodeGeneratorPage />
      case 'feature-requests': return <FeatureRequestsPage />
      case 'tasks': return <TasksPage />
      case 'ai-assistant': return <AIAssistantPage />
      case 'library': return <LibraryPage />
      default: return <DashboardHome onNavigate={setCurrentPage} />
    }
  }

  return (
    <>
      {isPageTransitioning && <PageLoading />}
      <div className="min-h-screen flex" style={{ backgroundColor: '#f3f4f6' }}>
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
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
    </>
  )
}
