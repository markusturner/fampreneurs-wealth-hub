import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { GroupSidebar } from '@/components/community/group-sidebar'
import { GroupChat } from '@/components/community/group-chat'
import { Loader2 } from 'lucide-react'

const Community = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <GroupSidebar 
          selectedGroupId={selectedGroupId}
          onGroupSelect={setSelectedGroupId}
        />
        
        {/* Main Chat Area */}
        <GroupChat groupId={selectedGroupId} />
      </div>
    </div>
  )
}

export default Community