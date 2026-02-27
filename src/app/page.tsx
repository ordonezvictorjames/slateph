'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/LoginForm'
import Dashboard from '@/components/Dashboard'
import { Loading } from '@/components/ui/loading'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loading size="lg" />
          <h2 className="text-xl font-semibold text-black mb-2 mt-4">Slate</h2>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return <Dashboard />
  }

  return <LoginForm />
}