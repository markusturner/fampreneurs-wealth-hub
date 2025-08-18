import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface FamilyMember {
  id: string
  name: string
  generation: number
  parents?: string[]
  children?: string[]
}

interface DatabaseFamilyMember {
  id: string
  full_name: string
  family_position: string
  relationship_to_family: string | null
  added_by: string
}

export function useFamilyTree() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const generateFamilyTree = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Fetch family members from database
      const { data: dbMembers, error } = await supabase
        .from('family_members')
        .select('id, full_name, family_position, relationship_to_family, added_by')
        .eq('added_by', user.id)
        .eq('status', 'active')

      if (error) throw error

      // Transform database members to family tree format
      const transformedMembers = transformToFamilyTree(dbMembers || [])
      setFamilyMembers(transformedMembers)
    } catch (error) {
      console.error('Error generating family tree:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const transformToFamilyTree = (dbMembers: DatabaseFamilyMember[]): FamilyMember[] => {
    const members: FamilyMember[] = []
    
    // Create a map to track family relationships
    const memberMap = new Map<string, { member: DatabaseFamilyMember; generation: number }>()
    
    // Sort members by family position to determine hierarchy
    const sortedMembers = dbMembers.sort((a, b) => {
      const positionOrder = {
        'Grandparent': 0,
        'Patriarch/Matriarch': 1,
        'Head of Family': 1,
        'Parent': 2,
        'Spouse': 2,
        'Uncle/Aunt': 2,
        'Adult Child': 3,
        'Child': 3,
        'Minor Child': 3,
        'Sibling': 3,
        'Grandchild': 4,
        'Cousin': 4,
        'In-Law': 2,
        'Other': 5
      }
      
      const aOrder = positionOrder[a.family_position as keyof typeof positionOrder] ?? 5
      const bOrder = positionOrder[b.family_position as keyof typeof positionOrder] ?? 5
      
      return aOrder - bOrder
    })

    // Assign generations based on family positions
    sortedMembers.forEach((member, index) => {
      let generation = 2 // default generation
      
      switch (member.family_position) {
        case 'Grandparent':
          generation = 0
          break
        case 'Patriarch/Matriarch':
        case 'Head of Family':
        case 'Parent':
          generation = 1
          break
        case 'Spouse':
        case 'Uncle/Aunt':
        case 'In-Law':
          generation = 1
          break
        case 'Adult Child':
        case 'Child':
        case 'Minor Child':
        case 'Sibling':
          generation = 2
          break
        case 'Grandchild':
        case 'Cousin':
          generation = 3
          break
        default:
          generation = 2
      }
      
      memberMap.set(member.id, { member, generation })
    })

    // Convert to family tree format
    memberMap.forEach(({ member, generation }) => {
      const familyMember: FamilyMember = {
        id: member.id,
        name: member.full_name,
        generation: generation,
        parents: [],
        children: []
      }

      // Basic relationship inference based on positions and relationships
      if (member.relationship_to_family) {
        const relationship = member.relationship_to_family.toLowerCase()
        
        // Find potential parents based on generation and relationship descriptions
        if (relationship.includes('son of') || relationship.includes('daughter of') || 
            relationship.includes('child of') || member.family_position.includes('Child')) {
          
          // Look for parents in previous generation
          memberMap.forEach(({ member: potentialParent, generation: parentGen }) => {
            if (parentGen === generation - 1 && 
                (potentialParent.family_position.includes('Parent') || 
                 potentialParent.family_position === 'Head of Family' ||
                 potentialParent.family_position === 'Patriarch/Matriarch')) {
              familyMember.parents?.push(potentialParent.full_name)
            }
          })
        }
      }

      members.push(familyMember)
    })

    // Set up parent-child relationships
    members.forEach(member => {
      if (member.parents) {
        member.parents.forEach(parentName => {
          const parent = members.find(m => m.name === parentName)
          if (parent && !parent.children?.includes(member.name)) {
            parent.children = parent.children || []
            parent.children.push(member.name)
          }
        })
      }
    })

    return members
  }

  // Set up real-time subscription to family_members table
  useEffect(() => {
    generateFamilyTree()

    const channel = supabase
      .channel('family-tree-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `added_by=eq.${user?.id}`
        },
        () => {
          // Regenerate family tree when data changes
          generateFamilyTree()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [generateFamilyTree, user?.id])

  return {
    familyMembers,
    loading,
    regenerateTree: generateFamilyTree
  }
}