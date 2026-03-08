'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

interface ExpiringAccount {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  account_expires_at: string
  days_until_expiration: number
}

export function ExpiringAccountsWidget() {
  const [accounts, setAccounts] = useState<ExpiringAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [daysThreshold, setDaysThreshold] = useState(7)
  const supabase = createClient()

  useEffect(() => {
    fetchExpiringAccounts()
  }, [daysThreshold])

  const fetchExpiringAccounts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_expiring_accounts', {
        days_threshold: daysThreshold
      })

      if (error) {
        console.error('Error fetching expiring accounts:', error)
      } else {
        setAccounts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'guest': return 'text-gray-600'
      case 'student': return 'text-orange-600'
      case 'scholar': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Expiring Accounts</h3>
          <p className="text-sm text-gray-500">Accounts expiring soon</p>
        </div>
        <select
          value={daysThreshold}
          onChange={(e) => setDaysThreshold(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-black focus:border-transparent"
        >
          <option value={7}>Next 7 days</option>
          <option value={14}>Next 14 days</option>
          <option value={30}>Next 30 days</option>
        </select>
      </div>

      {loading ? (
        <Loading size="sm" className="h-32" />
      ) : accounts.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-sm">No accounts expiring in the next {daysThreshold} days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {account.first_name} {account.last_name}
                </p>
                <p className="text-sm text-gray-500">{account.email}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium uppercase ${getRoleColor(account.role)}`}>
                  {account.role}
                </span>
                <p className={`text-sm font-semibold mt-1 ${
                  account.days_until_expiration <= 3 ? 'text-red-600' : 
                  account.days_until_expiration <= 7 ? 'text-yellow-600' : 
                  'text-blue-600'
                }`}>
                  {account.days_until_expiration} day{account.days_until_expiration !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
