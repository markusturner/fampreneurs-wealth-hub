import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { PostCard } from './post-card'
import { Loader2 } from 'lucide-react'

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

export const CommunityFeed = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    try {
      // First fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (postsError) {
        throw postsError
      }

      // Then fetch profiles for each post
      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', post.user_id)
            .single()

          return {
            ...post,
            profiles: profile
          }
        })
      )

      setPosts(postsWithProfiles)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()

    // Set up real-time subscription for new posts
    const channel = supabase
      .channel('community_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          fetchPosts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No posts yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Be the first to share something with your family!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onUpdate={fetchPosts}
        />
      ))}
    </div>
  )
}