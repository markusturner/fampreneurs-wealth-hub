import { useState } from 'react'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Download, Check, ThumbsUp, Share, X, ChevronDown, Clock } from 'lucide-react'

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
      <DialogContent className="p-0 max-w-full h-full lg:max-w-4xl lg:h-auto bg-black text-white border-none overflow-hidden">
        <div className="relative h-full overflow-y-auto">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Video/Image Section */}
          <div className="relative aspect-video bg-gradient-to-b from-gray-900 to-black">
            <img 
              src={course.image_url || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop"}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            
            {/* Course Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white font-bold px-2 py-1">COURSE</Badge>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold">{course.title}</h1>
                
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <span>2024</span>
                  <span>{course.level}</span>
                  <Badge variant="outline" className="border-gray-600 text-gray-300">
                    {course.category || 'Business'}
                  </Badge>
                </div>

                <p className="text-sm sm:text-base text-gray-300 max-w-2xl line-clamp-3">
                  {course.description || "Master essential business skills with this comprehensive course designed for first-generation wealth builders."}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button 
                    size="lg" 
                    className="flex-1 sm:flex-none bg-white text-black hover:bg-gray-200 font-semibold"
                    onClick={onEnroll}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {isEnrolled ? `Continue (${progress}%)` : 'Start Course'}
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="bg-gray-600 hover:bg-gray-500 text-white border-0"
                    onClick={onToggleMyList}
                  >
                    {isInMyList ? <Check className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="bg-gray-600 hover:bg-gray-500 text-white border-0"
                  >
                    <ThumbsUp className="h-5 w-5" />
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="bg-gray-600 hover:bg-gray-500 text-white border-0"
                  >
                    <Share className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 sm:p-6">
            {/* Progress Bar */}
            {isEnrolled && progress > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Your Progress</span>
                  <span className="text-sm text-gray-400">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent border-b border-gray-800 rounded-none h-auto p-0 w-full justify-start">
                <TabsTrigger 
                  value="lessons" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent rounded-none pb-3 text-gray-400 data-[state=active]:text-white"
                >
                  Lessons
                </TabsTrigger>
                <TabsTrigger 
                  value="more" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent rounded-none pb-3 text-gray-400 data-[state=active]:text-white"
                >
                  More Like This
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent rounded-none pb-3 text-gray-400 data-[state=active]:text-white"
                >
                  Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Course Content</h3>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <span className="mr-2">All Lessons</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {mockLessons.map((lesson, index) => (
                  <div key={lesson.id} className="flex gap-4 p-3 hover:bg-gray-900 rounded-lg cursor-pointer group">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={lesson.thumbnail}
                        alt={lesson.title}
                        className="w-24 h-14 object-cover rounded"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 text-xs px-1 rounded">
                        {lesson.duration}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white group-hover:text-gray-300 truncate">
                            {index + 1}. {lesson.title}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {lesson.description}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 flex-shrink-0 text-gray-400 hover:text-white"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="more" className="mt-6">
                <div className="text-center py-8">
                  <p className="text-gray-400">More courses coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">About this Course</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {course.description || "This comprehensive course is designed to help first-generation wealth builders understand the fundamentals of building and preserving family wealth. Through practical lessons and real-world examples, you'll learn proven strategies used by successful families to create lasting financial legacies."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Instructor</h4>
                    <p className="text-gray-400">{course.instructor || 'Expert Instructor'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Duration</h4>
                    <p className="text-gray-400">{course.duration || '3 hours'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Level</h4>
                    <p className="text-gray-400">{course.level}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Category</h4>
                    <p className="text-gray-400">{course.category || 'Business'}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}