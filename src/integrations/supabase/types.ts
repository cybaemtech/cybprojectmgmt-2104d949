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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          entity_id: number | null
          entity_type: string
          id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          entity_id?: number | null
          entity_type: string
          id?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          entity_id?: number | null
          entity_type?: string
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: number
          mime_type: string | null
          user_id: string
          work_item_id: number
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: number
          mime_type?: string | null
          user_id: string
          work_item_id: number
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: number
          mime_type?: string | null
          user_id?: string
          work_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "attachments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: number
          updated_at: string | null
          user_id: string
          work_item_id: number
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
          user_id: string
          work_item_id: number
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
          user_id?: string
          work_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          expires_at: string | null
          id: number
          joined_at: string | null
          project_id: number
          role: Database["public"]["Enums"]["team_role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: number
          joined_at?: string | null
          project_id: number
          role?: Database["public"]["Enums"]["team_role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: number
          joined_at?: string | null
          project_id?: number
          role?: Database["public"]["Enums"]["team_role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category: Database["public"]["Enums"]["project_category"] | null
          client_account_manager: string | null
          client_company_name: string | null
          client_contact_email: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          client_industry: string | null
          client_notes: string | null
          client_status: Database["public"]["Enums"]["client_status"] | null
          client_website: string | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          description: string | null
          github_url: string | null
          id: number
          key: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          target_date: string | null
          team_id: number | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["project_category"] | null
          client_account_manager?: string | null
          client_company_name?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_industry?: string | null
          client_notes?: string | null
          client_status?: Database["public"]["Enums"]["client_status"] | null
          client_website?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          description?: string | null
          github_url?: string | null
          id?: number
          key: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_date?: string | null
          team_id?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["project_category"] | null
          client_account_manager?: string | null
          client_company_name?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_industry?: string | null
          client_notes?: string | null
          client_status?: Database["public"]["Enums"]["client_status"] | null
          client_website?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          description?: string | null
          github_url?: string | null
          id?: number
          key?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          target_date?: string | null
          team_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: number
          joined_at: string | null
          role: Database["public"]["Enums"]["team_role"] | null
          team_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: number
          joined_at?: string | null
          role?: Database["public"]["Enums"]["team_role"] | null
          team_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: number
          joined_at?: string | null
          role?: Database["public"]["Enums"]["team_role"] | null
          team_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          is_locked: boolean | null
          name: string
          tasks: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          is_locked?: boolean | null
          name: string
          tasks?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          is_locked?: boolean | null
          name?: string
          tasks?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_item_history: {
        Row: {
          created_at: string | null
          field_name: string
          id: number
          new_value: string | null
          old_value: string | null
          user_id: string | null
          work_item_id: number
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
          work_item_id: number
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: number
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
          work_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_item_history_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          actual_hours: string | null
          assignee_id: string | null
          bug_type: string | null
          completed_at: string | null
          created_at: string | null
          created_by_email: string | null
          created_by_name: string | null
          current_behavior: string | null
          description: string | null
          end_date: string | null
          estimate: string | null
          expected_behavior: string | null
          external_id: string | null
          github_url: string | null
          id: number
          parent_id: number | null
          pdf_upload_blob: string | null
          pdf_upload_path: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          project_id: number
          prototype_link: string | null
          prototype_status: string | null
          reference_url: string | null
          reporter_id: string | null
          screenshot: string | null
          screenshot_blob: string | null
          screenshot_path: string | null
          severity: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["item_status"] | null
          tags: string | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          actual_hours?: string | null
          assignee_id?: string | null
          bug_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          current_behavior?: string | null
          description?: string | null
          end_date?: string | null
          estimate?: string | null
          expected_behavior?: string | null
          external_id?: string | null
          github_url?: string | null
          id?: number
          parent_id?: number | null
          pdf_upload_blob?: string | null
          pdf_upload_path?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id: number
          prototype_link?: string | null
          prototype_status?: string | null
          reference_url?: string | null
          reporter_id?: string | null
          screenshot?: string | null
          screenshot_blob?: string | null
          screenshot_path?: string | null
          severity?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["item_status"] | null
          tags?: string | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          actual_hours?: string | null
          assignee_id?: string | null
          bug_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          current_behavior?: string | null
          description?: string | null
          end_date?: string | null
          estimate?: string | null
          expected_behavior?: string | null
          external_id?: string | null
          github_url?: string | null
          id?: number
          parent_id?: number | null
          pdf_upload_blob?: string | null
          pdf_upload_path?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          project_id?: number
          prototype_link?: string | null
          prototype_status?: string | null
          reference_url?: string | null
          reporter_id?: string | null
          screenshot?: string | null
          screenshot_blob?: string | null
          screenshot_path?: string | null
          severity?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["item_status"] | null
          tags?: string | null
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      client_status: "LEAD" | "ONBOARDING" | "ACTIVE" | "CHURNED"
      item_status: "TODO" | "IN_PROGRESS" | "ON_HOLD" | "DONE"
      item_type: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG"
      priority_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      project_category: "CLIENT" | "IN_HOUSE"
      project_status: "PLANNING" | "ACTIVE" | "ARCHIVED" | "COMPLETED"
      team_role: "ADMIN" | "MEMBER" | "VIEWER"
      user_role: "ADMIN" | "SCRUM_MASTER" | "USER"
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
      client_status: ["LEAD", "ONBOARDING", "ACTIVE", "CHURNED"],
      item_status: ["TODO", "IN_PROGRESS", "ON_HOLD", "DONE"],
      item_type: ["EPIC", "FEATURE", "STORY", "TASK", "BUG"],
      priority_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      project_category: ["CLIENT", "IN_HOUSE"],
      project_status: ["PLANNING", "ACTIVE", "ARCHIVED", "COMPLETED"],
      team_role: ["ADMIN", "MEMBER", "VIEWER"],
      user_role: ["ADMIN", "SCRUM_MASTER", "USER"],
    },
  },
} as const
