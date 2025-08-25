import { Button } from '@/components/ui/button'
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react'
import { scrollToSection, openExternalLink, socialLinks, contactInfo } from '@/utils/navigation'

export const Footer = () => {
  const scrollToPricing = () => {
    scrollToSection('pricing')
  }

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: '#290A52' }}>
                T
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#290A52' }}>TruHeirs</h3>
                <p className="text-xs text-muted-foreground">Powered by The Fampreneurs</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The complete DIY AI family office platform designed for busy professionals and entrepreneurs building generational wealth.
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={() => openExternalLink(socialLinks.facebook)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" style={{ color: '#290A52' }} />
              </button>
              <button 
                onClick={() => openExternalLink(socialLinks.twitter)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" style={{ color: '#290A52' }} />
              </button>
              <button 
                onClick={() => openExternalLink(socialLinks.linkedin)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" style={{ color: '#290A52' }} />
              </button>
              <button 
                onClick={() => openExternalLink(socialLinks.instagram)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" style={{ color: '#290A52' }} />
              </button>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#290A52' }}>Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button 
                  onClick={() => scrollToSection('features')} 
                  className="hover:text-foreground transition-colors text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('pricing')} 
                  className="hover:text-foreground transition-colors text-left"
                >
                  Pricing
                </button>
              </li>
              <li><a href="/help" className="hover:text-foreground transition-colors">Security</a></li>
              <li><a href="/help" className="hover:text-foreground transition-colors">Integrations</a></li>
              <li><a href="/help" className="hover:text-foreground transition-colors">API Documentation</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#290A52' }}>Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/community" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="/help" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="/courses" className="hover:text-foreground transition-colors">Webinars</a></li>
              <li><a href="/community" className="hover:text-foreground transition-colors">Case Studies</a></li>
              <li><a href="/community" className="hover:text-foreground transition-colors">Community</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: '#290A52' }}>Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2" style={{ color: '#FFB500' }} />
                <button 
                  onClick={() => window.open(`mailto:${contactInfo.email}`, '_blank')}
                  className="hover:text-foreground transition-colors text-left"
                >
                  {contactInfo.email}
                </button>
              </li>
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2" style={{ color: '#FFB500' }} />
                <button 
                  onClick={() => window.open(`tel:${contactInfo.phone}`, '_blank')}
                  className="hover:text-foreground transition-colors text-left"
                >
                  {contactInfo.phone}
                </button>
              </li>
              <li className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5" style={{ color: '#FFB500' }} />
                <span>123 Wealth St.<br />Financial District<br />New York, NY 10001</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-12 border-t border-b border-border">
          <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#290A52' }}>
            Ready to Start Building Your Family Legacy?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join hundreds of families who are already using TruHeirs to build and manage generational wealth.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4 text-white font-semibold"
            style={{ backgroundColor: '#FFB500' }}
            onClick={scrollToPricing}
          >
            Get Started Today
          </Button>
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 text-sm text-muted-foreground">
          <div className="flex space-x-6 mb-4 md:mb-0">
            <a href="/help" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="/help" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="/help" className="hover:text-foreground transition-colors">Cookie Policy</a>
          </div>
          <p>© 2024 TruHeirs by The Fampreneurs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}