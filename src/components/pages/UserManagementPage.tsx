'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { logUserCreation, logActivity } from '@/lib/activityLogger'
import { UserModal, type NewUser } from '@/components/UserModals'
import { Loading, ButtonLoading } from '@/components/ui/loading'
import { getRoleColor, getRoleLabel } from '@/utils/roleUtils'
import InactiveDeletionCountdown from '@/components/InactiveDeletionCountdown'
import LastLoginCountdown from '@/components/LastLoginCountdown'
import UserSessionsModal from '@/components/UserSessionsModal'
import CustomSelect from '@/components/ui/CustomSelect'

interface UserData {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'developer' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student' | 'guest'
  status: string
  teams: string[]
  avatar_url: string | null
  banner_url?: string | null
  created_at: string
  enrolled_courses?: string[]
  strand?: string | null
  section?: string | null
  grade?: number | null
  batch_number?: number | null
  courses?: string[]
  account_expires_at?: string | null
  account_duration_days?: number | null
  inactive_since?: string | null
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  email?: string
  role: 'admin' | 'developer' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student' | 'guest'
  status?: string
  avatar_url: string | null
  banner_url?: string | null
  created_at: string
  strand?: string | null
  section?: string | null
  grade?: number | null
  batch_number?: number | null
  account_expires_at?: string | null
  account_duration_days?: number | null
  inactive_since?: string | null
  last_login_at?: string | null
}




const SHS_ACADEMIC_STRANDS = [
  'Arts, Social Sciences, and Humanities',
  'Business and Entrepreneurship',
  'Science, Technology, Engineering, and Mathematics (STEM)',
  'Sports, Health, and Wellness',
  'Field Experience',
]

const scientistSections = [
  'Einstein',
  'Newton',
  'Curie',
  'Darwin',
  'Tesla',
  'Galileo',
  'Hawking',
  'Pasteur',
  'Edison',
  'Franklin'
]

interface UserManagementPageProps {
  onNavigateToProfile?: (userId?: string) => void
}

export default function UserManagementPage({ onNavigateToProfile }: UserManagementPageProps = {}) {
  const { user, refreshUser } = useAuth()
  const { showSuccess, showError } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPermissionDeniedModal, setShowPermissionDeniedModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<UserData | null>(null)
  const [viewingProfile, setViewingProfile] = useState<UserData | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 25
  
  const supabase = createClient()

  // Helper function to check if current user can edit/delete target user
  const canModifyUser = (targetUserRole: string): boolean => {
    const currentUserRole = user?.profile?.role
    
    // Developers can modify anyone
    if (currentUserRole === 'developer') return true
    
    // Admins cannot modify developers
    if (currentUserRole === 'admin' && targetUserRole === 'developer') return false
    
    // Admins can modify other roles
    if (currentUserRole === 'admin') return true
    
    // Other roles cannot modify users
    return false
  }

  const [newUser, setNewUser] = useState<NewUser>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'guest',
    status: 'active',
    bio: '',
    avatar_url: '',
    strand: null,
    section: null,
    grade: null,
    batch_number: null,
  })

  const handleInputChange = (field: keyof NewUser, value: string | number | null) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Reset form to initial state
  const resetForm = () => {
    setNewUser({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'guest',
      status: 'active',
      bio: '',
      avatar_url: '',
      strand: null,
      section: null,
      grade: null,
      batch_number: null,
    })
    setUploadedImage(null)
  }
  useEffect(() => {
    fetchUsers()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, roleFilter, statusFilter])
  const fetchUsers = async () => {
    try {
      setLoading(true)
      // Use RPC function to fetch users (bypasses RLS)
      const { data, error } = await supabase.rpc('get_all_users')

      if (error) {
        console.error('Error fetching users:', error)
        showError('Error loading users', error.message)
      } else {
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      showError('Error loading users', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on search and filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === '' || 
      u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Reset to page 1 whenever filters change
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setUploadedImage(result)
        setNewUser(prev => ({ ...prev, avatar_url: result }))
      }
      reader.readAsDataURL(file)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Use default password for admin-created users
      const defaultPassword = 'Slate2026!'
      
      // Use the same create_user_account function with default password
      const { data, error: rpcError } = await supabase.rpc('create_user_account', {
        p_first_name: newUser.first_name,
        p_last_name: newUser.last_name,
        p_email: newUser.email,
        p_password: defaultPassword,
        p_role: newUser.role
      })

      if (rpcError) {
        console.error('Error creating user:', rpcError)
        showError('Error creating user', rpcError.message)
        setSubmitting(false)
        return
      }

      // Check if the function returned an error
      if (data && !data.success) {
        showError('Error creating user', data.message || 'Failed to create user')
        setSubmitting(false)
        return
      }

      const insertedUser = data?.user

      // Update avatar, strand, section, and grade if needed
      if (insertedUser && (newUser.avatar_url || newUser.strand || newUser.section || newUser.grade || newUser.batch_number)) {
        await supabase
          .from('profiles')
          .update({ 
            avatar_url: newUser.avatar_url,
            strand: newUser.strand,
            section: newUser.section,
            grade: newUser.grade,
            batch_number: newUser.batch_number,
          })
          .eq('id', insertedUser.id)
      }

      // Log the user creation activity
      if (user?.id && insertedUser) {
        await logUserCreation(
          user.id,
          insertedUser.id,
          insertedUser.email,
          `${insertedUser.first_name} ${insertedUser.last_name}`,
          {
            role: insertedUser.role,
            default_password: defaultPassword
          }
        )
      }

      setNewUser({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'guest',
        status: 'active',
        bio: '',
        avatar_url: '',
        strand: null,
        section: null,
        grade: null,
        batch_number: null,
      })
      setUploadedImage(null)
      setShowAddModal(false)

      showSuccess('User created successfully!', `Default password: ${defaultPassword}`)
      fetchUsers() // Refresh the user list
    } catch (error) {
      console.error('Error creating user:', error)
      showError('Error creating user', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  const handleEditUser = (userData: UserData) => {
    setEditingUser(userData)
    setNewUser({
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      password: '',
      role: userData.role as 'admin' | 'developer' | 'instructor' | 'scholar' | 'shs_student' | 'jhs_student' | 'college_student' | 'guest',
      status: userData.status as 'active' | 'inactive' | 'pending',
      bio: '',
      avatar_url: userData.avatar_url,
      strand: userData.strand || null,
      section: userData.section || null,
      grade: userData.grade || null,
      batch_number: userData.batch_number || null,
    })
    
    // Reset avatar states first
    setUploadedImage(null)
    
    // Then set based on existing avatar
    // Properly handle avatar state when editing
    if (userData.avatar_url) {
      if (userData.avatar_url.startsWith('data:')) {
        setUploadedImage(userData.avatar_url)
      } else if (userData.avatar_url.length > 2) {
        // It's a URL
        setUploadedImage(userData.avatar_url)
      }
    }
    
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    // Check if current user has permission to edit this user
    console.log('Current user role:', user?.profile?.role)
    console.log('Target user role:', editingUser.role)
    console.log('Can modify:', canModifyUser(editingUser.role))
    
    if (!canModifyUser(editingUser.role)) {
      setShowPermissionDeniedModal(true)
      setSubmitting(false)
      return
    }

    setSubmitting(true)

    try {
      // Determine the final avatar_url based on avatar type
      let finalAvatarUrl = newUser.avatar_url
      if (uploadedImage) {
        finalAvatarUrl = uploadedImage
      }

      console.log('Updating user with avatar:', finalAvatarUrl) // Debug log

      // Update profile fields
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          avatar_url: finalAvatarUrl,
          strand: newUser.strand,
          section: newUser.section,
          grade: newUser.grade,
          batch_number: newUser.batch_number,
        })
        .eq('id', editingUser.id)

      if (error) {
        console.error('Error updating user:', error)
        showError('Error updating user', error.message)
        return
      }

      // Hash and update password separately if provided
      if (newUser.password) {
        const { data: pwData, error: pwError } = await supabase.rpc('update_user_password', {
          p_user_id: editingUser.id,
          p_new_password: newUser.password
        })
        if (pwError || (pwData && !pwData.success)) {
          console.error('Error updating password:', pwError || pwData?.message)
          showError('Error updating password', pwError?.message || pwData?.message)
          return
        }
      }

      // Log the user update activity
      if (user?.id) {
        const changes = []
        if (editingUser.first_name !== newUser.first_name || editingUser.last_name !== newUser.last_name) {
          changes.push('name')
        }
        if (editingUser.email !== newUser.email) {
          changes.push('email')
        }
        if (editingUser.role !== newUser.role) {
          changes.push('role')
        }
        if (editingUser.status !== newUser.status) {
          changes.push('status')
        }
        if (editingUser.avatar_url !== finalAvatarUrl) {
          changes.push('avatar')
        }
        if (editingUser.strand !== newUser.strand) {
          changes.push('strand')
        }
        if (newUser.password) {
          changes.push('password')
        }

        if (changes.length > 0) {
          await logActivity({
            userId: user.id,
            activityType: 'user_updated',
            description: `Updated user: ${newUser.first_name} ${newUser.last_name} (${changes.join(', ')} changed)`,
            metadata: {
              updated_user_id: editingUser.id,
              updated_user_email: newUser.email,
              updated_user_name: `${newUser.first_name} ${newUser.last_name}`,
              changes: changes,
              old_values: {
                name: `${editingUser.first_name} ${editingUser.last_name}`,
                email: editingUser.email,
                role: editingUser.role,
                status: editingUser.status,
                avatar_url: editingUser.avatar_url,
                strand: editingUser.strand
              },
              new_values: {
                name: `${newUser.first_name} ${newUser.last_name}`,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status,
                avatar_url: finalAvatarUrl,
                strand: newUser.strand
              }
            }
          })
        }
      }

      setNewUser({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'guest',
        status: 'active',
        bio: '',
        avatar_url: '',
        strand: null,
        section: null,
        grade: null,
        batch_number: null,
      })
      setEditingUser(null)
      setUploadedImage(null)
      setShowEditModal(false)

      showSuccess('User updated successfully!')
      fetchUsers() // Refresh the user list
      
      // Refresh the current user's data if they edited their own profile
      if (editingUser.id === user?.id) {
        await refreshUser()
      }
    } catch (error) {
      console.error('Error updating user:', error)
      showError('Error updating user', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = (userData: UserData) => {
    setDeletingUser(userData)
    setShowDeleteModal(true)
  }

  const handleViewProfile = async (userData: UserData) => {
    // Navigate to profile page instead of showing modal
    if (onNavigateToProfile) {
      onNavigateToProfile(userData.id)
    }
  }

  const confirmDeleteUser = async () => {
    if (!deletingUser) return

    // Check if current user has permission to delete this user
    console.log('Delete - Current user role:', user?.profile?.role)
    console.log('Delete - Target user role:', deletingUser.role)
    console.log('Delete - Can modify:', canModifyUser(deletingUser.role))
    
    if (!canModifyUser(deletingUser.role)) {
      setShowPermissionDeniedModal(true)
      setSubmitting(false)
      setShowDeleteModal(false)
      return
    }

    setSubmitting(true)

    try {
      // Log the user deletion activity before deleting
      if (user?.id) {
        await logActivity({
          userId: user.id,
          activityType: 'user_deleted',
          description: `Deleted user: ${deletingUser.first_name} ${deletingUser.last_name} (${deletingUser.email})`,
          metadata: {
            deleted_user_id: deletingUser.id,
            deleted_user_email: deletingUser.email,
            deleted_user_name: `${deletingUser.first_name} ${deletingUser.last_name}`,
            deleted_user_role: deletingUser.role
          }
        })
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id)

      if (error) {
        console.error('Error deleting user:', error)
        showError('Error deleting user', error.message)
        return
      }

      setDeletingUser(null)
      setShowDeleteModal(false)

      showSuccess('User deleted successfully!')
      fetchUsers() // Refresh the user list
    } catch (error) {
      console.error('Error deleting user:', error)
      showError('Error deleting user', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <Loading size="lg" className="h-64" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Welcome Banner */}
      <div className="overflow-visible relative mb-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="z-10">
            <h2 className="text-xl font-bold text-gray-900">
              User Management
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage system users and their roles
            </p>
          </div>
        </div>
      </div>

      {/* Filters + Stats combined panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">

        {/* Filter row */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-gray-50"
              />
              <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Role */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
            <CustomSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'developer', label: 'Developer' },
                { value: 'instructor', label: 'Instructor' },
                { value: 'jhs_student', label: 'JHS Student' },
                { value: 'shs_student', label: 'SHS Student' },
                { value: 'college_student', label: 'College Student' },
                { value: 'scholar', label: 'TESDA Scholar' },
                { value: 'guest', label: 'Guest' },
              ]}
            />
          </div>

          {/* Status */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
          </div>

          {/* View toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">View</label>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`px-2.5 py-1 rounded-md transition-all flex items-center justify-center ${
                  viewMode === 'list' ? 'bg-white text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('card')}
                title="Card view"
                className={`px-2.5 py-1 rounded-md transition-all flex items-center justify-center ${
                  viewMode === 'card' ? 'bg-white text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add User */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-all flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Users Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* List View (Table) */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strand</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Life</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loading size="md" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No users found</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {u.avatar_url ? (
                            u.avatar_url.startsWith('data:') || u.avatar_url.startsWith('http') ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={u.avatar_url} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-600">
                                {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                              </div>
                            )
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                              {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <button
                            onClick={() => handleViewProfile({
                              id: u.id,
                              first_name: u.first_name,
                              last_name: u.last_name,
                              email: u.email || '',
                              role: u.role,
                              status: u.status || 'active',
                              teams: [],
                              avatar_url: u.avatar_url,
                              banner_url: u.banner_url,
                              created_at: u.created_at,
                              strand: u.strand,
                              section: u.section,
                              grade: u.grade,
                              batch_number: u.batch_number
                            })}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer transition-colors"
                          >
                            {u.first_name} {u.last_name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{u.email}</div>
                    </td>
                    {/* Role Icon */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(u.role as string)}`}
                        title={getRoleLabel(u.role as string)}
                      >
                        {u.role === 'admin' ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        ) : u.role === 'developer' ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        ) : u.role === 'instructor' ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                          </svg>
                        ) : u.role === 'scholar' ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                          </svg>
                        ) : (u.role === 'shs_student' || u.role === 'jhs_student' || u.role === 'college_student') ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                    {/* Grade Column */}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {(u.role === 'jhs_student' || u.role === 'shs_student') && u.grade
                        ? <span>Grade {u.grade}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Section Column */}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {(u.role === 'jhs_student' || u.role === 'shs_student' || u.role === 'college_student') && u.section
                        ? <span>Section {u.section}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Cluster Column */}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {u.role === 'shs_student' && u.strand
                        ? <span>{SHS_ACADEMIC_STRANDS.includes(u.strand) ? 'Academic' : 'Technical'}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Strand Column */}
                    <td className="px-4 py-2 text-xs text-gray-600 max-w-[160px]">
                      {u.role === 'shs_student' && u.strand
                        ? <span className="block truncate" title={u.strand}>{u.strand}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Batch Column */}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                      {u.role === 'scholar' && u.batch_number
                        ? <span>Batch {u.batch_number}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Account Life Column */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      {u.last_login_at ? (
                        <LastLoginCountdown 
                          lastLoginAt={u.last_login_at} 
                          isDeveloper={u.role === 'developer'}
                        />
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Never logged in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUserForSessions({
                            id: u.id,
                            first_name: u.first_name,
                            last_name: u.last_name,
                            email: u.email || '',
                            role: u.role,
                            status: u.status || 'active',
                            teams: [],
                            avatar_url: u.avatar_url,
                            created_at: u.created_at,
                            strand: u.strand,
                            section: u.section,
                            grade: u.grade,
                            batch_number: u.batch_number
                          })
                          setShowSessionsModal(true)
                        }}
                        className="p-1.5 rounded-lg text-primary-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                        title="View Sessions"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditUser({
                          id: u.id,
                          first_name: u.first_name,
                          last_name: u.last_name,
                          email: u.email || '',
                          role: u.role,
                          status: u.status || 'active',
                          teams: [],
                          avatar_url: u.avatar_url,
                          created_at: u.created_at,
                          strand: u.strand,
                          section: u.section,
                          grade: u.grade,
                          batch_number: u.batch_number
                        })}
                        className="p-1.5 rounded-lg text-primary-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                        title="Edit User"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteUser({
                          id: u.id,
                          first_name: u.first_name,
                          last_name: u.last_name,
                          email: u.email || '',
                          role: u.role,
                          status: u.status || 'active',
                          teams: [],
                          avatar_url: u.avatar_url,
                          created_at: u.created_at,
                          strand: u.strand,
                          section: u.section,
                          grade: u.grade,
                          batch_number: u.batch_number
                        })}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Delete User"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="p-4">
            {loading ? (
              <div className="text-center py-12">
                <Loading size="md" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedUsers.map((u) => (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start mb-4">
                    <div className="flex-shrink-0 h-14 w-14">
                      {u.avatar_url ? (
                        u.avatar_url.startsWith('data:') || u.avatar_url.startsWith('http') ? (
                          <img className="h-14 w-14 rounded-full object-cover" src={u.avatar_url} alt="" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-600">
                            {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                          </div>
                        )
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <button
                        onClick={() => handleViewProfile({
                          id: u.id,
                          first_name: u.first_name,
                          last_name: u.last_name,
                          email: u.email || '',
                          role: u.role,
                          status: u.status || 'active',
                          teams: [],
                          avatar_url: u.avatar_url,
                          banner_url: u.banner_url,
                          created_at: u.created_at,
                          strand: u.strand,
                          section: u.section,
                          grade: u.grade,
                          batch_number: u.batch_number
                        })}
                        className="font-semibold text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer transition-colors text-left"
                      >
                        {u.first_name} {u.last_name}
                      </button>
                      <div className="text-sm text-gray-500 mt-1">{u.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(u.role as string)}`}>
                      {getRoleLabel(u.role as string)}
                    </span>
                    {(u.role === 'shs_student' || u.role === 'jhs_student' || u.role === 'college_student') && u.strand && (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-500/10 text-primary-500">
                        {u.strand}
                      </span>
                    )}
                    {(u.role === 'shs_student' || u.role === 'jhs_student' || u.role === 'college_student') && u.section && (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-50 text-indigo-700">
                        {u.section}
                      </span>
                    )}
                    {(u.role === 'shs_student' || u.role === 'jhs_student' || u.role === 'college_student') && u.grade && (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-50 text-purple-700">
                        Grade {u.grade}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      u.status === 'active' ? 'bg-green-100 text-green-800' :
                      u.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {u.status || 'active'}
                    </span>
                    {/* Account Life - Inactivity Countdown (3 days from last login) */}
                    {u.last_login_at ? (
                      <LastLoginCountdown 
                        lastLoginAt={u.last_login_at} 
                        isDeveloper={u.role === 'developer'}
                      />
                    ) : (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Never logged in
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mb-4 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEditUser({
                        id: u.id,
                        first_name: u.first_name,
                        last_name: u.last_name,
                        email: u.email || '',
                        role: u.role,
                        status: u.status || 'active',
                        teams: [],
                        avatar_url: u.avatar_url,
                        created_at: u.created_at,
                        strand: u.strand,
                        section: u.section,
                        grade: u.grade,
                        batch_number: u.batch_number
                      })}
                      className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser({
                        id: u.id,
                        first_name: u.first_name,
                        last_name: u.last_name,
                        email: u.email || '',
                        role: u.role,
                        status: u.status || 'active',
                        teams: [],
                        avatar_url: u.avatar_url,
                        created_at: u.created_at,
                        strand: u.strand,
                        section: u.section,
                        grade: u.grade,
                        batch_number: u.batch_number
                      })}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Table Footer with Pagination */}
        {!loading && filteredUsers.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span>–<span className="font-medium">{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}</span> of <span className="font-medium">{filteredUsers.length}</span> users
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p as number)}
                        className={`px-3 py-1 text-sm rounded border ${currentPage === p ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Redesigned Modals */}
      <UserModal
        isOpen={showAddModal}
        onClose={() => {
          resetForm()
          setShowAddModal(false)
        }}
        onSubmit={handleSubmit}
        user={newUser}
        onInputChange={handleInputChange}
        submitting={submitting}
        isEditMode={false}
      />

      <UserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateUser}
        user={newUser}
        onInputChange={handleInputChange}
        submitting={submitting}
        isEditMode={true}
      />

      {/* Add New User Modal - Modern Design */}
      {false && showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                  <p className="text-sm text-gray-500 mt-1">Create a new account for the system</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {/* Personal Information */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Account Details
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Password
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value="Slate2026!"
                          readOnly
                          disabled
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">User can change this after first login</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <CustomSelect
                        value={newUser.role}
                        onChange={(v) => handleInputChange('role', v)}
                        options={[
                          { value: 'jhs_student', label: 'JHS Student' },
                          { value: 'shs_student', label: 'SHS Student' },
                          { value: 'college_student', label: 'College Student' },
                          { value: 'scholar', label: 'TESDA Scholar' },
                          { value: 'instructor', label: 'Instructor' },
                          { value: 'admin', label: 'Admin' },
                          { value: 'developer', label: 'Developer' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* SHS Strand - Only for trainees */}
                  {(newUser.role === 'shs_student' || newUser.role === 'jhs_student' || newUser.role === 'college_student') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SHS Strand
                      </label>
                      <CustomSelect
                        value={newUser.strand || ''}
                        onChange={(v) => handleInputChange('strand', v || null)}
                        options={[
                          { value: 'STEM', label: 'STEM' },
                          { value: 'ABM', label: 'ABM' },
                          { value: 'HUMSS', label: 'HUMSS' },
                          { value: 'GAS', label: 'GAS' },
                          { value: 'TVL-ICT', label: 'TVL-ICT' },
                          { value: 'TVL-HE', label: 'TVL-HE' },
                          { value: 'TVL-IA', label: 'TVL-IA' },
                          { value: 'TVL-Agri', label: 'TVL-Agri' },
                          { value: 'Arts and Design', label: 'Arts and Design' },
                          { value: 'Sports', label: 'Sports' },
                        ]}
                        placeholder="Select Strand"
                      />
                    </div>
                  )}

                  {/* Section and Grade - Only for trainees */}
                  {(newUser.role === 'shs_student' || newUser.role === 'jhs_student' || newUser.role === 'college_student') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section
                        </label>
                        <CustomSelect
                          value={newUser.section || ''}
                          onChange={(v) => handleInputChange('section', v || null)}
                          options={scientistSections.map((s) => ({ value: s, label: s }))}
                          placeholder="Select Section"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Grade
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={newUser.grade || ''}
                          onChange={(e) => handleInputChange('grade', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Enter grade (1-12)"
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 text-sm font-medium bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Creating User...' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal - Modern Design */}
      {false && showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
                  <p className="text-sm text-gray-500 mt-1">Update user information and settings</p>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="p-8">
              {/* Personal Information */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Account Details
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                        <span className="text-xs text-gray-500 ml-2">(leave blank to keep current)</span>
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <CustomSelect
                        value={newUser.role}
                        onChange={(v) => handleInputChange('role', v)}
                        options={[
                          { value: 'jhs_student', label: 'JHS Student' },
                          { value: 'shs_student', label: 'SHS Student' },
                          { value: 'college_student', label: 'College Student' },
                          { value: 'scholar', label: 'TESDA Scholar' },
                          { value: 'instructor', label: 'Instructor' },
                          { value: 'admin', label: 'Admin' },
                          { value: 'developer', label: 'Developer' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* SHS Strand - Only for trainees */}
                  {(newUser.role === 'shs_student' || newUser.role === 'jhs_student' || newUser.role === 'college_student') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SHS Strand
                      </label>
                      <CustomSelect
                        value={newUser.strand || ''}
                        onChange={(v) => handleInputChange('strand', v || null)}
                        options={[
                          { value: 'STEM', label: 'STEM' },
                          { value: 'ABM', label: 'ABM' },
                          { value: 'HUMSS', label: 'HUMSS' },
                          { value: 'GAS', label: 'GAS' },
                          { value: 'TVL-ICT', label: 'TVL-ICT' },
                          { value: 'TVL-HE', label: 'TVL-HE' },
                          { value: 'TVL-IA', label: 'TVL-IA' },
                          { value: 'TVL-Agri', label: 'TVL-Agri' },
                          { value: 'Arts and Design', label: 'Arts and Design' },
                          { value: 'Sports', label: 'Sports' },
                        ]}
                        placeholder="Select Strand"
                      />
                    </div>
                  )}

                  {/* Section and Grade - Only for trainees */}
                  {(newUser.role === 'shs_student' || newUser.role === 'jhs_student' || newUser.role === 'college_student') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section
                        </label>
                        <CustomSelect
                          value={newUser.section || ''}
                          onChange={(v) => handleInputChange('section', v || null)}
                          options={scientistSections.map((s) => ({ value: s, label: s }))}
                          placeholder="Select Section"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Grade
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={newUser.grade || ''}
                          onChange={(e) => handleInputChange('grade', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Enter grade (1-12)"
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 text-sm font-medium bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Updating User...' : 'Update User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Delete User</h3>
                  <p className="text-gray-600">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{deletingUser.first_name} {deletingUser.last_name}</strong>? 
                This will permanently remove their account and all associated data.
              </p>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonLoading />}
                  <span>{submitting ? 'Deleting...' : 'Delete User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Modal */}
      {showPermissionDeniedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-8 text-center">
              {/* GIF */}
              <div className="mb-6">
                <img 
                  src="/dev.gif" 
                  alt="Permission Denied" 
                  className="w-full h-auto mx-auto rounded-xl"
                />
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowPermissionDeniedModal(false)}
                className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all font-medium"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Sessions Modal */}
      {showSessionsModal && selectedUserForSessions && (
        <UserSessionsModal
          userId={selectedUserForSessions.id}
          userName={`${selectedUserForSessions.first_name} ${selectedUserForSessions.last_name}`}
          onClose={() => {
            setShowSessionsModal(false)
            setSelectedUserForSessions(null)
          }}
        />
      )}
    </div>
  )
}

