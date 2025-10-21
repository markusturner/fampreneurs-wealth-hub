import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Video, Upload, Link as LinkIcon } from "lucide-react";

export const AdminTutorialVideoManager = () => {
  const [videoUrl, setVideoUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentVideo();
  }, []);

  const fetchCurrentVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("tutorial_video_url")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.tutorial_video_url) {
        setCurrentUrl(data.tutorial_video_url);
        setVideoUrl(data.tutorial_video_url);
      }
    } catch (error) {
      console.error("Error fetching tutorial video:", error);
    }
  };

  const handleUrlSave = async () => {
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ 
          id: 1,
          tutorial_video_url: videoUrl,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setCurrentUrl(videoUrl);
      toast({
        title: "Success",
        description: "Tutorial video URL updated successfully.",
      });
    } catch (error) {
      console.error("Error saving video URL:", error);
      toast({
        title: "Error",
        description: "Failed to save video URL.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please upload a video file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `tutorial-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("tutorial-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("tutorial-videos")
        .getPublicUrl(fileName);

      await supabase
        .from("app_settings")
        .upsert({ 
          id: 1,
          tutorial_video_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      setCurrentUrl(publicUrl);
      setVideoUrl(publicUrl);

      toast({
        title: "Success",
        description: "Tutorial video uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Error",
        description: "Failed to upload video.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getEmbedUrl = (url: string): string => {
    if (!url) return "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1]).get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.includes("loom.com")) {
      const loomId = url.split("loom.com/share/")[1]?.split("?")[0];
      return `https://www.loom.com/embed/${loomId}`;
    }

    if (url.includes("vimeo.com")) {
      const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${vimeoId}`;
    }

    return url;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Tutorial Video Manager
        </CardTitle>
        <CardDescription>
          Manage the welcome tutorial video that appears for new users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <LinkIcon className="h-4 w-4 mr-2" />
              Video URL
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (YouTube, Loom, Vimeo)</Label>
              <Input
                id="videoUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleUrlSave}>Save URL</Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoFile">Upload Video File</Label>
              <Input
                id="videoFile"
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>
            {isUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
          </TabsContent>
        </Tabs>

        {currentUrl && (
          <div className="space-y-2">
            <Label>Current Tutorial Video</Label>
            <div className="aspect-video w-full">
              {currentUrl.startsWith("http") && (currentUrl.includes("youtube") || currentUrl.includes("loom") || currentUrl.includes("vimeo")) ? (
                <iframe
                  src={getEmbedUrl(currentUrl)}
                  className="w-full h-full rounded-lg border"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={currentUrl}
                  controls
                  className="w-full h-full rounded-lg border"
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
