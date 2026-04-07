export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      citizens: {
        Row: {
          age_years: number | null;
          assigned_volunteer_id: string | null;
          birth_date: string | null;
          created_at: string;
          first_name: string;
          gender: string | null;
          house_no: string | null;
          id: string;
          last_name: string;
          national_id: string;
          prefix: string | null;
          screening_state: "completed" | "pending";
          screening_status_raw: string;
          sequence_no: number | null;
          source_phone: string | null;
          source_row: number;
          updated_at: string;
          village_code: string;
        };
        Insert: {
          age_years?: number | null;
          assigned_volunteer_id?: string | null;
          birth_date?: string | null;
          created_at?: string;
          first_name: string;
          gender?: string | null;
          house_no?: string | null;
          id?: string;
          last_name: string;
          national_id: string;
          prefix?: string | null;
          screening_state: "completed" | "pending";
          screening_status_raw: string;
          sequence_no?: number | null;
          source_phone?: string | null;
          source_row: number;
          updated_at?: string;
          village_code: string;
        };
        Update: {
          age_years?: number | null;
          assigned_volunteer_id?: string | null;
          birth_date?: string | null;
          created_at?: string;
          first_name?: string;
          gender?: string | null;
          house_no?: string | null;
          id?: string;
          last_name?: string;
          national_id?: string;
          prefix?: string | null;
          screening_state?: "completed" | "pending";
          screening_status_raw?: string;
          sequence_no?: number | null;
          source_phone?: string | null;
          source_row?: number;
          updated_at?: string;
          village_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "citizens_assigned_volunteer_id_fkey";
            columns: ["assigned_volunteer_id"];
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_intents: {
        Row: {
          citizen_id: string;
          contact_phone: string;
          created_at: string;
          id: string;
          intent_choice: string | null;
          updated_at: string;
          volunteer_id: string;
        };
        Insert: {
          citizen_id: string;
          contact_phone: string;
          created_at?: string;
          id?: string;
          intent_choice?: string | null;
          updated_at?: string;
          volunteer_id: string;
        };
        Update: {
          citizen_id?: string;
          contact_phone?: string;
          created_at?: string;
          id?: string;
          intent_choice?: string | null;
          updated_at?: string;
          volunteer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_intents_citizen_id_fkey";
            columns: ["citizen_id"];
            referencedRelation: "citizens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_intents_volunteer_id_fkey";
            columns: ["volunteer_id"];
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
        ];
      };
      volunteers: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          updated_at: string;
          village_code: string;
          volunteer_citizen_id: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          village_code: string;
          volunteer_citizen_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          village_code?: string;
          volunteer_citizen_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
