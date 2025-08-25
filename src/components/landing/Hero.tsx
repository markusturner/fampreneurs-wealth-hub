import { Button } from '@/components/ui/button'
import { ArrowDown, Play } from 'lucide-react'

export const Hero = () => {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full" style={{ background: 'linear-gradient(135deg, #290A52, #FFB500)' }} />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full" style={{ background: 'linear-gradient(135deg, #2EB2FF, #290A52)' }} />
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: '#290A52' }}>
              T
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#290A52' }}>TruHeirs</h1>
              <p className="text-xs text-muted-foreground">Powered by The Fampreneurs</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-sm" style={{ color: '#290A52' }}>
              Login
            </Button>
            <Button 
              className="text-sm text-white" 
              style={{ backgroundColor: '#290A52' }}
              onClick={scrollToPricing}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="container mx-auto px-6 py-20 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Headlines */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span style={{ color: '#290A52' }}>How to build</span>{' '}
            <span style={{ color: '#FFB500' }}>generational wealth</span>{' '}
            <span style={{ color: '#290A52' }}>without</span>{' '}
            <span style={{ color: '#2EB2FF' }}>expensive wealth managers</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Even if you're busy with your 9-5 and don't have millions yet
          </p>

          {/* Value Proposition */}
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#290A52' }}>
            The Complete DIY AI Family Office Platform for $75k+ earning professionals and entrepreneurs
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 text-white font-semibold"
              style={{ backgroundColor: '#290A52' }}
              onClick={scrollToPricing}
            >
              Start Building Your Legacy
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4 border-2"
              style={{ borderColor: '#2EB2FF', color: '#2EB2FF' }}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <span className="font-semibold text-2xl mr-2" style={{ color: '#FFB500' }}>500+</span>
              <span>Families Building Wealth</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-2xl mr-2" style={{ color: '#FFB500' }}>$50M+</span>
              <span>Assets Under Management</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-2xl mr-2" style={{ color: '#FFB500' }}>4.9★</span>
              <span>Average Rating</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ArrowDown className="w-6 h-6" style={{ color: '#290A52' }} />
        </div>
      </div>
    </section>
  )
}