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
      booking_events: {
        Row: {
          actor_id: string
          booking_id: string
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_id: string
          booking_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string
          booking_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      broadcast_notifications: {
        Row: {
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          operator_id: string
          route_id: string | null
          schedule_id: string | null
          severity: string
          starts_at: string
          title: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          operator_id: string
          route_id?: string | null
          schedule_id?: string | null
          severity?: string
          starts_at?: string
          title: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          operator_id?: string
          route_id?: string | null
          schedule_id?: string | null
          severity?: string
          starts_at?: string
          title?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_notifications_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_notifications_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_notifications_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_notifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      recurring_schedule_templates: {
        Row: {
          base_fare: number
          created_at: string
          days_of_week: number[]
          default_driver_id: string | null
          deleted_at: string | null
          departure_time: string
          estimated_duration_mins: number
          id: string
          is_paused: boolean
          operator_id: string
          pause_reason: string | null
          paused_until: string | null
          route_id: string
          total_seats: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          base_fare: number
          created_at?: string
          days_of_week?: number[]
          default_driver_id?: string | null
          deleted_at?: string | null
          departure_time: string
          estimated_duration_mins: number
          id?: string
          is_paused?: boolean
          operator_id: string
          pause_reason?: string | null
          paused_until?: string | null
          route_id: string
          total_seats: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          base_fare?: number
          created_at?: string
          days_of_week?: number[]
          default_driver_id?: string | null
          deleted_at?: string | null
          departure_time?: string
          estimated_duration_mins?: number
          id?: string
          is_paused?: boolean
          operator_id?: string
          pause_reason?: string | null
          paused_until?: string | null
          route_id?: string
          total_seats?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedule_templates_default_driver_id_fkey"
            columns: ["default_driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedule_templates_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedule_templates_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedule_templates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          deleted_at: string | null
          departure_time: string
          driver_id: string | null
          id: string
          pause_reason: string | null
          route_id: string
          status: string
          template_id: string | null
          total_seats: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          arrival_time: string
          available_seats: number
          base_fare?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deleted_at?: string | null
          departure_time: string
          driver_id?: string | null
          id?: string
          pause_reason?: string | null
          route_id: string
          status?: string
          template_id?: string | null
          total_seats: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          arrival_time?: string
          available_seats?: number
          base_fare?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deleted_at?: string | null
          departure_time?: string
          driver_id?: string | null
          id?: string
          pause_reason?: string | null
          route_id?: string
          status?: string
          template_id?: string | null
          total_seats?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedule_templates"
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
      trip_locations: {
        Row: {
          accuracy: number | null
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          schedule_id: string
          speed: number | null
          vehicle_id: string
        }
        Insert: {
          accuracy?: number | null
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          schedule_id: string
          speed?: number | null
          vehicle_id: string
        }
        Update: {
          accuracy?: number | null
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          schedule_id?: string
          speed?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_locations_vehicle_id_fkey"
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
          owner_id: string | null
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
          owner_id?: string | null
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
          owner_id?: string | null
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
      book_seats: {
        Args: {
          p_schedule_id: string
          p_seats_requested: number
        }
        Returns: boolean
      }
      book_whole_vehicle_atomic: {
        Args: {
          p_booking_reference: string
          p_customer_id: string
          p_occasion: string
          p_travel_date: string
          p_vehicle_ids: string[]
        }
        Returns: string
      }
      cancel_booking_atomic: {
        Args: {
          p_booking_id: string
          p_customer_id: string
        }
        Returns: boolean
      }
      driver_end_trip: {
        Args: {
          p_schedule_id: string
        }
        Returns: Json
      }
      driver_start_trip: {
        Args: {
          p_schedule_id: string
        }
        Returns: Json
      }
      expire_stale_bookings: {
        Args: Record<string, never>
        Returns: number
      }
      generate_rolling_schedules: {
        Args: {
          p_days_ahead?: number
        }
        Returns: Json
      }
      purge_stale_trip_locations: {
        Args: {
          p_retention_days?: number
        }
        Returns: number
      }
      restore_seats: {
        Args: {
          p_schedule_id: string
          p_seats_to_restore: number
        }
        Returns: undefined
      }
      update_booking_status_atomic: {
        Args: {
          p_actor_id: string
          p_booking_id: string
          p_new_status: string
          p_reason?: string | null
        }
        Returns: boolean
      }
      upsert_schedules: {
        Args: {
          p_schedules: Json
        }
        Returns: undefined
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
