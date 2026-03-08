'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { logUserCreation, logActivity } from '@/lib/activityLogger'
import { UserModal, type NewUser } from '@/components/UserModals'
import { Loading, ButtonLoading } from '@/components/ui/loading'
import { getRoleColor, getRoleLabel } from '@/utils/roleUtils'

interface UserData {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'developer' | 'instructor' | 'scholar' | 'student' | 'guest'
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
  account_tier?: 'visitor' | 'beginner' | 'intermediate' | 'expert' | 'vip'
  account_expires_at?: string | null
  account_duration_days?: number | null
  inactive_since?: string | null
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  email?: string
  role: 'admin' | 'developer' | 'instructor' | 'scholar' | 'student' | 'guest'
  status?: string
  avatar_url: string | null
  banner_url?: string | null
  created_at: string
  strand?: string | null
  section?: string | null
  grade?: number | null
  account_tier?: 'visitor' | 'beginner' | 'intermediate' | 'expert' | 'vip'
  account_expires_at?: string | null
  account_duration_days?: number | null
  inactive_since?: string | null
}

const animalAvatars = [
  { id: 'cat', name: 'Cat', emoji: '🐱' },
  { id: 'dog', name: 'Dog', emoji: '🐶' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰' },
  { id: 'fox', name: 'Fox', emoji: '🦊' },
  { id: 'bear', name: 'Bear', emoji: '🐻' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'koala', name: 'Koala', emoji: '🐨' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯' },
  { id: 'lion', name: 'Lion', emoji: '🦁' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵' },
  { id: 'pig', name: 'Pig', emoji: '🐷' },
  { id: 'frog', name: 'Frog', emoji: '🐸' },
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
  const [viewingProfile, setViewingProfile] = useState<UserData | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<string>('cat')
  const [avatarType, setAvatarType] = useState<'animal' | 'upload'>('animal')
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
    account_tier: 'visitor'
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
      account_tier: 'visitor'
    })
    setSelectedAvatar('cat')
    setAvatarType('animal')
    setUploadedImage(null)
  }

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

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

  const handleAvatarSelect = (animalId: string) => {
    setSelectedAvatar(animalId)
    const animal = animalAvatars.find(a => a.id === animalId)
    setNewUser(prev => ({ ...prev, avatar_url: animal?.emoji || null }))
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
      if (insertedUser && (newUser.avatar_url || newUser.strand || newUser.section || newUser.grade)) {
        await supabase
          .from('profiles')
          .update({ 
            avatar_url: newUser.avatar_url,
            strand: newUser.strand,
            section: newUser.section,
            grade: newUser.grade
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
        account_tier: 'visitor'
      })
      setSelectedAvatar('cat')
      setAvatarType('animal')
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
      role: userData.role as 'admin' | 'developer' | 'instructor' | 'scholar' | 'student' | 'guest',
      status: userData.status as 'active' | 'inactive' | 'pending',
      bio: '',
      avatar_url: userData.avatar_url,
      strand: userData.strand || null,
      section: userData.section || null,
      grade: userData.grade || null,
      batch_number: userData.batch_number || null,
      account_tier: userData.account_tier || 'visitor'
    })
    
    // Reset avatar states first
    setUploadedImage(null)
    setSelectedAvatar('cat')
    setAvatarType('animal')
    
    // Then set based on existing avatar
    // Properly handle avatar state when editing
    if (userData.avatar_url) {
      if (userData.avatar_url.startsWith('data:')) {
        setAvatarType('upload')
        setUploadedImage(userData.avatar_url)
      } else if (userData.avatar_url.length <= 2) {
        // It's an emoji
        setAvatarType('animal')
        const animal = animalAvatars.find(a => a.emoji === userData.avatar_url)
        if (animal) {
          setSelectedAvatar(animal.id)
        } else {
          setSelectedAvatar('cat')
        }
      } else {
        // It's a URL
        setAvatarType('upload')
        setUploadedImage(userData.avatar_url)
      }
    } else {
      // No avatar, default to animal
      setAvatarType('animal')
      setSelectedAvatar('cat')
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
      if (avatarType === 'animal') {
        const animal = animalAvatars.find(a => a.id === selectedAvatar)
        finalAvatarUrl = animal?.emoji || null
      } else if (avatarType === 'upload') {
        finalAvatarUrl = uploadedImage
      }

      console.log('Updating user with avatar:', finalAvatarUrl) // Debug log

      // Update account tier if changed
      if (newUser.account_tier && editingUser.account_tier !== newUser.account_tier) {
        const { data: tierData, error: tierError } = await supabase.rpc('update_account_tier', {
          p_user_id: editingUser.id,
          p_tier: newUser.account_tier
        })

        if (tierError) {
          console.error('Error updating account tier:', tierError)
          showError('Error updating account tier', tierError.message)
          setSubmitting(false)
          return
        }

        if (tierData && !tierData.success) {
          showError('Error updating account tier', tierData.message)
          setSubmitting(false)
          return
        }
      }

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
          ...(newUser.password && { password: newUser.password })
        })
        .eq('id', editingUser.id)

      if (error) {
        console.error('Error updating user:', error)
        showError('Error updating user', error.message)
        return
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
        account_tier: 'visitor'
      })
      setEditingUser(null)
      setSelectedAvatar('cat')
      setAvatarType('animal')
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
      <div className="overflow-visible relative min-h-[80px] mb-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="z-10 pr-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              User Management
            </h2>
            <p className="text-gray-600">
              Manage system users and their roles
            </p>
          </div>
          
          {/* Book Illustration - Overlapping */}
          <div className="hidden md:block absolute -top-16 w-40 h-40 z-0" style={{ right: '5px' }}>
            <img 
              src="/book.png" 
              alt="Book illustration" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="instructor">Instructor</option>
              <option value="scholar">Scholar</option>
              <option value="student">Student</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* View Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-[#475569] text-white border-[#475569]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="text-sm font-medium">List</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  viewMode === 'card'
                    ? 'bg-[#475569] text-white border-[#475569]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="text-sm font-medium">Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Admins</p>
              <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'admin').length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Instructors */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Instructors</p>
              <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'instructor').length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Students</p>
              <p className="text-2xl font-bold text-orange-600">{users.filter(u => u.role === 'student').length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Scholars */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Scholars</p>
              <p className="text-2xl font-bold text-[#475569]">{users.filter(u => u.role === 'scholar').length}</p>
            </div>
            <div className="w-12 h-12 bg-[#475569]/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Users Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* List View (Table) */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Life</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loading size="md" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {u.avatar_url ? (
                            u.avatar_url.startsWith('data:') ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={u.avatar_url} alt="" />
                            ) : u.avatar_url.length <= 2 ? (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
                                {u.avatar_url}
                              </div>
                            ) : (
                              <img className="h-10 w-10 rounded-full object-cover" src={u.avatar_url} alt="" />
                            )
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                              {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
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
                              grade: u.grade
                            })}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer transition-colors"
                          >
                            {u.first_name} {u.last_name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{u.email}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(u.role as string)}`}>
                        {getRoleLabel(u.role as string)}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' :
                        u.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {u.account_expires_at ? (
                          (() => {
                            const expirationDate = new Date(u.account_expires_at)
                            const now = new Date()
                            const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            const isExpired = daysLeft < 0
                            const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0
                            
                            return (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                isExpired ? 'bg-red-100 text-red-800' :
                                isExpiringSoon ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {isExpired ? 'Expired' : `${daysLeft}d left`}
                              </span>
                            )
                          })()
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Permanent
                          </span>
                        )}
                        {u.status === 'inactive' && u.inactive_since && u.role !== 'developer' && (
                          (() => {
                            const inactiveSince = new Date(u.inactive_since)
                            const deletionDate = new Date(inactiveSince.getTime() + 3 * 24 * 60 * 60 * 1000)
                            const hoursLeft = Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60))
                            
                            if (hoursLeft <= 0) {
                              return (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  ⚠️ Pending Deletion
                                </span>
                              )
                            } else if (hoursLeft <= 24) {
                              return (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                  ⏰ Deletes in {hoursLeft}h
                                </span>
                              )
                            } else {
                              const daysLeft = Math.ceil(hoursLeft / 24)
                              return (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Deletes in {daysLeft}d
                                </span>
                              )
                            }
                          })()
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
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
                          grade: u.grade
                        })}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
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
                          grade: u.grade
                        })}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
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
              {filteredUsers.map((u) => (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start mb-4">
                    <div className="flex-shrink-0 h-14 w-14">
                      {u.avatar_url ? (
                        u.avatar_url.startsWith('data:') ? (
                          <img className="h-14 w-14 rounded-full object-cover" src={u.avatar_url} alt="" />
                        ) : u.avatar_url.length <= 2 ? (
                          <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                            {u.avatar_url}
                          </div>
                        ) : (
                          <img className="h-14 w-14 rounded-full object-cover" src={u.avatar_url} alt="" />
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
                          grade: u.grade
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
                    {u.role === 'student' && u.strand && (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#475569]/10 text-[#475569]">
                        {u.strand}
                      </span>
                    )}
                    {u.role === 'student' && u.section && (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-50 text-indigo-700">
                        {u.section}
                      </span>
                    )}
                    {u.role === 'student' && u.grade && (
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
                    {u.account_expires_at ? (
                      (() => {
                        const expirationDate = new Date(u.account_expires_at)
                        const now = new Date()
                        const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        const isExpired = daysLeft < 0
                        const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0
                        
                        return (
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isExpired ? 'bg-red-100 text-red-800' :
                            isExpiringSoon ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {isExpired ? 'Expired' : `${daysLeft}d left`}
                          </span>
                        )
                      })()
                    ) : (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Permanent
                      </span>
                    )}
                    {u.status === 'inactive' && u.inactive_since && u.role !== 'developer' && (
                      (() => {
                        const inactiveSince = new Date(u.inactive_since)
                        const deletionDate = new Date(inactiveSince.getTime() + 3 * 24 * 60 * 60 * 1000)
                        const hoursLeft = Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60))
                        
                        if (hoursLeft <= 0) {
                          return (
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              ⚠️ Pending Deletion
                            </span>
                          )
                        } else if (hoursLeft <= 24) {
                          return (
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                              ⏰ Deletes in {hoursLeft}h
                            </span>
                          )
                        } else {
                          const daysLeft = Math.ceil(hoursLeft / 24)
                          return (
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Deletes in {daysLeft}d
                            </span>
                          )
                        }
                      })()
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
                        grade: u.grade
                      })}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
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
                        grade: u.grade
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

        {/* Table Footer with Count */}
        {!loading && filteredUsers.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredUsers.length}</span> of <span className="font-medium">{users.length}</span> users
            </div>
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
        selectedAvatar={selectedAvatar}
        onAvatarSelect={handleAvatarSelect}
        isEditMode={false}
      />

      <UserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateUser}
        user={newUser}
        onInputChange={handleInputChange}
        submitting={submitting}
        selectedAvatar={selectedAvatar}
        onAvatarSelect={(id) => {
          setSelectedAvatar(id)
          const animal = animalAvatars.find(a => a.id === id)
          handleInputChange('avatar_url', animal?.emoji || null)
        }}
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
                      <select
                        value={newUser.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                      >
                        <option value="trainee">trainee</option>
                        <option value="trainee">trainee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* SHS Strand - Only for trainees */}
                  {newUser.role === 'student' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SHS Strand
                      </label>
                      <select
                        value={newUser.strand || ''}
                        onChange={(e) => handleInputChange('strand', e.target.value || null)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                      >
                        <option value="">Select Strand</option>
                        <option value="STEM">STEM</option>
                        <option value="ABM">ABM</option>
                        <option value="HUMSS">HUMSS</option>
                        <option value="GAS">GAS</option>
                        <option value="TVL-ICT">TVL-ICT</option>
                        <option value="TVL-HE">TVL-HE</option>
                        <option value="TVL-IA">TVL-IA</option>
                        <option value="TVL-Agri">TVL-Agri</option>
                        <option value="Arts and Design">Arts and Design</option>
                        <option value="Sports">Sports</option>
                      </select>
                    </div>
                  )}

                  {/* Section and Grade - Only for trainees */}
                  {newUser.role === 'student' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section
                        </label>
                        <select
                          value={newUser.section || ''}
                          onChange={(e) => handleInputChange('section', e.target.value || null)}
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                        >
                          <option value="">Select Section</option>
                          {scientistSections.map((section) => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
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

              {/* Avatar Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Choose Avatar
                </h3>
                <div className="grid grid-cols-12 gap-2">
                  {animalAvatars.map((animal) => (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => handleAvatarSelect(animal.id)}
                      className={`aspect-square flex items-center justify-center text-2xl rounded-xl border-2 transition-all transform hover:scale-110 ${
                        selectedAvatar === animal.id
                          ? 'border-black bg-gray-100 shadow-md scale-105'
                          : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                      }`}
                      title={animal.name}
                    >
                      {animal.emoji}
                    </button>
                  ))}
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
                  className="px-6 py-3 text-sm font-medium bg-[#475569] text-white rounded-xl hover:bg-[#1E293B] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
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
                      <select
                        value={newUser.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                      >
                        <option value="trainee">trainee</option>
                        <option value="trainee">trainee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* SHS Strand - Only for trainees */}
                  {newUser.role === 'student' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SHS Strand
                      </label>
                      <select
                        value={newUser.strand || ''}
                        onChange={(e) => handleInputChange('strand', e.target.value || null)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                      >
                        <option value="">Select Strand</option>
                        <option value="STEM">STEM</option>
                        <option value="ABM">ABM</option>
                        <option value="HUMSS">HUMSS</option>
                        <option value="GAS">GAS</option>
                        <option value="TVL-ICT">TVL-ICT</option>
                        <option value="TVL-HE">TVL-HE</option>
                        <option value="TVL-IA">TVL-IA</option>
                        <option value="TVL-Agri">TVL-Agri</option>
                        <option value="Arts and Design">Arts and Design</option>
                        <option value="Sports">Sports</option>
                      </select>
                    </div>
                  )}

                  {/* Section and Grade - Only for trainees */}
                  {newUser.role === 'student' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section
                        </label>
                        <select
                          value={newUser.section || ''}
                          onChange={(e) => handleInputChange('section', e.target.value || null)}
                          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                        >
                          <option value="">Select Section</option>
                          {scientistSections.map((section) => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
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

              {/* Avatar Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Choose Avatar
                </h3>
                <div className="grid grid-cols-12 gap-2">
                  {animalAvatars.map((animal) => (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(animal.id)
                        handleInputChange('avatar_url', animal.emoji)
                      }}
                      className={`aspect-square flex items-center justify-center text-2xl rounded-xl border-2 transition-all transform hover:scale-110 ${
                        selectedAvatar === animal.id
                          ? 'border-black bg-gray-100 shadow-md scale-105'
                          : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                      }`}
                      title={animal.name}
                    >
                      {animal.emoji}
                    </button>
                  ))}
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
                  className="px-6 py-3 text-sm font-medium bg-[#475569] text-white rounded-xl hover:bg-[#1E293B] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
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
          <div className="bg-white rounded-2xl max-w-md w-full">
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
                  className="w-full h-auto mx-auto rounded-2xl"
                />
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowPermissionDeniedModal(false)}
                className="w-full px-6 py-3 bg-[#475569] text-white rounded-xl hover:bg-[#1E293B] transition-all font-medium"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

