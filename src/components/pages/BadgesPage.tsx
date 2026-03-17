'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Badge {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  earned: boolean
  earnedAt?: string
  category: 'learning' | 'social' | 'achievement' | 'special'
}

const BadgeIcon = ({ color, icon, earned }: { color: string; icon: React.ReactNode; earned: boolean }) => (
  <div
    className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all ${
      earned ? '' : 'opacity-30 grayscale'
    }`}
    style={{ backgroundColor: earned ? color : '#e5e7eb' }}
  >
    {icon}
  </div>
)

export default function BadgesPage() {
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState<'all' | 'learning' | 'social' | 'achievement' | 'special'>('all')

  const badges: Badge[] = [
    // Learning
    {
      id: 'first-lesson',
      name: 'First Step',
      description: 'Complete your first lesson',
      color: '#3b82f6',
      earned: false,
      category: 'learning',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      id: 'course-complete',
      name: 'Graduate',
      description: 'Complete an entire course',
      color: '#8b5cf6',
      earned: false,
      category: 'learning',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
    },
    {
      id: 'streak-7',
      name: '7-Day Streak',
      description: 'Log in 7 days in a row',
      color: '#f59e0b',
      earned: false,
      category: 'learning',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      ),
    },
    {
      id: 'fast-learner',
      name: 'Fast Learner',
      description: 'Complete 5 lessons in one day',
      color: '#10b981',
      earned: false,
      category: 'learning',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
    // Social
    {
      id: 'first-connection',
      name: 'Connected',
      description: 'Make your first connection',
      color: '#ec4899',
      earned: false,
      category: 'social',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
    {
      id: 'social-butterfly',
      name: 'Social Butterfly',
      description: 'Have 10 connections',
      color: '#f43f5e',
      earned: false,
      category: 'social',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    // Achievement
    {
      id: 'perfect-score',
      name: 'Perfect Score',
      description: 'Get 100% on a quiz',
      color: '#f97316',
      earned: false,
      category: 'achievement',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      id: 'top-student',
      name: 'Top Student',
      description: 'Rank #1 in your class',
      color: '#eab308',
      earned: false,
      category: 'achievement',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      ),
    },
    // Special
    {
      id: 'early-adopter',
      name: 'Early Adopter',
      description: 'One of the first users on the platform',
      color: '#1f7a8c',
      earned: true,
      earnedAt: 'Jan 2025',
      category: 'special',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    },
  ]

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'learning', label: 'Learning' },
    { id: 'social', label: 'Social' },
    { id: 'achievement', label: 'Achievement' },
    { id: 'special', label: 'Special' },
  ] as const

  const filtered = activeCategory === 'all' ? badges : badges.filter(b => b.category === activeCategory)
  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f3f4f6', paddingLeft: '50px', paddingRight: '25px', paddingTop: '24px', paddingBottom: '48px' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Badges</h1>
        <p className="text-sm text-gray-500 mt-0.5">{earnedCount} of {badges.length} earned</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold" style={{ color: '#1f7a8c' }}>{Math.round((earnedCount / badges.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${(earnedCount / badges.length) * 100}%`, backgroundColor: '#1f7a8c' }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeCategory === cat.id
                ? 'text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            style={activeCategory === cat.id ? { backgroundColor: '#1f7a8c', borderColor: '#1f7a8c' } : {}}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(badge => (
          <div
            key={badge.id}
            className={`bg-white rounded-xl border p-4 text-center transition-all ${
              badge.earned ? 'border-gray-100' : 'border-gray-100 opacity-60'
            }`}
          >
            <BadgeIcon color={badge.color} icon={badge.icon} earned={badge.earned} />
            <p className="text-sm font-semibold text-gray-900 leading-tight">{badge.name}</p>
            <p className="text-xs text-gray-400 mt-1 leading-snug">{badge.description}</p>
            {badge.earned && badge.earnedAt && (
              <p className="text-xs mt-2 font-medium" style={{ color: '#1f7a8c' }}>{badge.earnedAt}</p>
            )}
            {!badge.earned && (
              <p className="text-xs mt-2 text-gray-300">Locked</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
