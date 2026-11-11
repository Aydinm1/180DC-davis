export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  private: {
    Tables: {
      account_activity: {
        Row: {
          last_active_at: string
          person_id: string
        }
        Insert: {
          last_active_at: string
          person_id: string
        }
        Update: {
          last_active_at?: string
          person_id?: string
        }
        Relationships: []
      }
      assignment_team_briefs: {
        Row: {
          assignment_id: string
          instructions: string
          request_id: string
          team_id: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          assignment_id: string
          instructions: string
          request_id: string
          team_id: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          assignment_id?: string
          instructions?: string
          request_id?: string
          team_id?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: []
      }
      attendance_attempts: {
        Row: {
          failed_at: string
          id: string
          person_id: string
          session_id: string
        }
        Insert: {
          failed_at?: string
          id?: string
          person_id: string
          session_id: string
        }
        Update: {
          failed_at?: string
          id?: string
          person_id?: string
          session_id?: string
        }
        Relationships: []
      }
      attendance_codes: {
        Row: {
          code: string
          session_id: string
        }
        Insert: {
          code: string
          session_id: string
        }
        Update: {
          code?: string
          session_id?: string
        }
        Relationships: []
      }
      attendance_history: {
        Row: {
          actor_id: string
          changed_at: string
          enrollment_id: string
          id: string
          present: boolean
          session_id: string
          source: string
        }
        Insert: {
          actor_id: string
          changed_at?: string
          enrollment_id: string
          id?: string
          present: boolean
          session_id: string
          source: string
        }
        Update: {
          actor_id?: string
          changed_at?: string
          enrollment_id?: string
          id?: string
          present?: boolean
          session_id?: string
          source?: string
        }
        Relationships: []
      }
      case_answers: {
        Row: {
          case_number: number
          framework: string
          method: string
          priority: string
          reviewed_at: string | null
          run_id: string
          saved_at: string
          updated_at: string
        }
        Insert: {
          case_number: number
          framework: string
          method: string
          priority: string
          reviewed_at?: string | null
          run_id: string
          saved_at?: string
          updated_at?: string
        }
        Update: {
          case_number?: number
          framework?: string
          method?: string
          priority?: string
          reviewed_at?: string | null
          run_id?: string
          saved_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_answers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "case_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      case_configs: {
        Row: {
          assignment_id: string
          content: Json
          version: number
        }
        Insert: {
          assignment_id: string
          content: Json
          version?: number
        }
        Update: {
          assignment_id?: string
          content?: Json
          version?: number
        }
        Relationships: []
      }
      case_receipts: {
        Row: {
          actor_id: string
          payload: Json
          request_id: string
          result: Json
        }
        Insert: {
          actor_id: string
          payload: Json
          request_id: string
          result: Json
        }
        Update: {
          actor_id?: string
          payload?: Json
          request_id?: string
          result?: Json
        }
        Relationships: []
      }
      case_runs: {
        Row: {
          assignment_id: string
          completed_at: string | null
          enrollment_id: string
          id: string
          version: number
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          enrollment_id: string
          id?: string
          version?: number
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_runs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "case_configs"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      guided_configs: {
        Row: {
          assignment_id: string
          direction_intro: string
          final_brief: string
          overview: string
          version: number
        }
        Insert: {
          assignment_id: string
          direction_intro: string
          final_brief: string
          overview: string
          version?: number
        }
        Update: {
          assignment_id?: string
          direction_intro?: string
          final_brief?: string
          overview?: string
          version?: number
        }
        Relationships: []
      }
      guided_receipts: {
        Row: {
          actor_id: string
          payload: Json
          request_id: string
          result: Json
        }
        Insert: {
          actor_id: string
          payload: Json
          request_id: string
          result: Json
        }
        Update: {
          actor_id?: string
          payload?: Json
          request_id?: string
          result?: Json
        }
        Relationships: []
      }
      guided_recommendations: {
        Row: {
          assignment_id: string
          company: string
          guidance: string
          team_id: string
          title: string
          version: number
        }
        Insert: {
          assignment_id: string
          company: string
          guidance: string
          team_id: string
          title: string
          version?: number
        }
        Update: {
          assignment_id?: string
          company?: string
          guidance?: string
          team_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guided_recommendations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "guided_configs"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      guided_requests: {
        Row: {
          assignment_id: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_note: string
          id: string
          proposal: Json
          requested_at: string
          requested_by: string
          status: string
          team_id: string
        }
        Insert: {
          assignment_id: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_note?: string
          id?: string
          proposal: Json
          requested_at?: string
          requested_by: string
          status?: string
          team_id: string
        }
        Update: {
          assignment_id?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_note?: string
          id?: string
          proposal?: Json
          requested_at?: string
          requested_by?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guided_requests_assignment_id_team_id_fkey"
            columns: ["assignment_id", "team_id"]
            isOneToOne: false
            referencedRelation: "guided_states"
            referencedColumns: ["assignment_id", "team_id"]
          },
        ]
      }
      guided_states: {
        Row: {
          assignment_id: string
          direction: string | null
          frozen: boolean
          original_research: Json
          research: Json
          researched_at: string
          researched_by: string
          team_id: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          assignment_id: string
          direction?: string | null
          frozen?: boolean
          original_research: Json
          research: Json
          researched_at?: string
          researched_by: string
          team_id: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          assignment_id?: string
          direction?: string | null
          frozen?: boolean
          original_research?: Json
          research?: Json
          researched_at?: string
          researched_by?: string
          team_id?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guided_states_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "guided_configs"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      investigation_attempts: {
        Row: {
          assignment_id: string
          created_at: string
          enrollment_id: string
          hints: Json
          name: string
          reason: string
          submission_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          enrollment_id: string
          hints: Json
          name: string
          reason: string
          submission_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          enrollment_id?: string
          hints?: Json
          name?: string
          reason?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "investigation_configs"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      investigation_configs: {
        Row: {
          assignment_id: string
          content: Json
          version: number
        }
        Insert: {
          assignment_id: string
          content: Json
          version?: number
        }
        Update: {
          assignment_id?: string
          content?: Json
          version?: number
        }
        Relationships: []
      }
      investigation_receipts: {
        Row: {
          actor_id: string
          payload: Json
          request_id: string
          result: Json
        }
        Insert: {
          actor_id: string
          payload: Json
          request_id: string
          result: Json
        }
        Update: {
          actor_id?: string
          payload?: Json
          request_id?: string
          result?: Json
        }
        Relationships: []
      }
      investigation_reveals: {
        Row: {
          hint_id: string
          opened_at: string
          run_id: string
        }
        Insert: {
          hint_id: string
          opened_at?: string
          run_id: string
        }
        Update: {
          hint_id?: string
          opened_at?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigation_reveals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "investigation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_runs: {
        Row: {
          assignment_id: string
          enrollment_id: string
          id: string
          name: string
          reason: string
          saved_at: string | null
          version: number
        }
        Insert: {
          assignment_id: string
          enrollment_id: string
          id?: string
          name?: string
          reason?: string
          saved_at?: string | null
          version?: number
        }
        Update: {
          assignment_id?: string
          enrollment_id?: string
          id?: string
          name?: string
          reason?: string
          saved_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "investigation_runs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "investigation_configs"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      monday_application_links: {
        Row: {
          account_id: string
          board_id: string
          created_at: string
          enrollment_id: string
          id: string
          item_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          board_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          item_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          board_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          item_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      monday_import_batches: {
        Row: {
          account_id: string
          board_id: string
          created_at: string
          expires_at: string
          id: string
          mappings: Json
          owner_id: string
          results: Json
          rows: Json
        }
        Insert: {
          account_id: string
          board_id: string
          created_at?: string
          expires_at?: string
          id?: string
          mappings?: Json
          owner_id: string
          results?: Json
          rows: Json
        }
        Update: {
          account_id?: string
          board_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          mappings?: Json
          owner_id?: string
          results?: Json
          rows?: Json
        }
        Relationships: []
      }
      submission_requests: {
        Row: {
          actor_id: string
          payload: Json
          request_id: string
          submission_id: string
          target_id: string
        }
        Insert: {
          actor_id: string
          payload: Json
          request_id: string
          submission_id: string
          target_id: string
        }
        Update: {
          actor_id?: string
          payload?: Json
          request_id?: string
          submission_id?: string
          target_id?: string
        }
        Relationships: []
      }
      upload_intents: {
        Row: {
          assignment_id: string
          cleanup_at: string | null
          cleanup_error: boolean
          created_at: string
          enrollment_id: string
          expected_id: string | null
          expected_size: number
          expected_updated_at: string | null
          expires_at: string
          id: string
          mime_type: string
          original_filename: string
          owner_id: string
          path: string
          state: string
          submission_id: string
          target_id: string | null
          team_version: number | null
        }
        Insert: {
          assignment_id: string
          cleanup_at?: string | null
          cleanup_error?: boolean
          created_at?: string
          enrollment_id: string
          expected_id?: string | null
          expected_size: number
          expected_updated_at?: string | null
          expires_at?: string
          id?: string
          mime_type: string
          original_filename: string
          owner_id: string
          path: string
          state?: string
          submission_id?: string
          target_id?: string | null
          team_version?: number | null
        }
        Update: {
          assignment_id?: string
          cleanup_at?: string | null
          cleanup_error?: boolean
          created_at?: string
          enrollment_id?: string
          expected_id?: string | null
          expected_size?: number
          expected_updated_at?: string | null
          expires_at?: string
          id?: string
          mime_type?: string
          original_filename?: string
          owner_id?: string
          path?: string
          state?: string
          submission_id?: string
          target_id?: string | null
          team_version?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_mutate_before_teams: {
        Args: { p_action: string; p_data: Json }
        Returns: string
      }
      can_learn: { Args: { p_cohort: string }; Returns: boolean }
      can_read_content: { Args: { p_cohort: string }; Returns: boolean }
      can_read_target: { Args: { p_target: string }; Returns: boolean }
      can_read_team: { Args: { p_team: string }; Returns: boolean }
      case_enrollment: { Args: { p_assignment: string }; Returns: string }
      current_member: {
        Args: never
        Returns: Database["public"]["Tables"]["approved_members"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "approved_members"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      enroll_in_gap: {
        Args: {
          p_account_id?: string
          p_board_id?: string
          p_cohort_id: string
          p_email: string
          p_full_name: string
          p_item_id?: string
        }
        Returns: {
          created: boolean
          enrollment_id: string
          person_id: string
        }[]
      }
      file_upload_impl: {
        Args: {
          p_action: string
          p_actor: string
          p_data?: Json
          p_intent?: string
        }
        Returns: Json
      }
      guided_fields_valid: {
        Args: { p_fields: string[]; p_limit: number; p_value: Json }
        Returns: boolean
      }
      guided_ready: {
        Args: { p_assignment: string; p_team: string }
        Returns: boolean
      }
      investigation_enrollment: {
        Args: { p_assignment: string }
        Returns: string
      }
      investigation_name: { Args: { p_name: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_viewer: { Args: never; Returns: boolean }
      manage_team_impl: {
        Args: { p_action: string; p_data: Json }
        Returns: string
      }
      may_download: { Args: { p_path: string }; Returns: boolean }
      may_download_brief: { Args: { p_path: string }; Returns: boolean }
      may_read_grading_example: { Args: { p_path: string }; Returns: boolean }
      may_upload: { Args: { p_path: string }; Returns: boolean }
      may_upload_brief: { Args: { p_path: string }; Returns: boolean }
      may_upload_grading_example: { Args: { p_path: string }; Returns: boolean }
      my_person_id: { Args: never; Returns: string }
      resolve_submission_target: {
        Args: { p_assignment: string }
        Returns: Database["public"]["Tables"]["submission_targets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "submission_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_submission_target_before_cases: {
        Args: { p_assignment: string }
        Returns: Database["public"]["Tables"]["submission_targets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "submission_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_submission_target_before_credit: {
        Args: { p_assignment: string }
        Returns: Database["public"]["Tables"]["submission_targets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "submission_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_submission_target_before_guided: {
        Args: { p_assignment: string }
        Returns: Database["public"]["Tables"]["submission_targets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "submission_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_submission_target_before_investigation: {
        Args: { p_assignment: string }
        Returns: Database["public"]["Tables"]["submission_targets"]["Row"]
        SetofOptions: {
          from: "*"
          to: "submission_targets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_week_before_teams: { Args: { p_data: Json }; Returns: string }
      submission_gate: { Args: never; Returns: undefined }
      team_file_upload_impl: {
        Args: {
          p_action: string
          p_actor: string
          p_data?: Json
          p_intent?: string
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
      approved_members: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          person_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          person_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          person_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_completions: {
        Row: {
          assignment_id: string
          enrollment_id: string
          granted_at: string
          granted_by: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          assignment_id: string
          enrollment_id: string
          granted_at?: string
          granted_by: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          assignment_id?: string
          enrollment_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cohort_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_completions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_completions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_documents: {
        Row: {
          assignment_id: string
          created_at: string
          expected_id: string | null
          expires_at: string
          file_size: number
          id: string
          is_current: boolean
          original_filename: string
          owner_id: string
          path: string
          state: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          expected_id?: string | null
          expires_at?: string
          file_size: number
          id?: string
          is_current?: boolean
          original_filename: string
          owner_id: string
          path: string
          state?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          expected_id?: string | null
          expires_at?: string
          file_size?: number
          id?: string
          is_current?: boolean
          original_filename?: string
          owner_id?: string
          path?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_documents_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_documents_expected_id_fkey"
            columns: ["expected_id"]
            isOneToOne: false
            referencedRelation: "assignment_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_grading_references: {
        Row: {
          assignment_id: string
          example: string
          file_version: number
          rubric: string
          text_version: number
          updated_at: string
        }
        Insert: {
          assignment_id: string
          example?: string
          file_version?: number
          rubric?: string
          text_version?: number
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          example?: string
          file_version?: number
          rubric?: string
          text_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_grading_references_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          due_at: string
          id: string
          instructions: string
          instructions_format: string
          sort_order: number
          submission_mode: string
          summary: string | null
          title: string
          updated_at: string
          week_id: string
          workflow: string
        }
        Insert: {
          created_at?: string
          due_at: string
          id?: string
          instructions: string
          instructions_format?: string
          sort_order?: number
          submission_mode?: string
          summary?: string | null
          title: string
          updated_at?: string
          week_id: string
          workflow?: string
        }
        Update: {
          created_at?: string
          due_at?: string
          id?: string
          instructions?: string
          instructions_format?: string
          sort_order?: number
          submission_mode?: string
          summary?: string | null
          title?: string
          updated_at?: string
          week_id?: string
          workflow?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          enrollment_id: string
          id: string
          present: boolean
          recorded_at: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          enrollment_id: string
          id?: string
          present: boolean
          recorded_at?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          enrollment_id?: string
          id?: string
          present?: boolean
          recorded_at?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cohort_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          closed_at: string | null
          closes_at: string
          id: string
          opened_at: string
          updated_at: string
          week_id: string
          workshop_date: string
        }
        Insert: {
          closed_at?: string | null
          closes_at: string
          id?: string
          opened_at: string
          updated_at?: string
          week_id: string
          workshop_date: string
        }
        Update: {
          closed_at?: string | null
          closes_at?: string
          id?: string
          opened_at?: string
          updated_at?: string
          week_id?: string
          workshop_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: true
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_enrollments: {
        Row: {
          advancement_status: Database["public"]["Enums"]["advancement_status"]
          cohort_id: string
          created_at: string
          id: string
          is_test: boolean
          participation_status: Database["public"]["Enums"]["participation_status"]
          person_id: string
          promotion_response:
            | Database["public"]["Enums"]["promotion_response"]
            | null
          updated_at: string
        }
        Insert: {
          advancement_status?: Database["public"]["Enums"]["advancement_status"]
          cohort_id: string
          created_at?: string
          id?: string
          is_test?: boolean
          participation_status?: Database["public"]["Enums"]["participation_status"]
          person_id: string
          promotion_response?:
            | Database["public"]["Enums"]["promotion_response"]
            | null
          updated_at?: string
        }
        Update: {
          advancement_status?: Database["public"]["Enums"]["advancement_status"]
          cohort_id?: string
          created_at?: string
          id?: string
          is_test?: boolean
          participation_status?: Database["public"]["Enums"]["participation_status"]
          person_id?: string
          promotion_response?:
            | Database["public"]["Enums"]["promotion_response"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "program_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_enrollments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_teams: {
        Row: {
          cohort_id: string
          id: string
          is_test: boolean
          locked: boolean
          name: string
          version: number
        }
        Insert: {
          cohort_id: string
          id?: string
          is_test?: boolean
          locked?: boolean
          name: string
          version?: number
        }
        Update: {
          cohort_id?: string
          id?: string
          is_test?: boolean
          locked?: boolean
          name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cohort_teams_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "program_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_example_documents: {
        Row: {
          assignment_id: string
          cleanup_after: string | null
          cleanup_failed: boolean
          created_at: string
          expected_file_version: number
          expires_at: string
          file_size: number
          id: string
          is_current: boolean
          original_filename: string
          owner_id: string
          path: string
          state: string
        }
        Insert: {
          assignment_id: string
          cleanup_after?: string | null
          cleanup_failed?: boolean
          created_at?: string
          expected_file_version: number
          expires_at?: string
          file_size: number
          id?: string
          is_current?: boolean
          original_filename: string
          owner_id: string
          path: string
          state?: string
        }
        Update: {
          assignment_id?: string
          cleanup_after?: string | null
          cleanup_failed?: boolean
          created_at?: string
          expected_file_version?: number
          expires_at?: string
          file_size?: number
          id?: string
          is_current?: boolean
          original_filename?: string
          owner_id?: string
          path?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_example_documents_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignment_grading_references"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          person_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          person_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          person_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      program_cohorts: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          quarter: Database["public"]["Enums"]["program_quarter"]
          starts_on: string
          state: Database["public"]["Enums"]["cohort_state"]
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          quarter: Database["public"]["Enums"]["program_quarter"]
          starts_on: string
          state?: Database["public"]["Enums"]["cohort_state"]
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          quarter?: Database["public"]["Enums"]["program_quarter"]
          starts_on?: string
          state?: Database["public"]["Enums"]["cohort_state"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      program_weeks: {
        Row: {
          cohort_id: string
          created_at: string
          description: string
          id: string
          published: boolean
          slides_url: string | null
          title: string
          updated_at: string
          week_number: number
        }
        Insert: {
          cohort_id: string
          created_at?: string
          description?: string
          id?: string
          published?: boolean
          slides_url?: string | null
          title: string
          updated_at?: string
          week_number: number
        }
        Update: {
          cohort_id?: string
          created_at?: string
          description?: string
          id?: string
          published?: boolean
          slides_url?: string | null
          title?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "program_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          resource_type: string
          sort_order: number
          title: string
          updated_at: string
          url: string
          week_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          resource_type: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
          week_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          resource_type?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_targets: {
        Row: {
          assignment_id: string
          enrollment_id: string | null
          id: string
          team_id: string | null
        }
        Insert: {
          assignment_id: string
          enrollment_id?: string | null
          id?: string
          team_id?: string | null
        }
        Update: {
          assignment_id?: string
          enrollment_id?: string | null
          id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_targets_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_targets_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cohort_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_targets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "cohort_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          enrollment_id: string | null
          feedback: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_current: boolean
          mime_type: string | null
          original_filename: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submission_type: Database["public"]["Enums"]["submission_type"]
          submitted_at: string
          submitted_by: string | null
          submitted_text: string | null
          submitted_url: string | null
          supersedes_submission_id: string | null
          target_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          enrollment_id?: string | null
          feedback?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_current?: boolean
          mime_type?: string | null
          original_filename?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_type: Database["public"]["Enums"]["submission_type"]
          submitted_at?: string
          submitted_by?: string | null
          submitted_text?: string | null
          submitted_url?: string | null
          supersedes_submission_id?: string | null
          target_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          enrollment_id?: string | null
          feedback?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_current?: boolean
          mime_type?: string | null
          original_filename?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_type?: Database["public"]["Enums"]["submission_type"]
          submitted_at?: string
          submitted_by?: string | null
          submitted_text?: string | null
          submitted_url?: string | null
          supersedes_submission_id?: string | null
          target_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "cohort_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_supersedes_submission_id_fkey"
            columns: ["supersedes_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "submission_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "cohort_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          enrollment_id: string
          team_id: string
        }
        Insert: {
          enrollment_id: string
          team_id: string
        }
        Update: {
          enrollment_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "cohort_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "cohort_teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activity: {
        Args: never
        Returns: {
          last_active_at: string
          person_id: string
        }[]
      }
      admin_mutate: {
        Args: { p_action: string; p_data: Json }
        Returns: string
      }
      assignment_brief: {
        Args: {
          p_action: string
          p_actor: string
          p_data?: Json
          p_id?: string
        }
        Returns: Json
      }
      attendance: { Args: { p_action: string; p_data?: Json }; Returns: Json }
      case_progress: {
        Args: { p_enrollment?: string }
        Returns: {
          answered: number
          assignment_id: string
          completed_at: string
          enrollment_id: string
        }[]
      }
      cleanup_grading_examples: {
        Args: { p_failed?: boolean; p_id?: string; p_owner?: string }
        Returns: {
          assignment_id: string
          cleanup_after: string | null
          cleanup_failed: boolean
          created_at: string
          expected_file_version: number
          expires_at: string
          file_size: number
          id: string
          is_current: boolean
          original_filename: string
          owner_id: string
          path: string
          state: string
        }[]
        SetofOptions: {
          from: "*"
          to: "grading_example_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_uploads: {
        Args: { p_failed?: boolean; p_id?: string; p_owner?: string }
        Returns: Json
      }
      file_upload: {
        Args: {
          p_action: string
          p_actor: string
          p_data?: Json
          p_intent?: string
        }
        Returns: Json
      }
      grading_example: {
        Args: {
          p_action: string
          p_actor: string
          p_data?: Json
          p_id?: string
        }
        Returns: Json
      }
      investigation_insights: {
        Args: { p_assignment: string; p_test?: boolean }
        Returns: Json
      }
      investigation_review: { Args: { p_submission: string }; Returns: Json }
      manage_team: { Args: { p_action: string; p_data: Json }; Returns: string }
      monday_attendance_snapshot: {
        Args: {
          p_account: string
          p_actor: string
          p_board: string
          p_cohort: string
          p_enrollment?: string
          p_week: string
        }
        Returns: Json
      }
      monday_import: {
        Args: {
          p_action: string
          p_actor: string
          p_batch?: string
          p_data?: Json
        }
        Returns: Json
      }
      mutate_case_exercise: {
        Args: {
          p_action: string
          p_assignment: string
          p_data: Json
          p_request: string
        }
        Returns: Json
      }
      mutate_guided_project: {
        Args: {
          p_action: string
          p_assignment: string
          p_data: Json
          p_request: string
        }
        Returns: Json
      }
      mutate_investigation: {
        Args: {
          p_action: string
          p_assignment: string
          p_data: Json
          p_request: string
        }
        Returns: Json
      }
      my_team: { Args: { p_enrollment: string }; Returns: Json }
      read_assignment_team_briefs: {
        Args: { p_assignment: string; p_team?: string }
        Returns: Json
      }
      read_case_exercise: {
        Args: {
          p_assignment: string
          p_enrollment?: string
          p_preview?: boolean
        }
        Returns: Json
      }
      read_guided_project: {
        Args: { p_assignment: string; p_team?: string }
        Returns: Json
      }
      read_investigation: {
        Args: { p_assignment: string; p_preview?: boolean }
        Returns: Json
      }
      record_activity: { Args: never; Returns: undefined }
      review_submission: {
        Args: { p_data: Json }
        Returns: {
          id: string
          updated_at: string
        }[]
      }
      save_assignment_team_brief: {
        Args: {
          p_assignment: string
          p_instructions: string
          p_request: string
          p_team: string
          p_version: number
        }
        Returns: Json
      }
      save_grading_reference: {
        Args: {
          p_assignment: string
          p_example: string
          p_rubric: string
          p_version: number
        }
        Returns: {
          assignment_id: string
          example: string
          file_version: number
          rubric: string
          text_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "assignment_grading_references"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_program_week: { Args: { p_data: Json }; Returns: string }
      set_assignment_completion: {
        Args: {
          p_action: string
          p_assignment: string
          p_credit?: string
          p_enrollment: string
        }
        Returns: string
      }
      set_test_participation: {
        Args: { p_id: string; p_is_test: boolean }
        Returns: string
      }
      submit_link: {
        Args: {
          p_assignment_id: string
          p_expected_id?: string
          p_expected_updated_at?: string
          p_url: string
        }
        Returns: string
      }
      submit_response: {
        Args: {
          p_assignment: string
          p_expected?: string
          p_request: string
          p_type: string
          p_value: string
          p_version?: string
        }
        Returns: string
      }
      submit_text: {
        Args: {
          p_assignment_id: string
          p_expected_id?: string
          p_expected_updated_at?: string
          p_text: string
        }
        Returns: string
      }
      sync_profile: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          person_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_cohort_dates: {
        Args: { p_ends_on: string; p_id: string; p_starts_on: string }
        Returns: string
      }
      week_catalog: {
        Args: { p_cohort_id: string }
        Returns: {
          cohort_id: string
          id: string
          published: boolean
          title: string
          week_number: number
        }[]
      }
    }
    Enums: {
      advancement_status: "pending" | "promoted" | "not_promoted"
      app_role: "member" | "admin" | "viewer"
      cohort_state: "draft" | "active" | "archived"
      participation_status: "enrolled" | "completed" | "withdrew"
      program_quarter: "fall" | "winter" | "spring"
      promotion_response: "pending" | "joined" | "declined"
      submission_status: "submitted" | "revision_requested" | "completed"
      submission_type: "file" | "link" | "text"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  private: {
    Enums: {},
  },
  public: {
    Enums: {
      advancement_status: ["pending", "promoted", "not_promoted"],
      app_role: ["member", "admin", "viewer"],
      cohort_state: ["draft", "active", "archived"],
      participation_status: ["enrolled", "completed", "withdrew"],
      program_quarter: ["fall", "winter", "spring"],
      promotion_response: ["pending", "joined", "declined"],
      submission_status: ["submitted", "revision_requested", "completed"],
      submission_type: ["file", "link", "text"],
    },
  },
} as const

