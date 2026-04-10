'use client'

interface ChangelogEntry {
  version: string
  date: string
  badge: 'new' | 'improvement' | 'fix'
  title: string
  changes: string[]
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.9',
    date: 'April 2026',
    badge: 'new',
    title: 'Activities Page & Dashboard Redesign',
    changes: [
      'Added Activities page — lists all current, upcoming, and ended quizzes/exams with scores and pass/fail status',
      'Activities sidebar menu added for students and instructors',
      'Course filter and status filter tabs on Activities page',
      'Dashboard welcome banner redesigned with teal gradient and action buttons',
      'To Do card on dashboard shows pending quizzes from enrolled courses',
      'Courses page added — browse all available courses for enrollment',
      'Learning Hub (My Courses) and Courses are now separate sidebar items',
      'Schedule now auto-matches students by role, grade, section, strand, and batch',
      'Today\'s Events and Upcoming Schedule reflect profile-matched schedules',
      'Profile card shows user role below name, removed "Hello" label',
      'Beta Test label added at bottom center of screen',
      'Breadcrumbs redesigned as centered pill with dark teal active state',
      'Group labels added above each card section on dashboard',
      'All Users card and Recent Activity card labels added to sidebar',
      'Small stat cards updated with dark teal border and value color',
    ],
  },
  {
    version: '1.8',
    date: 'March 2026',
    badge: 'improvement',
    title: 'Schedule Page & Course Title Fixes',
    changes: [
      'Schedule page cards now show course title and student type',
      'Fixed course title not appearing — flattened nested Supabase join data',
      'Batch dropdown now appears in new schedule modal for TESDA Scholar',
      'Removed auto-generated batch label from schedule and dashboard cards',
      'Today\'s Events and Upcoming Schedule cards on Schedule page updated',
    ],
  },
  {
    version: '1.7',
    date: 'February 2026',
    badge: 'new',
    title: 'Badges, Grades & Quiz Improvements',
    changes: [
      'Badges system with progress tracking and module completion requirements',
      'Grades page with quiz/exam results and rankings card',
      'Quiz/exam timer, anti-cheat mode, and instructions field',
      'Create/Edit Test modal in Course Management',
      'Dark teal theme applied across quiz and module components',
      'Module sequential locking for students',
    ],
  },
  {
    version: '1.6',
    date: 'January 2026',
    badge: 'improvement',
    title: 'Course Management & Lesson Viewer',
    changes: [
      'Lesson viewer with full-screen support',
      'Subject and module card redesign with accordion layout',
      'Two-panel layout for Course Management and My Courses pages',
      'Play button navigation for modules',
      'Mobile responsiveness improvements across course pages',
      'Teal badge theme for status indicators',
    ],
  },
  {
    version: '1.5',
    date: 'December 2025',
    badge: 'new',
    title: 'Dashboard Overhaul',
    changes: [
      'Today\'s Events, Upcoming Schedule, and Tasks in 3-column row',
      'All Users card with online/offline status indicators',
      'Recent Activity feed with role-based filtering',
      'WebSocket monitor card for developers',
      'Flip cards for File Storage and Database usage',
      'Mobile dashboard improvements with compact 2-column layout',
      'Role-based sidebar cards for all user types',
    ],
  },
  {
    version: '1.4',
    date: 'November 2025',
    badge: 'new',
    title: 'Notifications, Friends & Chat',
    changes: [
      'Notifications system with real-time updates',
      'Friends/Connections system with request management',
      'Course Chat for enrolled students and instructors',
      'User Sessions tracking for admin and developer',
      'Floating Action Menu for quick access to Python IDE, AI Assistant, and Chat',
    ],
  },
  {
    version: '1.3',
    date: 'October 2025',
    badge: 'new',
    title: 'AI Assistant & Python Playground',
    changes: [
      'AI Assistant page with Google Gemini integration',
      'Python Playground (Slate Python IDE) with code execution',
      'Library page for learning resources',
      'Account expiration and tier system',
      'Inactive account deletion management',
    ],
  },
  {
    version: '1.2',
    date: 'September 2025',
    badge: 'improvement',
    title: 'User Management & Roles',
    changes: [
      'User Management page with role filtering and search',
      'Role migration — removed student role, added JHS/SHS/College/Scholar types',
      'Account tier system with duration tracking',
      'Batch number support for TESDA scholars',
      'Cluster and strand fields for SHS students',
    ],
  },
  {
    version: '1.1',
    date: 'August 2025',
    badge: 'new',
    title: 'Schedule & Enrollment System',
    changes: [
      'Course Schedules with calendar view',
      'Schedule enrollment system for students',
      'Enrollment type filtering (JHS, SHS, College, TESDA Scholar)',
      'Schedule status management (scheduled, active, completed, cancelled)',
      'Thumbnail support for courses and subjects',
    ],
  },
  {
    version: '1.0',
    date: 'July 2025',
    badge: 'new',
    title: 'Initial Launch',
    changes: [
      'Core LMS platform with course and subject management',
      'Module content types: video, text, Canva, PDF, online conference',
      'Student and instructor roles with enrollment',
      'Admin and developer dashboards',
      'Authentication with custom user profiles',
      'Sidebar navigation with role-based menus',
    ],
  },
]

const badgeStyles = {
  new: 'bg-green-100 text-green-700',
  improvement: 'bg-blue-100 text-blue-700',
  fix: 'bg-orange-100 text-orange-700',
}

export default function WhatsNewPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">What's New</h1>
        <p className="text-sm text-gray-500 mt-1">All updates, improvements, and new features — from the beginning to now.</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-8">
          {changelog.map((entry, i) => (
            <div key={i} className="relative flex gap-5">
              {/* Dot */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center mt-1 z-10" style={{ background: '#0f4c5c' }}>
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>

              {/* Card */}
              <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">v{entry.version}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeStyles[entry.badge]}`}>
                        {entry.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{entry.title}</h3>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{entry.date}</span>
                </div>
                <ul className="space-y-1.5">
                  {entry.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#0f4c5c' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
