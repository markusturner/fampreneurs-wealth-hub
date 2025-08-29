import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DemoModal = ({ isOpen, onClose }: DemoModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-foreground">
            TruHeirs Platform Demo
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-6 pt-0">
          <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
            {/* Demo Video Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                  <Play className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Interactive Demo Coming Soon
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Experience how TruHeirs helps families build generational wealth with our comprehensive family office platform.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button 
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => {
                      onClose()
                      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      onClose()
                      window.open('mailto:demo@truheirs.com?subject=Schedule Personal Demo', '_blank')
                    }}
                  >
                    Schedule Personal Demo
                  </Button>
                </div>
              </div>
            </div>
            
            {/* In a real implementation, you would embed a video here */}
            {/* <iframe 
              src="your-demo-video-url" 
              className="w-full h-full"
              allowFullScreen
              title="TruHeirs Platform Demo"
            /> */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
