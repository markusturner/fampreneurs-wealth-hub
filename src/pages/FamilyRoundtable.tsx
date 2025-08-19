import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Crown, 
  Users, 
  MessageCircle, 
  Image, 
  TreePine, 
  Lock, 
  Scroll,
  Building2,
  Scale,
  Shield,
  GraduationCap,
  ArrowLeft,
  Heart,
  FileText,
  Video
} from "lucide-react"
import { NavHeader } from "@/components/dashboard/nav-header"
import { useNavigate } from "react-router-dom"

const familyEducationModules = [
  {
    title: "Family Business Education",
    description: "Learn the fundamentals of running a successful family business",
    icon: Building2,
    status: "Available",
    lessons: 12,
    duration: "3 hours"
  },
  {
    title: "Family Constitution",
    description: "Understanding and implementing your family's core values and principles",
    icon: Scroll,
    status: "Available",
    lessons: 8,
    duration: "2 hours"
  },
  {
    title: "Family Governance Framework",
    description: "The three branches of family government and their roles",
    icon: Scale,
    status: "Available",
    lessons: 15,
    duration: "4 hours"
  }
]

const governanceBranches = [
  {
    title: "The Family Council",
    description: "Executive branch responsible for day-to-day family business decisions",
    icon: Crown,
    members: "5 Active Members",
    role: "Decision Making & Strategy"
  },
  {
    title: "Council of Elders",
    description: "Advisory branch providing wisdom and guidance based on experience",
    icon: Users,
    members: "3 Elder Members",
    role: "Guidance & Mentorship"
  },
  {
    title: "Family Assembly",
    description: "Legislative branch representing all family members' voices",
    icon: Scale,
    members: "All Family Members",
    role: "Voting & Policy Making"
  }
]

const heritageResources = [
  {
    title: "Family Crest & Seal",
    description: "Explore the history and meaning behind your family symbols",
    icon: Crown,
    type: "Interactive Gallery"
  },
  {
    title: "Family Portrait Gallery",
    description: "View the commissioned family portrait painting",
    icon: Image,
    type: "Digital Gallery"
  },
  {
    title: "Family Tree Explorer",
    description: "Interactive genealogy and family lineage",
    icon: TreePine,
    type: "Interactive Map"
  },
  {
    title: "Family Identity Manual",
    description: "Comprehensive guide to family values, mission, and vision",
    icon: FileText,
    type: "Digital Handbook"
  }
]

export default function FamilyRoundtable() {
  const navigate = useNavigate()

  const handleStartLearning = (moduleTitle: string) => {
    // Navigate to courses page with the specific module
    navigate('/courses', { state: { searchTerm: moduleTitle } })
  }

  const handleAccessChat = () => {
    // Navigate to community page for family communication
    navigate('/community')
  }

  const handleHeritageResource = (resourceTitle: string) => {
    // For now, show a toast message - you can implement specific pages later
    const messages = {
      "Family Crest & Seal": "Opening interactive family crest gallery...",
      "Family Portrait Gallery": "Viewing commissioned family portraits...",
      "Family Tree Explorer": "Loading interactive family tree...",
      "Family Identity Manual": "Opening family values handbook..."
    }
    
    // You could create specific pages for each resource
    alert(messages[resourceTitle as keyof typeof messages] || "Opening resource...")
  }

  const handleEnterAccessCode = () => {
    // Create a prompt for access code
    const accessCode = prompt("Enter your family access code:")
    
    if (accessCode) {
      if (accessCode.toLowerCase() === "family2024" || accessCode === "1234") {
        alert("Access granted! Viewing secure family information...")
        // You could navigate to a secure area or show hidden content
      } else {
        alert("Invalid access code. Please contact your family administrator.")
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
    </div>
  )
}