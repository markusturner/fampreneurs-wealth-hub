import { Button } from '@/components/ui/button';
import { ArrowDown, Star, Users, TrendingUp } from 'lucide-react';
import { navigateToRoute, scrollToSection } from '@/utils/navigation';
import { useTheme } from '@/components/theme-provider';
import { FlowSelectionModal } from './FlowSelectionModal';
import { useState } from 'react';
export const Hero = () => {
  const { theme } = useTheme();
  const [showFlowModal, setShowFlowModal] = useState(false);
  
  const scrollToPricing = () => {
    scrollToSection('pricing');
  };
  

  const handleGetStarted = () => {
    setShowFlowModal(true);
  };
  return <section className="relative min-h-[100dvh] min-h-screen flex items-center justify-center bg-background overflow-hidden"
    style={{
      minHeight: 'calc(var(--vh, 1vh) * 100)', // Fallback for browsers without dvh support
    }}>
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
      <nav className="absolute top-0 left-0 right-0 z-50 p-1 md:p-2 backdrop-blur-sm bg-background/80 safe-area-top">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <img 
              src={theme === 'dark' ? "/lovable-uploads/04497296-47f8-41b8-8138-1326135c3c2e.png" : "/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"}
              alt="TruHeirs Logo" 
              className="w-14 h-14 md:w-16 md:h-16 object-contain transition-smooth hover:scale-105"
            />
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button size="sm" className="text-xs md:text-sm shadow-medium hover:shadow-glow transition-smooth hover:scale-105 px-3 md:px-4" style={{
              backgroundColor: '#2eb2ff',
              color: '#290a52'
            }} onClick={scrollToPricing}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Content */}
      <div className="container mx-auto px-4 md:px-6 -mt-8 pb-16 md:-mt-12 md:pb-20 text-center relative z-10">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Main Headlines - Enhanced Typography */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 md:mb-8 md:mt-16 lg:mt-40 leading-tight tracking-tight">
            <span className="text-foreground">How to build</span>{' '}
            <span style={{ color: '#fce000' }}>
              generational wealth
            </span>{' '}
            <span style={{ color: '#2eb2ff' }}>without</span>{' '}
            <span style={{ color: '#ffb500' }}>
              expensive
            </span>{' '}
            <span style={{ color: '#ffb500' }}>
              wealth managers
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground mb-8 md:mb-10 max-w-4xl mx-auto font-light leading-relaxed">
            Even if you're busy with your 9-5 and don't have millions yet
          </p>

          {/* Enhanced Value Proposition */}
          <div className="mt-4 md:mt-6 mb-8 md:mb-12 p-4 md:p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-medium max-w-3xl mx-auto">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground font-semibold leading-relaxed">
              The Complete DIY AI Family Office Platform for $75k+ earning professionals and entrepreneurs
            </p>
          </div>

          {/* Enhanced CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-12 md:mb-16">
            <Button size="lg" className="w-full sm:w-auto text-base md:text-lg lg:text-xl px-8 md:px-12 py-4 md:py-6 hover:bg-primary/90 text-primary-foreground font-bold shadow-strong hover:shadow-glow transition-all duration-300 hover:scale-105 group" style={{
            backgroundColor: '#2eb2ff'
          }} onClick={scrollToPricing}>
              <span className="group-hover:animate-pulse" style={{color: '#290a52'}}>Start Building Your Legacy</span>
            </Button>
          </div>

          {/* Enhanced Social Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-4 md:p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-secondary mr-2" />
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary">70+</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground font-medium text-center">Families Building Wealth</span>
            </div>
            <div className="flex flex-col items-center p-4 md:p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-secondary mr-2" />
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary">$6M+</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground font-medium text-center">Assets Under Management</span>
            </div>
            <div className="flex flex-col items-center p-4 md:p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-2">
                <Star className="w-5 h-5 md:w-6 md:h-6 text-secondary mr-2 fill-current" />
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary">4.9</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground font-medium text-center">Average Rating</span>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce flex justify-center items-center">
          <button onClick={() => scrollToSection('features')} className="hidden md:block p-3 rounded-full bg-primary/10 backdrop-blur-sm border hover:bg-primary/20 transition-all duration-300 hover:scale-110 cursor-pointer" style={{
          borderColor: '#ffb500'
        }} aria-label="Scroll to features section">
            <ArrowDown className="w-6 h-6" style={{
            color: '#ffb500'
          }} />
          </button>
        </div>
      </div>
      
      <FlowSelectionModal 
        open={showFlowModal} 
        onOpenChange={setShowFlowModal} 
      />
    </section>;
};