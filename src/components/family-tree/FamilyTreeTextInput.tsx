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

    // Simple parsing - extract names and relationships
    lines.forEach(line => {
      const cleanLine = line.replace(/[├─└│]/g, '').trim()
      
      if (cleanLine.includes('married to')) {
        const [person1, person2] = cleanLine.split('married to').map(s => s.trim())
        if (person1 && person2) {
          if (!relationships[person1]) relationships[person1] = { parents: [], children: [] }
          if (!relationships[person2]) relationships[person2] = { parents: [], children: [] }
        }
      } else if (cleanLine.includes('children:')) {
        // Skip the "children:" line itself
        return
      } else if (cleanLine.includes('parents:')) {
        const [person, parentsStr] = cleanLine.split('parents:').map(s => s.trim())
        if (person && parentsStr) {
          const parents = parentsStr.split(',').map(p => p.trim())
          if (!relationships[person]) relationships[person] = { parents: [], children: [] }
          relationships[person].parents = parents
          
          parents.forEach(parent => {
            if (!relationships[parent]) relationships[parent] = { parents: [], children: [] }
            if (!relationships[parent].children.includes(person)) {
              relationships[parent].children.push(person)
            }
          })
        }
      } else if (cleanLine && !cleanLine.includes(':')) {
        // This is likely a person's name
        const names = cleanLine.split(',').map(s => s.trim()).filter(Boolean)
        names.forEach(name => {
          if (!relationships[name]) relationships[name] = { parents: [], children: [] }
        })
      }
    })

    // Convert to FamilyMember objects
    Object.keys(relationships).forEach((name, index) => {
      const rel = relationships[name]
      // Simple generation calculation based on parent/child relationships
      let generation = 1
      if (rel.parents.length > 0) generation = 2
      if (rel.children.length > 0 && rel.parents.length === 0) generation = 0

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
          <p>• Use simple text with names on separate lines</p>
          <p>• Add "married to [spouse name]" for marriages</p>
          <p>• Add "children: [name1], [name2]" for children</p>
          <p>• Add "parents: [parent1], [parent2]" for parents</p>
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
          placeholder="Enter your family information here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />
      </div>
    </div>
  )
}