export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_assignments: {
        Row: {
          assigned_at: string
          coach_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          coach_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          coach_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          added_by: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          phone: string | null
          specialties: string[] | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          added_by: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          added_by?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_premium: boolean
          is_private: boolean
          name: string
          program_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_premium?: boolean
          is_private?: boolean
          name: string
          program_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          is_private?: boolean
          name?: string
          program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_groups_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string | null
          enrolled_at: string
          id: string
          progress: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string
          id?: string
          progress?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_videos: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          order_index: number | null
          title: string
          updated_at: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
          video_type: string
          video_url?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          instructor: string | null
          level: string | null
          price: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          level?: string | null
          price?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          level?: string | null
          price?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_documents: {
        Row: {
          category: string
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          category: string
          document_name: string
          document_type: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          category?: string
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          added_by: string
          created_at: string | null
          email: string | null
          family_position: string
          full_name: string
          id: string
          invitation_sent_at: string | null
          is_invited: boolean | null
          joined_at: string | null
          notes: string | null
          phone: string | null
          relationship_to_family: string | null
          status: string | null
          trust_positions: string[] | null
          updated_at: string | null
        }
        Insert: {
          added_by: string
          created_at?: string | null
          email?: string | null
          family_position: string
          full_name: string
          id?: string
          invitation_sent_at?: string | null
          is_invited?: boolean | null
          joined_at?: string | null
          notes?: string | null
          phone?: string | null
          relationship_to_family?: string | null
          status?: string | null
          trust_positions?: string[] | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string
          created_at?: string | null
          email?: string | null
          family_position?: string
          full_name?: string
          id?: string
          invitation_sent_at?: string | null
          is_invited?: boolean | null
          joined_at?: string | null
          notes?: string | null
          phone?: string | null
          relationship_to_family?: string | null
          status?: string | null
          trust_positions?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_notifications: {
        Row: {
          created_at: string
          id: string
          last_notification_sent: string
          notification_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_notification_sent?: string
          notification_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_notification_sent?: string
          notification_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          additional_feedback: string | null
          community_support: number | null
          created_at: string
          ease_of_use: number | null
          feature_usefulness: number | null
          id: string
          improvement_suggestions: string | null
          overall_satisfaction: number | null
          program_effectiveness: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_feedback?: string | null
          community_support?: number | null
          created_at?: string
          ease_of_use?: number | null
          feature_usefulness?: number | null
          id?: string
          improvement_suggestions?: string | null
          overall_satisfaction?: number | null
          program_effectiveness?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_feedback?: string | null
          community_support?: number | null
          created_at?: string
          ease_of_use?: number | null
          feature_usefulness?: number | null
          id?: string
          improvement_suggestions?: string | null
          overall_satisfaction?: number | null
          program_effectiveness?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_advisors: {
        Row: {
          added_by: string
          bio: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          license_number: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method: string | null
          specialties: string[] | null
          title: string | null
          updated_at: string | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          added_by: string
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          added_by?: string
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      fulfillment_stages: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          stage_order: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          stage_order?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          stage_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      group_call_quotas: {
        Row: {
          created_at: string
          group_calls_limit: number
          group_calls_used: number
          group_id: string
          id: string
          individual_calls_limit: number
          individual_calls_used: number
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_calls_limit?: number
          group_calls_used?: number
          group_id: string
          id?: string
          individual_calls_limit?: number
          individual_calls_used?: number
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_calls_limit?: number
          group_calls_used?: number
          group_id?: string
          id?: string
          individual_calls_limit?: number
          individual_calls_used?: number
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_call_quotas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_coaching_sessions: {
        Row: {
          coach_avatar_url: string | null
          coach_name: string
          created_at: string
          created_by: string
          current_participants: number | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_recurring: boolean | null
          max_participants: number | null
          meeting_id: string | null
          meeting_password: string | null
          meeting_type: string
          meeting_url: string
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          session_date: string
          session_time: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          coach_avatar_url?: string | null
          coach_name: string
          created_at?: string
          created_by: string
          current_participants?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          max_participants?: number | null
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_type?: string
          meeting_url: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          session_date: string
          session_time: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          coach_avatar_url?: string | null
          coach_name?: string
          created_at?: string
          created_by?: string
          current_participants?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_recurring?: boolean | null
          max_participants?: number | null
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_type?: string
          meeting_url?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          session_date?: string
          session_time?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_courses: {
        Row: {
          course_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_courses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          file_url: string | null
          group_id: string
          id: string
          message_type: string
          reply_to: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          file_url?: string | null
          group_id: string
          id?: string
          message_type?: string
          reply_to?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          file_url?: string | null
          group_id?: string
          id?: string
          message_type?: string
          reply_to?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_coaching_sessions: {
        Row: {
          client_id: string | null
          coach_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          meeting_id: string | null
          meeting_password: string | null
          meeting_type: string
          meeting_url: string
          notes: string | null
          session_date: string
          session_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_type?: string
          meeting_url: string
          notes?: string | null
          session_date: string
          session_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_id?: string | null
          meeting_password?: string | null
          meeting_type?: string
          meeting_url?: string
          notes?: string | null
          session_date?: string
          session_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "individual_coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "financial_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_portfolios: {
        Row: {
          cash_balance: number | null
          created_at: string
          day_change: number | null
          day_change_percent: number | null
          id: string
          last_updated: string | null
          platform_id: string
          positions: Json | null
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_balance?: number | null
          created_at?: string
          day_change?: number | null
          day_change_percent?: number | null
          id?: string
          last_updated?: string | null
          platform_id: string
          positions?: Json | null
          total_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_balance?: number | null
          created_at?: string
          day_change?: number | null
          day_change_percent?: number | null
          id?: string
          last_updated?: string | null
          platform_id?: string
          positions?: Json | null
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_polls: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          message_id: string
          multiple_choice: boolean
          options: Json
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          message_id: string
          multiple_choice?: boolean
          options: Json
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          message_id?: string
          multiple_choice?: boolean
          options?: Json
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_emails: {
        Row: {
          created_at: string
          email_content: string
          email_status: string
          email_subject: string
          email_type: string
          id: string
          sent_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_content: string
          email_status?: string
          email_subject: string
          email_type: string
          id?: string
          sent_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_content?: string
          email_status?: string
          email_subject?: string
          email_type?: string
          id?: string
          sent_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paid_session_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          session_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          session_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          session_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "message_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accountability_specialties: string[] | null
          admin_permissions: string[] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          family_role: string | null
          first_name: string | null
          id: string
          is_accountability_partner: boolean | null
          is_admin: boolean | null
          is_moderator: boolean | null
          last_name: string | null
          occupation: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accountability_specialties?: string[] | null
          admin_permissions?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          is_accountability_partner?: boolean | null
          is_admin?: boolean | null
          is_moderator?: boolean | null
          last_name?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accountability_specialties?: string[] | null
          admin_permissions?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          is_accountability_partner?: boolean | null
          is_admin?: boolean | null
          is_moderator?: boolean | null
          last_name?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          max_groups: number | null
          monthly_group_calls: number | null
          monthly_individual_calls: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_groups?: number | null
          monthly_group_calls?: number | null
          monthly_individual_calls?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_groups?: number | null
          monthly_group_calls?: number | null
          monthly_individual_calls?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_metrics: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          subscription_tier: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          subscription_tier?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          subscription_tier?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      satisfaction_scores: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          notes: string | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type?: string
          id?: string
          notes?: string | null
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          notes?: string | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          session_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          session_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          session_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_fulfillment_progress: {
        Row: {
          created_at: string | null
          id: string
          moved_by: string | null
          moved_to_stage_at: string | null
          notes: string | null
          stage_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          moved_by?: string | null
          moved_to_stage_at?: string | null
          notes?: string | null
          stage_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          moved_by?: string | null
          moved_to_stage_at?: string | null
          notes?: string | null
          stage_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fulfillment_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "fulfillment_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_session_quotas: {
        Row: {
          complimentary_sessions_used: number
          created_at: string
          id: string
          monthly_complimentary_sessions: number
          period_end: string
          period_start: string
          program_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          complimentary_sessions_used?: number
          created_at?: string
          id?: string
          monthly_complimentary_sessions?: number
          period_end: string
          period_start: string
          program_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          complimentary_sessions_used?: number
          created_at?: string
          id?: string
          monthly_complimentary_sessions?: number
          period_end?: string
          period_start?: string
          program_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_documents: {
        Row: {
          created_at: string
          document_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          updated_at: string
          uploaded_by: string
          video_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by: string
          video_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_accountability_role: {
        Args: {
          target_user_id: string
          assigner_user_id: string
          specialties?: string[]
        }
        Returns: undefined
      }
      assign_admin_role: {
        Args: { target_user_id: string; assigner_user_id: string }
        Returns: undefined
      }
      assign_moderator_role: {
        Args: { target_user_id: string; assigner_user_id: string }
        Returns: undefined
      }
      assign_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["member_role"]
          assigner_user_id: string
        }
        Returns: undefined
      }
      can_join_group: {
        Args: { group_id: string; user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { group_id: string; user_id: string }
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      notify_family_about_meeting: {
        Args: {
          meeting_title: string
          meeting_date: string
          meeting_details?: string
        }
        Returns: Json
      }
      remove_user_role: {
        Args: {
          target_user_id: string
          role_to_remove: Database["public"]["Enums"]["member_role"]
          remover_user_id: string
        }
        Returns: undefined
      }
      user_has_premium_subscription: {
        Args: { user_id: string }
        Returns: boolean
      }
      user_needs_feedback_notification: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      member_role:
        | "member"
        | "billing_manager"
        | "admin"
        | "moderator"
        | "group_owner"
        | "accountability_partner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_role: [
        "member",
        "billing_manager",
        "admin",
        "moderator",
        "group_owner",
        "accountability_partner",
      ],
    },
  },
} as const
