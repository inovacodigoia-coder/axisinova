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
      access_profiles: {
        Row: {
          code: number
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          code: number
          company_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id: string
          is_active?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          code?: number
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_requests: {
        Row: {
          admitted_at: string | null
          admitted_by: string | null
          approved_unit_id: string | null
          bed_id: string | null
          companion_confirmed: boolean
          company_id: string
          decided_at: string | null
          decided_by: string | null
          doctor_name: string | null
          ended_at: string | null
          ended_by: string | null
          has_companion: boolean
          id: string
          notes: string | null
          origin_bed_id: string | null
          origin_inpatient_bed_id: string | null
          origin_label: string | null
          origin_occupancy_id: string | null
          origin_type: string
          patient_id: string | null
          patient_name: string
          reason: string
          refusal_reason: string | null
          requested_at: string
          requested_by: string | null
          requested_unit_id: string
          status: string
          suggested_unit_id: string | null
          urgency: string
        }
        Insert: {
          admitted_at?: string | null
          admitted_by?: string | null
          approved_unit_id?: string | null
          bed_id?: string | null
          companion_confirmed?: boolean
          company_id: string
          decided_at?: string | null
          decided_by?: string | null
          doctor_name?: string | null
          ended_at?: string | null
          ended_by?: string | null
          has_companion?: boolean
          id?: string
          notes?: string | null
          origin_bed_id?: string | null
          origin_inpatient_bed_id?: string | null
          origin_label?: string | null
          origin_occupancy_id?: string | null
          origin_type: string
          patient_id?: string | null
          patient_name: string
          reason: string
          refusal_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          requested_unit_id: string
          status?: string
          suggested_unit_id?: string | null
          urgency?: string
        }
        Update: {
          admitted_at?: string | null
          admitted_by?: string | null
          approved_unit_id?: string | null
          bed_id?: string | null
          companion_confirmed?: boolean
          company_id?: string
          decided_at?: string | null
          decided_by?: string | null
          doctor_name?: string | null
          ended_at?: string | null
          ended_by?: string | null
          has_companion?: boolean
          id?: string
          notes?: string | null
          origin_bed_id?: string | null
          origin_inpatient_bed_id?: string | null
          origin_label?: string | null
          origin_occupancy_id?: string | null
          origin_type?: string
          patient_id?: string | null
          patient_name?: string
          reason?: string
          refusal_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          requested_unit_id?: string
          status?: string
          suggested_unit_id?: string | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_requests_approved_unit_id_fkey"
            columns: ["approved_unit_id"]
            isOneToOne: false
            referencedRelation: "inpatient_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_requests_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "inpatient_beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_requests_requested_unit_id_fkey"
            columns: ["requested_unit_id"]
            isOneToOne: false
            referencedRelation: "inpatient_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_requests_suggested_unit_id_fkey"
            columns: ["suggested_unit_id"]
            isOneToOne: false
            referencedRelation: "inpatient_units"
            referencedColumns: ["id"]
          },
        ]
      }
      api_partners: {
        Row: {
          api_authorized: boolean
          auth_method: string
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          credentials: Json
          document: string
          id: string
          last_sync_at: string | null
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          api_authorized?: boolean
          auth_method?: string
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credentials?: Json
          document: string
          id?: string
          last_sync_at?: string | null
          name: string
          notes?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          api_authorized?: boolean
          auth_method?: string
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credentials?: Json
          document?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_acao_pendente: {
        Row: {
          company_id: string
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          criada_por: string | null
          dados: Json | null
          descricao: string
          id: string
          observacao: string | null
          pedido_exame_id: string
          proxima_tentativa: string | null
          tentativas: number
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          criada_por?: string | null
          dados?: Json | null
          descricao: string
          id?: string
          observacao?: string | null
          pedido_exame_id: string
          proxima_tentativa?: string | null
          tentativas?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          criada_por?: string | null
          dados?: Json | null
          descricao?: string
          id?: string
          observacao?: string | null
          pedido_exame_id?: string
          proxima_tentativa?: string | null
          tentativas?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_acao_pendente_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_acao_pendente_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_acao_pendente_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame_v"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_auditoria: {
        Row: {
          acao: string
          antes: Json | null
          company_id: string
          created_at: string
          depois: Json | null
          id: string
          registro_id: string | null
          tabela: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          company_id: string
          created_at?: string
          depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          company_id?: string
          created_at?: string
          depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      apoio_catalogo_alerta: {
        Row: {
          apoio_id: string
          codigo_apoio: string
          company_id: string
          created_at: string
          exame_id: string | null
          id: string
          lido: boolean
          mensagem: string
          sincronizacao_id: string | null
          tipo: string
        }
        Insert: {
          apoio_id: string
          codigo_apoio: string
          company_id: string
          created_at?: string
          exame_id?: string | null
          id?: string
          lido?: boolean
          mensagem: string
          sincronizacao_id?: string | null
          tipo: string
        }
        Update: {
          apoio_id?: string
          codigo_apoio?: string
          company_id?: string
          created_at?: string
          exame_id?: string | null
          id?: string
          lido?: boolean
          mensagem?: string
          sincronizacao_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_catalogo_alerta_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_catalogo_alerta_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_catalogo_alerta_exame_id_fkey"
            columns: ["exame_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_catalogo_alerta_sincronizacao_id_fkey"
            columns: ["sincronizacao_id"]
            isOneToOne: false
            referencedRelation: "apoio_catalogo_sincronizacao"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_catalogo_exame: {
        Row: {
          apoio_id: string
          ativo: boolean
          codigo: string
          company_id: string
          condicoes: Json | null
          conservantes: Json | null
          created_at: string
          descricao: string | null
          exige_pdf: boolean
          id: string
          info_comp: Json | null
          materiais: Json | null
          mnexa: string | null
          mnmat: string | null
          origem_admissivel: string | null
          prazo_dias: number | null
          sincronizado_em: string | null
          updated_at: string
        }
        Insert: {
          apoio_id: string
          ativo?: boolean
          codigo: string
          company_id: string
          condicoes?: Json | null
          conservantes?: Json | null
          created_at?: string
          descricao?: string | null
          exige_pdf?: boolean
          id?: string
          info_comp?: Json | null
          materiais?: Json | null
          mnexa?: string | null
          mnmat?: string | null
          origem_admissivel?: string | null
          prazo_dias?: number | null
          sincronizado_em?: string | null
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          ativo?: boolean
          codigo?: string
          company_id?: string
          condicoes?: Json | null
          conservantes?: Json | null
          created_at?: string
          descricao?: string | null
          exige_pdf?: boolean
          id?: string
          info_comp?: Json | null
          materiais?: Json | null
          mnexa?: string | null
          mnmat?: string | null
          origem_admissivel?: string | null
          prazo_dias?: number | null
          sincronizado_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_catalogo_exame_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_catalogo_exame_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_catalogo_sincronizacao: {
        Row: {
          alterados: number
          apoio_id: string
          arquivo_nome: string | null
          company_id: string
          created_at: string
          desativados: number
          executado_por: string | null
          id: string
          novos: number
          terceirizados_afetados: number
          total_arquivo: number
        }
        Insert: {
          alterados?: number
          apoio_id: string
          arquivo_nome?: string | null
          company_id: string
          created_at?: string
          desativados?: number
          executado_por?: string | null
          id?: string
          novos?: number
          terceirizados_afetados?: number
          total_arquivo?: number
        }
        Update: {
          alterados?: number
          apoio_id?: string
          arquivo_nome?: string | null
          company_id?: string
          created_at?: string
          desativados?: number
          executado_por?: string | null
          id?: string
          novos?: number
          terceirizados_afetados?: number
          total_arquivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "apoio_catalogo_sincronizacao_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_catalogo_sincronizacao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_certificacao: {
        Row: {
          apoio_id: string
          arquivo_path: string | null
          company_id: string
          created_at: string
          id: string
          numero: string | null
          tipo: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          apoio_id: string
          arquivo_path?: string | null
          company_id: string
          created_at?: string
          id?: string
          numero?: string | null
          tipo: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          apoio_id?: string
          arquivo_path?: string | null
          company_id?: string
          created_at?: string
          id?: string
          numero?: string | null
          tipo?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_certificacao_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_certificacao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_chamada_log: {
        Row: {
          apoio_id: string | null
          company_id: string
          created_at: string
          duracao_ms: number | null
          erro: string | null
          http_status: number | null
          id: string
          observacao: string | null
          operacao: string
          origem: string | null
          requisicao: string | null
          resolvido_em: string | null
          resolvido_obs: string | null
          resolvido_por: string | null
          resposta: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          apoio_id?: string | null
          company_id: string
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          http_status?: number | null
          id?: string
          observacao?: string | null
          operacao: string
          origem?: string | null
          requisicao?: string | null
          resolvido_em?: string | null
          resolvido_obs?: string | null
          resolvido_por?: string | null
          resposta?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          apoio_id?: string | null
          company_id?: string
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          http_status?: number | null
          id?: string
          observacao?: string | null
          operacao?: string
          origem?: string | null
          requisicao?: string | null
          resolvido_em?: string | null
          resolvido_obs?: string | null
          resolvido_por?: string | null
          resposta?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_chamada_log_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_chamada_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_cron_config: {
        Row: {
          id: number
          token: string
        }
        Insert: {
          id?: number
          token?: string
        }
        Update: {
          id?: number
          token?: string
        }
        Relationships: []
      }
      apoio_cursor: {
        Row: {
          alerta_em: string | null
          apoio_id: string
          ate: string | null
          company_id: string
          created_at: string
          falhas_desde: string | null
          falhas_n: number
          resolvido_em: string | null
          rotina: string
          ultima_execucao: string | null
          ultimo_erro: string | null
          ultimo_erro_em: string | null
          ultimo_sucesso: string | null
          updated_at: string
        }
        Insert: {
          alerta_em?: string | null
          apoio_id: string
          ate?: string | null
          company_id: string
          created_at?: string
          falhas_desde?: string | null
          falhas_n?: number
          resolvido_em?: string | null
          rotina: string
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_erro_em?: string | null
          ultimo_sucesso?: string | null
          updated_at?: string
        }
        Update: {
          alerta_em?: string | null
          apoio_id?: string
          ate?: string | null
          company_id?: string
          created_at?: string
          falhas_desde?: string | null
          falhas_n?: number
          resolvido_em?: string | null
          rotina?: string
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          ultimo_erro_em?: string | null
          ultimo_sucesso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_cursor_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_cursor_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_depara_analito: {
        Row: {
          casas_decimais: number | null
          chave_analito: string
          codigo_formato: string
          company_id: string
          created_at: string
          depara_exame_id: string
          id: string
          ignorar: boolean
          nome_apoio: string | null
          parametro_id: string | null
          updated_at: string
        }
        Insert: {
          casas_decimais?: number | null
          chave_analito: string
          codigo_formato?: string
          company_id: string
          created_at?: string
          depara_exame_id: string
          id?: string
          ignorar?: boolean
          nome_apoio?: string | null
          parametro_id?: string | null
          updated_at?: string
        }
        Update: {
          casas_decimais?: number | null
          chave_analito?: string
          codigo_formato?: string
          company_id?: string
          created_at?: string
          depara_exame_id?: string
          id?: string
          ignorar?: boolean
          nome_apoio?: string | null
          parametro_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_depara_analito_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_depara_analito_depara_exame_id_fkey"
            columns: ["depara_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_depara_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_depara_analito_parametro_id_fkey"
            columns: ["parametro_id"]
            isOneToOne: false
            referencedRelation: "lab_exam_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_depara_exame: {
        Row: {
          apoio_id: string
          ativo: boolean
          codigo_apoio: string
          codigo_formato: string | null
          codigo_formato_anterior: string | null
          company_id: string
          conservacao: string
          created_at: string
          exame_id: string
          exige_pdf: boolean
          id: string
          modelo: Json | null
          modelo_anterior: Json | null
          modelo_carregado_em: string | null
          modelo_mudou: boolean
          prioridade: number
          updated_at: string
        }
        Insert: {
          apoio_id: string
          ativo?: boolean
          codigo_apoio: string
          codigo_formato?: string | null
          codigo_formato_anterior?: string | null
          company_id: string
          conservacao?: string
          created_at?: string
          exame_id: string
          exige_pdf?: boolean
          id?: string
          modelo?: Json | null
          modelo_anterior?: Json | null
          modelo_carregado_em?: string | null
          modelo_mudou?: boolean
          prioridade?: number
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          ativo?: boolean
          codigo_apoio?: string
          codigo_formato?: string | null
          codigo_formato_anterior?: string | null
          company_id?: string
          conservacao?: string
          created_at?: string
          exame_id?: string
          exige_pdf?: boolean
          id?: string
          modelo?: Json | null
          modelo_anterior?: Json | null
          modelo_carregado_em?: string | null
          modelo_mudou?: boolean
          prioridade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_depara_exame_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_depara_exame_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_depara_exame_exame_id_fkey"
            columns: ["exame_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_depara_material: {
        Row: {
          apoio_id: string
          company_id: string
          created_at: string
          id: string
          material_apoio: string
          material_id: string
          mnmat: string | null
        }
        Insert: {
          apoio_id: string
          company_id: string
          created_at?: string
          id?: string
          material_apoio: string
          material_id: string
          mnmat?: string | null
        }
        Update: {
          apoio_id?: string
          company_id?: string
          created_at?: string
          id?: string
          material_apoio?: string
          material_id?: string
          mnmat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_depara_material_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_depara_material_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_depara_material_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "lab_material"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_documento: {
        Row: {
          company_id: string
          created_at: string
          enviado_por: string | null
          id: string
          origem: string | null
          pedido_exame_id: string
          storage_path: string
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          origem?: string | null
          pedido_exame_id: string
          storage_path: string
          tipo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          origem?: string | null
          pedido_exame_id?: string
          storage_path?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_documento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_documento_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_documento_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame_v"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_erro: {
        Row: {
          apoio_id: string
          categoria: string | null
          codigo: string
          company_id: string
          created_at: string
          id: string
          mensagem: string | null
          updated_at: string
        }
        Insert: {
          apoio_id: string
          categoria?: string | null
          codigo: string
          company_id: string
          created_at?: string
          id?: string
          mensagem?: string | null
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          categoria?: string | null
          codigo?: string
          company_id?: string
          created_at?: string
          id?: string
          mensagem?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_erro_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_erro_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_impressao_fila: {
        Row: {
          conteudo: string
          created_at: string
          criado_por: string | null
          empresa_id: string
          enviado_em: string | null
          erro: string | null
          id: string
          impresso_em: string | null
          impressora: string | null
          referencia: string | null
          status: string
          tentativas: number
          tipo: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          criado_por?: string | null
          empresa_id: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          impresso_em?: string | null
          impressora?: string | null
          referencia?: string | null
          status?: string
          tentativas?: number
          tipo: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          empresa_id?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          impresso_em?: string | null
          impressora?: string | null
          referencia?: string | null
          status?: string
          tentativas?: number
          tipo?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_impressao_fila_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_laboratorio: {
        Row: {
          alerta_guarda_min: number
          ambiente: string
          ativo: boolean
          cnpj: string | null
          cod_lab: string | null
          company_id: string
          conector: string
          conferir_apos_etiqueta: boolean
          conservacao_textos: Json
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          dias_transporte: number
          endpoint_url: string | null
          faixas_temperatura: Json
          guardar_pdf_sempre: boolean
          horarios_motoboy: string[]
          id: string
          licenca_arquivo_path: string | null
          licenca_sanitaria: string | null
          licenca_validade: string | null
          modo_contingencia: boolean
          modo_manual_desde: string | null
          modo_manual_por: string | null
          nome: string
          opcoes: Json
          prazo_contagem: string
          senha_cifrada: string | null
          senha_secret_id: string | null
          updated_at: string
        }
        Insert: {
          alerta_guarda_min?: number
          ambiente?: string
          ativo?: boolean
          cnpj?: string | null
          cod_lab?: string | null
          company_id: string
          conector?: string
          conferir_apos_etiqueta?: boolean
          conservacao_textos?: Json
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          dias_transporte?: number
          endpoint_url?: string | null
          faixas_temperatura?: Json
          guardar_pdf_sempre?: boolean
          horarios_motoboy?: string[]
          id?: string
          licenca_arquivo_path?: string | null
          licenca_sanitaria?: string | null
          licenca_validade?: string | null
          modo_contingencia?: boolean
          modo_manual_desde?: string | null
          modo_manual_por?: string | null
          nome: string
          opcoes?: Json
          prazo_contagem?: string
          senha_cifrada?: string | null
          senha_secret_id?: string | null
          updated_at?: string
        }
        Update: {
          alerta_guarda_min?: number
          ambiente?: string
          ativo?: boolean
          cnpj?: string | null
          cod_lab?: string | null
          company_id?: string
          conector?: string
          conferir_apos_etiqueta?: boolean
          conservacao_textos?: Json
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          dias_transporte?: number
          endpoint_url?: string | null
          faixas_temperatura?: Json
          guardar_pdf_sempre?: boolean
          horarios_motoboy?: string[]
          id?: string
          licenca_arquivo_path?: string | null
          licenca_sanitaria?: string | null
          licenca_validade?: string | null
          modo_contingencia?: boolean
          modo_manual_desde?: string | null
          modo_manual_por?: string | null
          nome?: string
          opcoes?: Json
          prazo_contagem?: string
          senha_cifrada?: string | null
          senha_secret_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_laboratorio_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_lote_usado: {
        Row: {
          cod_lote_lab: number
          company_id: string
          created_at: string
          motivo: string | null
          remessa_id: string | null
        }
        Insert: {
          cod_lote_lab: number
          company_id: string
          created_at?: string
          motivo?: string | null
          remessa_id?: string | null
        }
        Update: {
          cod_lote_lab?: number
          company_id?: string
          created_at?: string
          motivo?: string | null
          remessa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_lote_usado_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_modelo_import: {
        Row: {
          apoio_id: string
          company_id: string
          created_at: string
          dados: Json
          id: number
          lote: string
        }
        Insert: {
          apoio_id: string
          company_id: string
          created_at?: string
          dados: Json
          id?: number
          lote: string
        }
        Update: {
          apoio_id?: string
          company_id?: string
          created_at?: string
          dados?: Json
          id?: number
          lote?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_modelo_import_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_modelo_import_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_modelo_resultado: {
        Row: {
          apoio_id: string
          atualizado_em: string
          cod_exm_apoio: string
          codigo_formato: string
          company_id: string
          exame_nome: string | null
          id: string
          material_nome: string | null
          metodo: string | null
          modelo_json: Json
          origem: string
          ultima_liberacao: string | null
          unidade_produtiva: string | null
        }
        Insert: {
          apoio_id: string
          atualizado_em?: string
          cod_exm_apoio: string
          codigo_formato?: string
          company_id: string
          exame_nome?: string | null
          id?: string
          material_nome?: string | null
          metodo?: string | null
          modelo_json?: Json
          origem?: string
          ultima_liberacao?: string | null
          unidade_produtiva?: string | null
        }
        Update: {
          apoio_id?: string
          atualizado_em?: string
          cod_exm_apoio?: string
          codigo_formato?: string
          company_id?: string
          exame_nome?: string | null
          id?: string
          material_nome?: string | null
          metodo?: string | null
          modelo_json?: Json
          origem?: string
          ultima_liberacao?: string | null
          unidade_produtiva?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_modelo_resultado_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_modelo_resultado_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_modo_manual_periodo: {
        Row: {
          apoio_id: string
          company_id: string
          created_at: string
          desligado_por: string | null
          fim: string | null
          id: string
          inicio: string
          ligado_por: string | null
        }
        Insert: {
          apoio_id: string
          company_id: string
          created_at?: string
          desligado_por?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          ligado_por?: string | null
        }
        Update: {
          apoio_id?: string
          company_id?: string
          created_at?: string
          desligado_por?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          ligado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_modo_manual_periodo_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_modo_manual_periodo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_pdf_contador: {
        Row: {
          apoio_id: string
          chamadas: number
          company_id: string
          dia: string
        }
        Insert: {
          apoio_id: string
          chamadas?: number
          company_id: string
          dia?: string
        }
        Update: {
          apoio_id?: string
          chamadas?: number
          company_id?: string
          dia?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_pdf_contador_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pdf_contador_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_pedido_exame: {
        Row: {
          amostra_id: string | null
          apoio_id: string
          cod_ped_apoio: string | null
          cod_ped_lab: string | null
          codigo_apoio: string | null
          company_id: string
          created_at: string
          critico: boolean
          custo_previsto: number | null
          erro: Json | null
          exame_id: string | null
          id: string
          info_complementar: Json | null
          modo: string
          pedido_id: string
          prazo_contagem: string
          prazo_previsto: string | null
          preco_ficticio: boolean
          recipiente_id: string | null
          remessa_id: string | null
          responsavel_id: string | null
          sem_prazo_apoio: boolean
          sequencial: number
          status: Database["public"]["Enums"]["apoio_status"]
          status_apoio_cod: string | null
          status_apoio_desc: string | null
          status_apoio_em: string | null
          updated_at: string
        }
        Insert: {
          amostra_id?: string | null
          apoio_id: string
          cod_ped_apoio?: string | null
          cod_ped_lab?: string | null
          codigo_apoio?: string | null
          company_id: string
          created_at?: string
          critico?: boolean
          custo_previsto?: number | null
          erro?: Json | null
          exame_id?: string | null
          id?: string
          info_complementar?: Json | null
          modo?: string
          pedido_id: string
          prazo_contagem?: string
          prazo_previsto?: string | null
          preco_ficticio?: boolean
          recipiente_id?: string | null
          remessa_id?: string | null
          responsavel_id?: string | null
          sem_prazo_apoio?: boolean
          sequencial?: number
          status?: Database["public"]["Enums"]["apoio_status"]
          status_apoio_cod?: string | null
          status_apoio_desc?: string | null
          status_apoio_em?: string | null
          updated_at?: string
        }
        Update: {
          amostra_id?: string | null
          apoio_id?: string
          cod_ped_apoio?: string | null
          cod_ped_lab?: string | null
          codigo_apoio?: string | null
          company_id?: string
          created_at?: string
          critico?: boolean
          custo_previsto?: number | null
          erro?: Json | null
          exame_id?: string | null
          id?: string
          info_complementar?: Json | null
          modo?: string
          pedido_id?: string
          prazo_contagem?: string
          prazo_previsto?: string | null
          preco_ficticio?: boolean
          recipiente_id?: string | null
          remessa_id?: string | null
          responsavel_id?: string | null
          sem_prazo_apoio?: boolean
          sequencial?: number
          status?: Database["public"]["Enums"]["apoio_status"]
          status_apoio_cod?: string | null
          status_apoio_desc?: string | null
          status_apoio_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_pedido_exame_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_exame_id_fkey"
            columns: ["exame_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "attendance_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_recipiente_id_fkey"
            columns: ["recipiente_id"]
            isOneToOne: false
            referencedRelation: "apoio_recipiente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_remessa_id_fkey"
            columns: ["remessa_id"]
            isOneToOne: false
            referencedRelation: "apoio_remessa"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_pedido_exame_historico: {
        Row: {
          company_id: string
          created_at: string
          dados: Json | null
          id: string
          motivo: string | null
          origem: string
          pedido_exame_id: string
          status_de: Database["public"]["Enums"]["apoio_status"] | null
          status_para: Database["public"]["Enums"]["apoio_status"]
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          dados?: Json | null
          id?: string
          motivo?: string | null
          origem: string
          pedido_exame_id: string
          status_de?: Database["public"]["Enums"]["apoio_status"] | null
          status_para: Database["public"]["Enums"]["apoio_status"]
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          dados?: Json | null
          id?: string
          motivo?: string | null
          origem?: string
          pedido_exame_id?: string
          status_de?: Database["public"]["Enums"]["apoio_status"] | null
          status_para?: Database["public"]["Enums"]["apoio_status"]
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_pedido_exame_historico_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_historico_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_historico_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame_v"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_pendencia_tecnica: {
        Row: {
          cod_ped_apoio: string | null
          codigo_apoio: string | null
          company_id: string
          created_at: string
          detalhamento: string | null
          disposicao: string | null
          id: string
          pedido_exame_id: string | null
          pendencia: string | null
          recebida_em: string | null
          resolucao: string | null
          resolvida_em: string | null
          resolvida_por: string | null
          situacao: string | null
          updated_at: string
        }
        Insert: {
          cod_ped_apoio?: string | null
          codigo_apoio?: string | null
          company_id: string
          created_at?: string
          detalhamento?: string | null
          disposicao?: string | null
          id?: string
          pedido_exame_id?: string | null
          pendencia?: string | null
          recebida_em?: string | null
          resolucao?: string | null
          resolvida_em?: string | null
          resolvida_por?: string | null
          situacao?: string | null
          updated_at?: string
        }
        Update: {
          cod_ped_apoio?: string | null
          codigo_apoio?: string | null
          company_id?: string
          created_at?: string
          detalhamento?: string | null
          disposicao?: string | null
          id?: string
          pedido_exame_id?: string | null
          pendencia?: string | null
          recebida_em?: string | null
          resolucao?: string | null
          resolvida_em?: string | null
          resolvida_por?: string | null
          situacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_pendencia_tecnica_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pendencia_tecnica_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pendencia_tecnica_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame_v"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_preco: {
        Row: {
          apoio_id: string
          codigo: string
          company_id: string
          created_at: string
          ficticio: boolean
          id: string
          importacao_id: string | null
          prazo_dias: number | null
          prazo_dias_uteis: number | null
          preco: number
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          apoio_id: string
          codigo: string
          company_id: string
          created_at?: string
          ficticio?: boolean
          id?: string
          importacao_id?: string | null
          prazo_dias?: number | null
          prazo_dias_uteis?: number | null
          preco: number
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          apoio_id?: string
          codigo?: string
          company_id?: string
          created_at?: string
          ficticio?: boolean
          id?: string
          importacao_id?: string | null
          prazo_dias?: number | null
          prazo_dias_uteis?: number | null
          preco?: number
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_preco_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_preco_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_preco_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "apoio_preco_importacao"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_preco_importacao: {
        Row: {
          apoio_id: string
          arquivo_nome: string | null
          company_id: string
          created_at: string
          erros: Json | null
          ficticia: boolean
          id: string
          importado_por: string | null
          linhas_erro: number | null
          linhas_ok: number | null
          linhas_total: number | null
          removida_em: string | null
          removida_por: string | null
          updated_at: string
        }
        Insert: {
          apoio_id: string
          arquivo_nome?: string | null
          company_id: string
          created_at?: string
          erros?: Json | null
          ficticia?: boolean
          id?: string
          importado_por?: string | null
          linhas_erro?: number | null
          linhas_ok?: number | null
          linhas_total?: number | null
          removida_em?: string | null
          removida_por?: string | null
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          arquivo_nome?: string | null
          company_id?: string
          created_at?: string
          erros?: Json | null
          ficticia?: boolean
          id?: string
          importado_por?: string | null
          linhas_erro?: number | null
          linhas_ok?: number | null
          linhas_total?: number | null
          removida_em?: string | null
          removida_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_preco_importacao_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_preco_importacao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_recipiente: {
        Row: {
          bipado: boolean
          bipado_em: string | null
          cancelado: boolean
          cod_bar_apoio: string | null
          cod_ped_apoio: string | null
          company_id: string
          conservacao: string | null
          conservacao_origem: string | null
          conservacao_texto: string | null
          created_at: string
          etiqueta_epl: string | null
          id: string
          impressoes: number
          remessa_id: string
          separado: boolean
          separado_em: string | null
          updated_at: string
        }
        Insert: {
          bipado?: boolean
          bipado_em?: string | null
          cancelado?: boolean
          cod_bar_apoio?: string | null
          cod_ped_apoio?: string | null
          company_id: string
          conservacao?: string | null
          conservacao_origem?: string | null
          conservacao_texto?: string | null
          created_at?: string
          etiqueta_epl?: string | null
          id?: string
          impressoes?: number
          remessa_id: string
          separado?: boolean
          separado_em?: string | null
          updated_at?: string
        }
        Update: {
          bipado?: boolean
          bipado_em?: string | null
          cancelado?: boolean
          cod_bar_apoio?: string | null
          cod_ped_apoio?: string | null
          company_id?: string
          conservacao?: string | null
          conservacao_origem?: string | null
          conservacao_texto?: string | null
          created_at?: string
          etiqueta_epl?: string | null
          id?: string
          impressoes?: number
          remessa_id?: string
          separado?: boolean
          separado_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_recipiente_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_recipiente_remessa_id_fkey"
            columns: ["remessa_id"]
            isOneToOne: false
            referencedRelation: "apoio_remessa"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_remessa: {
        Row: {
          apoio_id: string
          bipados: Json
          cod_lote_apoio: string | null
          cod_lote_lab: number | null
          colisao: string | null
          company_id: string
          conferencia_forcada: string | null
          conferido_em: string | null
          conferido_por: string | null
          created_at: string
          criado_por: string | null
          entrega_forcada: string | null
          entrega_sacos: Json | null
          entregue_a: string | null
          entregue_em: string | null
          entregue_registrado_por: string | null
          envio_sem_resposta: boolean
          id: string
          mensagem_id: string | null
          modo: string
          observacao: string | null
          saida_prevista: string | null
          separada_em: string | null
          status: string
          temperatura: string
          transmitido_em: string | null
          updated_at: string
        }
        Insert: {
          apoio_id: string
          bipados?: Json
          cod_lote_apoio?: string | null
          cod_lote_lab?: number | null
          colisao?: string | null
          company_id: string
          conferencia_forcada?: string | null
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          criado_por?: string | null
          entrega_forcada?: string | null
          entrega_sacos?: Json | null
          entregue_a?: string | null
          entregue_em?: string | null
          entregue_registrado_por?: string | null
          envio_sem_resposta?: boolean
          id?: string
          mensagem_id?: string | null
          modo?: string
          observacao?: string | null
          saida_prevista?: string | null
          separada_em?: string | null
          status?: string
          temperatura?: string
          transmitido_em?: string | null
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          bipados?: Json
          cod_lote_apoio?: string | null
          cod_lote_lab?: number | null
          colisao?: string | null
          company_id?: string
          conferencia_forcada?: string | null
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          criado_por?: string | null
          entrega_forcada?: string | null
          entrega_sacos?: Json | null
          entregue_a?: string | null
          entregue_em?: string | null
          entregue_registrado_por?: string | null
          envio_sem_resposta?: boolean
          id?: string
          mensagem_id?: string | null
          modo?: string
          observacao?: string | null
          saida_prevista?: string | null
          separada_em?: string | null
          status?: string
          temperatura?: string
          transmitido_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_remessa_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_remessa_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_resultado_versao: {
        Row: {
          ciente_em: string | null
          ciente_por: string | null
          cod_exm_apoio: string | null
          cod_ped_apoio: string | null
          codigo_formato: string | null
          company_id: string
          conferido_por: string | null
          conteudo: Json | null
          created_at: string
          digitado_por: string | null
          executor_informado: string | null
          hash: string | null
          id: string
          origem: string
          pedido_exame_id: string | null
          resolucao: Json | null
          retificacao: string | null
          situacao: string
          updated_at: string
          xml_original: string | null
        }
        Insert: {
          ciente_em?: string | null
          ciente_por?: string | null
          cod_exm_apoio?: string | null
          cod_ped_apoio?: string | null
          codigo_formato?: string | null
          company_id: string
          conferido_por?: string | null
          conteudo?: Json | null
          created_at?: string
          digitado_por?: string | null
          executor_informado?: string | null
          hash?: string | null
          id?: string
          origem: string
          pedido_exame_id?: string | null
          resolucao?: Json | null
          retificacao?: string | null
          situacao?: string
          updated_at?: string
          xml_original?: string | null
        }
        Update: {
          ciente_em?: string | null
          ciente_por?: string | null
          cod_exm_apoio?: string | null
          cod_ped_apoio?: string | null
          codigo_formato?: string | null
          company_id?: string
          conferido_por?: string | null
          conteudo?: Json | null
          created_at?: string
          digitado_por?: string | null
          executor_informado?: string | null
          hash?: string | null
          id?: string
          origem?: string
          pedido_exame_id?: string | null
          resolucao?: Json | null
          retificacao?: string | null
          situacao?: string
          updated_at?: string
          xml_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_resultado_versao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_resultado_versao_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_resultado_versao_pedido_exame_id_fkey"
            columns: ["pedido_exame_id"]
            isOneToOne: false
            referencedRelation: "apoio_pedido_exame_v"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_status_map: {
        Row: {
          apoio_id: string
          cod_apoio: string
          company_id: string
          created_at: string
          descricao_apoio: string | null
          id: string
          status_nosso: Database["public"]["Enums"]["apoio_status"]
          updated_at: string
        }
        Insert: {
          apoio_id: string
          cod_apoio: string
          company_id: string
          created_at?: string
          descricao_apoio?: string | null
          id?: string
          status_nosso: Database["public"]["Enums"]["apoio_status"]
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          cod_apoio?: string
          company_id?: string
          created_at?: string
          descricao_apoio?: string | null
          id?: string
          status_nosso?: Database["public"]["Enums"]["apoio_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_status_map_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_status_map_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      apoio_visao_kanban: {
        Row: {
          company_id: string
          compartilhada: boolean
          created_at: string
          dono_id: string | null
          filtros: Json
          id: string
          nome: string
          ordem: number
          padrao: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          compartilhada?: boolean
          created_at?: string
          dono_id?: string | null
          filtros?: Json
          id?: string
          nome: string
          ordem?: number
          padrao?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          compartilhada?: boolean
          created_at?: string
          dono_id?: string | null
          filtros?: Json
          id?: string
          nome?: string
          ordem?: number
          padrao?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apoio_visao_kanban_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          cancelled_reason: string | null
          company_id: string
          convenio_id: string | null
          convenio_name: string | null
          created_at: string
          created_by: string | null
          date: string
          doctor: string
          doctor_id: string | null
          duration: number
          exam_id: string | null
          exam_name: string | null
          id: string
          notes: string | null
          paciente_confirmou_em: string | null
          patient_id: string | null
          patient_name: string
          patient_phone1: string | null
          patient_phone2: string | null
          pedido_paciente: string | null
          pedido_paciente_em: string | null
          sched_status: string
          status: Database["public"]["Enums"]["appointment_status"]
          time: string
          type: string
          updated_at: string
          visit_type: string
        }
        Insert: {
          appointment_type?: string
          cancelled_reason?: string | null
          company_id: string
          convenio_id?: string | null
          convenio_name?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          doctor: string
          doctor_id?: string | null
          duration?: number
          exam_id?: string | null
          exam_name?: string | null
          id?: string
          notes?: string | null
          paciente_confirmou_em?: string | null
          patient_id?: string | null
          patient_name: string
          patient_phone1?: string | null
          patient_phone2?: string | null
          pedido_paciente?: string | null
          pedido_paciente_em?: string | null
          sched_status?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          time: string
          type?: string
          updated_at?: string
          visit_type?: string
        }
        Update: {
          appointment_type?: string
          cancelled_reason?: string | null
          company_id?: string
          convenio_id?: string | null
          convenio_name?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          doctor?: string
          doctor_id?: string | null
          duration?: number
          exam_id?: string | null
          exam_name?: string | null
          id?: string
          notes?: string | null
          paciente_confirmou_em?: string | null
          patient_id?: string | null
          patient_name?: string
          patient_phone1?: string | null
          patient_phone2?: string | null
          pedido_paciente?: string | null
          pedido_paciente_em?: string | null
          sched_status?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          time?: string
          type?: string
          updated_at?: string
          visit_type?: string
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
          bed: string | null
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
          fasting_start_hour: string | null
          fasting_type: string | null
          has_fever: boolean
          hash: string | null
          height: string | null
          hospital_id: string | null
          hospital_name: string | null
          hospital_sector_id: string | null
          hospital_sector_name: string | null
          id: string
          is_fasting: boolean | null
          is_urgent: boolean
          lab_guides: Json | null
          medical_record_number: string | null
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
          service_observation: string | null
          service_type: string
          specialty: string | null
          status: string
          updated_at: string
          weight: string | null
        }
        Insert: {
          attachments?: Json | null
          authorization_code?: string | null
          authorization_date?: string | null
          authorization_expiry?: string | null
          authorization_password?: string | null
          bed?: string | null
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
          fasting_start_hour?: string | null
          fasting_type?: string | null
          has_fever?: boolean
          hash?: string | null
          height?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          hospital_sector_id?: string | null
          hospital_sector_name?: string | null
          id?: string
          is_fasting?: boolean | null
          is_urgent?: boolean
          lab_guides?: Json | null
          medical_record_number?: string | null
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
          service_observation?: string | null
          service_type: string
          specialty?: string | null
          status?: string
          updated_at?: string
          weight?: string | null
        }
        Update: {
          attachments?: Json | null
          authorization_code?: string | null
          authorization_date?: string | null
          authorization_expiry?: string | null
          authorization_password?: string | null
          bed?: string | null
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
          fasting_start_hour?: string | null
          fasting_type?: string | null
          has_fever?: boolean
          hash?: string | null
          height?: string | null
          hospital_id?: string | null
          hospital_name?: string | null
          hospital_sector_id?: string | null
          hospital_sector_name?: string | null
          id?: string
          is_fasting?: boolean | null
          is_urgent?: boolean
          lab_guides?: Json | null
          medical_record_number?: string | null
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
          service_observation?: string | null
          service_type?: string
          specialty?: string | null
          status?: string
          updated_at?: string
          weight?: string | null
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
      auth_lockouts: {
        Row: {
          company_id: string | null
          created_at: string
          expires_at: string
          failed_count: number
          id: string
          lock_key: string
          lock_type: string
          locked_at: string
          reason: string
          released_at: string | null
          released_by: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          expires_at: string
          failed_count?: number
          id?: string
          lock_key: string
          lock_type: string
          locked_at?: string
          reason?: string
          released_at?: string | null
          released_by?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          expires_at?: string
          failed_count?: number
          id?: string
          lock_key?: string
          lock_type?: string
          locked_at?: string
          reason?: string
          released_at?: string | null
          released_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_lockouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_occupancies: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          away: boolean
          bed_id: string
          company_id: string
          id: string
          manchester_color: string | null
          patient_id: string | null
          patient_name: string
          release_reason: string | null
          released_at: string | null
          released_by: string | null
          status: string
          triage_entry_id: string | null
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          away?: boolean
          bed_id: string
          company_id: string
          id?: string
          manchester_color?: string | null
          patient_id?: string | null
          patient_name: string
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          triage_entry_id?: string | null
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          away?: boolean
          bed_id?: string
          company_id?: string
          id?: string
          manchester_color?: string | null
          patient_id?: string | null
          patient_name?: string
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          triage_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bed_occupancies_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_referral_sectors: {
        Row: {
          company_id: string
          created_at: string
          hospital_id: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      bed_referrals: {
        Row: {
          bed_id: string
          company_id: string
          id: string
          manchester_color: string | null
          notes: string | null
          occupancy_id: string
          patient_name: string
          referred_at: string
          referred_by: string | null
          returned_at: string | null
          returned_by: string | null
          sector_id: string | null
          sector_name: string
          status: string
        }
        Insert: {
          bed_id: string
          company_id: string
          id?: string
          manchester_color?: string | null
          notes?: string | null
          occupancy_id: string
          patient_name: string
          referred_at?: string
          referred_by?: string | null
          returned_at?: string | null
          returned_by?: string | null
          sector_id?: string | null
          sector_name: string
          status?: string
        }
        Update: {
          bed_id?: string
          company_id?: string
          id?: string
          manchester_color?: string | null
          notes?: string | null
          occupancy_id?: string
          patient_name?: string
          referred_at?: string
          referred_by?: string | null
          returned_at?: string | null
          returned_by?: string | null
          sector_id?: string | null
          sector_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_referrals_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bed_referrals_occupancy_id_fkey"
            columns: ["occupancy_id"]
            isOneToOne: false
            referencedRelation: "bed_occupancies"
            referencedColumns: ["id"]
          },
        ]
      }
      bed_status_log: {
        Row: {
          bed_id: string
          changed_at: string
          changed_by: string | null
          company_id: string
          from_status: string | null
          id: string
          note: string | null
          occupancy_id: string | null
          to_status: string
        }
        Insert: {
          bed_id: string
          changed_at?: string
          changed_by?: string | null
          company_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          occupancy_id?: string | null
          to_status: string
        }
        Update: {
          bed_id?: string
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          occupancy_id?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bed_status_log_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          company_id: string
          created_at: string
          current_occupancy_id: string | null
          id: string
          is_active: boolean
          name: string
          post_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_occupancy_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          post_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_occupancy_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          post_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "collection_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_posts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          hospital_id: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          apoio_enabled: boolean
          apoio_released_at: string | null
          apoio_released_by: string | null
          armazenamento_limite_gb: number | null
          armazenamento_usado_gb: number | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          crm_habilitado: boolean
          crm_habilitado_em: string | null
          crm_habilitado_por: string | null
          email: string | null
          estado: string | null
          id: string
          inovachat_habilitado: boolean
          inovachat_habilitado_em: string | null
          inovachat_habilitado_por: string | null
          inovachat_retencao_meses: number
          logradouro: string | null
          medicos_ativos: number | null
          medicos_limite: number | null
          name: string
          nome_fantasia: string | null
          numero: string | null
          partner_api_enabled: boolean
          partner_api_max_partners: number
          partner_api_note: string | null
          partner_api_released_at: string | null
          partner_api_released_by: string | null
          plano: string | null
          segmento: string | null
          sequence_id: number
          session_timeout: number | null
          status: string | null
          telefone: string | null
          updated_at: string
          usuarios_ativos: number | null
          usuarios_limite: number | null
          valor_mensal: number | null
          website: string | null
          whatsapp_habilitado: boolean
          whatsapp_habilitado_em: string | null
          whatsapp_habilitado_por: string | null
          whatsapp_numeros_autorizados: number
        }
        Insert: {
          apoio_enabled?: boolean
          apoio_released_at?: string | null
          apoio_released_by?: string | null
          armazenamento_limite_gb?: number | null
          armazenamento_usado_gb?: number | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          crm_habilitado?: boolean
          crm_habilitado_em?: string | null
          crm_habilitado_por?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inovachat_habilitado?: boolean
          inovachat_habilitado_em?: string | null
          inovachat_habilitado_por?: string | null
          inovachat_retencao_meses?: number
          logradouro?: string | null
          medicos_ativos?: number | null
          medicos_limite?: number | null
          name: string
          nome_fantasia?: string | null
          numero?: string | null
          partner_api_enabled?: boolean
          partner_api_max_partners?: number
          partner_api_note?: string | null
          partner_api_released_at?: string | null
          partner_api_released_by?: string | null
          plano?: string | null
          segmento?: string | null
          sequence_id?: number
          session_timeout?: number | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          usuarios_ativos?: number | null
          usuarios_limite?: number | null
          valor_mensal?: number | null
          website?: string | null
          whatsapp_habilitado?: boolean
          whatsapp_habilitado_em?: string | null
          whatsapp_habilitado_por?: string | null
          whatsapp_numeros_autorizados?: number
        }
        Update: {
          apoio_enabled?: boolean
          apoio_released_at?: string | null
          apoio_released_by?: string | null
          armazenamento_limite_gb?: number | null
          armazenamento_usado_gb?: number | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          crm_habilitado?: boolean
          crm_habilitado_em?: string | null
          crm_habilitado_por?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inovachat_habilitado?: boolean
          inovachat_habilitado_em?: string | null
          inovachat_habilitado_por?: string | null
          inovachat_retencao_meses?: number
          logradouro?: string | null
          medicos_ativos?: number | null
          medicos_limite?: number | null
          name?: string
          nome_fantasia?: string | null
          numero?: string | null
          partner_api_enabled?: boolean
          partner_api_max_partners?: number
          partner_api_note?: string | null
          partner_api_released_at?: string | null
          partner_api_released_by?: string | null
          plano?: string | null
          segmento?: string | null
          sequence_id?: number
          session_timeout?: number | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          usuarios_ativos?: number | null
          usuarios_limite?: number | null
          valor_mensal?: number | null
          website?: string | null
          whatsapp_habilitado?: boolean
          whatsapp_habilitado_em?: string | null
          whatsapp_habilitado_por?: string | null
          whatsapp_numeros_autorizados?: number
        }
        Relationships: []
      }
      company_branding: {
        Row: {
          background_color: string
          border_color: string
          brand_name: string | null
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
          brand_name?: string | null
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
          brand_name?: string | null
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
      company_sectors: {
        Row: {
          allowed_deadline_profile_ids: string[]
          allowed_profile_ids: string[]
          allowed_queue_types: string[]
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          module_overrides: Json
          name: string
          updated_at: string
        }
        Insert: {
          allowed_deadline_profile_ids?: string[]
          allowed_profile_ids?: string[]
          allowed_queue_types?: string[]
          company_id: string
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          module_overrides?: Json
          name: string
          updated_at?: string
        }
        Update: {
          allowed_deadline_profile_ids?: string[]
          allowed_profile_ids?: string[]
          allowed_queue_types?: string[]
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module_overrides?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_sectors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
      crm_alertas_dia: {
        Row: {
          company_id: string
          dia: string
          lead_id: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          company_id: string
          dia: string
          lead_id: string
          tipo: string
          usuario_id: string
        }
        Update: {
          company_id?: string
          dia?: string
          lead_id?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_alertas_dia_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_alertas_dia_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_config: {
        Row: {
          alerta_lead_quente: boolean
          alterado_em: string
          company_id: string
          evolucao_automatica: boolean
          frio_apos_dias: number
          palavras_quentes: string[]
          temperatura_modo: string
          travar_manual_dias: number
        }
        Insert: {
          alerta_lead_quente?: boolean
          alterado_em?: string
          company_id: string
          evolucao_automatica?: boolean
          frio_apos_dias?: number
          palavras_quentes?: string[]
          temperatura_modo?: string
          travar_manual_dias?: number
        }
        Update: {
          alerta_lead_quente?: boolean
          alterado_em?: string
          company_id?: string
          evolucao_automatica?: boolean
          frio_apos_dias?: number
          palavras_quentes?: string[]
          temperatura_modo?: string
          travar_manual_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_etapas: {
        Row: {
          ativa: boolean
          automacao: string | null
          company_id: string
          cor: string
          criado_em: string
          id: string
          inicial: boolean
          nome: string
          ordem: number
          tipo: string
        }
        Insert: {
          ativa?: boolean
          automacao?: string | null
          company_id: string
          cor?: string
          criado_em?: string
          id?: string
          inicial?: boolean
          nome: string
          ordem?: number
          tipo?: string
        }
        Update: {
          ativa?: boolean
          automacao?: string | null
          company_id?: string
          cor?: string
          criado_em?: string
          id?: string
          inicial?: boolean
          nome?: string
          ordem?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_etapas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_eventos: {
        Row: {
          automacao: string | null
          company_id: string
          criado_em: string
          de: string | null
          etapa_id: string | null
          id: string
          lead_id: string
          origem: string
          para: string | null
          regra: string | null
          texto: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          automacao?: string | null
          company_id: string
          criado_em?: string
          de?: string | null
          etapa_id?: string | null
          id?: string
          lead_id: string
          origem?: string
          para?: string | null
          regra?: string | null
          texto?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          automacao?: string | null
          company_id?: string
          criado_em?: string
          de?: string | null
          etapa_id?: string | null
          id?: string
          lead_id?: string
          origem?: string
          para?: string | null
          regra?: string | null
          texto?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_eventos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_eventos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
        }
        Insert: {
          lead_id: string
          tag_id: string
        }
        Update: {
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          atualizado_em: string
          company_id: string
          contato_id: string
          convertido_em: string | null
          criado_em: string
          criado_por: string | null
          etapa_atualizada_em: string
          etapa_id: string
          fechado_em: string | null
          id: string
          interesse: string | null
          motivo_perda_id: string | null
          motivo_perda_texto: string | null
          nome: string
          origem: string
          paciente_id: string | null
          primeira_resposta_em: string | null
          proximo_contato_em: string | null
          responsavel_id: string | null
          temperatura: string
          temperatura_origem: string
          temperatura_regra: string | null
          temperatura_travada_ate: string | null
          valor_estimado: number | null
        }
        Insert: {
          atualizado_em?: string
          company_id: string
          contato_id: string
          convertido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          etapa_atualizada_em?: string
          etapa_id: string
          fechado_em?: string | null
          id?: string
          interesse?: string | null
          motivo_perda_id?: string | null
          motivo_perda_texto?: string | null
          nome: string
          origem?: string
          paciente_id?: string | null
          primeira_resposta_em?: string | null
          proximo_contato_em?: string | null
          responsavel_id?: string | null
          temperatura?: string
          temperatura_origem?: string
          temperatura_regra?: string | null
          temperatura_travada_ate?: string | null
          valor_estimado?: number | null
        }
        Update: {
          atualizado_em?: string
          company_id?: string
          contato_id?: string
          convertido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          etapa_atualizada_em?: string
          etapa_id?: string
          fechado_em?: string | null
          id?: string
          interesse?: string | null
          motivo_perda_id?: string | null
          motivo_perda_texto?: string | null
          nome?: string
          origem?: string
          paciente_id?: string | null
          primeira_resposta_em?: string | null
          proximo_contato_em?: string | null
          responsavel_id?: string | null
          temperatura?: string
          temperatura_origem?: string
          temperatura_regra?: string | null
          temperatura_travada_ate?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "crm_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "crm_motivos_perda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_motivos_perda: {
        Row: {
          ativo: boolean
          company_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_motivos_perda_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sinais: {
        Row: {
          company_id: string
          em: string
        }
        Insert: {
          company_id: string
          em?: string
        }
        Update: {
          company_id?: string
          em?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_sinais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          ativa: boolean
          company_id: string
          cor: string
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          company_id: string
          cor?: string
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          company_id?: string
          cor?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          agenda_enabled: boolean
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
          agenda_enabled?: boolean
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
          agenda_enabled?: boolean
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
      exam_delivery_estimates: {
        Row: {
          company_id: string
          created_at: string
          days: number
          exam_id: string
          hours: number
          id: string
          minutes: number
          no_estimate: boolean
          origin_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days?: number
          exam_id: string
          hours?: number
          id?: string
          minutes?: number
          no_estimate?: boolean
          origin_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days?: number
          exam_id?: string
          hours?: number
          id?: string
          minutes?: number
          no_estimate?: boolean
          origin_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_delivery_estimates_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_delivery_estimates_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_laudos: {
        Row: {
          code: string
          company_id: string
          created_at: string
          default_material: string | null
          exam_id: string
          id: string
          is_active: boolean
          material_tubos: Json
          methodology: string | null
          name: string
          parameters: Json
          reference_values: Json
          report_observations: string | null
          report_single_page: boolean
          report_template_id: string | null
          result_deadline_days: number | null
          selected_materials: Json | null
          sort_order: number
          updated_at: string
          workbench_id: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          default_material?: string | null
          exam_id: string
          id?: string
          is_active?: boolean
          material_tubos?: Json
          methodology?: string | null
          name: string
          parameters?: Json
          reference_values?: Json
          report_observations?: string | null
          report_single_page?: boolean
          report_template_id?: string | null
          result_deadline_days?: number | null
          selected_materials?: Json | null
          sort_order?: number
          updated_at?: string
          workbench_id?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          default_material?: string | null
          exam_id?: string
          id?: string
          is_active?: boolean
          material_tubos?: Json
          methodology?: string | null
          name?: string
          parameters?: Json
          reference_values?: Json
          report_observations?: string | null
          report_single_page?: boolean
          report_template_id?: string | null
          result_deadline_days?: number | null
          selected_materials?: Json | null
          sort_order?: number
          updated_at?: string
          workbench_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_laudos_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exame_bancada_troca: {
        Row: {
          bancada_de: string | null
          bancada_para: string | null
          company_id: string
          created_at: string
          detalhes: Json | null
          exame_id: string
          id: string
          itens_movidos: number
          motivo: string | null
          pedido_id: string | null
          pedido_item_ref: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          bancada_de?: string | null
          bancada_para?: string | null
          company_id: string
          created_at?: string
          detalhes?: Json | null
          exame_id: string
          id?: string
          itens_movidos?: number
          motivo?: string | null
          pedido_id?: string | null
          pedido_item_ref?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          bancada_de?: string | null
          bancada_para?: string | null
          company_id?: string
          created_at?: string
          detalhes?: Json | null
          exame_id?: string
          id?: string
          itens_movidos?: number
          motivo?: string | null
          pedido_id?: string | null
          pedido_item_ref?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exame_bancada_troca_bancada_de_fkey"
            columns: ["bancada_de"]
            isOneToOne: false
            referencedRelation: "lab_workbenches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_bancada_troca_bancada_para_fkey"
            columns: ["bancada_para"]
            isOneToOne: false
            referencedRelation: "lab_workbenches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_bancada_troca_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_bancada_troca_exame_id_fkey"
            columns: ["exame_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_bancada_troca_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "attendance_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      exame_laudo_bancada: {
        Row: {
          ativo: boolean
          bancada_id: string
          company_id: string
          created_at: string
          exame_id: string
          id: string
          laudo_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bancada_id: string
          company_id: string
          created_at?: string
          exame_id: string
          id?: string
          laudo_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bancada_id?: string
          company_id?: string
          created_at?: string
          exame_id?: string
          id?: string
          laudo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exame_laudo_bancada_bancada_id_fkey"
            columns: ["bancada_id"]
            isOneToOne: false
            referencedRelation: "lab_workbenches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_laudo_bancada_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_laudo_bancada_exame_id_fkey"
            columns: ["exame_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exame_laudo_bancada_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "exam_laudos"
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
          estab_ambiente_h: number | null
          estab_congelado_h: number | null
          estab_refrigerado_h: number | null
          estimated_duration_minutes: number | null
          id: string
          interfacing_config: Json | null
          interfacing_parameters: Json | null
          internal_code: string | null
          is_active: boolean
          material_tubos: Json
          measurement_unit: string | null
          methodology: string | null
          name: string
          parameters: Json | null
          prazo_contagem: string
          preparation_instructions: string | null
          reference_values: Json | null
          report_observations: string | null
          report_single_page: boolean
          report_template_id: string | null
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
          estab_ambiente_h?: number | null
          estab_congelado_h?: number | null
          estab_refrigerado_h?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          interfacing_config?: Json | null
          interfacing_parameters?: Json | null
          internal_code?: string | null
          is_active?: boolean
          material_tubos?: Json
          measurement_unit?: string | null
          methodology?: string | null
          name: string
          parameters?: Json | null
          prazo_contagem?: string
          preparation_instructions?: string | null
          reference_values?: Json | null
          report_observations?: string | null
          report_single_page?: boolean
          report_template_id?: string | null
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
          estab_ambiente_h?: number | null
          estab_congelado_h?: number | null
          estab_refrigerado_h?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          interfacing_config?: Json | null
          interfacing_parameters?: Json | null
          internal_code?: string | null
          is_active?: boolean
          material_tubos?: Json
          measurement_unit?: string | null
          methodology?: string | null
          name?: string
          parameters?: Json | null
          prazo_contagem?: string
          preparation_instructions?: string | null
          reference_values?: Json | null
          report_observations?: string | null
          report_single_page?: boolean
          report_template_id?: string | null
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
          {
            foreignKeyName: "exams_report_template_id_fkey"
            columns: ["report_template_id"]
            isOneToOne: false
            referencedRelation: "lab_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      external_access_logs: {
        Row: {
          access_code: string
          access_id: string | null
          access_type: string | null
          action: string
          company_id: string | null
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          access_code: string
          access_id?: string | null
          access_type?: string | null
          action: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          access_code?: string
          access_id?: string | null
          access_type?: string | null
          action?: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "external_access_logs_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "external_accesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_accesses: {
        Row: {
          access_code: string
          access_password: string
          cnpj: string | null
          company_id: string
          created_at: string
          created_by: string | null
          crm: string | null
          doctor_id: string | null
          email: string | null
          id: string
          last_access_at: string | null
          name: string
          origin_id: string | null
          partner_origin_ids: string[]
          partner_type: string | null
          password_kind: string
          patient_id: string | null
          permissions: Json
          phone: string | null
          responsible_name: string | null
          specialty: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          access_code: string
          access_password: string
          cnpj?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          crm?: string | null
          doctor_id?: string | null
          email?: string | null
          id?: string
          last_access_at?: string | null
          name: string
          origin_id?: string | null
          partner_origin_ids?: string[]
          partner_type?: string | null
          password_kind?: string
          patient_id?: string | null
          permissions?: Json
          phone?: string | null
          responsible_name?: string | null
          specialty?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          access_password?: string
          cnpj?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm?: string | null
          doctor_id?: string | null
          email?: string | null
          id?: string
          last_access_at?: string | null
          name?: string
          origin_id?: string | null
          partner_origin_ids?: string[]
          partner_type?: string | null
          password_kind?: string
          patient_id?: string | null
          permissions?: Json
          phone?: string | null
          responsible_name?: string | null
          specialty?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_accesses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_accesses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_accesses_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_accesses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      feriado: {
        Row: {
          abrangencia: string
          company_id: string | null
          created_at: string
          data: string
          descricao: string
          id: string
          municipio: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          abrangencia?: string
          company_id?: string | null
          created_at?: string
          data: string
          descricao: string
          id?: string
          municipio?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          abrangencia?: string
          company_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          municipio?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feriado_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_sectors: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          hospital_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_sectors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      inovachat_fora_horario_cfg: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          company_id: string
          texto: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          company_id: string
          texto?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          company_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "inovachat_fora_horario_cfg_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inovachat_horario: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          company_id: string
          dias: Json
          feriados: Json
          id: string
          setor_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          company_id: string
          dias?: Json
          feriados?: Json
          id?: string
          setor_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          company_id?: string
          dias?: Json
          feriados?: Json
          id?: string
          setor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inovachat_horario_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inovachat_ignoradas: {
        Row: {
          company_id: string
          criado_em: string
          id: number
          instancia_id: string | null
          motivo: string
        }
        Insert: {
          company_id: string
          criado_em?: string
          id?: number
          instancia_id?: string | null
          motivo: string
        }
        Update: {
          company_id?: string
          criado_em?: string
          id?: number
          instancia_id?: string | null
          motivo?: string
        }
        Relationships: []
      }
      inovachat_sinais: {
        Row: {
          company_id: string
          conversa_id: string
          em: string
        }
        Insert: {
          company_id: string
          conversa_id: string
          em?: string
        }
        Update: {
          company_id?: string
          conversa_id?: string
          em?: string
        }
        Relationships: [
          {
            foreignKeyName: "inovachat_sinais_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      inpatient_bed_log: {
        Row: {
          bed_id: string
          changed_at: string
          changed_by: string | null
          company_id: string
          from_status: string | null
          id: string
          note: string | null
          request_id: string | null
          to_status: string
        }
        Insert: {
          bed_id: string
          changed_at?: string
          changed_by?: string | null
          company_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string | null
          to_status: string
        }
        Update: {
          bed_id?: string
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inpatient_bed_log_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "inpatient_beds"
            referencedColumns: ["id"]
          },
        ]
      }
      inpatient_beds: {
        Row: {
          company_id: string
          created_at: string
          current_request_id: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_request_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_request_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inpatient_beds_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "inpatient_units"
            referencedColumns: ["id"]
          },
        ]
      }
      inpatient_units: {
        Row: {
          company_id: string
          created_at: string
          hospital_id: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      instrument_events: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          equipment_id: string | null
          error_message: string | null
          event_type: string
          exam_name: string | null
          id: string
          idempotency_key: string
          order_id: string | null
          payload: Json
          protocol: string | null
          received_value: string | null
          sample_barcode: string | null
          status: string
          test_code: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          equipment_id?: string | null
          error_message?: string | null
          event_type: string
          exam_name?: string | null
          id?: string
          idempotency_key: string
          order_id?: string | null
          payload?: Json
          protocol?: string | null
          received_value?: string | null
          sample_barcode?: string | null
          status?: string
          test_code?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          equipment_id?: string | null
          error_message?: string | null
          event_type?: string
          exam_name?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string | null
          payload?: Json
          protocol?: string | null
          received_value?: string | null
          sample_barcode?: string | null
          status?: string
          test_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instrument_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_integration_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instrument_integration_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_webhooks: {
        Row: {
          company_id: string
          created_at: string
          equipment_id: string
          events: string[]
          id: string
          is_active: boolean
          last_test_at: string | null
          last_test_response: string | null
          last_test_status: number | null
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          equipment_id: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_response?: string | null
          last_test_status?: number | null
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          equipment_id?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_response?: string | null
          last_test_status?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrument_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_webhooks_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "lab_equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_oauth_clients: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          secret_hash: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          secret_hash: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          secret_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_oauth_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_allowlist: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          label: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_allowlist_company_id_fkey"
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
          source_equipment_id: string | null
          updated_at: string
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
          source_equipment_id?: string | null
          updated_at?: string
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
          source_equipment_id?: string | null
          updated_at?: string
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
          casas_decimais: number | null
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
          laudo_id: string | null
          name: string
          origin: string | null
          reference_values: string | null
          section: string | null
          sort_order: number | null
          tamanho_maximo: number | null
          type: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          allow_negative?: boolean | null
          casas_decimais?: number | null
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
          laudo_id?: string | null
          name: string
          origin?: string | null
          reference_values?: string | null
          section?: string | null
          sort_order?: number | null
          tamanho_maximo?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_negative?: boolean | null
          casas_decimais?: number | null
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
          laudo_id?: string | null
          name?: string
          origin?: string | null
          reference_values?: string | null
          section?: string | null
          sort_order?: number | null
          tamanho_maximo?: number | null
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
          {
            foreignKeyName: "lab_exam_parameters_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "exam_laudos"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_exam_reference_values: {
        Row: {
          age_max: number | null
          age_min: number | null
          age_unit: string
          company_id: string
          created_at: string | null
          description: string | null
          exam_id: string | null
          gender: string | null
          id: string
          internal_code: string | null
          is_fasting: boolean
          is_pregnant: boolean | null
          laudo_id: string | null
          max_value: string | null
          min_value: string | null
          parameter_id: string | null
          parameter_name: string | null
          sort_order: number | null
          text_range: string | null
          updated_at: string | null
          use_fasting: boolean
          value_max: string | null
          value_min: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          age_unit?: string
          company_id: string
          created_at?: string | null
          description?: string | null
          exam_id?: string | null
          gender?: string | null
          id?: string
          internal_code?: string | null
          is_fasting?: boolean
          is_pregnant?: boolean | null
          laudo_id?: string | null
          max_value?: string | null
          min_value?: string | null
          parameter_id?: string | null
          parameter_name?: string | null
          sort_order?: number | null
          text_range?: string | null
          updated_at?: string | null
          use_fasting?: boolean
          value_max?: string | null
          value_min?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          age_unit?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          exam_id?: string | null
          gender?: string | null
          id?: string
          internal_code?: string | null
          is_fasting?: boolean
          is_pregnant?: boolean | null
          laudo_id?: string | null
          max_value?: string | null
          min_value?: string | null
          parameter_id?: string | null
          parameter_name?: string | null
          sort_order?: number | null
          text_range?: string | null
          updated_at?: string | null
          use_fasting?: boolean
          value_max?: string | null
          value_min?: string | null
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
            foreignKeyName: "lab_exam_reference_values_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "exam_laudos"
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
          laudo_id: string | null
          notes: string | null
          order_id: string | null
          patient_id: string | null
          patient_name: string | null
          portal_blocked_types: string[]
          protocol: string | null
          released_at: string | null
          released_by: string | null
          retificado_em: string | null
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
          laudo_id?: string | null
          notes?: string | null
          order_id?: string | null
          patient_id?: string | null
          patient_name?: string | null
          portal_blocked_types?: string[]
          protocol?: string | null
          released_at?: string | null
          released_by?: string | null
          retificado_em?: string | null
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
          laudo_id?: string | null
          notes?: string | null
          order_id?: string | null
          patient_id?: string | null
          patient_name?: string | null
          portal_blocked_types?: string[]
          protocol?: string | null
          released_at?: string | null
          released_by?: string | null
          retificado_em?: string | null
          status?: string
          typed_at?: string | null
          typed_by?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_exam_results_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "exam_laudos"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_material: {
        Row: {
          ativo: boolean
          company_id: string
          condicao_transporte_id: string | null
          created_at: string
          descricao: string | null
          estab_ambiente_h: number | null
          estab_congelado_h: number | null
          estab_refrigerado_h: number | null
          id: string
          legado: boolean
          nome: string
          ordem: number
          recipiente_id: string | null
          sigla: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          condicao_transporte_id?: string | null
          created_at?: string
          descricao?: string | null
          estab_ambiente_h?: number | null
          estab_congelado_h?: number | null
          estab_refrigerado_h?: number | null
          id?: string
          legado?: boolean
          nome: string
          ordem?: number
          recipiente_id?: string | null
          sigla?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          condicao_transporte_id?: string | null
          created_at?: string
          descricao?: string | null
          estab_ambiente_h?: number | null
          estab_congelado_h?: number | null
          estab_refrigerado_h?: number | null
          id?: string
          legado?: boolean
          nome?: string
          ordem?: number
          recipiente_id?: string | null
          sigla?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_material_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_material_condicao_transporte_id_fkey"
            columns: ["condicao_transporte_id"]
            isOneToOne: false
            referencedRelation: "triagem_condicao_transporte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_material_recipiente_id_fkey"
            columns: ["recipiente_id"]
            isOneToOne: false
            referencedRelation: "lab_recipiente"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_methods: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_motivo_coleta: {
        Row: {
          ativo: boolean
          categoria: string | null
          company_id: string
          created_at: string
          descricao: string
          exige_justificativa: boolean
          gera_recoleta: boolean
          id: string
          ordem: number
          texto_ressalva: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          company_id: string
          created_at?: string
          descricao: string
          exige_justificativa?: boolean
          gera_recoleta?: boolean
          id?: string
          ordem?: number
          texto_ressalva?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          company_id?: string
          created_at?: string
          descricao?: string
          exige_justificativa?: boolean
          gera_recoleta?: boolean
          id?: string
          ordem?: number
          texto_ressalva?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_motivo_coleta_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_recipiente: {
        Row: {
          aditivo: string | null
          ativo: boolean
          company_id: string
          cor_hex: string | null
          cor_tampa: string | null
          created_at: string
          id: string
          nome: string
          observacao: string | null
          ordem: number
          sigla: string
          updated_at: string
          volume_ml: number | null
        }
        Insert: {
          aditivo?: string | null
          ativo?: boolean
          company_id: string
          cor_hex?: string | null
          cor_tampa?: string | null
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          ordem?: number
          sigla: string
          updated_at?: string
          volume_ml?: number | null
        }
        Update: {
          aditivo?: string | null
          ativo?: boolean
          company_id?: string
          cor_hex?: string | null
          cor_tampa?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          ordem?: number
          sigla?: string
          updated_at?: string
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_recipiente_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      lab_report_templates: {
        Row: {
          body_html: string | null
          company_id: string
          created_at: string
          description: string | null
          footer_html: string | null
          header_html: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          single_page: boolean
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          single_page?: boolean
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          footer_html?: string | null
          header_html?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          single_page?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_graphics: {
        Row: {
          company_id: string
          created_at: string
          equipment_id: string | null
          id: string
          image_base64: string
          image_format: string
          item_code: string
          label: string | null
          order_id: string | null
          protocol: string | null
          sample_barcode: string
        }
        Insert: {
          company_id: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          image_base64: string
          image_format?: string
          item_code: string
          label?: string | null
          order_id?: string | null
          protocol?: string | null
          sample_barcode: string
        }
        Update: {
          company_id?: string
          created_at?: string
          equipment_id?: string | null
          id?: string
          image_base64?: string
          image_format?: string
          item_code?: string
          label?: string | null
          order_id?: string | null
          protocol?: string | null
          sample_barcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_graphics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_graphics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "attendance_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_values: {
        Row: {
          company_id: string
          created_at: string
          flag: string | null
          id: string
          instrument_code: string | null
          laudo_id: string | null
          parameter_key: string
          parameter_name: string | null
          reference: string | null
          result_datetime: string | null
          result_id: string
          sort_order: number | null
          source: string
          status: string | null
          unit: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          flag?: string | null
          id?: string
          instrument_code?: string | null
          laudo_id?: string | null
          parameter_key: string
          parameter_name?: string | null
          reference?: string | null
          result_datetime?: string | null
          result_id: string
          sort_order?: number | null
          source?: string
          status?: string | null
          unit?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          flag?: string | null
          id?: string
          instrument_code?: string | null
          laudo_id?: string | null
          parameter_key?: string
          parameter_name?: string | null
          reference?: string | null
          result_datetime?: string | null
          result_id?: string
          sort_order?: number | null
          source?: string
          status?: string | null
          unit?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_values_laudo_id_fkey"
            columns: ["laudo_id"]
            isOneToOne: false
            referencedRelation: "exam_laudos"
            referencedColumns: ["id"]
          },
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
          label_auto_fit: boolean
          label_barcode_height_px: number
          label_config: Json | null
          label_copies: number
          label_font_code: number
          label_font_footer: number
          label_font_header: number
          label_font_patient: number
          label_font_small: number
          label_height_mm: number
          label_margin_mm: number
          label_preset: string | null
          label_rotation: number
          label_width_mm: number
          nutricao_label_config: Json | null
          phone: string | null
          prazo_contagem_padrao: string
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
          sabado_dia_util: boolean
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
          label_auto_fit?: boolean
          label_barcode_height_px?: number
          label_config?: Json | null
          label_copies?: number
          label_font_code?: number
          label_font_footer?: number
          label_font_header?: number
          label_font_patient?: number
          label_font_small?: number
          label_height_mm?: number
          label_margin_mm?: number
          label_preset?: string | null
          label_rotation?: number
          label_width_mm?: number
          nutricao_label_config?: Json | null
          phone?: string | null
          prazo_contagem_padrao?: string
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
          sabado_dia_util?: boolean
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
          label_auto_fit?: boolean
          label_barcode_height_px?: number
          label_config?: Json | null
          label_copies?: number
          label_font_code?: number
          label_font_footer?: number
          label_font_header?: number
          label_font_patient?: number
          label_font_small?: number
          label_height_mm?: number
          label_margin_mm?: number
          label_preset?: string | null
          label_rotation?: number
          label_width_mm?: number
          nutricao_label_config?: Json | null
          phone?: string | null
          prazo_contagem_padrao?: string
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
          sabado_dia_util?: boolean
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
      lab_work_maps: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          generated_at: string
          id: string
          item_keys: Json
          items_count: number
          responsible: string
          sector: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          generated_at?: string
          id?: string
          item_keys?: Json
          items_count?: number
          responsible?: string
          sector?: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          generated_at?: string
          id?: string
          item_keys?: Json
          items_count?: number
          responsible?: string
          sector?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_work_maps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_workbenches: {
        Row: {
          apoio_id: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          report_break_policy: string | null
          report_order: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          apoio_id?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          report_break_policy?: string | null
          report_order?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          apoio_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          report_break_policy?: string | null
          report_order?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_workbenches_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          company_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_identifier: string
        }
        Insert: {
          attempted_at?: string
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_identifier: string
        }
        Update: {
          attempted_at?: string
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      medication_doses: {
        Row: {
          administered_at: string | null
          administered_by: string | null
          company_id: string
          created_at: string
          dose_number: number
          id: string
          notes: string | null
          occupancy_id: string
          prescription_id: string
          prescription_item_id: string
          scheduled_at: string
        }
        Insert: {
          administered_at?: string | null
          administered_by?: string | null
          company_id: string
          created_at?: string
          dose_number: number
          id?: string
          notes?: string | null
          occupancy_id: string
          prescription_id: string
          prescription_item_id: string
          scheduled_at: string
        }
        Update: {
          administered_at?: string | null
          administered_by?: string | null
          company_id?: string
          created_at?: string
          dose_number?: number
          id?: string
          notes?: string | null
          occupancy_id?: string
          prescription_id?: string
          prescription_item_id?: string
          scheduled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_doses_occupancy_id_fkey"
            columns: ["occupancy_id"]
            isOneToOne: false
            referencedRelation: "bed_occupancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_doses_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_doses_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_evento_config: {
        Row: {
          assunto: string | null
          canal_email: boolean
          canal_sistema: boolean
          canal_sms: boolean
          company_id: string
          created_at: string
          evento: string
          id: string
          publico: string
          template: string | null
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          canal_email?: boolean
          canal_sistema?: boolean
          canal_sms?: boolean
          company_id: string
          created_at?: string
          evento: string
          id?: string
          publico: string
          template?: string | null
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          canal_email?: boolean
          canal_sistema?: boolean
          canal_sms?: boolean
          company_id?: string
          created_at?: string
          evento?: string
          id?: string
          publico?: string
          template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_evento_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacao_historico: {
        Row: {
          canal: string
          company_id: string
          conteudo: string | null
          created_at: string
          destinatario: string | null
          evento: string
          id: string
          status: string
        }
        Insert: {
          canal: string
          company_id: string
          conteudo?: string | null
          created_at?: string
          destinatario?: string | null
          evento: string
          id?: string
          status?: string
        }
        Update: {
          canal?: string
          company_id?: string
          conteudo?: string | null
          created_at?: string
          destinatario?: string | null
          evento?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacao_historico_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nutricao_dieta: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      nutricao_paciente: {
        Row: {
          admission_request_id: string
          company_id: string
          dieta_id: string | null
          observacoes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admission_request_id: string
          company_id: string
          dieta_id?: string | null
          observacoes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admission_request_id?: string
          company_id?: string
          dieta_id?: string | null
          observacoes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutricao_paciente_admission_request_id_fkey"
            columns: ["admission_request_id"]
            isOneToOne: true
            referencedRelation: "admission_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutricao_paciente_dieta_id_fkey"
            columns: ["dieta_id"]
            isOneToOne: false
            referencedRelation: "nutricao_dieta"
            referencedColumns: ["id"]
          },
        ]
      }
      nutricao_refeicao: {
        Row: {
          acompanhante: boolean
          admission_request_id: string
          company_id: string
          conferido_em: string | null
          conferido_por: string | null
          data: string
          dieta_nome: string | null
          id: string
          refeicao: string
          servido_em: string | null
          servido_por: string | null
        }
        Insert: {
          acompanhante?: boolean
          admission_request_id: string
          company_id: string
          conferido_em?: string | null
          conferido_por?: string | null
          data: string
          dieta_nome?: string | null
          id?: string
          refeicao: string
          servido_em?: string | null
          servido_por?: string | null
        }
        Update: {
          acompanhante?: boolean
          admission_request_id?: string
          company_id?: string
          conferido_em?: string | null
          conferido_por?: string | null
          data?: string
          dieta_nome?: string | null
          id?: string
          refeicao?: string
          servido_em?: string | null
          servido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutricao_refeicao_admission_request_id_fkey"
            columns: ["admission_request_id"]
            isOneToOne: false
            referencedRelation: "admission_requests"
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
          laboratorio_destino_id: string | null
          name: string
          papel_coleta: boolean
          papel_coleta_externa: boolean
          papel_hospital: boolean
          papel_laboratorio: boolean
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          establishment_id: string
          id?: string
          internal_code?: string | null
          laboratorio_destino_id?: string | null
          name: string
          papel_coleta?: boolean
          papel_coleta_externa?: boolean
          papel_hospital?: boolean
          papel_laboratorio?: boolean
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          establishment_id?: string
          id?: string
          internal_code?: string | null
          laboratorio_destino_id?: string | null
          name?: string
          papel_coleta?: boolean
          papel_coleta_externa?: boolean
          papel_hospital?: boolean
          papel_laboratorio?: boolean
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
          {
            foreignKeyName: "origins_laboratorio_destino_id_fkey"
            columns: ["laboratorio_destino_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_orders: {
        Row: {
          attendance_order_id: string | null
          client_id: string
          company_id: string
          created_at: string
          error: string | null
          id: string
          partner_id: string | null
          payload: Json
          protocolo_parceiro: string | null
          status: string
        }
        Insert: {
          attendance_order_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          partner_id?: string | null
          payload?: Json
          protocolo_parceiro?: string | null
          status?: string
        }
        Update: {
          attendance_order_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          partner_id?: string | null
          payload?: Json
          protocolo_parceiro?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_orders_attendance_order_id_fkey"
            columns: ["attendance_order_id"]
            isOneToOne: false
            referencedRelation: "attendance_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "api_partners"
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
      pharmacy_dispensations: {
        Row: {
          company_id: string
          created_at: string
          dispensed_at: string | null
          dispensed_by: string | null
          id: string
          prescription_id: string
          status: string
          urgent: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          id?: string
          prescription_id: string
          status?: string
          urgent?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          id?: string
          prescription_id?: string
          status?: string
          urgent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_dispensations_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          company_id: string
          created_at: string
          dose: string
          doses_count: number
          first_dose_at: string
          id: string
          interval_hours: number
          medication: string
          prescription_id: string
          route: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dose: string
          doses_count?: number
          first_dose_at?: string
          id?: string
          interval_hours?: number
          medication: string
          prescription_id: string
          route?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dose?: string
          doses_count?: number
          first_dose_at?: string
          id?: string
          interval_hours?: number
          medication?: string
          prescription_id?: string
          route?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          bed_id: string
          company_id: string
          created_at: string
          created_by: string | null
          doctor_name: string | null
          id: string
          notes: string | null
          occupancy_id: string
          patient_name: string
          status: string
        }
        Insert: {
          bed_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          occupancy_id: string
          patient_name: string
          status?: string
        }
        Update: {
          bed_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          occupancy_id?: string
          patient_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_occupancy_id_fkey"
            columns: ["occupancy_id"]
            isOneToOne: false
            referencedRelation: "bed_occupancies"
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
          is_admin: boolean
          must_change_password: boolean
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
          is_admin?: boolean
          must_change_password?: boolean
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
          is_admin?: boolean
          must_change_password?: boolean
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
          sector_id: string | null
          type: string
          unit_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sector_id?: string | null
          type?: string
          unit_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sector_id?: string | null
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
            foreignKeyName: "queue_guiches_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "company_sectors"
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
      sector_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          sector_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          sector_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          sector_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_users_company_id_fkey"
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
      support_board_members: {
        Row: {
          board_id: string
          can_delete: boolean
          can_edit: boolean
          can_move: boolean
          can_view: boolean
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          board_id: string
          can_delete?: boolean
          can_edit?: boolean
          can_move?: boolean
          can_view?: boolean
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          board_id?: string
          can_delete?: boolean
          can_edit?: boolean
          can_move?: boolean
          can_view?: boolean
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "support_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      support_board_stages: {
        Row: {
          board_id: string
          color: string
          company_id: string
          created_at: string
          id: string
          is_end: boolean
          is_start: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          board_id: string
          color?: string
          company_id: string
          created_at?: string
          id?: string
          is_end?: boolean
          is_start?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          board_id?: string
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          is_end?: boolean
          is_start?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_board_stages_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "support_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      support_boards: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          sector_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sector_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sector_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_boards_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "company_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_card_audit: {
        Row: {
          action: string
          actor_id: string | null
          board_id: string
          card_id: string
          company_id: string
          created_at: string
          field_id: string | null
          field_label: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          board_id: string
          card_id: string
          company_id: string
          created_at?: string
          field_id?: string | null
          field_label?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          board_id?: string
          card_id?: string
          company_id?: string
          created_at?: string
          field_id?: string | null
          field_label?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      support_card_fields: {
        Row: {
          board_id: string
          company_id: string
          created_at: string
          field_type: string
          id: string
          is_required: boolean
          label: string
          options: Json
          position: number
          show_on_card: boolean
          updated_at: string
        }
        Insert: {
          board_id: string
          company_id: string
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json
          position?: number
          show_on_card?: boolean
          updated_at?: string
        }
        Update: {
          board_id?: string
          company_id?: string
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json
          position?: number
          show_on_card?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_card_fields_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "support_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cards: {
        Row: {
          board_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          position: number
          source_order_id: string | null
          source_order_number: string | null
          source_protocol: string | null
          stage_id: string
          updated_at: string
          updated_by: string | null
          values: Json
        }
        Insert: {
          board_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          source_order_id?: string | null
          source_order_number?: string | null
          source_protocol?: string | null
          stage_id: string
          updated_at?: string
          updated_by?: string | null
          values?: Json
        }
        Update: {
          board_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          position?: number
          source_order_id?: string | null
          source_order_number?: string | null
          source_protocol?: string | null
          stage_id?: string
          updated_at?: string
          updated_by?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "support_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "support_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cards_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "support_board_stages"
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
      triage_classifications: {
        Row: {
          changed_by: string | null
          color: string
          company_id: string
          created_at: string
          entry_id: string
          id: string
          notes: string | null
          reason: string
          target_minutes: number
        }
        Insert: {
          changed_by?: string | null
          color: string
          company_id: string
          created_at?: string
          entry_id: string
          id?: string
          notes?: string | null
          reason?: string
          target_minutes: number
        }
        Update: {
          changed_by?: string | null
          color?: string
          company_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          notes?: string | null
          reason?: string
          target_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "triage_classifications_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "triage_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_entries: {
        Row: {
          arrived_at: string
          classified_at: string | null
          classified_by: string | null
          color: string | null
          company_id: string
          complaint: string | null
          created_at: string
          created_by: string | null
          destination_sector_id: string | null
          discriminators: Json
          doctor_started_at: string | null
          doctor_started_by: string | null
          flowchart: string | null
          id: string
          order_id: string | null
          patient_birth_date: string | null
          patient_cpf: string | null
          patient_id: string | null
          patient_name: string
          protocol: string | null
          sent_to_doctor_at: string | null
          source: string
          status: string
          target_minutes: number | null
          ticket_code: string | null
          ticket_id: string | null
          updated_at: string
          vitals: Json
          wristband_printed_at: string | null
        }
        Insert: {
          arrived_at?: string
          classified_at?: string | null
          classified_by?: string | null
          color?: string | null
          company_id: string
          complaint?: string | null
          created_at?: string
          created_by?: string | null
          destination_sector_id?: string | null
          discriminators?: Json
          doctor_started_at?: string | null
          doctor_started_by?: string | null
          flowchart?: string | null
          id?: string
          order_id?: string | null
          patient_birth_date?: string | null
          patient_cpf?: string | null
          patient_id?: string | null
          patient_name: string
          protocol?: string | null
          sent_to_doctor_at?: string | null
          source?: string
          status?: string
          target_minutes?: number | null
          ticket_code?: string | null
          ticket_id?: string | null
          updated_at?: string
          vitals?: Json
          wristband_printed_at?: string | null
        }
        Update: {
          arrived_at?: string
          classified_at?: string | null
          classified_by?: string | null
          color?: string | null
          company_id?: string
          complaint?: string | null
          created_at?: string
          created_by?: string | null
          destination_sector_id?: string | null
          discriminators?: Json
          doctor_started_at?: string | null
          doctor_started_by?: string | null
          flowchart?: string | null
          id?: string
          order_id?: string | null
          patient_birth_date?: string | null
          patient_cpf?: string | null
          patient_id?: string | null
          patient_name?: string
          protocol?: string | null
          sent_to_doctor_at?: string | null
          source?: string
          status?: string
          target_minutes?: number | null
          ticket_code?: string | null
          ticket_id?: string | null
          updated_at?: string
          vitals?: Json
          wristband_printed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_entries_destination_sector_id_fkey"
            columns: ["destination_sector_id"]
            isOneToOne: false
            referencedRelation: "company_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_settings: {
        Row: {
          company_id: string
          reclassification_mode: string
          updated_at: string
          wristband_height_mm: number
          wristband_width_mm: number
        }
        Insert: {
          company_id: string
          reclassification_mode?: string
          updated_at?: string
          wristband_height_mm?: number
          wristband_width_mm?: number
        }
        Update: {
          company_id?: string
          reclassification_mode?: string
          updated_at?: string
          wristband_height_mm?: number
          wristband_width_mm?: number
        }
        Relationships: []
      }
      triage_wristband_prints: {
        Row: {
          company_id: string
          created_at: string
          entry_id: string
          id: string
          is_reprint: boolean
          printed_by: string | null
          reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entry_id: string
          id?: string
          is_reprint?: boolean
          printed_by?: string | null
          reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          is_reprint?: boolean
          printed_by?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_wristband_prints_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "triage_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      triagem_condicao_transporte: {
        Row: {
          ativo: boolean
          company_id: string
          conservacao: string | null
          cor: string
          created_at: string
          icone: string
          id: string
          nome: string
          ordem: number
          temp_max: number | null
          temp_min: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          conservacao?: string | null
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          temp_max?: number | null
          temp_min?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          conservacao?: string | null
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          temp_max?: number | null
          temp_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "triagem_condicao_transporte_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      triagem_rota: {
        Row: {
          ativo: boolean
          company_id: string
          condicao_ids: string[]
          created_at: string
          destino_id: string
          dias_semana: number[]
          horarios: string[]
          id: string
          nome: string
          origem_ids: string[]
          transito_max_min: number
          transportador: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          condicao_ids?: string[]
          created_at?: string
          destino_id: string
          dias_semana?: number[]
          horarios?: string[]
          id?: string
          nome: string
          origem_ids?: string[]
          transito_max_min?: number
          transportador?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          condicao_ids?: string[]
          created_at?: string
          destino_id?: string
          dias_semana?: number[]
          horarios?: string[]
          id?: string
          nome?: string
          origem_ids?: string[]
          transito_max_min?: number
          transportador?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "triagem_rota_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triagem_rota_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_route: string | null
          category: string
          company_id: string
          created_at: string
          id: string
          message: string
          priority: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_route?: string | null
          category?: string
          company_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_route?: string | null
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_company_id_fkey"
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
      whatsapp_auditoria: {
        Row: {
          acao: string
          antes: Json | null
          company_id: string | null
          criado_em: string
          depois: Json | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          company_id?: string | null
          criado_em?: string
          depois?: Json | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          company_id?: string | null
          criado_em?: string
          depois?: Json | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_auditoria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automacoes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          company_id: string
          criado_em: string
          deslocamento_minutos: number
          expira_apos_horas: number | null
          filtro_apenas_adultos: boolean | null
          filtro_medicos: string[] | null
          filtro_primeira_vez: boolean | null
          filtro_tipos_atendimento: string[] | null
          horario_fixo: string | null
          id: string
          incluir_aviso_saida: boolean
          intervalo_minimo_dias: number | null
          meses_sem_atendimento_max: number | null
          nome: string
          ordem: number
          padrao: boolean
          prioridade: number | null
          resposta_detrator: string | null
          resposta_neutro: string | null
          resposta_promotor: string | null
          texto: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          company_id: string
          criado_em?: string
          deslocamento_minutos?: number
          expira_apos_horas?: number | null
          filtro_apenas_adultos?: boolean | null
          filtro_medicos?: string[] | null
          filtro_primeira_vez?: boolean | null
          filtro_tipos_atendimento?: string[] | null
          horario_fixo?: string | null
          id?: string
          incluir_aviso_saida?: boolean
          intervalo_minimo_dias?: number | null
          meses_sem_atendimento_max?: number | null
          nome: string
          ordem?: number
          padrao?: boolean
          prioridade?: number | null
          resposta_detrator?: string | null
          resposta_neutro?: string | null
          resposta_promotor?: string | null
          texto: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          company_id?: string
          criado_em?: string
          deslocamento_minutos?: number
          expira_apos_horas?: number | null
          filtro_apenas_adultos?: boolean | null
          filtro_medicos?: string[] | null
          filtro_primeira_vez?: boolean | null
          filtro_tipos_atendimento?: string[] | null
          horario_fixo?: string | null
          id?: string
          incluir_aviso_saida?: boolean
          intervalo_minimo_dias?: number | null
          meses_sem_atendimento_max?: number | null
          nome?: string
          ordem?: number
          padrao?: boolean
          prioridade?: number | null
          resposta_detrator?: string | null
          resposta_neutro?: string | null
          resposta_promotor?: string | null
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automacoes_auditoria: {
        Row: {
          acao: string
          automacao_id: string | null
          company_id: string
          criado_em: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          texto_anterior: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          automacao_id?: string | null
          company_id: string
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          texto_anterior?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          automacao_id?: string | null
          company_id?: string
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          texto_anterior?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automacoes_auditoria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config_empresa: {
        Row: {
          ciclo_limite_dia: number
          ciclo_limite_semana: number
          ciclo_pausado: boolean
          company_id: string
          envio_automatico_ativo: boolean
          envio_automatico_em: string | null
          envio_automatico_por: string | null
          formato_confirmacao: string
          janela_fim: string
          janela_inicio: string
          link_cadastro: string | null
          link_google: string | null
          link_indicacao: string | null
          link_questionario: string | null
          proximo_modelo: number
        }
        Insert: {
          ciclo_limite_dia?: number
          ciclo_limite_semana?: number
          ciclo_pausado?: boolean
          company_id: string
          envio_automatico_ativo?: boolean
          envio_automatico_em?: string | null
          envio_automatico_por?: string | null
          formato_confirmacao?: string
          janela_fim?: string
          janela_inicio?: string
          link_cadastro?: string | null
          link_google?: string | null
          link_indicacao?: string | null
          link_questionario?: string | null
          proximo_modelo?: number
        }
        Update: {
          ciclo_limite_dia?: number
          ciclo_limite_semana?: number
          ciclo_pausado?: boolean
          company_id?: string
          envio_automatico_ativo?: boolean
          envio_automatico_em?: string | null
          envio_automatico_por?: string | null
          formato_confirmacao?: string
          janela_fim?: string
          janela_inicio?: string
          link_cadastro?: string | null
          link_google?: string | null
          link_indicacao?: string | null
          link_questionario?: string | null
          proximo_modelo?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_empresa_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config_global: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          envio_automatico_ativo: boolean
          id: boolean
          retencao_modo: string
        }
        Insert: {
          alterado_em?: string | null
          alterado_por?: string | null
          envio_automatico_ativo?: boolean
          id?: boolean
          retencao_modo?: string
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string | null
          envio_automatico_ativo?: boolean
          id?: boolean
          retencao_modo?: string
        }
        Relationships: []
      }
      whatsapp_contatos: {
        Row: {
          atualizado_em: string
          company_id: string
          criado_em: string
          id: string
          nome_exibicao: string | null
          paciente_id: string | null
          telefone: string
          ultima_fora_horario_em: string | null
          vinculo_status: string
        }
        Insert: {
          atualizado_em?: string
          company_id: string
          criado_em?: string
          id?: string
          nome_exibicao?: string | null
          paciente_id?: string | null
          telefone: string
          ultima_fora_horario_em?: string | null
          vinculo_status?: string
        }
        Update: {
          atualizado_em?: string
          company_id?: string
          criado_em?: string
          id?: string
          nome_exibicao?: string | null
          paciente_id?: string | null
          telefone?: string
          ultima_fora_horario_em?: string | null
          vinculo_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contatos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contatos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversa_acessos: {
        Row: {
          acessado_em: string
          company_id: string
          conversa_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          acessado_em?: string
          company_id: string
          conversa_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          acessado_em?: string
          company_id?: string
          conversa_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversa_acessos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversa_acessos_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversas: {
        Row: {
          company_id: string
          contato_id: string
          criada_em: string
          finalizada_em: string | null
          fora_horario: boolean
          id: string
          instancia_id: string
          nao_lidas: number
          responsavel_id: string | null
          setor_id: string | null
          status: string
          ultima_mensagem_em: string | null
          ultima_mensagem_resumo: string | null
        }
        Insert: {
          company_id: string
          contato_id: string
          criada_em?: string
          finalizada_em?: string | null
          fora_horario?: boolean
          id?: string
          instancia_id: string
          nao_lidas?: number
          responsavel_id?: string | null
          setor_id?: string | null
          status?: string
          ultima_mensagem_em?: string | null
          ultima_mensagem_resumo?: string | null
        }
        Update: {
          company_id?: string
          contato_id?: string
          criada_em?: string
          finalizada_em?: string | null
          fora_horario?: boolean
          id?: string
          instancia_id?: string
          nao_lidas?: number
          responsavel_id?: string | null
          setor_id?: string | null
          status?: string
          ultima_mensagem_em?: string | null
          ultima_mensagem_resumo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instancias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "company_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_fila_envios: {
        Row: {
          agendada_para: string
          agendamento_id: string | null
          atualizado_em: string
          automacao_id: string | null
          ciclo_adiamentos: number
          codigo_resposta: string | null
          company_id: string
          criado_em: string
          criado_por: string | null
          enviada_em: string | null
          erro: string | null
          expira_em: string | null
          formato_envio: string | null
          horas_antes: number | null
          id: string
          instancia_id: string | null
          message_id_uazapi: string | null
          modelo_posicao: number | null
          motivo_plano_b: string | null
          nps_teste_respostas: Json | null
          paciente_id: string | null
          paciente_nome: string | null
          respondida_em: string | null
          responsavel_nome: string | null
          resposta_acao: string | null
          respostas_automaticas: number
          status: string
          telefone_destino: string
          texto_final: string
          tipo: string
        }
        Insert: {
          agendada_para?: string
          agendamento_id?: string | null
          atualizado_em?: string
          automacao_id?: string | null
          ciclo_adiamentos?: number
          codigo_resposta?: string | null
          company_id: string
          criado_em?: string
          criado_por?: string | null
          enviada_em?: string | null
          erro?: string | null
          expira_em?: string | null
          formato_envio?: string | null
          horas_antes?: number | null
          id?: string
          instancia_id?: string | null
          message_id_uazapi?: string | null
          modelo_posicao?: number | null
          motivo_plano_b?: string | null
          nps_teste_respostas?: Json | null
          paciente_id?: string | null
          paciente_nome?: string | null
          respondida_em?: string | null
          responsavel_nome?: string | null
          resposta_acao?: string | null
          respostas_automaticas?: number
          status?: string
          telefone_destino: string
          texto_final: string
          tipo: string
        }
        Update: {
          agendada_para?: string
          agendamento_id?: string | null
          atualizado_em?: string
          automacao_id?: string | null
          ciclo_adiamentos?: number
          codigo_resposta?: string | null
          company_id?: string
          criado_em?: string
          criado_por?: string | null
          enviada_em?: string | null
          erro?: string | null
          expira_em?: string | null
          formato_envio?: string | null
          horas_antes?: number | null
          id?: string
          instancia_id?: string | null
          message_id_uazapi?: string | null
          modelo_posicao?: number | null
          motivo_plano_b?: string | null
          nps_teste_respostas?: Json | null
          paciente_id?: string | null
          paciente_nome?: string | null
          respondida_em?: string | null
          responsavel_nome?: string | null
          resposta_acao?: string | null
          respostas_automaticas?: number
          status?: string
          telefone_destino?: string
          texto_final?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_fila_envios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_fila_envios_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_fila_eventos: {
        Row: {
          company_id: string
          criado_em: string
          fila_id: string
          id: number
        }
        Insert: {
          company_id: string
          criado_em?: string
          fila_id: string
          id?: number
        }
        Update: {
          company_id?: string
          criado_em?: string
          fila_id?: string
          id?: number
        }
        Relationships: []
      }
      whatsapp_instancia_segredos: {
        Row: {
          atualizado_em: string
          instancia_id: string
          token_instancia_cifrado: string
        }
        Insert: {
          atualizado_em?: string
          instancia_id: string
          token_instancia_cifrado: string
        }
        Update: {
          atualizado_em?: string
          instancia_id?: string
          token_instancia_cifrado?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instancia_segredos_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instancias: {
        Row: {
          apelido: string | null
          ativo_no_rodizio: boolean
          atualizado_em: string
          company_id: string
          conectado_em: string | null
          criado_em: string
          foto_perfil_url: string | null
          id: string
          limite_diario: number | null
          nome_instancia: string
          nome_perfil: string | null
          numero_conectado: string | null
          proximo_envio_apos: string | null
          setor_entrada_id: string | null
          status: string
          status_atualizado_em: string | null
          ultimo_envio_em: string | null
          ultimo_motivo_desconexao: string | null
        }
        Insert: {
          apelido?: string | null
          ativo_no_rodizio?: boolean
          atualizado_em?: string
          company_id: string
          conectado_em?: string | null
          criado_em?: string
          foto_perfil_url?: string | null
          id?: string
          limite_diario?: number | null
          nome_instancia: string
          nome_perfil?: string | null
          numero_conectado?: string | null
          proximo_envio_apos?: string | null
          setor_entrada_id?: string | null
          status?: string
          status_atualizado_em?: string | null
          ultimo_envio_em?: string | null
          ultimo_motivo_desconexao?: string | null
        }
        Update: {
          apelido?: string | null
          ativo_no_rodizio?: boolean
          atualizado_em?: string
          company_id?: string
          conectado_em?: string | null
          criado_em?: string
          foto_perfil_url?: string | null
          id?: string
          limite_diario?: number | null
          nome_instancia?: string
          nome_perfil?: string | null
          numero_conectado?: string | null
          proximo_envio_apos?: string | null
          setor_entrada_id?: string | null
          status?: string
          status_atualizado_em?: string | null
          ultimo_envio_em?: string | null
          ultimo_motivo_desconexao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instancias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instancias_setor_entrada_id_fkey"
            columns: ["setor_entrada_id"]
            isOneToOne: false
            referencedRelation: "company_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensagens: {
        Row: {
          citada_message_id: string | null
          company_id: string
          conversa_id: string
          criado_em: string
          direcao: string
          duracao_seg: number | null
          enviada_por_nome: string | null
          enviada_por_usuario_id: string | null
          erro: string | null
          evento_tipo: string | null
          id: string
          message_id_uazapi: string
          midia_erro: string | null
          midia_mime: string | null
          midia_nome: string | null
          midia_path: string | null
          midia_reservada_em: string | null
          midia_status: string | null
          midia_tamanho: number | null
          midia_tentativas: number
          origem: string
          status: string | null
          texto: string | null
          tipo: string
        }
        Insert: {
          citada_message_id?: string | null
          company_id: string
          conversa_id: string
          criado_em?: string
          direcao: string
          duracao_seg?: number | null
          enviada_por_nome?: string | null
          enviada_por_usuario_id?: string | null
          erro?: string | null
          evento_tipo?: string | null
          id?: string
          message_id_uazapi: string
          midia_erro?: string | null
          midia_mime?: string | null
          midia_nome?: string | null
          midia_path?: string | null
          midia_reservada_em?: string | null
          midia_status?: string | null
          midia_tamanho?: number | null
          midia_tentativas?: number
          origem: string
          status?: string | null
          texto?: string | null
          tipo?: string
        }
        Update: {
          citada_message_id?: string | null
          company_id?: string
          conversa_id?: string
          criado_em?: string
          direcao?: string
          duracao_seg?: number | null
          enviada_por_nome?: string | null
          enviada_por_usuario_id?: string | null
          erro?: string | null
          evento_tipo?: string | null
          id?: string
          message_id_uazapi?: string
          midia_erro?: string | null
          midia_mime?: string | null
          midia_nome?: string | null
          midia_path?: string | null
          midia_reservada_em?: string | null
          midia_status?: string | null
          midia_tamanho?: number | null
          midia_tentativas?: number
          origem?: string
          status?: string | null
          texto?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_modelos_mensagem: {
        Row: {
          ativo: boolean
          company_id: string
          id: string
          posicao: number
          texto: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          id?: string
          posicao: number
          texto: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          id?: string
          posicao?: number
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_modelos_mensagem_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_nps_respostas: {
        Row: {
          agendamento_id: string | null
          categoria: string
          comentario: string | null
          comentario_em: string | null
          company_id: string
          fila_id: string
          id: string
          medico_id: string | null
          medico_nome: string | null
          nota: number
          paciente_id: string | null
          paciente_nome: string | null
          respondida_em: string
          tipo_atendimento: string | null
        }
        Insert: {
          agendamento_id?: string | null
          categoria: string
          comentario?: string | null
          comentario_em?: string | null
          company_id: string
          fila_id: string
          id?: string
          medico_id?: string | null
          medico_nome?: string | null
          nota: number
          paciente_id?: string | null
          paciente_nome?: string | null
          respondida_em?: string
          tipo_atendimento?: string | null
        }
        Update: {
          agendamento_id?: string | null
          categoria?: string
          comentario?: string | null
          comentario_em?: string | null
          company_id?: string
          fila_id?: string
          id?: string
          medico_id?: string | null
          medico_nome?: string | null
          nota?: number
          paciente_id?: string | null
          paciente_nome?: string | null
          respondida_em?: string
          tipo_atendimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_nps_respostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_optout: {
        Row: {
          company_id: string
          criado_em: string
          criado_por: string | null
          id: string
          origem: string
          telefone: string
        }
        Insert: {
          company_id: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          origem: string
          telefone: string
        }
        Update: {
          company_id?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          origem?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_optout_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_respostas_rapidas: {
        Row: {
          atalho: string
          ativo: boolean
          atualizado_em: string
          company_id: string
          criado_em: string
          criado_por: string | null
          id: string
          setor_id: string | null
          texto: string
          titulo: string
        }
        Insert: {
          atalho: string
          ativo?: boolean
          atualizado_em?: string
          company_id: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          setor_id?: string | null
          texto: string
          titulo: string
        }
        Update: {
          atalho?: string
          ativo?: boolean
          atualizado_em?: string
          company_id?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          setor_id?: string | null
          texto?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_respostas_rapidas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_respostas_rapidas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "company_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_respostas_recebidas: {
        Row: {
          acao: string
          agendamento_id: string | null
          company_id: string
          criado_em: string
          fila_id: string | null
          id: string
          instancia_id: string | null
          message_id_uazapi: string
          resultado: string
          tipo_resposta: string
        }
        Insert: {
          acao: string
          agendamento_id?: string | null
          company_id: string
          criado_em?: string
          fila_id?: string | null
          id?: string
          instancia_id?: string | null
          message_id_uazapi: string
          resultado?: string
          tipo_resposta: string
        }
        Update: {
          acao?: string
          agendamento_id?: string | null
          company_id?: string
          criado_em?: string
          fila_id?: string | null
          id?: string
          instancia_id?: string | null
          message_id_uazapi?: string
          resultado?: string
          tipo_resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_respostas_recebidas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_respostas_recebidas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_fila_envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_respostas_recebidas_fila_id_fkey"
            columns: ["fila_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_fila_envios_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_respostas_recebidas_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_retencao_execucoes: {
        Row: {
          acessos: number
          company_id: string | null
          contatos: number
          conversas: number
          erro: string | null
          executada_em: string
          fila: number
          id: string
          manual: boolean
          mensagens: number
          midias: number
          modo: string
          nps_anonimizadas: number
        }
        Insert: {
          acessos?: number
          company_id?: string | null
          contatos?: number
          conversas?: number
          erro?: string | null
          executada_em?: string
          fila?: number
          id?: string
          manual?: boolean
          mensagens?: number
          midias?: number
          modo: string
          nps_anonimizadas?: number
        }
        Update: {
          acessos?: number
          company_id?: string | null
          contatos?: number
          conversas?: number
          erro?: string | null
          executada_em?: string
          fila?: number
          id?: string
          manual?: boolean
          mensagens?: number
          midias?: number
          modo?: string
          nps_anonimizadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_retencao_execucoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_solicitacoes_numero: {
        Row: {
          company_id: string
          criado_em: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          motivo_recusa: string | null
          observacao_empresa: string | null
          solicitado_por: string | null
          status: string
          valor: number
        }
        Insert: {
          company_id: string
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo_recusa?: string | null
          observacao_empresa?: string | null
          solicitado_por?: string | null
          status?: string
          valor?: number
        }
        Update: {
          company_id?: string
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo_recusa?: string | null
          observacao_empresa?: string | null
          solicitado_por?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_solicitacoes_numero_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_diagnostico: {
        Row: {
          button_or_listid: string | null
          chaves: string[]
          criado_em: string
          formato: string
          id: string
          instancia_id: string | null
          message_type: string | null
          motivo: string | null
          tamanho_texto: number | null
        }
        Insert: {
          button_or_listid?: string | null
          chaves?: string[]
          criado_em?: string
          formato: string
          id?: string
          instancia_id?: string | null
          message_type?: string | null
          motivo?: string | null
          tamanho_texto?: number | null
        }
        Update: {
          button_or_listid?: string | null
          chaves?: string[]
          criado_em?: string
          formato?: string
          id?: string
          instancia_id?: string | null
          message_type?: string | null
          motivo?: string | null
          tamanho_texto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_diagnostico_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_worker_codigos: {
        Row: {
          criado_em: string
          expira_em: string
          hash: string
          usado_em: string | null
        }
        Insert: {
          criado_em?: string
          expira_em?: string
          hash: string
          usado_em?: string | null
        }
        Update: {
          criado_em?: string
          expira_em?: string
          hash?: string
          usado_em?: string | null
        }
        Relationships: []
      }
      whatsapp_worker_execucoes: {
        Row: {
          devolvidas: number
          duracao_ms: number | null
          enviadas: number
          erro: string | null
          falhas: number
          id: string
          iniciado_em: string
          reservadas: number
        }
        Insert: {
          devolvidas?: number
          duracao_ms?: number | null
          enviadas?: number
          erro?: string | null
          falhas?: number
          id?: string
          iniciado_em?: string
          reservadas?: number
        }
        Update: {
          devolvidas?: number
          duracao_ms?: number | null
          enviadas?: number
          erro?: string | null
          falhas?: number
          id?: string
          iniciado_em?: string
          reservadas?: number
        }
        Relationships: []
      }
      whatsapp_worker_tokens: {
        Row: {
          criado_em: string
          token: string
        }
        Insert: {
          criado_em?: string
          token: string
        }
        Update: {
          criado_em?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      apoio_pedido_exame_v: {
        Row: {
          amostra_id: string | null
          apoio_id: string | null
          apoio_nome: string | null
          cod_lote_lab: number | null
          cod_ped_apoio: string | null
          codigo_apoio: string | null
          company_id: string | null
          created_at: string | null
          critico: boolean | null
          custo_previsto: number | null
          dias_em_atraso: number | null
          erro: Json | null
          exame_id: string | null
          exame_nome: string | null
          id: string | null
          info_complementar: Json | null
          modo: string | null
          paciente_nome: string | null
          patient_id: string | null
          pedido_id: string | null
          pedido_numero: string | null
          pedido_protocolo: string | null
          prazo_contagem: string | null
          prazo_previsto: string | null
          preco_ficticio: boolean | null
          recipiente_id: string | null
          remessa_id: string | null
          remessa_status: string | null
          responsavel_id: string | null
          sem_prazo_apoio: boolean | null
          sequencial: number | null
          situacao_prazo: string | null
          status: Database["public"]["Enums"]["apoio_status"] | null
          status_apoio_cod: string | null
          status_apoio_desc: string | null
          status_apoio_em: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoio_pedido_exame_apoio_id_fkey"
            columns: ["apoio_id"]
            isOneToOne: false
            referencedRelation: "apoio_laboratorio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_exame_id_fkey"
            columns: ["exame_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "attendance_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_recipiente_id_fkey"
            columns: ["recipiente_id"]
            isOneToOne: false
            referencedRelation: "apoio_recipiente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apoio_pedido_exame_remessa_id_fkey"
            columns: ["remessa_id"]
            isOneToOne: false
            referencedRelation: "apoio_remessa"
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
      whatsapp_fila_envios_v: {
        Row: {
          agendada_para: string | null
          agendamento_id: string | null
          atualizado_em: string | null
          company_id: string | null
          criado_em: string | null
          criado_por: string | null
          enviada_em: string | null
          erro: string | null
          formato_envio: string | null
          id: string | null
          instancia_id: string | null
          modelo_posicao: number | null
          motivo_plano_b: string | null
          paciente_nome: string | null
          respondida_em: string | null
          responsavel_nome: string | null
          resposta_acao: string | null
          status: string | null
          telefone_mascarado: string | null
          texto_resumo: string | null
          tipo: string | null
        }
        Insert: {
          agendada_para?: string | null
          agendamento_id?: string | null
          atualizado_em?: string | null
          company_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          enviada_em?: string | null
          erro?: string | null
          formato_envio?: string | null
          id?: string | null
          instancia_id?: string | null
          modelo_posicao?: number | null
          motivo_plano_b?: string | null
          paciente_nome?: string | null
          respondida_em?: string | null
          responsavel_nome?: string | null
          resposta_acao?: string | null
          status?: string | null
          telefone_mascarado?: never
          texto_resumo?: never
          tipo?: string | null
        }
        Update: {
          agendada_para?: string | null
          agendamento_id?: string | null
          atualizado_em?: string | null
          company_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          enviada_em?: string | null
          erro?: string | null
          formato_envio?: string | null
          id?: string | null
          instancia_id?: string | null
          modelo_posicao?: number | null
          motivo_plano_b?: string | null
          paciente_nome?: string | null
          respondida_em?: string | null
          responsavel_nome?: string | null
          resposta_acao?: string | null
          status?: string | null
          telefone_mascarado?: never
          texto_resumo?: never
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_fila_envios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_fila_envios_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_optout_v: {
        Row: {
          company_id: string | null
          criado_em: string | null
          id: string | null
          origem: string | null
          telefone_mascarado: string | null
        }
        Insert: {
          company_id?: string | null
          criado_em?: string | null
          id?: string | null
          origem?: string | null
          telefone_mascarado?: never
        }
        Update: {
          company_id?: string | null
          criado_em?: string | null
          id?: string | null
          origem?: string | null
          telefone_mascarado?: never
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_optout_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _bed_log: {
        Args: {
          _bed: string
          _from: string
          _note: string
          _occ: string
          _to: string
        }
        Returns: undefined
      }
      _inp_set: {
        Args: { _bed: string; _note: string; _req: string; _to: string }
        Returns: undefined
      }
      admission_approve: {
        Args: { _bed_id: string; _request_id: string }
        Returns: undefined
      }
      admission_cancel: { Args: { _request_id: string }; Returns: undefined }
      admission_confirm_transfer: {
        Args: { _request_id: string }
        Returns: undefined
      }
      admission_refuse: {
        Args: {
          _reason: string
          _request_id: string
          _suggested_unit_id?: string
        }
        Returns: undefined
      }
      admission_request_create: {
        Args: {
          _doctor_name?: string
          _notes?: string
          _origin_inpatient_bed_id?: string
          _origin_label?: string
          _origin_occupancy_id?: string
          _patient_id?: string
          _patient_name: string
          _reason: string
          _requested_unit_id: string
          _urgency?: string
        }
        Returns: string
      }
      admission_set_companion: {
        Args: { _request_id: string; _value: boolean }
        Returns: undefined
      }
      apoio__mascarar: { Args: { _t: string }; Returns: string }
      apoio_acao_adiar: { Args: { _id: string }; Returns: undefined }
      apoio_acao_concluir: {
        Args: { _id: string; _observacao: string }
        Returns: undefined
      }
      apoio_acao_registrar_contato: {
        Args: { _id: string; _observacao: string; _resultado: string }
        Returns: undefined
      }
      apoio_alerta_guarda: {
        Args: never
        Returns: {
          conservacao: string
          tubos: number
        }[]
      }
      apoio_alertar: {
        Args: {
          _company: string
          _evento: string
          _msg: string
          _perm: string
          _prioridade?: string
          _rota: string
          _titulo: string
        }
        Returns: number
      }
      apoio_alertas_rodar: { Args: { _resumo?: boolean }; Returns: Json }
      apoio_analise__pe: {
        Args: { _pe: string }
        Returns: {
          amostra_id: string | null
          apoio_id: string
          cod_ped_apoio: string | null
          cod_ped_lab: string | null
          codigo_apoio: string | null
          company_id: string
          created_at: string
          critico: boolean
          custo_previsto: number | null
          erro: Json | null
          exame_id: string | null
          id: string
          info_complementar: Json | null
          modo: string
          pedido_id: string
          prazo_contagem: string
          prazo_previsto: string | null
          preco_ficticio: boolean
          recipiente_id: string | null
          remessa_id: string | null
          responsavel_id: string | null
          sem_prazo_apoio: boolean
          sequencial: number
          status: Database["public"]["Enums"]["apoio_status"]
          status_apoio_cod: string | null
          status_apoio_desc: string | null
          status_apoio_em: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "apoio_pedido_exame"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apoio_analise__status: {
        Args: {
          _motivo: string
          _origem: string
          _para: Database["public"]["Enums"]["apoio_status"]
          _r: Database["public"]["Tables"]["apoio_pedido_exame"]["Row"]
        }
        Returns: undefined
      }
      apoio_analise_anexar_pdf: {
        Args: { _path: string; _pe: string }
        Returns: string
      }
      apoio_analise_ciente_retificacao: {
        Args: { _pe: string }
        Returns: undefined
      }
      apoio_analise_concluir: {
        Args: {
          _executor?: string
          _metodo?: string
          _nota?: string
          _pe: string
          _valores?: Json
        }
        Returns: Json
      }
      apoio_analise_estado: { Args: { _pedidos: string[] }; Returns: Json }
      apoio_analise_liberar: { Args: { _pe: string }; Returns: Json }
      apoio_analise_resolver_divergencia: {
        Args: { _motivo: string; _pe: string; _usar: string }
        Returns: undefined
      }
      apoio_cancelamento_registrar: {
        Args: {
          _destino: string
          _motivo: string
          _pe: string
          _resposta: string
          _resultado: string
          _usuario: string
        }
        Returns: Json
      }
      apoio_cancelar_pedido_exame: {
        Args: {
          _cancelar_no_apoio?: boolean
          _exam: string
          _motivo?: string
          _pedido: string
        }
        Returns: Json
      }
      apoio_codigo_aliquota: {
        Args: { _apoio: string; _pedido: string }
        Returns: string
      }
      apoio_conservacao_definir: {
        Args: { _conservacao: string; _recipiente: string }
        Returns: undefined
      }
      apoio_conservacao_epl: {
        Args: { _epl: string; _mapa: Json }
        Returns: Record<string, unknown>
      }
      apoio_conservacao_reprocessar: {
        Args: { _remessa: string }
        Returns: number
      }
      apoio_cursor_resolver: { Args: { _apoio: string }; Returns: undefined }
      apoio_custo_previsto: {
        Args: { _pedido_exame_id: string }
        Returns: number
      }
      apoio_depara_envios: {
        Args: { _ids: string[] }
        Returns: {
          depara_id: string
          envios: number
        }[]
      }
      apoio_depara_formatos: {
        Args: { _depara: string }
        Returns: {
          cod_exm_apoio: string
          codigo_formato: string
          mapeados: number
          metodo: string
          recente: boolean
          total: number
          ultima_liberacao: string
          unidade_produtiva: string
        }[]
      }
      apoio_depara_lista: {
        Args: never
        Returns: {
          analitos_mapeados: number
          analitos_total: number
          apoio_id: string
          apoio_nome: string
          ativo: boolean
          catalogo_ativo: boolean
          codigo_apoio: string
          conservacao: string
          descricao_apoio: string
          exame_id: string
          exige_pdf: boolean
          ficticio: boolean
          id: string
          materiais: Json
          modelo_mudou: boolean
          prazo_dias: number
          preco: number
          tem_preco: boolean
        }[]
      }
      apoio_depara_referencia: {
        Args: { _apoio_id: string; _codigo: string }
        Returns: Json
      }
      apoio_dias_uteis:
        | {
            Args: { _ate: string; _company_id: string; _de: string }
            Returns: number
          }
        | { Args: { _ate: string; _de: string }; Returns: number }
      apoio_envio_manual: {
        Args: { _itens: Json; _remessa: string }
        Returns: number
      }
      apoio_exame_atendimento: { Args: { _exam: string }; Returns: Json }
      apoio_exame_coletado: {
        Args: { _pedido_exame_id: string }
        Returns: boolean
      }
      apoio_faixas_conservacao: { Args: { _company?: string }; Returns: Json }
      apoio_impressao_pegar: {
        Args: { _empresa: string; _limite?: number }
        Returns: {
          conteudo: string
          created_at: string
          criado_por: string | null
          empresa_id: string
          enviado_em: string | null
          erro: string | null
          id: string
          impresso_em: string | null
          impressora: string | null
          referencia: string | null
          status: string
          tentativas: number
          tipo: string
          unidade_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "apoio_impressao_fila"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apoio_impressao_reenfileirar: {
        Args: { _empresa?: string }
        Returns: number
      }
      apoio_integ_status: {
        Args: {
          _dados?: Json
          _motivo?: string
          _novo: Database["public"]["Enums"]["apoio_status"]
          _pe: string
        }
        Returns: boolean
      }
      apoio_item_material: {
        Args: { _exame: string; _pedido: string }
        Returns: string
      }
      apoio_kanban_atribuir: {
        Args: { _pe: string; _usuario: string }
        Returns: undefined
      }
      apoio_kanban_comentar: {
        Args: { _pe: string; _texto: string }
        Returns: undefined
      }
      apoio_kanban_lista: {
        Args: { _desde_liberado?: string }
        Returns: {
          acao_pendente: string
          acao_pendente_id: string
          apoio_id: string
          apoio_manual: boolean
          apoio_nome: string
          cod_barras: string[]
          cod_lote_lab: string
          cod_ped_apoio: string
          codigo_apoio: string
          created_at: string
          critico: boolean
          dias_em_atraso: number
          divergente: boolean
          exame_codigo: string
          exame_id: string
          exame_nome: string
          id: string
          modo: string
          paciente_nome: string
          pedido_id: string
          pedido_numero: string
          pedido_protocolo: string
          prazo_previsto: string
          remessa_id: string
          responsavel_id: string
          responsavel_nome: string
          retificado: boolean
          situacao_prazo: string
          status: Database["public"]["Enums"]["apoio_status"]
          status_apoio_cod: string
          status_apoio_desc: string
          status_desconhecido: boolean
          tem_pdf: boolean
          tem_pendencia: boolean
          unidade_id: string
          updated_at: string
        }[]
      }
      apoio_laudo_ajustar:
        | {
            Args: {
              _depara: string
              _laudo: string
              _mapas: Json
              _modo: string
              _nome: string
              _params: Json
            }
            Returns: Json
          }
        | {
            Args: {
              _depara: string
              _extras: Json
              _laudo: string
              _mapas: Json
              _modo: string
              _nome: string
              _params: Json
            }
            Returns: Json
          }
      apoio_laudo_ajuste_cadastro: { Args: { _depara: string }; Returns: Json }
      apoio_laudo_ajuste_dados: { Args: { _depara: string }; Returns: Json }
      apoio_laudos_resumo: {
        Args: never
        Returns: {
          apoio_nome: string
          exame_id: string
          executor: string
          exige_pdf: boolean
          liberado: boolean
          pdf_path: string
          pedido_id: string
          prazo: string
          status: Database["public"]["Enums"]["apoio_status"]
        }[]
      }
      apoio_log__tipo: { Args: { _op: string; _req: string }; Returns: string }
      apoio_log_limpar: { Args: never; Returns: number }
      apoio_log_lista: {
        Args: {
          _apoio?: string
          _busca?: string
          _fim?: string
          _ini?: string
          _limite?: number
          _offset?: number
          _remessa?: string
          _situacao?: string
          _tipo?: string
        }
        Returns: {
          apoio_id: string
          apoio_nome: string
          cod_lote: string
          codigos: string[]
          created_at: string
          duracao_ms: number
          falha_interna: boolean
          http_status: number
          id: string
          login_recusado: boolean
          origem: string
          recuperado: boolean
          remessa_id: string
          remessa_numero: number
          resolvido_em: string
          resolvido_obs: string
          sem_conexao: boolean
          situacao: string
          texto_pardini: string
          timeout_s: number
          tipo: string
          total: number
          usuario_nome: string
        }[]
      }
      apoio_log_repeticoes: {
        Args: { _id: string }
        Returns: {
          desde: string
          vezes: number
        }[]
      }
      apoio_log_reprocessar: { Args: { _log: string }; Returns: undefined }
      apoio_log_resolver: {
        Args: { _id: string; _obs: string }
        Returns: undefined
      }
      apoio_log_tecnico: {
        Args: { _id: string }
        Returns: {
          duracao_ms: number
          erro: string
          http_status: number
          operacao: string
          requisicao: string
          resposta: string
        }[]
      }
      apoio_manual_buscar: {
        Args: { _apoio: string; _q: string }
        Returns: {
          cod_bar_apoio: string
          cod_lote_lab: number
          cod_ped_apoio: string
          codigo_apoio: string
          exame: string
          id: string
          order_number: string
          paciente: string
          pedido_id: string
          proximos: string[]
          remessa_id: string
          status: string
        }[]
      }
      apoio_manual_mudar_status: {
        Args: {
          _detalhamento?: string
          _disposicao?: string
          _motivo: string
          _pe: string
          _pendencia?: string
          _status: Database["public"]["Enums"]["apoio_status"]
        }
        Returns: undefined
      }
      apoio_metodos_laudo: {
        Args: { _pedidos: string[] }
        Returns: {
          codigo_formato: string
          exame_id: string
          metodo: string
          pedido_id: string
        }[]
      }
      apoio_modelos_commit: {
        Args: {
          _apoio: string
          _esperado: number
          _lote: string
          _origem?: string
        }
        Returns: Json
      }
      apoio_modulo_liberado: { Args: { _company_id: string }; Returns: boolean }
      apoio_mudar_status: {
        Args: {
          p_dados?: Json
          p_motivo?: string
          p_origem: string
          p_pedido_exame_id: string
          p_status_novo: Database["public"]["Enums"]["apoio_status"]
        }
        Returns: undefined
      }
      apoio_pdf_contar: {
        Args: { _apoio: string; _company: string }
        Returns: number
      }
      apoio_prazo_vigente: {
        Args: { _apoio_id: string; _codigo: string; _data?: string }
        Returns: number
      }
      apoio_proximo_lote: { Args: { _company: string }; Returns: number }
      apoio_proximos_status: {
        Args: { _de: Database["public"]["Enums"]["apoio_status"] }
        Returns: string[]
      }
      apoio_recoleta: {
        Args: {
          _avisar?: boolean
          _motivo: string
          _nova_data: string
          _pe: string
        }
        Returns: string
      }
      apoio_referencia_resumo: { Args: { _apoio_id: string }; Returns: Json }
      apoio_rel__base: {
        Args: { _apoio: string; _fim: string; _ini: string; _unidade: string }
        Returns: {
          apoio_id: string
          apoio_nome: string
          company_id: string
          convenio_id: string
          criado_em: string
          critico: boolean
          custo_previsto: number
          erro_transmissao: boolean
          exame_id: string
          exame_nome: string
          id: string
          liberado_em: string
          modo: string
          paciente: string
          pedido_id: string
          prazo_previsto: string
          preco_ficticio: boolean
          protocolo: string
          recoleta: boolean
          responsavel_id: string
          status: string
          transmitido_em: string
          unidade_id: string
          unidade_nome: string
        }[]
      }
      apoio_rel__checar: { Args: { _perm: string }; Returns: undefined }
      apoio_rel_atrasos: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          apoio: string
          critico: boolean
          dias_atraso: number
          etapa: string
          exame: string
          paciente: string
          pedido: string
          responsavel: string
        }[]
      }
      apoio_rel_custo: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          apoio: string
          custo_medio: number
          custo_total: number
          exame: string
          exames: number
          ficticio: boolean
          mes: string
        }[]
      }
      apoio_rel_log: {
        Args: {
          _apoio?: string
          _fim: string
          _ini: string
          _operacao?: string
          _so_erros?: boolean
          _unidade?: string
        }
        Returns: {
          apoio: string
          criado_em: string
          duracao_ms: number
          erro: string
          http_status: number
          id: string
          operacao: string
          requisicao: string
          resposta: string
        }[]
      }
      apoio_rel_margem: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          apoio: string
          cobrado_medio: number
          custo_medio: number
          exame: string
          exames: number
          ficticio: boolean
          margem_media: number
          margem_pct: number
          sem_preco: number
        }[]
      }
      apoio_rel_modo_manual: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          apoio: string
          desligado_em: string
          desligado_por: string
          exames_manuais: number
          horas: number
          ligado_em: string
          ligado_por: string
        }[]
      }
      apoio_rel_painel: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: Json
      }
      apoio_rel_pendencias: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          aberta_em: string
          apoio: string
          exame: string
          horas_ate_resolver: number
          motivo: string
          paciente: string
          pedido: string
          resolvida_em: string
          situacao: string
          tipo: string
        }[]
      }
      apoio_rel_qualificacao: {
        Args: {
          _apoio?: string
          _fim?: string
          _ini?: string
          _unidade?: string
        }
        Returns: {
          apoio: string
          dias_restantes: number
          documento: string
          numero: string
          situacao: string
          validade: string
        }[]
      }
      apoio_rel_remessas: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          apoio: string
          conferencia: string
          conferido_por: string
          criada_em: string
          entregue_a: string
          entregue_em: string
          exames: number
          lote: number
          status: string
          temperatura: string
          tubos: number
        }[]
      }
      apoio_rel_tat: {
        Args: { _apoio?: string; _fim: string; _ini: string; _unidade?: string }
        Returns: {
          apoio: string
          exame: string
          exames: number
          no_prazo_pct: number
          prometido_medio: number
          real_mediana: number
          real_medio: number
          real_p90: number
        }[]
      }
      apoio_remessa_adicionar: {
        Args: { _ids: string[]; _remessa: string }
        Returns: number
      }
      apoio_remessa_bipar: {
        Args: { _codigo: string; _remessa: string }
        Returns: Json
      }
      apoio_remessa_cancelar: { Args: { _remessa: string }; Returns: number }
      apoio_remessa_checar: { Args: { _perm?: boolean }; Returns: string }
      apoio_remessa_criar: {
        Args: {
          _apoio: string
          _ids: string[]
          _saida_prevista?: string
          _temperatura?: string
        }
        Returns: Json
      }
      apoio_remessa_disponiveis: {
        Args: { _apoio?: string }
        Returns: {
          apoio_id: string
          apoio_nome: string
          codigo_apoio: string
          criado_em: string
          exame_id: string
          exame_nome: string
          id: string
          material: string
          order_number: string
          paciente: string
          pedido_id: string
          prazo_previsto: string
          tubo: string
        }[]
      }
      apoio_remessa_entrega: {
        Args: {
          _entregue_a: string
          _entregue_em: string
          _forcar?: string
          _remessa: string
          _sacos?: Json
        }
        Returns: Json
      }
      apoio_remessa_forcar_conferencia: {
        Args: { _justificativa: string; _remessa: string }
        Returns: undefined
      }
      apoio_remessa_lista: {
        Args: never
        Returns: {
          apoio_id: string
          apoio_nome: string
          cod_lote_lab: number
          conferencia_forcada: string
          conferido_em: string
          conferir_apos_etiqueta: boolean
          created_at: string
          criado_por_nome: string
          entregue_a: string
          entregue_em: string
          exames: number
          id: string
          modo: string
          previsto: boolean
          sacos: Json
          saida_prevista: string
          separada_em: string
          status: string
          temperatura: string
          transmitido_em: string
          tubos: number
        }[]
      }
      apoio_remessa_remover: {
        Args: { _pedido_exame: string }
        Returns: undefined
      }
      apoio_remessa_renumerar: { Args: { _remessa: string }; Returns: number }
      apoio_remessa_tubos: {
        Args: { _remessa: string }
        Returns: {
          bipado: boolean
          codigo: string
          exames: string
          order_number: string
          paciente: string
          pedido_id: string
          pos_transmissao: boolean
        }[]
      }
      apoio_remover_tabela_ficticia: {
        Args: { _apoio_id: string }
        Returns: Json
      }
      apoio_resultado_conferir: {
        Args: { _versao: string }
        Returns: undefined
      }
      apoio_seed_company: { Args: { _company_id: string }; Returns: undefined }
      apoio_senha_gravar_cifrada: {
        Args: { _apoio_id: string; _chave: string; _senha: string }
        Returns: undefined
      }
      apoio_senha_ler_cifrada: {
        Args: { _apoio_id: string; _chave: string }
        Returns: string
      }
      apoio_separar_bipar: {
        Args: { _codigo: string; _remessa: string }
        Returns: Json
      }
      apoio_set_senha: {
        Args: { _apoio_id: string; _senha: string }
        Returns: undefined
      }
      apoio_tem_permissao: { Args: { _perm: string }; Returns: boolean }
      apoio_usuarios_com: {
        Args: { _company: string; _perm: string }
        Returns: string[]
      }
      apoio_valida_cod_ped: {
        Args: { _apoio: string; _cod: string }
        Returns: boolean
      }
      auditoria_lista: {
        Args: {
          _ate?: string
          _de?: string
          _limite?: number
          _modulo?: string
          _offset?: number
          _usuario?: string
        }
        Returns: {
          acao: string
          antes: Json
          created_at: string
          depois: Json
          fonte: string
          id: string
          modulo: string
          tabela: string
          total: number
          usuario_id: string
          usuario_nome: string
        }[]
      }
      auth_check_lockout: {
        Args: { _identifier: string; _ip: string }
        Returns: Json
      }
      auth_record_attempt: {
        Args: {
          _company_id?: string
          _identifier: string
          _ip: string
          _success: boolean
          _user_agent: string
        }
        Returns: Json
      }
      auth_release_lockout: { Args: { _lockout_id: string }; Returns: boolean }
      bancada_aplicar_item: {
        Args: {
          _bancada: string
          _base: string
          _ex: Json
          _exam: string
          _motivo: string
          _origem: string
        }
        Returns: Json
      }
      bancada_cancelar_apoio: {
        Args: { _exam: string; _motivo: string; _pedido: string }
        Returns: string
      }
      bancada_item_coletado: {
        Args: { _ex: Json; _order_status: string }
        Returns: boolean
      }
      bancada_item_tem_resultado: {
        Args: { _exam: string; _order: string }
        Returns: boolean
      }
      bancada_itens_exame: {
        Args: { _exam: string }
        Returns: {
          apoio_status: string
          bancada_id: string
          coletado: boolean
          criado_em: string
          ei: number
          gi: number
          order_number: string
          origem: string
          paciente: string
          pedido_id: string
        }[]
      }
      bancada_laudo: {
        Args: { _bancada: string; _exam: string }
        Returns: string
      }
      bancada_prazo: {
        Args: { _bancada: string; _de: string; _exam: string }
        Returns: Json
      }
      bancada_prontidao: {
        Args: { _bancada: string; _exam: string }
        Returns: Json
      }
      bancada_tem_laudo: {
        Args: { _bancada: string; _exam: string }
        Returns: boolean
      }
      bancada_troca_previa: {
        Args: { _bancada: string; _exam: string }
        Returns: Json
      }
      bancada_trocar_cadastro: {
        Args: { _bancada: string; _exam: string; _motivo?: string }
        Returns: Json
      }
      bancada_trocar_pontual: {
        Args: {
          _bancada: string
          _ei: number
          _gi: number
          _motivo: string
          _pedido: string
        }
        Returns: Json
      }
      bed_allocate: {
        Args: {
          _bed_id: string
          _color?: string
          _patient_id?: string
          _patient_name: string
          _triage_entry_id: string
        }
        Returns: string
      }
      bed_mark_clean: { Args: { _bed_id: string }; Returns: undefined }
      bed_refer: {
        Args: {
          _notes?: string
          _occupancy_id: string
          _sector_id?: string
          _sector_name: string
        }
        Returns: string
      }
      bed_referral_update: {
        Args: { _referral_id: string; _status: string }
        Returns: undefined
      }
      bed_release: {
        Args: { _bed_id: string; _reason: string }
        Returns: undefined
      }
      calcular_prazo: {
        Args: {
          _company_id: string
          _contagem: string
          _data_inicial: string
          _dias: number
        }
        Returns: string
      }
      can_edit_support_board: { Args: { _board_id: string }; Returns: boolean }
      can_view_support_board: { Args: { _board_id: string }; Returns: boolean }
      carregar_feriados_nacionais: { Args: { _ano: number }; Returns: number }
      company_cnpj_exists: { Args: { _cnpj: string }; Returns: boolean }
      company_id_by_cnpj: { Args: { _cnpj: string }; Returns: string }
      contar_dias_prazo: {
        Args: {
          _ate: string
          _company_id: string
          _contagem: string
          _de: string
        }
        Returns: number
      }
      crm__evento: {
        Args: {
          _company: string
          _de: string
          _lead: string
          _para: string
          _texto?: string
          _tipo: string
        }
        Returns: undefined
      }
      crm__gestor: { Args: never; Returns: string }
      crm__lead_editavel: {
        Args: { _lead: string }
        Returns: {
          atualizado_em: string
          company_id: string
          contato_id: string
          convertido_em: string | null
          criado_em: string
          criado_por: string | null
          etapa_atualizada_em: string
          etapa_id: string
          fechado_em: string | null
          id: string
          interesse: string | null
          motivo_perda_id: string | null
          motivo_perda_texto: string | null
          nome: string
          origem: string
          paciente_id: string | null
          primeira_resposta_em: string | null
          proximo_contato_em: string | null
          responsavel_id: string | null
          temperatura: string
          temperatura_origem: string
          temperatura_regra: string | null
          temperatura_travada_ate: string | null
          valor_estimado: number | null
        }
        SetofOptions: {
          from: "*"
          to: "crm_leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm__pode_editar: {
        Args: { l: Database["public"]["Tables"]["crm_leads"]["Row"] }
        Returns: boolean
      }
      crm__resp_valido: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      crm__sinal: { Args: { _company: string }; Returns: undefined }
      crm__tags_definir: {
        Args: {
          _tags: string[]
          l: Database["public"]["Tables"]["crm_leads"]["Row"]
        }
        Returns: undefined
      }
      crm__validar_funil: { Args: { _company: string }; Returns: undefined }
      crm_ativo: { Args: { _company: string }; Returns: boolean }
      crm_buscar_paciente: { Args: { p_q: string }; Returns: Json }
      crm_config_salvar: { Args: { p: Json }; Returns: undefined }
      crm_etapa_12b_salvar: {
        Args: {
          p_automacao?: string
          p_cor: string
          p_id: string
          p_inicial: boolean
          p_nome: string
          p_tipo: string
        }
        Returns: string
      }
      crm_etapa_desativar: {
        Args: { p_destino?: string; p_id: string }
        Returns: number
      }
      crm_etapa_salvar: {
        Args: {
          p_cor: string
          p_id: string
          p_inicial: boolean
          p_nome: string
          p_tipo: string
        }
        Returns: string
      }
      crm_etapas_ordenar: { Args: { p_ids: string[] }; Returns: undefined }
      crm_evoluir: {
        Args: { p_evento: string; p_lead: string }
        Returns: undefined
      }
      crm_funil_restaurar: { Args: never; Returns: undefined }
      crm_lead_conversa: { Args: { p_lead: string }; Returns: Json }
      crm_lead_criar: { Args: { p: Json }; Returns: string }
      crm_lead_editar: { Args: { p: Json; p_lead: string }; Returns: undefined }
      crm_lead_excluir: { Args: { p_lead: string }; Returns: undefined }
      crm_lead_historico: { Args: { p_lead: string }; Returns: Json }
      crm_lead_mover: {
        Args: {
          p_etapa: string
          p_lead: string
          p_motivo?: string
          p_motivo_texto?: string
        }
        Returns: undefined
      }
      crm_lead_nota: {
        Args: { p_lead: string; p_texto: string }
        Returns: undefined
      }
      crm_lead_reabrir: { Args: { p_lead: string }; Returns: undefined }
      crm_lead_vincular_paciente: {
        Args: { p_lead: string; p_paciente: string }
        Returns: undefined
      }
      crm_liberar: {
        Args: { _company: string; _habilitado: boolean }
        Returns: undefined
      }
      crm_meu_acesso: { Args: never; Returns: Json }
      crm_motivo_salvar: {
        Args: { p_ativo: boolean; p_id: string; p_nome: string }
        Returns: string
      }
      crm_normalizar: { Args: { t: string }; Returns: string }
      crm_notificar: {
        Args: {
          l: Database["public"]["Tables"]["crm_leads"]["Row"]
          p_tipo: string
        }
        Returns: number
      }
      crm_padrao: { Args: { _company: string }; Returns: undefined }
      crm_palavra_quente: {
        Args: { palavras: string[]; t: string }
        Returns: string
      }
      crm_pode_ver: { Args: { _company: string }; Returns: boolean }
      crm_quadro: { Args: never; Returns: Json }
      crm_resultados: {
        Args: {
          p_ate: string
          p_desde: string
          p_origem?: string
          p_responsavel?: string
        }
        Returns: Json
      }
      crm_retorno: {
        Args: { p_data?: string; p_dias?: number; p_lead: string }
        Returns: undefined
      }
      crm_retornos_rodar: { Args: never; Returns: number }
      crm_silencio_rodar: { Args: never; Returns: number }
      crm_tag_salvar: {
        Args: { p_ativa: boolean; p_cor: string; p_id: string; p_nome: string }
        Returns: string
      }
      crm_tem_permissao: { Args: { _perm: string }; Returns: boolean }
      crm_temperatura_aplicar: {
        Args: {
          p_forcar?: boolean
          p_lead: string
          p_regra: string
          p_temp: string
        }
        Returns: undefined
      }
      crm_usuario_tem: {
        Args: { c: string; p: string; u: string }
        Returns: boolean
      }
      crm_voltar_automatico: { Args: { p_lead: string }; Returns: undefined }
      data_pascoa: { Args: { _ano: number }; Returns: string }
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
      dose_administer: {
        Args: { _dose_id: string; _notes?: string }
        Returns: undefined
      }
      eh_dia_util: {
        Args: { _company_id: string; _d: string }
        Returns: boolean
      }
      exame_destino: {
        Args: { _bancada_id?: string; _exam_id: string }
        Returns: Json
      }
      generate_external_access_code: { Args: never; Returns: string }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_company_access_defaults: {
        Args: { _company_id: string }
        Returns: undefined
      }
      inovachat__conv: {
        Args: { p_conversa: string }
        Returns: {
          company_id: string
          contato_id: string
          criada_em: string
          finalizada_em: string | null
          fora_horario: boolean
          id: string
          instancia_id: string
          nao_lidas: number
          responsavel_id: string | null
          setor_id: string | null
          status: string
          ultima_mensagem_em: string | null
          ultima_mensagem_resumo: string | null
        }
        SetofOptions: {
          from: "*"
          to: "whatsapp_conversas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      inovachat_abrir: { Args: { p_conversa: string }; Returns: undefined }
      inovachat_assumir: { Args: { p_conversa: string }; Returns: undefined }
      inovachat_atendentes: {
        Args: never
        Returns: {
          id: string
          nome: string
        }[]
      }
      inovachat_ativo: { Args: { _company: string }; Returns: boolean }
      inovachat_avisar_setor: { Args: { _conv: string }; Returns: undefined }
      inovachat_evento: {
        Args: { _conv: string; _texto: string; _tipo?: string; _user?: string }
        Returns: undefined
      }
      inovachat_excluir_contato_executar: {
        Args: { p_contato: string; p_midias: number; p_usuario: string }
        Returns: Json
      }
      inovachat_excluir_contato_preparar: {
        Args: { p_contato: string; p_telefone: string }
        Returns: Json
      }
      inovachat_finalizar: { Args: { p_conversa: string }; Returns: undefined }
      inovachat_fora_horario_avaliar: {
        Args: {
          p_eh_confirmacao: boolean
          p_instancia: string
          p_telefone: string
        }
        Returns: Json
      }
      inovachat_fora_horario_padrao: { Args: never; Returns: string }
      inovachat_fora_horario_salvar: {
        Args: { p_ativo: boolean; p_texto: string }
        Returns: undefined
      }
      inovachat_gravar_envio: {
        Args: {
          p_conversa: string
          p_erro: string
          p_message_id: string
          p_nome: string
          p_status: string
          p_substituir: string
          p_texto: string
          p_usuario: string
        }
        Returns: string
      }
      inovachat_gravar_envio_midia: {
        Args: {
          p_arquivo: string
          p_conversa: string
          p_duracao: number
          p_erro: string
          p_message_id: string
          p_mime: string
          p_nome: string
          p_path: string
          p_status: string
          p_substituir: string
          p_tamanho: number
          p_texto: string
          p_tipo: string
          p_usuario: string
        }
        Returns: string
      }
      inovachat_horario_aberto: {
        Args: { _company: string; _setor: string; _ts: string }
        Returns: boolean
      }
      inovachat_horario_salvar: {
        Args: {
          p_ativo: boolean
          p_dias: Json
          p_feriados: Json
          p_setor: string
        }
        Returns: undefined
      }
      inovachat_horario_texto: { Args: { _dias: Json }; Returns: string }
      inovachat_horario_vigente: {
        Args: { _company: string; _setor: string }
        Returns: Json
      }
      inovachat_ignorar: {
        Args: { p_instancia: string; p_motivo: string }
        Returns: undefined
      }
      inovachat_liberar: {
        Args: { _company: string; _habilitado: boolean; _retencao: number }
        Returns: undefined
      }
      inovachat_meu_acesso: { Args: never; Returns: Json }
      inovachat_midia_acesso: { Args: { p_mensagem: string }; Returns: Json }
      inovachat_midia_marcar: {
        Args: {
          p_duracao: number
          p_instancia: string
          p_message_id: string
          p_mime: string
          p_nome: string
          p_status: string
          p_tamanho: number
        }
        Returns: undefined
      }
      inovachat_midia_reservar: {
        Args: { p_limite?: number }
        Returns: {
          company_id: string
          conversa_id: string
          id: string
          instancia_id: string
          message_id_uazapi: string
          midia_mime: string
          midia_nome: string
          tentativas: number
          tipo: string
        }[]
      }
      inovachat_midia_tick: {
        Args: { p_apikey: string; p_url: string }
        Returns: string
      }
      inovachat_nome_usuario: { Args: { _user: string }; Returns: string }
      inovachat_nomes: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
          nome: string
        }[]
      }
      inovachat_nps_ultima: { Args: { p_contato: string }; Returns: Json }
      inovachat_optout_definir: {
        Args: { p_bloquear: boolean; p_contato: string }
        Returns: string
      }
      inovachat_optout_estado: { Args: { p_contato: string }; Returns: Json }
      inovachat_pode_enviar: { Args: { p_conversa: string }; Returns: string }
      inovachat_pode_ver:
        | {
            Args: { _company: string; _resp: string; _status: string }
            Returns: boolean
          }
        | {
            Args: {
              _company: string
              _resp: string
              _setor: string
              _status: string
            }
            Returns: boolean
          }
      inovachat_pode_ver_u: {
        Args: {
          _company: string
          _resp: string
          _setor: string
          _status: string
          _user: string
        }
        Returns: boolean
      }
      inovachat_preparar_envio: { Args: { p_conversa: string }; Returns: Json }
      inovachat_reabrir: { Args: { p_conversa: string }; Returns: undefined }
      inovachat_registrar: {
        Args: {
          p_citada: string
          p_criado_em: string
          p_direcao: string
          p_enviada_por_nome: string
          p_instancia: string
          p_message_id: string
          p_nome: string
          p_origem: string
          p_status: string
          p_telefone: string
          p_texto: string
          p_tipo: string
        }
        Returns: string
      }
      inovachat_respostas_padrao: {
        Args: { _company: string }
        Returns: undefined
      }
      inovachat_resumo_24h: { Args: { _company: string }; Returns: Json }
      inovachat_retencao_apagar_msgs: {
        Args: { p_company: string; p_ids: string[] }
        Returns: number
      }
      inovachat_retencao_contar: { Args: { p_company: string }; Returns: Json }
      inovachat_retencao_corte: { Args: { _company: string }; Returns: string }
      inovachat_retencao_limpar: { Args: { p_company: string }; Returns: Json }
      inovachat_retencao_midias: {
        Args: { p_company: string; p_limite?: number }
        Returns: {
          id: string
          path: string
        }[]
      }
      inovachat_retencao_tick: {
        Args: { p_apikey: string; p_url: string }
        Returns: string
      }
      inovachat_sinal: { Args: { _conv: string }; Returns: undefined }
      inovachat_status: {
        Args: { p_ids: string[]; p_instancia: string; p_status: string }
        Returns: undefined
      }
      inovachat_tem_permissao: { Args: { _perm: string }; Returns: boolean }
      inovachat_transferir: {
        Args: {
          p_conversa: string
          p_nota: string
          p_setor: string
          p_usuario: string
        }
        Returns: undefined
      }
      inovachat_usuario_tem: {
        Args: { _perm: string; _user: string }
        Returns: boolean
      }
      inovachat_vincular: {
        Args: { p_contato: string; p_paciente: string }
        Returns: undefined
      }
      inpatient_discharge: { Args: { _bed_id: string }; Returns: undefined }
      inpatient_mark_clean: { Args: { _bed_id: string }; Returns: undefined }
      internacao_tem_permissao: { Args: { _acao: string }; Returns: boolean }
      is_company_manager: { Args: { _user_id: string }; Returns: boolean }
      lab_coleta_corrigir_horario: {
        Args: {
          _exame_ids: string[]
          _justificativa: string
          _novo: string
          _pedido: string
        }
        Returns: number
      }
      lab_coleta_registrar: {
        Args: { _detalhes: Json; _pedido: string }
        Returns: undefined
      }
      lab_equipments_master_company: { Args: never; Returns: string }
      lab_materiais_seed: { Args: { _company: string }; Returns: undefined }
      lab_materiais_uso: {
        Args: never
        Returns: {
          exames: number
          material_id: string
        }[]
      }
      lab_norm: { Args: { t: string }; Returns: string }
      next_attendance_order_number: {
        Args: { _company_id: string; _origin_code: string; _origin_id: string }
        Returns: string
      }
      notificar_paciente_recoleta: {
        Args: { _motivo: string; _pe: string }
        Returns: string
      }
      nutricao_marcar: {
        Args: {
          _data: string
          _etapa: string
          _refeicao: string
          _request_id: string
          _valor: boolean
        }
        Returns: undefined
      }
      nutricao_tem_permissao: { Args: { _acao: string }; Returns: boolean }
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
      perm_modulo: { Args: { _acao: string; _mod: string }; Returns: boolean }
      pharmacy_dispense: {
        Args: { _dispensation_id: string }
        Returns: undefined
      }
      portal_fetch: {
        Args: { p_code: string; p_password: string }
        Returns: Json
      }
      portal_fetch_laudo: {
        Args: { p_code: string; p_exam_id: string; p_password: string }
        Returns: Json
      }
      portal_log_attempt: {
        Args: { p_action?: string; p_code: string; p_success: boolean }
        Returns: undefined
      }
      prescription_create: {
        Args: {
          _doctor_name: string
          _items: Json
          _notes: string
          _occupancy_id: string
          _urgent?: boolean
        }
        Returns: string
      }
      somar_dias_uteis: {
        Args: { _company_id: string; _data_inicial: string; _dias: number }
        Returns: string
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
      triagem__semear: { Args: { _company: string }; Returns: undefined }
      triagem_semear_padroes: { Args: never; Returns: undefined }
      triagem_tem_permissao: { Args: { _perm: string }; Returns: boolean }
      whatsapp__ciclo_um: {
        Args: { p_ag: string; p_base: string; p_tipo: string }
        Returns: string
      }
      whatsapp__nps_avisar: {
        Args: {
          p_company: string
          p_msg: string
          p_tel: string
          p_titulo: string
        }
        Returns: undefined
      }
      whatsapp__regra_aplicavel: {
        Args: {
          p_company: string
          p_medico: string
          p_primeira: boolean
          p_tipo: string
          p_tipo_at: string
        }
        Returns: string
      }
      whatsapp_aniversario_rodar: { Args: { p_hoje?: string }; Returns: number }
      whatsapp_automacao_categoria: {
        Args: { p_tipo: string }
        Returns: string
      }
      whatsapp_automacao_link_faltando: {
        Args: { p_company: string; p_texto: string }
        Returns: string
      }
      whatsapp_automacao_padrao: { Args: { p_tipo: string }; Returns: Json }
      whatsapp_automacao_prioridade: {
        Args: { p_tipo: string }
        Returns: number
      }
      whatsapp_automacao_restaurar: { Args: { p_id: string }; Returns: string }
      whatsapp_automacoes_criar_padrao: {
        Args: { p_company: string }
        Returns: undefined
      }
      whatsapp_cabecalho: {
        Args: { p_corpo: string; p_responsavel: string }
        Returns: string
      }
      whatsapp_cancelar_envios_agendamento: {
        Args: { p_agendamento_id: string }
        Returns: Json
      }
      whatsapp_ciclo_config: {
        Args: {
          p_limite_dia?: number
          p_limite_semana?: number
          p_pausado?: boolean
        }
        Returns: Json
      }
      whatsapp_criar_modelos_padrao: {
        Args: { _company: string }
        Returns: undefined
      }
      whatsapp_decidir_solicitacao: {
        Args: { _aprovar: boolean; _id: string; _motivo?: string }
        Returns: undefined
      }
      whatsapp_definir_valor: { Args: { _valor: number }; Returns: undefined }
      whatsapp_destinatarios_agenda: {
        Args: { p_company: string }
        Returns: string[]
      }
      whatsapp_enfileirar_ciclo: {
        Args: { p_agendamento_id: string; p_evento: string }
        Returns: Json
      }
      whatsapp_enfileirar_confirmacao: {
        Args: {
          p_agendamento_id: string
          p_data_envio: string
          p_horas_antes: number
        }
        Returns: Json
      }
      whatsapp_envio_auto_obter: { Args: never; Returns: boolean }
      whatsapp_envio_auto_salvar: { Args: { p_ativo: boolean }; Returns: Json }
      whatsapp_envio_global_definir: {
        Args: { p_ativo: boolean }
        Returns: Json
      }
      whatsapp_envio_global_status: { Args: never; Returns: Json }
      whatsapp_fila_cancelar: { Args: { p_id: string }; Returns: string }
      whatsapp_fila_numeros: {
        Args: never
        Returns: {
          apelido: string
          enviadas_hoje: number
          instancia_id: string
          limite_diario: number
        }[]
      }
      whatsapp_fila_reagendar: {
        Args: { p_id: string; p_quando: string }
        Returns: string
      }
      whatsapp_fila_reenviar: { Args: { p_id: string }; Returns: string }
      whatsapp_fila_texto: { Args: { p_id: string }; Returns: string }
      whatsapp_formato_salvar: {
        Args: { p_formato: string }
        Returns: undefined
      }
      whatsapp_gerar_codigo_resposta: { Args: never; Returns: string }
      whatsapp_janela_obter: { Args: never; Returns: Json }
      whatsapp_janela_salvar: {
        Args: { p_fim: string; p_inicio: string }
        Returns: Json
      }
      whatsapp_liberar: {
        Args: { _company: string; _habilitado: boolean; _numeros: number }
        Returns: undefined
      }
      whatsapp_limpar_nome: { Args: { p: string }; Returns: string }
      whatsapp_links_config: { Args: { p_links?: Json }; Returns: Json }
      whatsapp_modelo_padrao: { Args: { p_posicao: number }; Returns: string }
      whatsapp_modelo_salvar: {
        Args: { p_ativo: boolean; p_id: string; p_texto: string }
        Returns: undefined
      }
      whatsapp_nome_responsavel: {
        Args: { p_company: string; p_user: string }
        Returns: string
      }
      whatsapp_normalizar_celular: { Args: { p: string }; Returns: string }
      whatsapp_nps_conversa: { Args: { p_nps: string }; Returns: Json }
      whatsapp_nps_processar: {
        Args: {
          p_instancia: string
          p_pode_comentar?: boolean
          p_quoted: string
          p_telefone: string
          p_texto: string
        }
        Returns: Json
      }
      whatsapp_nps_teste_processar: {
        Args: {
          p_instancia: string
          p_quoted: string
          p_telefone: string
          p_texto: string
        }
        Returns: Json
      }
      whatsapp_optout_processar: {
        Args: { p_acao: string; p_instancia: string; p_telefone: string }
        Returns: Json
      }
      whatsapp_optout_tem: {
        Args: { p_company: string; p_tel: string }
        Returns: boolean
      }
      whatsapp_reenfileirar_confirmacao: {
        Args: { p_agendamento_id: string }
        Returns: Json
      }
      whatsapp_render_links: {
        Args: { p_company: string; p_texto: string }
        Returns: string
      }
      whatsapp_render_modelo:
        | {
            Args: {
              p_data_hora: string
              p_medico: string
              p_paciente: string
              p_primeira_vez: boolean
              p_texto: string
              p_tipo: string
            }
            Returns: string
          }
        | {
            Args: {
              p_data_hora: string
              p_medico: string
              p_paciente: string
              p_primeira_vez: boolean
              p_responsavel: string
              p_texto: string
              p_tipo: string
            }
            Returns: string
          }
      whatsapp_reservar_envios: {
        Args: never
        Returns: {
          fila_id: string
          instancia_id: string
          telefone_destino: string
          texto_final: string
        }[]
      }
      whatsapp_resposta_padrao: { Args: { p_tipo: string }; Returns: string }
      whatsapp_resposta_processar: {
        Args: {
          p_acao: string
          p_codigo: string
          p_instancia: string
          p_message_id: string
          p_quoted: string
          p_telefone: string
          p_tipo_resposta: string
        }
        Returns: Json
      }
      whatsapp_retencao_definir_modo: {
        Args: { p_confirmacao: string; p_modo: string }
        Returns: undefined
      }
      whatsapp_retencao_modo: { Args: never; Returns: string }
      whatsapp_tel_canonico: { Args: { p: string }; Returns: string }
      whatsapp_tem_permissao: { Args: { _perm: string }; Returns: boolean }
      whatsapp_valor_numero: { Args: never; Returns: number }
      whatsapp_worker_consumir_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      whatsapp_worker_disparar: {
        Args: { p_apikey: string; p_url: string }
        Returns: number
      }
      whatsapp_worker_tick: {
        Args: { p_apikey: string; p_url: string }
        Returns: string
      }
    }
    Enums: {
      apoio_status:
        | "aguardando_remessa"
        | "em_remessa"
        | "transmitido"
        | "recebido_apoio"
        | "em_analise"
        | "pendencia_tecnica"
        | "nova_coleta"
        | "liberado_apoio"
        | "importado"
        | "importado_com_pendencia"
        | "liberado_local"
        | "cancelado"
        | "erro_transmissao"
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
    Enums: {
      apoio_status: [
        "aguardando_remessa",
        "em_remessa",
        "transmitido",
        "recebido_apoio",
        "em_analise",
        "pendencia_tecnica",
        "nova_coleta",
        "liberado_apoio",
        "importado",
        "importado_com_pendencia",
        "liberado_local",
        "cancelado",
        "erro_transmissao",
      ],
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
