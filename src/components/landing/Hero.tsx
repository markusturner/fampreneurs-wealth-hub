import { Button } from '@/components/ui/button'
import { ArrowDown, Play, Star, Users, TrendingUp } from 'lucide-react'

export const Hero = () => {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center gradient-hero overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-gradient-to-br from-white/20 to-white/30 animate-pulse shadow-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-br from-white/10 to-white/20 animate-pulse delay-700 shadow-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-white/10 to-transparent animate-spin-slow" />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 animate-bounce delay-1000">
          <TrendingUp className="w-8 h-8 text-white/40" />
        </div>
        <div className="absolute top-3/4 right-1/4 animate-bounce delay-500">
          <Users className="w-10 h-10 text-white/40" />
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 backdrop-blur-sm bg-background/20">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-black font-bold text-xl shadow-glow transition-smooth hover:scale-105">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TruHeirs</h1>
              <p className="text-xs text-muted-foreground">Powered by The Fampreneurs</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-sm text-white hover:text-white hover:bg-white/10 transition-smooth">
              Login
            </Button>
            <Button 
              className="text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-medium hover:shadow-glow transition-smooth hover:scale-105" 
              onClick={scrollToPricing}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Content */}
      <div className="container mx-auto px-6 py-20 text-center relative z-10 bg-card/20 backdrop-blur-md border border-border/30 rounded-3xl shadow-strong mx-4 lg:mx-auto">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Main Headlines - Enhanced Typography */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            How to build generational wealth without expensive wealth managers
          </h1>
          
          <p className="text-xl md:text-3xl text-muted-foreground mb-10 max-w-4xl mx-auto font-light leading-relaxed">
            Even if you're busy with your 9-5 and don't have millions yet
          </p>

          {/* Enhanced Value Proposition */}
          <div className="mb-12 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-medium max-w-3xl mx-auto">
            <p className="text-lg md:text-2xl text-white font-semibold leading-relaxed">
              The Complete DIY AI Family Office Platform for $75k+ earning professionals and entrepreneurs
            </p>
          </div>

          {/* Enhanced CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <Button 
              size="lg" 
              className="text-xl px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold shadow-strong hover:shadow-glow transition-all duration-300 hover:scale-105 group"
              onClick={scrollToPricing}
            >
              <span className="group-hover:animate-pulse">Start Building Your Legacy</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-xl px-12 py-6 border-2 border-white text-white hover:bg-white hover:text-black shadow-medium hover:shadow-glow transition-all duration-300 hover:scale-105"
            >
              <Play className="w-6 h-6 mr-3" />
              Watch Demo
            </Button>
          </div>

          {/* Enhanced Social Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <Users className="w-6 h-6 text-white mr-2" />
                <span className="text-4xl font-bold text-white">500+</span>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Families Building Wealth</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-6 h-6 text-white mr-2" />
                <span className="text-4xl font-bold text-white">$50M+</span>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Assets Under Management</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <Star className="w-6 h-6 text-white mr-2 fill-current" />
                <span className="text-4xl font-bold text-white">4.9</span>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Average Rating</span>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="p-4 rounded-full bg-card/80 backdrop-blur-md border border-border/60 shadow-strong">
            <ArrowDown className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </section>
  )
}