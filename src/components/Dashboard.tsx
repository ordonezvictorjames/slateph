'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import Sidebar from '@/components/Sidebar'
import CourseChat from '@/components/CourseChat'
import AIAssistant from '@/components/AIAssistant'
import PythonPlayground from '@/components/PythonPlayground'
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

export type PageType = 'dashboard' | 'user-management' | 'course-management' | 'my-courses' | 'schedule' | 'analytics' | 'profile' | 'settings' | 'system-tracker' | 'code-generator' | 'feature-requests' | 'tasks' | 'games' | 'activity' | 'ai-assistant'

export default function Dashboard() {
  const { signOut } = useAuth()
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showPython, setShowPython] = useState(false)

  // Page transition loading effect
  useEffect(() => {
    setIsPageTransitioning(true)
    const timer = setTimeout(() => {
      setIsPageTransitioning(false)
    }, 1700)
    return () => clearTimeout(timer)
  }, [currentPage])

  useIdleTimeout({
    onIdle: async () => {
      await signOut()
      window.location.replace('/')
    },
    idleTime: 30 * 60 * 1000
  })

  const renderCurrentPage = () => {
    const user = useAuth().user
    const userRole = user?.profile?.role || 'trainee'
    
    switch (currentPage) {
      case 'dashboard': return <DashboardHome onNavigate={setCurrentPage} />
      case 'user-management': return userRole === 'instructor' ? <MyStudentsPage /> : <UserManagementPage />
      case 'course-management': return <CourseManagementPage />
      case 'my-courses': return <MyCoursesPage />
      case 'schedule': return <SchedulePage />
      case 'analytics': return <AnalyticsPage />
      case 'profile': return <ProfilePage />
      case 'settings': return <SettingsPage />
      case 'system-tracker': return <SystemTrackerPage />
      case 'code-generator': return <CodeGeneratorPage />
      case 'feature-requests': return <FeatureRequestsPage />
      case 'tasks': return <TasksPage />
      case 'ai-assistant': return <AIAssistantPage />
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
        {/* Python IDE Button */}
        <button 
          onClick={() => setShowPython(true)} 
          className="fixed bottom-36 right-4 sm:bottom-40 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group z-40 hover:scale-110" 
          title="Slate Python IDE"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        {/* AI Assistant Button */}
        <button 
          onClick={() => setShowAI(true)} 
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group z-40 hover:scale-110" 
          title="AI Assistant"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>
        
        {/* Group Chat Button */}
        <button 
          onClick={() => setShowChat(true)} 
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-black text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group z-40" 
          title="Open Chat"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        
        <PythonPlayground isOpen={showPython} onClose={() => setShowPython(false)} />
        <AIAssistant isOpen={showAI} onClose={() => setShowAI(false)} />
        <CourseChat isOpen={showChat} onClose={() => setShowChat(false)} />
      </div>
    </>
  )
}
