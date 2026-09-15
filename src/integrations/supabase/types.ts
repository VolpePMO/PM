export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_pages: {
        Row: {
          created_at: string;
          id: string;
          is_visible: boolean;
          label: string;
          path: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          label: string;
          path: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_visible?: boolean;
          label?: string;
          path?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      backlog_attachments: {
        Row: {
          backlog_item_id: string;
          comment_id: string | null;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          prd_id: string | null;
          size_bytes: number | null;
          storage_path: string;
          subtask_id: string | null;
          updated_at: string;
          uploaded_by: string | null;
          uploader_name: string | null;
        };
        Insert: {
          backlog_item_id: string;
          comment_id?: string | null;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          prd_id?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          subtask_id?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          uploader_name?: string | null;
        };
        Update: {
          backlog_item_id?: string;
          comment_id?: string | null;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          prd_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          subtask_id?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          uploader_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "backlog_attachments_backlog_item_id_fkey";
            columns: ["backlog_item_id"];
            isOneToOne: false;
            referencedRelation: "backlog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "backlog_attachments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "backlog_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "backlog_attachments_prd_id_fkey";
            columns: ["prd_id"];
            isOneToOne: false;
            referencedRelation: "prds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "backlog_attachments_subtask_id_fkey";
            columns: ["subtask_id"];
            isOneToOne: false;
            referencedRelation: "backlog_subtasks";
            referencedColumns: ["id"];
          },
        ];
      };
      backlog_comments: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          backlog_item_id: string;
          body: string;
          created_at: string;
          id: string;
          kind: string;
          mentions: string[];
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          author_name?: string | null;
          backlog_item_id: string;
          body: string;
          created_at?: string;
          id?: string;
          kind?: string;
          mentions?: string[];
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string | null;
          backlog_item_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          mentions?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backlog_comments_backlog_item_id_fkey";
            columns: ["backlog_item_id"];
            isOneToOne: false;
            referencedRelation: "backlog_items";
            referencedColumns: ["id"];
          },
        ];
      };
      backlog_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          difficulty: Database["public"]["Enums"]["difficulty"];
          id: string;
          objective_id: string | null;
          owner_id: string | null;
          period: string | null;
          status: Database["public"]["Enums"]["item_status"];
          title: string;
          type: Database["public"]["Enums"]["item_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          id?: string;
          objective_id?: string | null;
          owner_id?: string | null;
          period?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          title: string;
          type?: Database["public"]["Enums"]["item_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          id?: string;
          objective_id?: string | null;
          owner_id?: string | null;
          period?: string | null;
          status?: Database["public"]["Enums"]["item_status"];
          title?: string;
          type?: Database["public"]["Enums"]["item_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backlog_items_objective_id_fkey";
            columns: ["objective_id"];
            isOneToOne: false;
            referencedRelation: "objectives";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "backlog_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      backlog_subtasks: {
        Row: {
          backlog_item_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          position: number;
          status: Database["public"]["Enums"]["item_status"];
          story_points: number | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          backlog_item_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          position?: number;
          status?: Database["public"]["Enums"]["item_status"];
          story_points?: number | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          backlog_item_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          position?: number;
          status?: Database["public"]["Enums"]["item_status"];
          story_points?: number | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "backlog_subtasks_backlog_item_id_fkey";
            columns: ["backlog_item_id"];
            isOneToOne: false;
            referencedRelation: "backlog_items";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_requests: {
        Row: {
          area: string | null;
          author_name: string | null;
          backlog_item_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          owner_id: string | null;
          status: Database["public"]["Enums"]["feedback_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          area?: string | null;
          author_name?: string | null;
          backlog_item_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          owner_id?: string | null;
          status?: Database["public"]["Enums"]["feedback_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          area?: string | null;
          author_name?: string | null;
          backlog_item_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          owner_id?: string | null;
          status?: Database["public"]["Enums"]["feedback_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_requests_backlog_item_id_fkey";
            columns: ["backlog_item_id"];
            isOneToOne: false;
            referencedRelation: "backlog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_requests_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_votes: {
        Row: {
          created_at: string;
          id: string;
          request_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          request_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_votes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "feedback_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      key_results: {
        Row: {
          created_at: string;
          current_value: number;
          id: string;
          objective_id: string;
          start_value: number;
          target_value: number;
          title: string;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_value?: number;
          id?: string;
          objective_id: string;
          start_value?: number;
          target_value?: number;
          title: string;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_value?: number;
          id?: string;
          objective_id?: string;
          start_value?: number;
          target_value?: number;
          title?: string;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey";
            columns: ["objective_id"];
            isOneToOne: false;
            referencedRelation: "objectives";
            referencedColumns: ["id"];
          },
        ];
      };
      objectives: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          quarter: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          quarter: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          quarter?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prd_versions: {
        Row: {
          content: string;
          created_at: string;
          edited_by: string | null;
          editor_name: string | null;
          id: string;
          prd_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          edited_by?: string | null;
          editor_name?: string | null;
          id?: string;
          prd_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          edited_by?: string | null;
          editor_name?: string | null;
          id?: string;
          prd_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prd_versions_prd_id_fkey";
            columns: ["prd_id"];
            isOneToOne: false;
            referencedRelation: "prds";
            referencedColumns: ["id"];
          },
        ];
      };
      prds: {
        Row: {
          backlog_item_id: string;
          content: string;
          created_at: string;
          id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          backlog_item_id: string;
          content?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          backlog_item_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prds_backlog_item_id_fkey";
            columns: ["backlog_item_id"];
            isOneToOne: true;
            referencedRelation: "backlog_items";
            referencedColumns: ["id"];
          },
        ];
      };
      prioritization_items: {
        Row: {
          area: string | null;
          created_at: string;
          due_date: string | null;
          id: string;
          pace: number | null;
          position: number;
          priority: string | null;
          source_area: string | null;
          stage: string;
          status: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          area?: string | null;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          pace?: number | null;
          position?: number;
          priority?: string | null;
          source_area?: string | null;
          stage?: string;
          status?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          area?: string | null;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          pace?: number | null;
          position?: number;
          priority?: string | null;
          source_area?: string | null;
          stage?: string;
          status?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          is_active: boolean;
          must_change_password: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          is_active?: boolean;
          must_change_password?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          must_change_password?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_views: {
        Row: {
          created_at: string;
          filters: Json;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          filters?: Json;
          id?: string;
          name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          filters?: Json;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      count_active_admins: { Args: never; Returns: number };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      protected_admin_email: { Args: never; Returns: string };
    };
    Enums: {
      app_role: "admin" | "collaborator";
      difficulty: "muito_simples" | "simples" | "moderado" | "complexo" | "muito_complexo";
      feedback_status: "novo" | "em_analise" | "planejado" | "recusado";
      item_status: "ideia" | "planejado" | "em_desenvolvimento" | "concluido";
      item_type:
        | "feature"
        | "qol"
        | "bug"
        | "produto"
        | "teste"
        | "debito_tecnico"
        | "compliance"
        | "seguranca"
        | "discovery"
        | "infra"
        | "operacional";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "collaborator"],
      difficulty: ["muito_simples", "simples", "moderado", "complexo", "muito_complexo"],
      feedback_status: ["novo", "em_analise", "planejado", "recusado"],
      item_status: ["ideia", "planejado", "em_desenvolvimento", "concluido"],
      item_type: [
        "feature",
        "qol",
        "bug",
        "produto",
        "teste",
        "debito_tecnico",
        "compliance",
        "seguranca",
        "discovery",
        "infra",
        "operacional",
      ],
    },
  },
} as const;
