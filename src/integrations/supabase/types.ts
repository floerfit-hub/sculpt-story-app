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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      custom_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          image_url: string | null
          muscle_group: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          image_url?: string | null
          muscle_group: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          image_url?: string | null
          muscle_group?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_performance: {
        Row: {
          avg_weight: number
          created_at: string
          estimated_1rm: number
          exercise_id: string
          id: string
          max_weight: number
          total_reps: number
          total_sets: number
          total_volume: number
          user_id: string
          workout_id: string
        }
        Insert: {
          avg_weight?: number
          created_at?: string
          estimated_1rm?: number
          exercise_id: string
          id?: string
          max_weight?: number
          total_reps?: number
          total_sets?: number
          total_volume?: number
          user_id: string
          workout_id: string
        }
        Update: {
          avg_weight?: number
          created_at?: string
          estimated_1rm?: number
          exercise_id?: string
          id?: string
          max_weight?: number
          total_reps?: number
          total_sets?: number
          total_volume?: number
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_performance_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_performance_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[] | null
          animation_url: string | null
          created_at: string
          difficulty: string | null
          equipment: string | null
          exercise_type: string | null
          gif_url: string | null
          id: string
          is_deprecated: boolean
          muscle_group: string
          name: string
          name_en: string | null
          normalized_name: string | null
          sub_group: string | null
          thumbnail_url: string | null
          version: number
        }
        Insert: {
          aliases?: string[] | null
          animation_url?: string | null
          created_at?: string
          difficulty?: string | null
          equipment?: string | null
          exercise_type?: string | null
          gif_url?: string | null
          id?: string
          is_deprecated?: boolean
          muscle_group: string
          name: string
          name_en?: string | null
          normalized_name?: string | null
          sub_group?: string | null
          thumbnail_url?: string | null
          version?: number
        }
        Update: {
          aliases?: string[] | null
          animation_url?: string | null
          created_at?: string
          difficulty?: string | null
          equipment?: string | null
          exercise_type?: string | null
          gif_url?: string | null
          id?: string
          is_deprecated?: boolean
          muscle_group?: string
          name?: string
          name_en?: string | null
          normalized_name?: string | null
          sub_group?: string | null
          thumbnail_url?: string | null
          version?: number
        }
        Relationships: []
      }
      fitness_stats: {
        Row: {
          created_at: string
          fit_score: number
          fit_score_previous: number
          id: string
          last_streak_check: string | null
          last_workout_at: string | null
          level: number
          streak_days: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fit_score?: number
          fit_score_previous?: number
          id?: string
          last_streak_check?: string | null
          last_workout_at?: string | null
          level?: number
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fit_score?: number
          fit_score_previous?: number
          id?: string
          last_streak_check?: string | null
          last_workout_at?: string | null
          level?: number
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          carbs: number
          coach_advice: string | null
          created_at: string
          fat: number
          food_name: string
          id: string
          image_url: string | null
          kcal: number
          meal_type: string
          protein: number
          user_id: string
        }
        Insert: {
          carbs?: number
          coach_advice?: string | null
          created_at?: string
          fat?: number
          food_name: string
          id?: string
          image_url?: string | null
          kcal?: number
          meal_type?: string
          protein?: number
          user_id: string
        }
        Update: {
          carbs?: number
          coach_advice?: string | null
          created_at?: string
          fat?: number
          food_name?: string
          id?: string
          image_url?: string | null
          kcal?: number
          meal_type?: string
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      muscle_recovery: {
        Row: {
          created_at: string
          fatigue_score: number
          id: string
          last_trained_at: string
          muscle_group: string
          recovery_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fatigue_score?: number
          id?: string
          last_trained_at?: string
          muscle_group: string
          recovery_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fatigue_score?: number
          id?: string
          last_trained_at?: string
          muscle_group?: string
          recovery_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_calories: number | null
          daily_carbs: number | null
          daily_fat: number | null
          daily_protein: number | null
          experience_level: string | null
          full_name: string | null
          haptic_feedback: boolean
          id: string
          language: string | null
          leaderboard_visible: boolean
          notifications_enabled: boolean
          onboarding_completed: boolean
          pr_celebration_vibration: boolean
          preferred_style: string | null
          prep_buffer_seconds: number | null
          primary_goal: string | null
          priority_focus: string | null
          theme: string | null
          timer_vibration: boolean
          training_frequency: number | null
          updated_at: string
          user_id: string
          weight_unit: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_calories?: number | null
          daily_carbs?: number | null
          daily_fat?: number | null
          daily_protein?: number | null
          experience_level?: string | null
          full_name?: string | null
          haptic_feedback?: boolean
          id?: string
          language?: string | null
          leaderboard_visible?: boolean
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          pr_celebration_vibration?: boolean
          preferred_style?: string | null
          prep_buffer_seconds?: number | null
          primary_goal?: string | null
          priority_focus?: string | null
          theme?: string | null
          timer_vibration?: boolean
          training_frequency?: number | null
          updated_at?: string
          user_id: string
          weight_unit?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_calories?: number | null
          daily_carbs?: number | null
          daily_fat?: number | null
          daily_protein?: number | null
          experience_level?: string | null
          full_name?: string | null
          haptic_feedback?: boolean
          id?: string
          language?: string | null
          leaderboard_visible?: boolean
          notifications_enabled?: boolean
          onboarding_completed?: boolean
          pr_celebration_vibration?: boolean
          preferred_style?: string | null
          prep_buffer_seconds?: number | null
          primary_goal?: string | null
          priority_focus?: string | null
          theme?: string | null
          timer_vibration?: boolean
          training_frequency?: number | null
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          arm_circumference: number | null
          body_fat: number | null
          chest: number | null
          created_at: string
          entry_date: string
          glute_circumference: number | null
          hips: number | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          thigh_circumference: number | null
          updated_at: string
          user_id: string
          waist: number | null
          weight: number | null
        }
        Insert: {
          arm_circumference?: number | null
          body_fat?: number | null
          chest?: number | null
          created_at?: string
          entry_date?: string
          glute_circumference?: number | null
          hips?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          thigh_circumference?: number | null
          updated_at?: string
          user_id: string
          waist?: number | null
          weight?: number | null
        }
        Update: {
          arm_circumference?: number | null
          body_fat?: number | null
          chest?: number | null
          created_at?: string
          entry_date?: string
          glute_circumference?: number | null
          hips?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          thigh_circumference?: number | null
          updated_at?: string
          user_id?: string
          waist?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          muscle_group: string
          notes: string | null
          sets: Json
          sort_order: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          muscle_group: string
          notes?: string | null
          sets?: Json
          sort_order?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          muscle_group?: string
          notes?: string | null
          sets?: Json
          sort_order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          reps: number
          rest_time: number | null
          set_number: number
          sort_order: number
          weight: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: number
          rest_time?: number | null
          set_number?: number
          sort_order?: number
          weight?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: number
          rest_time?: number | null
          set_number?: number
          sort_order?: number
          weight?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          created_at: string
          default_reps: number
          default_sets: number
          default_weight: number
          exercise_name: string
          id: string
          muscle_group: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          default_reps?: number
          default_sets?: number
          default_weight?: number
          exercise_name: string
          id?: string
          muscle_group: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          default_reps?: number
          default_sets?: number
          default_weight?: number
          exercise_name?: string
          id?: string
          muscle_group?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          duration_seconds: number | null
          finished_at: string | null
          id: string
          name: string | null
          notes: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_exercise_leaderboard:
        | {
            Args: { _exercise_name: string }
            Returns: {
              achieved_at: string
              is_current_user: boolean
              max_weight: number
              user_name: string
            }[]
          }
        | {
            Args: { _exercise_name: string; _min_reps?: number }
            Returns: {
              achieved_at: string
              is_current_user: boolean
              max_weight: number
              user_name: string
            }[]
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_exercise_id: {
        Args: { _muscle_group: string; _name: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "coach" | "client" | "admin"
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
      app_role: ["coach", "client", "admin"],
    },
  },
} as const
