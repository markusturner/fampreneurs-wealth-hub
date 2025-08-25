import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react';
export const Footer = () => {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 md:mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{
              backgroundColor: '#290A52'
            }}>
                T
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{
                color: '#ffb500'
              }}>TruHeirs</h3>
                <p className="text-xs text-muted-foreground">TruHeirs</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The complete DIY AI family office platform designed for busy professionals and entrepreneurs building generational wealth.
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" style={{
              backgroundColor: 'rgba(41, 10, 82, 0.1)'
            }}>
                <Facebook className="w-4 h-4" style={{
                color: '#1877F2'
              }} />
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" style={{
              backgroundColor: 'rgba(41, 10, 82, 0.1)'
            }}>
                <Twitter className="w-4 h-4" style={{
                color: '#1DA1F2'
              }} />
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" style={{
              backgroundColor: 'rgba(41, 10, 82, 0.1)'
            }}>
                <Linkedin className="w-4 h-4" style={{
                color: '#0A66C2'
              }} />
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" style={{
              backgroundColor: 'rgba(41, 10, 82, 0.1)'
            }}>
                <Instagram className="w-4 h-4" style={{
                color: '#E4405F'
              }} />
              </div>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold mb-4" style={{
            color: '#ffb500'
          }}>Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">API Documentation</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4" style={{
            color: '#ffb500'
          }}>Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Webinars</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Case Studies</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4" style={{
            color: '#ffb500'
          }}>Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2" style={{
                color: '#FFB500'
              }} />
                <span>support@truheirs.com</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2" style={{
                color: '#FFB500'
              }} />
                <span>1-800-TRU-HEIR</span>
              </li>
              <li className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5" style={{
                color: '#FFB500'
              }} />
                <span>123 Wealth St.<br />Financial District<br />New York, NY 10001</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-8 md:py-12 border-t border-b border-border">
          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4" style={{
          color: '#2eb2ff'
        }}>
            Ready to Start Building Your Family Legacy?
          </h3>
          <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join hundreds of families who are already using TruHeirs to build and manage generational wealth.
          </p>
          <Button size="lg" className="text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-semibold" style={{
          backgroundColor: '#FFB500',
          color: '#290a52'
        }} onClick={scrollToPricing}>
            Get Started Today
          </Button>
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-6 md:pt-8 text-xs md:text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center md:justify-start space-x-4 md:space-x-6 mb-4 md:mb-0">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a>
          </div>
          <p className="text-center md:text-left">© 2024 TruHeirs by The Fampreneurs VNCI, LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>;
};