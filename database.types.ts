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
      daily_medication_schedules: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id?: string
          time: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_medication_schedules_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
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
      medicines: {
        Row: {
          created_at: string
          document_url: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          name: string
          pet_id: string
          prescribed_by: string | null
          purpose: string | null
          scheduled_day: number | null
          scheduled_times: string[] | null
          start_date: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          name: string
          pet_id: string
          prescribed_by?: string | null
          purpose?: string | null
          scheduled_day?: number | null
          scheduled_times?: string[] | null
          start_date?: string | null
          type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          name?: string
          pet_id?: string
          prescribed_by?: string | null
          purpose?: string | null
          scheduled_day?: number | null
          scheduled_times?: string[] | null
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
      pets: {
        Row: {
          animal_type: string;
          breed: string;
          country: string;
          created_at: string;
          date_of_birth: string;
          deleted_at: string | null;
          id: string;
          microchip_number: string | null;
          name: string;
          photo_url: string | null;
          sex: string;
          user_id: string;
          weight_unit: string;
          weight_value: number;
        };
        Insert: {
          animal_type: string;
          breed: string;
          country: string;
          created_at?: string;
          date_of_birth: string;
          deleted_at?: string | null;
          id?: string;
          microchip_number?: string | null;
          name: string;
          photo_url?: string | null;
          sex: string;
          user_id?: string;
          weight_unit: string;
          weight_value: number;
        };
        Update: {
          animal_type?: string;
          breed?: string;
          country?: string;
          created_at?: string;
          date_of_birth?: string;
          deleted_at?: string | null;
          id?: string;
          microchip_number?: string | null;
          name?: string;
          photo_url?: string | null;
          sex?: string;
          user_id?: string;
          weight_unit?: string;
          weight_value?: number;
        };
        Relationships: [];
      };
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
      vet_information: {
        Row: {
          id: string
          clinic_name: string
          vet_name: string
          address: string
          phone: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_name: string
          vet_name: string
          address: string
          phone: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_name?: string
          vet_name?: string
          address?: string
          phone?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_medication_schedules: {
        Row: {
          created_at: string
          day_number: number
          id: string
          medication_id: string
          time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          medication_id: string
          time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          medication_id?: string
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_medication_schedules_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

