export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clinical_exams: {
        Row: {
          clinic_name: string | null
          created_at: string
          document_url: string | null
          exam_date: string
          exam_type: string | null
          findings: string | null
          follow_up_date: string | null
          heart_rate: number | null
          id: string
          notes: string | null
          pet_id: string
          respiratory_rate: number | null
          temperature: number | null
          updated_at: string
          user_id: string
          validity_date: string | null
          vet_name: string | null
          weight_unit: string | null
          weight_value: number | null
        }
        Insert: {
          clinic_name?: string | null
          created_at: string
          document_url?: string | null
          exam_date: string
          exam_type?: string | null
          findings?: string | null
          follow_up_date?: string | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          pet_id: string
          respiratory_rate?: number | null
          temperature?: number | null
          updated_at?: string
          user_id?: string
          validity_date?: string | null
          vet_name?: string | null
          weight_unit?: string | null
          weight_value?: number | null
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          document_url?: string | null
          exam_date?: string
          exam_type?: string | null
          findings?: string | null
          follow_up_date?: string | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          pet_id?: string
          respiratory_rate?: number | null
          temperature?: number | null
          updated_at?: string
          user_id?: string
          validity_date?: string | null
          vet_name?: string | null
          weight_unit?: string | null
          weight_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_exams_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      country_vaccine_requirements: {
        Row: {
          animal_type: string
          canonical_key: string
          country: string
          created_at: string
          description: string | null
          frequency_months: number | null
          id: string
          is_required: boolean
          vaccine_name: string
        }
        Insert: {
          animal_type: string
          canonical_key: string
          country: string
          created_at?: string
          description?: string | null
          frequency_months?: number | null
          id?: string
          is_required?: boolean
          vaccine_name: string
        }
        Update: {
          animal_type?: string
          canonical_key?: string
          country?: string
          created_at?: string
          description?: string | null
          frequency_months?: number | null
          id?: string
          is_required?: boolean
          vaccine_name?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      household_members: {
        Row: {
          household_owner_id: string
          id: string
          is_active: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          household_owner_id: string
          id?: string
          is_active?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          household_owner_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          confidence: number | null
          created_at: string
          document_url: string | null
          id: string
          lab_name: string
          ordered_by: string | null
          pet_id: string
          results: Json
          test_date: string | null
          test_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_url?: string | null
          id?: string
          lab_name: string
          ordered_by?: string | null
          pet_id: string
          results?: Json
          test_date?: string | null
          test_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_url?: string | null
          id?: string
          lab_name?: string
          ordered_by?: string | null
          pet_id?: string
          results?: Json
          test_date?: string | null
          test_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_doses: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          medication_id: string
          pet_id: string
          scheduled_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          medication_id: string
          pet_id: string
          scheduled_time: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          medication_id?: string
          pet_id?: string
          scheduled_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_doses_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_doses_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string
          custom_frequency_unit: string | null
          custom_frequency_value: number | null
          document_url: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          last_given_at: string | null
          name: string
          next_due_date: string | null
          pet_id: string
          prescribed_by: string | null
          purpose: string | null
          reminder_enabled: boolean
          reminder_timing: string | null
          schedules: Json
          start_date: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_frequency_unit?: string | null
          custom_frequency_value?: number | null
          document_url?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          last_given_at?: string | null
          name: string
          next_due_date?: string | null
          pet_id: string
          prescribed_by?: string | null
          purpose?: string | null
          reminder_enabled?: boolean
          reminder_timing?: string | null
          schedules?: Json
          start_date?: string | null
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          custom_frequency_unit?: string | null
          custom_frequency_value?: number | null
          document_url?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          last_given_at?: string | null
          name?: string
          next_due_date?: string | null
          pet_id?: string
          prescribed_by?: string | null
          purpose?: string | null
          reminder_enabled?: boolean
          reminder_timing?: string | null
          schedules?: Json
          start_date?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          pet_id: string
          recipient_email: string
          recipient_name: string | null
          reply_to_address: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          pet_id: string
          recipient_email: string
          recipient_name?: string | null
          reply_to_address: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          pet_id?: string
          recipient_email?: string
          recipient_name?: string | null
          reply_to_address?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_email_approvals: {
        Row: {
          attachment_url: string | null
          created_at: string
          document_type: string | null
          id: string
          pet_id: string
          s3_bucket: string
          s3_key: string
          sender_email: string
          status: string
          user_id: string
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          document_type?: string | null
          id?: string
          pet_id: string
          s3_bucket: string
          s3_key: string
          sender_email: string
          status?: string
          user_id: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          document_type?: string | null
          id?: string
          pet_id?: string
          s3_bucket?: string
          s3_key?: string
          sender_email?: string
          status?: string
          user_id?: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_email_approvals_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_care_team_members: {
        Row: {
          care_team_member_id: string
          created_at: string
          id: string
          pet_id: string
        }
        Insert: {
          care_team_member_id: string
          created_at?: string
          id?: string
          pet_id: string
        }
        Update: {
          care_team_member_id?: string
          created_at?: string
          id?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_care_team_members_care_team_member_id_fkey"
            columns: ["care_team_member_id"]
            isOneToOne: false
            referencedRelation: "vet_information"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_care_team_members_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_email_list: {
        Row: {
          created_at: string
          email_id: string
          id: number
          is_blocked: boolean
          pet_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_id: string
          id?: number
          is_blocked?: boolean
          pet_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_id?: string
          id?: number
          is_blocked?: boolean
          pet_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_email_whitelist_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_transfers: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          from_user_id: string
          id: string
          is_active: boolean
          pet_id: string
          to_user_id: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          from_user_id: string
          id?: string
          is_active?: boolean
          pet_id: string
          to_user_id?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          from_user_id?: string
          id?: string
          is_active?: boolean
          pet_id?: string
          to_user_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_transfers_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          animal_type: string
          breed: string
          color: string | null
          country: string
          created_at: string
          date_of_birth: string
          deleted_at: string | null
          email_id: string
          id: string
          microchip_number: string | null
          name: string
          photo_url: string | null
          sex: string
          user_id: string
          vet_information_id: string | null
          weight_unit: string
          weight_value: number
        }
        Insert: {
          animal_type: string
          breed: string
          color?: string | null
          country: string
          created_at?: string
          date_of_birth: string
          deleted_at?: string | null
          email_id: string
          id?: string
          microchip_number?: string | null
          name: string
          photo_url?: string | null
          sex: string
          user_id?: string
          vet_information_id?: string | null
          weight_unit: string
          weight_value: number
        }
        Update: {
          animal_type?: string
          breed?: string
          color?: string | null
          country?: string
          created_at?: string
          date_of_birth?: string
          deleted_at?: string | null
          email_id?: string
          id?: string
          microchip_number?: string | null
          name?: string
          photo_url?: string | null
          sex?: string
          user_id?: string
          vet_information_id?: string | null
          weight_unit?: string
          weight_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pets_vet_information_id_fkey"
            columns: ["vet_information_id"]
            isOneToOne: false
            referencedRelation: "vet_information"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_emails: {
        Row: {
          attachment_count: number | null
          completed_at: string | null
          id: string
          pet_id: string | null
          s3_key: string
          started_at: string | null
          status: string
          success: boolean | null
        }
        Insert: {
          attachment_count?: number | null
          completed_at?: string | null
          id?: string
          pet_id?: string | null
          s3_key: string
          started_at?: string | null
          status?: string
          success?: boolean | null
        }
        Update: {
          attachment_count?: number | null
          completed_at?: string | null
          id?: string
          pet_id?: string | null
          s3_key?: string
          started_at?: string | null
          status?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_emails_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string
          last_seen: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          last_seen?: string
          token: string
          user_id?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          last_seen?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      thread_messages: {
        Row: {
          bcc: string[] | null
          body: string
          cc: string[] | null
          direction: string
          id: string
          recipient_email: string
          sender_email: string
          sent_at: string
          subject: string
          thread_id: string
        }
        Insert: {
          bcc?: string[] | null
          body: string
          cc?: string[] | null
          direction: string
          id?: string
          recipient_email: string
          sender_email: string
          sent_at?: string
          subject: string
          thread_id: string
        }
        Update: {
          bcc?: string[] | null
          body?: string
          cc?: string[] | null
          direction?: string
          id?: string
          recipient_email?: string
          sender_email?: string
          sent_at?: string
          subject?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          vaccination_reminder_days: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          vaccination_reminder_days?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          vaccination_reminder_days?: number
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          clinic_name: string | null
          created_at: string
          date: string
          document_url: string | null
          id: string
          name: string
          next_due_date: string | null
          notes: string | null
          pet_id: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at: string
          date: string
          document_url?: string | null
          id?: string
          name: string
          next_due_date?: string | null
          notes?: string | null
          pet_id: string
          user_id?: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          date?: string
          document_url?: string | null
          id?: string
          name?: string
          next_due_date?: string | null
          notes?: string | null
          pet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_equivalencies: {
        Row: {
          canonical_name: string
          created_at: string | null
          id: string
          notes: string | null
          variant_name: string
        }
        Insert: {
          canonical_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
          variant_name: string
        }
        Update: {
          canonical_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          variant_name?: string
        }
        Relationships: []
      }
      vet_information: {
        Row: {
          address: string
          clinic_name: string
          created_at: string
          email: string
          id: string
          phone: string
          type: string | null
          updated_at: string
          vet_name: string
        }
        Insert: {
          address: string
          clinic_name: string
          created_at?: string
          email: string
          id?: string
          phone: string
          type?: string | null
          updated_at?: string
          vet_name: string
        }
        Update: {
          address?: string
          clinic_name?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string
          type?: string | null
          updated_at?: string
          vet_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_id_available: {
        Args: { p_email_id: string; p_exclude_pet_id?: string }
        Returns: boolean
      }
      create_user_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

