import { NavHeader } from '@/components/dashboard/nav-header'
import { Scoreboard } from '@/components/dashboard/scoreboard'

export default function TeamMembers() {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Scoreboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Badge system tracking member progression in courses and coaching sessions
            </p>
          </div>
        </div>
        
        <Scoreboard />
      </div>
    </div>
  )
}