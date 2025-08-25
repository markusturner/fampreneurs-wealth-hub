import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit, Trash2, Shield, Eye, AlertTriangle } from 'lucide-react'
import { DataMaskingDisplay } from './data-masking-display'
import { useFamilyOfficeSecurity } from '@/hooks/useFamilyOfficeSecurity'

interface FamilyMember {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  family_position: string
  relationship_to_family: string | null
  trust_positions: string[] | null
  governance_branch?: string | null
  status: string | null
  notes: string | null
  data_classification?: string
  requires_approval?: boolean
  approved_by?: string | null
  approved_at?: string | null
  last_accessed?: string | null
  access_count?: number
  added_by: string
  is_invited?: boolean | null
  created_at: string
  updated_at?: string | null
}

interface SecureFamilyMemberCardProps {
  member: FamilyMember
  currentUserId: string
  isAdmin: boolean
  onEdit: (member: FamilyMember) => void
  onDelete: (member: FamilyMember) => void
  onApprove?: (member: FamilyMember) => void
}

export function SecureFamilyMemberCard({
  member,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onApprove
}: SecureFamilyMemberCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { logSecurityAction } = useFamilyOfficeSecurity()

  const canEditMember = member.added_by === currentUserId || isAdmin
  const requiresApproval = member.requires_approval && !member.approved_by
  const isHighRisk = (member.data_classification || 'confidential') === 'restricted'

  const handleViewDetails = async () => {
    if (!showDetails) {
      // Log when member details are viewed
      await logSecurityAction(
        'family_member_viewed',
        'family_members',
        member.id,
        { member_name: member.full_name },
        isHighRisk ? 'high' : 'medium'
      )
    }
    setShowDetails(!showDetails)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getClassificationIcon = (classification: string | undefined) => {
    switch (classification || 'confidential') {
      case 'restricted': return <Shield className="h-4 w-4 text-red-600" />
      case 'confidential': return <Shield className="h-4 w-4 text-yellow-600" />
      case 'internal': return <Shield className="h-4 w-4 text-blue-600" />
      default: return <Shield className="h-4 w-4 text-green-600" />
    }
  }

  return (
    <Card className={`transition-all duration-200 ${requiresApproval ? 'border-yellow-200 bg-yellow-50' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" />
                <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                {getClassificationIcon(member.data_classification)}
              </div>
            </div>
            
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{member.full_name}</h3>
                <Badge className={getStatusColor(member.status)}>
                  {member.status}
                </Badge>
                {requiresApproval && (
                  <Badge variant="outline" className="text-yellow-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Approval Required
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {member.family_position}
                  {member.relationship_to_family && ` • ${member.relationship_to_family}`}
                </p>
                
                {showDetails && (
                  <div className="space-y-2 mt-3">
                    {member.email && (
                      <div>
                        <span className="text-xs text-muted-foreground">Email: </span>
                        <DataMaskingDisplay
                          data={member.email}
                          dataType="email"
                          classification={(member.data_classification || 'confidential') as any}
                          label="family_member_email"
                        />
                      </div>
                    )}
                    
                    {member.phone && (
                      <div>
                        <span className="text-xs text-muted-foreground">Phone: </span>
                        <DataMaskingDisplay
                          data={member.phone}
                          dataType="phone"
                          classification={(member.data_classification || 'confidential') as any}
                          label="family_member_phone"
                        />
                      </div>
                    )}
                    
                    {member.trust_positions && member.trust_positions.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Trust Positions: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.trust_positions.map((position) => (
                            <Badge key={position} variant="outline" className="text-xs">
                              {position}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {member.governance_branch && (
                      <div>
                        <span className="text-xs text-muted-foreground">Governance Branch: </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            member.governance_branch === 'family_council' ? 'border-blue-500 text-blue-700' :
                            member.governance_branch === 'council_elders' ? 'border-purple-500 text-purple-700' :
                            member.governance_branch === 'family_assembly' ? 'border-green-500 text-green-700' :
                            'border-gray-500 text-gray-700'
                          }`}
                        >
                          {member.governance_branch === 'family_council' ? 'Family Council (Executive)' :
                           member.governance_branch === 'council_elders' ? 'Council of Elders (Judicial)' :
                           member.governance_branch === 'family_assembly' ? 'Family Assembly (Legislative)' :
                           member.governance_branch}
                        </Badge>
                      </div>
                    )}
                    
                    {member.notes && (
                      <div>
                        <span className="text-xs text-muted-foreground">Notes: </span>
                        <DataMaskingDisplay
                          data={member.notes}
                          dataType="partial"
                          classification={(member.data_classification || 'confidential') as any}
                          label="family_member_notes"
                        />
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Access Count: {member.access_count || 0}</p>
                      {member.last_accessed && (
                        <p>Last Accessed: {new Date(member.last_accessed).toLocaleString()}</p>
                      )}
                      <p>Added: {new Date(member.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewDetails}
              className="text-muted-foreground"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {requiresApproval && isAdmin && onApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onApprove(member)}
                className="text-green-600 hover:text-green-700"
              >
                Approve
              </Button>
            )}
            
            {canEditMember && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(member)}
                  className="text-muted-foreground"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(member)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}