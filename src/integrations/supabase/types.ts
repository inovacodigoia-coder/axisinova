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
      attendance_orders: {
        Row: {
          attachments: Json | null
          authorization_code: string | null
          authorization_date: string | null
          authorization_expiry: string | null
          authorization_password: string | null
          card_expiry: string | null
          card_number: string | null
          company_id: string
          convenio_id: string | null
          convenio_name: string | null
          created_at: string
          delivery_date: string | null
          delivery_status: string | null
          doctor_crm: string | null
          doctor_id: string | null
          doctor_name: string | null
          exam_mode: string | null
          hash: string | null
          id: string
          lab_guides: Json | null
          order_number: string
          origin_code: string | null
          origin_id: string | null
          origin_name: string | null
          patient_id: string
          patient_name: string | null
          payment_type: string
          private_value: number | null
          protocol: string
          registered_by: string | null
          registered_by_name: string | null
          requesting_doctor: string | null
          service_type: string
          specialty: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          authorization_code?: string | null
          authorization_date?: string | null
          authorization_expiry?: string | null
          authorization_password?: string | null
          card_expiry?: string | null
          card_number?: string | null
          company_id: string
          convenio_id?: string | null
          convenio_name?: string | null
          created_at?: string
          delivery_date?: string | null
          delivery_status?: string | null
          doctor_crm?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          exam_mode?: string | null
          hash?: string | null
          id?: string
          lab_guides?: Json | null
          order_number: string
          origin_code?: string | null
          origin_id?: string | null
          origin_name?: string | null
          patient_id: string
          patient_name?: string | null
          payment_type: string
          private_value?: number | null
          protocol: string
          registered_by?: string | null
          registered_by_name?: string | null
          requesting_doctor?: string | null
          service_type: string
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          authorization_code?: string | null
          authorization_date?: string | null
          authorization_expiry?: string | null
          authorization_password?: string | null
          card_expiry?: string | null
          card_number?: string | null
          company_id?: string
          convenio_id?: string | null
          convenio_name?: string | null
          created_at?: string
          delivery_date?: string | null
          delivery_status?: string | null
          doctor_crm?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          exam_mode?: string | null
          hash?: string | null
          id?: string
          lab_guides?: Json | null
          order_number?: string
          origin_code?: string | null
          origin_id?: string | null
          origin_name?: string | null
          patient_id?: string
          patient_name?: string | null
          payment_type?: string
          private_value?: number | null
          protocol?: string
          registered_by?: string | null
          registered_by_name?: string | null
          requesting_doctor?: string | null
          service_type?: string
          specialty?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_orders_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "convenios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_orders_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_origins: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_origins_company_id_fkey"
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
          session_timeout: number | null
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
          session_timeout?: number | null
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
          session_timeout?: number | null
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
          background_color: string
          border_color: string
          button_text_color: string
          card_color: string
          company_id: string
          created_at: string
          error_color: string
          id: string
          input_bg_color: string
          logo_url: string | null
          muted_text_color: string
          primary_color: string
          ring_color: string
          secondary_color: string
          sidebar_bg: string
          success_color: string
          text_color: string
          updated_at: string
          warning_color: string
        }
        Insert: {
          background_color?: string
          border_color?: string
          button_text_color?: string
          card_color?: string
          company_id: string
          created_at?: string
          error_color?: string
          id?: string
          input_bg_color?: string
          logo_url?: string | null
          muted_text_color?: string
          primary_color?: string
          ring_color?: string
          secondary_color?: string
          sidebar_bg?: string
          success_color?: string
          text_color?: string
          updated_at?: string
          warning_color?: string
        }
        Update: {
          background_color?: string
          border_color?: string
          button_text_color?: string
          card_color?: string
          company_id?: string
          created_at?: string
          error_color?: string
          id?: string
          input_bg_color?: string
          logo_url?: string | null
          muted_text_color?: string
          primary_color?: string
          ring_color?: string
          secondary_color?: string
          sidebar_bg?: string
          success_color?: string
          text_color?: string
          updated_at?: string
          warning_color?: string
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
          exam_prices: Json
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
          exam_prices?: Json
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
          exam_prices?: Json
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
      establishments: {
        Row: {
          city: string | null
          cnpj: string | null
          company_id: string
          created_at: string | null
          id: string
          internal_code: string | null
          is_main_branch: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          internal_code?: string | null
          is_main_branch?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          internal_code?: string | null
          is_main_branch?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_company_id_fkey"
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
          confirmation_questions: Json | null
          created_at: string
          default_destination: string | null
          default_material: string | null
          default_origin: string | null
          estimated_duration_minutes: number | null
          id: string
          interfacing_config: Json | null
          interfacing_parameters: Json | null
          internal_code: string | null
          is_active: boolean
          measurement_unit: string | null
          methodology: string | null
          name: string
          parameters: Json | null
          preparation_instructions: string | null
          reference_values: Json | null
          report_observations: string | null
          requires_authorization: boolean
          result_deadline_days: number | null
          selected_materials: Json | null
          show_deadline: boolean | null
          show_duration: boolean | null
          specialty_id: string | null
          tuss_code: string | null
          type: string | null
          workbench_id: string | null
        }
        Insert: {
          attachment_rules?: Json
          authorization_instructions?: string | null
          company_id: string
          confirmation_questions?: Json | null
          created_at?: string
          default_destination?: string | null
          default_material?: string | null
          default_origin?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          interfacing_config?: Json | null
          interfacing_parameters?: Json | null
          internal_code?: string | null
          is_active?: boolean
          measurement_unit?: string | null
          methodology?: string | null
          name: string
          parameters?: Json | null
          preparation_instructions?: string | null
          reference_values?: Json | null
          report_observations?: string | null
          requires_authorization?: boolean
          result_deadline_days?: number | null
          selected_materials?: Json | null
          show_deadline?: boolean | null
          show_duration?: boolean | null
          specialty_id?: string | null
          tuss_code?: string | null
          type?: string | null
          workbench_id?: string | null
        }
        Update: {
          attachment_rules?: Json
          authorization_instructions?: string | null
          company_id?: string
          confirmation_questions?: Json | null
          created_at?: string
          default_destination?: string | null
          default_material?: string | null
          default_origin?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          interfacing_config?: Json | null
          interfacing_parameters?: Json | null
          internal_code?: string | null
          is_active?: boolean
          measurement_unit?: string | null
          methodology?: string | null
          name?: string
          parameters?: Json | null
          preparation_instructions?: string | null
          reference_values?: Json | null
          report_observations?: string | null
          requires_authorization?: boolean
          result_deadline_days?: number | null
          selected_materials?: Json | null
          show_deadline?: boolean | null
          show_duration?: boolean | null
          specialty_id?: string | null
          tuss_code?: string | null
          type?: string | null
          workbench_id?: string | null
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
      lab_equipments: {
        Row: {
          company_id: string
          connection_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manufacturer: string | null
          model: string | null
          name: string
          serial_number: string | null
        }
        Insert: {
          company_id: string
          connection_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          model?: string | null
          name: string
          serial_number?: string | null
        }
        Update: {
          company_id?: string
          connection_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_equipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_exam_parameters: {
        Row: {
          allow_negative: boolean | null
          company_id: string
          created_at: string | null
          equipment_code: string | null
          exam_id: string | null
          formula: string | null
          id: string
          internal_code: string | null
          is_calculated: boolean | null
          is_hidden: boolean | null
          is_required: boolean | null
          name: string
          origin: string | null
          reference_values: string | null
          section: string | null
          sort_order: number | null
          type: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          allow_negative?: boolean | null
          company_id: string
          created_at?: string | null
          equipment_code?: string | null
          exam_id?: string | null
          formula?: string | null
          id?: string
          internal_code?: string | null
          is_calculated?: boolean | null
          is_hidden?: boolean | null
          is_required?: boolean | null
          name: string
          origin?: string | null
          reference_values?: string | null
          section?: string | null
          sort_order?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_negative?: boolean | null
          company_id?: string
          created_at?: string | null
          equipment_code?: string | null
          exam_id?: string | null
          formula?: string | null
          id?: string
          internal_code?: string | null
          is_calculated?: boolean | null
          is_hidden?: boolean | null
          is_required?: boolean | null
          name?: string
          origin?: string | null
          reference_values?: string | null
          section?: string | null
          sort_order?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_exam_parameters_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_exam_reference_values: {
        Row: {
          age_max: number | null
          age_min: number | null
          company_id: string
          created_at: string | null
          description: string | null
          exam_id: string | null
          gender: string | null
          id: string
          internal_code: string | null
          is_pregnant: boolean | null
          max_value: string | null
          min_value: string | null
          parameter_id: string | null
          parameter_name: string | null
          sort_order: number | null
          text_range: string | null
          updated_at: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          company_id: string
          created_at?: string | null
          description?: string | null
          exam_id?: string | null
          gender?: string | null
          id?: string
          internal_code?: string | null
          is_pregnant?: boolean | null
          max_value?: string | null
          min_value?: string | null
          parameter_id?: string | null
          parameter_name?: string | null
          sort_order?: number | null
          text_range?: string | null
          updated_at?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          exam_id?: string | null
          gender?: string | null
          id?: string
          internal_code?: string | null
          is_pregnant?: boolean | null
          max_value?: string | null
          min_value?: string | null
          parameter_id?: string | null
          parameter_name?: string | null
          sort_order?: number | null
          text_range?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_exam_reference_values_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_exam_reference_values_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "lab_exam_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_exam_results: {
        Row: {
          company_id: string
          created_at: string
          exam_catalog_id: string | null
          exam_code: string | null
          exam_name: string | null
          exam_ref: string
          id: string
          notes: string | null
          order_id: string | null
          patient_id: string | null
          patient_name: string | null
          protocol: string | null
          released_at: string | null
          released_by: string | null
          status: string
          typed_at: string | null
          typed_by: string | null
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          exam_catalog_id?: string | null
          exam_code?: string | null
          exam_name?: string | null
          exam_ref: string
          id?: string
          notes?: string | null
          order_id?: string | null
          patient_id?: string | null
          patient_name?: string | null
          protocol?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          typed_at?: string | null
          typed_by?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          exam_catalog_id?: string | null
          exam_code?: string | null
          exam_name?: string | null
          exam_ref?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          patient_id?: string | null
          patient_name?: string | null
          protocol?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          typed_at?: string | null
          typed_by?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      lab_report_overrides: {
        Row: {
          company_id: string
          created_at: string
          html: string
          id: string
          protocol: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          html: string
          id?: string
          protocol: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          html?: string
          id?: string
          protocol?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      lab_result_values: {
        Row: {
          company_id: string
          created_at: string
          id: string
          parameter_key: string
          parameter_name: string | null
          reference: string | null
          result_id: string
          sort_order: number | null
          status: string | null
          unit: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          parameter_key: string
          parameter_name?: string | null
          reference?: string | null
          result_id: string
          sort_order?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          parameter_key?: string
          parameter_name?: string | null
          reference?: string | null
          result_id?: string
          sort_order?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_values_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "lab_exam_results"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_settings: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cnpj: string | null
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          lab_name: string | null
          phone: string | null
          report_footer_text: string | null
          report_header_subtitle: string | null
          report_header_title: string | null
          report_institutional_warning: string | null
          report_logo_primary_url: string | null
          report_logo_secondary_url: string | null
          report_watermark_enabled: boolean | null
          report_watermark_text: string | null
          responsible_name: string | null
          responsible_register: string | null
          signature_auto_on_release: boolean
          signature_image_url: string | null
          signature_include_register: boolean
          signature_name: string | null
          signature_register: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          lab_name?: string | null
          phone?: string | null
          report_footer_text?: string | null
          report_header_subtitle?: string | null
          report_header_title?: string | null
          report_institutional_warning?: string | null
          report_logo_primary_url?: string | null
          report_logo_secondary_url?: string | null
          report_watermark_enabled?: boolean | null
          report_watermark_text?: string | null
          responsible_name?: string | null
          responsible_register?: string | null
          signature_auto_on_release?: boolean
          signature_image_url?: string | null
          signature_include_register?: boolean
          signature_name?: string | null
          signature_register?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          lab_name?: string | null
          phone?: string | null
          report_footer_text?: string | null
          report_header_subtitle?: string | null
          report_header_title?: string | null
          report_institutional_warning?: string | null
          report_logo_primary_url?: string | null
          report_logo_secondary_url?: string | null
          report_watermark_enabled?: boolean | null
          report_watermark_text?: string | null
          responsible_name?: string | null
          responsible_register?: string | null
          signature_auto_on_release?: boolean
          signature_image_url?: string | null
          signature_include_register?: boolean
          signature_name?: string | null
          signature_register?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_workbenches: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          report_break_policy: string | null
          report_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          report_break_policy?: string | null
          report_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          report_break_policy?: string | null
          report_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      measurement_units: {
        Row: {
          active: boolean | null
          company_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_units_company_id_fkey"
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
      origins: {
        Row: {
          company_id: string
          created_at: string | null
          establishment_id: string
          id: string
          internal_code: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          establishment_id: string
          id?: string
          internal_code?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          establishment_id?: string
          id?: string
          internal_code?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "origins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "origins_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          address_data: Json | null
          allergies: string[] | null
          birth_city: string | null
          birth_date: string
          birth_state: string | null
          blood_type: string | null
          clinical_data: Json
          company_id: string
          convenios: Json
          cpf: string
          created_at: string
          education: string | null
          email: string | null
          email_secondary: string | null
          employer: string | null
          ethnicity: string | null
          father_name: string | null
          financial_notes: string | null
          gender: string | null
          general_notes: string | null
          id: string
          import_batch_id: string | null
          imported_from: string | null
          internal_alerts: Json | null
          last_attendance: string | null
          marital_status: string | null
          mother_name: string | null
          name: string
          nationality: string | null
          occupation: string | null
          phone: string
          phone1_type: string | null
          phone2: string | null
          phone2_type: string | null
          phone3: string | null
          referral_by: string | null
          referral_source: string | null
          registered_by: string | null
          responsible: Json | null
          rg: string | null
          rg_issue_date: string | null
          rg_issuer: string | null
          rg_state: string | null
          sequence_id: number
          social_name: string | null
          status: string
          tags: string[] | null
          updated_at: string
          work_phone: string | null
        }
        Insert: {
          address?: string | null
          address_data?: Json | null
          allergies?: string[] | null
          birth_city?: string | null
          birth_date: string
          birth_state?: string | null
          blood_type?: string | null
          clinical_data?: Json
          company_id: string
          convenios?: Json
          cpf: string
          created_at?: string
          education?: string | null
          email?: string | null
          email_secondary?: string | null
          employer?: string | null
          ethnicity?: string | null
          father_name?: string | null
          financial_notes?: string | null
          gender?: string | null
          general_notes?: string | null
          id?: string
          import_batch_id?: string | null
          imported_from?: string | null
          internal_alerts?: Json | null
          last_attendance?: string | null
          marital_status?: string | null
          mother_name?: string | null
          name: string
          nationality?: string | null
          occupation?: string | null
          phone: string
          phone1_type?: string | null
          phone2?: string | null
          phone2_type?: string | null
          phone3?: string | null
          referral_by?: string | null
          referral_source?: string | null
          registered_by?: string | null
          responsible?: Json | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          rg_state?: string | null
          sequence_id?: number
          social_name?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          work_phone?: string | null
        }
        Update: {
          address?: string | null
          address_data?: Json | null
          allergies?: string[] | null
          birth_city?: string | null
          birth_date?: string
          birth_state?: string | null
          blood_type?: string | null
          clinical_data?: Json
          company_id?: string
          convenios?: Json
          cpf?: string
          created_at?: string
          education?: string | null
          email?: string | null
          email_secondary?: string | null
          employer?: string | null
          ethnicity?: string | null
          father_name?: string | null
          financial_notes?: string | null
          gender?: string | null
          general_notes?: string | null
          id?: string
          import_batch_id?: string | null
          imported_from?: string | null
          internal_alerts?: Json | null
          last_attendance?: string | null
          marital_status?: string | null
          mother_name?: string | null
          name?: string
          nationality?: string | null
          occupation?: string | null
          phone?: string
          phone1_type?: string | null
          phone2?: string | null
          phone2_type?: string | null
          phone3?: string | null
          referral_by?: string | null
          referral_source?: string | null
          registered_by?: string | null
          responsible?: Json | null
          rg?: string | null
          rg_issue_date?: string | null
          rg_issuer?: string | null
          rg_state?: string | null
          sequence_id?: number
          social_name?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          work_phone?: string | null
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
      pricing_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_popular: boolean
          is_visible: boolean
          max_doctors: number | null
          max_users: number | null
          name: string
          price_annual: number
          price_monthly: number
          slug: string
          sort_order: number
          storage_gb: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_popular?: boolean
          is_visible?: boolean
          max_doctors?: number | null
          max_users?: number | null
          name: string
          price_annual?: number
          price_monthly?: number
          slug: string
          sort_order?: number
          storage_gb?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_popular?: boolean
          is_visible?: boolean
          max_doctors?: number | null
          max_users?: number | null
          name?: string
          price_annual?: number
          price_monthly?: number
          slug?: string
          sort_order?: number
          storage_gb?: number
          updated_at?: string
        }
        Relationships: []
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
          badge_code: string | null
          can_print_labels: boolean | null
          company_id: string | null
          council_number: string | null
          council_type: string | null
          council_uf: string | null
          cpf: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          professional_title: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          badge_code?: string | null
          can_print_labels?: boolean | null
          company_id?: string | null
          council_number?: string | null
          council_type?: string | null
          council_uf?: string | null
          cpf?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          professional_title?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          badge_code?: string | null
          can_print_labels?: boolean | null
          company_id?: string | null
          council_number?: string | null
          council_type?: string | null
          council_uf?: string | null
          cpf?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          professional_title?: string | null
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
      queue_guiches: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          unit_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type?: string
          unit_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_guiches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_guiches_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "queue_units"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_lines: {
        Row: {
          allow_totem_choice: boolean
          category: string
          color: string | null
          company_id: string
          created_at: string
          has_preferential: boolean
          has_preferential_80: boolean
          id: string
          is_active: boolean
          linked_queue_ids: string[]
          name: string
          prefix: string
          prefix_alt: string | null
          queue_type: string
          show_on_totem: boolean
          sort_order: number
          totem_id: string | null
          type: string
          unit_id: string
        }
        Insert: {
          allow_totem_choice?: boolean
          category?: string
          color?: string | null
          company_id: string
          created_at?: string
          has_preferential?: boolean
          has_preferential_80?: boolean
          id?: string
          is_active?: boolean
          linked_queue_ids?: string[]
          name: string
          prefix: string
          prefix_alt?: string | null
          queue_type?: string
          show_on_totem?: boolean
          sort_order?: number
          totem_id?: string | null
          type?: string
          unit_id: string
        }
        Update: {
          allow_totem_choice?: boolean
          category?: string
          color?: string | null
          company_id?: string
          created_at?: string
          has_preferential?: boolean
          has_preferential_80?: boolean
          id?: string
          is_active?: boolean
          linked_queue_ids?: string[]
          name?: string
          prefix?: string
          prefix_alt?: string | null
          queue_type?: string
          show_on_totem?: boolean
          sort_order?: number
          totem_id?: string | null
          type?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_lines_totem_id_fkey"
            columns: ["totem_id"]
            isOneToOne: false
            referencedRelation: "queue_totems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "queue_units"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_tickets: {
        Row: {
          attendance_started_at: string | null
          attendant_name: string | null
          call_count: number
          called_at: string | null
          company_id: string
          created_at: string
          display_code: string
          finalized_at: string | null
          generated_at: string
          guiche_id: string | null
          guiche_name: string | null
          id: string
          number: number
          patient_name: string | null
          prefix: string
          queue_line_id: string
          queue_line_name: string
          status: string
          tv_id: string | null
          unit_id: string
        }
        Insert: {
          attendance_started_at?: string | null
          attendant_name?: string | null
          call_count?: number
          called_at?: string | null
          company_id: string
          created_at?: string
          display_code: string
          finalized_at?: string | null
          generated_at?: string
          guiche_id?: string | null
          guiche_name?: string | null
          id?: string
          number: number
          patient_name?: string | null
          prefix: string
          queue_line_id: string
          queue_line_name: string
          status?: string
          tv_id?: string | null
          unit_id: string
        }
        Update: {
          attendance_started_at?: string | null
          attendant_name?: string | null
          call_count?: number
          called_at?: string | null
          company_id?: string
          created_at?: string
          display_code?: string
          finalized_at?: string | null
          generated_at?: string
          guiche_id?: string | null
          guiche_name?: string | null
          id?: string
          number?: number
          patient_name?: string | null
          prefix?: string
          queue_line_id?: string
          queue_line_name?: string
          status?: string
          tv_id?: string | null
          unit_id?: string
        }
        Relationships: []
      }
      queue_totems: {
        Row: {
          access_password: string | null
          access_username: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string | null
          unit_id: string
        }
        Insert: {
          access_password?: string | null
          access_username?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug?: string | null
          unit_id: string
        }
        Update: {
          access_password?: string | null
          access_username?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_totems_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_totems_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "queue_units"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_tvs: {
        Row: {
          access_password: string | null
          access_username: string | null
          company_id: string
          created_at: string
          device_count: number
          id: string
          is_active: boolean
          media_attachments: Json
          media_mode: string
          name: string
          screen_size: string
          slug: string | null
          unit_id: string
          voice_type: string
        }
        Insert: {
          access_password?: string | null
          access_username?: string | null
          company_id: string
          created_at?: string
          device_count?: number
          id?: string
          is_active?: boolean
          media_attachments?: Json
          media_mode?: string
          name: string
          screen_size?: string
          slug?: string | null
          unit_id: string
          voice_type?: string
        }
        Update: {
          access_password?: string | null
          access_username?: string | null
          company_id?: string
          created_at?: string
          device_count?: number
          id?: string
          is_active?: boolean
          media_attachments?: Json
          media_mode?: string
          name?: string
          screen_size?: string
          slug?: string | null
          unit_id?: string
          voice_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_tvs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tvs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "queue_units"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_units: {
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
            foreignKeyName: "queue_units_company_id_fkey"
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
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      user_origin_preferences: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          origin_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          origin_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          origin_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_origin_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_origin_preferences_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      device_public_info: {
        Args: { _kind: string; _slug: string }
        Returns: Json
      }
      device_verify_access: {
        Args: {
          _kind: string
          _password: string
          _slug: string
          _username: string
        }
        Returns: boolean
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      panel_tickets: {
        Args: { _slug: string }
        Returns: {
          attendant_name: string
          call_count: number
          called_at: string
          display_code: string
          generated_at: string
          guiche_name: string
          id: string
          queue_line_name: string
          status: string
          tv_id: string
          unit_id: string
        }[]
      }
      totem_create_ticket: {
        Args: { _preferential?: boolean; _queue_line_id: string; _slug: string }
        Returns: Json
      }
      totem_queue_lines: {
        Args: { _slug: string }
        Returns: {
          allow_totem_choice: boolean
          color: string
          company_id: string
          has_preferential: boolean
          has_preferential_80: boolean
          id: string
          is_active: boolean
          name: string
          prefix: string
          prefix_alt: string
          show_on_totem: boolean
          totem_id: string
          unit_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "company_admin"
        | "doctor"
        | "receptionist"
        | "billing"
        | "telephonist"
        | "nurse"
        | "pharmacist"
        | "biochemist"
        | "analyst"
        | "other"
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
      app_role: [
        "company_admin",
        "doctor",
        "receptionist",
        "billing",
        "telephonist",
        "nurse",
        "pharmacist",
        "biochemist",
        "analyst",
        "other",
      ],
      appointment_status: ["confirmed", "waiting", "cancelled"],
      tiss_guide_status: ["enviada", "aprovada", "pendente", "glosada"],
    },
  },
} as const
