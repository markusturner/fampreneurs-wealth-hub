import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { openExternalLink, socialLinks } from '@/utils/navigation';
export const Footer = () => {
  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 md:mb-12 mx-auto max-w-4xl justify-items-center sm:justify-items-start">
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
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                onClick={() => openExternalLink(socialLinks.facebook)}
              >
                <Facebook className="w-4 h-4" style={{ color: '#1877F2' }} />
              </div>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                onClick={() => openExternalLink(socialLinks.twitter)}
              >
                <Twitter className="w-4 h-4" style={{ color: '#1DA1F2' }} />
              </div>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                onClick={() => openExternalLink(socialLinks.linkedin)}
              >
                <Linkedin className="w-4 h-4" style={{ color: '#0A66C2' }} />
              </div>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer" 
                style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}
                onClick={() => openExternalLink(socialLinks.instagram)}
              >
                <Instagram className="w-4 h-4" style={{ color: '#E4405F' }} />
              </div>
            </div>
          </div>



          {/* Contact */}
          <div className="ml-16 max-w-xs">
            <h4 className="font-semibold mb-4" style={{
            color: '#ffb500'
          }}>Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2" style={{
                color: '#FFB500'
              }} />
                <span>info@fampreneurs.com</span>
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
                <span>1650 Marietta Boulevard NW Unit D58<br />Atlanta, GA 30318</span>
              </li>
            </ul>
          </div>
        </div>


        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-6 md:pt-8 text-xs md:text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center md:justify-start space-x-4 md:space-x-6 mb-4 md:mb-0">
            <a href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</a>
          </div>
          <p className="text-center md:text-left">© 2024 TruHeirs by VNCI, LLC Powered by The Fampreneurs. All rights reserved.</p>
        </div>
      </div>
    </footer>;
};