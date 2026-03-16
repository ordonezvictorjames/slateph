'use client'

import React from 'react'
import { ButtonLoading } from '@/components/ui/loading'

export interface NewUser {
  first_name: string
  last_name: string
  email: string
  password: string
  role: 'admin' | 'developer' | 'guest' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student'
  status: 'active' | 'inactive' | 'pending'
  bio: string
  avatar_url: string | null
  strand: string | null
  section: string | null
  grade: number | null
  batch_number: number | null
  account_tier?: 'visitor' | 'beginner' | 'intermediate' | 'expert' | 'vip'
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  user: NewUser
  onInputChange: (field: keyof NewUser, value: string | number | null) => void
  submitting: boolean
  selectedAvatar?: string
  onAvatarSelect?: (id: string) => void
  isEditMode?: boolean
}

const SHS_ACADEMIC_STRANDS = [
  'Arts, Social Sciences, and Humanities',
  'Business and Entrepreneurship',
  'Science, Technology, Engineering, and Mathematics (STEM)',
  'Sports, Health, and Wellness',
  'Field Experience',
]

const SHS_TECHNICAL_STRANDS = [
  'Aesthetic, Wellness, and Human Care',
  'Agri-Fishery Business and Food Innovation',
  'Artisanry and Creative Enterprise',
  'Automotive and Small Engine Technologies',
  'Construction and Building Technologies',
  'Creative Arts and Design Technologies',
  'Hospitality and Tourism',
  'ICT Support and Computer Programming Technologies',
  'Industrial Technologies',
  'Maritime Transport',
]

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-white placeholder-gray-400'
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

export function UserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  onInputChange,
  submitting,
  isEditMode = false,
}: UserModalProps) {
  const [cluster, setCluster] = React.useState<'academic' | 'technical' | ''>(() => {
    if (user.role === 'shs_student' && user.strand) {
      return SHS_ACADEMIC_STRANDS.includes(user.strand) ? 'academic' : 'technical'
    }
    return ''
  })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials || (isEditMode ? 'E' : '+')}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{isEditMode ? 'Edit User' : 'New User'}</h2>
              <p className="text-xs text-gray-400">{isEditMode ? 'Update account information' : 'Fill in the details to create an account'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *">
                <input type="text" required value={user.first_name} onChange={(e) => onInputChange('first_name', e.target.value)} placeholder="Juan" className={inputCls} />
              </Field>
              <Field label="Last Name *">
                <input type="text" required value={user.last_name} onChange={(e) => onInputChange('last_name', e.target.value)} placeholder="Dela Cruz" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email *">
                <input type="email" required value={user.email} onChange={(e) => onInputChange('email', e.target.value)} placeholder="juan@example.com" className={inputCls} />
              </Field>
              <Field label="Role *">
                <select value={user.role} onChange={(e) => { onInputChange('role', e.target.value); onInputChange('grade', null); onInputChange('section', null); onInputChange('strand', null); onInputChange('batch_number', null); setCluster('') }} className={inputCls}>
                  {user.role === 'guest' && <option value="guest">Guest (Pending)</option>}
                  <option value="jhs_student">JHS Student</option>
                  <option value="shs_student">SHS Student</option>
                  <option value="college_student">College Student</option>
                  <option value="scholar">TESDA Scholar</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                </select>
              </Field>
            </div>

            {user.role === 'jhs_student' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <Field label="Grade">
                  <select value={user.grade ?? ''} onChange={(e) => onInputChange('grade', e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                    <option value="">Select Grade</option>
                    {[7, 8, 9, 10].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </Field>
                <Field label="Section">
                  <select value={user.section ?? ''} onChange={(e) => onInputChange('section', e.target.value || null)} className={inputCls}>
                    <option value="">Select Section</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => <option key={s} value={String(s)}>Section {s}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {user.role === 'shs_student' && (
              <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Grade">
                    <select value={user.grade ?? ''} onChange={(e) => onInputChange('grade', e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                      <option value="">Select Grade</option>
                      <option value={11}>Grade 11</option>
                      <option value={12}>Grade 12</option>
                    </select>
                  </Field>
                  <Field label="Section">
                    <select value={user.section ?? ''} onChange={(e) => onInputChange('section', e.target.value || null)} className={inputCls}>
                      <option value="">Select Section</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => <option key={s} value={String(s)}>Section {s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Cluster">
                  <select value={cluster} onChange={(e) => { setCluster(e.target.value as 'academic' | 'technical' | ''); onInputChange('strand', null) }} className={inputCls}>
                    <option value="">Select Cluster</option>
                    <option value="academic">Academic Cluster</option>
                    <option value="technical">Technical Professional Cluster</option>
                  </select>
                </Field>
                {cluster && (
                  <Field label="Strand">
                    <select value={user.strand ?? ''} onChange={(e) => onInputChange('strand', e.target.value || null)} className={inputCls}>
                      <option value="">Select Strand</option>
                      {(cluster === 'academic' ? SHS_ACADEMIC_STRANDS : SHS_TECHNICAL_STRANDS).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}

            {user.role === 'college_student' && (
              <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                <Field label="Section">
                  <select value={user.section ?? ''} onChange={(e) => onInputChange('section', e.target.value || null)} className={inputCls}>
                    <option value="">Select Section</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => <option key={s} value={String(s)}>Section {s}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {user.role === 'scholar' && (
              <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                <Field label="Batch">
                  <select value={user.batch_number ?? ''} onChange={(e) => onInputChange('batch_number', e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                    <option value="">Select Batch</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((b) => <option key={b} value={b}>Batch {b}</option>)}
                  </select>
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Account Tier *">
                <select value={user.account_tier || 'visitor'} onChange={(e) => onInputChange('account_tier', e.target.value)} className={inputCls}>
                  <option value="visitor">Visitor — 2 days</option>
                  <option value="beginner">Beginner — 7 days</option>
                  <option value="intermediate">Intermediate — 25 days</option>
                  <option value="expert">Expert — 30 days</option>
                  <option value="vip">VIP — Permanent</option>
                </select>
              </Field>
              <Field label={isEditMode ? 'New Password' : 'Default Password'}>
                {isEditMode ? (
                  <input type="password" value={user.password} onChange={(e) => onInputChange('password', e.target.value)} placeholder="Leave blank to keep current" className={inputCls} />
                ) : (
                  <input type="text" value="Slate2026!" readOnly disabled className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                )}
              </Field>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80">
            <p className="text-xs text-gray-400">{isEditMode ? 'Changes are saved immediately.' : 'Default password: Slate2026!'}</p>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {submitting && <ButtonLoading />}
                {submitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create User')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
