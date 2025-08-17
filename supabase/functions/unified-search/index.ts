import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  filters?: {
    type?: string[];
    dateRange?: { start: string; end: string };
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type: string;
  relevance: number;
  url: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { query, filters = {}, limit = 20, offset = 0 }: SearchRequest = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchTerm = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Search in courses
    if (!filters.type || filters.type.includes('course')) {
      const { data: courses } = await supabaseClient
        .from('courses')
        .select('id, title, description, instructor, category, created_at, updated_at')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,instructor.ilike.%${searchTerm}%`)
        .eq('status', 'published')
        .limit(10);

      courses?.forEach(course => {
        const titleMatch = course.title.toLowerCase().includes(searchTerm);
        const descMatch = course.description?.toLowerCase().includes(searchTerm) || false;
        const instructorMatch = course.instructor?.toLowerCase().includes(searchTerm) || false;
        
        let relevance = 0;
        if (titleMatch) relevance += 10;
        if (descMatch) relevance += 5;
        if (instructorMatch) relevance += 3;

        results.push({
          id: course.id,
          title: course.title,
          description: course.description,
          type: 'course',
          relevance,
          url: `/courses?courseId=${course.id}`,
          metadata: {
            instructor: course.instructor,
            category: course.category
          },
          created_at: course.created_at,
          updated_at: course.updated_at
        });
      });
    }

    // Search in community posts
    if (!filters.type || filters.type.includes('community_post')) {
      const { data: posts } = await supabaseClient
        .from('community_posts')
        .select(`
          id, content, created_at, updated_at, channel_id,
          profiles!inner(display_name, avatar_url)
        `)
        .ilike('content', `%${searchTerm}%`)
        .limit(10);

      posts?.forEach(post => {
        const relevance = 5; // Base relevance for community posts
        results.push({
          id: post.id,
          title: `Community Post`,
          content: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
          type: 'community_post',
          relevance,
          url: `/community?postId=${post.id}${post.channel_id ? `&channelId=${post.channel_id}` : ''}`,
          metadata: {
            author: {
              name: post.profiles.display_name,
              avatar: post.profiles.avatar_url
            }
          },
          created_at: post.created_at,
          updated_at: post.updated_at
        });
      });
    }

    // Search in profiles
    if (!filters.type || filters.type.includes('profile')) {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, bio, avatar_url, created_at')
        .or(`display_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(10);

      profiles?.forEach(profile => {
        const nameMatch = 
          profile.display_name?.toLowerCase().includes(searchTerm) ||
          profile.first_name?.toLowerCase().includes(searchTerm) ||
          profile.last_name?.toLowerCase().includes(searchTerm);
        const bioMatch = profile.bio?.toLowerCase().includes(searchTerm) || false;
        
        let relevance = 0;
        if (nameMatch) relevance += 8;
        if (bioMatch) relevance += 3;

        results.push({
          id: profile.user_id,
          title: profile.display_name || `${profile.first_name} ${profile.last_name}`,
          description: profile.bio,
          type: 'profile',
          relevance,
          url: `/members?memberId=${profile.user_id}`,
          metadata: {
            avatar: profile.avatar_url
          },
          created_at: profile.created_at
        });
      });
    }

    // Search in coaching recordings
    if (!filters.type || filters.type.includes('coaching_recording')) {
      const { data: recordings } = await supabaseClient
        .from('coaching_call_recordings')
        .select('id, title, description, duration_minutes, category, created_at, updated_at')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(10);

      recordings?.forEach(recording => {
        const titleMatch = recording.title.toLowerCase().includes(searchTerm);
        const descMatch = recording.description?.toLowerCase().includes(searchTerm) || false;
        
        let relevance = 0;
        if (titleMatch) relevance += 9;
        if (descMatch) relevance += 4;

        results.push({
          id: recording.id,
          title: recording.title,
          description: recording.description,
          type: 'coaching_recording',
          relevance,
          url: `/courses?recordingId=${recording.id}`,
          metadata: {
            duration: recording.duration_minutes ? `${recording.duration_minutes} min` : undefined,
            category: recording.category
          },
          created_at: recording.created_at,
          updated_at: recording.updated_at
        });
      });
    }

    // Search in course videos
    if (!filters.type || filters.type.includes('video')) {
      const { data: videos } = await supabaseClient
        .from('course_videos')
        .select(`
          id, title, description, duration_seconds, course_id, created_at, updated_at,
          courses!inner(title, category)
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(10);

      videos?.forEach(video => {
        const titleMatch = video.title.toLowerCase().includes(searchTerm);
        const descMatch = video.description?.toLowerCase().includes(searchTerm) || false;
        
        let relevance = 0;
        if (titleMatch) relevance += 8;
        if (descMatch) relevance += 4;

        results.push({
          id: video.id,
          title: video.title,
          description: video.description,
          type: 'video',
          relevance,
          url: `/courses?courseId=${video.course_id}&videoId=${video.id}`,
          metadata: {
            duration: video.duration_seconds ? `${Math.round(video.duration_seconds / 60)} min` : undefined,
            course: video.courses.title,
            category: video.courses.category
          },
          created_at: video.created_at,
          updated_at: video.updated_at
        });
      });
    }

    // Apply date filter if specified
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      results.filter(result => {
        if (!result.created_at) return true;
        const resultDate = new Date(result.created_at);
        return resultDate >= startDate && resultDate <= endDate;
      });
    }

    // Sort results
    const sortBy = filters.sortBy || 'relevance';
    const sortOrder = filters.sortOrder || 'desc';
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = a.relevance - b.relevance;
          break;
        case 'date':
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = a.relevance - b.relevance;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    // Track search analytics (without storing personal data)
    console.log(`Search performed: "${query}" - ${results.length} results found`);

    return new Response(
      JSON.stringify({
        results: paginatedResults,
        total: results.length,
        hasMore: offset + limit < results.length,
        query,
        filters
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Search failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});