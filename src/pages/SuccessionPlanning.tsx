import { useEffect, useState } from "react"
import { Helmet } from "react-helmet-async"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Users, Video, BookOpen, Heart, FileText, Shield, Award,
  Calendar, ClipboardCheck, Receipt, Calculator, Stamp, Loader2
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { SuccessionItemCard, type ProgressStatus } from "@/components/succession/SuccessionItemCard"
import { SuccessionItemDetail } from "@/components/succession/SuccessionItemDetail"
import { FamilyLegacyMeetingUploads } from "@/components/trust/FamilyLegacyMeetingUploads"

type ItemKey =
  | 'constellation_session' | 'legacy_videos' | 'course_creation'
  | 'legacy_meeting' | 'identity_manual' | 'family_crest' | 'family_bible'
  | 'annual_retreat' | 'trust_stewardship' | 'annual_trust_meeting'
  | 'file_trust_taxes' | 'tax_strategy' | 'trademark_ip'

interface ItemDef {
  key: ItemKey
  label: string
  description: string
  icon: any
  doneForYou?: boolean
  bookingUrl?: string
  bookingComingSoon?: boolean
  badge?: string
  upsell?: { label: string; detail: string }
}

const STEP_1: ItemDef[] = [
  { key: 'constellation_session', label: 'Family Constellation Session', description: 'Complimentary session with Ginger Gentile to ground your family vision.', icon: Users, bookingComingSoon: true, badge: 'Complimentary' },
  { key: 'legacy_videos', label: 'Legacy Videos', description: 'Capture your family stories on video. Our team produces and edits for you.', icon: Video, doneForYou: true },
  { key: 'course_creation', label: 'Course Creation', description: 'Turn your wisdom into a signature course. Fully done-for-you.', icon: BookOpen, doneForYou: true },
]

const STEP_2: ItemDef[] = [
  { key: 'legacy_meeting', label: 'First Family Legacy Meeting', description: 'Schedule and document your first family legacy meeting.', icon: Heart },
  { key: 'identity_manual', label: 'Family Identity Manual', description: 'Your written family identity, values, and mission. Done-for-you.', icon: FileText, doneForYou: true },
  { key: 'family_crest', label: 'Family Crest', description: 'A custom crest designed for your family heritage. Done-for-you.', icon: Shield, doneForYou: true },
  { key: 'family_bible', label: 'Family Bible', description: 'Your living family bible documenting lineage and legacy. Done-for-you.', icon: BookOpen, doneForYou: true },
]

const STEP_3: ItemDef[] = [
  { key: 'annual_retreat', label: 'Annual Family Retreat', description: 'Schedule your first annual family retreat to align and celebrate.', icon: Calendar },
  { key: 'trust_stewardship', label: 'Trust Stewardship', description: 'Record keeping, holding trust meetings, and ongoing stewardship.', icon: ClipboardCheck },
  { key: 'annual_trust_meeting', label: 'Annual Trust Meeting', description: 'Review your trust each year to keep it current and effective.', icon: Users },
  { key: 'file_trust_taxes', label: 'File Trust Taxes', description: 'Annual trust tax filing handled by our partners.', icon: Receipt, upsell: { label: 'Trust Tax Filing', detail: 'Have our tax team file your trust returns. Request pricing details.' } },
  { key: 'tax_strategy', label: 'Tax Strategy with Toni Simons', description: 'Schedule a tax strategy call with our tax professional Toni Simons.', icon: Calculator, bookingComingSoon: true },
  { key: 'trademark_ip', label: 'Intellectual Property (Trademark)', description: 'Protect your family brand with trademarking and copyrighting.', icon: Stamp, badge: '1 Free Included', upsell: { label: 'Additional Trademark Classes', detail: 'Your first trademark is complimentary. Each additional class is $1,297.' } },
]

const ALL_ITEMS = [...STEP_1, ...STEP_2, ...STEP_3]

export default function SuccessionPlanning() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<Record<string, { status: ProgressStatus; notes: string | null }>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ItemKey | null>(null)

  const fetchProgress = async () => {
    if (!user?.id) return
    const { data } = await (supabase as any)
      .from('succession_progress')
      .select('item_key, status, notes')
      .eq('user_id', user.id)
    if (data) {
      const map: Record<string, { status: ProgressStatus; notes: string | null }> = {}
      data.forEach((r: any) => { map[r.item_key] = { status: r.status, notes: r.notes } })
      setProgress(map)
    }
    setLoading(false)
  }

  useEffect(() => { fetchProgress() }, [user?.id])

  const getStatus = (key: string): ProgressStatus => progress[key]?.status ?? 'not_started'
  const getNotes = (key: string) => progress[key]?.notes ?? null

  const renderStep = (title: string, step: number, items: ItemDef[], cols: string) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-accent text-accent-foreground">Step {step}</Badge>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className={`grid gap-4 ${cols}`}>
        {items.map(item => (
          <SuccessionItemCard
            key={item.key}
            label={item.label}
            description={item.description}
            icon={item.icon}
            status={getStatus(item.key)}
            badge={item.badge}
            doneForYou={item.doneForYou}
            onClick={() => setSelected(item.key)}
          />
        ))}
      </div>
    </div>
  )

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  }

  if (selected) {
    const item = ALL_ITEMS.find(i => i.key === selected)!
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto">
        <Helmet><title>{item.label} | Succession Planning</title></Helmet>
        <Button variant="ghost" onClick={() => setSelected(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Succession Planning
        </Button>
        <SuccessionItemDetail
          itemKey={item.key}
          label={item.label}
          description={item.description}
          icon={item.icon}
          status={getStatus(item.key)}
          notes={getNotes(item.key)}
          bookingUrl={item.bookingUrl}
          bookingComingSoon={item.bookingComingSoon}
          upsell={item.upsell}
          doneForYou={item.doneForYou}
          onChanged={fetchProgress}
        >
          {item.key === 'legacy_meeting' && <FamilyLegacyMeetingUploads onSubmitted={() => {}} />}
        </SuccessionItemDetail>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <Helmet>
        <title>Succession Planning | TruHeirs</title>
        <meta name="description" content="Plan your family's succession with a step-by-step done-for-you process." />
      </Helmet>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <Award className="h-7 w-7 text-accent" />
          Succession Planning
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Your step-by-step roadmap to a lasting family legacy.
        </p>
      </div>

      {renderStep('Family Constellation & Legacy Foundation', 1, STEP_1, 'sm:grid-cols-3')}
      {renderStep('First Family Legacy Meeting & Identity', 2, STEP_2, 'sm:grid-cols-2 lg:grid-cols-4')}
      {renderStep('Annual Retreat & Stewardship', 3, STEP_3, 'sm:grid-cols-2 lg:grid-cols-3')}
    </div>
  )
}
