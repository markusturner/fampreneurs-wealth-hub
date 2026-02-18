export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          authorized_date: string | null
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          location: Json | null
          merchant_name: string | null
          metadata: Json | null
          pending: boolean | null
          transaction_date: string
          transaction_id: string
          transaction_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          authorized_date?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          location?: Json | null
          merchant_name?: string | null
          metadata?: Json | null
          pending?: boolean | null
          transaction_date: string
          transaction_id: string
          transaction_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          authorized_date?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          location?: Json | null
          merchant_name?: string | null
          metadata?: Json | null
          pending?: boolean | null
          transaction_date?: string
          transaction_id?: string
          transaction_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: number
          tutorial_video_url: string | null
          updated_at: string | null
          upgrade_video_url: string | null
        }
        Insert: {
          id?: number
          tutorial_video_url?: string | null
          updated_at?: string | null
          upgrade_video_url?: string | null
        }
        Update: {
          id?: number
          tutorial_video_url?: string | null
          updated_at?: string | null
          upgrade_video_url?: string | null
        }
        Relationships: []
      }
      bank_statement_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_statement_id: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          reference_number: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_statement_id?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          reference_number?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_statement_id?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          reference_number?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_transactions_bank_statement_id_fkey"
            columns: ["bank_statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_uploads: {
        Row: {
          error_message: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          processed_at: string | null
          processing_status: string | null
          storage_path: string | null
          transactions_extracted: number | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          error_message?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          storage_path?: string | null
          transactions_extracted?: number | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          error_message?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          storage_path?: string | null
          transactions_extracted?: number | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      business_goals: {
        Row: {
          created_at: string
          goals: string
          id: string
          target_revenue: number | null
          target_timeline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goals: string
          id?: string
          target_revenue?: number | null
          target_timeline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goals?: string
          id?: string
          target_revenue?: number | null
          target_timeline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_integrations: {
        Row: {
          access_token: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          associated_courses: string[] | null
          associated_group_calls: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          associated_courses?: string[] | null
          associated_group_calls?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          associated_courses?: string[] | null
          associated_group_calls?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          order_index?: number | null
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
          calendar_link: string | null
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
          calendar_link?: string | null
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
          calendar_link?: string | null
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
      coaching_call_recordings: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          platform: string | null
          recorded_at: string
          recording_type: string
          recording_url: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          platform?: string | null
          recorded_at?: string
          recording_type?: string
          recording_url: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          platform?: string | null
          recorded_at?: string
          recording_type?: string
          recording_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_call_bookings: {
        Row: {
          created_at: string | null
          current_situation: string | null
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          preferred_time_slots: string[] | null
          scheduled_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_situation?: string | null
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_time_slots?: string[] | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_situation?: string | null
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_time_slots?: string[] | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      community_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          post_id: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_id: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
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
          associated_courses: string[] | null
          associated_group_calls: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_premium: boolean
          is_private: boolean
          name: string
          order_index: number | null
          program_id: string | null
          updated_at: string
        }
        Insert: {
          associated_courses?: string[] | null
          associated_group_calls?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_premium?: boolean
          is_private?: boolean
          name: string
          order_index?: number | null
          program_id?: string | null
          updated_at?: string
        }
        Update: {
          associated_courses?: string[] | null
          associated_group_calls?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          is_private?: boolean
          name?: string
          order_index?: number | null
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
          audio_url: string | null
          category: string | null
          channel_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          parent_id: string | null
          program: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          channel_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          program?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          channel_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          program?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
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
      connected_accounts: {
        Row: {
          account_name: string
          account_subtype: string | null
          account_type: string
          avg_cost_basis: number | null
          balance: number | null
          created_at: string
          credentials: Json | null
          currency: string | null
          day_change: number | null
          day_change_percent: number | null
          external_account_id: string | null
          google_sheet_id: string | null
          holdings: Json | null
          id: string
          investment_type: string | null
          last_sync: string | null
          manual_balance_amount: number | null
          manual_balance_override: boolean | null
          metadata: Json | null
          plaid_access_token: string | null
          plaid_item_id: string | null
          provider: string
          status: string | null
          total_shares: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_subtype?: string | null
          account_type: string
          avg_cost_basis?: number | null
          balance?: number | null
          created_at?: string
          credentials?: Json | null
          currency?: string | null
          day_change?: number | null
          day_change_percent?: number | null
          external_account_id?: string | null
          google_sheet_id?: string | null
          holdings?: Json | null
          id?: string
          investment_type?: string | null
          last_sync?: string | null
          manual_balance_amount?: number | null
          manual_balance_override?: boolean | null
          metadata?: Json | null
          plaid_access_token?: string | null
          plaid_item_id?: string | null
          provider: string
          status?: string | null
          total_shares?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          avg_cost_basis?: number | null
          balance?: number | null
          created_at?: string
          credentials?: Json | null
          currency?: string | null
          day_change?: number | null
          day_change_percent?: number | null
          external_account_id?: string | null
          google_sheet_id?: string | null
          holdings?: Json | null
          id?: string
          investment_type?: string | null
          last_sync?: string | null
          manual_balance_amount?: number | null
          manual_balance_override?: boolean | null
          metadata?: Json | null
          plaid_access_token?: string | null
          plaid_item_id?: string | null
          provider?: string
          status?: string | null
          total_shares?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_certificates: {
        Row: {
          certificate_number: string
          completion_date: string
          course_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          completion_date?: string
          course_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          completion_date?: string
          course_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          lesson_id: string | null
          order_index: number | null
          resource_type: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          lesson_id?: string | null
          order_index?: number | null
          resource_type?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          lesson_id?: string | null
          order_index?: number | null
          resource_type?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_videos: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          module_id: string | null
          order_index: number | null
          title: string
          updated_at: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          module_id?: string | null
          order_index?: number | null
          title: string
          updated_at?: string
          video_type: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          module_id?: string | null
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
          {
            foreignKeyName: "course_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
          status: string
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
          status?: string
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
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_content: Json | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_content?: Json | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_content?: Json | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enhanced_notifications: {
        Row: {
          action_required: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          notification_type: string
          priority: string
          recipient_id: string
          reference_id: string | null
          reference_table: string | null
          sender_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_required?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type: string
          priority?: string
          recipient_id: string
          reference_id?: string | null
          reference_table?: string | null
          sender_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_required?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          priority?: string
          recipient_id?: string
          reference_id?: string | null
          reference_table?: string | null
          sender_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_code_usage_log: {
        Row: {
          code_id: string
          id: string
          ip_address: string | null
          used_at: string
          used_by: string
          user_agent: string | null
        }
        Insert: {
          code_id: string
          id?: string
          ip_address?: string | null
          used_at?: string
          used_by: string
          user_agent?: string | null
        }
        Update: {
          code_id?: string
          id?: string
          ip_address?: string | null
          used_at?: string
          used_by?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_code_usage_log_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "family_secret_codes"
            referencedColumns: ["id"]
          },
        ]
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
      family_governance_policies: {
        Row: {
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          policy_type: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          policy_type: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          policy_type?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      family_member_credentials: {
        Row: {
          created_at: string
          email: string
          family_member_id: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          role: Database["public"]["Enums"]["family_member_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          family_member_id: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["family_member_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          family_member_id?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["family_member_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_member_credentials_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          access_count: number | null
          access_level: string | null
          added_by: string
          approved_at: string | null
          approved_by: string | null
          birthday: string | null
          company: string | null
          created_at: string | null
          data_classification: string | null
          department: string | null
          email: string | null
          encrypted_notes: string | null
          family_position: string | null
          full_name: string
          governance_branch: string | null
          id: string
          invitation_sent_at: string | null
          is_invited: boolean | null
          joined_at: string | null
          last_accessed: string | null
          notes: string | null
          office_role: string | null
          office_services: string[] | null
          phone: string | null
          relationship_to_family: string | null
          requires_approval: boolean | null
          status: string | null
          trust_positions: string[] | null
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          access_level?: string | null
          added_by: string
          approved_at?: string | null
          approved_by?: string | null
          birthday?: string | null
          company?: string | null
          created_at?: string | null
          data_classification?: string | null
          department?: string | null
          email?: string | null
          encrypted_notes?: string | null
          family_position?: string | null
          full_name: string
          governance_branch?: string | null
          id?: string
          invitation_sent_at?: string | null
          is_invited?: boolean | null
          joined_at?: string | null
          last_accessed?: string | null
          notes?: string | null
          office_role?: string | null
          office_services?: string[] | null
          phone?: string | null
          relationship_to_family?: string | null
          requires_approval?: boolean | null
          status?: string | null
          trust_positions?: string[] | null
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          access_level?: string | null
          added_by?: string
          approved_at?: string | null
          approved_by?: string | null
          birthday?: string | null
          company?: string | null
          created_at?: string | null
          data_classification?: string | null
          department?: string | null
          email?: string | null
          encrypted_notes?: string | null
          family_position?: string | null
          full_name?: string
          governance_branch?: string | null
          id?: string
          invitation_sent_at?: string | null
          is_invited?: boolean | null
          joined_at?: string | null
          last_accessed?: string | null
          notes?: string | null
          office_role?: string | null
          office_services?: string[] | null
          phone?: string | null
          relationship_to_family?: string | null
          requires_approval?: boolean | null
          status?: string | null
          trust_positions?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      family_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_notifications: {
        Row: {
          created_at: string
          family_member_id: string | null
          id: string
          is_read: boolean
          meeting_date: string | null
          meeting_id: string | null
          meeting_time: string | null
          message: string
          notification_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_member_id?: string | null
          id?: string
          is_read?: boolean
          meeting_date?: string | null
          meeting_id?: string | null
          meeting_time?: string | null
          message: string
          notification_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_member_id?: string | null
          id?: string
          is_read?: boolean
          meeting_date?: string | null
          meeting_id?: string | null
          meeting_time?: string | null
          message?: string
          notification_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_notifications_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_office_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          risk_level: string | null
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          risk_level?: string | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          risk_level?: string | null
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_office_data_classification: {
        Row: {
          classification_level: string
          column_name: string
          created_at: string | null
          id: string
          masking_rule: string | null
          retention_period_days: number | null
          table_name: string
        }
        Insert: {
          classification_level: string
          column_name: string
          created_at?: string | null
          id?: string
          masking_rule?: string | null
          retention_period_days?: number | null
          table_name: string
        }
        Update: {
          classification_level?: string
          column_name?: string
          created_at?: string | null
          id?: string
          masking_rule?: string | null
          retention_period_days?: number | null
          table_name?: string
        }
        Relationships: []
      }
      family_office_members: {
        Row: {
          access_level: string | null
          added_by: string
          company: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          joined_at: string | null
          notes: string | null
          phone: string | null
          role: string | null
          specialties: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          added_by: string
          company?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          joined_at?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          added_by?: string
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          joined_at?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          specialties?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_office_privacy_preferences: {
        Row: {
          analytics_consent: boolean | null
          consent_given_at: string | null
          data_deletion_requested: boolean | null
          data_deletion_requested_at: string | null
          data_export_allowed: boolean | null
          data_sharing_consent: boolean | null
          id: string
          last_updated: string | null
          marketing_consent: boolean | null
          user_id: string | null
        }
        Insert: {
          analytics_consent?: boolean | null
          consent_given_at?: string | null
          data_deletion_requested?: boolean | null
          data_deletion_requested_at?: string | null
          data_export_allowed?: boolean | null
          data_sharing_consent?: boolean | null
          id?: string
          last_updated?: string | null
          marketing_consent?: boolean | null
          user_id?: string | null
        }
        Update: {
          analytics_consent?: boolean | null
          consent_given_at?: string | null
          data_deletion_requested?: boolean | null
          data_deletion_requested_at?: string | null
          data_export_allowed?: boolean | null
          data_sharing_consent?: boolean | null
          id?: string
          last_updated?: string | null
          marketing_consent?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_office_secure_documents: {
        Row: {
          access_count: number | null
          checksum: string | null
          classification_level: string | null
          created_at: string | null
          encrypted_filename: string
          encryption_key_id: string | null
          expires_at: string | null
          file_size: number | null
          id: string
          last_accessed: string | null
          mime_type: string | null
          original_filename: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_count?: number | null
          checksum?: string | null
          classification_level?: string | null
          created_at?: string | null
          encrypted_filename: string
          encryption_key_id?: string | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          last_accessed?: string | null
          mime_type?: string | null
          original_filename: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_count?: number | null
          checksum?: string | null
          classification_level?: string | null
          created_at?: string | null
          encrypted_filename?: string
          encryption_key_id?: string | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          last_accessed?: string | null
          mime_type?: string | null
          original_filename?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_office_security_settings: {
        Row: {
          allowed_ip_addresses: string[] | null
          backup_frequency: string | null
          created_at: string | null
          data_retention_days: number | null
          encryption_enabled: boolean | null
          id: string
          last_security_review: string | null
          password_change_required_at: string | null
          require_mfa: boolean | null
          session_timeout_minutes: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allowed_ip_addresses?: string[] | null
          backup_frequency?: string | null
          created_at?: string | null
          data_retention_days?: number | null
          encryption_enabled?: boolean | null
          id?: string
          last_security_review?: string | null
          password_change_required_at?: string | null
          require_mfa?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_ip_addresses?: string[] | null
          backup_frequency?: string | null
          created_at?: string | null
          data_retention_days?: number | null
          encryption_enabled?: boolean | null
          id?: string
          last_security_review?: string | null
          password_change_required_at?: string | null
          require_mfa?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_secret_codes: {
        Row: {
          access_level: string
          code: string
          created_at: string
          created_by: string
          current_uses: number
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          access_level?: string
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          description: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          access_level?: string
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      family_votes: {
        Row: {
          id: string
          proposal_id: string
          user_id: string
          vote_choice: string
          voted_at: string | null
        }
        Insert: {
          id?: string
          proposal_id: string
          user_id: string
          vote_choice: string
          voted_at?: string | null
        }
        Update: {
          id?: string
          proposal_id?: string
          user_id?: string
          vote_choice?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "family_voting_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      family_voting_proposals: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          proposal_type: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
          voting_deadline: string
          voting_options: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          proposal_type: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
          voting_deadline: string
          voting_options?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          proposal_type?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          voting_deadline?: string
          voting_options?: Json
        }
        Relationships: []
      }
      featured_courses: {
        Row: {
          course_id: string
          created_at: string
          featured_at: string
          featured_by: string
          id: string
          is_featured: boolean
          unfeatured_at: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          featured_at?: string
          featured_by: string
          id?: string
          is_featured?: boolean
          unfeatured_at?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          featured_at?: string
          featured_by?: string
          id?: string
          is_featured?: boolean
          unfeatured_at?: string | null
          updated_at?: string
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
          additional_comments: string | null
          coach_response_rating: number | null
          created_at: string
          current_module: string | null
          experience_explanation: string | null
          full_name: string | null
          id: string
          improvement_suggestions: string | null
          overall_experience_rating: number | null
          retreat_interest: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_comments?: string | null
          coach_response_rating?: number | null
          created_at?: string
          current_module?: string | null
          experience_explanation?: string | null
          full_name?: string | null
          id?: string
          improvement_suggestions?: string | null
          overall_experience_rating?: number | null
          retreat_interest?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_comments?: string | null
          coach_response_rating?: number | null
          created_at?: string
          current_module?: string | null
          experience_explanation?: string | null
          full_name?: string | null
          id?: string
          improvement_suggestions?: string | null
          overall_experience_rating?: number | null
          retreat_interest?: string | null
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
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
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
      governance_onboarding: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
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
      lesson_completions: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_reminders: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          reminder_type: string
          scheduled_for: string
          sent: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          reminder_type: string
          scheduled_for: string
          sent?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          reminder_type?: string
          scheduled_for?: string
          sent?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      meeting_types: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          attendees: string[] | null
          calendar_link: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string
          meeting_type: string | null
          scribe_id: string | null
          scribe_notes: string | null
          status: string
          title: string
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          attendees?: string[] | null
          calendar_link?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_time: string
          meeting_type?: string | null
          scribe_id?: string | null
          scribe_notes?: string | null
          status?: string
          title: string
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          attendees?: string[] | null
          calendar_link?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string
          meeting_type?: string | null
          scribe_id?: string | null
          scribe_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
          zoom_link?: string | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          reference_id: string | null
          sender_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          reference_id?: string | null
          sender_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          reference_id?: string | null
          sender_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      office_roles_catalog: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          name: string
          services: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          name: string
          services?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          name?: string
          services?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      office_services_catalog: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
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
      onboarding_responses: {
        Row: {
          anything_else: string | null
          biggest_hesitation: string
          completed_at: string
          created_at: string
          decision_reason: string
          final_push: string
          first_touchpoint: string
          full_name: string
          id: string
          improvement_suggestion: string
          investment_reason: string
          join_elaboration: string
          mailing_address: string
          pre_call_conviction: string
          specific_content: string
          time_to_decide: string
          tshirt_size: string
          updated_at: string
          user_id: string
          why_choose_me: string
          why_markus: string
        }
        Insert: {
          anything_else?: string | null
          biggest_hesitation: string
          completed_at?: string
          created_at?: string
          decision_reason: string
          final_push: string
          first_touchpoint: string
          full_name: string
          id?: string
          improvement_suggestion: string
          investment_reason: string
          join_elaboration: string
          mailing_address: string
          pre_call_conviction: string
          specific_content: string
          time_to_decide: string
          tshirt_size: string
          updated_at?: string
          user_id: string
          why_choose_me: string
          why_markus: string
        }
        Update: {
          anything_else?: string | null
          biggest_hesitation?: string
          completed_at?: string
          created_at?: string
          decision_reason?: string
          final_push?: string
          first_touchpoint?: string
          full_name?: string
          id?: string
          improvement_suggestion?: string
          investment_reason?: string
          join_elaboration?: string
          mailing_address?: string
          pre_call_conviction?: string
          specific_content?: string
          time_to_decide?: string
          tshirt_size?: string
          updated_at?: string
          user_id?: string
          why_choose_me?: string
          why_markus?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string | null
          id: string
          page_path: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
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
      payment_reminders: {
        Row: {
          amount: number
          created_at: string
          days_overdue: number
          id: string
          last_reminder_sent: string | null
          status: string
          updated_at: string
          user_email: string
        }
        Insert: {
          amount?: number
          created_at?: string
          days_overdue?: number
          id?: string
          last_reminder_sent?: string | null
          status?: string
          updated_at?: string
          user_email: string
        }
        Update: {
          amount?: number
          created_at?: string
          days_overdue?: number
          id?: string
          last_reminder_sent?: string | null
          status?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      payment_reminders_sent: {
        Row: {
          created_at: string | null
          id: string
          next_payment_date: string
          reminder_type: string
          sent_at: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          next_payment_date: string
          reminder_type: string
          sent_at?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          next_payment_date?: string
          reminder_type?: string
          sent_at?: string | null
          subscription_id?: string
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
          activation_point: string | null
          admin_permissions: string[] | null
          avatar_url: string | null
          backend_cash_collected: number | null
          bio: string | null
          cover_photo_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          facebook_url: string | null
          family_role: string | null
          first_name: string | null
          id: string
          instagram_url: string | null
          investment_amount: number | null
          is_accountability_partner: boolean | null
          is_admin: boolean | null
          is_moderator: boolean | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          membership_type: string | null
          occupation: string | null
          phone: string | null
          profile_photo_uploaded: boolean
          program_name: string | null
          updated_at: string
          user_id: string
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          accountability_specialties?: string[] | null
          activation_point?: string | null
          admin_permissions?: string[] | null
          avatar_url?: string | null
          backend_cash_collected?: number | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          investment_amount?: number | null
          is_accountability_partner?: boolean | null
          is_admin?: boolean | null
          is_moderator?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          membership_type?: string | null
          occupation?: string | null
          phone?: string | null
          profile_photo_uploaded?: boolean
          program_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          accountability_specialties?: string[] | null
          activation_point?: string | null
          admin_permissions?: string[] | null
          avatar_url?: string | null
          backend_cash_collected?: number | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          facebook_url?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          instagram_url?: string | null
          investment_amount?: number | null
          is_accountability_partner?: boolean | null
          is_admin?: boolean | null
          is_moderator?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          membership_type?: string | null
          occupation?: string | null
          phone?: string | null
          profile_photo_uploaded?: boolean
          program_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          youtube_url?: string | null
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          is_granted: boolean
          permission_description: string | null
          permission_key: string
          permission_name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_granted?: boolean
          permission_description?: string | null
          permission_key: string
          permission_name: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_granted?: boolean
          permission_description?: string | null
          permission_key?: string
          permission_name?: string
          role?: string
          updated_at?: string
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
      saved_videos: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          attendance_duration_minutes: number | null
          attended: boolean
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          session_id: string
          session_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_duration_minutes?: number | null
          attended?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id: string
          session_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_duration_minutes?: number | null
          attended?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string
          session_type?: string
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
      stories: {
        Row: {
          caption: string | null
          content_type: string
          content_url: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          content_type: string
          content_url: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          content_type?: string
          content_url?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          community_join_date: string | null
          created_at: string
          early_payment_date: string | null
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_period: string | null
          subscription_tier: string | null
          trial_days_remaining: number | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          community_join_date?: string | null
          created_at?: string
          early_payment_date?: string | null
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_period?: string | null
          subscription_tier?: string | null
          trial_days_remaining?: number | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          community_join_date?: string | null
          created_at?: string
          early_payment_date?: string | null
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_period?: string | null
          subscription_tier?: string | null
          trial_days_remaining?: number | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          category_type: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tutorial_videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          duration: string | null
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          method: string
          phone_number: string | null
          secret: string | null
          updated_at: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          id?: string
          method: string
          phone_number?: string | null
          secret?: string | null
          updated_at?: string
          verified_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          method?: string
          phone_number?: string | null
          secret?: string | null
          updated_at?: string
          verified_at?: string
        }
        Relationships: []
      }
      user_course_lists: {
        Row: {
          added_at: string
          course_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          course_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          course_id?: string
          id?: string
          user_id?: string
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          method: string
          phone_number: string | null
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          method: string
          phone_number?: string | null
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          method?: string
          phone_number?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      video_call_rooms: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          privacy: string
          room_name: string
          room_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          privacy?: string
          room_name: string
          room_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          privacy?: string
          room_name?: string
          room_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
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
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      weekly_checkin_notifications: {
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
      weekly_checkin_responses: {
        Row: {
          completed_main_action: boolean | null
          completed_sessions: boolean | null
          created_at: string
          energy_level: number | null
          full_name: string
          grateful_for: string | null
          id: string
          potential_obstacles: string | null
          roadblocks_faced: string | null
          session_completion_notes: string | null
          setbacks_rating: number | null
          training_rating: number | null
          updated_at: string
          user_id: string
          week_ending: string
          weekly_goals: string | null
        }
        Insert: {
          completed_main_action?: boolean | null
          completed_sessions?: boolean | null
          created_at?: string
          energy_level?: number | null
          full_name: string
          grateful_for?: string | null
          id?: string
          potential_obstacles?: string | null
          roadblocks_faced?: string | null
          session_completion_notes?: string | null
          setbacks_rating?: number | null
          training_rating?: number | null
          updated_at?: string
          user_id: string
          week_ending: string
          weekly_goals?: string | null
        }
        Update: {
          completed_main_action?: boolean | null
          completed_sessions?: boolean | null
          created_at?: string
          energy_level?: number | null
          full_name?: string
          grateful_for?: string | null
          id?: string
          potential_obstacles?: string | null
          roadblocks_faced?: string | null
          session_completion_notes?: string | null
          setbacks_rating?: number | null
          training_rating?: number | null
          updated_at?: string
          user_id?: string
          week_ending?: string
          weekly_goals?: string | null
        }
        Relationships: []
      }
      zapier_webhooks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
          webhook_name: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
          webhook_name?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
          webhook_name?: string | null
          webhook_url?: string
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
          assigner_user_id: string
          specialties?: string[]
          target_user_id: string
        }
        Returns: undefined
      }
      assign_admin_role: {
        Args: { assigner_user_id: string; target_user_id: string }
        Returns: undefined
      }
      assign_moderator_role: {
        Args: { assigner_user_id: string; target_user_id: string }
        Returns: undefined
      }
      assign_user_role: {
        Args: {
          assigner_user_id: string
          new_role: Database["public"]["Enums"]["member_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      calculate_member_score: {
        Args: { target_user_id: string }
        Returns: number
      }
      can_access_family_data: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: boolean
      }
      can_access_family_member_safe: {
        Args: { member_id: string }
        Returns: boolean
      }
      can_join_group: {
        Args: { group_id: string; user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { target_user_id: string }; Returns: boolean }
      check_portfolio_access_rate_limit: {
        Args: { user_id: string }
        Returns: boolean
      }
      check_skool_membership: {
        Args: { email_address: string }
        Returns: {
          is_member: boolean
          member_data: Json
        }[]
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_sensitive_audit_logs: { Args: never; Returns: undefined }
      generate_certificate_number: { Args: never; Returns: string }
      get_account_summary: { Args: { target_user_id?: string }; Returns: Json }
      get_admin_profile_data: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_coach_admin_details: { Args: { coach_id: string }; Returns: Json }
      get_coach_for_booking: { Args: { coach_id: string }; Returns: Json }
      get_community_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          first_initial: string
          user_id: string
        }[]
      }
      get_community_profile_safe: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_community_profiles:
        | {
            Args: never
            Returns: {
              avatar_url: string
              display_name: string
              first_initial: string
              user_id: string
            }[]
          }
        | {
            Args: { p_user_ids: string[] }
            Returns: {
              avatar_url: string
              display_name: string
              first_initial: string
              user_id: string
            }[]
          }
      get_family_member_count_secure: { Args: never; Returns: number }
      get_masked_portfolio_summary: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_overdue_payments: {
        Args: never
        Returns: {
          amount: number
          days_overdue: number
          id: string
          last_reminder_sent: string
          user_email: string
        }[]
      }
      get_portfolio_summary: { Args: { target_user_id: string }; Returns: Json }
      get_public_advisor_listing: {
        Args: never
        Returns: {
          bio: string
          company: string
          full_name: string
          id: string
          is_active: boolean
          specialties: string[]
          title: string
          website: string
          years_experience: number
        }[]
      }
      get_public_profile: { Args: { target_user_id: string }; Returns: Json }
      get_public_profile_safe: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_safe_profile_info: { Args: { target_user_id: string }; Returns: Json }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["member_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["member_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_accountability_partner: { Args: never; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_owner: { Args: never; Returns: boolean }
      is_family_office_only_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { group_id: string; user_id: string }
        Returns: boolean
      }
      is_user_admin: { Args: { user_id?: string }; Returns: boolean }
      is_user_admin_for_groups: { Args: never; Returns: boolean }
      log_family_office_action: {
        Args: {
          action_name: string
          metadata?: Json
          new_values?: Json
          old_values?: Json
          record_id: string
          risk_level?: string
          table_name: string
        }
        Returns: string
      }
      mask_sensitive_data: {
        Args: { p_data: string; p_masking_type?: string }
        Returns: string
      }
      notify_family_about_meeting: {
        Args: {
          meeting_date: string
          meeting_details?: string
          meeting_title: string
        }
        Returns: Json
      }
      notify_family_members_about_meeting: {
        Args: {
          creator_user_id: string
          meeting_date: string
          meeting_id: string
          meeting_time: string
          meeting_title: string
        }
        Returns: number
      }
      remove_user_role: {
        Args: {
          remover_user_id: string
          role_to_remove: Database["public"]["Enums"]["member_role"]
          target_user_id: string
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
      user_needs_weekly_checkin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      users_are_family_members: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      validate_admin_financial_access: {
        Args: { admin_user_id: string }
        Returns: boolean
      }
      validate_family_code: {
        Args: { p_code: string; p_ip_address?: string; p_user_agent?: string }
        Returns: Json
      }
    }
    Enums: {
      family_member_role: "family_office_only"
      member_role:
        | "member"
        | "billing_manager"
        | "admin"
        | "moderator"
        | "group_owner"
        | "accountability_partner"
        | "owner"
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
      family_member_role: ["family_office_only"],
      member_role: [
        "member",
        "billing_manager",
        "admin",
        "moderator",
        "group_owner",
        "accountability_partner",
        "owner",
      ],
    },
  },
} as const
