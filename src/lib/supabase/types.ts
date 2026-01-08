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
      'AÇOES DE COBRANÇA_BACKUP': {
        Row: {
          'AÇÃO DE COBRANÇA': string | null
          CLIENTE: string | null
          'COD. CLIENTE': number | null
          'CÓDIGO FUNCIONÁRIO': number | null
          'DATA AÇÃO COBRANÇA': string | null
          'ID AÇÃO': number
          'NOME FUNCIONÁRIO': string | null
          'NOVA DATA COMBINADA PAGAMENTO': string | null
          'NÚMERO DO PEDIDO': number | null
        }
        Insert: {
          'AÇÃO DE COBRANÇA'?: string | null
          CLIENTE?: string | null
          'COD. CLIENTE'?: number | null
          'CÓDIGO FUNCIONÁRIO'?: number | null
          'DATA AÇÃO COBRANÇA'?: string | null
          'ID AÇÃO'?: number
          'NOME FUNCIONÁRIO'?: string | null
          'NOVA DATA COMBINADA PAGAMENTO'?: string | null
          'NÚMERO DO PEDIDO'?: number | null
        }
        Update: {
          'AÇÃO DE COBRANÇA'?: string | null
          CLIENTE?: string | null
          'COD. CLIENTE'?: number | null
          'CÓDIGO FUNCIONÁRIO'?: number | null
          'DATA AÇÃO COBRANÇA'?: string | null
          'ID AÇÃO'?: number
          'NOME FUNCIONÁRIO'?: string | null
          'NOVA DATA COMBINADA PAGAMENTO'?: string | null
          'NÚMERO DO PEDIDO'?: number | null
        }
        Relationships: []
      }
      acoes_cobranca: {
        Row: {
          acao: string | null
          cliente_id: number | null
          cliente_nome: string | null
          created_at: string | null
          data_acao: string | null
          funcionario_id: number | null
          funcionario_nome: string | null
          id: number
          nova_data_combinada: string | null
          pedido_id: number | null
        }
        Insert: {
          acao?: string | null
          cliente_id?: number | null
          cliente_nome?: string | null
          created_at?: string | null
          data_acao?: string | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          nova_data_combinada?: string | null
          pedido_id?: number | null
        }
        Update: {
          acao?: string | null
          cliente_id?: number | null
          cliente_nome?: string | null
          created_at?: string | null
          data_acao?: string | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          nova_data_combinada?: string | null
          pedido_id?: number | null
        }
        Relationships: []
      }
      acoes_cobranca_vencimentos: {
        Row: {
          acao_cobranca_id: number | null
          created_at: string
          forma_pagamento: string | null
          id: number
          valor: number
          vencimento: string
        }
        Insert: {
          acao_cobranca_id?: number | null
          created_at?: string
          forma_pagamento?: string | null
          id?: number
          valor: number
          vencimento: string
        }
        Update: {
          acao_cobranca_id?: number | null
          created_at?: string
          forma_pagamento?: string | null
          id?: number
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: 'acoes_cobranca_vencimentos_acao_cobranca_id_fkey'
            columns: ['acao_cobranca_id']
            isOneToOne: false
            referencedRelation: 'acoes_cobranca'
            referencedColumns: ['id']
          },
        ]
      }
      AJUSTE_SALDO_INICIAL: {
        Row: {
          cliente_id: number
          cliente_nome: string | null
          created_at: string | null
          data_acerto: string | null
          id: number
          numero_pedido: number | null
          produto_id: number
          quantidade_alterada: number | null
          saldo_anterior: number | null
          saldo_novo: number | null
          vendedor_id: number | null
          vendedor_nome: string | null
        }
        Insert: {
          cliente_id: number
          cliente_nome?: string | null
          created_at?: string | null
          data_acerto?: string | null
          id?: number
          numero_pedido?: number | null
          produto_id: number
          quantidade_alterada?: number | null
          saldo_anterior?: number | null
          saldo_novo?: number | null
          vendedor_id?: number | null
          vendedor_nome?: string | null
        }
        Update: {
          cliente_id?: number
          cliente_nome?: string | null
          created_at?: string | null
          data_acerto?: string | null
          id?: number
          numero_pedido?: number | null
          produto_id?: number
          quantidade_alterada?: number | null
          saldo_anterior?: number | null
          saldo_novo?: number | null
          vendedor_id?: number | null
          vendedor_nome?: string | null
        }
        Relationships: []
      }
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
          nota_fiscal_cadastro: string | null
          nota_fiscal_emitida: string | null
          nota_fiscal_venda: string | null
          'NOVAS CONSIGNAÇÕES': string | null
          'NÚMERO DO PEDIDO': number | null
          'PREÇO VENDIDO': string | null
          'QUANTIDADE VENDIDA': string | null
          RECOLHIDO: string | null
          'SALDO FINAL': number | null
          'SALDO INICIAL': number | null
          session_id: number | null
          solicitacao_nf: string | null
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
          nota_fiscal_cadastro?: string | null
          nota_fiscal_emitida?: string | null
          nota_fiscal_venda?: string | null
          'NOVAS CONSIGNAÇÕES'?: string | null
          'NÚMERO DO PEDIDO'?: number | null
          'PREÇO VENDIDO'?: string | null
          'QUANTIDADE VENDIDA'?: string | null
          RECOLHIDO?: string | null
          'SALDO FINAL'?: number | null
          'SALDO INICIAL'?: number | null
          session_id?: number | null
          solicitacao_nf?: string | null
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
          nota_fiscal_cadastro?: string | null
          nota_fiscal_emitida?: string | null
          nota_fiscal_venda?: string | null
          'NOVAS CONSIGNAÇÕES'?: string | null
          'NÚMERO DO PEDIDO'?: number | null
          'PREÇO VENDIDO'?: string | null
          'QUANTIDADE VENDIDA'?: string | null
          RECOLHIDO?: string | null
          'SALDO FINAL'?: number | null
          'SALDO INICIAL'?: number | null
          session_id?: number | null
          solicitacao_nf?: string | null
          TIPO?: string | null
          'VALOR CONSIGNADO TOTAL (Custo)'?: string | null
          'VALOR CONSIGNADO TOTAL (Preço Venda)'?: string | null
          'VALOR DEVIDO'?: number | null
          'VALOR VENDA PRODUTO'?: string | null
          'VALOR VENDIDO'?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'BANCO_DE_DADOS_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'DATAS DE INVENTÁRIO'
            referencedColumns: ['ID INVENTÁRIO']
          },
        ]
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
          GRUPO: string | null
          'GRUPO ROTA': string | null
          IE: string | null
          MUNICÍPIO: string | null
          'NOME CLIENTE': string | null
          'NOTA FISCAL': string | null
          'OBSERVAÇÃO FIXA': string | null
          'RAZÃO SOCIAL': string | null
          situacao: string | null
          TIPO: string | null
          'TIPO DE CLIENTE': string
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
          GRUPO?: string | null
          'GRUPO ROTA'?: string | null
          IE?: string | null
          MUNICÍPIO?: string | null
          'NOME CLIENTE'?: string | null
          'NOTA FISCAL'?: string | null
          'OBSERVAÇÃO FIXA'?: string | null
          'RAZÃO SOCIAL'?: string | null
          situacao?: string | null
          TIPO?: string | null
          'TIPO DE CLIENTE'?: string
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
          GRUPO?: string | null
          'GRUPO ROTA'?: string | null
          IE?: string | null
          MUNICÍPIO?: string | null
          'NOME CLIENTE'?: string | null
          'NOTA FISCAL'?: string | null
          'OBSERVAÇÃO FIXA'?: string | null
          'RAZÃO SOCIAL'?: string | null
          situacao?: string | null
          TIPO?: string | null
          'TIPO DE CLIENTE'?: string
        }
        Relationships: []
      }
      'CONTAGEM DE ESTOQUE FINAL': {
        Row: {
          created_at: string | null
          id: number
          produto_id: number
          quantidade: number
          session_id: number | null
          valor_unitario_snapshot: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          produto_id: number
          quantidade: number
          session_id?: number | null
          valor_unitario_snapshot?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          produto_id?: number
          quantidade?: number
          session_id?: number | null
          valor_unitario_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'CONTAGEM DE ESTOQUE FINAL_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
          {
            foreignKeyName: 'CONTAGEM DE ESTOQUE FINAL_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'DATAS DE INVENTÁRIO'
            referencedColumns: ['ID INVENTÁRIO']
          },
        ]
      }
      CRIAR_NOVA_ROTA: {
        Row: {
          id: number
          nome_rota: string
        }
        Insert: {
          id?: number
          nome_rota: string
        }
        Update: {
          id?: number
          nome_rota?: string
        }
        Relationships: []
      }
      'DATAS DE INVENTÁRIO': {
        Row: {
          'CODIGO FUNCIONARIO': number | null
          'Data de Fechamento de Inventário': string | null
          'Data de Início de Inventário': string | null
          'ID INVENTÁRIO': number
          TIPO: string | null
        }
        Insert: {
          'CODIGO FUNCIONARIO'?: number | null
          'Data de Fechamento de Inventário'?: string | null
          'Data de Início de Inventário'?: string | null
          'ID INVENTÁRIO'?: number
          TIPO?: string | null
        }
        Update: {
          'CODIGO FUNCIONARIO'?: number | null
          'Data de Fechamento de Inventário'?: string | null
          'Data de Início de Inventário'?: string | null
          'ID INVENTÁRIO'?: number
          TIPO?: string | null
        }
        Relationships: []
      }
      debitos_historico: {
        Row: {
          cliente_codigo: number | null
          cliente_nome: string | null
          created_at: string | null
          data_acerto: string | null
          debito: number | null
          desconto: number | null
          hora_acerto: string | null
          id: number
          media_mensal: number | null
          pedido_id: number
          rota: string | null
          rota_id: number | null
          saldo_a_pagar: number | null
          valor_pago: number | null
          valor_venda: number | null
          vendedor_nome: string | null
        }
        Insert: {
          cliente_codigo?: number | null
          cliente_nome?: string | null
          created_at?: string | null
          data_acerto?: string | null
          debito?: number | null
          desconto?: number | null
          hora_acerto?: string | null
          id?: number
          media_mensal?: number | null
          pedido_id: number
          rota?: string | null
          rota_id?: number | null
          saldo_a_pagar?: number | null
          valor_pago?: number | null
          valor_venda?: number | null
          vendedor_nome?: string | null
        }
        Update: {
          cliente_codigo?: number | null
          cliente_nome?: string | null
          created_at?: string | null
          data_acerto?: string | null
          debito?: number | null
          desconto?: number | null
          hora_acerto?: string | null
          id?: number
          media_mensal?: number | null
          pedido_id?: number
          rota?: string | null
          rota_id?: number | null
          saldo_a_pagar?: number | null
          valor_pago?: number | null
          valor_venda?: number | null
          vendedor_nome?: string | null
        }
        Relationships: []
      }
      DESPESAS: {
        Row: {
          Data: string | null
          Detalhamento: string
          funcionario_id: number
          'Grupo de Despesas': string
          id: number
          Valor: number
        }
        Insert: {
          Data?: string | null
          Detalhamento: string
          funcionario_id: number
          'Grupo de Despesas': string
          id?: number
          Valor: number
        }
        Update: {
          Data?: string | null
          Detalhamento?: string
          funcionario_id?: number
          'Grupo de Despesas'?: string
          id?: number
          Valor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'DESPESAS_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE CARRO AJUSTES': {
        Row: {
          ajuste_manual: number | null
          diferenca_quantidade: number | null
          diferenca_valor: number | null
          id: number
          id_estoque_carro: number
          novo_saldo: number | null
          produto_id: number
          timestamp: string | null
        }
        Insert: {
          ajuste_manual?: number | null
          diferenca_quantidade?: number | null
          diferenca_valor?: number | null
          id?: number
          id_estoque_carro: number
          novo_saldo?: number | null
          produto_id: number
          timestamp?: string | null
        }
        Update: {
          ajuste_manual?: number | null
          diferenca_quantidade?: number | null
          diferenca_valor?: number | null
          id?: number
          id_estoque_carro?: number
          novo_saldo?: number | null
          produto_id?: number
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO AJUSTES_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO AJUSTES_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO CONTAGEM': {
        Row: {
          funcionario_id: number | null
          funcionario_nome: string | null
          id: number
          id_estoque_carro: number
          produto_id: number
          quantidade: number | null
          timestamp: string | null
        }
        Insert: {
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          id_estoque_carro: number
          produto_id: number
          quantidade?: number | null
          timestamp?: string | null
        }
        Update: {
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          id_estoque_carro?: number
          produto_id?: number
          quantidade?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO CONTAGEM_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO CONTAGEM_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO CONTAGEM_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO DIFERENÇAS': {
        Row: {
          created_at: string | null
          diferenca_qtd: number | null
          diferenca_val: number | null
          id: number
          id_estoque_carro: number
          produto_id: number | null
        }
        Insert: {
          created_at?: string | null
          diferenca_qtd?: number | null
          diferenca_val?: number | null
          id?: number
          id_estoque_carro: number
          produto_id?: number | null
        }
        Update: {
          created_at?: string | null
          diferenca_qtd?: number | null
          diferenca_val?: number | null
          id?: number
          id_estoque_carro?: number
          produto_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO DIFERENÇAS_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO DIFERENÇAS_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO SALDO FINAL': {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          funcionario_id: number | null
          funcionario_nome: string | null
          id: number
          id_estoque_carro: number
          preco: number | null
          produto: string | null
          produto_id: number
          saldo_final: number | null
          timestamp: string | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          id_estoque_carro: number
          preco?: number | null
          produto?: string | null
          produto_id: number
          saldo_final?: number | null
          timestamp?: string | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          id_estoque_carro?: number
          preco?: number | null
          produto?: string | null
          produto_id?: number
          saldo_final?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO SALDO FINAL_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO SALDO FINAL_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO SALDO FINAL_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO SALDO INICIAL': {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          funcionario_id: number | null
          funcionario_nome: string | null
          id: number
          id_estoque_carro: number
          preco: number | null
          produto: string | null
          produto_id: number
          saldo_inicial: number | null
          timestamp: string | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          id_estoque_carro: number
          preco?: number | null
          produto?: string | null
          produto_id: number
          saldo_inicial?: number | null
          timestamp?: string | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          id_estoque_carro?: number
          preco?: number | null
          produto?: string | null
          produto_id?: number
          saldo_inicial?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO SALDO INICIAL_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO SALDO INICIAL_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO SALDO INICIAL_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO: CARRO PARA O CLIENTE': {
        Row: {
          created_at: string | null
          id: number
          id_estoque_carro: number
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_estoque_carro: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_estoque_carro?: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO: CARRO PARA O CLIENTE_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO: CARRO PARA O CLIENTE_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO: CARRO PARA O ESTOQUE': {
        Row: {
          created_at: string | null
          id: number
          id_estoque_carro: number
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_estoque_carro: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_estoque_carro?: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO: CARRO PARA O ESTOQUE_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO: CARRO PARA O ESTOQUE_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO: CLIENTE PARA O CARRO': {
        Row: {
          created_at: string | null
          id: number
          id_estoque_carro: number
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_estoque_carro: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_estoque_carro?: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO: CLIENTE PARA O CARRO_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO: CLIENTE PARA O CARRO_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE CARRO: ESTOQUE PARA O CARRO': {
        Row: {
          created_at: string | null
          id: number
          id_estoque_carro: number
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_estoque_carro: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_estoque_carro?: number
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE CARRO: ESTOQUE PARA O CARRO_id_estoque_carro_fkey'
            columns: ['id_estoque_carro']
            isOneToOne: false
            referencedRelation: 'ID ESTOQUE CARRO'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE CARRO: ESTOQUE PARA O CARRO_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
        ]
      }
      'ESTOQUE GERAL AJUSTES': {
        Row: {
          ajuste_quantidade: number | null
          created_at: string | null
          diferenca_quantidade: number | null
          diferenca_valor: number | null
          id: number
          id_inventario: number | null
          novo_saldo_final: number | null
          produto_id: number | null
        }
        Insert: {
          ajuste_quantidade?: number | null
          created_at?: string | null
          diferenca_quantidade?: number | null
          diferenca_valor?: number | null
          id?: number
          id_inventario?: number | null
          novo_saldo_final?: number | null
          produto_id?: number | null
        }
        Update: {
          ajuste_quantidade?: number | null
          created_at?: string | null
          diferenca_quantidade?: number | null
          diferenca_valor?: number | null
          id?: number
          id_inventario?: number | null
          novo_saldo_final?: number | null
          produto_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL AJUSTES_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE GERAL CARRO PARA ESTOQUE': {
        Row: {
          created_at: string | null
          funcionario_id: number | null
          id: number
          id_inventario: number | null
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL CARRO PARA ESTOQUE_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE GERAL CARRO PARA ESTOQUE_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE GERAL COMPRAS': {
        Row: {
          compras_quantidade: number | null
          created_at: string | null
          fornecedor_id: number | null
          fornecedor_nome: string | null
          id: number
          id_inventario: number | null
          produto_id: number | null
          valor_unitario: number | null
        }
        Insert: {
          compras_quantidade?: number | null
          created_at?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          valor_unitario?: number | null
        }
        Update: {
          compras_quantidade?: number | null
          created_at?: string | null
          fornecedor_id?: number | null
          fornecedor_nome?: string | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL COMPRAS_fornecedor_id_fkey'
            columns: ['fornecedor_id']
            isOneToOne: false
            referencedRelation: 'FORNECEDORES'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE GERAL COMPRAS_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE GERAL CONTAGEM': {
        Row: {
          created_at: string | null
          id: number
          id_inventario: number | null
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL CONTAGEM_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE GERAL ESTOQUE PARA CARRO': {
        Row: {
          created_at: string | null
          funcionario_id: number | null
          id: number
          id_inventario: number | null
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          id_inventario?: number | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL ESTOQUE PARA CARRO_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ESTOQUE GERAL ESTOQUE PARA CARRO_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE GERAL SAÍDAS PERDAS': {
        Row: {
          created_at: string | null
          id: number
          id_inventario: number | null
          motivo: string | null
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_inventario?: number | null
          motivo?: string | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          id_inventario?: number | null
          motivo?: string | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL SAÍDAS PERDAS_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      'ESTOQUE GERAL SALDO INICIAL': {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          funcionario: string | null
          id: number
          id_inventario: number | null
          pedido_id: number | null
          preco: number | null
          produto: string | null
          produto_id: number | null
          saldo_inicial: number | null
          timestamp: string | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          funcionario?: string | null
          id?: number
          id_inventario?: number | null
          pedido_id?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          saldo_inicial?: number | null
          timestamp?: string | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          funcionario?: string | null
          id?: number
          id_inventario?: number | null
          pedido_id?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          saldo_inicial?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ESTOQUE GERAL SALDO INICIAL_id_inventario_fkey'
            columns: ['id_inventario']
            isOneToOne: false
            referencedRelation: 'ID Inventário'
            referencedColumns: ['id']
          },
        ]
      }
      fechamento_caixa: {
        Row: {
          cheque_aprovado: boolean | null
          created_at: string
          desconto_total: number | null
          despesas_aprovadas: boolean | null
          dinheiro_aprovado: boolean | null
          funcionario_id: number
          id: number
          pix_aprovado: boolean | null
          responsavel_id: number | null
          rota_id: number
          status: string | null
          valor_a_receber: number | null
          valor_cheque: number | null
          valor_despesas: number | null
          valor_dinheiro: number | null
          valor_pix: number | null
          venda_total: number | null
        }
        Insert: {
          cheque_aprovado?: boolean | null
          created_at?: string
          desconto_total?: number | null
          despesas_aprovadas?: boolean | null
          dinheiro_aprovado?: boolean | null
          funcionario_id: number
          id?: number
          pix_aprovado?: boolean | null
          responsavel_id?: number | null
          rota_id: number
          status?: string | null
          valor_a_receber?: number | null
          valor_cheque?: number | null
          valor_despesas?: number | null
          valor_dinheiro?: number | null
          valor_pix?: number | null
          venda_total?: number | null
        }
        Update: {
          cheque_aprovado?: boolean | null
          created_at?: string
          desconto_total?: number | null
          despesas_aprovadas?: boolean | null
          dinheiro_aprovado?: boolean | null
          funcionario_id?: number
          id?: number
          pix_aprovado?: boolean | null
          responsavel_id?: number | null
          rota_id?: number
          status?: string | null
          valor_a_receber?: number | null
          valor_cheque?: number | null
          valor_despesas?: number | null
          valor_dinheiro?: number | null
          valor_pix?: number | null
          venda_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'fechamento_caixa_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fechamento_caixa_responsavel_id_fkey'
            columns: ['responsavel_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fechamento_caixa_rota_id_fkey'
            columns: ['rota_id']
            isOneToOne: false
            referencedRelation: 'ROTA'
            referencedColumns: ['id']
          },
        ]
      }
      FORNECEDORES: {
        Row: {
          cnpj: string | null
          contatos: Json | null
          created_at: string
          endereco: string | null
          id: number
          nome_fornecedor: string
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          contatos?: Json | null
          created_at?: string
          endereco?: string | null
          id?: number
          nome_fornecedor: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          contatos?: Json | null
          created_at?: string
          endereco?: string | null
          id?: number
          nome_fornecedor?: string
          telefone?: string | null
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
          setor: string[] | null
          situacao: string
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
          setor?: string[] | null
          situacao?: string
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
          setor?: string[] | null
          situacao?: string
        }
        Relationships: []
      }
      'ID ESTOQUE CARRO': {
        Row: {
          data_fim: string | null
          data_inicio: string
          funcionario_id: number
          id: number
        }
        Insert: {
          data_fim?: string | null
          data_inicio?: string
          funcionario_id: number
          id?: number
        }
        Update: {
          data_fim?: string | null
          data_inicio?: string
          funcionario_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'ID ESTOQUE CARRO_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
        ]
      }
      'ID Inventário': {
        Row: {
          data_fim: string | null
          data_inicio: string
          id: number
          status: string | null
        }
        Insert: {
          data_fim?: string | null
          data_inicio?: string
          id?: number
          status?: string | null
        }
        Update: {
          data_fim?: string | null
          data_inicio?: string
          id?: number
          status?: string | null
        }
        Relationships: []
      }
      NOTA_FISCAL: {
        Row: {
          cliente_id: number
          created_at: string
          id: number
          venda_id: number
        }
        Insert: {
          cliente_id: number
          created_at?: string
          id?: number
          venda_id: number
        }
        Update: {
          cliente_id?: number
          created_at?: string
          id?: number
          venda_id?: number
        }
        Relationships: []
      }
      notas_fiscais_emitidas: {
        Row: {
          cliente_id: number
          created_at: string
          data_emissao: string
          funcionario_id: number | null
          id: number
          numero_nota_fiscal: string
          pedido_id: number
        }
        Insert: {
          cliente_id: number
          created_at?: string
          data_emissao?: string
          funcionario_id?: number | null
          id?: number
          numero_nota_fiscal: string
          pedido_id: number
        }
        Update: {
          cliente_id?: number
          created_at?: string
          data_emissao?: string
          funcionario_id?: number | null
          id?: number
          numero_nota_fiscal?: string
          pedido_id?: number
        }
        Relationships: []
      }
      PENDENCIAS: {
        Row: {
          cliente_id: number
          created_at: string | null
          descricao_pendencia: string
          descricao_resolucao: string | null
          funcionario_id: number
          id: number
          resolvida: boolean
        }
        Insert: {
          cliente_id: number
          created_at?: string | null
          descricao_pendencia: string
          descricao_resolucao?: string | null
          funcionario_id: number
          id?: number
          resolvida?: boolean
        }
        Update: {
          cliente_id?: number
          created_at?: string | null
          descricao_pendencia?: string
          descricao_resolucao?: string | null
          funcionario_id?: number
          id?: number
          resolvida?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'PENDENCIAS_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'CLIENTES'
            referencedColumns: ['CODIGO']
          },
          {
            foreignKeyName: 'PENDENCIAS_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
        ]
      }
      permissoes: {
        Row: {
          acesso: boolean
          created_at: string
          id: number
          modulo: string
          setor: string
        }
        Insert: {
          acesso?: boolean
          created_at?: string
          id?: number
          modulo: string
          setor: string
        }
        Update: {
          acesso?: boolean
          created_at?: string
          id?: number
          modulo?: string
          setor?: string
        }
        Relationships: []
      }
      PIX: {
        Row: {
          banco_pix: string
          confirmado_por: string | null
          created_at: string
          data_pix_realizado: string | null
          id: number
          nome_no_pix: string
          recebimento_id: number
          venda_id: number | null
        }
        Insert: {
          banco_pix?: string
          confirmado_por?: string | null
          created_at?: string
          data_pix_realizado?: string | null
          id?: number
          nome_no_pix: string
          recebimento_id: number
          venda_id?: number | null
        }
        Update: {
          banco_pix?: string
          confirmado_por?: string | null
          created_at?: string
          data_pix_realizado?: string | null
          id?: number
          nome_no_pix?: string
          recebimento_id?: number
          venda_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'PIX_recebimento_id_fkey'
            columns: ['recebimento_id']
            isOneToOne: true
            referencedRelation: 'RECEBIMENTOS'
            referencedColumns: ['id']
          },
        ]
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
          ID_da_fêmea: number | null
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
          ID_da_fêmea?: number | null
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
          ID_da_fêmea?: number | null
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
      'REPOSIÇÃO E DEVOLUÇÃO': {
        Row: {
          created_at: string | null
          funcionario_id: number | null
          id: number
          produto_id: number | null
          quantidade: number
          session_id: number | null
          TIPO: string
        }
        Insert: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          produto_id?: number | null
          quantidade: number
          session_id?: number | null
          TIPO: string
        }
        Update: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          produto_id?: number | null
          quantidade?: number
          session_id?: number | null
          TIPO?: string
        }
        Relationships: [
          {
            foreignKeyName: 'REPOSIÇÃO E DEVOLUÇÃO_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'REPOSIÇÃO E DEVOLUÇÃO_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'PRODUTOS'
            referencedColumns: ['ID']
          },
          {
            foreignKeyName: 'REPOSIÇÃO E DEVOLUÇÃO_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'DATAS DE INVENTÁRIO'
            referencedColumns: ['ID INVENTÁRIO']
          },
        ]
      }
      ROTA: {
        Row: {
          data_fim: string | null
          data_inicio: string
          id: number
        }
        Insert: {
          data_fim?: string | null
          data_inicio: string
          id?: number
        }
        Update: {
          data_fim?: string | null
          data_inicio?: string
          id?: number
        }
        Relationships: []
      }
      ROTA_ITEMS: {
        Row: {
          agregado: boolean | null
          boleto: boolean | null
          cliente_id: number | null
          id: number
          rota_id: number | null
          vendedor_id: number | null
          x_na_rota: number | null
        }
        Insert: {
          agregado?: boolean | null
          boleto?: boolean | null
          cliente_id?: number | null
          id?: number
          rota_id?: number | null
          vendedor_id?: number | null
          x_na_rota?: number | null
        }
        Update: {
          agregado?: boolean | null
          boleto?: boolean | null
          cliente_id?: number | null
          id?: number
          rota_id?: number | null
          vendedor_id?: number | null
          x_na_rota?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'ROTA_ITEMS_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'CLIENTES'
            referencedColumns: ['CODIGO']
          },
          {
            foreignKeyName: 'ROTA_ITEMS_rota_id_fkey'
            columns: ['rota_id']
            isOneToOne: false
            referencedRelation: 'ROTA'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ROTA_ITEMS_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
        ]
      }
      sessoes_inventario: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          funcionario_id: number | null
          id: number
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          funcionario_id?: number | null
          id?: number
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          funcionario_id?: number | null
          id?: number
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessoes_inventario_funcionario_id_fkey'
            columns: ['funcionario_id']
            isOneToOne: false
            referencedRelation: 'FUNCIONARIOS'
            referencedColumns: ['id']
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          description: string
          id: number
          meta: Json | null
          type: string
          user_id: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          meta?: Json | null
          type: string
          user_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          meta?: Json | null
          type?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'system_logs_user_id_fkey'
            columns: ['user_id']
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
      auto_finalize_overdue_routes: { Args: never; Returns: Json }
      get_client_projections: {
        Args: never
        Returns: {
          client_id: number
          projecao: number
        }[]
      }
      get_clients_last_stock_value: {
        Args: never
        Returns: {
          client_id: number
          stock_value: number
        }[]
      }
      get_inventory_data: {
        Args: { p_funcionario_id: number; p_session_id: number }
        Returns: {
          codigo_barras: string
          codigo_produto: number
          contagem: number
          entrada_cliente_carro: number
          entrada_estoque_carro: number
          id: number
          mercadoria: string
          preco: number
          saida_carro_cliente: number
          saida_carro_estoque: number
          saldo_final: number
          saldo_inicial: number
          tipo: string
        }[]
      }
      get_inventory_items_paginated: {
        Args: {
          p_funcionario_id?: number
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_session_id?: number
        }
        Returns: {
          codigo_barras: string
          codigo_produto: number
          entrada_cliente_carro: number
          entrada_estoque_carro: number
          estoque_contagem_carro: number
          id: number
          mercadoria: string
          preco: number
          saida_carro_cliente: number
          saida_carro_estoque: number
          saldo_final: number
          saldo_inicial: number
          tipo: string
          total_count: number
        }[]
      }
      get_inventory_summary_v2: {
        Args: {
          p_funcionario_id?: number
          p_search?: string
          p_session_id?: number
        }
        Returns: {
          total_diferenca_negativa_qtd: number
          total_diferenca_negativa_valor: number
          total_diferenca_positiva_qtd: number
          total_diferenca_positiva_valor: number
          total_saldo_final_qtd: number
          total_saldo_final_valor: number
          total_saldo_inicial_qtd: number
          total_saldo_inicial_valor: number
        }[]
      }
      get_next_order_number: { Args: never; Returns: number }
      get_top_selling_items: {
        Args: { end_date: string; start_date: string }
        Returns: {
          produto_codigo: number
          produto_nome: string
          quantidade_total: number
          valor_total: number
        }[]
      }
      get_unique_client_routes: {
        Args: never
        Returns: {
          rota: string
        }[]
      }
      get_unique_client_types: {
        Args: never
        Returns: {
          tipo: string
        }[]
      }
      get_unique_expositores: {
        Args: never
        Returns: {
          expositor: string
        }[]
      }
      get_unique_product_groups: {
        Args: never
        Returns: {
          grupo: string
        }[]
      }
      increment_rota_items_on_finalize: {
        Args: { p_rota_id: number }
        Returns: undefined
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
          setor: string[]
        }[]
      }
      parse_currency_sql: { Args: { price: string }; Returns: number }
      process_inventory_batch: {
        Args: { p_funcionario_id: number; p_items: Json; p_session_id: number }
        Returns: undefined
      }
      refresh_debitos_historico: { Args: never; Returns: undefined }
      safe_cast_timestamp: {
        Args: { p_date: string; p_time: string }
        Returns: string
      }
      safe_timestamp_combine: {
        Args: { p_date: string; p_time: string }
        Returns: string
      }
      start_new_inventory_session: { Args: never; Returns: Json }
      update_debito_historico_order: {
        Args: { p_pedido_id: number }
        Returns: undefined
      }
      verify_employee_credentials: {
        Args: { p_email: string; p_senha: string }
        Returns: {
          email: string
          foto_url: string
          id: number
          nome_completo: string
          setor: string[]
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
