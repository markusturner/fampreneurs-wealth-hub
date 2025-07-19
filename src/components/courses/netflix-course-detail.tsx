import { useState } from 'react'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Download, Check, ThumbsUp, Share, X, ChevronDown, Clock, Plus } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  instructor: string | null
  duration: string | null
  level: string
  price: string
  image_url: string | null
  category: string | null
  created_by: string
  created_at: string
}

interface NetflixCourseDetailProps {
  course: Course | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isEnrolled: boolean
  progress: number
  onEnroll: () => void
  isInMyList: boolean
  onToggleMyList: () => void
}

export function NetflixCourseDetail({ 
  course, 
  open, 
  onOpenChange, 
  isEnrolled, 
  progress, 
  onEnroll,
  isInMyList,
  onToggleMyList 
}: NetflixCourseDetailProps) {
  const [activeTab, setActiveTab] = useState('lessons')

  if (!course) return null

  const mockLessons = [
    {
      id: 1,
      title: "Introduction to Wealth Building",
      description: "Learn the fundamental principles of building generational wealth and understanding family financial structures.",
      duration: "25m",
      thumbnail: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=120&fit=crop"
    },
    {
      id: 2,
      title: "Investment Strategies",
      description: "Discover proven investment strategies that successful families use to grow their wealth over time.",
      duration: "32m", 
      thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop"
    },
    {
      id: 3,
      title: "Estate Planning Basics",
      description: "Understanding the importance of estate planning and how to protect your family's financial future.",
      duration: "28m",
      thumbnail: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=120&fit=crop"
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-full h-full lg:max-w-4xl lg:h-auto bg-background border-none overflow-hidden">
        <div className="relative h-full overflow-y-auto bg-background">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 text-foreground hover:bg-muted rounded-full w-8 h-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Video/Image Section - Optimized for mobile */}
          <div className="relative aspect-[16/10] sm:aspect-video bg-gradient-to-b from-muted to-background">
            <img 
              src={course.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop"}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Course Info Overlay - Optimized for mobile */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    className="text-xs px-2 py-1 font-bold"
                    style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                  >
                    {course.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">12 weeks</span>
                  <span className="text-xs text-muted-foreground">Free</span>
                </div>
                
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground line-clamp-2">{course.title}</h1>
                
                <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                  {course.description || "Master essential business skills with this comprehensive course designed for first-generation wealth builders."}
                </p>

                {/* Action Buttons - Mobile optimized */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <Button 
                    size="lg" 
                    className="w-full sm:flex-1 font-semibold text-base py-3"
                    style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                    onClick={onEnroll}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isEnrolled ? 'Continue Course' : 'Start Course'}
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full sm:w-auto bg-background/20 border-foreground/20 text-foreground hover:bg-background/40 backdrop-blur-sm"
                    onClick={onToggleMyList}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    My List
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section - Mobile optimized */}
          <div className="p-3 sm:p-6 bg-background">
            {/* Progress Bar */}
            {isEnrolled && progress > 0 && (
              <div className="mb-4 sm:mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Your Progress</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Video Player Section */}
            <div className="mb-6 bg-muted rounded-lg overflow-hidden">
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center mb-3 mx-auto">
                    <Play className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground ml-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">6 min ⚡ 4 min 52 sec</p>
                </div>
                <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1">
                  <span className="text-xs">🔄 1.2x</span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-foreground">Description</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {course.description || "Master essential business skills with this comprehensive course designed for first-generation wealth builders."}
                </p>
              </div>
            </div>

            {/* Resources Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-foreground">Resources</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Course Materials</p>
                    <p className="text-xs text-muted-foreground">PDF, worksheets, and templates</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Download
                  </Button>
                </div>
              </div>
            </div>

            {/* Course Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Instructor</p>
                <p className="text-foreground font-medium">{course.instructor || 'Expert Instructor'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Duration</p>
                <p className="text-foreground font-medium">{course.duration || '3 hours'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Level</p>
                <p className="text-foreground font-medium">{course.level}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Category</p>
                <p className="text-foreground font-medium">{course.category || 'Business'}</p>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}