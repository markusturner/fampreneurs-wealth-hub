import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Crown, Users, MessageCircle, Image, TreePine, Lock, Scroll, Building2, Scale, Shield, GraduationCap, ArrowLeft, Heart, FileText, Video, Settings, Eye, EyeOff, CheckCircle, Key, Edit, Trash2, FileCheck, Loader2, UserPlus, Gavel, UserCheck, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import { GovernanceOnboardingModal } from "@/components/governance/GovernanceOnboardingModal";
import { useGovernanceOnboarding } from "@/hooks/useGovernanceOnboarding";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useFamilyTree } from "@/hooks/useFamilyTree";
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
  
  // Initialize message notifications
  useMessageNotifications();
  
  // Load family tree from database
  const { familyMembers, loading: familyTreeLoading } = useFamilyTree();
  
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [availableCodes, setAvailableCodes] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  const [showCoursesDialog, setShowCoursesDialog] = useState(false);
  const [showFamilyTreeDialog, setShowFamilyTreeDialog] = useState(false);
  const [showConstitutionDialog, setShowConstitutionDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showCreateCourseDialog, setShowCreateCourseDialog] = useState(false);
  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);
  
  // Convert businessCourses to state so buttons can modify it
  const [businessCourses, setBusinessCourses] = useState([{
    title: "Family Business Fundamentals",
    instructor: "Dr. Sarah Johnson",
    duration: "4 weeks",
    description: "Essential principles for successful family business management",
    status: "published",
    videos: [{ url: "https://youtu.be/example1", type: "youtube" }, { url: "https://youtu.be/example2", type: "youtube" }],
    modules: [{
      name: "Introduction to Family Business",
      duration: "45 minutes"
    }, {
      name: "Strategic Planning",
      duration: "60 minutes"
    }, {
      name: "Leadership Transition",
      duration: "55 minutes"
    }]
  }, {
    title: "Wealth Management Strategies", 
    instructor: "Michael Chen, CFA",
    duration: "6 weeks",
    description: "Advanced strategies for preserving and growing family wealth across generations",
    status: "published",
    videos: [{ url: "https://youtu.be/example3", type: "youtube" }],
    modules: [{
      name: "Investment Principles",
      duration: "50 minutes"
    }, {
      name: "Risk Management",
      duration: "40 minutes"
    }, {
      name: "Estate Planning",
      duration: "70 minutes"
    }]
  }, {
    title: "Next Generation Leadership",
    instructor: "Prof. Amanda Rodriguez", 
    duration: "8 weeks",
    description: "Developing leadership skills in family business successors",
    status: "draft",
    videos: [],
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
  }]);
  
  const [newCourse, setNewCourse] = useState({
    title: '',
    instructor: '',
    duration: '',
    description: '',
    status: 'draft'
  });
  const [videoUrls, setVideoUrls] = useState<Array<{
    url: string;
    type: 'youtube' | 'loom' | 'file';
    fileName?: string;
  }>>([{ url: '', type: 'youtube' }]);
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
  
  // Voting system states
  const [showCreateVoteDialog, setShowCreateVoteDialog] = useState(false);
  const [showActiveVotesDialog, setShowActiveVotesDialog] = useState(false);
  const [activeVotes, setActiveVotes] = useState<any[]>([]);
  const [newVote, setNewVote] = useState({
    title: '',
    description: '',
    type: 'routine', // routine or major
    options: ['Yes', 'No'],
    expiresIn: 7 // days
  });
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
  const { shouldShowOnboarding, completeOnboarding, openOnboarding, resetOnboarding } = useGovernanceOnboarding(user?.id || null);
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
      // First try to load from governance onboarding data (localStorage)
      const savedData = localStorage.getItem(`governance_onboarding_${user.id}`);
      if (savedData) {
        const onboardingData = JSON.parse(savedData);
        
        // Map onboarding fields to family values
        setCoreValues(onboardingData.coreValues?.join(', ') || '');
        setVision(onboardingData.visionStatement || '');
        setMission(onboardingData.missionStatement || '');
        return;
      }

      // Fallback to database if no localStorage data
      const { data, error } = await supabase
        .from('family_governance_policies')
        .select('*')
        .eq('user_id', user.id)
        .eq('policy_type', 'governance')
        .maybeSingle();

      if (error) {
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
          policy_type: 'governance',
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
  const addVideoUrl = () => {
    setVideoUrls([...videoUrls, { url: '', type: 'youtube' }]);
  };
  const updateVideoUrl = (index: number, field: 'url' | 'type' | 'fileName', value: string) => {
    const updated = [...videoUrls];
    updated[index] = { ...updated[index], [field]: value };
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
      videos: videoUrls.filter(video => video.url.trim()),
      modules: courseModules.filter(module => module.name.trim())
    };
    
    // Update state instead of directly modifying array
    setBusinessCourses(prev => [...prev, course]);
    
    setNewCourse({
      title: '',
      instructor: '',
      duration: '',
      description: '',
      status: 'draft'
    });
    setVideoUrls([{ url: '', type: 'youtube' }]);
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
    setVideoUrls(course.videos?.length ? 
      course.videos.map((v: any) => 
        typeof v === 'string' 
          ? { url: v, type: 'youtube' as const } 
          : { url: v.url || '', type: (v.type || 'youtube') as 'youtube' | 'loom' | 'file', fileName: v.fileName }
      ) : 
      [{ url: '', type: 'youtube' as const }]
    );
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
      videos: videoUrls.filter(video => video.url.trim()),
      modules: courseModules.filter(module => module.name.trim())
    };
    
    // Update state instead of directly modifying array
    setBusinessCourses(prev => {
      const updated = [...prev];
      updated[editingCourseIndex] = updatedCourse;
      return updated;
    });
    
    setNewCourse({
      title: '',
      instructor: '',
      duration: '',
      description: '',
      status: 'draft'
    });
    setVideoUrls([{ url: '', type: 'youtube' }]);
    setCourseModules([{
      name: '',
      duration: ''
    }]);
    setEditingCourseIndex(null);
    setShowEditCourseDialog(false);
    toast.success('Course updated successfully!');
  };
  
  const handleDeleteCourse = (index: number) => {
    // Update state instead of directly modifying array
    setBusinessCourses(prev => prev.filter((_, i) => i !== index));
    toast.success('Course deleted successfully!');
  };
  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    try {
      // Insert message into the database which will trigger notifications
      const { data: insertedData, error } = await supabase
        .from('family_messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          message_type: 'text',
          recipient_id: user.id // For now, sending to self for testing
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      // Send email notifications in background
      if (insertedData) {
        supabase.functions.invoke('notify-message-email', {
          body: {
            messageId: insertedData.id,
            messageContent: newMessage,
            senderId: user.id,
            recipientId: null // null = broadcast to all
          }
        }).catch(err => console.error('Error sending message notification:', err));
      }

      // Update local state for immediate UI feedback
      const message = {
        id: Date.now().toString(),
        content: newMessage,
        sender_id: user?.id,
        sender_name: profile?.display_name || 'You',
        created_at: new Date().toISOString()
      };
      setMessages([...messages, message]);
      setNewMessage('');
      toast.success('Message sent and notifications sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };
  // Load governance onboarding data
  const [governanceData, setGovernanceData] = useState<any>(null);
  
  useEffect(() => {
    if (user?.id) {
      const savedData = localStorage.getItem(`governance_onboarding_${user.id}`);
      if (savedData) {
        setGovernanceData(JSON.parse(savedData));
      }
    }
  }, [user?.id]);

  // Vote helper functions (after governanceData is defined)
  const calculateVoteResults = (vote: any) => {
    const totalVotes = Object.keys(vote.votes || {}).length;
    if (totalVotes === 0) return { yesCount: 0, noCount: 0, yesPercent: 0, noPercent: 0, totalVotes: 0 };
    
    const yesCount = Object.values(vote.votes || {}).filter(v => v === 'yes').length;
    const noCount = Object.values(vote.votes || {}).filter(v => v === 'no').length;
    const yesPercent = Math.round((yesCount / totalVotes) * 100);
    const noPercent = Math.round((noCount / totalVotes) * 100);
    
    return { yesCount, noCount, yesPercent, noPercent, totalVotes };
  };

  const resolveVote = (vote: any) => {
    const { yesPercent } = calculateVoteResults(vote);
    const threshold = governanceData?.quorumPercentage || 50;
    
    if (yesPercent >= threshold) {
      return 'passed';
    } else if (new Date() > vote.expiresAt) {
      return 'failed';
    }
    return 'active';
  };

  const updateVoteStatuses = () => {
    setActiveVotes(prevVotes => 
      prevVotes.map(vote => ({
        ...vote,
        status: resolveVote(vote)
      }))
    );
  };

  // Auto-update vote statuses every 30 seconds
  useEffect(() => {
    const interval = setInterval(updateVoteStatuses, 30000);
    return () => clearInterval(interval);
  }, [governanceData?.quorumPercentage]);

  // Update statuses when votes change
  useEffect(() => {
    updateVoteStatuses();
  }, [activeVotes.length, governanceData?.quorumPercentage]);

  return <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 lg:space-y-10">

        {/* Family Constitution Header */}
        <div className="text-center space-y-3 sm:space-y-4 px-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            {governanceData?.constitutionName || "Family Constitution"}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {governanceData?.familyConstitution || "Your comprehensive family governance framework and foundational documents"}
          </p>
          {governanceData?.constitutionDate && (
            <p className="text-sm text-muted-foreground">
              Established: {new Date(governanceData.constitutionDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Identity & Core Documents Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="text-center px-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2 flex-wrap">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              Identity & Core Documents
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              The foundation of your family's values and principles
            </p>
            {!governanceData ? (
              <div className="mt-4 p-4 sm:p-6 border-2 border-dashed border-secondary rounded-lg bg-muted/30">
                <h3 className="font-semibold mb-2 text-base sm:text-lg">Set Up Your Family Constitution</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 leading-relaxed">
                  Create a comprehensive family governance framework with our step-by-step wizard
                </p>
                <Button 
                  onClick={openOnboarding}
                  className="gap-2 w-full sm:w-auto min-h-[44px]"
                  size="lg"
                >
                  <FileText className="h-5 w-5" />
                  Start Constitution Setup
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="default"
                onClick={() => navigate('/family-constitution/setup')}
                className="mt-2 gap-2 min-h-[44px] px-4"
              >
                <Settings className="h-4 w-4" />
                Edit Constitution
              </Button>
            )}
          </div>

          {/* Mission, Vision, Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Shield className="h-5 w-5" />
                  Core Values
                </CardTitle>
              </CardHeader>
              <CardContent>
                {governanceData?.coreValues?.length > 0 ? (
                  <div className="space-y-2">
                    {governanceData.coreValues.map((value: string, index: number) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">
                        {value}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No core values defined yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Eye className="h-5 w-5" />
                  Vision Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {governanceData?.visionStatement || "No vision statement defined yet"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Users className="h-5 w-5" />
                  Mission Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {governanceData?.missionStatement || "No mission statement defined yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Wealth Philosophy & Founding Story */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-600" />
                  Wealth Philosophy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {governanceData?.wealthPhilosophy || "No wealth philosophy defined yet"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  Founding Story
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {governanceData?.foundingStory || "No founding story documented yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Legacy Milestones */}
          {governanceData?.legacyMilestones?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scroll className="h-5 w-5 text-indigo-600" />
                  Legacy Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {governanceData.legacyMilestones.map((milestone: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant="outline" className="shrink-0">
                        {milestone.year}
                      </Badge>
                      <p className="text-sm">{milestone.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Governance & Authority Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="text-center px-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              Governance & Authority
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Decision-making processes and organizational structure
            </p>
          </div>

          {/* Voting & Decision Making */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Voting Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Voting Threshold</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    {governanceData?.quorumPercentage || 0}%
                  </p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Execute Voting</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCreateVoteDialog(true)}>
                      <Gavel className="h-4 w-4 mr-2" />
                      Create Vote
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowActiveVotesDialog(true)}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Active Votes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Ownership & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {governanceData?.ownershipEligibility || "No ownership eligibility criteria defined"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Family Council & Board of Trustees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {governanceData?.familyCouncil?.members?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Family Council
                  </CardTitle>
                  <CardDescription>
                    Meets {governanceData.familyCouncil.cadence}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {governanceData.familyCouncil.members.map((member: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.termStart} - {member.termEnd}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {governanceData?.boardOfTrustees?.members?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    Board of Trustees
                  </CardTitle>
                  <CardDescription>
                    Meets {governanceData.boardOfTrustees.cadence}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {governanceData.boardOfTrustees.members.map((member: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.termStart} - {member.termEnd}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leadership Roles */}
          {governanceData?.leadershipRoles?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Leadership Roles & Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {governanceData.leadershipRoles.map((role: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <h4 className="font-semibold text-sm mb-2">{role.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {role.duties}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Three Branches of Family Governance */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">Three Branches of Family Governance</h3>
              <p className="text-sm text-muted-foreground">
                The foundational structure that ensures balanced decision-making and accountability
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Family Council - Executive Branch */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-blue-500" />
                    <div>
                      <CardTitle className="text-lg">Family Council</CardTitle>
                      <CardDescription>Executive Branch</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Responsible for implementing family policies, managing day-to-day operations, and executing strategic decisions.
                  </p>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Key Responsibilities:</strong>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Strategic planning & execution</li>
                      <li>• Resource allocation</li>
                      <li>• Policy implementation</li>
                      <li>• Family office management</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Council of Elders - Judicial Branch */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Gavel className="h-8 w-8 text-purple-500" />
                    <div>
                      <CardTitle className="text-lg">Council of Elders</CardTitle>
                      <CardDescription>Judicial Branch</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Provides wisdom, oversight, and resolution of disputes. Ensures family values and traditions are preserved.
                  </p>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Key Responsibilities:</strong>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Dispute resolution</li>
                      <li>• Ethics oversight</li>
                      <li>• Constitutional interpretation</li>
                      <li>• Family legacy preservation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Family Assembly - Legislative Branch */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-8 w-8 text-green-500" />
                    <div>
                      <CardTitle className="text-lg">Family Assembly</CardTitle>
                      <CardDescription>Legislative Branch</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Democratic voice of all family members. Creates policies, approves budgets, and makes major decisions through voting.
                  </p>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Key Responsibilities:</strong>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Policy creation & amendment</li>
                      <li>• Budget approval</li>
                      <li>• Major decision voting</li>
                      <li>• Family member representation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Legacy & Development Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="text-center px-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              Legacy & Development
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Education, philanthropy, and future planning
            </p>
          </div>

          {/* Education & Philanthropy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  Education Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Overview</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {governanceData?.educationOverview || "No education framework defined"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Participation Guidelines</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {governanceData?.participationGuidelines || "No participation guidelines defined"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Philanthropy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Thesis</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {governanceData?.philanthropyThesis || "No philanthropy thesis defined"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Grantmaking Policy</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {governanceData?.grantmakingPolicy || "No grantmaking policy defined"}
                  </p>
                </div>
                {governanceData?.focusAreas?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Focus Areas</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {governanceData.focusAreas.map((area: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Curriculum Tracks */}
          {governanceData?.curriculumTracks?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Curriculum Tracks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {governanceData.curriculumTracks.map((track: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <h4 className="font-semibold text-sm mb-2">{track.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {track.objectives}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Awards & Recognition */}
          {governanceData?.awardTypes?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Awards & Recognition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {governanceData.awardTypes.map((award: any, index: number) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-semibold text-sm mb-1">{award.name}</h4>
                      <p className="text-xs text-muted-foreground">{award.criteria}</p>
                    </div>
                  ))}
                </div>
                {governanceData?.ceremonyNotes && (
                  <div className="mt-4 p-3 rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50">
                    <Label className="text-sm font-medium">Ceremony Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {governanceData.ceremonyNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Family Education & Courses Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="text-center px-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              Family Education & Courses
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Comprehensive education programs for family business success
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {familyEducationModules.map((module, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <module.icon className={`h-5 w-5 ${module.color}`} />
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm leading-relaxed">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Lessons</span>
                      <span className="font-medium">{module.lessons}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{module.duration}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {module.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4 min-h-[44px]"
                      onClick={() => setShowCoursesDialog(true)}
                    >
                      View Course Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              onClick={() => setShowCoursesDialog(true)}
              className="gap-2 w-full sm:w-auto min-h-[44px] px-6"
              size="lg"
            >
              <BookOpen className="h-5 w-5" />
              View All Courses
            </Button>
          </div>
        </section>

        {/* Quick Actions & Resources */}
        <section className="space-y-4">
          <div className="text-center px-2">
            <h2 className="text-lg sm:text-xl font-bold mb-2">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button variant="outline" className="h-auto min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3" onClick={() => setShowFamilyTreeDialog(true)}>
              <TreePine className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
              <span className="text-xs sm:text-sm font-medium text-center">Family Tree</span>
            </Button>
            
            <Button variant="outline" className="h-auto min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3" onClick={() => setShowFamilyDocuments(true)}>
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-center">Documents</span>
            </Button>
            
            
            <Button variant="outline" className="h-auto min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3 col-span-2 sm:col-span-1" onClick={() => setShowMessagesDialog(true)}>
              <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-center">Messages</span>
            </Button>
          </div>
        </section>

        {/* Family Secret Codes - Admin Only */}
        {isAdmin && (
            <section className="space-y-4">
              <FamilySecretCodesAdmin />
            </section>
        )}

        {/* Business Courses Dialog */}
        <Dialog open={showCoursesDialog} onOpenChange={setShowCoursesDialog}>
          <DialogContent className="w-[96vw] sm:w-[90vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="space-y-2 pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                Family Business Education Courses
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base leading-relaxed">
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
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs" onClick={() => {
                          console.log('View button clicked for course:', course.title);
                          setSelectedCourse(course);
                        }}>
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
                      {selectedCourse.videos.map((video: any, index: number) => {
                        const videoUrl = typeof video === 'string' ? video : video.url;
                        const embedUrl = videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').replace('loom.com/share/', 'loom.com/embed/');
                        
                        return (
                          <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <iframe 
                              src={embedUrl} 
                              title={`${selectedCourse.title} - Video ${index + 1}`} 
                              className="w-full h-full" 
                              allowFullScreen 
                            />
                          </div>
                        );
                      })}
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
                Your Family Tree
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                See how everyone in your family is connected
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 h-[70vh] sm:h-[80vh]">
              {/* Left Panel - Input */}
              <div className="flex flex-col gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-blue-900 font-medium mb-1">How to create your family tree:</p>
                  <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                    <li>Go to the "Members" tab to add your family members</li>
                    <li>Or type relationships below (e.g., "John is married to Mary")</li>
                    <li>Click "Update Tree" to see the visual diagram</li>
                  </ol>
                </div>
                <div className="flex-1 min-h-0">
                  <FamilyTreeTextInput onGenerate={() => {
                    toast.success('Family tree updated! Your members are now connected.');
                  }} />
                </div>
              </div>
              
              {/* Right Panel - Visual Diagram */}
              <div className="relative border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="p-2 sm:p-3 border-b bg-white/80 backdrop-blur-sm">
                  <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                    <TreePine className="h-3 w-3 sm:h-4 sm:w-4" />
                    Visual Diagram
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Your family connections will appear here</p>
                </div>
                <div className="h-[calc(70vh-2.5rem)] sm:h-[calc(80vh-3rem)]">
                  {familyMembers.length > 0 ? <DynamicFamilyTreeVisualization familyMembers={familyMembers} /> : <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center px-4">
                        <TreePine className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                        <p className="text-sm sm:text-base font-medium mb-2">Ready to build your family tree?</p>
                        <p className="text-xs sm:text-sm opacity-75 max-w-xs mx-auto">{familyTreeLoading ? 'Loading...' : 'Add your first family member to get started. You can do this in the Members tab or by typing on the left.'}</p>
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
              
              <div className="flex gap-2 p-1">
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

        {/* Create Vote Dialog */}
        <Dialog open={showCreateVoteDialog} onOpenChange={setShowCreateVoteDialog}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-blue-600" />
                Create New Vote
              </DialogTitle>
              <DialogDescription>
                Create a new vote for family decision-making
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="vote-title">Vote Title</Label>
                <Input 
                  id="vote-title"
                  value={newVote.title}
                  onChange={(e) => setNewVote({...newVote, title: e.target.value})}
                  placeholder="Enter vote title..."
                />
              </div>
              
              <div>
                <Label htmlFor="vote-description">Description</Label>
                <Textarea 
                  id="vote-description"
                  value={newVote.description}
                  onChange={(e) => setNewVote({...newVote, description: e.target.value})}
                  placeholder="Describe what this vote is about..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="vote-type">Vote Type</Label>
                <Select value={newVote.type} onValueChange={(value) => setNewVote({...newVote, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine Decision ({governanceData?.routineThreshold || 50}% threshold)</SelectItem>    
                    <SelectItem value="major">Major Decision ({governanceData?.majorThreshold || 75}% threshold)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="vote-expires">Voting Period (days)</Label>
                <Input 
                  id="vote-expires"
                  type="number"
                  value={newVote.expiresIn}
                  onChange={(e) => setNewVote({...newVote, expiresIn: parseInt(e.target.value)})}
                  min="1"
                  max="30"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  // Create vote logic here
                  const vote = {
                    id: Date.now().toString(),
                    ...newVote,
                    createdBy: user?.id,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + newVote.expiresIn * 24 * 60 * 60 * 1000),
                    votes: {},
                    status: 'active'
                  };
                  setActiveVotes([...activeVotes, vote]);
                  setNewVote({title: '', description: '', type: 'routine', options: ['Yes', 'No'], expiresIn: 7});
                  setShowCreateVoteDialog(false);
                  toast.success('Vote created successfully!');
                }} className="flex-1">
                  Create Vote
                </Button>
                <Button variant="outline" onClick={() => setShowCreateVoteDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Active Votes Dialog */}
        <Dialog open={showActiveVotesDialog} onOpenChange={setShowActiveVotesDialog}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Active Votes
              </DialogTitle>
              <DialogDescription>
                Participate in family decision-making votes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {activeVotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active votes at this time</p>
                  <Button variant="outline" className="mt-4" onClick={() => {
                    setShowActiveVotesDialog(false);
                    setShowCreateVoteDialog(true);
                  }}>
                    Create First Vote
                  </Button>
                </div>
              ) : (
                activeVotes.map((vote) => {
                  const results = calculateVoteResults(vote);
                  const threshold = governanceData?.quorumPercentage || 50;
                  const voteStatus = resolveVote(vote);
                  const isExpired = new Date() > vote.expiresAt;
                  const hasVoted = vote.votes[user?.id || ''];
                  
                  return (
                    <Card key={vote.id} className={`${voteStatus === 'passed' ? 'border-green-200 bg-green-50' : voteStatus === 'failed' ? 'border-red-200 bg-red-50' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{vote.title}</CardTitle>
                            <CardDescription className="mt-1">{vote.description}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={vote.type === 'major' ? 'destructive' : 'secondary'}>
                              {vote.type === 'major' ? 'Major' : 'Routine'} Decision
                            </Badge>
                            <Badge variant={
                              voteStatus === 'passed' ? 'default' : 
                              voteStatus === 'failed' ? 'destructive' : 
                              'secondary'
                            }>
                              {voteStatus === 'passed' ? 'PASSED' : 
                               voteStatus === 'failed' ? 'FAILED' : 
                               'ACTIVE'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Vote Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span>Progress to threshold ({threshold}%)</span>
                              <span className="font-medium">{results.yesPercent}% Yes</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  results.yesPercent >= threshold ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(results.yesPercent, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Yes: {results.yesCount} ({results.yesPercent}%)</span>
                              <span>No: {results.noCount} ({results.noPercent}%)</span>
                              <span>Total: {results.totalVotes}</span>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {isExpired ? (
                              <span className="text-red-600 font-medium">Expired: {vote.expiresAt.toLocaleDateString()}</span>
                            ) : (
                              <span>Expires: {vote.expiresAt.toLocaleDateString()} at {vote.expiresAt.toLocaleTimeString()}</span>
                            )}
                          </div>
                          
                          {/* Voting Buttons */}
                          {voteStatus === 'active' && !isExpired && (
                            <div className="flex gap-2">
                              <Button 
                                variant={hasVoted === 'yes' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => {
                                  const updatedVotes = activeVotes.map(v => 
                                    v.id === vote.id 
                                      ? {...v, votes: {...v.votes, [user?.id || '']: 'yes'}}
                                      : v
                                  );
                                  setActiveVotes(updatedVotes);
                                  toast.success('Vote cast: Yes');
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Vote Yes
                              </Button>
                              <Button 
                                variant={hasVoted === 'no' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => {
                                  const updatedVotes = activeVotes.map(v => 
                                    v.id === vote.id 
                                      ? {...v, votes: {...v.votes, [user?.id || '']: 'no'}}
                                      : v
                                  );
                                  setActiveVotes(updatedVotes);
                                  toast.success('Vote cast: No');
                                }}
                              >
                                <X className="h-4 w-4 mr-2 text-red-600" />
                                Vote No
                              </Button>
                            </div>
                          )}
                          
                          {hasVoted && (
                            <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                              Your vote: <strong className={hasVoted === 'yes' ? 'text-green-600' : 'text-red-600'}>
                                {hasVoted.toUpperCase()}
                              </strong>
                            </div>
                          )}

                          {/* Vote Results for completed votes */}
                          {voteStatus !== 'active' && (
                            <div className={`p-3 rounded-lg border-l-4 ${
                              voteStatus === 'passed' 
                                ? 'border-l-green-500 bg-green-50' 
                                : 'border-l-red-500 bg-red-50'
                            }`}>
                              <div className="font-medium text-sm">
                                {voteStatus === 'passed' ? 'Vote Passed!' : 'Vote Failed'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Final result: {results.yesPercent}% Yes, {results.noPercent}% No (needed {threshold}%)
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Create Course Dialog */}
      <Dialog open={showCreateCourseDialog} onOpenChange={setShowCreateCourseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Add a new family business education course with modules and videos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Course Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course-title">Course Title *</Label>
                <Input
                  id="course-title"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  placeholder="Enter course title"
                />
              </div>
              <div>
                <Label htmlFor="course-instructor">Instructor *</Label>
                <Input
                  id="course-instructor"
                  value={newCourse.instructor}
                  onChange={(e) => setNewCourse({...newCourse, instructor: e.target.value})}
                  placeholder="Enter instructor name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course-duration">Duration</Label>
                <Select
                  value={newCourse.duration}
                  onValueChange={(value) => setNewCourse({...newCourse, duration: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="1 week">1 week</SelectItem>
                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                    <SelectItem value="3 weeks">3 weeks</SelectItem>
                    <SelectItem value="4 weeks">4 weeks</SelectItem>
                    <SelectItem value="6 weeks">6 weeks</SelectItem>
                    <SelectItem value="8 weeks">8 weeks</SelectItem>
                    <SelectItem value="10 weeks">10 weeks</SelectItem>
                    <SelectItem value="12 weeks">12 weeks</SelectItem>
                    <SelectItem value="3 months">3 months</SelectItem>
                    <SelectItem value="6 months">6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="course-status">Status</Label>
                <Select value={newCourse.status} onValueChange={(value) => setNewCourse({...newCourse, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                placeholder="Enter course description"
                rows={3}
              />
            </div>

            {/* Videos Section */}
            <div>
              <Label className="text-base font-semibold">Course Videos</Label>
              <p className="text-sm text-muted-foreground mb-3">Add videos via YouTube URL, Loom URL, or file upload</p>
              <div className="space-y-3">
                {videoUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select 
                        value={url.type || 'youtube'} 
                        onValueChange={(value) => updateVideoUrl(index, 'type', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="loom">Loom</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-[2]">
                      {url.type === 'file' ? (
                        <Input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              updateVideoUrl(index, 'url', URL.createObjectURL(file));
                              updateVideoUrl(index, 'fileName', file.name);
                            }
                          }}
                        />
                      ) : (
                        <Input
                          value={url.url || ''}
                          onChange={(e) => updateVideoUrl(index, 'url', e.target.value)}
                          placeholder={
                            url.type === 'loom' 
                              ? "Enter Loom URL (e.g., https://loom.com/share/...)"
                              : "Enter YouTube URL (e.g., https://youtu.be/...)"
                          }
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVideoUrl(index)}
                      disabled={videoUrls.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addVideoUrl} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </div>
            </div>

            {/* Modules Section */}
            <div>
              <Label className="text-base font-semibold">Course Modules</Label>
              <p className="text-sm text-muted-foreground mb-3">Define the learning modules for this course</p>
              <div className="space-y-3">
                {courseModules.map((module, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1">
                      <Input
                        value={module.name}
                        onChange={(e) => updateModule(index, 'name', e.target.value)}
                        placeholder="Module name (e.g., Introduction to Leadership)"
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={module.duration}
                        onValueChange={(value) => updateModule(index, 'duration', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="15 minutes">15 minutes</SelectItem>
                          <SelectItem value="30 minutes">30 minutes</SelectItem>
                          <SelectItem value="45 minutes">45 minutes</SelectItem>
                          <SelectItem value="1 hour">1 hour</SelectItem>
                          <SelectItem value="1.5 hours">1.5 hours</SelectItem>
                          <SelectItem value="2 hours">2 hours</SelectItem>
                          <SelectItem value="2.5 hours">2.5 hours</SelectItem>
                          <SelectItem value="3 hours">3 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeModule(index)}
                      disabled={courseModules.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addModule} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleCreateCourse} className="flex-1">
                Create Course
              </Button>
              <Button variant="outline" onClick={() => setShowCreateCourseDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={showEditCourseDialog} onOpenChange={setShowEditCourseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course information, modules, and videos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Course Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-course-title">Course Title *</Label>
                <Input
                  id="edit-course-title"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  placeholder="Enter course title"
                />
              </div>
              <div>
                <Label htmlFor="edit-course-instructor">Instructor *</Label>
                <Input
                  id="edit-course-instructor"
                  value={newCourse.instructor}
                  onChange={(e) => setNewCourse({...newCourse, instructor: e.target.value})}
                  placeholder="Enter instructor name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-course-duration">Duration</Label>
                <Select
                  value={newCourse.duration}
                  onValueChange={(value) => setNewCourse({...newCourse, duration: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="1 week">1 week</SelectItem>
                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                    <SelectItem value="3 weeks">3 weeks</SelectItem>
                    <SelectItem value="4 weeks">4 weeks</SelectItem>
                    <SelectItem value="6 weeks">6 weeks</SelectItem>
                    <SelectItem value="8 weeks">8 weeks</SelectItem>
                    <SelectItem value="10 weeks">10 weeks</SelectItem>
                    <SelectItem value="12 weeks">12 weeks</SelectItem>
                    <SelectItem value="3 months">3 months</SelectItem>
                    <SelectItem value="6 months">6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-course-status">Status</Label>
                <Select value={newCourse.status} onValueChange={(value) => setNewCourse({...newCourse, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-course-description">Description</Label>
              <Textarea
                id="edit-course-description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                placeholder="Enter course description"
                rows={3}
              />
            </div>

            {/* Videos Section */}
            <div>
              <Label className="text-base font-semibold">Course Videos</Label>
              <p className="text-sm text-muted-foreground mb-3">Add videos via YouTube URL, Loom URL, or file upload</p>
              <div className="space-y-3">
                {videoUrls.map((url, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select 
                        value={url.type || 'youtube'} 
                        onValueChange={(value) => updateVideoUrl(index, 'type', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="loom">Loom</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-[2]">
                      {url.type === 'file' ? (
                        <Input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              updateVideoUrl(index, 'url', URL.createObjectURL(file));
                              updateVideoUrl(index, 'fileName', file.name);
                            }
                          }}
                        />
                      ) : (
                        <Input
                          value={url.url || ''}
                          onChange={(e) => updateVideoUrl(index, 'url', e.target.value)}
                          placeholder={
                            url.type === 'loom' 
                              ? "Enter Loom URL (e.g., https://loom.com/share/...)"
                              : "Enter YouTube URL (e.g., https://youtu.be/...)"
                          }
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVideoUrl(index)}
                      disabled={videoUrls.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addVideoUrl} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </div>
            </div>

            {/* Modules Section */}
            <div>
              <Label className="text-base font-semibold">Course Modules</Label>
              <p className="text-sm text-muted-foreground mb-3">Define the learning modules for this course</p>
              <div className="space-y-3">
                {courseModules.map((module, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1">
                      <Input
                        value={module.name}
                        onChange={(e) => updateModule(index, 'name', e.target.value)}
                        placeholder="Module name (e.g., Introduction to Leadership)"
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        value={module.duration}
                        onValueChange={(value) => updateModule(index, 'duration', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="15 minutes">15 minutes</SelectItem>
                          <SelectItem value="30 minutes">30 minutes</SelectItem>
                          <SelectItem value="45 minutes">45 minutes</SelectItem>
                          <SelectItem value="1 hour">1 hour</SelectItem>
                          <SelectItem value="1.5 hours">1.5 hours</SelectItem>
                          <SelectItem value="2 hours">2 hours</SelectItem>
                          <SelectItem value="2.5 hours">2.5 hours</SelectItem>
                          <SelectItem value="3 hours">3 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeModule(index)}
                      disabled={courseModules.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addModule} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleUpdateCourse} className="flex-1">
                Update Course
              </Button>
              <Button variant="outline" onClick={() => setShowEditCourseDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Governance Onboarding Modal */}
      <GovernanceOnboardingModal 
        isOpen={shouldShowOnboarding} 
        onComplete={completeOnboarding}
        userId={user?.id || ''}
      />
    </div>;
}