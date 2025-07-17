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
          updated_at?: string
        }
        Relationships: []
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
          last_name?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
