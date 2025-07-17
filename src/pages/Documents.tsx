import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Download, FileText, Building, Shield, Landmark, Crown, Phone, MapPin, Hash, Video, Heart, Scroll } from "lucide-react"
import { useNavigate } from "react-router-dom"

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
      { name: "Trademark Certificate", icon: Crown, type: "file" },
      { name: "Family Constitution", icon: Scroll, type: "file" },
      { name: "Family Crest", icon: Crown, type: "file" }
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

export default function Documents() {
  const navigate = useNavigate()
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)

  const handleUpload = (documentName: string) => {
    setUploadingDocument(documentName)
    // TODO: Implement actual upload logic
    setTimeout(() => {
      setUploadingDocument(null)
    }, 2000)
  }

  const handleDownload = (documentName: string) => {
    // TODO: Implement actual download logic
    console.log("Downloading:", documentName)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Family Documents</h1>
              <p className="text-sm text-muted-foreground">
                Manage your trust and family documents securely
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {documentCategories.map((category) => {
            const CategoryIcon = category.icon
            
            return (
              <Card key={category.title} className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <CategoryIcon className="h-5 w-5 text-primary" />
                    <span>{category.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {category.documents.map((document) => {
                      const DocumentIcon = document.icon
                      const isUploading = uploadingDocument === document.name
                      
                      return (
                        <div
                          key={document.name}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <DocumentIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {document.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(document.name)}
                              disabled={isUploading}
                              className="h-8 px-3"
                            >
                              {isUploading ? (
                                <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(document.name)}
                              className="h-8 px-3"
                            >
                              <Download className="h-3 w-3" />
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
      </main>
    </div>
  )
}