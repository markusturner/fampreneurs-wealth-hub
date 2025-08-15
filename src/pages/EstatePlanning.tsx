import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Calendar, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const EstatePlanning = () => {
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: "Last Will and Testament",
      type: "Will",
      lastUpdated: "2024-01-15",
      expiresAt: "2025-01-15",
      status: "current"
    },
    {
      id: 2,
      name: "Family Trust Agreement",
      type: "Trust",
      lastUpdated: "2023-12-10",
      expiresAt: "2024-12-10",
      status: "expiring_soon"
    },
    {
      id: 3,
      name: "Power of Attorney",
      type: "Legal Document",
      lastUpdated: "2024-02-20",
      expiresAt: "2026-02-20",
      status: "current"
    }
  ])
  
  const { toast } = useToast()

  const handleUpload = () => {
    toast({
      title: "Document uploaded",
      description: "Your estate planning document has been uploaded successfully."
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "current":
        return <Badge variant="default">Current</Badge>
      case "expiring_soon":
        return <Badge variant="destructive">Expiring Soon</Badge>
      case "expired":
        return <Badge variant="secondary">Expired</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Estate Planning</h1>
          <p className="text-muted-foreground">Manage your estate planning documents and legal affairs</p>
        </div>
        <Button onClick={handleUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Total Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">1</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estate Planning Documents</CardTitle>
          <CardDescription>Manage your wills, trusts, and legal documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">{doc.name}</h3>
                    <p className="text-sm text-muted-foreground">{doc.type}</p>
                    <p className="text-xs text-muted-foreground">Last updated: {doc.lastUpdated}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(doc.status)}
                  <div className="text-right">
                    <p className="text-sm">Expires: {doc.expiresAt}</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
          <CardDescription>Add a new estate planning document</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document-name">Document Name</Label>
              <Input id="document-name" placeholder="Enter document name" />
            </div>
            <div>
              <Label htmlFor="document-type">Document Type</Label>
              <Input id="document-type" placeholder="Will, Trust, etc." />
            </div>
          </div>
          <div>
            <Label htmlFor="expiry-date">Expiry Date</Label>
            <Input id="expiry-date" type="date" />
          </div>
          <Button onClick={handleUpload} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default EstatePlanning