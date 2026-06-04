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
      booking_vehicles: {
        Row: {
          booking_id: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_vehicles_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_reference: string
          booking_type: string
          created_at: string
          customer_id: string
          deleted_at: string | null
          end_date: string | null
          id: string
          occasion: string | null
          operator_notes: string | null
          schedule_id: string | null
          seats_requested: number | null
          start_date: string | null
          status: string
          total_price: number | null
          travel_date: string
          updated_at: string
        }
        Insert: {
          booking_reference: string
          booking_type: string
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          occasion?: string | null
          operator_notes?: string | null
          schedule_id?: string | null
          seats_requested?: number | null
          start_date?: string | null
          status?: string
          total_price?: number | null
          travel_date: string
          updated_at?: string
        }
        Update: {
          booking_reference?: string
          booking_type?: string
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          occasion?: string | null
          operator_notes?: string | null
          schedule_id?: string | null
          seats_requested?: number | null
          start_date?: string | null
          status?: string
          total_price?: number | null
          travel_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          id: string
          booking_id: string
          actor_id: string
          from_status: string | null
          to_status: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          actor_id: string
          from_status?: string | null
          to_status: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          actor_id?: string
          from_status?: string | null
          to_status?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string
          deleted_at: string | null
          destination_id: string
          distance_km: number | null
          estimated_duration_mins: number | null
          id: string
          is_active: boolean
          origin_id: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          destination_id: string
          distance_km?: number | null
          estimated_duration_mins?: number | null
          id?: string
          is_active?: boolean
          origin_id: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          destination_id?: string
          distance_km?: number | null
          estimated_duration_mins?: number | null
          id?: string
          is_active?: boolean
          origin_id?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          arrival_time: string
          available_seats: number
          base_fare: number | null
          created_at: string
          deleted_at: string | null
          departure_time: string
          id: string
          route_id: string
          status: string
          total_seats: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          arrival_time: string
          available_seats: number
          base_fare?: number | null
          created_at?: string
          deleted_at?: string | null
          departure_time: string
          id?: string
          route_id: string
          status?: string
          total_seats: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          arrival_time?: string
          available_seats?: number
          base_fare?: number | null
          created_at?: string
          deleted_at?: string | null
          departure_time?: string
          id?: string
          route_id?: string
          status?: string
          total_seats?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          name: string
          operator_business_details: Json | null
          phone_number: string | null
          role: string
          updated_at: string
          verification_status: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          name: string
          operator_business_details?: Json | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          verification_status?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          name?: string
          operator_business_details?: Json | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          verification_status?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity_seats: number
          created_at: string
          deleted_at: string | null
          features: string | null
          id: string
          image_url: string | null
          insurance_expiry_date: string | null
          is_active: boolean
          is_available: boolean
          maintenance_status: string
          name: string
          owner_id: string
          permit_expiry_date: string | null
          price_per_day: number | null
          registration_number: string | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity_seats: number
          created_at?: string
          deleted_at?: string | null
          features?: string | null
          id?: string
          image_url?: string | null
          insurance_expiry_date?: string | null
          is_active?: boolean
          is_available?: boolean
          maintenance_status?: string
          name: string
          owner_id: string
          permit_expiry_date?: string | null
          price_per_day?: number | null
          registration_number?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          capacity_seats?: number
          created_at?: string
          deleted_at?: string | null
          features?: string | null
          id?: string
          image_url?: string | null
          insurance_expiry_date?: string | null
          is_active?: boolean
          is_available?: boolean
          maintenance_status?: string
          name?: string
          owner_id?: string
          permit_expiry_date?: string | null
          price_per_day?: number | null
          registration_number?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_whole_vehicle_atomic: {
        Args: {
          p_vehicle_ids: string[]
          p_travel_date: string
          p_occasion: string
          p_customer_id: string
          p_booking_reference: string
        }
        Returns: string
      }
      book_seats: {
        Args: {
          p_schedule_id: string
          p_seats_requested: number
        }
        Returns: boolean
      }
      restore_seats: {
        Args: {
          p_schedule_id: string
          p_seats_to_restore: number
        }
        Returns: undefined
      }
      expire_stale_bookings: {
        Args: Record<string, never>
        Returns: number
      }
      cancel_booking_atomic: {
        Args: {
          p_booking_id: string
          p_customer_id: string
        }
        Returns: boolean
      }
      update_booking_status_atomic: {
        Args: {
          p_booking_id: string
          p_operator_id: string
          p_new_status: string
          p_reason?: string
        }
        Returns: boolean
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
