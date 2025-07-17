import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Heart, MessageCircle, Phone, Mail } from 'lucide-react'

interface AccountabilityPartner {
  id: string
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  accountability_specialties: string[] | null
  bio: string | null
}

export function AccountabilityDirectory() {
  const { user } = useAuth()
  const [partners, setPartners] = useState<AccountabilityPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccountabilityPartners()
  }, [])

  const fetchAccountabilityPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url, accountability_specialties, bio')
        .eq('is_accountability_partner', true)
        .order('display_name')

      if (error) throw error
      setPartners(data || [])
    } catch (error) {
      console.error('Error fetching accountability partners:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (partner: AccountabilityPartner) => {
    return partner.display_name || `${partner.first_name} ${partner.last_name}`.trim() || 'Accountability Partner'
  }

  const getInitials = (partner: AccountabilityPartner) => {
    const name = getDisplayName(partner)
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Accountability Partners
        </CardTitle>
        <CardDescription>
          Connect with family members who can help you stay on track with your goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {partners.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No accountability partners available yet.</p>
            <p className="text-sm">Check back later or ask an admin to assign accountability partners.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <div key={partner.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={partner.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(partner)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{getDisplayName(partner)}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Heart className="h-3 w-3 mr-1" />
                        Accountability Partner
                      </Badge>
                    </div>
                    
                    {partner.bio && (
                      <p className="text-sm text-muted-foreground mb-2">{partner.bio}</p>
                    )}
                    
                    {partner.accountability_specialties && partner.accountability_specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {partner.accountability_specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}