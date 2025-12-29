// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
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
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      BANCO_DE_DADOS: {
        Row: {
          CLIENTE: string | null
          'COD. PRODUTO': number | null
          'CÓDIGO DO CLIENTE': number | null
          'CODIGO FUNCIONARIO': number | null
          CONTAGEM: number | null
          'DATA DO ACERTO': string | null
          data_combinada: string | null
          'DESCONTO POR GRUPO': string | null
          DETALHES_PAGAMENTO: Json | null
          FORMA: string | null
          forma_cobranca: string | null
          FUNCIONÁRIO: string | null
          'HORA DO ACERTO': string | null
          'ID VENDA ITENS': number
          MERCADORIA: string | null
          'NOVAS CONSIGNAÇÕES': string | null
          'NÚMERO DO PEDIDO': number | null
          'PREÇO VENDIDO': string | null
          'QUANTIDADE VENDIDA': string | null
          RECOLHIDO: string | null
          'SALDO FINAL': number | null
          'SALDO INICIAL': number | null
          TIPO: string | null
          'VALOR CONSIGNADO TOTAL (Custo)': string | null
          'VALOR CONSIGNADO TOTAL (Preço Venda)': string | null
          'VALOR DEVIDO': number | null
          'VALOR VENDA PRODUTO': string | null
          'VALOR VENDIDO': string | null
        }
        Insert: {
          CLIENTE?: string | null
          'COD. PRODUTO'?: number | null
          'CÓDIGO DO CLIENTE'?: number | null
          'CODIGO FUNCIONARIO'?: number | null
          CONTAGEM?: number | null
          'DATA DO ACERTO'?: string | null
          data_combinada?: string | null
          'DESCONTO POR GRUPO'?: string | null
          DETALHES_PAGAMENTO?: Json | null
          FORMA?: string | null
          forma_cobranca?: string | null
          FUNCIONÁRIO?: string | null
          'HORA DO ACERTO'?: string | null
          'ID VENDA ITENS'?: number
          MERCADORIA?: string | null
          'NOVAS CONSIGNAÇÕES'?: string | null
          'NÚMERO DO PEDIDO'?: number | null
          'PREÇO VENDIDO'?: string | null
          'QUANTIDADE VENDIDA'?: string | null
          RECOLHIDO?: string | null
          'SALDO FINAL'?: number | null
          'SALDO INICIAL'?: number | null
          TIPO?: string | null
          'VALOR CONSIGNADO TOTAL (Custo)'?: string | null
          'VALOR CONSIGNADO TOTAL (Preço Venda)'?: string | null
          'VALOR DEVIDO'?: number | null
          'VALOR VENDA PRODUTO'?: string | null
          'VALOR VENDIDO'?: string | null
        }
        Update: {
          CLIENTE?: string | null
          'COD. PRODUTO'?: number | null
          'CÓDIGO DO CLIENTE'?: number | null
          'CODIGO FUNCIONARIO'?: number | null
          CONTAGEM?: number | null
          'DATA DO ACERTO'?: string | null
          data_combinada?: string | null
          'DESCONTO POR GRUPO'?: string | null
          DETALHES_PAGAMENTO?: Json | null
          FORMA?: string | null
          forma_cobranca?: string | null
          FUNCIONÁRIO?: string | null
          'HORA DO ACERTO'?: string | null
          'ID VENDA ITENS'?: number
          MERCADORIA?: string | null
          'NOVAS CONSIGNAÇÕES'?: string | null
          'NÚMERO DO PEDIDO'?: number | null
          'PREÇO VENDIDO'?: string | null
          'QUANTIDADE VENDIDA'?: string | null
          RECOLHIDO?: string | null
          'SALDO FINAL'?: number | null
          'SALDO INICIAL'?: number | null
          TIPO?: string | null
          'VALOR CONSIGNADO TOTAL (Custo)'?: string | null
          'VALOR CONSIGNADO TOTAL (Preço Venda)'?: string | null
          'VALOR DEVIDO'?: number | null
          'VALOR VENDA PRODUTO'?: string | null
          'VALOR VENDIDO'?: string | null
        }
        Relationships: []
      }
      CLIENTES: {
        Row: {
          'ALTERAÇÃO CLIENTE': string | null
          BAIRRO: string | null
          'CEP OFICIO': string | null
          CNPJ: string | null
          CODIGO: number
          'CONTATO 1': string | null
          'CONTATO 2': string | null
          Desconto: string | null
          'DESCONTO ACESSORIO': string | null
          'DESCONTO ACESSORIO CELULAR': string | null
          'DESCONTO BRINQUEDO': string | null
          'DESCONTO OUTROS': string | null
          EMAIL: string | null
          ENDEREÇO: string | null
          EXPOSITOR: string | null
          'FONE 1': string | null
          'FONE 2': string | null
          'FORMA DE PAGAMENTO': string | null
          IE: string | null
          MUNICÍPIO: string | null
          'NOME CLIENTE': string | null
          'NOTA FISCAL': string | null
          'OBSERVAÇÃO FIXA': string | null
          'RAZÃO SOCIAL': string | null
          TIPO: string | null
          'TIPO DE CLIENTE': string | null
        }
        Insert: {
          'ALTERAÇÃO CLIENTE'?: string | null
          BAIRRO?: string | null
          'CEP OFICIO'?: string | null
          CNPJ?: string | null
          CODIGO: number
          'CONTATO 1'?: string | null
          'CONTATO 2'?: string | null
          Desconto?: string | null
          'DESCONTO ACESSORIO'?: string | null
          'DESCONTO ACESSORIO CELULAR'?: string | null
          'DESCONTO BRINQUEDO'?: string | null
          'DESCONTO OUTROS'?: string | null
          EMAIL?: string | null
          ENDEREÇO?: string | null
          EXPOSITOR?: string | null
          'FONE 1'?: string | null
          'FONE 2'?: string | null
          'FORMA DE PAGAMENTO'?: string | null
          IE?: string | null
          MUNICÍPIO?: string | null
          'NOME CLIENTE'?: string | null
          'NOTA FISCAL'?: string | null
          'OBSERVAÇÃO FIXA'?: string | null
          'RAZÃO SOCIAL'?: string | null
          TIPO?: string | null
          'TIPO DE CLIENTE'?: string | null
        }
        Update: {
          'ALTERAÇÃO CLIENTE'?: string | null
          BAIRRO?: string | null
          'CEP OFICIO'?: string | null
          CNPJ?: string | null
          CODIGO?: number
          'CONTATO 1'?: string | null
          'CONTATO 2'?: string | null
          Desconto?: string | null
          'DESCONTO ACESSORIO'?: string | null
          'DESCONTO ACESSORIO CELULAR'?: string | null
          'DESCONTO BRINQUEDO'?: string | null
          'DESCONTO OUTROS'?: string | null
          EMAIL?: string | null
          ENDEREÇO?: string | null
          EXPOSITOR?: string | null
          'FONE 1'?: string | null
          'FONE 2'?: string | null
          'FORMA DE PAGAMENTO'?: string | null
          IE?: string | null
          MUNICÍPIO?: string | null
          'NOME CLIENTE'?: string | null
          'NOTA FISCAL'?: string | null
          'OBSERVAÇÃO FIXA'?: string | null
          'RAZÃO SOCIAL'?: string | null
          TIPO?: string | null
          'TIPO DE CLIENTE'?: string | null
        }
        Relationships: []
      }
      COBRANÇA: {
        Row: {
          'AÇÃO DE COBRANÇA': string | null
          CLIENTE: string | null
          'COD. CLIENTE': number | null
          'CÓDIGO FUNCIONÁRIO': string | null
          'DATA AÇÃO COBRANÇA': string | null
          'ID COBRANÇA': number
          'NOME FUNCIONÁRIO': string | null
          'NOVA DATA COMBINADA PAGAMENTO': string | null
          'NÚMERO DO PEDIDO': string | null
        }
        Insert: {
          'AÇÃO DE COBRANÇA'?: string | null
          CLIENTE?: string | null
          'COD. CLIENTE'?: number | null
          'CÓDIGO FUNCIONÁRIO'?: string | null
          'DATA AÇÃO COBRANÇA'?: string | null
          'ID COBRANÇA': number
          'NOME FUNCIONÁRIO'?: string | null
          'NOVA DATA COMBINADA PAGAMENTO'?: string | null
          'NÚMERO DO PEDIDO'?: string | null
        }
        Update: {
          'AÇÃO DE COBRANÇA'?: string | null
          CLIENTE?: string | null
          'COD. CLIENTE'?: number | null
          'CÓDIGO FUNCIONÁRIO'?: string | null
          'DATA AÇÃO COBRANÇA'?: string | null
          'ID COBRANÇA'?: number
          'NOME FUNCIONÁRIO'?: string | null
          'NOVA DATA COMBINADA PAGAMENTO'?: string | null
          'NÚMERO DO PEDIDO'?: string | null
        }
        Relationships: []
      }
      FUNCIONARIOS: {
        Row: {
          apelido: string | null
          cpf: string | null
          created_at: string
          email: string
          foto_url: string | null
          id: number
          nome_completo: string
          senha: string
          setor: string | null
        }
        Insert: {
          apelido?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          foto_url?: string | null
          id?: number
          nome_completo: string
          senha?: string
          setor?: string | null
        }
        Update: {
          apelido?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          foto_url?: string | null
          id?: number
          nome_completo?: string
          senha?: string
          setor?: string | null
        }
        Relationships: []
      }
      PRODUTOS: {
        Row: {
          CODIGO: number | null
          'CÓDIGO BARRAS': number | null
          'DESCRIÇÃO RESUMIDA': string | null
          FREQUENTES: string | null
          GRUPO: string | null
          ID: number
          PREÇO: string | null
          PRODUTO: string | null
          TIPO: string | null
        }
        Insert: {
          CODIGO?: number | null
          'CÓDIGO BARRAS'?: number | null
          'DESCRIÇÃO RESUMIDA'?: string | null
          FREQUENTES?: string | null
          GRUPO?: string | null
          ID: number
          PREÇO?: string | null
          PRODUTO?: string | null
          TIPO?: string | null
        }
        Update: {
          CODIGO?: number | null
          'CÓDIGO BARRAS'?: number | null
          'DESCRIÇÃO RESUMIDA'?: string | null
          FREQUENTES?: string | null
          GRUPO?: string | null
          ID?: number
          PREÇO?: string | null
          PRODUTO?: string | null
          TIPO?: string | null
        }
        Relationships: []
      }
      RECEBIMENTOS: {
        Row: {
          cliente_id: number
          created_at: string | null
          data_combinada: string | null
          forma_cobranca: string | null
          forma_pagamento: string
          funcionario_id: number
          id: number
          valor_pago: number
          valor_registrado: number | null
          vencimento: string | null
          venda_id: number
        }
        Insert: {
          cliente_id: number
          created_at?: string | null
          data_combinada?: string | null
          forma_cobranca?: string | null
          forma_pagamento: string
          funcionario_id: number
          id?: number
          valor_pago: number
          valor_registrado?: number | null
          vencimento?: string | null
          venda_id: number
        }
        Update: {
          cliente_id?: number
          created_at?: string | null
          data_combinada?: string | null
          forma_cobranca?: string | null
          forma_pagamento?: string
          funcionario_id?: number
          id?: number
          valor_pago?: number
          valor_registrado?: number | null
          vencimento?: string | null
          venda_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'RECEBIMENTOS_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'CLIENTES'
            referencedColumns: ['CODIGO']
          },
          {
            foreignKeyName: 'RECEBIMENTOS_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unique_product_groups: {
        Args: never
        Returns: {
          grupo: string
        }[]
      }
      login_by_email: {
        Args: { p_email: string }
        Returns: {
          apelido: string
          cpf: string
          email: string
          foto_url: string
          id: number
          nome_completo: string
          setor: string
        }[]
      }
      verify_employee_credentials: {
        Args: { p_email: string; p_senha: string }
        Returns: {
          apelido: string
          cpf: string
          email: string
          foto_url: string
          id: number
          nome_completo: string
          setor: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
