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
          descricao: string
          id: string
          observacao: string | null
          pedido_exame_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          criada_por?: string | null
          descricao: string
          id?: string
          observacao?: string | null
          pedido_exame_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          criada_por?: string | null
          descricao?: string
          id?: string
          observacao?: string | null
          pedido_exame_id?: string
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
          operacao: string
          requisicao: string | null
          resposta: string | null
          updated_at: string
        }
        Insert: {
          apoio_id?: string | null
          company_id: string
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          http_status?: number | null
          id?: string
          operacao: string
          requisicao?: string | null
          resposta?: string | null
          updated_at?: string
        }
        Update: {
          apoio_id?: string | null
          company_id?: string
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          http_status?: number | null
          id?: string
          operacao?: string
          requisicao?: string | null
          resposta?: string | null
          updated_at?: string
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
      apoio_cursor: {
        Row: {
          apoio_id: string
          ate: string | null
          company_id: string
          created_at: string
          rotina: string
          ultima_execucao: string | null
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          apoio_id: string
          ate?: string | null
          company_id: string
          created_at?: string
          rotina: string
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          apoio_id?: string
          ate?: string | null
          company_id?: string
          created_at?: string
          rotina?: string
          ultima_execucao?: string | null
          ultimo_erro?: string | null
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
          ambiente: string
          ativo: boolean
          cnpj: string | null
          cod_lab: string | null
          company_id: string
          conector: string
          conferir_apos_etiqueta: boolean
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          dias_transporte: number
          endpoint_url: string | null
          guardar_pdf_sempre: boolean
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
          senha_secret_id: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          cnpj?: string | null
          cod_lab?: string | null
          company_id: string
          conector?: string
          conferir_apos_etiqueta?: boolean
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          dias_transporte?: number
          endpoint_url?: string | null
          guardar_pdf_sempre?: boolean
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
          senha_secret_id?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          cnpj?: string | null
          cod_lab?: string | null
          company_id?: string
          conector?: string
          conferir_apos_etiqueta?: boolean
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          dias_transporte?: number
          endpoint_url?: string | null
          guardar_pdf_sempre?: boolean
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
      apoio_pedido_exame: {
        Row: {
          amostra_id: string | null
          apoio_id: string
          cod_ped_apoio: string | null
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
          created_at: string
          etiqueta_epl: string | null
          id: string
          impressoes: number
          remessa_id: string
          updated_at: string
        }
        Insert: {
          bipado?: boolean
          bipado_em?: string | null
          cancelado?: boolean
          cod_bar_apoio?: string | null
          cod_ped_apoio?: string | null
          company_id: string
          created_at?: string
          etiqueta_epl?: string | null
          id?: string
          impressoes?: number
          remessa_id: string
          updated_at?: string
        }
        Update: {
          bipado?: boolean
          bipado_em?: string | null
          cancelado?: boolean
          cod_bar_apoio?: string | null
          cod_ped_apoio?: string | null
          company_id?: string
          created_at?: string
          etiqueta_epl?: string | null
          id?: string
          impressoes?: number
          remessa_id?: string
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
          company_id: string
          conferencia_forcada: string | null
          conferido_em: string | null
          conferido_por: string | null
          created_at: string
          criado_por: string | null
          entregue_a: string | null
          entregue_em: string | null
          entregue_registrado_por: string | null
          id: string
          mensagem_id: string | null
          modo: string
          observacao: string | null
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
          company_id: string
          conferencia_forcada?: string | null
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          criado_por?: string | null
          entregue_a?: string | null
          entregue_em?: string | null
          entregue_registrado_por?: string | null
          id?: string
          mensagem_id?: string | null
          modo?: string
          observacao?: string | null
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
          company_id?: string
          conferencia_forcada?: string | null
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          criado_por?: string | null
          entregue_a?: string | null
          entregue_em?: string | null
          entregue_registrado_por?: string | null
          id?: string
          mensagem_id?: string | null
          modo?: string
          observacao?: string | null
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
          email: string | null
          estado: string | null
          id: string
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
          email?: string | null
          estado?: string | null
          id?: string
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
          email?: string | null
          estado?: string | null
          id?: string
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
          laudo_id?: string | null
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
          laudo_id?: string | null
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
          discriminators: Json
          flowchart: string | null
          id: string
          order_id: string | null
          patient_birth_date: string | null
          patient_cpf: string | null
          patient_id: string | null
          patient_name: string
          protocol: string | null
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
          discriminators?: Json
          flowchart?: string | null
          id?: string
          order_id?: string | null
          patient_birth_date?: string | null
          patient_cpf?: string | null
          patient_id?: string | null
          patient_name: string
          protocol?: string | null
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
          discriminators?: Json
          flowchart?: string | null
          id?: string
          order_id?: string | null
          patient_birth_date?: string | null
          patient_cpf?: string | null
          patient_id?: string | null
          patient_name?: string
          protocol?: string | null
          source?: string
          status?: string
          target_minutes?: number | null
          ticket_code?: string | null
          ticket_id?: string | null
          updated_at?: string
          vitals?: Json
          wristband_printed_at?: string | null
        }
        Relationships: []
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
    }
    Functions: {
      apoio_acao_concluir: {
        Args: { _id: string; _observacao: string }
        Returns: undefined
      }
      apoio_analise__pe: {
        Args: { _pe: string }
        Returns: {
          amostra_id: string | null
          apoio_id: string
          cod_ped_apoio: string | null
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
      apoio_prazo_vigente: {
        Args: { _apoio_id: string; _codigo: string; _data?: string }
        Returns: number
      }
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
        Args: { _apoio: string; _ids: string[]; _temperatura: string }
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
        Args: { _entregue_a: string; _entregue_em: string; _remessa: string }
        Returns: undefined
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
      apoio_set_senha: {
        Args: { _apoio_id: string; _senha: string }
        Returns: undefined
      }
      apoio_tem_permissao: { Args: { _perm: string }; Returns: boolean }
      apoio_valida_cod_ped: {
        Args: { _apoio: string; _cod: string }
        Returns: boolean
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
      is_company_manager: { Args: { _user_id: string }; Returns: boolean }
      lab_equipments_master_company: { Args: never; Returns: string }
      next_attendance_order_number: {
        Args: { _company_id: string; _origin_code: string; _origin_id: string }
        Returns: string
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
