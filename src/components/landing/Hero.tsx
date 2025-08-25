import { Button } from '@/components/ui/button'
import { ArrowDown, Play, Star, Users, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { DemoModal } from './DemoModal'
import { navigateToRoute, scrollToSection } from '@/utils/navigation'

export const Hero = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  
  const scrollToPricing = () => {
    scrollToSection('pricing')
  }
  
  const handleLoginClick = () => {
    navigateToRoute('/auth')
  }
  
  const handleDemoClick = () => {
    setIsDemoModalOpen(true)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-gradient-to-br from-primary to-secondary animate-pulse shadow-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-br from-accent to-primary animate-pulse delay-700 shadow-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/20 to-transparent animate-spin-slow" />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 animate-bounce delay-1000">
          <TrendingUp className="w-8 h-8 text-secondary/40" />
        </div>
        <div className="absolute top-3/4 right-1/4 animate-bounce delay-500">
          <Users className="w-10 h-10 text-accent/40" />
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 backdrop-blur-sm bg-background/20">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-glow transition-smooth hover:scale-105">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#ffb500' }}>TruHeirs</h1>
              <p className="text-xs text-muted-foreground">Powered by The Fampreneurs</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-sm hover:bg-primary/10 transition-smooth"
              style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              onClick={handleLoginClick}
            >
              Login
            </Button>
            <Button 
              className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium hover:shadow-glow transition-smooth hover:scale-105" 
              onClick={scrollToPricing}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Content */}
      <div className="container mx-auto px-6 py-20 text-center relative z-10">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Main Headlines - Enhanced Typography */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight tracking-tight">
            <span className="text-foreground">How to build</span>{' '}
            <span className="text-secondary">
              generational wealth
            </span>{' '}
            <span style={{ color: '#2eb2ff' }}>without</span>{' '}
            <span className="text-accent">
              expensive wealth managers
            </span>
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
              className="text-xl px-12 py-6 hover:bg-primary/90 text-primary-foreground font-bold shadow-strong hover:shadow-glow transition-all duration-300 hover:scale-105 group"
              style={{ backgroundColor: '#2eb2ff' }}
              onClick={scrollToPricing}
            >
              <span className="group-hover:animate-pulse">Start Building Your Legacy</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-xl px-12 py-6 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground shadow-medium hover:shadow-glow transition-all duration-300 hover:scale-105"
              onClick={handleDemoClick}
            >
              <Play className="w-6 h-6 mr-3" />
              Watch Demo
            </Button>
          </div>

          {/* Enhanced Social Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <Users className="w-6 h-6 text-secondary mr-2" />
                <span className="text-4xl font-bold text-secondary">500+</span>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Families Building Wealth</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-6 h-6 text-secondary mr-2" />
                <span className="text-4xl font-bold text-secondary">$50M+</span>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Assets Under Management</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <Star className="w-6 h-6 text-secondary mr-2 fill-current" />
                <span className="text-4xl font-bold text-secondary">4.9</span>
              </div>
              <span className="text-sm text-muted-foreground font-medium">Average Rating</span>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="p-3 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
            <ArrowDown className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
      
      <DemoModal 
        isOpen={isDemoModalOpen} 
        onClose={() => setIsDemoModalOpen(false)} 
      />
    </section>
  )
}