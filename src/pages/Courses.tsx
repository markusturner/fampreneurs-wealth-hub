import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NavHeader } from '@/components/dashboard/nav-header'
import { useToast } from '@/hooks/use-toast'
import { 
  Upload,
  Download,
  FileText,
  Building,
  Shield,
  Landmark,
  Hash,
  Video,
  Heart,
  Scroll,
  MapPin,
  Phone,
  Award
} from 'lucide-react'


const documentCategories = [
  {
    title: "Trust Documents",
    icon: Landmark,
    documents: [
      { name: "Family Trust Document", icon: FileText, type: "file" },
      { name: "Business Trust Document", icon: Building, type: "file" },
      { name: "Tax-Exempt Trust Document", icon: Shield, type: "file" },
      { name: "Power of Attorney Document", icon: FileText, type: "file" }
    ]
  },
  {
    title: "Certificates & Legal",
    icon: Shield,
    documents: [
      { name: "Trademark Certificate", icon: Award, type: "file" },
      { name: "Family Constitution", icon: Scroll, type: "file" },
      { name: "Family Crest", icon: Award, type: "file" }
    ]
  },
  {
    title: "EIN Numbers",
    icon: Hash,
    documents: [
      { name: "Family Trust EIN Number", icon: Hash, type: "text" },
      { name: "Business Trust EIN Number", icon: Hash, type: "text" },
      { name: "Tax-Exempt EIN Number", icon: Hash, type: "text" }
    ]
  },
  {
    title: "Addresses",
    icon: MapPin,
    documents: [
      { name: "Family Trust Address", icon: MapPin, type: "text" },
      { name: "Business Trust Address", icon: MapPin, type: "text" },
      { name: "Tax-Exempt Address", icon: MapPin, type: "text" }
    ]
  },
  {
    title: "Phone Numbers",
    icon: Phone,
    documents: [
      { name: "Family Trust Phone Number", icon: Phone, type: "text" },
      { name: "Business Trust Phone Number", icon: Phone, type: "text" },
      { name: "Tax-Exempt Phone Number", icon: Phone, type: "text" }
    ]
  },
  {
    title: "Legacy Documents",
    icon: Heart,
    documents: [
      { name: "Legacy Video", icon: Video, type: "file" },
      { name: "The Life-Legacy Letter", icon: Heart, type: "file" },
      { name: "Sorry I Died On You Letter", icon: Heart, type: "file" }
    ]
  }
]

export default function Courses() {
  const { toast } = useToast()
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)

  const handleUpload = (documentName: string) => {
    setUploadingDocument(documentName)
    // TODO: Implement actual upload logic
    setTimeout(() => {
      setUploadingDocument(null)
      toast({
        title: "Document Uploaded",
        description: `${documentName} has been uploaded successfully.`
      })
    }, 2000)
  }

  const handleDownload = (documentName: string) => {
    // TODO: Implement actual download logic
    toast({
      title: "Download Started",
      description: `Downloading ${documentName}...`
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Family Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your family documents and trust materials
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {documentCategories.map((category) => {
            const CategoryIcon = category.icon
            
            return (
              <Card key={category.title} className="shadow-soft">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
                    <span>{category.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {category.documents.map((document) => {
                      const DocumentIcon = document.icon
                      const isUploading = uploadingDocument === document.name
                      
                      return (
                        <div
                          key={document.name}
                          className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <DocumentIcon className="h-3 w-3 sm:h-4 sm:w-4 text-secondary-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {document.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(document.name)}
                              disabled={isUploading}
                              className="h-7 px-2 sm:h-8 sm:px-3"
                              title="Upload"
                            >
                              {isUploading ? (
                                <div className="h-2 w-2 sm:h-3 sm:w-3 animate-spin rounded-full border border-current border-t-transparent" />
                              ) : (
                                <Upload className="h-2 w-2 sm:h-3 sm:w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(document.name)}
                              className="h-7 px-2 sm:h-8 sm:px-3"
                              title="Download"
                            >
                              <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}