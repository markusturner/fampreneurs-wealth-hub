import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, BookOpen, Play, CheckCircle, Clock, Users, Star } from 'lucide-react'

const Courses = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.display_name || profile?.first_name || 'Member'

  // Sample course data
  const featuredCourses = [
    {
      id: 1,
      title: "Family Wealth Management Fundamentals",
      description: "Learn the basics of managing and growing family wealth across generations",
      instructor: "Sarah Johnson, CFP",
      duration: "6 weeks",
      lessons: 24,
      enrolled: 156,
      rating: 4.8,
      progress: 0,
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
      level: "Beginner",
      price: "Free"
    },
    {
      id: 2,
      title: "Investment Strategies for Family Offices",
      description: "Advanced investment techniques and portfolio management for family offices",
      instructor: "Michael Chen, CFA",
      duration: "8 weeks", 
      lessons: 32,
      enrolled: 89,
      rating: 4.9,
      progress: 45,
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop",
      level: "Advanced",
      price: "$299"
    },
    {
      id: 3,
      title: "Estate Planning & Legacy Building",
      description: "Create lasting legacies and plan for seamless wealth transfer",
      instructor: "Elizabeth Davis, J.D.",
      duration: "4 weeks",
      lessons: 16,
      enrolled: 203,
      rating: 4.7,
      progress: 100,
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop",
      level: "Intermediate",
      price: "$199"
    }
  ]

  const categories = [
    "All Courses",
    "Wealth Management", 
    "Investment",
    "Estate Planning",
    "Tax Strategy",
    "Business Growth",
    "Family Governance"
  ]

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Family Wealth Courses
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Enhance your financial knowledge with expert-led courses
            </p>
          </div>
        </div>

        {/* Course Categories */}
        <Card className="shadow-soft">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg font-bold">Course Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={category === "All Courses" ? "default" : "outline"}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  {category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Featured Courses */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Featured Courses</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course) => (
              <Card key={course.id} className="shadow-soft hover:shadow-medium transition-smooth overflow-hidden">
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={course.level === 'Beginner' ? 'secondary' : course.level === 'Advanced' ? 'destructive' : 'default'} className="text-xs">
                      {course.level}
                    </Badge>
                    <span className="text-sm font-semibold text-primary">{course.price}</span>
                  </div>
                  <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">{course.instructor}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {course.lessons} lessons
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{course.rating}</span>
                    </div>
                  </div>

                  {course.progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}

                  <Button className="w-full gap-2" size="sm">
                    {course.progress === 0 ? (
                      <>
                        <Play className="h-4 w-4" />
                        Start Course
                      </>
                    ) : course.progress === 100 ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Continue
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Learning Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">3</div>
              <div className="text-sm text-muted-foreground">Enrolled Courses</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">1</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">24</div>
              <div className="text-sm text-muted-foreground">Hours Learned</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">85%</div>
              <div className="text-sm text-muted-foreground">Avg Progress</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default Courses