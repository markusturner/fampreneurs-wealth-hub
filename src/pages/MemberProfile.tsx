import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { EnhancedPostCard } from '@/components/community/enhanced-post-card'
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Settings,
  Camera,
  MessageCircle,
  MoreHorizontal,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  ArrowLeft
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  cover_photo_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  instagram_url: string | null
  youtube_url: string | null
  facebook_url: string | null
  linkedin_url: string | null
  program_name: string | null
  created_at: string
  is_admin: boolean
  is_accountability_partner: boolean
}

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  audio_url: string | null
  video_url: string | null
  created_at: string
  parent_id: string | null
  channel_id: string | null
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined' | 'blocked'
  created_at: string
}

export default function MemberProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = user?.id === userId

  useEffect(() => {
    if (userId) {
      fetchProfile()
      fetchPosts()
      fetchFriendship()
      fetchStats()
    }
  }, [userId, user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_id', userId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', post.user_id)
            .single()

          return { ...post, profiles: profile || null }
        })
      )

      setPosts(postsWithProfiles)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const fetchFriendship = async () => {
    if (!user?.id || isOwnProfile) return

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setFriendship(data as Friendship)
      }
    } catch (error) {
      console.error('Error fetching friendship:', error)
    }
  }

  const fetchStats = async () => {
    try {
      // Get friends count
      const { count: friendsCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted')

      // Get posts count
      const { count: postsCount } = await supabase
        .from('community_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      setFriendsCount(friendsCount || 0)
      setPostsCount(postsCount || 0)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const sendFriendRequest = async () => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: userId,
          status: 'pending'
        })

      if (error) throw error

      setFriendship({
        id: '',
        requester_id: user.id,
        addressee_id: userId!,
        status: 'pending',
        created_at: new Date().toISOString()
      })

      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully."
      })
    } catch (error) {
      console.error('Error sending friend request:', error)
      toast({
        title: "Error",
        description: "Failed to send friend request.",
        variant: "destructive"
      })
    }
  }

  const handleFriendshipAction = async (action: 'accept' | 'decline' | 'remove') => {
    if (!friendship) return

    try {
      if (action === 'remove') {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendship.id)

        if (error) throw error
        setFriendship(null)
      } else {
        const { error } = await supabase
          .from('friendships')
          .update({ status: action === 'accept' ? 'accepted' : 'declined' })
          .eq('id', friendship.id)

        if (error) throw error
        setFriendship({ ...friendship, status: action === 'accept' ? 'accepted' : 'declined' })
      }

      fetchStats()
      toast({
        title: action === 'accept' ? "Friend request accepted" : action === 'decline' ? "Friend request declined" : "Friend removed",
        description: `Successfully ${action}ed the friendship.`
      })
    } catch (error) {
      console.error('Error handling friendship:', error)
      toast({
        title: "Error",
        description: "Failed to update friendship status.",
        variant: "destructive"
      })
    }
  }

  const getDisplayName = (profile: Profile | null) => {
    if (!profile) return 'Anonymous'
    return profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous'
  }

  const getFriendshipButton = () => {
    if (isOwnProfile) return null

    if (!friendship) {
      return (
        <Button onClick={sendFriendRequest} className="bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      )
    }

    switch (friendship.status) {
      case 'pending':
        if (friendship.requester_id === user?.id) {
          return (
            <Button variant="outline" disabled>
              <UserCheck className="w-4 h-4 mr-2" />
              Request Sent
            </Button>
          )
        } else {
          return (
            <div className="flex gap-2">
              <Button onClick={() => handleFriendshipAction('accept')} size="sm">
                Accept
              </Button>
              <Button onClick={() => handleFriendshipAction('decline')} variant="outline" size="sm">
                Decline
              </Button>
            </div>
          )
        }
      case 'accepted':
        return (
          <Button onClick={() => handleFriendshipAction('remove')} variant="outline">
            <UserCheck className="w-4 h-4 mr-2" />
            Friends
          </Button>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Link to="/community">
            <Button>Back to Community</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/community')}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </Button>
      </div>
      
      {/* Cover Photo */}
      <div className="relative h-80 bg-gradient-to-br from-primary to-primary-variant overflow-hidden">
        {profile.cover_photo_url ? (
          <img 
            src={profile.cover_photo_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-600 to-blue-800" />
        )}
        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4"
          >
            <Camera className="w-4 h-4 mr-2" />
            Edit cover photo
          </Button>
        )}
      </div>

      {/* Profile Header */}
      <div className="relative -mt-20 pb-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-40 h-40 rounded-full border-4 border-background overflow-hidden bg-card">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={getDisplayName(profile)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-2xl font-bold text-primary">
                    {getDisplayName(profile)[0]}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Button
                  size="sm"
                  className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 lg:ml-6">
              <h1 className="text-3xl font-bold text-foreground">
                {getDisplayName(profile)}
              </h1>
              <p className="text-lg text-muted-foreground mb-2">
                {friendsCount} friends • {postsCount} posts
              </p>
              {profile.program_name && (
                <Badge variant="secondary" className="mb-3">
                  {profile.program_name}
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {getFriendshipButton()}
              {!isOwnProfile && (
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              )}
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              {/* Left Sidebar - About */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Intro</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.bio && (
                      <p className="text-sm text-muted-foreground">{profile.bio}</p>
                    )}
                    
                    {profile.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>Lives in {profile.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Joined {formatDistanceToNow(new Date(profile.created_at))} ago</span>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-2">
                      {profile.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" />
                          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {profile.website}
                          </a>
                        </div>
                      )}
                      
                      {profile.instagram_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Instagram className="w-4 h-4 text-muted-foreground" />
                          <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Instagram
                          </a>
                        </div>
                      )}

                      {profile.youtube_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Youtube className="w-4 h-4 text-muted-foreground" />
                          <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            YouTube
                          </a>
                        </div>
                      )}

                      {profile.facebook_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Facebook className="w-4 h-4 text-muted-foreground" />
                          <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Facebook
                          </a>
                        </div>
                      )}

                      {profile.linkedin_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <Linkedin className="w-4 h-4 text-muted-foreground" />
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>

                    {isOwnProfile && (
                      <Button variant="outline" className="w-full">
                        Edit details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                <TabsContent value="posts" className="space-y-4">
                  {posts.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No posts yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    posts.map((post) => (
                      <EnhancedPostCard key={post.id} post={post} onUpdate={fetchPosts} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="about">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">About {getDisplayName(profile)}</h3>
                      <div className="space-y-4">
                        {profile.bio ? (
                          <p>{profile.bio}</p>
                        ) : (
                          <p className="text-muted-foreground">No bio added yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="friends">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Friends</h3>
                      <p className="text-muted-foreground">Friends list coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="photos">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Photos</h3>
                      <p className="text-muted-foreground">Photos coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="videos">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Videos</h3>
                      <p className="text-muted-foreground">Videos coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}