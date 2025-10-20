import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Sparkles, Wand2, Lightbulb } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface FamilyMember {
  id: string
  name: string
  generation: number
  parents?: string[]
  children?: string[]
}

interface FamilyTreeTextInputProps {
  onGenerate: (members: FamilyMember[]) => void
}

export function FamilyTreeTextInput({ onGenerate }: FamilyTreeTextInputProps) {
  const { user } = useAuth();
  const [textInput, setTextInput] = useState('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auto-load family members from database on mount and when members change
  useEffect(() => {
    if (!user?.id) return;

    const loadFamilyMembers = async () => {
      try {
        const { data: members, error } = await supabase
          .from('family_members')
          .select('full_name, family_position, relationship_to_family')
          .eq('added_by', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (members && members.length > 0) {
          // Convert database members to cleaner natural language format
          const familyText = members
            .map(member => {
              // If there's a relationship description, format it naturally
              if (member.relationship_to_family && member.relationship_to_family.trim()) {
                return `${member.full_name} - ${member.relationship_to_family}`;
              }
              // Otherwise just show the name
              return member.full_name;
            })
            .join('\n');

          setTextInput(familyText);
        } else {
          // Clear textarea if no members
          setTextInput('');
        }
      } catch (error) {
        console.error('Error loading family members:', error);
        setTextInput('');
      }
    };

    loadFamilyMembers();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('family-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `added_by=eq.${user.id}`
        },
        () => {
          loadFamilyMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const parseFamilyText = (text: string): FamilyMember[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const sanitizeName = (name: string) =>
      name
        .replace(/\(.*?\)/g, '') // remove role notes in parentheses
        .replace(/[^A-Za-z' -]/g, '') // strip non-name chars
        .replace(/\s+/g, ' ') // collapse spaces
        .trim()
    let members: FamilyMember[] = []

    // Check if text contains ASCII tree structure characters
    const hasTreeStructure = text.includes('├') || text.includes('└') || text.includes('│')
    
    // Priority 1: Enhanced ASCII tree parser for structured hierarchical data
    if (hasTreeStructure) {
      const seen = new Map<string, number>()
      const parentStack: Array<{ name: string, depth: number }> = []

      const getOrCreateMember = (name: string, depth: number) => {
        if (seen.has(name)) return seen.get(name) as number
        const idx = members.length
        members.push({
          id: `person-${idx}`,
          name,
          generation: depth, // Use actual depth for proper generation
          parents: [],
          children: [],
        })
        seen.set(name, idx)
        return idx
      }

      for (const rawLine of lines) {
        const prefixMatch = rawLine.match(/^[\s│├└─]*/)
        const prefix = prefixMatch ? prefixMatch[0] : ''
        const depth = (prefix.match(/[│├└]/g) || []).length
        const line = rawLine.replace(/[├─└│]/g, '').trim()
        
        // Skip empty lines but process all lines that contain names
        if (!line) continue

        // Extract all potential names from the line, including from relationship descriptions
        let nameMatches = line.match(/([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)/g)
        
        // Special handling for relationship lines
        if (/married to/i.test(line)) {
          const marriageMatch = line.match(/married to\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)/i)
          if (marriageMatch) {
            nameMatches = [marriageMatch[1]] as RegExpMatchArray
          }
        } else if (/children:/i.test(line)) {
          const childrenMatch = line.match(/children:\s*(.+)$/i)
          if (childrenMatch) {
            const childNames = childrenMatch[1].split(/,\s*/).map(n => n.trim()).filter(n => /^[A-Z]/.test(n))
            nameMatches = childNames.length > 0 ? childNames as RegExpMatchArray : null
          }
        } else if (/parents:/i.test(line)) {
          const parentsMatch = line.match(/parents:\s*(.+)$/i)
          if (parentsMatch) {
            const parentNames = parentsMatch[1].split(/,\s*/).map(n => n.trim()).filter(n => /^[A-Z]/.test(n))
            nameMatches = parentNames.length > 0 ? parentNames as RegExpMatchArray : null
          }
        }
        
        if (!nameMatches) continue

        // Process each name found in the line
        nameMatches.forEach(rawName => {
          const name = sanitizeName(rawName)
          if (!name || name.length < 2) return

          const childIdx = getOrCreateMember(name, depth)

          // Handle special relationship connections
          if (/married to/i.test(line) && parentStack.length > 0) {
            // Connect spouse to last person in stack (same generation)
            const spouse = parentStack[parentStack.length - 1]
            const spouseIdx = seen.get(spouse.name)!
            // Spouses are same generation, don't create parent-child relationship
            return
          }

          // Maintain parent stack for current depth
          while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= depth) {
            parentStack.pop()
          }

          // Connect to parent if exists and not a spouse line
          if (parentStack.length > 0 && !/married to/i.test(line)) {
            const parent = parentStack[parentStack.length - 1]
            const parentIdx = seen.get(parent.name)!
            
            const child = members[childIdx]
            const parentMember = members[parentIdx]

            if (!child.parents!.includes(parent.name)) {
              child.parents!.push(parent.name)
            }
            if (!parentMember.children!.includes(name)) {
              parentMember.children!.push(name)
            }
          }

          // Add to parent stack for next iteration (except spouses)
          if (!/married to/i.test(line)) {
            parentStack.push({ name, depth })
          }
        })
      }

      // Clean up empty arrays
      for (let i = 0; i < members.length; i++) {
        if (!members[i].parents || members[i].parents!.length === 0) {
          delete (members[i] as any).parents
        }
        if (!members[i].children || members[i].children!.length === 0) {
          delete (members[i] as any).children
        }
      }
      
      return members
    }

    // Priority 2: Enhanced natural language parsing
    const relationships: { [key: string]: { parents: string[], children: string[], depth?: number } } = {}

    // First pass: Extract all names and basic relationships
    lines.forEach((line, lineIndex) => {
      const cleanLine = line.replace(/[├─└│]/g, '').trim()
      
      // Extract all names from the line
      const allNames = Array.from(cleanLine.matchAll(/[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*/g))
        .map(match => sanitizeName(match[0]))
        .filter(name => name && name.length > 1)

      // Initialize relationships for all names
      allNames.forEach(name => {
        if (!relationships[name]) {
          relationships[name] = { parents: [], children: [], depth: lineIndex }
        }
      })
      
      // Handle marriage relationships
      if (cleanLine.includes('married to') || cleanLine.includes('married')) {
        const marriageMatch = cleanLine.match(/(.+?)\s+(?:married to|married)\s+(.+?)(?:\.|$|,)/i)
        if (marriageMatch) {
          const [, person1, person2] = marriageMatch
          const p1 = sanitizeName(person1.trim().replace(/^(my |the |his |her )/i, ''))
          const p2 = sanitizeName(person2.trim().replace(/^(my |the |his |her )/i, ''))
          if (p1 && p2) {
            if (!relationships[p1]) relationships[p1] = { parents: [], children: [], depth: lineIndex }
            if (!relationships[p2]) relationships[p2] = { parents: [], children: [], depth: lineIndex }
          }
        }
      }
      
      // Handle children relationships
      const childrenPatterns = [
        /(.+?)\s+(?:had|have|has)\s+(?:\d+\s+)?(?:children|kids|child):\s*(.+?)(?:\.|$)/i,
        /(?:children|kids|child)(?:\s+of\s+(.+?))?\s*:\s*(.+?)(?:\.|$)/i
      ]
      
      childrenPatterns.forEach(pattern => {
        const match = cleanLine.match(pattern)
        if (match) {
          const parentName = match[1] ? sanitizeName(match[1].replace(/^(my |the |his |her )/i, '')) : null
          const childrenStr = match[2] || match[1]
          
          const children = childrenStr
            .split(/,|\sand\s|;|•|\n/)
            .map(c => sanitizeName(c.replace(/^(my |the |his |her )/i, '')))
            .filter(c => c && c.length > 1)
          
          if (parentName && children.length > 0) {
            if (!relationships[parentName]) relationships[parentName] = { parents: [], children: [], depth: lineIndex }
            relationships[parentName].children = [...new Set([...relationships[parentName].children, ...children])]
            
            children.forEach(child => {
              if (!relationships[child]) relationships[child] = { parents: [], children: [], depth: lineIndex + 1 }
              if (!relationships[child].parents.includes(parentName)) {
                relationships[child].parents.push(parentName)
              }
            })
          }
        }
      })
      
      // Handle parent relationships
      const parentPatterns = [
        /(.+?)\s+(?:parents are|parents:)\s*(.+?)(?:\.|$)/i,
        /(?:parents of|parents for)\s+(.+?)\s+(?:are|is)\s+(.+?)(?:\.|$)/i
      ]
      
      parentPatterns.forEach(pattern => {
        const match = cleanLine.match(pattern)
        if (match) {
          const [, person, parentsStr] = match
          const p = sanitizeName(person.trim().replace(/^(my |the |his |her )/i, ''))
          const parents = parentsStr
            .split(/,|\sand\s|;|•/)
            .map(parent => sanitizeName(parent.replace(/^(my |the |his |her )/i, '')))
            .filter(Boolean)
          
          if (p && parents.length > 0) {
            if (!relationships[p]) relationships[p] = { parents: [], children: [], depth: lineIndex }
            relationships[p].parents = [...new Set([...relationships[p].parents, ...parents])]
            
            parents.forEach(parent => {
              if (!relationships[parent]) relationships[parent] = { parents: [], children: [], depth: lineIndex - 1 }
              if (!relationships[parent].children.includes(p)) {
                relationships[parent].children.push(p)
              }
            })
          }
        }
      })
    })

    // Convert to FamilyMember objects with better generation calculation
    Object.keys(relationships).forEach((name, index) => {
      const rel = relationships[name]
      
      // Calculate generation based on relationships and line depth
      let generation = rel.depth || 1
      
      // Adjust generation based on family relationships
      if (rel.parents.length > 0 && rel.children.length === 0) {
        // Has parents but no children = younger generation
        generation = Math.max(generation, 2)
      } else if (rel.children.length > 0 && rel.parents.length === 0) {
        // Has children but no parents = older generation  
        generation = Math.min(generation, 0)
      } else if (rel.parents.length > 0 && rel.children.length > 0) {
        // Has both = middle generation
        generation = 1
      }

      members.push({
        id: `person-${index}`,
        name,
        generation: Math.max(0, Math.min(3, generation)), // Cap between 0-3
        parents: rel.parents.length > 0 ? rel.parents : undefined,
        children: rel.children.length > 0 ? rel.children : undefined
      })
    })

    return members
  }

  const handleClear = () => {
    onGenerate([])
    toast.success('Family tree diagram cleared')
  }

  const handleGenerate = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save family members');
      return;
    }

    const data = parseFamilyText(textInput);
    console.log('FamilyTree Generate clicked. Members:', data.length, data);
    
    if (data.length === 0) {
      toast.error('No names detected. Try clicking Format first or add full names.');
      return;
    }

    try {
      // Save each member to the database
      const insertPromises = data.map(async (member) => {
        // Determine family position based on generation
        let familyPosition = 'Other';
        if (member.generation === 0) familyPosition = 'Grandparent';
        else if (member.generation === 1) familyPosition = 'Parent';
        else if (member.generation === 2) familyPosition = 'Child';
        else if (member.generation === 3) familyPosition = 'Grandchild';

        // Build simple relationship description (only the most relevant one)
        let relationship = '';
        if (member.parents && member.parents.length > 0) {
          relationship = `Child of ${member.parents[0]}`;
          if (member.parents.length > 1) {
            relationship += ` and ${member.parents[1]}`;
          }
        } else if (member.children && member.children.length > 0) {
          // Only show parent relationship if no parent info
          if (member.children.length === 1) {
            relationship = `Parent of ${member.children[0]}`;
          } else {
            relationship = `Parent of ${member.children.length} children`;
          }
        }

        return supabase
          .from('family_members')
          .insert({
            full_name: member.name,
            family_position: familyPosition,
            relationship_to_family: relationship || null,
            added_by: user.id,
            status: 'active'
          });
      });

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('Some members failed to save:', errors);
        toast.error(`${errors.length} member(s) failed to save. Check console for details.`);
      } else {
        toast.success(`Saved ${data.length} family member${data.length > 1 ? 's' : ''} to database!`);
        onGenerate(data);
      }
    } catch (error) {
      console.error('Error saving family members:', error);
      toast.error('Failed to save family members. Please try again.');
    }
  };

  const callAiAssistant = async (assistanceType: 'expand' | 'format' | 'suggest') => {
    if (!textInput.trim()) {
      toast.error('Please enter some family information first')
      return
    }

    setIsAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-family-tree-assistant', {
        body: { 
          familyText: textInput,
          assistanceType 
        }
      })

      if (error) throw error

      if (data.success) {
        if (assistanceType === 'suggest') {
          toast.success('AI Suggestions', {
            description: data.response,
            duration: 10000,
          })
        } else {
          setTextInput(data.response)
          toast.success(`Family tree ${assistanceType === 'expand' ? 'expanded' : 'formatted'} successfully`)
        }
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('AI Assistant Error:', error)
      toast.error('Failed to get AI assistance. Please try again.')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleExampleLoad = () => {
    setTextInput(`The Johnson Family
├─ William Johnson (Great Grandfather)
│  ├─ married to Margaret O'Brien
│  └─ children: Robert Johnson, Patricia Johnson
├─ Robert Johnson (Grandfather) 
│  ├─ married to Dorothy Smith
│  └─ children: Michael Johnson, Susan Johnson, Jennifer Johnson
├─ Michael Johnson (Father)
│  ├─ married to Lisa Davis
│  └─ children: Tommy Johnson, Sarah Johnson
├─ Tommy Johnson (Son)
└─ Sarah Johnson (Daughter)`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            How to format your family tree
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>• Write about your family naturally, then click Format to organize</p>
          <p>• Add "married to [spouse name]" for marriages</p>
          <p>• Add "children: [name1], [name2]" for children</p>
          <p>• Add "parents: [parent1], [parent2]" for parents</p>
          <div className="mt-3 p-3 bg-muted rounded text-xs">
            <p className="font-medium mb-2">Example:</p>
            <p>"My grandfather John Smith married my grandmother Mary Johnson. They had three children: my father Robert, my aunt Patricia, and my uncle Michael. My father Robert married my mother Susan Davis. My parents have two children: me (David) and my sister Lisa."</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExampleLoad}
            >
              Load Example
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="family-text">Describe Your Family Tree</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => callAiAssistant('suggest')}
              disabled={isAiLoading}
              className="text-xs"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Get Suggestions
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callAiAssistant('format')}
              disabled={isAiLoading}
              className="text-xs"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Format
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => callAiAssistant('expand')}
              disabled={isAiLoading}
              className="text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {isAiLoading ? 'Expanding...' : 'Expand with AI'}
            </Button>
          </div>
        </div>
        <Textarea
          id="family-text"
          placeholder={textInput ? "Edit your family information or click Format to organize it..." : "Add family members in the Members tab or type here naturally... e.g., 'John is married to Mary. They have two children: Sarah and Mike.'"}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />
        <div className="flex gap-2 mt-2">
          <Button 
            onClick={handleGenerate}
            className="flex-1"
            size="lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Family Tree
          </Button>
          <Button 
            onClick={handleClear}
            variant="outline"
            size="lg"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}