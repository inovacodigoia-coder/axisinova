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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          company_id: string
          created_at: string
          date: string
          doctor: string
          duration: number
          id: string
          notes: string | null
          patient_name: string
          status: Database["public"]["Enums"]["appointment_status"]
          time: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          doctor: string
          duration?: number
          id?: string
          notes?: string | null
          patient_name: string
          status?: Database["public"]["Enums"]["appointment_status"]
          time: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          doctor?: string
          duration?: number
          id?: string
          notes?: string | null
          patient_name?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          time?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          armazenamento_limite_gb: number | null
          armazenamento_usado_gb: number | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          logradouro: string | null
          medicos_ativos: number | null
          medicos_limite: number | null
          name: string
          nome_fantasia: string | null
          numero: string | null
          plano: string | null
          segmento: string | null
          status: string | null
          telefone: string | null
          updated_at: string
          usuarios_ativos: number | null
          usuarios_limite: number | null
          valor_mensal: number | null
          website: string | null
        }
        Insert: {
          armazenamento_limite_gb?: number | null
          armazenamento_usado_gb?: number | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          medicos_ativos?: number | null
          medicos_limite?: number | null
          name: string
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string | null
          segmento?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          usuarios_ativos?: number | null
          usuarios_limite?: number | null
          valor_mensal?: number | null
          website?: string | null
        }
        Update: {
          armazenamento_limite_gb?: number | null
          armazenamento_usado_gb?: number | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          medicos_ativos?: number | null
          medicos_limite?: number | null
          name?: string
          nome_fantasia?: string | null
          numero?: string | null
          plano?: string | null
          segmento?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          usuarios_ativos?: number | null
          usuarios_limite?: number | null
          valor_mensal?: number | null
          website?: string | null
        }
        Relationships: []
      }
      company_branding: {
        Row: {
          company_id: string
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          sidebar_bg: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          sidebar_bg?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          sidebar_bg?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      convenios: {
        Row: {
          ans_code: string | null
          attachment_rules: Json
          auth_phone: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          observations: string | null
          type: string
        }
        Insert: {
          ans_code?: string | null
          attachment_rules?: Json
          auth_phone?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          observations?: string | null
          type?: string
        }
        Update: {
          ans_code?: string | null
          attachment_rules?: Json
          auth_phone?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          observations?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "convenios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          birth_date: string | null
          blocked_at: string | null
          blocked_reason: string | null
          company_id: string
          created_at: string
          crm: string
          crm_state: string
          email: string | null
          enabled_convenio_ids: string[]
          full_name: string
          id: string
          is_active: boolean
          is_blocked: boolean
          phone: string | null
          photo: string | null
          schedule_config: Json | null
          specialty_ids: string[]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          company_id: string
          created_at?: string
          crm: string
          crm_state?: string
          email?: string | null
          enabled_convenio_ids?: string[]
          full_name: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          phone?: string | null
          photo?: string | null
          schedule_config?: Json | null
          specialty_ids?: string[]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          company_id?: string
          created_at?: string
          crm?: string
          crm_state?: string
          email?: string | null
          enabled_convenio_ids?: string[]
          full_name?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          phone?: string | null
          photo?: string | null
          schedule_config?: Json | null
          specialty_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          attachment_rules: Json
          authorization_instructions: string | null
          company_id: string
          created_at: string
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          preparation_instructions: string | null
          requires_authorization: boolean
          result_deadline_days: number | null
          specialty_id: string | null
          tuss_code: string | null
        }
        Insert: {
          attachment_rules?: Json
          authorization_instructions?: string | null
          company_id: string
          created_at?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          preparation_instructions?: string | null
          requires_authorization?: boolean
          result_deadline_days?: number | null
          specialty_id?: string | null
          tuss_code?: string | null
        }
        Update: {
          attachment_rules?: Json
          authorization_instructions?: string | null
          company_id?: string
          created_at?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          preparation_instructions?: string | null
          requires_authorization?: boolean
          result_deadline_days?: number | null
          specialty_id?: string | null
          tuss_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          company_id: string
          created_at: string
          date: string
          diagnosis: string
          doctor: string
          exams: string | null
          id: string
          notes: string
          patient_id: string
          prescription: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date?: string
          diagnosis: string
          doctor: string
          exams?: string | null
          id?: string
          notes: string
          patient_id: string
          prescription?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          diagnosis?: string
          doctor?: string
          exams?: string | null
          id?: string
          notes?: string
          patient_id?: string
          prescription?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birth_date: string
          blood_type: string | null
          company_id: string
          cpf: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birth_date: string
          blood_type?: string | null
          company_id: string
          cpf: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string
          blood_type?: string | null
          company_id?: string
          cpf?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          anesthesia_type: string | null
          attachment_rules: Json
          authorization_instructions: string | null
          company_id: string
          created_at: string
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          post_operative_instructions: string | null
          pre_operative_instructions: string | null
          requires_anesthesia: boolean
          requires_authorization: boolean
          specialty_id: string | null
          tuss_code: string | null
          type: string
        }
        Insert: {
          anesthesia_type?: string | null
          attachment_rules?: Json
          authorization_instructions?: string | null
          company_id: string
          created_at?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          post_operative_instructions?: string | null
          pre_operative_instructions?: string | null
          requires_anesthesia?: boolean
          requires_authorization?: boolean
          specialty_id?: string | null
          tuss_code?: string | null
          type?: string
        }
        Update: {
          anesthesia_type?: string | null
          attachment_rules?: Json
          authorization_instructions?: string | null
          company_id?: string
          created_at?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          post_operative_instructions?: string | null
          pre_operative_instructions?: string | null
          requires_anesthesia?: boolean
          requires_authorization?: boolean
          specialty_id?: string | null
          tuss_code?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          cpf: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tiss_guides: {
        Row: {
          authorization_number: string | null
          company_id: string
          created_at: string
          doctor: string
          gloss_reason: string | null
          guide_number: string
          id: string
          notes: string | null
          operator: string
          patient_name: string
          procedure_code: string | null
          procedure_name: string
          status: Database["public"]["Enums"]["tiss_guide_status"]
          updated_at: string
          value: number
        }
        Insert: {
          authorization_number?: string | null
          company_id: string
          created_at?: string
          doctor: string
          gloss_reason?: string | null
          guide_number: string
          id?: string
          notes?: string | null
          operator: string
          patient_name: string
          procedure_code?: string | null
          procedure_name: string
          status?: Database["public"]["Enums"]["tiss_guide_status"]
          updated_at?: string
          value?: number
        }
        Update: {
          authorization_number?: string | null
          company_id?: string
          created_at?: string
          doctor?: string
          gloss_reason?: string | null
          guide_number?: string
          id?: string
          notes?: string | null
          operator?: string
          patient_name?: string
          procedure_code?: string | null
          procedure_name?: string
          status?: Database["public"]["Enums"]["tiss_guide_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiss_guides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      appointment_status: "confirmed" | "waiting" | "cancelled"
      tiss_guide_status: "enviada" | "aprovada" | "pendente" | "glosada"
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
      appointment_status: ["confirmed", "waiting", "cancelled"],
      tiss_guide_status: ["enviada", "aprovada", "pendente", "glosada"],
    },
  },
} as const
