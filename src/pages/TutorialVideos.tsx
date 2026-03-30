import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Clock, CheckCircle2, Plus, Pencil, Trash2, Save, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOwnerRole } from "@/hooks/useOwnerRole";
import { useToast } from "@/hooks/use-toast";

interface TutorialVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration: string | null;
  category: string;
  order_index: number;
  is_active: boolean;
}

const defaultCategories = ["Getting Started", "Documents", "Members", "Calendar", "Investments", "Advanced"];

export default function TutorialVideos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { isOwner } = useOwnerRole(user?.id || null);
  const { toast } = useToast();
  
  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TutorialVideo | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    duration: "5 min",
    category: "Getting Started",
    order_index: 0,
  });

  // Category management state
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryMode, setCategoryMode] = useState<"list" | "edit" | "add">("list");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const canManage = isAdmin || isOwner;

  useEffect(() => {
    fetchVideos();
    loadWatchedVideos();
    loadCustomCategories();
  }, [user]);

  const loadCustomCategories = () => {
    const saved = localStorage.getItem("tutorial_custom_categories");
    if (saved) {
      setCustomCategories(JSON.parse(saved));
    }
    const deleted = localStorage.getItem("tutorial_deleted_categories");
    if (deleted) {
      setDeletedCategories(JSON.parse(deleted));
    }
  };

  const saveCustomCategories = (cats: string[]) => {
    localStorage.setItem("tutorial_custom_categories", JSON.stringify(cats));
    setCustomCategories(cats);
  };

  const saveDeletedCategories = (cats: string[]) => {
    localStorage.setItem("tutorial_deleted_categories", JSON.stringify(cats));
    setDeletedCategories(cats);
  };

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tutorial_videos")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoading(false);
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

    // Tella.tv
    if (url.includes("tella.tv")) {
      const tellaMatch = url.match(/tella\.tv\/video\/([a-zA-Z0-9_-]+)/);
      if (tellaMatch) return `https://www.tella.tv/video/${tellaMatch[1]}/embed`;
    }

    return url;
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const openAddDialog = () => {
    setEditingVideo(null);
    setFormData({
      title: "",
      description: "",
      video_url: "",
      duration: "5 min",
      category: "Getting Started",
      order_index: videos.length,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (video: TutorialVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || "",
      video_url: video.video_url,
      duration: video.duration || "5 min",
      category: video.category,
      order_index: video.order_index,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.video_url) {
      toast({
        title: "Error",
        description: "Title and video URL are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingVideo) {
        const { error } = await supabase
          .from("tutorial_videos")
          .update({
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url,
            duration: formData.duration,
            category: formData.category,
            order_index: formData.order_index,
          })
          .eq("id", editingVideo.id);

        if (error) throw error;
        toast({ title: "Video updated successfully" });
      } else {
        const { error } = await supabase
          .from("tutorial_videos")
          .insert({
            title: formData.title,
            description: formData.description || null,
            video_url: formData.video_url,
            duration: formData.duration,
            category: formData.category,
            order_index: formData.order_index,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: "Video added successfully" });
      }

      setIsDialogOpen(false);
      fetchVideos();
    } catch (error: any) {
      console.error("Error saving video:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save video",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (video: TutorialVideo) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("tutorial_videos")
        .delete()
        .eq("id", video.id);

      if (error) throw error;
      toast({ title: "Video deleted successfully" });
      if (selectedVideo?.id === video.id) {
        setSelectedVideo(null);
      }
      fetchVideos();
    } catch (error: any) {
      console.error("Error deleting video:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const openCategoryDialog = (category?: string) => {
    if (category) {
      setEditingCategory(category);
      setNewCategoryName(category);
      setCategoryMode("edit");
    } else {
      setEditingCategory(null);
      setNewCategoryName("");
      setCategoryMode("list");
    }
    setIsCategoryDialogOpen(true);
  };

  const startAddCategory = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setCategoryMode("add");
  };

  const startEditCategory = (category: string) => {
    setEditingCategory(category);
    setNewCategoryName(category);
    setCategoryMode("edit");
  };

  const backToList = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setCategoryMode("list");
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (editingCategory) {
      // Rename category - update all videos with this category
      try {
        const { error } = await supabase
          .from("tutorial_videos")
          .update({ category: newCategoryName.trim() })
          .eq("category", editingCategory);

        if (error) throw error;

        // Update custom categories if it was a custom one
        if (customCategories.includes(editingCategory)) {
          const updated = customCategories.map(c => 
            c === editingCategory ? newCategoryName.trim() : c
          );
          saveCustomCategories(updated);
        } else if (!defaultCategories.includes(newCategoryName.trim())) {
          // If renaming default to custom, add to custom list
          saveCustomCategories([...customCategories, newCategoryName.trim()]);
        }

        toast({ title: "Category renamed successfully" });
        fetchVideos();
        backToList();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to rename category",
          variant: "destructive",
        });
      }
    } else {
      // Add new category
      if (!customCategories.includes(newCategoryName.trim()) && 
          !defaultCategories.includes(newCategoryName.trim())) {
        saveCustomCategories([...customCategories, newCategoryName.trim()]);
        toast({ title: "Category added successfully" });
        backToList();
      } else {
        toast({
          title: "Error",
          description: "Category already exists",
          variant: "destructive",
        });
        return;
      }
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const videosInCategory = videos.filter(v => v.category === category);
    if (videosInCategory.length > 0) {
      if (!confirm(`This category contains ${videosInCategory.length} video(s). Delete all videos in this category?`)) {
        return;
      }
      // Delete all videos in this category
      try {
        const { error } = await supabase
          .from("tutorial_videos")
          .delete()
          .eq("category", category);
        
        if (error) throw error;
        toast({ title: "Videos deleted successfully" });
        fetchVideos();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete videos",
          variant: "destructive",
        });
        return;
      }
    }

    // Remove from custom categories if it exists there
    if (customCategories.includes(category)) {
      const updated = customCategories.filter(c => c !== category);
      saveCustomCategories(updated);
    }
    
    // Track deleted default categories
    if (defaultCategories.includes(category) && !deletedCategories.includes(category)) {
      saveDeletedCategories([...deletedCategories, category]);
    }
    
    toast({ title: "Category deleted successfully" });
  };

  // Filter out deleted default categories, but keep them if they have videos
  const activeDefaultCategories = defaultCategories.filter(cat => 
    !deletedCategories.includes(cat) || videos.some(v => v.category === cat)
  );
  const allCategories = [...new Set([...activeDefaultCategories, ...customCategories, ...videos.map(v => v.category)])];
  const categories = allCategories.filter(cat => 
    videos.some(v => v.category === cat) || customCategories.includes(cat) || activeDefaultCategories.includes(cat)
  );
  const groupedVideos = categories.reduce((acc, cat) => {
    const catVideos = videos.filter(v => v.category === cat);
    if (catVideos.length > 0) {
      acc[cat] = catVideos;
    }
    return acc;
  }, {} as Record<string, TutorialVideo[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Tutorial Videos</h1>
              <p className="text-xs text-muted-foreground">Learn how to use TruHeirs</p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button onClick={() => openCategoryDialog()} variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Categories
              </Button>
              <Button onClick={openAddDialog} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Video
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container px-4 py-6 max-w-6xl mx-auto">
        {/* Video Player Section */}
        {selectedVideo ? (
          <div className="mb-8">
            <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden mb-4">
              <iframe
                src={getEmbedUrl(selectedVideo.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => markAsWatched(selectedVideo.id)}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">{selectedVideo.title}</h2>
                <p className="text-muted-foreground">{selectedVideo.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedVideo.duration}
                </Badge>
                {canManage && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(selectedVideo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(selectedVideo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-8 bg-muted/50 rounded-xl text-center">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {videos.length === 0 ? "No Tutorials Yet" : "Select a Tutorial"}
            </h2>
            <p className="text-muted-foreground">
              {videos.length === 0 && canManage
                ? "Click 'Add Video' to create your first tutorial"
                : videos.length === 0
                ? "Tutorials coming soon"
                : "Choose a video below to start learning"}
            </p>
          </div>
        )}

        {/* Video Grid by Category */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tutorials...</p>
          </div>
        ) : (
          Object.entries(groupedVideos).map(([category, catVideos]) => (
            <div key={category} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">{category}</h3>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openCategoryDialog(category)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catVideos
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(video => (
                    <Card
                      key={video.id}
                      className={`cursor-pointer transition-all hover:shadow-md group ${
                        selectedVideo?.id === video.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedVideo(video)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <Play className="h-10 w-10 text-white z-10 group-hover:scale-110 transition-transform" />
                          {watchedVideos.has(video.id) && (
                            <div className="absolute top-2 right-2 z-10">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                          )}
                          {canManage && (
                            <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(video);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(video);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
          ))
        )}

        {/* Progress Summary */}
        {videos.length > 0 && (
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
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVideo ? "Edit Tutorial Video" : "Add Tutorial Video"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Getting Started with TruHeirs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_url">Video URL *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... or Loom/Vimeo URL"
              />
              <p className="text-xs text-muted-foreground">
                Supports YouTube, Loom, Vimeo, and Tella.tv links
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of what this tutorial covers..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="5 min"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Order Index</Label>
              <Input
                id="order"
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first within each category
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {editingVideo ? "Update" : "Add"} Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryMode === "list" && "Manage Categories"}
              {categoryMode === "edit" && "Rename Category"}
              {categoryMode === "add" && "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          
          {categoryMode === "list" ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                {allCategories.map((cat) => {
                  const videoCount = videos.filter(v => v.category === cat).length;
                  return (
                    <div 
                      key={cat} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div>
                        <span className="font-medium">{cat}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({videoCount} video{videoCount !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditCategory(cat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCategory(cat)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {allCategories.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No categories yet
                  </p>
                )}
              </div>
              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={startAddCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category_name">Category Name</Label>
                <Input
                  id="category_name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={backToList}>
                  Back
                </Button>
                <Button onClick={handleSaveCategory}>
                  <Save className="h-4 w-4 mr-2" />
                  {categoryMode === "edit" ? "Rename" : "Add"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
