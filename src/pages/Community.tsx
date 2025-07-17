import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { CommunityFeed } from '@/components/community/community-feed'
import { CreatePost } from '@/components/community/create-post'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'

const Community = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading community...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.display_name || profile?.first_name || 'Member'

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Family Community
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Connect and share with your family members
            </p>
          </div>
        </div>

        {/* Create Post Section */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Share with your family</CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePost />
          </CardContent>
        </Card>

        {/* Community Feed */}
        <CommunityFeed />
      </main>
    </div>
  )
}

export default Community