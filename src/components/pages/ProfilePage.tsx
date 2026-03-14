'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading, ButtonLoading } from '@/components/ui/loading'
import { useToast } from '@/contexts/ToastContext'
import { getRoleLabel } from '@/utils/roleUtils'

interface Friend {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url: string | null
  status?: string
  created_at?: string
}

interface Post {
  id: string
  user_id: string
  content: string
  emotion: string | null
  image_url: string | null
  created_at: string
  user: {
    first_name: string
    last_name: string
    avatar_url: string | null
    role: string
  }
  reactions: PostReaction[]
  comments: PostComment[]
  reaction_counts: { [key: string]: number }
  user_reaction: string | null
}

interface PostReaction {
  id: string
  user_id: string
  reaction_type: string
}

interface PostComment {
  id: string
  user_id: string
  content: string
  created_at: string
  user: {
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

const emotions = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'excited', label: 'Excited', emoji: '🎉' },
  { value: 'loved', label: 'Loved', emoji: '❤️' },
  { value: 'angry', label: 'Angry', emoji: '😠' },
  { value: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
  { value: 'celebrating', label: 'Celebrating', emoji: '🥳' },
]

const reactions = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😠', label: 'Angry' },
]

interface ProfilePageProps {
  userId?: string // Optional userId to view other profiles
  onNavigateToProfile?: (userId?: string) => void // Callback to navigate to another profile
}

export default function ProfilePage({ userId, onNavigateToProfile }: ProfilePageProps = {}) {
  const { user, refreshUser } = useAuth()
  const { showSuccess, showError } = useToast()
  const [profileUser, setProfileUser] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [postImage, setPostImage] = useState<string | null>(null)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [showEmotionPicker, setShowEmotionPicker] = useState(false)
  const [commentingOnPost, setCommentingOnPost] = useState<string | null>(null)
  const [commentContent, setCommentContent] = useState('')
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'newsfeed'>('home')
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [isRepositioning, setIsRepositioning] = useState(false)
  const [bannerPositionY, setBannerPositionY] = useState(50) // Percentage from top
  
  // Friends-related state
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
  const [allUsers, setAllUsers] = useState<Friend[]>([])
  const [connectionStatus, setConnectionStatus] = useState<string>('none')
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const supabase = createClient()

  // Determine which user profile to display
  const displayUserId = userId || user?.id
  const isOwnProfile = !userId || userId === user?.id

  // Fetch profile user data if viewing another user's profile
  useEffect(() => {
    if (displayUserId && !isOwnProfile) {
      fetchProfileUser()
    } else if (isOwnProfile) {
      setProfileUser(user)
    }
  }, [displayUserId, isOwnProfile, user])

  // Fetch posts
  useEffect(() => {
    if (displayUserId) {
      setIsInitialLoad(true)
      fetchPosts()
      
      // Set up real-time subscription for posts
      const postsChannel = supabase
        .channel('posts-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'posts' },
          () => {
            fetchPosts(false) // Refresh without showing loading
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'post_reactions' },
          () => {
            fetchPosts(false) // Refresh without showing loading
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'post_comments' },
          () => {
            fetchPosts(false) // Refresh without showing loading
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(postsChannel)
      }
    }
  }, [displayUserId, activeTab])

  const fetchProfileUser = async () => {
    try {
      setLoadingProfile(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', displayUserId)
        .single()

      if (error) throw error
      setProfileUser({ id: displayUserId, profile: data, email: data.email })
    } catch (error) {
      console.error('Error fetching profile user:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  // Load friends when viewing a profile
  useEffect(() => {
    if (displayUserId) {
      loadFriends()
      if (isOwnProfile) {
        loadPendingRequests()
      } else {
        checkConnectionStatus()
      }
    }
  }, [displayUserId, isOwnProfile])

  const loadFriends = async () => {
    if (!displayUserId) {
      console.error('Cannot load friends: displayUserId is undefined')
      return
    }

    try {
      setLoadingFriends(true)
      console.log('Loading friends for user:', displayUserId)
      
      // Query connections table directly instead of using RPC
      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('user_id, friend_id')
        .or(`user_id.eq.${displayUserId},friend_id.eq.${displayUserId}`)
        .eq('status', 'accepted')

      if (connError) {
        console.error('Error loading connections:', connError)
        throw connError
      }

      if (!connections || connections.length === 0) {
        console.log('No friends found')
        setFriends([])
        return
      }

      // Get friend IDs (the other user in each connection)
      const friendIds = connections.map((conn: any) => 
        conn.user_id === displayUserId ? conn.friend_id : conn.user_id
      )

      console.log('Friend IDs:', friendIds)

      // Fetch friend profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url')
        .in('id', friendIds)

      if (profileError) {
        console.error('Error loading friend profiles:', profileError)
        throw profileError
      }

      console.log('Friends loaded successfully:', profiles)
      setFriends(profiles || [])
    } catch (error: any) {
      console.error('Error loading friends:', error)
      showError('Error', 'Failed to load friends')
    } finally {
      setLoadingFriends(false)
    }
  }

  const loadPendingRequests = async () => {
    if (!user?.id) {
      console.error('Cannot load pending requests: user.id is undefined')
      return
    }

    try {
      console.log('Loading pending requests for user:', user.id)
      
      // Query connections where current user is the friend_id and status is pending
      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('user_id')
        .eq('friend_id', user.id)
        .eq('status', 'pending')

      if (connError) {
        console.error('Error loading pending connections:', connError)
        throw connError
      }

      if (!connections || connections.length === 0) {
        console.log('No pending requests found')
        setPendingRequests([])
        return
      }

      // Get sender IDs
      const senderIds = connections.map((conn: any) => conn.user_id)

      console.log('Sender IDs:', senderIds)

      // Fetch sender profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url')
        .in('id', senderIds)

      if (profileError) {
        console.error('Error loading sender profiles:', profileError)
        throw profileError
      }

      console.log('Pending requests loaded successfully:', profiles)
      setPendingRequests(profiles || [])
    } catch (error: any) {
      console.error('Error loading pending requests:', error)
      showError('Error', 'Failed to load pending requests')
    }
  }

  const checkConnectionStatus = async () => {
    if (!user?.id || !displayUserId) {
      console.log('Cannot check connection status: missing user IDs', { userId: user?.id, displayUserId })
      return
    }

    try {
      console.log('Checking connection status between:', user.id, 'and', displayUserId)
      
      // Try a simpler query approach - check both directions separately
      const { data: connection1, error: error1 } = await supabase
        .from('connections')
        .select('status')
        .eq('user_id', user.id)
        .eq('friend_id', displayUserId)
        .maybeSingle()

      if (error1) {
        console.error('Error checking connection (direction 1):', error1)
      }

      const { data: connection2, error: error2 } = await supabase
        .from('connections')
        .select('status')
        .eq('user_id', displayUserId)
        .eq('friend_id', user.id)
        .maybeSingle()

      if (error2) {
        console.error('Error checking connection (direction 2):', error2)
      }

      // Use whichever connection exists
      const connection = connection1 || connection2
      const status = connection?.status || 'none'
      
      console.log('Connection found:', connection)
      console.log('Connection status:', status)
      setConnectionStatus(status)
    } catch (error) {
      console.error('Error checking connection status:', error)
      setConnectionStatus('none')
    }
  }

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url')
        .neq('id', user?.id)
        .order('first_name')

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const sendFriendRequest = async (friendId: string) => {
    if (!user?.id) return

    try {
      setActionLoading(friendId)
      console.log('Sending friend request from', user.id, 'to', friendId)
      
      const { data, error } = await supabase.rpc('send_friend_request', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) {
        console.error('Error sending friend request:', error)
        throw error
      }

      console.log('Friend request response:', data)

      if (data.success) {
        showSuccess('Request Sent', data.message)
        console.log('Friend request sent successfully, refreshing connection status')
        
        // Small delay to ensure database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Refresh connection status from database
        if (!isOwnProfile) {
          await checkConnectionStatus()
        }
        
        setShowAddFriendModal(false)
      } else {
        // Even if it says "already sent", refresh the status
        if (data.message && data.message.includes('already')) {
          console.log('Request already exists, refreshing connection status')
          if (!isOwnProfile) {
            await checkConnectionStatus()
          }
        }
        showError('Error', data.message)
      }
    } catch (error: any) {
      console.error('Error in sendFriendRequest:', error)
      showError('Error', error.message || 'Failed to send friend request')
    } finally {
      setActionLoading(null)
    }
  }

  const acceptFriendRequest = async (friendId: string) => {
    if (!user?.id) return

    try {
      setActionLoading(friendId)
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        showSuccess('Success', data.message)
        loadFriends()
        loadPendingRequests()
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const rejectFriendRequest = async (friendId: string) => {
    if (!user?.id) return

    try {
      setActionLoading(friendId)
      const { data, error} = await supabase.rpc('reject_friend_request', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        showSuccess('Success', data.message)
        loadPendingRequests()
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const removeFriend = async (friendId: string, isCancelRequest: boolean = false) => {
    if (!user?.id) return

    // Different confirmation messages based on action
    const confirmMessage = isCancelRequest 
      ? 'Are you sure you want to cancel this friend request?'
      : 'Are you sure you want to remove this friend?'
    
    if (!confirm(confirmMessage)) return

    try {
      setActionLoading(friendId)
      const { data, error } = await supabase.rpc('remove_friend', {
        p_user_id: user.id,
        p_friend_id: friendId
      })

      if (error) throw error

      if (data.success) {
        const successMessage = isCancelRequest ? 'Friend request cancelled' : 'Friend removed'
        showSuccess('Success', successMessage)
        loadFriends()
        if (!isOwnProfile) {
          setConnectionStatus('none')
        }
      } else {
        showError('Error', data.message)
      }
    } catch (error: any) {
      showError('Error', error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getAvatarDisplay = (avatarUrl: string | null) => {
    if (!avatarUrl) return '👤'
    
    const animalAvatars: { [key: string]: string } = {
      'cat': '🐱', 'dog': '🐶', 'rabbit': '🐰', 'fox': '🦊',
      'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'tiger': '🐯',
      'lion': '🦁', 'monkey': '🐵', 'pig': '🐷', 'frog': '🐸'
    }
    
    return animalAvatars[avatarUrl] || avatarUrl
  }

  const fetchPosts = async (showLoading = true) => {
    try {
      if (showLoading && isInitialLoad) {
        setLoadingPosts(true)
      }
      
      // Fetch posts with user info - filter based on active tab
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:profiles!posts_user_id_fkey(first_name, last_name, avatar_url, role)
        `)
      
      // Filter by user ID only on Home tab
      if (activeTab === 'home') {
        query = query.eq('user_id', displayUserId)
      }
      
      const { data: postsData, error: postsError } = await query.order('created_at', { ascending: false })

      if (postsError) throw postsError

      // Fetch reactions for all posts
      const postIds = postsData?.map((p: any) => p.id) || []
      const { data: reactionsData } = await supabase
        .from('post_reactions')
        .select('*')
        .in('post_id', postIds)

      // Fetch comments for all posts
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:profiles!post_comments_user_id_fkey(first_name, last_name, avatar_url)
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true })

      // Combine data
      const postsWithDetails = postsData?.map((post: any) => {
        const postReactions = reactionsData?.filter((r: any) => r.post_id === post.id) || []
        const postComments = commentsData?.filter((c: any) => c.post_id === post.id) || []
        
        // Count reactions by type
        const reactionCounts: { [key: string]: number } = {}
        postReactions.forEach((r: any) => {
          reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1
        })

        // Get user's reaction
        const userReaction = postReactions.find((r: any) => r.user_id === user?.id)?.reaction_type || null

        return {
          ...post,
          reactions: postReactions,
          comments: postComments,
          reaction_counts: reactionCounts,
          user_reaction: userReaction
        }
      }) || []

      setPosts(postsWithDetails)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      if (isInitialLoad) {
        setLoadingPosts(false)
        setIsInitialLoad(false)
      }
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPostImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !postImage) {
      alert('Please add some content or an image')
      return
    }

    setSubmittingPost(true)
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          content: newPostContent.trim(),
          emotion: selectedEmotion,
          image_url: postImage
        })

      if (error) throw error

      setNewPostContent('')
      setSelectedEmotion(null)
      setPostImage(null)
      setShowEmotionPicker(false)
      // Real-time subscription will handle the refresh
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      const post = posts.find(p => p.id === postId)
      if (!post) return

      // If user already has this reaction, remove it
      if (post.user_reaction === reactionType) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user?.id)
      } else {
        // Remove existing reaction and add new one
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user?.id)

        await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user?.id,
            reaction_type: reactionType
          })
      }

      setShowReactionPicker(null)
      // Real-time subscription will handle the refresh
    } catch (error) {
      console.error('Error handling reaction:', error)
    }
  }

  const handleComment = async (postId: string) => {
    if (!commentContent.trim()) return

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user?.id,
          content: commentContent.trim()
        })

      if (error) throw error

      setCommentContent('')
      setCommentingOnPost(null)
      // Real-time subscription will handle the refresh
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id)

      if (error) throw error
      // Real-time subscription will handle the refresh
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setUploadingBanner(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        // Update profile with banner
        const { error } = await supabase
          .from('profiles')
          .update({ banner_url: base64String })
          .eq('id', user.id)

        if (error) {
          console.error('Error uploading banner:', error)
          alert('Failed to upload banner')
        } else {
          await refreshUser()
          alert('Banner uploaded successfully!')
        }
        setUploadingBanner(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading banner:', error)
      alert('Failed to upload banner')
      setUploadingBanner(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setUploadingAvatar(true)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        // Update profile with avatar
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: base64String })
          .eq('id', user.id)

        if (error) {
          console.error('Error uploading avatar:', error)
          alert('Failed to upload avatar')
        } else {
          await refreshUser()
          alert('Avatar uploaded successfully!')
        }
        setUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar')
      setUploadingAvatar(false)
    }
  }

  const handleRemoveBanner = async () => {
    if (!user?.id) return

    if (!confirm('Are you sure you want to remove your banner?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ banner_url: null })
        .eq('id', user.id)

      if (error) {
        console.error('Error removing banner:', error)
        alert('Failed to remove banner')
      } else {
        await refreshUser()
        alert('Banner removed successfully!')
      }
    } catch (error) {
      console.error('Error removing banner:', error)
      alert('Failed to remove banner')
    }
  }

  const handleSavePosition = () => {
    setIsRepositioning(false)
    setShowBannerModal(false)
    alert('Banner position saved!')
  }

  const handleCancelReposition = () => {
    setIsRepositioning(false)
    setBannerPositionY(50)
  }

  if (!user || (loadingProfile && !isOwnProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  const displayUser = profileUser || user
  const bannerUrl = displayUser?.profile?.banner_url

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header with Banner */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto">
          {/* Banner Section */}
          <div className="relative w-full h-32 md:h-48 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
            <div className="absolute inset-0">
              {bannerUrl ? (
                <img 
                  src={bannerUrl} 
                  alt="Profile Banner"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `center ${bannerPositionY}%`
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
              )}
            </div>
            
            {/* Reposition Controls Overlay */}
            {isRepositioning && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20">
                <div className="text-center text-white mb-6">
                  <p className="text-lg font-semibold mb-2">Adjust banner position</p>
                  <p className="text-sm text-gray-300">Use the slider to move the image up or down</p>
                </div>
                
                {/* Slider */}
                <div className="w-64 mb-6">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bannerPositionY}
                    onChange={(e) => setBannerPositionY(Number(e.target.value))}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${bannerPositionY}%, #d1d5db ${bannerPositionY}%, #d1d5db 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-300 mt-1">
                    <span>Top</span>
                    <span>Center</span>
                    <span>Bottom</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSavePosition}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelReposition}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Edit Cover Photo Button - Only show for own profile */}
            {isOwnProfile && !isRepositioning && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  onClick={() => setShowBannerModal(!showBannerModal)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit cover photo
                </button>
              </div>
            )}
          </div>

          {/* Dropdown Menu - Rendered outside overflow container */}
          {isOwnProfile && showBannerModal && !isRepositioning && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowBannerModal(false)}
              />
              
              {/* Menu - positioned relative to viewport */}
              <div className="relative">
                <div className="absolute top-0 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                  {/* Menu Items */}
                  <div className="py-2">
                    {/* Upload Photo Option */}
                    <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-gray-900 font-medium">Upload photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleBannerUpload(e)
                          setShowBannerModal(false)
                        }}
                        disabled={uploadingBanner}
                        className="hidden"
                      />
                    </label>

                    {/* Reposition Option */}
                    {bannerUrl && (
                      <button
                        onClick={() => {
                          setIsRepositioning(true)
                          setShowBannerModal(false)
                        }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full text-left"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span className="text-gray-900 font-medium">Reposition</span>
                      </button>
                    )}

                    {/* Remove Option */}
                    {bannerUrl && (
                      <>
                        <div className="my-2 border-t border-gray-200"></div>
                        <button
                          onClick={() => {
                            handleRemoveBanner()
                            setShowBannerModal(false)
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors w-full text-left bg-gray-50"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="text-gray-900 font-medium">Remove</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile Info */}
          <div className="px-4 py-4 md:py-8">
            <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-6 -mt-16 md:-mt-20 relative">
              {/* Avatar with Camera Icon Overlay - Only show camera for own profile */}
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative z-10">
                  {(displayUser?.profile as any)?.avatar_url ? (
                    (displayUser.profile as any).avatar_url.startsWith('data:') || (displayUser.profile as any).avatar_url.length > 2 ? (
                      <img 
                        src={(displayUser.profile as any).avatar_url} 
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl md:text-5xl">{(displayUser.profile as any).avatar_url}</span>
                    )
                  ) : (
                    <span className="text-3xl md:text-4xl font-bold text-gray-400">
                      {displayUser?.profile?.first_name?.charAt(0)}{displayUser?.profile?.last_name?.charAt(0)}
                    </span>
                  )}
                </div>
                {/* Camera Icon Overlay - Only for own profile */}
                {isOwnProfile && (
                  <label 
                    className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors shadow-lg z-20"
                    title={uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                  >
                    {uploadingAvatar ? (
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 mt-4 md:mt-16 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      {displayUser?.profile?.first_name} {displayUser?.profile?.last_name}
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 mt-1 truncate">{displayUser?.email || displayUser?.profile?.email}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 mt-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs md:text-sm font-medium capitalize">
                        {displayUser?.profile?.role}
                      </span>
                      {(displayUser?.profile as any)?.status && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs md:text-sm font-medium capitalize">
                          {(displayUser?.profile as any)?.status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center md:justify-end gap-2">
                    {!isOwnProfile && user?.id ? (
                      <>
                        {/* Dynamic Friend Button */}
                        {connectionStatus === 'none' && (
                          <button
                            onClick={() => sendFriendRequest(displayUserId!)}
                            disabled={actionLoading === displayUserId}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === displayUserId && <ButtonLoading />}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Add friend
                          </button>
                        )}
                        {connectionStatus === 'pending' && (
                          <button
                            onClick={() => removeFriend(displayUserId!, true)}
                            disabled={actionLoading === displayUserId}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === displayUserId && <ButtonLoading />}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel request
                          </button>
                        )}
                        {connectionStatus === 'accepted' && (
                          <button
                            onClick={() => removeFriend(displayUserId!, false)}
                            disabled={actionLoading === displayUserId}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {actionLoading === displayUserId && <ButtonLoading />}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Friends
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                  
                  {/* Home Button - Only show when viewing other profiles */}
                  {!isOwnProfile && onNavigateToProfile && (
                    <div className="flex justify-center md:justify-end">
                      <button
                        onClick={() => onNavigateToProfile(undefined)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Home
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Only show Newsfeed on own profile */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 md:space-x-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium border-b-2 transition-colors ${
                activeTab === 'home'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Home
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('newsfeed')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium border-b-2 transition-colors ${
                  activeTab === 'newsfeed'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Newsfeed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Social Feed Section */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Only show on Home tab */}
          {activeTab === 'home' && (
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
              {/* Personal Details Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Personal Details</h3>
                <div className="space-y-2.5 md:space-y-3">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-900 truncate">{displayUser?.email || displayUser?.profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="text-sm text-gray-900 capitalize">{displayUser?.profile?.role}</p>
                    </div>
                  </div>
                  {(displayUser?.profile as any)?.status && (
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-sm text-gray-900 capitalize">{(displayUser?.profile as any)?.status}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="text-sm text-gray-900">
                        {new Date(displayUser?.profile?.created_at || '').toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Friends Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Friends</h3>
                  <span className="text-xs md:text-sm text-gray-500">{friends.length}</span>
                </div>

                {/* Pending Requests (Own Profile Only) */}
                {isOwnProfile && pendingRequests.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {pendingRequests.length} Friend Request{pendingRequests.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                      {pendingRequests.slice(0, 2).map((request) => (
                        <div key={request.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {request.avatar_url ? (
                                request.avatar_url.startsWith('data:') ? (
                                  <img src={request.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : request.avatar_url.length <= 2 ? (
                                  <span className="text-sm">{request.avatar_url}</span>
                                ) : (
                                  <span className="text-sm">{getAvatarDisplay(request.avatar_url)}</span>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {request.first_name?.charAt(0)}{request.last_name?.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-gray-900 truncate">
                              {request.first_name} {request.last_name}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => acceptFriendRequest(request.id)}
                              disabled={actionLoading === request.id}
                              className="bg-primary-500 hover:bg-primary-600 text-white px-2 py-1 rounded text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(request.id)}
                              disabled={actionLoading === request.id}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends List */}
                {loadingFriends ? (
                  <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm text-gray-500">No friends yet</p>
                    <p className="text-xs text-gray-400 mt-1">Connect with others to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.slice(0, 6).map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => onNavigateToProfile?.(friend.id)}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {friend.avatar_url ? (
                            friend.avatar_url.startsWith('data:') ? (
                              <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : friend.avatar_url.length <= 2 ? (
                              <span className="text-lg">{friend.avatar_url}</span>
                            ) : (
                              <span className="text-lg">{getAvatarDisplay(friend.avatar_url)}</span>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">
                              {friend.first_name?.charAt(0)}{friend.last_name?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {friend.first_name} {friend.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{getRoleLabel(friend.role)}</p>
                        </div>
                      </div>
                    ))}
                    {friends.length > 6 && (
                      <p className="text-xs text-center text-gray-500 pt-2">
                        +{friends.length - 6} more
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Badges Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Badges</h3>
                  <span className="text-sm text-gray-500">0</span>
                </div>
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <p className="text-sm text-gray-500">No badges earned</p>
                  <p className="text-xs text-gray-400 mt-1">Complete achievements to earn badges</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
        {/* Create Post Card - Only show on Home tab and own profile */}
        {activeTab === 'home' && isOwnProfile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-start space-x-3 md:space-x-4">
            {/* User Avatar */}
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {(user?.profile as any)?.avatar_url ? (
                (user.profile as any).avatar_url.length <= 2 ? (
                  <span className="text-xl md:text-2xl">{(user.profile as any).avatar_url}</span>
                ) : (
                  <img src={(user.profile as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-base md:text-lg font-bold text-gray-400">
                  {user?.profile?.first_name?.charAt(0)}{user?.profile?.last_name?.charAt(0)}
                </span>
              )}
            </div>

            {/* Post Input */}
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`What's on your mind, ${displayUser?.profile?.first_name}?`}
                className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />

              {/* Selected Emotion */}
              {selectedEmotion && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Feeling:</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center space-x-1">
                    <span>{emotions.find(e => e.value === selectedEmotion)?.emoji}</span>
                    <span>{emotions.find(e => e.value === selectedEmotion)?.label}</span>
                    <button
                      onClick={() => setSelectedEmotion(null)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}

              {/* Image Preview */}
              {postImage && (
                <div className="mt-3 relative inline-block">
                  <img src={postImage} alt="Upload preview" className="max-h-48 rounded-lg" />
                  <button
                    onClick={() => setPostImage(null)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Post Actions */}
              <div className="mt-3 md:mt-4 flex flex-col md:flex-row items-stretch md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {/* Image Upload */}
                  <label className="px-3 md:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors flex items-center space-x-1 md:space-x-2 whitespace-nowrap">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs md:text-sm font-medium">Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Emotion Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEmotionPicker(!showEmotionPicker)}
                      className="px-3 md:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1 md:space-x-2 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs md:text-sm font-medium">Feeling</span>
                    </button>

                    {/* Emotion Dropdown */}
                    {showEmotionPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 w-48">
                        {emotions.map((emotion) => (
                          <button
                            key={emotion.value}
                            onClick={() => {
                              setSelectedEmotion(emotion.value)
                              setShowEmotionPicker(false)
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center space-x-2"
                          >
                            <span className="text-xl">{emotion.emoji}</span>
                            <span className="text-sm">{emotion.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Button */}
                <button
                  onClick={handleCreatePost}
                  disabled={submittingPost || (!newPostContent.trim() && !postImage)}
                  className="w-full md:w-auto px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm md:text-base min-h-[44px] md:min-h-0"
                >
                  {submittingPost ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Posts Feed */}
        {loadingPosts ? (
          <div className="flex justify-center py-8 md:py-12">
            <Loading size="md" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
            <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-gray-500 text-base md:text-lg">No posts yet</p>
            <p className="text-gray-400 text-xs md:text-sm mt-2">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Post Header */}
                <div className="p-4 md:p-6 pb-3 md:pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                      {/* User Avatar */}
                      <button
                        onClick={() => {
                          if (onNavigateToProfile) {
                            onNavigateToProfile(post.user_id === user?.id ? undefined : post.user_id)
                          }
                        }}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                      >
                        {post.user.avatar_url ? (
                          post.user.avatar_url.length <= 2 ? (
                            <span className="text-xl md:text-2xl">{post.user.avatar_url}</span>
                          ) : (
                            <img src={post.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <span className="text-base md:text-lg font-bold text-gray-400">
                            {post.user.first_name.charAt(0)}{post.user.last_name.charAt(0)}
                          </span>
                        )}
                      </button>

                      {/* User Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
                          <button
                            onClick={() => {
                              if (post.user_id !== user?.id && onNavigateToProfile) {
                                onNavigateToProfile(post.user_id)
                              } else if (post.user_id === user?.id && onNavigateToProfile) {
                                onNavigateToProfile(undefined) // Navigate to own profile
                              }
                            }}
                            className="font-semibold text-sm md:text-base text-gray-900 truncate hover:underline text-left"
                          >
                            {post.user.first_name} {post.user.last_name}
                          </button>
                          {post.emotion && (
                            <span className="text-gray-500 text-xs md:text-sm flex items-center space-x-1">
                              <span className="hidden md:inline">is feeling</span>
                              <span className="font-medium text-blue-600 flex items-center space-x-1">
                                <span>{emotions.find(e => e.value === post.emotion)?.emoji}</span>
                                <span>{emotions.find(e => e.value === post.emotion)?.label}</span>
                              </span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-gray-500">
                          {new Date(post.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Delete Button (only for post owner) */}
                    {post.user_id === user?.id && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-800 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="px-4 md:px-6 pb-3 md:pb-4">
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full rounded-lg max-h-64 md:max-h-96 object-cover"
                    />
                  </div>
                )}

                {/* Reactions Summary */}
                {Object.keys(post.reaction_counts).length > 0 && (
                  <div className="px-4 md:px-6 pb-2 flex items-center space-x-2 text-xs md:text-sm text-gray-600">
                    <div className="flex -space-x-1">
                      {Object.entries(post.reaction_counts).slice(0, 3).map(([type]) => (
                        <span key={type} className="text-base md:text-lg">
                          {reactions.find(r => r.type === type)?.emoji}
                        </span>
                      ))}
                    </div>
                    <span>
                      {Object.values(post.reaction_counts).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-gray-200 px-4 md:px-6 py-2 flex items-center justify-around gap-1">
                  {/* React Button */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowReactionPicker(showReactionPicker === post.id ? null : post.id)}
                      className={`w-full py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1 md:space-x-2 ${
                        post.user_reaction ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}
                    >
                      <span className="text-lg md:text-xl">
                        {post.user_reaction 
                          ? reactions.find(r => r.type === post.user_reaction)?.emoji 
                          : '👍'}
                      </span>
                      <span className="text-xs md:text-sm">
                        {post.user_reaction 
                          ? reactions.find(r => r.type === post.user_reaction)?.label 
                          : 'React'}
                      </span>
                    </button>

                    {/* Reaction Picker */}
                    {showReactionPicker === post.id && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 flex space-x-1 z-10">
                        {reactions.map((reaction) => (
                          <button
                            key={reaction.type}
                            onClick={() => handleReaction(post.id, reaction.type)}
                            className="hover:scale-125 transition-transform text-xl md:text-2xl p-1"
                            title={reaction.label}
                          >
                            {reaction.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comment Button */}
                  <button
                    onClick={() => setCommentingOnPost(commentingOnPost === post.id ? null : post.id)}
                    className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center space-x-1 md:space-x-2"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs md:text-sm">Comment</span>
                    {post.comments.length > 0 && (
                      <span className="text-xs md:text-sm">({post.comments.length})</span>
                    )}
                  </button>
                </div>

                {/* Comments Section */}
                {(post.comments.length > 0 || commentingOnPost === post.id) && (
                  <div className="border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-gray-50">
                    {/* Existing Comments */}
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-2 md:space-x-3 mb-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {comment.user.avatar_url ? (
                            comment.user.avatar_url.length <= 2 ? (
                              <span className="text-xs md:text-sm">{comment.user.avatar_url}</span>
                            ) : (
                              <img src={comment.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              {comment.user.first_name.charAt(0)}{comment.user.last_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-white rounded-lg px-3 md:px-4 py-2">
                            <p className="font-semibold text-xs md:text-sm text-gray-900">
                              {comment.user.first_name} {comment.user.last_name}
                            </p>
                            <p className="text-xs md:text-sm text-gray-800 mt-1 break-words">{comment.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-3 md:ml-4">
                            {new Date(comment.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Comment Input */}
                    {commentingOnPost === post.id && (
                      <div className="flex items-start space-x-2 md:space-x-3 mt-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {(user?.profile as any)?.avatar_url ? (
                            (user.profile as any).avatar_url.length <= 2 ? (
                              <span className="text-xs md:text-sm">{(user.profile as any).avatar_url}</span>
                            ) : (
                              <img src={(user.profile as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              {user?.profile?.first_name?.charAt(0)}{user?.profile?.last_name?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center space-x-2">
                          <input
                            type="text"
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleComment(post.id)
                              }
                            }}
                            placeholder="Write a comment..."
                            className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs md:text-sm"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentContent.trim()}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add Friends</h2>
                <button
                  onClick={() => setShowAddFriendModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {allUsers
                  .filter(u => 
                    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{getAvatarDisplay(u.avatar_url)}</div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{getRoleLabel(u.role)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendFriendRequest(u.id)}
                        disabled={actionLoading === u.id}
                        className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading === u.id && <ButtonLoading />}
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
