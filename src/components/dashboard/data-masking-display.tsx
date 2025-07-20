import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { useFamilyOfficeSecurity } from '@/hooks/useFamilyOfficeSecurity'

interface DataMaskingDisplayProps {
  data: string
  dataType: 'email' | 'phone' | 'partial' | 'full'
  classification: 'public' | 'internal' | 'confidential' | 'restricted'
  allowUnmask?: boolean
  label?: string
}

export function DataMaskingDisplay({ 
  data, 
  dataType, 
  classification,
  allowUnmask = true,
  label 
}: DataMaskingDisplayProps) {
  const [isUnmasked, setIsUnmasked] = useState(false)
  const [maskedData, setMaskedData] = useState('')
  const { maskSensitiveData, logSecurityAction } = useFamilyOfficeSecurity()

  useEffect(() => {
    const applyMasking = async () => {
      if (classification === 'public') {
        setMaskedData(data)
        return
      }

      if (classification === 'internal' && !allowUnmask) {
        setMaskedData(data)
        return
      }

      const masked = await maskSensitiveData(data, dataType)
      setMaskedData(masked)
    }

    applyMasking()
  }, [data, dataType, classification, allowUnmask, maskSensitiveData])

  const handleToggleVisibility = async () => {
    if (!isUnmasked) {
      // Log when sensitive data is unmasked
      await logSecurityAction(
        'sensitive_data_viewed', 
        'data_masking', 
        undefined, 
        { 
          data_type: dataType, 
          classification: classification,
          label: label 
        },
        classification === 'restricted' ? 'high' : 'medium'
      )
    }
    
    setIsUnmasked(!isUnmasked)
  }

  const getClassificationColor = (level: string) => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800'
      case 'internal': return 'bg-blue-100 text-blue-800'
      case 'confidential': return 'bg-yellow-100 text-yellow-800'
      case 'restricted': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const shouldShowMasking = classification !== 'public' && (classification !== 'internal' || allowUnmask)
  const displayData = isUnmasked || !shouldShowMasking ? data : maskedData

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{displayData}</span>
      
      {shouldShowMasking && allowUnmask && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleVisibility}
          className="h-6 w-6 p-0"
        >
          {isUnmasked ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      )}
      
      <Badge 
        variant="outline" 
        className={`text-xs ${getClassificationColor(classification)}`}
      >
        <Shield className="h-2 w-2 mr-1" />
        {classification}
      </Badge>
    </div>
  )
}