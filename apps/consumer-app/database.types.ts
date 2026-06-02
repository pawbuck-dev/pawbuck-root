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
    PostgrestVersion: "13.0.5"
  }
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
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      clinic_scheduling_config: {
        Row: {
          clinic_id: string
          external_clinic_id: string | null
          integration_settings: Json
          provider_kind: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          external_clinic_id?: string | null
          integration_settings?: Json
          provider_kind: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          external_clinic_id?: string | null
          integration_settings?: Json
          provider_kind?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      country_email_document_verification: {
        Row: {
          allow_name_only_document_types: string[]
          breed_required_document_types: string[]
          country: string
          enabled: boolean
          fuzzy_match_threshold: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          allow_name_only_document_types?: string[]
          breed_required_document_types?: string[]
          country: string
          enabled?: boolean
          fuzzy_match_threshold?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          allow_name_only_document_types?: string[]
          breed_required_document_types?: string[]
          country?: string
          enabled?: boolean
          fuzzy_match_threshold?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
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
      daily_intake: {
        Row: {
          created_at: string
          date: string
          food_intake: number
          food_target: number
          id: string
          pee_count: number
          pee_journal_entry_id: string | null
          pee_observation_note: string | null
          pee_observation_photo_path: string | null
          pee_tags: string[]
          pee_target: number
          pet_id: string
          poop_count: number
          poop_journal_entry_id: string | null
          poop_observation_note: string | null
          poop_observation_photo_path: string | null
          poop_tags: string[]
          poop_target: number
          updated_at: string
          user_id: string
          water_intake: number
          water_target: number
        }
        Insert: {
          created_at?: string
          date?: string
          food_intake?: number
          food_target?: number
          id?: string
          pee_count?: number
          pee_journal_entry_id?: string | null
          pee_observation_note?: string | null
          pee_observation_photo_path?: string | null
          pee_tags?: string[]
          pee_target?: number
          pet_id: string
          poop_count?: number
          poop_journal_entry_id?: string | null
          poop_observation_note?: string | null
          poop_observation_photo_path?: string | null
          poop_tags?: string[]
          poop_target?: number
          updated_at?: string
          user_id: string
          water_intake?: number
          water_target?: number
        }
        Update: {
          created_at?: string
          date?: string
          food_intake?: number
          food_target?: number
          id?: string
          pee_count?: number
          pee_journal_entry_id?: string | null
          pee_observation_note?: string | null
          pee_observation_photo_path?: string | null
          pee_tags?: string[]
          pee_target?: number
          pet_id?: string
          poop_count?: number
          poop_journal_entry_id?: string | null
          poop_observation_note?: string | null
          poop_observation_photo_path?: string | null
          poop_tags?: string[]
          poop_target?: number
          updated_at?: string
          user_id?: string
          water_intake?: number
          water_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_intake_pee_journal_entry_id_fkey"
            columns: ["pee_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "pet_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_intake_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_intake_poop_journal_entry_id_fkey"
            columns: ["poop_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "pet_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      document_expiry_reminder_sent: {
        Row: {
          bucket: string
          pet_document_id: string
          sent_at: string
        }
        Insert: {
          bucket: string
          pet_document_id: string
          sent_at?: string
        }
        Update: {
          bucket?: string
          pet_document_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_expiry_reminder_sent_pet_document_id_fkey"
            columns: ["pet_document_id"]
            isOneToOne: false
            referencedRelation: "pet_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation: {
        Row: {
          content: string
          created_at: string | null
          embedding: string
          id: string
          metadata: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      email_delete_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          thread_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          thread_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faq_documents: {
        Row: {
          answer: string
          content: string
          created_at: string
          embedding: string | null
          faq_source_id: string | null
          id: string
          question: string
        }
        Insert: {
          answer: string
          content: string
          created_at?: string
          embedding?: string | null
          faq_source_id?: string | null
          id?: string
          question: string
        }
        Update: {
          answer?: string
          content?: string
          created_at?: string
          embedding?: string | null
          faq_source_id?: string | null
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_documents_faq_source_id_fkey"
            columns: ["faq_source_id"]
            isOneToOne: false
            referencedRelation: "faq_source"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_source: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
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
      journal_interview_sessions: {
        Row: {
          answers: Json
          confidence_score: number | null
          created_at: string
          current_question_id: string | null
          draft_summary: Json | null
          emergency_detected: boolean
          expires_at: string
          id: string
          journal_entry_id: string | null
          pet_id: string
          phase: string
          questions_asked_count: number
          tree_id: string
          tree_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          confidence_score?: number | null
          created_at?: string
          current_question_id?: string | null
          draft_summary?: Json | null
          emergency_detected?: boolean
          expires_at?: string
          id?: string
          journal_entry_id?: string | null
          pet_id: string
          phase?: string
          questions_asked_count?: number
          tree_id: string
          tree_version: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          confidence_score?: number | null
          created_at?: string
          current_question_id?: string | null
          draft_summary?: Json | null
          emergency_detected?: boolean
          expires_at?: string
          id?: string
          journal_entry_id?: string | null
          pet_id?: string
          phase?: string
          questions_asked_count?: number
          tree_id?: string
          tree_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_interview_sessions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "pet_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_interview_sessions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
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
      marketplace_service_bookings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pet_id: string | null
          pet_owner_user_id: string
          provider_profile_id: string
          service_offering_id: string | null
          start_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          pet_owner_user_id: string
          provider_profile_id: string
          service_offering_id?: string | null
          start_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          pet_owner_user_id?: string
          provider_profile_id?: string
          service_offering_id?: string | null
          start_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_service_bookings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_service_bookings_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_service_bookings_service_offering_id_fkey"
            columns: ["service_offering_id"]
            isOneToOne: false
            referencedRelation: "service_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_adr_entries: {
        Row: {
          confidence: number
          created_at: string
          id: string
          label_text: string
          product_id: string
          severity: string
          source: string
          source_version: string | null
          symptom_taxonomy: string[]
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          label_text: string
          product_id: string
          severity?: string
          source?: string
          source_version?: string | null
          symptom_taxonomy: string[]
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          label_text?: string
          product_id?: string
          severity?: string
          source?: string
          source_version?: string | null
          symptom_taxonomy?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "medication_adr_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medication_products"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_adr_ingestion_runs: {
        Row: {
          entries_upserted: number
          error_message: string | null
          finished_at: string | null
          id: string
          products_upserted: number
          source: string
          source_version: string | null
          started_at: string
          status: string
        }
        Insert: {
          entries_upserted?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          products_upserted?: number
          source: string
          source_version?: string | null
          started_at?: string
          status: string
        }
        Update: {
          entries_upserted?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          products_upserted?: number
          source?: string
          source_version?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      medication_adr_overrides: {
        Row: {
          active: boolean
          confidence: number
          created_at: string
          generic_name: string | null
          id: string
          label_text: string
          notes: string | null
          product_id: string | null
          severity: string
          symptom_taxonomy: string[]
        }
        Insert: {
          active?: boolean
          confidence?: number
          created_at?: string
          generic_name?: string | null
          id?: string
          label_text: string
          notes?: string | null
          product_id?: string | null
          severity?: string
          symptom_taxonomy: string[]
        }
        Update: {
          active?: boolean
          confidence?: number
          created_at?: string
          generic_name?: string | null
          id?: string
          label_text?: string
          notes?: string | null
          product_id?: string | null
          severity?: string
          symptom_taxonomy?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "medication_adr_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medication_products"
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
      medication_products: {
        Row: {
          brand_names: string[]
          created_at: string
          generic_name: string
          id: string
          route: string | null
          source: string
          source_version: string | null
          species: string[]
          updated_at: string
        }
        Insert: {
          brand_names?: string[]
          created_at?: string
          generic_name: string
          id?: string
          route?: string | null
          source?: string
          source_version?: string | null
          species?: string[]
          updated_at?: string
        }
        Update: {
          brand_names?: string[]
          created_at?: string
          generic_name?: string
          id?: string
          route?: string | null
          source?: string
          source_version?: string | null
          species?: string[]
          updated_at?: string
        }
        Relationships: []
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
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
      milo_curated_snippets: {
        Row: {
          animal_type: string | null
          breed_key: string | null
          content: string
          created_at: string
          id: string
          source_attribution: string
          topic: string
        }
        Insert: {
          animal_type?: string | null
          breed_key?: string | null
          content: string
          created_at?: string
          id?: string
          source_attribution: string
          topic: string
        }
        Update: {
          animal_type?: string | null
          breed_key?: string | null
          content?: string
          created_at?: string
          id?: string
          source_attribution?: string
          topic?: string
        }
        Relationships: []
      }
      milo_journal_chat_turns: {
        Row: {
          chat_kind: string
          created_at: string
          heuristic_tags: string[]
          id: string
          pet_id: string | null
          prompt_version: string
          user_id: string
        }
        Insert: {
          chat_kind?: string
          created_at?: string
          heuristic_tags?: string[]
          id?: string
          pet_id?: string | null
          prompt_version?: string
          user_id: string
        }
        Update: {
          chat_kind?: string
          created_at?: string
          heuristic_tags?: string[]
          id?: string
          pet_id?: string | null
          prompt_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milo_journal_chat_turns_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      milo_journal_config: {
        Row: {
          config: Json
          id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      milo_journal_message_feedback: {
        Row: {
          created_at: string
          feedback_reason: string | null
          feedback_stage: string | null
          id: string
          questions_asked: number | null
          rating: string
          tree_version: string | null
          turn_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_reason?: string | null
          feedback_stage?: string | null
          id?: string
          questions_asked?: number | null
          rating: string
          tree_version?: string | null
          turn_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_reason?: string | null
          feedback_stage?: string | null
          id?: string
          questions_asked?: number | null
          rating?: string
          tree_version?: string | null
          turn_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milo_journal_message_feedback_turn_id_fkey"
            columns: ["turn_id"]
            isOneToOne: true
            referencedRelation: "milo_journal_chat_turns"
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
      pet_activity_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
          pet_id: string
          ref_id: string | null
          ref_table: string | null
          summary: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          pet_id: string
          ref_id?: string | null
          ref_table?: string | null
          summary: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          pet_id?: string
          ref_id?: string | null
          ref_table?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_activity_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_allergies: {
        Row: {
          created_at: string
          id: string
          label: string
          notes: string | null
          pet_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          pet_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          pet_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_allergies_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_behavior_baselines: {
        Row: {
          created_at: string
          energy_level_1_to_5: number
          energy_notes: string | null
          food_motivation: string
          id: string
          pet_id: string
          sleep_restfulness: string | null
          sleep_safe_spot: string | null
          social_disposition: string
          stress_triggers: string[]
          typical_deep_sleep_hours: number | null
          updated_at: string
          user_id: string
          vocalization_level: string
          vocalization_triggers: string[]
        }
        Insert: {
          created_at?: string
          energy_level_1_to_5: number
          energy_notes?: string | null
          food_motivation: string
          id?: string
          pet_id: string
          sleep_restfulness?: string | null
          sleep_safe_spot?: string | null
          social_disposition: string
          stress_triggers?: string[]
          typical_deep_sleep_hours?: number | null
          updated_at?: string
          user_id: string
          vocalization_level: string
          vocalization_triggers?: string[]
        }
        Update: {
          created_at?: string
          energy_level_1_to_5?: number
          energy_notes?: string | null
          food_motivation?: string
          id?: string
          pet_id?: string
          sleep_restfulness?: string | null
          sleep_safe_spot?: string | null
          social_disposition?: string
          stress_triggers?: string[]
          typical_deep_sleep_hours?: number | null
          updated_at?: string
          user_id?: string
          vocalization_level?: string
          vocalization_triggers?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "pet_behavior_baselines_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
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
      pet_conditions: {
        Row: {
          created_at: string
          diagnosed_on: string | null
          id: string
          name: string
          notes: string | null
          pet_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          name: string
          notes?: string | null
          pet_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          pet_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_conditions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_documents: {
        Row: {
          clinical_sync_error: string | null
          clinical_synced_at: string | null
          confidence: number
          created_at: string
          document_type: Database["public"]["Enums"]["pet_document_type"]
          expiry_date: string | null
          extracted_json: Json
          id: string
          metadata: Json | null
          mime_type: string
          pet_id: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinical_sync_error?: string | null
          clinical_synced_at?: string | null
          confidence?: number
          created_at?: string
          document_type: Database["public"]["Enums"]["pet_document_type"]
          expiry_date?: string | null
          extracted_json?: Json
          id?: string
          metadata?: Json | null
          mime_type?: string
          pet_id: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinical_sync_error?: string | null
          clinical_synced_at?: string | null
          confidence?: number
          created_at?: string
          document_type?: Database["public"]["Enums"]["pet_document_type"]
          expiry_date?: string | null
          extracted_json?: Json
          id?: string
          metadata?: Json | null
          mime_type?: string
          pet_id?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_documents_pet_id_fkey"
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
      pet_family_grants: {
        Row: {
          created_at: string
          grantee_id: string
          id: string
          invited_by: string | null
          pet_id: string
          role: Database["public"]["Enums"]["pet_role"]
        }
        Insert: {
          created_at?: string
          grantee_id: string
          id?: string
          invited_by?: string | null
          pet_id: string
          role: Database["public"]["Enums"]["pet_role"]
        }
        Update: {
          created_at?: string
          grantee_id?: string
          id?: string
          invited_by?: string | null
          pet_id?: string
          role?: Database["public"]["Enums"]["pet_role"]
        }
        Relationships: [
          {
            foreignKeyName: "pet_family_grants_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_family_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          pet_id: string
          role: Database["public"]["Enums"]["pet_role"]
          status: Database["public"]["Enums"]["pet_family_invite_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          pet_id: string
          role: Database["public"]["Enums"]["pet_role"]
          status?: Database["public"]["Enums"]["pet_family_invite_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          pet_id?: string
          role?: Database["public"]["Enums"]["pet_role"]
          status?: Database["public"]["Enums"]["pet_family_invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_family_invites_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_family_notification_prefs: {
        Row: {
          care_activity_scope: Database["public"]["Enums"]["pet_care_notification_scope"]
          care_push_enabled: boolean
          lifecycle_push_enabled: boolean
          pet_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          care_activity_scope?: Database["public"]["Enums"]["pet_care_notification_scope"]
          care_push_enabled?: boolean
          lifecycle_push_enabled?: boolean
          pet_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          care_activity_scope?: Database["public"]["Enums"]["pet_care_notification_scope"]
          care_push_enabled?: boolean
          lifecycle_push_enabled?: boolean
          pet_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_family_notification_prefs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_journal_entries: {
        Row: {
          created_at: string
          domain: string
          entry_date: string
          id: string
          interview_metadata: Json | null
          linked_clinical_exam_id: string | null
          milo_idempotency_key: string | null
          note: string | null
          pet_id: string
          subtype: string
          triage_status: string
          updated_at: string
          user_id: string
          vet_flagged: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          entry_date?: string
          id?: string
          interview_metadata?: Json | null
          linked_clinical_exam_id?: string | null
          milo_idempotency_key?: string | null
          note?: string | null
          pet_id: string
          subtype: string
          triage_status?: string
          updated_at?: string
          user_id: string
          vet_flagged?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          entry_date?: string
          id?: string
          interview_metadata?: Json | null
          linked_clinical_exam_id?: string | null
          milo_idempotency_key?: string | null
          note?: string | null
          pet_id?: string
          subtype?: string
          triage_status?: string
          updated_at?: string
          user_id?: string
          vet_flagged?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pet_journal_entries_linked_clinical_exam_id_fkey"
            columns: ["linked_clinical_exam_id"]
            isOneToOne: false
            referencedRelation: "clinical_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_journal_entries_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_journal_transfer_highlights: {
        Row: {
          created_at: string
          id: string
          journal_entry_id: string
          pet_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          journal_entry_id: string
          pet_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          journal_entry_id?: string
          pet_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_journal_transfer_highlights_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "pet_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_journal_transfer_highlights_pet_id_fkey"
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
          declined_at: string | null
          declined_by_user_id: string | null
          excluded_journal_entry_ids: string[]
          expires_at: string | null
          from_user_id: string
          id: string
          is_active: boolean
          journal_highlight_entry_ids: string[]
          pet_id: string
          prior_owner_display_snapshot: string | null
          prior_owner_show_name: boolean
          recipient_contact: string | null
          revoked_access_user_ids: string[]
          to_user_id: string | null
          transfer_reason: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          declined_at?: string | null
          declined_by_user_id?: string | null
          excluded_journal_entry_ids?: string[]
          expires_at?: string | null
          from_user_id: string
          id?: string
          is_active?: boolean
          journal_highlight_entry_ids?: string[]
          pet_id: string
          prior_owner_display_snapshot?: string | null
          prior_owner_show_name?: boolean
          recipient_contact?: string | null
          revoked_access_user_ids?: string[]
          to_user_id?: string | null
          transfer_reason?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          declined_at?: string | null
          declined_by_user_id?: string | null
          excluded_journal_entry_ids?: string[]
          expires_at?: string | null
          from_user_id?: string
          id?: string
          is_active?: boolean
          journal_highlight_entry_ids?: string[]
          pet_id?: string
          prior_owner_display_snapshot?: string | null
          prior_owner_show_name?: boolean
          recipient_contact?: string | null
          revoked_access_user_ids?: string[]
          to_user_id?: string | null
          transfer_reason?: string | null
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
      pet_weight_logs: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          recorded_at: string
          user_id: string
          weight_unit: string
          weight_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          recorded_at?: string
          user_id: string
          weight_unit: string
          weight_value: number
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          recorded_at?: string
          user_id?: string
          weight_unit?: string
          weight_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_weight_logs_pet_id_fkey"
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
          date_of_birth: string | null
          deleted_at: string | null
          email_id: string
          home_timezone: string | null
          id: string
          intake_grams_per_meal: number | null
          intake_meals_per_day: number | null
          intake_water_cups_per_day: number | null
          intake_water_ml_per_cup: number | null
          microchip_number: string | null
          name: string
          passport_number: string | null
          pet_parent_display_name: string | null
          photo_url: string | null
          sex: string
          target_weight_unit: string | null
          target_weight_value: number | null
          user_id: string
          weight_unit: string | null
          weight_value: number | null
        }
        Insert: {
          animal_type: string
          breed: string
          color?: string | null
          country: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email_id: string
          home_timezone?: string | null
          id?: string
          intake_grams_per_meal?: number | null
          intake_meals_per_day?: number | null
          intake_water_cups_per_day?: number | null
          intake_water_ml_per_cup?: number | null
          microchip_number?: string | null
          name: string
          passport_number?: string | null
          pet_parent_display_name?: string | null
          photo_url?: string | null
          sex: string
          target_weight_unit?: string | null
          target_weight_value?: number | null
          user_id?: string
          weight_unit?: string | null
          weight_value?: number | null
        }
        Update: {
          animal_type?: string
          breed?: string
          color?: string | null
          country?: string
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email_id?: string
          home_timezone?: string | null
          id?: string
          intake_grams_per_meal?: number | null
          intake_meals_per_day?: number | null
          intake_water_cups_per_day?: number | null
          intake_water_ml_per_cup?: number | null
          microchip_number?: string | null
          name?: string
          passport_number?: string | null
          pet_parent_display_name?: string | null
          photo_url?: string | null
          sex?: string
          target_weight_unit?: string | null
          target_weight_value?: number | null
          user_id?: string
          weight_unit?: string | null
          weight_value?: number | null
        }
        Relationships: []
      }
      proactive_pet_health_sends: {
        Row: {
          created_at: string
          pet_id: string
          sent_on: string
        }
        Insert: {
          created_at?: string
          pet_id: string
          sent_on: string
        }
        Update: {
          created_at?: string
          pet_id?: string
          sent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_pet_health_sends_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_emails: {
        Row: {
          attachment_count: number | null
          completed_at: string | null
          document_type: string | null
          failure_reason: string | null
          id: string
          pet_id: string | null
          review_status: string | null
          s3_key: string
          sender_email: string | null
          started_at: string | null
          status: string
          subject: string | null
          success: boolean | null
        }
        Insert: {
          attachment_count?: number | null
          completed_at?: string | null
          document_type?: string | null
          failure_reason?: string | null
          id?: string
          pet_id?: string | null
          review_status?: string | null
          s3_key: string
          sender_email?: string | null
          started_at?: string | null
          status?: string
          subject?: string | null
          success?: boolean | null
        }
        Update: {
          attachment_count?: number | null
          completed_at?: string | null
          document_type?: string | null
          failure_reason?: string | null
          id?: string
          pet_id?: string | null
          review_status?: string | null
          s3_key?: string
          sender_email?: string | null
          started_at?: string | null
          status?: string
          subject?: string | null
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
      provider_profiles: {
        Row: {
          business_name: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      service_areas: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          country_code: string
          created_at: string
          id: string
          provider_profile_id: string
          radius_km: number | null
          region: string | null
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          country_code: string
          created_at?: string
          id?: string
          provider_profile_id: string
          radius_km?: number | null
          region?: string | null
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          country_code?: string
          created_at?: string
          id?: string
          provider_profile_id?: string
          radius_km?: number | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_areas_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_offerings: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          provider_profile_id: string
          service_type: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          provider_profile_id: string
          service_type: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          provider_profile_id?: string
          service_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offerings_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_feature_gates: {
        Row: {
          feature_key: string
          label: string
          requires_premium: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          feature_key: string
          label: string
          requires_premium?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          feature_key?: string
          label?: string
          requires_premium?: boolean
          sort_order?: number
          updated_at?: string
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
      thread_read_status: {
        Row: {
          id: string
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_read_status_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          expires_at: string | null
          plan: string
          provider_customer_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          plan?: string
          provider_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          plan?: string
          provider_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          address: string | null
          created_at: string
          document_expiry_push_enabled: boolean
          full_name: string | null
          id: string
          journal_prompt_enabled: boolean
          journal_prompt_hour: number
          journal_prompt_minute: number
          phone: string | null
          updated_at: string
          user_id: string
          vaccination_reminder_days: number
          vet_appointment_reminder_push_enabled: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          document_expiry_push_enabled?: boolean
          full_name?: string | null
          id?: string
          journal_prompt_enabled?: boolean
          journal_prompt_hour?: number
          journal_prompt_minute?: number
          phone?: string | null
          updated_at?: string
          user_id: string
          vaccination_reminder_days?: number
          vet_appointment_reminder_push_enabled?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          document_expiry_push_enabled?: boolean
          full_name?: string | null
          id?: string
          journal_prompt_enabled?: boolean
          journal_prompt_hour?: number
          journal_prompt_minute?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
          vaccination_reminder_days?: number
          vet_appointment_reminder_push_enabled?: boolean
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
      vet_booking_reminder_sent: {
        Row: {
          reminder_window: string
          sent_at: string
          vet_booking_id: string
        }
        Insert: {
          reminder_window: string
          sent_at?: string
          vet_booking_id: string
        }
        Update: {
          reminder_window?: string
          sent_at?: string
          vet_booking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_booking_reminder_sent_vet_booking_id_fkey"
            columns: ["vet_booking_id"]
            isOneToOne: false
            referencedRelation: "vet_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_bookings: {
        Row: {
          booking_source: string
          clinic_id: string
          clinic_name: string | null
          created_at: string
          email_import_key: string | null
          end_utc: string
          external_appointment_id: string | null
          ics_uid: string | null
          id: string
          notes: string | null
          pawbuck_appointment_id: string | null
          pet_id: string | null
          service_id: string
          service_label: string | null
          start_utc: string
          status: string
          thread_message_id: string | null
          user_id: string
        }
        Insert: {
          booking_source?: string
          clinic_id: string
          clinic_name?: string | null
          created_at?: string
          email_import_key?: string | null
          end_utc: string
          external_appointment_id?: string | null
          ics_uid?: string | null
          id?: string
          notes?: string | null
          pawbuck_appointment_id?: string | null
          pet_id?: string | null
          service_id: string
          service_label?: string | null
          start_utc: string
          status?: string
          thread_message_id?: string | null
          user_id: string
        }
        Update: {
          booking_source?: string
          clinic_id?: string
          clinic_name?: string | null
          created_at?: string
          email_import_key?: string | null
          end_utc?: string
          external_appointment_id?: string | null
          ics_uid?: string | null
          id?: string
          notes?: string | null
          pawbuck_appointment_id?: string | null
          pet_id?: string | null
          service_id?: string
          service_label?: string | null
          start_utc?: string
          status?: string
          thread_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_bookings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_bookings_thread_message_id_fkey"
            columns: ["thread_message_id"]
            isOneToOne: false
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
        ]
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
      walk_sessions: {
        Row: {
          created_at: string
          distance_meters: number
          duration_seconds: number
          ended_at: string
          id: string
          pet_id: string
          points: Json | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_meters?: number
          duration_seconds?: number
          ended_at: string
          id?: string
          pet_id: string
          points?: Json | null
          started_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_meters?: number
          duration_seconds?: number
          ended_at?: string
          id?: string
          pet_id?: string
          points?: Json | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "walk_sessions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invite_code: {
        Args: { p_code: string }
        Returns: Json
      }
      accept_pet_transfer: {
        Args: { p_code: string; p_pet_parent_display_name?: string }
        Returns: string
      }
      app_registered_user_count: { Args: never; Returns: number }
      app_registered_user_count_for_country: {
        Args: { p_country: string }
        Returns: number
      }
      auth_user_passes_premium_gate: {
        Args: { p_feature_key: string }
        Returns: boolean
      }
      check_email_id_available: {
        Args: { p_email_id: string; p_exclude_pet_id?: string }
        Returns: boolean
      }
      create_user_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      decline_pet_transfer: { Args: { p_code: string }; Returns: string }
      display_name_for_user: { Args: { p_user_id: string }; Returns: string }
      get_user_pet_role: { Args: { p_pet_id: string }; Returns: string }
      insert_pet_activity_event: {
        Args: {
          p_actor_id: string
          p_kind: string
          p_payload?: Json
          p_pet_id: string
          p_ref_id?: string
          p_ref_table?: string
          p_summary: string
        }
        Returns: string
      }
      insert_pet_for_current_user: {
        Args: { p_fields: Json }
        Returns: {
          animal_type: string
          breed: string
          color: string | null
          country: string
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email_id: string
          home_timezone: string | null
          id: string
          intake_grams_per_meal: number | null
          intake_meals_per_day: number | null
          intake_water_cups_per_day: number | null
          intake_water_ml_per_cup: number | null
          microchip_number: string | null
          name: string
          passport_number: string | null
          pet_parent_display_name: string | null
          photo_url: string | null
          sex: string
          target_weight_unit: string | null
          target_weight_value: number | null
          user_id: string
          weight_unit: string | null
          weight_value: number | null
        }
        SetofOptions: {
          from: "*"
          to: "pets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lookup_auth_email_by_id: { Args: { p_user_id: string }; Returns: string }
      lookup_auth_user_id_by_email: {
        Args: { p_email: string }
        Returns: string
      }
      match_documentation: {
        Args: {
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: number[]
        }
        Returns: {
          answer: string
          content: string
          id: string
          question: string
          similarity: number
        }[]
      }
      pawthon_my_weekly_walker_rank: {
        Args: never
        Returns: {
          rank: number
          total: number
        }[]
      }
      pawthon_my_weekly_walker_rank_for_country: {
        Args: { p_country: string }
        Returns: {
          rank: number
          total: number
        }[]
      }
      pet_family_slots_used: { Args: { p_pet_id: string }; Returns: number }
      preview_pet_transfer: { Args: { p_code: string }; Returns: Json }
      revoke_household_member_access: {
        Args: { p_member_id: string }
        Returns: Json
      }
      process_pet_family_invite_token: {
        Args: { p_token: string }
        Returns: Json
      }
      user_can_access_pet: { Args: { p_pet_id: string }; Returns: boolean }
      user_can_write_pet_health: {
        Args: { p_pet_id: string }
        Returns: boolean
      }
    }
    Enums: {
      pet_care_notification_scope: "all" | "meds_only" | "journal_only" | "none"
      pet_document_type:
        | "medications"
        | "lab_results"
        | "clinical_exams"
        | "vaccinations"
        | "billing_invoice"
        | "travel_certificate"
        | "insurance_policy"
        | "pedigree"
        | "identity_document"
        | "irrelevant"
      pet_family_invite_status: "pending" | "accepted" | "revoked" | "expired"
      pet_role: "view_only" | "contributor" | "admin"
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
    Enums: {
      pet_care_notification_scope: ["all", "meds_only", "journal_only", "none"],
      pet_document_type: [
        "medications",
        "lab_results",
        "clinical_exams",
        "vaccinations",
        "billing_invoice",
        "travel_certificate",
        "insurance_policy",
        "pedigree",
        "identity_document",
        "irrelevant",
      ],
      pet_family_invite_status: ["pending", "accepted", "revoked", "expired"],
      pet_role: ["view_only", "contributor", "admin"],
    },
  },
} as const
