import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Download, Award, Calendar, User, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface CertificateData {
  id: string
  certificate_number: string
  completion_date: string
  course: {
    title: string
    instructor: string
  }
}

interface CertificateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificate: CertificateData | null
}

export function CertificateDialog({ open, onOpenChange, certificate }: CertificateDialogProps) {
  const { profile } = useAuth()
  const certificateRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  if (!certificate) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const downloadCertificate = async () => {
    if (!certificateRef.current) return
    
    setDownloading(true)
    try {
      // Use html2canvas to convert the certificate to image
      const html2canvas = await import('html2canvas')
      const canvas = await html2canvas.default(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Create download link
      const link = document.createElement('a')
      link.download = `certificate-${certificate.certificate_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error downloading certificate:', error)
    } finally {
      setDownloading(false)
    }
  }

  const displayName = profile?.display_name || profile?.first_name || 'Student'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Certificate of Completion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Certificate Display */}
          <div 
            ref={certificateRef}
            className="bg-white p-8 border-8 border-double border-yellow-500 rounded-lg shadow-lg"
            style={{ aspectRatio: '11/8.5' }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Award className="h-16 w-16 text-yellow-500" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Certificate of Completion</h1>
              <div className="w-32 h-1 bg-yellow-500 mx-auto"></div>
            </div>

            {/* Main Content */}
            <div className="text-center space-y-6">
              <p className="text-lg text-gray-600">This is to certify that</p>
              
              <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-yellow-500 pb-2 inline-block">
                {displayName}
              </h2>
              
              <p className="text-lg text-gray-600">has successfully completed the course</p>
              
              <h3 className="text-2xl font-semibold text-gray-800 italic">
                "{certificate.course.title}"
              </h3>
              
              {certificate.course.instructor && (
                <p className="text-gray-600">
                  Instructed by <span className="font-semibold">{certificate.course.instructor}</span>
                </p>
              )}
              
              <div className="flex justify-center items-center gap-8 mt-8 pt-8 border-t border-gray-300">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Date of Completion</p>
                  <p className="font-semibold text-gray-800">{formatDate(certificate.completion_date)}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                  <p className="font-mono text-sm font-semibold text-gray-800">{certificate.certificate_number}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-300 text-center">
              <p className="text-sm text-gray-500">
                This certificate verifies the successful completion of the course requirements.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={downloadCertificate}
              disabled={downloading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Downloading...' : 'Download Certificate'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CertificateCardProps {
  certificate: CertificateData
  onViewCertificate: (certificate: CertificateData) => void
}

export function CertificateCard({ certificate, onViewCertificate }: CertificateCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewCertificate(certificate)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Completed
            </Badge>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{certificate.course.title}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Completed {formatDate(certificate.completion_date)}</span>
          </div>
          
          {certificate.course.instructor && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>By {certificate.course.instructor}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="font-mono text-xs">{certificate.certificate_number}</span>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full mt-3">
          View Certificate
        </Button>
      </CardContent>
    </Card>
  )
}