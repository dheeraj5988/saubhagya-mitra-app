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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          client_key: string
          created_at: string
          failed_count: number
          first_failed_at: string
          id: string
          last_failed_at: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          client_key: string
          created_at?: string
          failed_count?: number
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          client_key?: string
          created_at?: string
          failed_count?: number
          first_failed_at?: string
          id?: string
          last_failed_at?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
        }
        Relationships: []
      }
      election_symbols: {
        Row: {
          active: boolean
          created_at: string
          id: string
          party_name: string
          sort_order: number
          symbol_image_path: string | null
          symbol_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          party_name: string
          sort_order?: number
          symbol_image_path?: string | null
          symbol_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          party_name?: string
          sort_order?: number
          symbol_image_path?: string | null
          symbol_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          candidate_name_english: string
          candidate_name_hindi: string
          contact_number: string
          created_at: string
          district: string
          election_symbol: string
          election_symbol_id: string | null
          gram_panchayat: string
          id: string
          ip_address: string | null
          order_id: string
          panchayat_samiti: string
          party_name_snapshot: string | null
          payment_amount: number | null
          payment_screenshot_path: string | null
          payment_status: string
          payment_txn_id: string | null
          payment_updated_at: string | null
          photo_path: string | null
          slogan: string | null
          status: string
          symbol_name_snapshot: string | null
          ward_number: string
        }
        Insert: {
          candidate_name_english: string
          candidate_name_hindi: string
          contact_number: string
          created_at?: string
          district: string
          election_symbol: string
          election_symbol_id?: string | null
          gram_panchayat: string
          id?: string
          ip_address?: string | null
          order_id: string
          panchayat_samiti: string
          party_name_snapshot?: string | null
          payment_amount?: number | null
          payment_screenshot_path?: string | null
          payment_status?: string
          payment_txn_id?: string | null
          payment_updated_at?: string | null
          photo_path?: string | null
          slogan?: string | null
          status?: string
          symbol_name_snapshot?: string | null
          ward_number: string
        }
        Update: {
          candidate_name_english?: string
          candidate_name_hindi?: string
          contact_number?: string
          created_at?: string
          district?: string
          election_symbol?: string
          election_symbol_id?: string | null
          gram_panchayat?: string
          id?: string
          ip_address?: string | null
          order_id?: string
          panchayat_samiti?: string
          party_name_snapshot?: string | null
          payment_amount?: number | null
          payment_screenshot_path?: string | null
          payment_status?: string
          payment_txn_id?: string | null
          payment_updated_at?: string | null
          photo_path?: string | null
          slogan?: string | null
          status?: string
          symbol_name_snapshot?: string | null
          ward_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_election_symbol_id_fkey"
            columns: ["election_symbol_id"]
            isOneToOne: false
            referencedRelation: "election_symbols"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_secrets: {
        Row: {
          created_at: string
          id: string
          paypur_api_key: string | null
          paypur_signing_secret: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          paypur_api_key?: string | null
          paypur_signing_secret?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          paypur_api_key?: string | null
          paypur_signing_secret?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          amount: number | null
          created_at: string
          display_name: string | null
          id: string
          instructions: string | null
          paypur_amount: number | null
          paypur_base_url: string
          paypur_enabled: boolean
          paypur_failure_url: string | null
          paypur_success_url: string | null
          qr_image_path: string | null
          singleton: boolean
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          instructions?: string | null
          paypur_amount?: number | null
          paypur_base_url?: string
          paypur_enabled?: boolean
          paypur_failure_url?: string | null
          paypur_success_url?: string | null
          qr_image_path?: string | null
          singleton?: boolean
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          instructions?: string | null
          paypur_amount?: number | null
          paypur_base_url?: string
          paypur_enabled?: boolean
          paypur_failure_url?: string | null
          paypur_success_url?: string | null
          qr_image_path?: string | null
          singleton?: boolean
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      visitor_leads: {
        Row: {
          id: string
          ip_address: string | null
          lead_type: string
          order_id: string | null
          phone: string | null
          status: string
          updated_at: string
          visited_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          lead_type?: string
          order_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          visited_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          lead_type?: string
          order_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          visited_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_distinct_wards: {
        Args: never
        Returns: {
          ward_number: string
        }[]
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
  public: {
    Enums: {},
  },
} as const
