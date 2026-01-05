import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: string;
  category: string;
  order_index: number;
}

// Default tutorial videos if none in database
const defaultVideos: TutorialVideo[] = [
  {
    id: "1",
    title: "Getting Started with TruHeirs",
    description: "Learn the basics of navigating your family wealth management platform.",
    video_url: "",
    duration: "5 min",
    category: "Getting Started",
    order_index: 1,
  },
  {
    id: "2",
    title: "Setting Up Your Family Constitution",
    description: "Step-by-step guide to creating your family's governance documents.",
    video_url: "",
    duration: "8 min",
    category: "Documents",
    order_index: 2,
  },
  {
    id: "3",
    title: "Managing Family Members",
    description: "How to add, edit, and manage family member profiles and permissions.",
    video_url: "",
    duration: "6 min",
    category: "Members",
    order_index: 3,
  },
  {
    id: "4",
    title: "Using the Family Calendar",
    description: "Schedule and manage family meetings, events, and important dates.",
    video_url: "",
    duration: "4 min",
    category: "Calendar",
    order_index: 4,
  },
];

export default function TutorialVideos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videos, setVideos] = useState<TutorialVideo[]>(defaultVideos);
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [mainTutorialUrl, setMainTutorialUrl] = useState("");

  useEffect(() => {
    fetchMainTutorialVideo();
    loadWatchedVideos();
  }, [user]);

  const fetchMainTutorialVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("tutorial_video_url")
        .single();

      if (!error && data?.tutorial_video_url) {
        setMainTutorialUrl(data.tutorial_video_url);
        // Update the first video with the main tutorial URL
        setVideos(prev => prev.map((v, i) => 
          i === 0 ? { ...v, video_url: data.tutorial_video_url } : v
        ));
      }
    } catch (error) {
      console.error("Error fetching tutorial video:", error);
    }
  };

  const loadWatchedVideos = () => {
    if (user) {
      const watched = localStorage.getItem(`watched_tutorials_${user.id}`);
      if (watched) {
        setWatchedVideos(new Set(JSON.parse(watched)));
      }
    }
  };

  const markAsWatched = (videoId: string) => {
    if (user) {
      const newWatched = new Set(watchedVideos);
      newWatched.add(videoId);
      setWatchedVideos(newWatched);
      localStorage.setItem(`watched_tutorials_${user.id}`, JSON.stringify([...newWatched]));
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

  const categories = [...new Set(videos.map(v => v.category))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-4 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Tutorial Videos</h1>
            <p className="text-xs text-muted-foreground">Learn how to use TruHeirs</p>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-6xl mx-auto">
        {/* Video Player Section */}
        {selectedVideo ? (
          <div className="mb-8">
            <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden mb-4">
              {selectedVideo.video_url ? (
                <iframe
                  src={getEmbedUrl(selectedVideo.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => markAsWatched(selectedVideo.id)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Video coming soon</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">{selectedVideo.title}</h2>
                <p className="text-muted-foreground">{selectedVideo.description}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                {selectedVideo.duration}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-8 bg-muted/50 rounded-xl text-center">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Tutorial</h2>
            <p className="text-muted-foreground">Choose a video below to start learning</p>
          </div>
        )}

        {/* Video Grid by Category */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-semibold mb-4">{category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos
                .filter(v => v.category === category)
                .sort((a, b) => a.order_index - b.order_index)
                .map(video => (
                  <Card
                    key={video.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedVideo?.id === video.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedVideo(video)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        {video.video_url ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <Play className="h-10 w-10 text-white z-10" />
                          </>
                        ) : (
                          <Play className="h-10 w-10 text-muted-foreground" />
                        )}
                        {watchedVideos.has(video.id) && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium mb-1 line-clamp-1">{video.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {video.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {video.duration}
                        </Badge>
                        {watchedVideos.has(video.id) && (
                          <span className="text-xs text-green-600">Watched</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}

        {/* Progress Summary */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Your Progress</h3>
              <p className="text-sm text-muted-foreground">
                {watchedVideos.size} of {videos.length} tutorials completed
              </p>
            </div>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(watchedVideos.size / videos.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
