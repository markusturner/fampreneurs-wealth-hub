import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Crown, Users, MessageCircle, Image, TreePine, Lock, Scroll, Building2, Scale, Shield, GraduationCap, ArrowLeft, Heart, FileText, Video, Settings, Eye, EyeOff, CheckCircle, Key, Edit, Trash2, FileCheck, Loader2, UserPlus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NavHeader } from "@/components/dashboard/nav-header";
import { FamilySecretCodesAdmin } from "@/components/dashboard/family-secret-codes-admin";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FamilyTreeVisualization } from "@/components/family-tree/FamilyTreeVisualization";
import { FamilyTreeTextInput } from "@/components/family-tree/FamilyTreeTextInput";
import { DynamicFamilyTreeVisualization } from "@/components/family-tree/DynamicFamilyTreeVisualization";
import { FamilyDocumentsTab } from "@/components/dashboard/family-documents-tab";
const familyEducationModules = [{
  title: "Family Business Education",
  description: "Learn the fundamentals of running a successful family business",
  icon: Building2,
  status: "Available",
  lessons: 12,
  duration: "3 hours",
  color: "text-blue-600"
}, {
  title: "Family Constitution",
  description: "Understanding and implementing your family's core values and principles",
  icon: Scroll,
  status: "Available",
  lessons: 8,
  duration: "2 hours",
  color: "text-amber-600"
}, {
  title: "Wealth Management",
  description: "Strategic approaches to preserving and growing family wealth",
  icon: Crown,
  status: "Available",
  lessons: 15,
  duration: "4 hours",
  color: "text-purple-600"
}, {
  title: "Next Generation Leadership",
  description: "Preparing future leaders for family business success",
  icon: Users,
  status: "Available",
  lessons: 10,
  duration: "3 hours",
  color: "text-green-600"
}];
const heritageResources = [{
  title: "Legal Documents",
  description: "Important family documents and legal papers",
  icon: FileText,
  category: "Documents",
  color: "text-slate-600"
}, {
  title: "Family Tree Interactive",
  description: "Visualize your family connections",
  icon: TreePine,
  category: "Genealogy",
  color: "text-emerald-600"
}, {
  title: "Family Governance",
  description: "Governance policies and family charter docs",
  icon: Scale,
  category: "Governance",
  color: "text-indigo-600"
}];
const businessCourses = [{
  title: "Family Business Fundamentals",
  instructor: "Dr. Sarah Johnson",
  duration: "4 weeks",
  description: "Essential principles for successful family business management",
  status: "published",
  videos: ["https://youtu.be/example1", "https://youtu.be/example2"],
  modules: [{
    name: "Introduction to Family Business",
    duration: "45 minutes"
  }, {
    name: "Governance Structures",
    duration: "60 minutes"
  }, {
    name: "Succession Planning",
    duration: "75 minutes"
  }]
}, {
  title: "Wealth Preservation Strategies",
  instructor: "Michael Thompson",
  duration: "6 weeks",
  description: "Advanced strategies for multi-generational wealth management",
  status: "published",
  videos: ["https://youtu.be/example3", "https://youtu.be/example4"],
  modules: [{
    name: "Asset Protection",
    duration: "50 minutes"
  }, {
    name: "Tax Optimization",
    duration: "65 minutes"
  }, {
    name: "Estate Planning",
    duration: "80 minutes"
  }]
}, {
  title: "Next-Gen Leadership Development",
  instructor: "Jennifer Lee",
  duration: "8 weeks",
  description: "Developing the next generation of family business leaders",
  status: "draft",
  videos: ["https://youtu.be/example5", "https://youtu.be/example6"],
  modules: [{
    name: "Leadership Fundamentals",
    duration: "40 minutes"
  }, {
    name: "Communication Skills",
    duration: "55 minutes"
  }, {
    name: "Decision Making",
    duration: "70 minutes"
  }]
}];
export default function Documents() {
  const navigate = useNavigate();
  const {
    user,
    profile
  } = useAuth();
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [availableCodes, setAvailableCodes] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  const [showCoursesDialog, setShowCoursesDialog] = useState(false);
  const [showFamilyTreeDialog, setShowFamilyTreeDialog] = useState(false);
  const [showConstitutionDialog, setShowConstitutionDialog] = useState(false);
  const [familyData, setFamilyData] = useState<any[]>([]);
  const [familyTreeInput, setFamilyTreeInput] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showCreateCourseDialog, setShowCreateCourseDialog] = useState(false);
  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    instructor: '',
    duration: '',
    description: '',
    status: 'draft'
  });
  const [videoUrls, setVideoUrls] = useState<string[]>(['']);
  const [courseModules, setCourseModules] = useState<Array<{
    name: string;
    duration: string;
  }>>([{
    name: '',
    duration: ''
  }]);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showFamilyDocuments, setShowFamilyDocuments] = useState(false);
  // Family Secret Code states
  const [familyCodeInput, setFamilyCodeInput] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [validatedCodeResult, setValidatedCodeResult] = useState<any>(null);

  // Family Values, Vision & Mission states
  const [coreValues, setCoreValues] = useState('');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [isEditingValues, setIsEditingValues] = useState(false);
  const [isSavingValues, setIsSavingValues] = useState(false);

  // Family Code Creation states
  const [codeDescription, setCodeDescription] = useState('');
  const [codeAccessLevel, setCodeAccessLevel] = useState('');
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const isAdmin = profile?.is_admin || false;
  useEffect(() => {
    if (user && isAdmin) {
      fetchAvailableCodes();
    }
    loadFamilyValues();
  }, [user, isAdmin]);
  const fetchAvailableCodes = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('family_secret_codes').select('*').eq('is_active', true);
      if (error) throw error;
      setAvailableCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  };

  const loadFamilyValues = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('family_governance_policies')
        .select('*')
        .eq('user_id', user.id)
        .eq('policy_type', 'family_values')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading family values:', error);
        return;
      }

      if (data) {
        const values = JSON.parse(data.description || '{}');
        setCoreValues(values.coreValues || '');
        setVision(values.vision || '');
        setMission(values.mission || '');
      }
    } catch (error) {
      console.error('Error loading family values:', error);
    }
  };

  const saveFamilyValues = async () => {
    if (!user?.id) return;
    
    setIsSavingValues(true);
    try {
      const valuesData = {
        coreValues,
        vision,
        mission
      };

      const { error } = await supabase
        .from('family_governance_policies')
        .upsert({
          user_id: user.id,
          title: 'Family Values & Mission',
          description: JSON.stringify(valuesData),
          policy_type: 'family_values',
          status: 'active'
        });

      if (error) throw error;

      toast.success('Family values saved successfully!');
      setIsEditingValues(false);
    } catch (error) {
      console.error('Error saving family values:', error);
      toast.error('Failed to save family values');
    } finally {
      setIsSavingValues(false);
    }
  };
  const handleHeritageResource = (resourceTitle: string) => {
    const accessLevel = userAccess.find(access => access === 'trust' && resourceTitle.includes('Legacy') || access === 'legacy' && resourceTitle.includes('Family') || access === 'admin');
    if (resourceTitle === "Family Tree Interactive") {
      setShowFamilyTreeDialog(true);
    } else if (resourceTitle === "Family Governance") {
      navigate('/family-governance');
    } else if (resourceTitle === "Family History Archive") {
      if (accessLevel) {
        alert("🏛️ TRUST ACCESS GRANTED - Accessing Family History Archive...");
      } else {
        alert("🔒 This resource requires Trust-level access. Please enter the family trust code to continue.");
      }
    } else {
      const messages = {
        "Legal Documents": "📄 Accessing secure legal documents...",
        "Family Tree Interactive": "🌳 Opening interactive family tree..."
      };
      alert(messages[resourceTitle as keyof typeof messages] || "Opening resource...");
    }
  };
  const handleEnterAccessCode = async () => {
    if (!accessCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('validate-family-code', {
        body: {
          code: accessCode.toUpperCase().trim(),
          ip_address: null,
          user_agent: navigator.userAgent
        }
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        setUserAccess(prev => [...prev, result.access_level]);
        setShowCodeDialog(false);
        setAccessCode('');

        // Show access granted content based on level
        switch (result.access_level) {
          case 'trust':
            alert(`🏛️ TRUST ACCESS GRANTED\n\n${result.description}\n\nYou now have access to:\n• Trust documents\n• Financial statements\n• Legal agreements\n• Investment portfolios`);
            break;
          case 'legacy':
            alert(`👑 LEGACY ACCESS GRANTED\n\n${result.description}\n\nYou now have access to:\n• Family legacy meetings\n• Historical documents\n• Succession planning\n• Leadership councils`);
            break;
          case 'admin':
            alert(`🔧 ADMIN ACCESS GRANTED\n\n${result.description}\n\nYou now have full administrative access to all family office resources.`);
            break;
          default:
            alert(`✅ ACCESS GRANTED\n\n${result.description}`);
        }
      } else {
        toast.error(result.message || 'Invalid access code');
      }
    } catch (error) {
      console.error('Error validating code:', error);
      toast.error('Failed to validate access code');
    }
  };
  const createFamilyCode = async () => {
    if (!codeDescription.trim() || !codeAccessLevel) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsCreatingCode(true);
    try {
      // Generate a random code
      const randomCode = `FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${new Date().getFullYear()}`;

      // Here you would typically call an edge function to save the code to the database
      // For now, we'll just simulate the creation
      setTimeout(() => {
        setCreatedCode(randomCode);
        toast.success('Family code created successfully!');
        setCodeDescription('');
        setCodeAccessLevel('');
        setIsCreatingCode(false);
      }, 1000);
    } catch (error) {
      console.error('Error creating family code:', error);
      toast.error('Failed to create family code');
      setIsCreatingCode(false);
    }
  };
  const validateFamilyCode = async () => {
    if (!familyCodeInput.trim()) {
      toast.error('Please enter a family secret code');
      return;
    }
    setIsValidatingCode(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('validate-family-code', {
        body: {
          code: familyCodeInput.trim(),
          ip_address: null,
          user_agent: navigator.userAgent
        }
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        setValidatedCodeResult(result);
        setUserAccess(prev => [...prev, result.access_level]);
        toast.success(`Access granted! Level: ${result.access_level}`);
        setFamilyCodeInput('');
      } else {
        toast.error(result.message || 'Invalid family secret code');
        setValidatedCodeResult(null);
      }
    } catch (error) {
      console.error('Error validating code:', error);
      toast.error('Failed to validate family secret code');
      setValidatedCodeResult(null);
    } finally {
      setIsValidatingCode(false);
    }
  };
  const generateFamilyTree = () => {
    if (!familyTreeInput.trim()) {
      toast.error('Please enter family information first');
      return;
    }
    try {
      const lines = familyTreeInput.split('\n').filter(line => line.trim());
      const members: any[] = [];
      lines.forEach((line, index) => {
        const name = line.trim();
        if (name) {
          members.push({
            id: `member-${index}`,
            name: name,
            generation: Math.floor(index / 3),
            // Simple generation assignment
            parents: index > 0 ? [lines[Math.max(0, index - 1)].trim()] : [],
            children: index < lines.length - 1 ? [lines[index + 1].trim()] : []
          });
        }
      });
      setFamilyData(members);
      toast.success('Family tree generated successfully!');
    } catch (error) {
      console.error('Error generating family tree:', error);
      toast.error('Failed to generate family tree');
    }
  };
  const addVideoUrl = () => {
    setVideoUrls([...videoUrls, '']);
  };
  const updateVideoUrl = (index: number, url: string) => {
    const updated = [...videoUrls];
    updated[index] = url;
    setVideoUrls(updated);
  };
  const removeVideoUrl = (index: number) => {
    if (videoUrls.length > 1) {
      setVideoUrls(videoUrls.filter((_, i) => i !== index));
    }
  };
  const addModule = () => {
    setCourseModules([...courseModules, {
      name: '',
      duration: ''
    }]);
  };
  const updateModule = (index: number, field: 'name' | 'duration', value: string) => {
    const updated = [...courseModules];
    updated[index][field] = value;
    setCourseModules(updated);
  };
  const removeModule = (index: number) => {
    if (courseModules.length > 1) {
      setCourseModules(courseModules.filter((_, i) => i !== index));
    }
  };
  const handleCreateCourse = () => {
    if (!newCourse.title || !newCourse.instructor) {
      toast.error('Please fill in the required fields');
      return;
    }
    const course = {
      ...newCourse,
      videos: videoUrls.filter(url => url.trim()),
      modules: courseModules.filter(module => module.name.trim())
    };
    businessCourses.push(course);
    setNewCourse({
      title: '',
      instructor: '',
      duration: '',
      description: '',
      status: 'draft'
    });
    setVideoUrls(['']);
    setCourseModules([{
      name: '',
      duration: ''
    }]);
    setShowCreateCourseDialog(false);
    toast.success('Course created successfully!');
  };
  const handleEditCourse = (index: number) => {
    const course = businessCourses[index];
    setNewCourse({
      title: course.title,
      instructor: course.instructor,
      duration: course.duration,
      description: course.description,
      status: course.status
    });
    setVideoUrls(course.videos?.length ? course.videos : ['']);
    setCourseModules(course.modules?.length ? course.modules : [{
      name: '',
      duration: ''
    }]);
    setEditingCourseIndex(index);
    setShowEditCourseDialog(true);
  };
  const handleUpdateCourse = () => {
    if (!newCourse.title || !newCourse.instructor || editingCourseIndex === null) {
      toast.error('Please fill in the required fields');
      return;
    }
    const updatedCourse = {
      ...newCourse,
      videos: videoUrls.filter(url => url.trim()),
      modules: courseModules.filter(module => module.name.trim())
    };
    businessCourses[editingCourseIndex] = updatedCourse;
    setNewCourse({
      title: '',
      instructor: '',
      duration: '',
      description: '',
      status: 'draft'
    });
    setVideoUrls(['']);
    setCourseModules([{
      name: '',
      duration: ''
    }]);
    setEditingCourseIndex(null);
    setShowEditCourseDialog(false);
    toast.success('Course updated successfully!');
  };
  const handleDeleteCourse = (index: number) => {
    businessCourses.splice(index, 1);
    toast.success('Course deleted successfully!');
  };
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const message = {
      id: Date.now().toString(),
      content: newMessage,
      sender_id: user?.id,
      sender_name: profile?.display_name || 'You',
      created_at: new Date().toISOString()
    };
    setMessages([...messages, message]);
    setNewMessage('');
    toast.success('Message sent!');
  };
  return <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">

        {/* Family Office Documents Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Family Roundtable Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground px-2 sm:px-0">Access important family documents, educational resources, and secure information</p>
        </div>

        {/* Core Values, Vision & Mission */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                Core Values, Vision & Mission
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Define and preserve your family's fundamental principles and aspirations
              </p>
            </div>
            
            <Button 
              variant={isEditingValues ? "default" : "outline"} 
              size="sm" 
              className="w-full sm:w-auto"
              onClick={() => {
                if (isEditingValues) {
                  saveFamilyValues();
                } else {
                  setIsEditingValues(true);
                }
              }}
              disabled={isSavingValues}
            >
              {isSavingValues ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isEditingValues ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">
                {isSavingValues ? 'Saving...' : isEditingValues ? 'Save Changes' : 'Edit Values'}
              </span>
              <span className="sm:hidden">
                {isSavingValues ? 'Saving...' : isEditingValues ? 'Save' : 'Edit'}
              </span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Core Values */}
            <Card className="min-h-[200px]">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Core Values
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  The fundamental beliefs that guide your family
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingValues ? (
                  <textarea
                    value={coreValues}
                    onChange={(e) => setCoreValues(e.target.value)}
                    placeholder="Enter your family's core values..."
                    className="w-full h-24 p-2 text-sm border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {coreValues || (
                      <span className="italic">Click Edit to add your family's core values</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vision */}
            <Card className="min-h-[200px]">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-600" />
                  Vision
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your family's aspirational future
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingValues ? (
                  <textarea
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    placeholder="Describe your family's vision for the future..."
                    className="w-full h-24 p-2 text-sm border rounded-md resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {vision || (
                      <span className="italic">Click Edit to add your family's vision</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mission */}
            <Card className="min-h-[200px]">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Mission
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your family's purpose and commitment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingValues ? (
                  <textarea
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    placeholder="Define your family's mission and purpose..."
                    className="w-full h-24 p-2 text-sm border rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                ) : (
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {mission || (
                      <span className="italic">Click Edit to add your family's mission</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Family Business Education Modules */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                Family Business Education
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Comprehensive learning modules for family business management and wealth preservation
              </p>
            </div>
            
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowCoursesDialog(true)}>
              <Video className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">View All Courses</span>
              <span className="sm:hidden">All Courses</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {businessCourses.filter(course => course.status === 'published').slice(0, 4).map((course, index) => <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]" onClick={() => setSelectedCourse(course)}>
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex items-center justify-between">
                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                    <Badge variant="secondary" className="text-xs">Published</Badge>
                  </div>
                  <CardTitle className="text-sm sm:text-lg leading-tight">{course.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-muted-foreground">
                    <span className="truncate">Instructor: {course.instructor}</span>
                    <span className="font-medium">{course.duration}</span>
                  </div>
                </CardContent>
              </Card>)}
            {businessCourses.filter(course => course.status === 'published').length === 0 && <div className="col-span-full text-center py-6 sm:py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No published courses available yet.</p>
                {isAdmin && <Button variant="outline" size="sm" className="mt-3 sm:mt-4" onClick={() => setShowCreateCourseDialog(true)}>
                    Create First Course
                  </Button>}
              </div>}
          </div>
        </section>

        {/* Heritage & Legacy Resources */}
        <section className="space-y-3 sm:space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              Heritage & Legacy Resources
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Preserve and explore your family's rich history and heritage
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {heritageResources.map(resource => {
            const Icon = resource.icon;
            return <Card key={resource.title} className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] min-h-[140px] sm:min-h-[160px]" onClick={() => {
              if (resource.title === "Legal Documents") {
                // Show Family Documents tab with focus on Legal Documents
                setShowFamilyDocuments(true);
              } else {
                handleHeritageResource(resource.title);
              }
            }}>
                  <CardHeader className="pb-2 sm:pb-3 text-center">
                    <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${resource.color} mx-auto mb-2`} />
                    <CardTitle className="text-sm sm:text-base leading-tight">{resource.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="secondary" size="sm" className="w-full text-xs sm:text-sm">
                      {resource.category}
                    </Button>
                  </CardContent>
                </Card>;
          })}
          </div>
        </section>

        {/* Family Secret Codes - Admin Only */}
        {isAdmin && <section className="space-y-4">
            <FamilySecretCodesAdmin />
          </section>}

        {/* Business Courses Dialog */}
        <Dialog open={showCoursesDialog} onOpenChange={setShowCoursesDialog}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Family Business Education Courses
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Comprehensive courses designed for family business success
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
              {businessCourses.map((course, index) => <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 sm:mb-3">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg">{course.title}</h3>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'} className="w-fit text-xs">
                            {course.status === 'published' ? <>
                                <FileCheck className="h-3 w-3 mr-1" />
                                Published
                              </> : <>
                                <Eye className="h-3 w-3 mr-1" />
                                Draft
                              </>}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">{course.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                            {course.instructor}
                          </span>
                          <span className="font-medium">{course.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs" onClick={() => setSelectedCourse(course)}>
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          View
                        </Button>
                        {isAdmin && <>
                            <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs" onClick={() => handleEditCourse(index)}>
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="sm:hidden">Edit</span>
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteCourse(index)}>
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="sm:hidden">Delete</span>
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </>}
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0 pt-3 sm:pt-0">
              {isAdmin && <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowCreateCourseDialog(true)}>
                  Create New Course
                </Button>}
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowCoursesDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Course Detail Dialog */}
        {selectedCourse && <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg leading-tight">{selectedCourse.title}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Instructor: {selectedCourse.instructor} | Duration: {selectedCourse.duration}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 sm:space-y-6">
                <p className="text-sm sm:text-base">{selectedCourse.description}</p>
                
                {selectedCourse.videos && selectedCourse.videos.length > 0 && <div>
                    <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Course Videos</h4>
                    <div className="grid gap-3 sm:gap-4">
                      {selectedCourse.videos.map((videoUrl: string, index: number) => <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <iframe src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} title={`${selectedCourse.title} - Video ${index + 1}`} className="w-full h-full" allowFullScreen />
                        </div>)}
                    </div>
                  </div>}
                
                {selectedCourse.modules && selectedCourse.modules.length > 0 && <div>
                    <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Course Modules</h4>
                    <div className="grid gap-2 sm:gap-4">
                      {selectedCourse.modules.map((module: any, index: number) => <Card key={index}>
                          <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-sm sm:text-base">Module {index + 1}: {module.name}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Duration: {module.duration}</CardDescription>
                          </CardHeader>
                        </Card>)}
                    </div>
                  </div>}
              </div>
            </DialogContent>
          </Dialog>}

        {/* Family Tree Dialog */}
        <Dialog open={showFamilyTreeDialog} onOpenChange={setShowFamilyTreeDialog}>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TreePine className="h-4 w-4 sm:h-5 sm:w-5" />
                Interactive Family Tree
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Visualize your family connections and relationships
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 h-[70vh] sm:h-[80vh]">
              {/* Left Panel - Input */}
              <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 sm:pr-2">
                <FamilyTreeTextInput onGenerate={members => {
                setFamilyData(members);
                toast.success('Family tree generated successfully!');
              }} />
              </div>
              
              {/* Right Panel - Visual Diagram */}
              <div className="relative border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="p-2 sm:p-3 border-b bg-white/80 backdrop-blur-sm">
                  <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                    <TreePine className="h-3 w-3 sm:h-4 sm:w-4" />
                    Family Tree Visualization
                  </h3>
                </div>
                <div className="h-[calc(70vh-2.5rem)] sm:h-[calc(80vh-3rem)]">
                  {familyData.length > 0 ? <DynamicFamilyTreeVisualization familyMembers={familyData} /> : <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center px-4">
                        <TreePine className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                        <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">Interactive Family Tree</p>
                        <p className="text-xs opacity-75">Enter family information on the left to see your visual family tree</p>
                      </div>
                    </div>}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Family Messages Dialog */}
        <Dialog open={showMessagesDialog} onOpenChange={setShowMessagesDialog}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Family Messages
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Communicate securely with family members
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 space-y-3 sm:space-y-4 overflow-hidden">
              <div className="flex-1 overflow-y-auto max-h-[50vh] sm:max-h-[400px] space-y-2 sm:space-y-3 p-3 sm:p-4 border rounded-lg bg-muted/20">
                {messages.length === 0 ? <div className="text-center text-muted-foreground py-6 sm:py-8">
                    <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm">No messages yet. Start the conversation!</p>
                  </div> : messages.map(message => {
                const isOwnMessage = message.sender_id === user?.id;
                return <div key={message.id} className={`flex items-start gap-2 sm:gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold text-white ${isOwnMessage ? 'bg-primary' : 'bg-blue-500'}`}>
                          {message.sender_name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`flex-1 max-w-[85%] sm:max-w-[80%] ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className={`p-2 sm:p-3 rounded-lg ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                            <p className="text-xs sm:text-sm">{message.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.sender_name} • {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>;
              })}
              </div>
              
              <div className="flex gap-2">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }} placeholder="Type your message..." className="flex-1 text-sm" />
                <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm" className="px-3 sm:px-4">
                  Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Family Documents Dialog */}
        <Dialog open={showFamilyDocuments} onOpenChange={setShowFamilyDocuments}>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                Legal Documents & Family Office Files
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Upload, manage, and access your family's important legal documents
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 sm:mt-4">
              <FamilyDocumentsTab viewOnly={true} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
}