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
      geo_districts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          name_hindi: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          name_hindi?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          name_hindi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      geo_gram_panchayats: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          name_hindi: string | null
          samiti_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          name_hindi?: string | null
          samiti_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          name_hindi?: string | null
          samiti_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_gram_panchayats_samiti_id_fkey"
            columns: ["samiti_id"]
            isOneToOne: false
            referencedRelation: "geo_panchayat_samitis"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_panchayat_samitis: {
        Row: {
          active: boolean
          created_at: string
          district_id: string
          id: string
          name: string
          name_hindi: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          district_id: string
          id?: string
          name: string
          name_hindi?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          district_id?: string
          id?: string
          name?: string
          name_hindi?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_panchayat_samitis_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "geo_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_wards: {
        Row: {
          active: boolean
          created_at: string
          gram_panchayat_id: string
          id: string
          updated_at: string
          voter_count: number
          ward_number: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          gram_panchayat_id: string
          id?: string
          updated_at?: string
          voter_count?: number
          ward_number: string
        }
        Update: {
          active?: boolean
          created_at?: string
          gram_panchayat_id?: string
          id?: string
          updated_at?: string
          voter_count?: number
          ward_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_wards_gram_panchayat_id_fkey"
            columns: ["gram_panchayat_id"]
            isOneToOne: false
            referencedRelation: "geo_gram_panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          id: string
          name: string
          token_hash: string
          active: boolean | null
          paused: boolean | null
          last_seen_at: string | null
          current_order_id: string | null
          jobs_done: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          token_hash: string
          active?: boolean | null
          paused?: boolean | null
          last_seen_at?: string | null
          current_order_id?: string | null
          jobs_done?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          token_hash?: string
          active?: boolean | null
          paused?: boolean | null
          last_seen_at?: string | null
          current_order_id?: string | null
          jobs_done?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number | null
          body_name: string | null
          candidate_name_english: string
          candidate_name_hindi: string
          contact_number: string
          created_at: string
          design_code: string | null
          district: string
          election_symbol: string
          election_symbol_id: string | null
          evm_serial: string | null
          gram_panchayat: string
          id: string
          ip_address: string | null
          is_sample: boolean
          list_options: string[]
          order_id: string
          panchayat_samiti: string
          party_name_snapshot: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_status: string
          payment_txn_id: string | null
          payment_updated_at: string | null
          payment_intent_id: string | null
          payment_gateway_order_id: string | null
          processing_status: "new" | "queued" | "processing" | "ready" | "delivered" | "failed" | null
          assigned_worker_id: string | null
          output_files: any | null
          attempts: number | null
          processing_error: string | null
          processing_started_at: string | null
          processed_at: string | null
          source: string | null
          synced_to_pc_at: string | null
          pc_order_no: string | null
          hold_reason: string | null
          pad: string | null
          booth_ids: Json | null
          booth_snapshots: Json | null
          voter_photo_pdf_path: string | null
          photo_path: string | null
          poll_date: string | null
          rate_per_voter: number | null
          referral_attributed_at: string | null
          referral_code: string | null
          referral_partner_id: string | null
          referral_source: string | null
          slogan: string | null
          status: string
          symbol_name_snapshot: string | null
          user_agent: string | null
          voter_count: number | null
          ward_id: string | null
          ward_ids: string[]
          ward_number: string
          ward_snapshots: Json
        }
        Insert: {
          amount?: number | null
          body_name?: string | null
          candidate_name_english: string
          candidate_name_hindi: string
          contact_number: string
          created_at?: string
          design_code?: string | null
          district: string
          election_symbol: string
          election_symbol_id?: string | null
          evm_serial?: string | null
          gram_panchayat: string
          id?: string
          ip_address?: string | null
          is_sample?: boolean
          list_options?: string[]
          order_id: string
          panchayat_samiti: string
          party_name_snapshot?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_status?: string
          payment_txn_id?: string | null
          payment_updated_at?: string | null
          payment_intent_id?: string | null
          payment_gateway_order_id?: string | null
          processing_status?: "new" | "queued" | "processing" | "ready" | "delivered" | "failed" | null
          assigned_worker_id?: string | null
          output_files?: any | null
          attempts?: number | null
          processing_error?: string | null
          processing_started_at?: string | null
          processed_at?: string | null
          source?: string | null
          synced_to_pc_at?: string | null
          pc_order_no?: string | null
          hold_reason?: string | null
          pad?: string | null
          booth_ids?: Json | null
          booth_snapshots?: Json | null
          voter_photo_pdf_path?: string | null
          photo_path?: string | null
          poll_date?: string | null
          rate_per_voter?: number | null
          referral_attributed_at?: string | null
          referral_code?: string | null
          referral_partner_id?: string | null
          referral_source?: string | null
          slogan?: string | null
          status?: string
          symbol_name_snapshot?: string | null
          user_agent?: string | null
          voter_count?: number | null
          ward_id?: string | null
          ward_ids?: string[]
          ward_number: string
          ward_snapshots?: Json
        }
        Update: {
          amount?: number | null
          body_name?: string | null
          candidate_name_english?: string
          candidate_name_hindi?: string
          contact_number?: string
          created_at?: string
          design_code?: string | null
          district?: string
          election_symbol?: string
          election_symbol_id?: string | null
          evm_serial?: string | null
          gram_panchayat?: string
          id?: string
          ip_address?: string | null
          is_sample?: boolean
          list_options?: string[]
          order_id?: string
          panchayat_samiti?: string
          party_name_snapshot?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_status?: string
          payment_txn_id?: string | null
          payment_updated_at?: string | null
          payment_intent_id?: string | null
          payment_gateway_order_id?: string | null
          processing_status?: "new" | "queued" | "processing" | "ready" | "delivered" | "failed" | null
          assigned_worker_id?: string | null
          output_files?: any | null
          attempts?: number | null
          processing_error?: string | null
          processing_started_at?: string | null
          processed_at?: string | null
          source?: string | null
          synced_to_pc_at?: string | null
          pc_order_no?: string | null
          hold_reason?: string | null
          pad?: string | null
          booth_ids?: Json | null
          booth_snapshots?: Json | null
          voter_photo_pdf_path?: string | null
          photo_path?: string | null
          poll_date?: string | null
          rate_per_voter?: number | null
          referral_attributed_at?: string | null
          referral_code?: string | null
          referral_partner_id?: string | null
          referral_source?: string | null
          slogan?: string | null
          status?: string
          symbol_name_snapshot?: string | null
          user_agent?: string | null
          voter_count?: number | null
          ward_id?: string | null
          ward_ids?: string[]
          ward_number?: string
          ward_snapshots?: Json
        }
        Relationships: [
          {
            foreignKeyName: "orders_election_symbol_id_fkey"
            columns: ["election_symbol_id"]
            isOneToOne: false
            referencedRelation: "election_symbols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "geo_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_config: {
        Row: {
          created_at: string
          free_sample_voter_count: number
          id: string
          min_order_amount: number | null
          phonepe_callback_url: string | null
          phonepe_client_id: string | null
          cashfree_enabled: boolean | null
          cashfree_env: string | null
          cashfree_app_id: string | null
          phonepe_client_version: number | null
          web_worker_queue_enabled: boolean | null
          phonepe_enabled: boolean
          phonepe_environment: string
          phonepe_merchant_id: string | null
          phonepe_redirect_url: string | null
          rate_per_voter: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_sample_voter_count?: number
          id?: string
          min_order_amount?: number | null
          phonepe_callback_url?: string | null
          phonepe_client_id?: string | null
          cashfree_enabled?: boolean | null
          cashfree_env?: string | null
          cashfree_app_id?: string | null
          phonepe_client_version?: number | null
          web_worker_queue_enabled?: boolean | null
          phonepe_enabled?: boolean
          phonepe_environment?: string
          phonepe_merchant_id?: string | null
          phonepe_redirect_url?: string | null
          rate_per_voter?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_sample_voter_count?: number
          id?: string
          min_order_amount?: number | null
          phonepe_callback_url?: string | null
          phonepe_client_id?: string | null
          cashfree_enabled?: boolean | null
          cashfree_env?: string | null
          cashfree_app_id?: string | null
          phonepe_client_version?: number | null
          web_worker_queue_enabled?: boolean | null
          phonepe_enabled?: boolean
          phonepe_environment?: string
          phonepe_merchant_id?: string | null
          phonepe_redirect_url?: string | null
          rate_per_voter?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_credentials: {
        Row: {
          created_at: string
          id: string
          cashfree_secret_key: string | null
          phonepe_client_secret: string | null
          phonepe_salt_index: string | null
          phonepe_salt_key: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          cashfree_secret_key?: string | null
          phonepe_client_secret?: string | null
          phonepe_salt_index?: string | null
          phonepe_salt_key?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          cashfree_secret_key?: string | null
          phonepe_client_secret?: string | null
          phonepe_salt_index?: string | null
          phonepe_salt_key?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          id: string
          provider: string
          event_type: string | null
          order_id: string | null
          payment_gateway_order_id: string | null
          amount: number | null
          payload: Json | null
          raw_body: string | null
          verified: boolean
          consumed_by_pc_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: string
          event_type?: string | null
          order_id?: string | null
          payment_gateway_order_id?: string | null
          amount?: number | null
          payload?: Json | null
          raw_body?: string | null
          verified?: boolean
          consumed_by_pc_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          event_type?: string | null
          order_id?: string | null
          payment_gateway_order_id?: string | null
          amount?: number | null
          payload?: Json | null
          raw_body?: string | null
          verified?: boolean
          consumed_by_pc_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      order_lookup_attempts: {
        Row: {
          id: string
          order_id: string | null
          ip_address: string | null
          attempted_at: string | null
          success: boolean | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          ip_address?: string | null
          attempted_at?: string | null
          success?: boolean | null
        }
        Update: {
          id?: string
          order_id?: string | null
          ip_address?: string | null
          attempted_at?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: string | null
          lead_id: string | null
          partner_code: string
          partner_id: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          partner_code: string
          partner_id?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          partner_code?: string
          partner_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          approved_at: string | null
          commission_amount: number
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          order_amount: number | null
          order_id: string
          order_uuid: string | null
          paid_at: string | null
          partner_code: string
          partner_id: string
          payout_note: string | null
          source: string
          status: string
          updated_at: string
          voter_count: number | null
        }
        Insert: {
          approved_at?: string | null
          commission_amount?: number
          commission_type: string
          commission_value: number
          created_at?: string
          id?: string
          order_amount?: number | null
          order_id: string
          order_uuid?: string | null
          paid_at?: string | null
          partner_code: string
          partner_id: string
          payout_note?: string | null
          source?: string
          status?: string
          updated_at?: string
          voter_count?: number | null
        }
        Update: {
          approved_at?: string | null
          commission_amount?: number
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          order_amount?: number | null
          order_id?: string
          order_uuid?: string | null
          paid_at?: string | null
          partner_code?: string
          partner_id?: string
          payout_note?: string | null
          source?: string
          status?: string
          updated_at?: string
          voter_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_order_uuid_fkey"
            columns: ["order_uuid"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_conversions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_partners: {
        Row: {
          active: boolean
          commission_type: string
          commission_value: number
          created_at: string
          district: string | null
          full_name: string
          id: string
          notes: string | null
          partner_code: string
          phone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          commission_type?: string
          commission_value?: number
          created_at?: string
          district?: string | null
          full_name: string
          id?: string
          notes?: string | null
          partner_code: string
          phone: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          commission_type?: string
          commission_value?: number
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          partner_code?: string
          phone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      sample_requests: {
        Row: {
          candidate_name: string
          contact_number: string
          created_at: string
          district: string | null
          gram_panchayat: string | null
          id: string
          ip_address: string | null
          notes: string | null
          panchayat_samiti: string | null
          request_id: string
          status: string
          updated_at: string
          voter_count: number | null
          ward_id: string | null
          ward_number: string | null
        }
        Insert: {
          candidate_name: string
          contact_number: string
          created_at?: string
          district?: string | null
          gram_panchayat?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          panchayat_samiti?: string | null
          request_id: string
          status?: string
          updated_at?: string
          voter_count?: number | null
          ward_id?: string | null
          ward_number?: string | null
        }
        Update: {
          candidate_name?: string
          contact_number?: string
          created_at?: string
          district?: string | null
          gram_panchayat?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          panchayat_samiti?: string | null
          request_id?: string
          status?: string
          updated_at?: string
          voter_count?: number | null
          ward_id?: string | null
          ward_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_requests_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "geo_wards"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_leads: {
        Row: {
          id: string
          ip_address: string | null
          lead_type: string
          order_id: string | null
          phone: string | null
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
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
      admin_referral_summary: {
        Args: never
        Returns: {
          active: boolean
          click_count: number
          commission_approved: number
          commission_paid: number
          commission_pending: number
          commission_type: string
          commission_value: number
          full_name: string
          last_activity_at: string
          order_count: number
          paid_order_count: number
          partner_code: string
          partner_id: string
          phone: string
          total_order_amount: number
        }[]
      }
      admin_revenue: { Args: never; Returns: number }
      calc_commission: {
        Args: {
          p_amount: number
          p_type: string
          p_value: number
          p_voters: number
        }
        Returns: number
      }
      claim_next_order: {
        Args: {
          p_worker: string
        }
        Returns: string | null
      }
      increment_jobs_done: {
        Args: {
          p_worker: string
        }
        Returns: void
      }
      schema_health: {
        Args: Record<string, never>
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
  public: {
    Enums: {},
  },
} as const
