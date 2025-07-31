import { NavLink, useLocation } from 'react-router-dom'
import { Users, Calendar, BookOpen, Home, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const allNavigationItems = [
  { name: 'Community', href: '/community', icon: MessageSquare },
  { name: 'Calendar', href: '/coaching', icon: Calendar },
  { name: 'Family Office', href: '/', icon: Home },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Scoreboard', href: '/members', icon: Users },
]

const familyOfficeOnlyItems = [
  { name: 'Family Office', href: '/', icon: Home },
]

// This component is deprecated - use MobileBottomNav instead
export { MobileBottomNav as MobileNavigation } from './mobile-bottom-nav'