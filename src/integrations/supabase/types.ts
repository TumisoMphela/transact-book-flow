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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          reason: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "availability_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "availability_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_top_tutors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          duration_hours: number
          id: string
          notes: string | null
          session_date: string
          status: string
          student_id: string
          subject: string
          total_amount: number
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_hours?: number
          id?: string
          notes?: string | null
          session_date: string
          status?: string
          student_id: string
          subject: string
          total_amount: number
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_hours?: number
          id?: string
          notes?: string | null
          session_date?: string
          status?: string
          student_id?: string
          subject?: string
          total_amount?: number
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_top_tutors"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_top_tutors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      material_downloads: {
        Row: {
          downloaded_at: string
          id: string
          material_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          material_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          material_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_downloads_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_downloads_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_top_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          material_id: string
          student_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          material_id: string
          student_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          material_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_top_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          download_count: number | null
          file_size_mb: number | null
          file_type: string
          file_url: string
          id: string
          is_approved: boolean | null
          price: number | null
          rejection_reason: string | null
          subject: string
          title: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_size_mb?: number | null
          file_type: string
          file_url: string
          id?: string
          is_approved?: boolean | null
          price?: number | null
          rejection_reason?: string | null
          subject: string
          title: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_size_mb?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_approved?: boolean | null
          price?: number | null
          rejection_reason?: string | null
          subject?: string
          title?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "materials_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "materials_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_top_tutors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sessions: {
        Row: {
          amount_paid: number | null
          booking_id: string
          created_at: string
          id: string
          payment_status: string
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          booking_id: string
          created_at?: string
          id?: string
          payment_status?: string
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          booking_id?: string
          created_at?: string
          id?: string
          payment_status?: string
          stripe_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          education: string | null
          email: string | null
          email_confirmed_at: string | null
          experience_years: number | null
          first_name: string | null
          hourly_rate: number | null
          id: string
          is_verified: boolean | null
          last_name: string | null
          location: string | null
          phone: string | null
          profile_image_url: string | null
          qualifications: string[] | null
          subject_interests: string[] | null
          subjects: string[] | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          experience_years?: number | null
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          profile_image_url?: string | null
          qualifications?: string[] | null
          subject_interests?: string[] | null
          subjects?: string[] | null
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          experience_years?: number | null
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          profile_image_url?: string | null
          qualifications?: string[] | null
          subject_interests?: string[] | null
          subjects?: string[] | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          student_id: string
          tutor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_top_tutors"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_top_tutors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      session_events: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          event_type: string
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_tutor_profiles: {
        Row: {
          bio: string | null
          education: string | null
          experience_years: number | null
          first_name: string | null
          hourly_rate: number | null
          is_verified: boolean | null
          last_name: string | null
          location: string | null
          profile_image_url: string | null
          subjects: string[] | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          education?: string | null
          experience_years?: number | null
          first_name?: string | null
          hourly_rate?: number | null
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          profile_image_url?: string | null
          subjects?: string[] | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          education?: string | null
          experience_years?: number | null
          first_name?: string | null
          hourly_rate?: number | null
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          profile_image_url?: string | null
          subjects?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_bookings_daily: {
        Row: {
          bookings: number | null
          day: string | null
        }
        Relationships: []
      }
      v_revenue_daily: {
        Row: {
          day: string | null
          revenue: number | null
        }
        Relationships: []
      }
      v_top_materials: {
        Row: {
          id: string | null
          sales: number | null
          subject: string | null
          title: string | null
        }
        Relationships: []
      }
      v_top_tutors: {
        Row: {
          first_name: string | null
          last_name: string | null
          revenue: number | null
          sessions: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_bookings_daily: {
        Args: Record<PropertyKey, never>
        Returns: {
          bookings: number
          day: string
        }[]
      }
      get_revenue_daily: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string
          revenue: number
        }[]
      }
      get_top_materials: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          sales: number
          subject: string
          title: string
        }[]
      }
      get_top_tutors: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_name: string
          last_name: string
          revenue: number
          sessions: number
          user_id: string
        }[]
      }
      get_tutor_average_rating: {
        Args: { tutor_user_id: string }
        Returns: number
      }
      get_tutor_review_count: {
        Args: { tutor_user_id: string }
        Returns: number
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_within_availability: {
        Args: { _end: string; _start: string; _tutor: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "tutor" | "student"
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
      app_role: ["admin", "tutor", "student"],
    },
  },
} as const
