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
          pee_tags: string[]
          pee_target: number
          pet_id: string
          poop_count: number
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
          pee_tags?: string[]
          pee_target?: number
          pet_id: string
          poop_count?: number
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
          pee_tags?: string[]
          pee_target?: number
          pet_id?: string
          poop_count?: number
          poop_tags?: string[]
          poop_target?: number
          updated_at?: string
          user_id?: string
          water_intake?: number
          water_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_intake_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
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
      pet_journal_entries: {
        Row: {
          created_at: string
          domain: string
          entry_date: string
          id: string
          note: string | null
          pet_id: string
          subtype: string
          updated_at: string
          user_id: string
          vet_flagged: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          entry_date?: string
          id?: string
          note?: string | null
          pet_id: string
          subtype: string
          updated_at?: string
          user_id: string
          vet_flagged?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          entry_date?: string
          id?: string
          note?: string | null
          pet_id?: string
          subtype?: string
          updated_at?: string
          user_id?: string
          vet_flagged?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pet_journal_entries_pet_id_fkey"
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
          transfer_reason: string | null
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
          transfer_reason?: string | null
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
          date_of_birth: string
          deleted_at: string | null
          email_id: string
          id: string
          microchip_number: string | null
          name: string
          passport_number: string | null
          photo_url: string | null
          sex: string
          target_weight_unit: string | null
          target_weight_value: number | null
          user_id: string
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
          passport_number?: string | null
          photo_url?: string | null
          sex: string
          target_weight_unit?: string | null
          target_weight_value?: number | null
          user_id?: string
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
          passport_number?: string | null
          photo_url?: string | null
          sex?: string
          target_weight_unit?: string | null
          target_weight_value?: number | null
          user_id?: string
          weight_unit?: string
          weight_value?: number
        }
        Relationships: []
      }
      processed_emails: {
        Row: {
          attachment_count: number | null
          completed_at: string | null
          document_type: string | null
          failure_reason: string | null
          id: string
          pet_id: string | null
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
      vet_bookings: {
        Row: {
          clinic_id: string
          clinic_name: string | null
          created_at: string
          end_utc: string
          external_appointment_id: string | null
          id: string
          notes: string | null
          pawbuck_appointment_id: string | null
          pet_id: string | null
          service_id: string
          service_label: string | null
          start_utc: string
          status: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          clinic_name?: string | null
          created_at?: string
          end_utc: string
          external_appointment_id?: string | null
          id?: string
          notes?: string | null
          pawbuck_appointment_id?: string | null
          pet_id?: string | null
          service_id: string
          service_label?: string | null
          start_utc: string
          status?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          clinic_name?: string | null
          created_at?: string
          end_utc?: string
          external_appointment_id?: string | null
          id?: string
          notes?: string | null
          pawbuck_appointment_id?: string | null
          pet_id?: string | null
          service_id?: string
          service_label?: string | null
          start_utc?: string
          status?: string
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
      check_email_id_available: {
        Args: { p_email_id: string; p_exclude_pet_id?: string }
        Returns: boolean
      }
      create_user_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
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
      user_can_access_pet: { Args: { p_pet_id: string }; Returns: boolean }
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
