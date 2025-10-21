import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface TutorialVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatched: () => void;
  onSkipped: () => void;
  userId: string;
}

export const TutorialVideoModal = ({ isOpen, onClose, onWatched, onSkipped, userId }: TutorialVideoModalProps) => {
  const [videoUrl, setVideoUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchTutorialVideo();
    }
  }, [isOpen]);

  const fetchTutorialVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("tutorial_video_url")
        .single();

      if (error) throw error;
      if (data?.tutorial_video_url) {
        setVideoUrl(getEmbedUrl(data.tutorial_video_url));
      }
    } catch (error) {
      console.error("Error fetching tutorial video:", error);
    }
  };

  const getEmbedUrl = (url: string): string => {
    if (!url) return "";

    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1]).get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Loom
    if (url.includes("loom.com")) {
      const loomId = url.split("loom.com/share/")[1]?.split("?")[0];
      return `https://www.loom.com/embed/${loomId}`;
    }

    // Vimeo
    if (url.includes("vimeo.com")) {
      const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${vimeoId}`;
    }

    return url;
  };

  const handleSkip = async () => {
    onSkipped();
    onClose();
    toast({
      title: "Tutorial skipped",
      description: "You can watch the tutorial from your notifications anytime.",
    });
  };

  const handleModalClose = () => {
    // When they close via X or clicking outside, treat it as skipped
    onSkipped();
    onClose();
  };

  const handleWatched = () => {
    onWatched();
    onClose();
    toast({
      title: "Great!",
      description: "Welcome to the platform. Let's get started!",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome to TruHeirs!</DialogTitle>
          <DialogDescription>
            Watch this quick tutorial to get started with your family wealth management platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {videoUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={videoUrl}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">No tutorial video available yet.</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip for Now
          </Button>
          <Button onClick={handleWatched}>
            I Watched It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
