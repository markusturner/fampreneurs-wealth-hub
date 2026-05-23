import { Helmet } from 'react-helmet-async'
import { Users } from 'lucide-react'
import { FamilyLegacyMeetingUploads } from '@/components/trust/FamilyLegacyMeetingUploads'

export default function SuccessionPlanning() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Succession Planning | TruHeirs</title>
        <meta name="description" content="Plan your family's succession and document your first family legacy meeting." />
      </Helmet>

      <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(160 60% 35% / 0.15)' }}>
            <Users className="h-6 w-6" style={{ color: 'hsl(160 60% 35%)' }} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Succession Planning</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Document your first family legacy meeting and plan the next chapter.</p>
          </div>
        </div>

        <FamilyLegacyMeetingUploads onSubmitted={() => {}} />
      </div>
    </div>
  )
}
