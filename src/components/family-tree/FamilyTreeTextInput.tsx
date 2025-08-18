import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Sparkles, Wand2, Lightbulb } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface FamilyMember {
  id: string
  name: string
  generation: number
  parents?: string[]
  children?: string[]
}

interface FamilyTreeTextInputProps {
  onFamilyDataChange: (members: FamilyMember[]) => void
}

export function FamilyTreeTextInput({ onFamilyDataChange }: FamilyTreeTextInputProps) {
  const [textInput, setTextInput] = useState(`John Smith
├─ married to Mary Johnson
├─ children: 
│  ├─ David Smith
│  │  ├─ married to Sarah Wilson
│  │  └─ children: Emma Smith, Lucas Smith
│  └─ Lisa Smith
│     └─ children: Michael Brown
└─ parents: Robert Smith, Helen Smith`)
  
  const [isAiLoading, setIsAiLoading] = useState(false)

  const parseFamilyText = (text: string): FamilyMember[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const members: FamilyMember[] = []
    const relationships: { [key: string]: { parents: string[], children: string[] } } = {}

    // Enhanced parsing for natural language
    lines.forEach(line => {
      const cleanLine = line.replace(/[├─└│]/g, '').trim()
      
      // Handle different relationship patterns
      if (cleanLine.includes('married to') || cleanLine.includes('married')) {
        const marriageMatch = cleanLine.match(/(.+?)\s+(?:married to|married)\s+(.+?)(?:\.|$|,)/i)
        if (marriageMatch) {
          const [, person1, person2] = marriageMatch
          const p1 = person1.trim().replace(/^(my |the |his |her )/i, '')
          const p2 = person2.trim().replace(/^(my |the |his |her )/i, '')
          if (!relationships[p1]) relationships[p1] = { parents: [], children: [] }
          if (!relationships[p2]) relationships[p2] = { parents: [], children: [] }
        }
      }
      
      // Handle children patterns
      const childrenPatterns = [
        /(?:had|have)\s+(?:children|kids):\s*(.+?)(?:\.|$)/i,
        /(?:children|kids):\s*(.+?)(?:\.|$)/i,
        /(?:had|have)\s+(?:\d+\s+)?(?:children|kids):\s*(.+?)(?:\.|$)/i
      ]
      
      childrenPatterns.forEach(pattern => {
        const childrenMatch = cleanLine.match(pattern)
        if (childrenMatch) {
          const childrenStr = childrenMatch[1]
          const children = childrenStr.split(/,|\sand\s/).map(c => c.trim().replace(/^(my |the |his |her )/i, ''))
          
          // Try to find the parent in the same line
          const parentMatch = cleanLine.match(/(.+?)\s+(?:had|have)/i)
          if (parentMatch) {
            const parent = parentMatch[1].trim().replace(/^(my |the |his |her )/i, '')
            if (!relationships[parent]) relationships[parent] = { parents: [], children: [] }
            relationships[parent].children = [...(relationships[parent].children || []), ...children]
            
            children.forEach(child => {
              if (!relationships[child]) relationships[child] = { parents: [], children: [] }
              if (!relationships[child].parents.includes(parent)) {
                relationships[child].parents.push(parent)
              }
            })
          }
        }
      })
      
      // Handle explicit parent statements
      const parentPatterns = [
        /(.+?)\s+(?:parents are|parents:)\s*(.+?)(?:\.|$)/i,
        /(?:parents of|parents for)\s+(.+?)\s+are\s+(.+?)(?:\.|$)/i
      ]
      
      parentPatterns.forEach(pattern => {
        const parentMatch = cleanLine.match(pattern)
        if (parentMatch) {
          const [, person, parentsStr] = parentMatch
          const p = person.trim().replace(/^(my |the |his |her )/i, '')
          const parents = parentsStr.split(/,|\sand\s/).map(p => p.trim().replace(/^(my |the |his |her )/i, ''))
          
          if (!relationships[p]) relationships[p] = { parents: [], children: [] }
          relationships[p].parents = [...(relationships[p].parents || []), ...parents]
          
          parents.forEach(parent => {
            if (!relationships[parent]) relationships[parent] = { parents: [], children: [] }
            if (!relationships[parent].children.includes(p)) {
              relationships[parent].children.push(p)
            }
          })
        }
      })
      
      // Extract names from natural sentences
      const namePatterns = [
        /(?:my\s+)?(?:grandfather|grandmother|father|mother|dad|mom|son|daughter|brother|sister|uncle|aunt)\s+(\w+(?:\s+\w+)?)/gi,
        /(\w+(?:\s+\w+)?)\s+(?:is|was)\s+(?:my|the)/gi,
        /(?:called|named)\s+(\w+(?:\s+\w+)?)/gi
      ]
      
      namePatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(cleanLine)) !== null) {
          const name = match[1].trim()
          if (name && name.length > 1 && !relationships[name]) {
            relationships[name] = { parents: [], children: [] }
          }
        }
      })
    })

    // Convert to FamilyMember objects with better generation calculation
    Object.keys(relationships).forEach((name, index) => {
      const rel = relationships[name]
      
      // Calculate generation based on relationships
      let generation = 1 // Default middle generation
      
      // If has parents but no children = younger generation
      if (rel.parents.length > 0 && rel.children.length === 0) {
        generation = 2
      }
      // If has children but no parents = older generation  
      else if (rel.children.length > 0 && rel.parents.length === 0) {
        generation = 0
      }
      // If has both = middle generation
      else if (rel.parents.length > 0 && rel.children.length > 0) {
        generation = 1
      }

      members.push({
        id: `person-${index}`,
        name,
        generation,
        parents: rel.parents.length > 0 ? rel.parents : undefined,
        children: rel.children.length > 0 ? rel.children : undefined
      })
    })

    return members
  }

  useEffect(() => {
    const familyData = parseFamilyText(textInput)
    onFamilyDataChange(familyData)
  }, [textInput, onFamilyDataChange])

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
          placeholder="Write about your family naturally... e.g., 'John is married to Mary. They have two children: Sarah and Mike. John's parents are Robert and Helen.' Then click Format to organize it."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />
      </div>
    </div>
  )
}