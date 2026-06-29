export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      canvas_snapshots: {
        Row: {
          id: string;
          project_id: string;
          version: number;
          snapshot: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          version: number;
          snapshot: Json;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          version?: number;
          snapshot?: Json;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      generation_tasks: {
        Row: {
          id: string;
          project_id: string;
          provider: string;
          prompt: string;
          negative_prompt: string | null;
          status: "draft" | "pending" | "processing" | "completed" | "failed";
          request_payload: Json;
          response_payload: Json | null;
          error_message: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          provider: string;
          prompt: string;
          negative_prompt?: string | null;
          status?: "draft" | "pending" | "processing" | "completed" | "failed";
          request_payload: Json;
          response_payload?: Json | null;
          error_message?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          provider?: string;
          prompt?: string;
          negative_prompt?: string | null;
          status?: "draft" | "pending" | "processing" | "completed" | "failed";
          request_payload?: Json;
          response_payload?: Json | null;
          error_message?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      generated_assets: {
        Row: {
          id: string;
          task_id: string;
          project_id: string;
          provider: string;
          prompt: string;
          storage_bucket: string | null;
          storage_path: string | null;
          source_url: string | null;
          width: number | null;
          height: number | null;
          mime_type: string | null;
          media_type: "image" | "video";
          duration_seconds: number | null;
          metadata: Json | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          project_id: string;
          provider: string;
          prompt: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          source_url?: string | null;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          media_type?: "image" | "video";
          duration_seconds?: number | null;
          metadata?: Json | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          project_id?: string;
          provider?: string;
          prompt?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          source_url?: string | null;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          media_type?: "image" | "video";
          duration_seconds?: number | null;
          metadata?: Json | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
