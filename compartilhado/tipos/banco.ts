// Gerado por scripts/gerar-tipos.mjs. Não editar à mão.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          acao: string
          ator: string | null
          criado_em: string
          entidade: string
          entidade_id: string | null
          id: number
          mudancas: Json
        }
        Insert: {
          acao: string
          ator?: string | null
          criado_em?: string
          entidade: string
          entidade_id?: string | null
          id?: never
          mudancas?: Json
        }
        Update: {
          acao?: string
          ator?: string | null
          criado_em?: string
          entidade?: string
          entidade_id?: string | null
          id?: never
          mudancas?: Json
        }
        Relationships: []
      }
      cliques_whatsapp_dia: {
        Row: {
          cliques: number
          dia: string
          id: number
          loja_id: number | null
          origem: string
          veiculo_id: string | null
        }
        Insert: {
          cliques?: number
          dia: string
          id?: never
          loja_id?: number | null
          origem: string
          veiculo_id?: string | null
        }
        Update: {
          cliques?: number
          dia?: string
          id?: never
          loja_id?: number | null
          origem?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliques_whatsapp_dia_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliques_whatsapp_dia_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "painel_motos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliques_whatsapp_dia_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliques_whatsapp_dia_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "vitrine_motos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          arredondar_para: number
          atualizado_em: string
          atualizado_por: string | null
          aviso_site: string | null
          id: boolean
          instagram: string | null
          limite_destaques: number
          prazo_padrao: number
        }
        Insert: {
          arredondar_para?: number
          atualizado_em?: string
          atualizado_por?: string | null
          aviso_site?: string | null
          id?: boolean
          instagram?: string | null
          limite_destaques?: number
          prazo_padrao?: number
        }
        Update: {
          arredondar_para?: number
          atualizado_em?: string
          atualizado_por?: string | null
          aviso_site?: string | null
          id?: boolean
          instagram?: string | null
          limite_destaques?: number
          prazo_padrao?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_prazo_padrao_fkey"
            columns: ["prazo_padrao"]
            isOneToOne: false
            referencedRelation: "financiamento_coeficientes"
            referencedColumns: ["prazo"]
          },
        ]
      }
      entregas: {
        Row: {
          altura_original: number
          cor_media: string | null
          criado_em: string
          foco_x: number
          foco_y: number
          formato: string
          id: string
          largura_original: number
          larguras: number[]
          legenda: string | null
          posicao: number
          publicada: boolean
        }
        Insert: {
          altura_original: number
          cor_media?: string | null
          criado_em?: string
          foco_x?: number
          foco_y?: number
          formato: string
          id?: string
          largura_original: number
          larguras: number[]
          legenda?: string | null
          posicao?: number
          publicada?: boolean
        }
        Update: {
          altura_original?: number
          cor_media?: string | null
          criado_em?: string
          foco_x?: number
          foco_y?: number
          formato?: string
          id?: string
          largura_original?: number
          larguras?: number[]
          legenda?: string | null
          posicao?: number
          publicada?: boolean
        }
        Relationships: []
      }
      financiamento_coeficientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          coeficiente: number
          prazo: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          coeficiente: number
          prazo: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          coeficiente?: number
          prazo?: number
        }
        Relationships: []
      }
      limites: {
        Row: {
          chave: string
          contagem: number
          janela_inicio: string
        }
        Insert: {
          chave: string
          contagem: number
          janela_inicio: string
        }
        Update: {
          chave?: string
          contagem?: number
          janela_inicio?: string
        }
        Relationships: []
      }
      lojas: {
        Row: {
          ativa: boolean
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cidade: string
          endereco: string
          horario: Json | null
          id: number
          latitude: number | null
          longitude: number | null
          maps_url: string | null
          nome: string
          posicao: number
          principal: boolean
          uf: string
          whatsapp: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade: string
          endereco: string
          horario?: Json | null
          id?: never
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          nome: string
          posicao?: number
          principal?: boolean
          uf?: string
          whatsapp: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string
          endereco?: string
          horario?: Json | null
          id?: never
          latitude?: number | null
          longitude?: number | null
          maps_url?: string | null
          nome?: string
          posicao?: number
          principal?: boolean
          uf?: string
          whatsapp?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          ativa: boolean
          id: number
          nome: string
          slug: string
        }
        Insert: {
          ativa?: boolean
          id?: never
          nome: string
          slug: string
        }
        Update: {
          ativa?: boolean
          id?: never
          nome?: string
          slug?: string
        }
        Relationships: []
      }
      modelos: {
        Row: {
          ativa: boolean
          categoria: string
          cilindrada: number | null
          id: number
          marca_id: number
          nome: string
          slug: string
        }
        Insert: {
          ativa?: boolean
          categoria: string
          cilindrada?: number | null
          id?: never
          marca_id: number
          nome: string
          slug: string
        }
        Update: {
          ativa?: boolean
          categoria?: string
          cilindrada?: number | null
          id?: never
          marca_id?: number
          nome?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          papel: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id: string
          nome: string
          papel?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          papel?: string
        }
        Relationships: []
      }
      site_publicacao: {
        Row: {
          dia_disparos: string | null
          disparado_em: string | null
          disparos_hoje: number
          erro: string | null
          id: boolean
          pedido_em: string | null
          pedido_net: number | null
          pendente: boolean
          publicado_em: string | null
          status: string
          tentativas: number
        }
        Insert: {
          dia_disparos?: string | null
          disparado_em?: string | null
          disparos_hoje?: number
          erro?: string | null
          id?: boolean
          pedido_em?: string | null
          pedido_net?: number | null
          pendente?: boolean
          publicado_em?: string | null
          status?: string
          tentativas?: number
        }
        Update: {
          dia_disparos?: string | null
          disparado_em?: string | null
          disparos_hoje?: number
          erro?: string | null
          id?: boolean
          pedido_em?: string | null
          pedido_net?: number | null
          pendente?: boolean
          publicado_em?: string | null
          status?: string
          tentativas?: number
        }
        Relationships: []
      }
      veiculo_fotos: {
        Row: {
          altura_original: number
          cor_media: string | null
          criado_em: string
          foco_x: number
          foco_y: number
          formato: string
          id: string
          largura_original: number
          larguras: number[]
          og: boolean
          posicao: number
          veiculo_id: string
        }
        Insert: {
          altura_original: number
          cor_media?: string | null
          criado_em?: string
          foco_x?: number
          foco_y?: number
          formato: string
          id?: string
          largura_original: number
          larguras: number[]
          og?: boolean
          posicao: number
          veiculo_id: string
        }
        Update: {
          altura_original?: number
          cor_media?: string | null
          criado_em?: string
          foco_x?: number
          foco_y?: number
          formato?: string
          id?: string
          largura_original?: number
          larguras?: number[]
          og?: boolean
          posicao?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_fotos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "painel_motos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculo_fotos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculo_fotos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "vitrine_motos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          aceita_troca: boolean
          ano_fabricacao: number | null
          ano_modelo: number | null
          atualizado_em: string
          atualizado_por: string | null
          busca: string
          cambio: string
          categoria: string | null
          cilindrada: number | null
          codigo: number
          combustivel: string
          condicao: string | null
          cor: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          destaque: boolean
          final_placa: number | null
          freio: string | null
          id: string
          ipva_pago_ate: number | null
          km: number
          manual_chave: boolean
          modelo_id: number | null
          ordem: number
          parcela_exibida: number | null
          partida: string | null
          publicado_em: string | null
          revisada: boolean
          slug: string | null
          so_transferir: boolean
          status: string
          unico_dono: boolean
          vendido_em: string | null
          versao: string | null
        }
        Insert: {
          aceita_troca?: boolean
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          atualizado_em?: string
          atualizado_por?: string | null
          busca?: string
          cambio?: string
          categoria?: string | null
          cilindrada?: number | null
          codigo?: never
          combustivel?: string
          condicao?: string | null
          cor?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          final_placa?: number | null
          freio?: string | null
          id?: string
          ipva_pago_ate?: number | null
          km?: number
          manual_chave?: boolean
          modelo_id?: number | null
          ordem?: number
          parcela_exibida?: number | null
          partida?: string | null
          publicado_em?: string | null
          revisada?: boolean
          slug?: string | null
          so_transferir?: boolean
          status?: string
          unico_dono?: boolean
          vendido_em?: string | null
          versao?: string | null
        }
        Update: {
          aceita_troca?: boolean
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          atualizado_em?: string
          atualizado_por?: string | null
          busca?: string
          cambio?: string
          categoria?: string | null
          cilindrada?: number | null
          codigo?: never
          combustivel?: string
          condicao?: string | null
          cor?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          final_placa?: number | null
          freio?: string | null
          id?: string
          ipva_pago_ate?: number | null
          km?: number
          manual_chave?: boolean
          modelo_id?: number | null
          ordem?: number
          parcela_exibida?: number | null
          partida?: string | null
          publicado_em?: string | null
          revisada?: boolean
          slug?: string | null
          so_transferir?: boolean
          status?: string
          unico_dono?: boolean
          vendido_em?: string | null
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_precos: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          custo_centavos: number | null
          observacao: string | null
          parcela_manual: number | null
          preco_centavos: number
          veiculo_id: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          custo_centavos?: number | null
          observacao?: string | null
          parcela_manual?: number | null
          preco_centavos: number
          veiculo_id: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          custo_centavos?: number | null
          observacao?: string | null
          parcela_manual?: number | null
          preco_centavos?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_precos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "painel_motos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_precos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_precos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "vitrine_motos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      painel_motos: {
        Row: {
          aceita_troca: boolean | null
          ano_fabricacao: number | null
          ano_modelo: number | null
          atualizado_em: string | null
          atualizado_por: string | null
          busca: string | null
          cambio: string | null
          capa: Json | null
          categoria: string | null
          cilindrada: number | null
          codigo: number | null
          combustivel: string | null
          condicao: string | null
          cor: string | null
          criado_em: string | null
          criado_por: string | null
          custo_centavos: number | null
          descricao: string | null
          destaque: boolean | null
          editado_em: string | null
          final_placa: number | null
          freio: string | null
          id: string | null
          ipva_pago_ate: number | null
          km: number | null
          manual_chave: boolean | null
          marca: string | null
          marca_id: number | null
          modelo: string | null
          modelo_id: number | null
          observacao: string | null
          ordem: number | null
          parcela_exibida: number | null
          parcela_manual: number | null
          partida: string | null
          preco_centavos: number | null
          publicado_em: string | null
          revisada: boolean | null
          slug: string | null
          so_transferir: boolean | null
          status: string | null
          total_fotos: number | null
          unico_dono: boolean | null
          vendido_em: string | null
          versao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      vitrine_motos: {
        Row: {
          aceita_troca: boolean | null
          ano_fabricacao: number | null
          ano_modelo: number | null
          atualizado_em: string | null
          busca: string | null
          cambio: string | null
          categoria: string | null
          cilindrada: number | null
          codigo: number | null
          combustivel: string | null
          condicao: string | null
          cor: string | null
          descricao: string | null
          destaque: boolean | null
          final_placa: number | null
          fotos: Json | null
          freio: string | null
          id: string | null
          ipva_pago_ate: number | null
          km: number | null
          manual_chave: boolean | null
          marca: string | null
          marca_slug: string | null
          modelo: string | null
          modelo_slug: string | null
          ordem: number | null
          parcela_exibida: number | null
          partida: string | null
          publicado_em: string | null
          revisada: boolean | null
          slug: string | null
          so_transferir: boolean | null
          status: string | null
          unico_dono: boolean | null
          vendido_em: string | null
          versao: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adicionar_fotos: {
        Args: { p_fotos: Json; p_veiculo: string }
        Returns: number
      }
      alterar_status: {
        Args: { p_status: string; p_veiculo: string }
        Returns: Json
      }
      calcular_parcela: {
        Args: {
          p_arredondar: number
          p_coeficiente: number
          p_preco_centavos: number
        }
        Returns: number
      }
      consumir_limite: {
        Args: { p_chave: string; p_janela_segundos: number; p_maximo: number }
        Returns: boolean
      }
      criar_rascunho: { Args: never; Returns: Json }
      definir_loja_principal: { Args: { p_loja: number }; Returns: undefined }
      editado_em_veiculo: { Args: { p_veiculo: string }; Returns: string }
      eh_admin: { Args: never; Returns: boolean }
      excluir_fotos: {
        Args: { p_ids: string[]; p_veiculo: string }
        Returns: Json
      }
      excluir_veiculo: { Args: { p_veiculo: string }; Returns: Json }
      limpeza_diaria: { Args: never; Returns: Json }
      painel_resumo: { Args: never; Returns: Json }
      pendencias_publicacao: { Args: { p_veiculo: string }; Returns: string[] }
      pode_gerenciar: { Args: never; Returns: boolean }
      processar_publicacao: { Args: never; Returns: string }
      recalcular_parcela: { Args: { p_veiculo?: string }; Returns: number }
      registrar_acesso: {
        Args: {
          p_agente: string
          p_email: string
          p_ip: string
          p_resultado: string
          p_usuario: string
        }
        Returns: undefined
      }
      registrar_clique: {
        Args: {
          p_chave: string
          p_codigo: number
          p_loja: number
          p_origem: string
        }
        Returns: boolean
      }
      registrar_publicacao: { Args: { p_segredo: string }; Returns: boolean }
      reordenar_fotos: {
        Args: { p_ids: string[]; p_veiculo: string }
        Returns: undefined
      }
      reordenar_veiculos: { Args: { p_ids: string[] }; Returns: number }
      salvar_veiculo: {
        Args: { p_dados: Json; p_editado_em: string; p_id: string }
        Returns: Json
      }
      sem_acento: { Args: { p_texto: string }; Returns: string }
      slug_de: { Args: { p_texto: string }; Returns: string }
      transicao_permitida: {
        Args: { p_de: string; p_para: string }
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
