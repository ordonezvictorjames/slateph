'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Loading } from '@/components/ui/loading'

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

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [uploadingBanner, setUploadingBanner] = useState(false)
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
  const supabase = createClient()

  // Fetch posts
  useEffect(() => {
    if (user?.id) {
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
  }, [user?.id, activeTab])

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
        query = query.eq('user_id', user?.id)
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  const bannerUrl = user?.profile?.banner_url

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header with Banner */}
      <div className="bg-white border-b">
        {/* Banner Section */}
        <div className="relative w-full h-48 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
          {bannerUrl ? (
            <img 
              src={bannerUrl} 
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          )}
          
          {/* Banner Upload Controls */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <label className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-100 cursor-pointer transition-colors text-sm font-medium">
              {uploadingBanner ? 'Uploading...' : bannerUrl ? 'Change Banner' : 'Upload Banner'}
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
                className="hidden"
              />
            </label>
            {bannerUrl && (
              <button
                onClick={handleRemoveBanner}
                className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-6 -mt-20 relative">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative z-10">
              {(user?.profile as any)?.avatar_url ? (
                (user.profile as any).avatar_url.startsWith('data:') || (user.profile as any).avatar_url.length > 2 ? (
                  <img 
                    src={(user.profile as any).avatar_url} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">{(user.profile as any).avatar_url}</span>
                )
              ) : (
                <span className="text-4xl font-bold text-gray-400">
                  {user?.profile?.first_name?.charAt(0)}{user?.profile?.last_name?.charAt(0)}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 mt-16">
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.profile?.first_name} {user?.profile?.last_name}
              </h1>
              <p className="text-gray-600 mt-1">{user?.email}</p>
              <div className="flex items-center space-x-4 mt-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                  {user?.profile?.role}
                </span>
                {(user?.profile as any)?.status && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize">
                    {(user?.profile as any)?.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'home'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('newsfeed')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'newsfeed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Newsfeed
            </button>
          </div>
        </div>
      </div>

      {/* Social Feed Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Create Post Card - Only show on Home tab */}
        {activeTab === 'home' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start space-x-4">
            {/* User Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {(user?.profile as any)?.avatar_url ? (
                (user.profile as any).avatar_url.length <= 2 ? (
                  <span className="text-2xl">{(user.profile as any).avatar_url}</span>
                ) : (
                  <img src={(user.profile as any).avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-lg font-bold text-gray-400">
                  {user?.profile?.first_name?.charAt(0)}{user?.profile?.last_name?.charAt(0)}
                </span>
              )}
            </div>

            {/* Post Input */}
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.profile?.first_name}?`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {/* Image Upload */}
                  <label className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Photo</span>
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
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">Feeling</span>
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
          <div className="flex justify-center py-12">
            <Loading size="md" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-gray-500 text-lg">No posts yet</p>
            <p className="text-gray-400 text-sm mt-2">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Post Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {/* User Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {post.user.avatar_url ? (
                          post.user.avatar_url.length <= 2 ? (
                            <span className="text-2xl">{post.user.avatar_url}</span>
                          ) : (
                            <img src={post.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <span className="text-lg font-bold text-gray-400">
                            {post.user.first_name.charAt(0)}{post.user.last_name.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {post.user.first_name} {post.user.last_name}
                          </h3>
                          {post.emotion && (
                            <span className="text-gray-500 text-sm flex items-center space-x-1">
                              <span>is feeling</span>
                              <span className="font-medium text-blue-600 flex items-center space-x-1">
                                <span>{emotions.find(e => e.value === post.emotion)?.emoji}</span>
                                <span>{emotions.find(e => e.value === post.emotion)?.label}</span>
                              </span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
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
                  <p className="mt-4 text-gray-800 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="px-6 pb-4">
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full rounded-lg max-h-96 object-cover"
                    />
                  </div>
                )}

                {/* Reactions Summary */}
                {Object.keys(post.reaction_counts).length > 0 && (
                  <div className="px-6 pb-2 flex items-center space-x-2 text-sm text-gray-600">
                    <div className="flex -space-x-1">
                      {Object.entries(post.reaction_counts).slice(0, 3).map(([type]) => (
                        <span key={type} className="text-lg">
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
                <div className="border-t border-gray-200 px-6 py-2 flex items-center justify-around">
                  {/* React Button */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowReactionPicker(showReactionPicker === post.id ? null : post.id)}
                      className={`w-full py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2 ${
                        post.user_reaction ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}
                    >
                      <span className="text-xl">
                        {post.user_reaction 
                          ? reactions.find(r => r.type === post.user_reaction)?.emoji 
                          : '👍'}
                      </span>
                      <span className="text-sm">
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
                            className="hover:scale-125 transition-transform text-2xl p-1"
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
                    className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm">Comment</span>
                    {post.comments.length > 0 && (
                      <span className="text-sm">({post.comments.length})</span>
                    )}
                  </button>
                </div>

                {/* Comments Section */}
                {(post.comments.length > 0 || commentingOnPost === post.id) && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    {/* Existing Comments */}
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {comment.user.avatar_url ? (
                            comment.user.avatar_url.length <= 2 ? (
                              <span className="text-sm">{comment.user.avatar_url}</span>
                            ) : (
                              <img src={comment.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              {comment.user.first_name.charAt(0)}{comment.user.last_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-white rounded-lg px-4 py-2">
                            <p className="font-semibold text-sm text-gray-900">
                              {comment.user.first_name} {comment.user.last_name}
                            </p>
                            <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-4">
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
                      <div className="flex items-start space-x-3 mt-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {(user?.profile as any)?.avatar_url ? (
                            (user.profile as any).avatar_url.length <= 2 ? (
                              <span className="text-sm">{(user.profile as any).avatar_url}</span>
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
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentContent.trim()}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
  )
}
