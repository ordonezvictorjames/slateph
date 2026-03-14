'use client'

import { useState } from 'react'

interface ChangelogModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">What's New</h2>
              <p className="text-sm text-gray-500">Latest updates and improvements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Latest Update */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center space-x-2 mb-3">
                <span className="px-3 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">NEW</span>
                <span className="text-sm text-gray-600">February 2026</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🎨 Social Feed & Profile Enhancements</h3>
              <p className="text-gray-700 mb-3">Share your thoughts, react to posts, and connect with others through our new social feed system!</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Create posts with text, emotions, and images</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>React with 6 different emotions (Like, Love, Haha, Wow, Sad, Angry)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Comment and engage with posts</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>View enrolled/assigned courses in profile modals</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>SHS Strand tracking for trainees</span>
                </li>
              </ul>
            </div>

            {/* Recent Updates */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Updates</h3>
              <div className="space-y-4">
                {/* Online Users */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">🟢 Online Users in Chat</h4>
                  <p className="text-sm text-gray-600 mb-2">See who's currently active in real-time with live presence indicators</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Real-time</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Presence</span>
                  </div>
                </div>

                {/* User Management */}
                <div className="border-l-4 border-indigo-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">👥 Enhanced User Management</h4>
                  <p className="text-sm text-gray-600 mb-2">SHS strand tracking, profile banners, and improved user profiles</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">Profiles</span>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">trainee Data</span>
                  </div>
                </div>

                {/* Mobile Optimization */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">📱 Mobile-Optimized Tables</h4>
                  <p className="text-sm text-gray-600 mb-2">All tables now convert to cards on mobile devices for better usability</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Responsive</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Touch-Friendly</span>
                  </div>
                </div>

                {/* Course View */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">📚 Enhanced Course View</h4>
                  <p className="text-sm text-gray-600 mb-2">Admin/Developer users now see courses in a clean table format</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Table View</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Role-Based</span>
                  </div>
                </div>

                {/* Permissions */}
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">🔐 Permission System</h4>
                  <p className="text-sm text-gray-600 mb-2">Enhanced role-based access control with developer account protection</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Security</span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Access Control</span>
                  </div>
                </div>

                {/* Code Tracking */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">📊 Code Usage Tracking</h4>
                  <p className="text-sm text-gray-600 mb-2">Monitor which registration codes have been used and by whom</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Analytics</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Tracking</span>
                  </div>
                </div>

                {/* UI Polish */}
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">🎨 UI Improvements</h4>
                  <p className="text-sm text-gray-600 mb-2">Beautiful gradient course cards and refined design elements</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Design</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Polish</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">🚀 Coming Soon</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span className="text-lg">🎮</span>
                  <span>Games & Activities</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span className="text-lg">💬</span>
                  <span>Direct Messaging</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span className="text-lg">📊</span>
                  <span>Advanced Analytics</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span className="text-lg">🏆</span>
                  <span>Achievements System</span>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-3">Have feedback or suggestions?</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Submit Feature Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
