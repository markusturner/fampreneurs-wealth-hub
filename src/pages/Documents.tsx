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
  const { shouldShowOnboarding, completeOnboarding, resetOnboarding } = useGovernanceOnboarding(user?.id || null);
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
    if (!newMessage.trim() || !user?.id) return;
    
    try {
      // Insert message into the database which will trigger notifications
      const { error } = await supabase
        .from('family_messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          message_type: 'text',
          recipient_id: user.id // For now, sending to self for testing
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
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
      toast.success('Message sent!');
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

  return <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 py-3 xs:py-4 sm:py-5 md:py-6 space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8">

        {/* Family Constitution Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {governanceData?.constitutionName || "Family Constitution"}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
            {governanceData?.familyConstitution || "Your comprehensive family governance framework and foundational documents"}
          </p>
          {governanceData?.constitutionDate && (
            <p className="text-sm text-muted-foreground">
              Established: {new Date(governanceData.constitutionDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Identity & Core Documents Section */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Crown className="h-6 w-6 text-amber-600" />
              Identity & Core Documents
            </h2>
            <p className="text-muted-foreground">
              The foundation of your family's values and principles
            </p>
            {!governanceData ? (
              <div className="mt-4 p-6 border-2 border-dashed border-secondary rounded-lg bg-muted/30">
                <h3 className="font-semibold mb-2">Set Up Your Family Constitution</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a comprehensive family governance framework with our step-by-step wizard
                </p>
                <Button 
                  onClick={() => navigate('/family-constitution/setup')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Start Constitution Setup
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/family-constitution/setup')}
                className="mt-2 gap-2"
              >
                <Settings className="h-4 w-4" />
                Edit Constitution
              </Button>
            )}
          </div>

          {/* Mission, Vision, Values Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Scale className="h-6 w-6 text-blue-600" />
              Governance & Authority
            </h2>
            <p className="text-muted-foreground">
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
                  <Label className="text-sm font-medium">Quorum Percentage</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    {governanceData?.quorumPercentage || 0}%
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Routine Decisions Threshold</Label>
                  <p className="text-lg font-semibold">
                    {governanceData?.routineThreshold || 0}%
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Major Decisions Threshold</Label>
                  <p className="text-lg font-semibold">
                    {governanceData?.majorThreshold || 0}%
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
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <GraduationCap className="h-6 w-6 text-emerald-600" />
              Legacy & Development
            </h2>
            <p className="text-muted-foreground">
              Education, philanthropy, and future planning
            </p>
          </div>

          {/* Education & Philanthropy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <GraduationCap className="h-6 w-6 text-emerald-600" />
              Family Education & Courses
            </h2>
            <p className="text-muted-foreground">
              Comprehensive education programs for family business success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {familyEducationModules.map((module, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <module.icon className={`h-5 w-5 ${module.color}`} />
                    {module.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lessons</span>
                      <span className="font-medium">{module.lessons}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{module.duration}</span>
                    </div>
                    <Badge variant="secondary">
                      {module.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
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
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              View All Courses
            </Button>
          </div>
        </section>

        {/* Quick Actions & Resources */}
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => setShowFamilyTreeDialog(true)}>
              <TreePine className="h-6 w-6 text-emerald-600" />
              <span className="text-sm">Family Tree</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => setShowFamilyDocuments(true)}>
              <FileText className="h-6 w-6 text-blue-600" />
              <span className="text-sm">Documents</span>
            </Button>
            
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => setShowMessagesDialog(true)}>
              <MessageCircle className="h-6 w-6 text-purple-600" />
              <span className="text-sm">Messages</span>
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
                activeVotes.map((vote) => (
                  <Card key={vote.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{vote.title}</CardTitle>
                          <CardDescription className="mt-1">{vote.description}</CardDescription>
                        </div>
                        <Badge variant={vote.type === 'major' ? 'destructive' : 'secondary'}>
                          {vote.type === 'major' ? 'Major' : 'Routine'} Decision
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          Expires: {vote.expiresAt.toLocaleDateString()} at {vote.expiresAt.toLocaleTimeString()}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              // Cast vote logic
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
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              // Cast vote logic
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
                        
                        {vote.votes[user?.id || ''] && (
                          <div className="text-sm text-muted-foreground">
                            Your vote: <strong>{vote.votes[user?.id || '']}</strong>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Keep modal as fallback but redirect to full-page setup */}
      {shouldShowOnboarding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Set Up Family Constitution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Complete your family constitution setup with our improved step-by-step wizard.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/family-constitution/setup')}
                  className="flex-1 gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Start Setup
                </Button>
                <Button 
                  variant="outline" 
                  onClick={completeOnboarding}
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>;
}