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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      "AÇOES DE COBRANÇA_BACKUP": {
        Row: {
          "AÇÃO DE COBRANÇA": string | null
          CLIENTE: string | null
          "COD. CLIENTE": number | null
          "CÓDIGO FUNCIONÁRIO": number | null
          "DATA AÇÃO COBRANÇA": string | null
          "ID AÇÃO": number
          "NOME FUNCIONÁRIO": string | null
          "NOVA DATA COMBINADA PAGAMENTO": string | null
          "NÚMERO DO PEDIDO": number | null
        }
        Insert: {
          "AÇÃO DE COBRANÇA"?: string | null
          CLIENTE?: string | null
          "COD. CLIENTE"?: number | null
          "CÓDIGO FUNCIONÁRIO"?: number | null
          "DATA AÇÃO COBRANÇA"?: string | null
          "ID AÇÃO"?: number
          "NOME FUNCIONÁRIO"?: string | null
          "NOVA DATA COMBINADA PAGAMENTO"?: string | null
          "NÚMERO DO PEDIDO"?: number | null
        }
        Update: {
          "AÇÃO DE COBRANÇA"?: string | null
          CLIENTE?: string | null
          "COD. CLIENTE"?: number | null
          "CÓDIGO FUNCIONÁRIO"?: number | null
          "DATA AÇÃO COBRANÇA"?: string | null
          "ID AÇÃO"?: number
          "NOME FUNCIONÁRIO"?: string | null
          "NOVA DATA COMBINADA PAGAMENTO"?: string | null
          "NÚMERO DO PEDIDO"?: number | null
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
          motivo: string | null
          nova_data_combinada: string | null
          pedido_id: number | null
          target_forma_pagamento: string | null
          target_vencimento: string | null
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
          motivo?: string | null
          nova_data_combinada?: string | null
          pedido_id?: number | null
          target_forma_pagamento?: string | null
          target_vencimento?: string | null
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
          motivo?: string | null
          nova_data_combinada?: string | null
          pedido_id?: number | null
          target_forma_pagamento?: string | null
          target_vencimento?: string | null
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
            foreignKeyName: "acoes_cobranca_vencimentos_acao_cobranca_id_fkey"
            columns: ["acao_cobranca_id"]
            isOneToOne: false
            referencedRelation: "acoes_cobranca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_cobranca_vencimentos_acao_cobranca_id_fkey"
            columns: ["acao_cobranca_id"]
            isOneToOne: false
            referencedRelation: "view_latest_collection_actions"
            referencedColumns: ["action_id"]
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
          "COD. PRODUTO": number | null
          "CÓDIGO DO CLIENTE": number | null
          "CODIGO FUNCIONARIO": number | null
          codigo_barras: string | null
          codigo_interno: string | null
          CONTAGEM: number | null
          "DATA DO ACERTO": string | null
          "DATA E HORA": string | null
          data_combinada: string | null
          "DESCONTO POR GRUPO": string | null
          DETALHES_PAGAMENTO: Json | null
          FORMA: string | null
          forma_cobranca: string | null
          FUNCIONÁRIO: string | null
          "HORA DO ACERTO": string | null
          "ID VENDA ITENS": number
          MERCADORIA: string | null
          nota_fiscal_cadastro: string | null
          nota_fiscal_emitida: string | null
          nota_fiscal_venda: string | null
          "NOVAS CONSIGNAÇÕES": string | null
          "NÚMERO DO PEDIDO": number | null
          "PREÇO VENDIDO": string | null
          "QUANTIDADE VENDIDA": string | null
          RECOLHIDO: string | null
          "SALDO FINAL": number | null
          "SALDO INICIAL": number | null
          session_id: number | null
          solicitacao_nf: string | null
          TIPO: string | null
          "VALOR CONSIGNADO TOTAL (Custo)": string | null
          "VALOR CONSIGNADO TOTAL (Preço Venda)": string | null
          "VALOR DEVIDO": number | null
          "VALOR VENDA PRODUTO": string | null
          "VALOR VENDIDO": string | null
        }
        Insert: {
          CLIENTE?: string | null
          "COD. PRODUTO"?: number | null
          "CÓDIGO DO CLIENTE"?: number | null
          "CODIGO FUNCIONARIO"?: number | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          CONTAGEM?: number | null
          "DATA DO ACERTO"?: string | null
          "DATA E HORA"?: string | null
          data_combinada?: string | null
          "DESCONTO POR GRUPO"?: string | null
          DETALHES_PAGAMENTO?: Json | null
          FORMA?: string | null
          forma_cobranca?: string | null
          FUNCIONÁRIO?: string | null
          "HORA DO ACERTO"?: string | null
          "ID VENDA ITENS"?: number
          MERCADORIA?: string | null
          nota_fiscal_cadastro?: string | null
          nota_fiscal_emitida?: string | null
          nota_fiscal_venda?: string | null
          "NOVAS CONSIGNAÇÕES"?: string | null
          "NÚMERO DO PEDIDO"?: number | null
          "PREÇO VENDIDO"?: string | null
          "QUANTIDADE VENDIDA"?: string | null
          RECOLHIDO?: string | null
          "SALDO FINAL"?: number | null
          "SALDO INICIAL"?: number | null
          session_id?: number | null
          solicitacao_nf?: string | null
          TIPO?: string | null
          "VALOR CONSIGNADO TOTAL (Custo)"?: string | null
          "VALOR CONSIGNADO TOTAL (Preço Venda)"?: string | null
          "VALOR DEVIDO"?: number | null
          "VALOR VENDA PRODUTO"?: string | null
          "VALOR VENDIDO"?: string | null
        }
        Update: {
          CLIENTE?: string | null
          "COD. PRODUTO"?: number | null
          "CÓDIGO DO CLIENTE"?: number | null
          "CODIGO FUNCIONARIO"?: number | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          CONTAGEM?: number | null
          "DATA DO ACERTO"?: string | null
          "DATA E HORA"?: string | null
          data_combinada?: string | null
          "DESCONTO POR GRUPO"?: string | null
          DETALHES_PAGAMENTO?: Json | null
          FORMA?: string | null
          forma_cobranca?: string | null
          FUNCIONÁRIO?: string | null
          "HORA DO ACERTO"?: string | null
          "ID VENDA ITENS"?: number
          MERCADORIA?: string | null
          nota_fiscal_cadastro?: string | null
          nota_fiscal_emitida?: string | null
          nota_fiscal_venda?: string | null
          "NOVAS CONSIGNAÇÕES"?: string | null
          "NÚMERO DO PEDIDO"?: number | null
          "PREÇO VENDIDO"?: string | null
          "QUANTIDADE VENDIDA"?: string | null
          RECOLHIDO?: string | null
          "SALDO FINAL"?: number | null
          "SALDO INICIAL"?: number | null
          session_id?: number | null
          solicitacao_nf?: string | null
          TIPO?: string | null
          "VALOR CONSIGNADO TOTAL (Custo)"?: string | null
          "VALOR CONSIGNADO TOTAL (Preço Venda)"?: string | null
          "VALOR DEVIDO"?: number | null
          "VALOR VENDA PRODUTO"?: string | null
          "VALOR VENDIDO"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "BANCO_DE_DADOS_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "DATAS DE INVENTÁRIO"
            referencedColumns: ["ID INVENTÁRIO"]
          },
        ]
      }
      boletos: {
        Row: {
          cliente_codigo: number
          cliente_nome: string
          created_at: string
          id: number
          pedido_id: number | null
          status: string
          valor: number
          vencimento: string
        }
        Insert: {
          cliente_codigo: number
          cliente_nome: string
          created_at?: string
          id?: number
          pedido_id?: number | null
          status?: string
          valor: number
          vencimento: string
        }
        Update: {
          cliente_codigo?: number
          cliente_nome?: string
          created_at?: string
          id?: number
          pedido_id?: number | null
          status?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_cliente_codigo_fkey"
            columns: ["cliente_codigo"]
            isOneToOne: false
            referencedRelation: "CLIENTES"
            referencedColumns: ["CODIGO"]
          },
        ]
      }
      brinde: {
        Row: {
          cliente_codigo: number | null
          cliente_nome: string | null
          created_at: string | null
          data: string | null
          funcionario_id: number | null
          funcionario_nome: string | null
          id: number
          produto_codigo: number | null
          produto_nome: string | null
          quantidade: number | null
        }
        Insert: {
          cliente_codigo?: number | null
          cliente_nome?: string | null
          created_at?: string | null
          data?: string | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          produto_codigo?: number | null
          produto_nome?: string | null
          quantidade?: number | null
        }
        Update: {
          cliente_codigo?: number | null
          cliente_nome?: string | null
          created_at?: string | null
          data?: string | null
          funcionario_id?: number | null
          funcionario_nome?: string | null
          id?: number
          produto_codigo?: number | null
          produto_nome?: string | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brinde_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
      }
      CLIENTES: {
        Row: {
          "ALTERAÇÃO CLIENTE": string | null
          BAIRRO: string | null
          "CEP OFICIO": string | null
          CNPJ: string | null
          CODIGO: number
          "CONTATO 1": string | null
          "CONTATO 2": string | null
          Desconto: string | null
          "DESCONTO ACESSORIO": string | null
          "DESCONTO ACESSORIO CELULAR": string | null
          "DESCONTO BRINQUEDO": string | null
          "DESCONTO OUTROS": string | null
          EMAIL: string | null
          email_cobranca: string | null
          ENDEREÇO: string | null
          EXPOSITOR: string | null
          "FONE 1": string | null
          "FONE 2": string | null
          "FORMA DE PAGAMENTO": string | null
          GRUPO: string | null
          "GRUPO ROTA": string | null
          IE: string | null
          MUNICÍPIO: string | null
          "NOME CLIENTE": string | null
          "NOTA FISCAL": string | null
          "OBSERVAÇÃO FIXA": string | null
          "RAZÃO SOCIAL": string | null
          situacao: string | null
          telefone_cobranca: string | null
          TIPO: string | null
          "TIPO DE CLIENTE": string
        }
        Insert: {
          "ALTERAÇÃO CLIENTE"?: string | null
          BAIRRO?: string | null
          "CEP OFICIO"?: string | null
          CNPJ?: string | null
          CODIGO: number
          "CONTATO 1"?: string | null
          "CONTATO 2"?: string | null
          Desconto?: string | null
          "DESCONTO ACESSORIO"?: string | null
          "DESCONTO ACESSORIO CELULAR"?: string | null
          "DESCONTO BRINQUEDO"?: string | null
          "DESCONTO OUTROS"?: string | null
          EMAIL?: string | null
          email_cobranca?: string | null
          ENDEREÇO?: string | null
          EXPOSITOR?: string | null
          "FONE 1"?: string | null
          "FONE 2"?: string | null
          "FORMA DE PAGAMENTO"?: string | null
          GRUPO?: string | null
          "GRUPO ROTA"?: string | null
          IE?: string | null
          MUNICÍPIO?: string | null
          "NOME CLIENTE"?: string | null
          "NOTA FISCAL"?: string | null
          "OBSERVAÇÃO FIXA"?: string | null
          "RAZÃO SOCIAL"?: string | null
          situacao?: string | null
          telefone_cobranca?: string | null
          TIPO?: string | null
          "TIPO DE CLIENTE"?: string
        }
        Update: {
          "ALTERAÇÃO CLIENTE"?: string | null
          BAIRRO?: string | null
          "CEP OFICIO"?: string | null
          CNPJ?: string | null
          CODIGO?: number
          "CONTATO 1"?: string | null
          "CONTATO 2"?: string | null
          Desconto?: string | null
          "DESCONTO ACESSORIO"?: string | null
          "DESCONTO ACESSORIO CELULAR"?: string | null
          "DESCONTO BRINQUEDO"?: string | null
          "DESCONTO OUTROS"?: string | null
          EMAIL?: string | null
          email_cobranca?: string | null
          ENDEREÇO?: string | null
          EXPOSITOR?: string | null
          "FONE 1"?: string | null
          "FONE 2"?: string | null
          "FORMA DE PAGAMENTO"?: string | null
          GRUPO?: string | null
          "GRUPO ROTA"?: string | null
          IE?: string | null
          MUNICÍPIO?: string | null
          "NOME CLIENTE"?: string | null
          "NOTA FISCAL"?: string | null
          "OBSERVAÇÃO FIXA"?: string | null
          "RAZÃO SOCIAL"?: string | null
          situacao?: string | null
          telefone_cobranca?: string | null
          TIPO?: string | null
          "TIPO DE CLIENTE"?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          id: number
          valor: string | null
        }
        Insert: {
          chave: string
          id?: number
          valor?: string | null
        }
        Update: {
          chave?: string
          id?: number
          valor?: string | null
        }
        Relationships: []
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
      "DATAS DE INVENTÁRIO": {
        Row: {
          "CODIGO FUNCIONARIO": number | null
          "Data de Fechamento de Inventário": string | null
          "Data de Início de Inventário": string | null
          "ID INVENTÁRIO": number
          TIPO: string | null
        }
        Insert: {
          "CODIGO FUNCIONARIO"?: number | null
          "Data de Fechamento de Inventário"?: string | null
          "Data de Início de Inventário"?: string | null
          "ID INVENTÁRIO"?: number
          TIPO?: string | null
        }
        Update: {
          "CODIGO FUNCIONARIO"?: number | null
          "Data de Fechamento de Inventário"?: string | null
          "Data de Início de Inventário"?: string | null
          "ID INVENTÁRIO"?: number
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
          banco_outro: string | null
          banco_pagamento: string | null
          Data: string | null
          data_lancamento: string | null
          Detalhamento: string
          funcionario_id: number
          "Grupo de Despesas": string
          hodometro: number | null
          id: number
          prestador_servico: string | null
          rota_id: number | null
          saiu_do_caixa: boolean | null
          status: string | null
          tipo_combustivel: string | null
          tipo_servico: string | null
          Valor: number
          veiculo_id: number | null
        }
        Insert: {
          banco_outro?: string | null
          banco_pagamento?: string | null
          Data?: string | null
          data_lancamento?: string | null
          Detalhamento: string
          funcionario_id: number
          "Grupo de Despesas": string
          hodometro?: number | null
          id?: number
          prestador_servico?: string | null
          rota_id?: number | null
          saiu_do_caixa?: boolean | null
          status?: string | null
          tipo_combustivel?: string | null
          tipo_servico?: string | null
          Valor: number
          veiculo_id?: number | null
        }
        Update: {
          banco_outro?: string | null
          banco_pagamento?: string | null
          Data?: string | null
          data_lancamento?: string | null
          Detalhamento?: string
          funcionario_id?: number
          "Grupo de Despesas"?: string
          hodometro?: number | null
          id?: number
          prestador_servico?: string | null
          rota_id?: number | null
          saiu_do_caixa?: boolean | null
          status?: string | null
          tipo_combustivel?: string | null
          tipo_servico?: string | null
          Valor?: number
          veiculo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "DESPESAS_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DESPESAS_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "ROTA"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DESPESAS_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "VEICULOS"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_categorias: {
        Row: {
          created_at: string
          id: number
          nome: string
          recorrente: boolean
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
          recorrente?: boolean
          tipo: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
          recorrente?: boolean
          tipo?: string
        }
        Relationships: []
      }
      dre_lancamentos: {
        Row: {
          categoria: string | null
          created_at: string
          data_lancamento: string
          id: number
          mes_referencia: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_lancamento: string
          id?: number
          mes_referencia: string
          tipo: string
          valor?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_lancamento?: string
          id?: number
          mes_referencia?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      "ESTOQUE CARRO AJUSTES": {
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
            foreignKeyName: "ESTOQUE CARRO AJUSTES_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO AJUSTES_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO CONTAGEM": {
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
            foreignKeyName: "ESTOQUE CARRO CONTAGEM_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO CONTAGEM_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO CONTAGEM_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO DIFERENÇAS": {
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
            foreignKeyName: "ESTOQUE CARRO DIFERENÇAS_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO DIFERENÇAS_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO SALDO FINAL": {
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
            foreignKeyName: "ESTOQUE CARRO SALDO FINAL_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO SALDO FINAL_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO SALDO FINAL_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO SALDO INICIAL": {
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
            foreignKeyName: "ESTOQUE CARRO SALDO INICIAL_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO SALDO INICIAL_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO SALDO INICIAL_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO: CARRO PARA O CLIENTE": {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          created_at: string | null
          data_horario: string | null
          funcionario: string | null
          id: number
          id_estoque_carro: number
          pedido: number | null
          preco: number | null
          produto: string | null
          produto_id: number | null
          quantidade: number | null
          SAIDAS_carro_cliente: number | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          funcionario?: string | null
          id?: number
          id_estoque_carro: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
          SAIDAS_carro_cliente?: number | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          funcionario?: string | null
          id?: number
          id_estoque_carro?: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
          SAIDAS_carro_cliente?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ESTOQUE CARRO: CARRO PARA O CLIENTE_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO: CARRO PARA O CLIENTE_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO: CARRO PARA O ESTOQUE": {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          created_at: string | null
          data_horario: string | null
          funcionario: string | null
          id: number
          id_estoque_carro: number
          pedido: number | null
          preco: number | null
          produto: string | null
          produto_id: number | null
          quantidade: number | null
          SAIDAS_carro_estoque: number | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          funcionario?: string | null
          id?: number
          id_estoque_carro: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
          SAIDAS_carro_estoque?: number | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          funcionario?: string | null
          id?: number
          id_estoque_carro?: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
          SAIDAS_carro_estoque?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ESTOQUE CARRO: CARRO PARA O ESTOQUE_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO: CARRO PARA O ESTOQUE_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO: CLIENTE PARA O CARRO": {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          created_at: string | null
          data_horario: string | null
          ENTRADAS_cliente_carro: number | null
          funcionario: string | null
          id: number
          id_estoque_carro: number
          pedido: number | null
          preco: number | null
          produto: string | null
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          ENTRADAS_cliente_carro?: number | null
          funcionario?: string | null
          id?: number
          id_estoque_carro: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          ENTRADAS_cliente_carro?: number | null
          funcionario?: string | null
          id?: number
          id_estoque_carro?: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ESTOQUE CARRO: CLIENTE PARA O CARRO_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO: CLIENTE PARA O CARRO_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE CARRO: ESTOQUE PARA O CARRO": {
        Row: {
          barcode: string | null
          codigo_produto: number | null
          created_at: string | null
          data_horario: string | null
          ENTRADAS_estoque_carro: number | null
          funcionario: string | null
          id: number
          id_estoque_carro: number
          pedido: number | null
          preco: number | null
          produto: string | null
          produto_id: number | null
          quantidade: number | null
        }
        Insert: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          ENTRADAS_estoque_carro?: number | null
          funcionario?: string | null
          id?: number
          id_estoque_carro: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Update: {
          barcode?: string | null
          codigo_produto?: number | null
          created_at?: string | null
          data_horario?: string | null
          ENTRADAS_estoque_carro?: number | null
          funcionario?: string | null
          id?: number
          id_estoque_carro?: number
          pedido?: number | null
          preco?: number | null
          produto?: string | null
          produto_id?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ESTOQUE CARRO: ESTOQUE PARA O CARRO_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE CARRO: ESTOQUE PARA O CARRO_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      "ESTOQUE GERAL AJUSTES": {
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
            foreignKeyName: "ESTOQUE GERAL AJUSTES_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      "ESTOQUE GERAL CARRO PARA ESTOQUE": {
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
            foreignKeyName: "ESTOQUE GERAL CARRO PARA ESTOQUE_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE GERAL CARRO PARA ESTOQUE_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      "ESTOQUE GERAL COMPRAS": {
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
            foreignKeyName: "ESTOQUE GERAL COMPRAS_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "FORNECEDORES"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE GERAL COMPRAS_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      "ESTOQUE GERAL CONTAGEM": {
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
            foreignKeyName: "ESTOQUE GERAL CONTAGEM_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      "ESTOQUE GERAL ESTOQUE PARA CARRO": {
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
            foreignKeyName: "ESTOQUE GERAL ESTOQUE PARA CARRO_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ESTOQUE GERAL ESTOQUE PARA CARRO_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      "ESTOQUE GERAL SAÍDAS PERDAS": {
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
            foreignKeyName: "ESTOQUE GERAL SAÍDAS PERDAS_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      "ESTOQUE GERAL SALDO INICIAL": {
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
            foreignKeyName: "ESTOQUE GERAL SALDO INICIAL_id_inventario_fkey"
            columns: ["id_inventario"]
            isOneToOne: false
            referencedRelation: "ID Inventário"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamento_caixa: {
        Row: {
          boleto_aprovado: boolean | null
          cheque_aprovado: boolean | null
          created_at: string
          desconto_total: number | null
          despesas_aprovadas: boolean | null
          dinheiro_aprovado: boolean | null
          funcionario_id: number
          id: number
          pix_aprovado: boolean | null
          recolhido_at: string | null
          recolhido_por_id: number | null
          responsavel_id: number | null
          rota_id: number
          saldo_acerto: number | null
          saldo_acerto_aprovado: boolean | null
          status: string | null
          valor_a_receber: number | null
          valor_boleto: number | null
          valor_cheque: number | null
          valor_despesas: number | null
          valor_dinheiro: number | null
          valor_pix: number | null
          venda_total: number | null
        }
        Insert: {
          boleto_aprovado?: boolean | null
          cheque_aprovado?: boolean | null
          created_at?: string
          desconto_total?: number | null
          despesas_aprovadas?: boolean | null
          dinheiro_aprovado?: boolean | null
          funcionario_id: number
          id?: number
          pix_aprovado?: boolean | null
          recolhido_at?: string | null
          recolhido_por_id?: number | null
          responsavel_id?: number | null
          rota_id: number
          saldo_acerto?: number | null
          saldo_acerto_aprovado?: boolean | null
          status?: string | null
          valor_a_receber?: number | null
          valor_boleto?: number | null
          valor_cheque?: number | null
          valor_despesas?: number | null
          valor_dinheiro?: number | null
          valor_pix?: number | null
          venda_total?: number | null
        }
        Update: {
          boleto_aprovado?: boolean | null
          cheque_aprovado?: boolean | null
          created_at?: string
          desconto_total?: number | null
          despesas_aprovadas?: boolean | null
          dinheiro_aprovado?: boolean | null
          funcionario_id?: number
          id?: number
          pix_aprovado?: boolean | null
          recolhido_at?: string | null
          recolhido_por_id?: number | null
          responsavel_id?: number | null
          rota_id?: number
          saldo_acerto?: number | null
          saldo_acerto_aprovado?: boolean | null
          status?: string | null
          valor_a_receber?: number | null
          valor_boleto?: number | null
          valor_cheque?: number | null
          valor_despesas?: number | null
          valor_dinheiro?: number | null
          valor_pix?: number | null
          venda_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_caixa_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_caixa_recolhido_por_id_fkey"
            columns: ["recolhido_por_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_caixa_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_caixa_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "ROTA"
            referencedColumns: ["id"]
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
      "ID ESTOQUE CARRO": {
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
            foreignKeyName: "ID ESTOQUE CARRO_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
      }
      "ID Inventário": {
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
      inativar_clientes: {
        Row: {
          cliente_codigo: number
          cliente_nome: string | null
          created_at: string
          debito: number | null
          expositor_retirado: boolean | null
          funcionario_nome: string | null
          id: number
          observacoes_expositor: string | null
          pedido_id: number
          saldo_a_pagar: number | null
          status: string | null
          valor_pago: number | null
          valor_venda: number | null
        }
        Insert: {
          cliente_codigo: number
          cliente_nome?: string | null
          created_at?: string
          debito?: number | null
          expositor_retirado?: boolean | null
          funcionario_nome?: string | null
          id?: number
          observacoes_expositor?: string | null
          pedido_id: number
          saldo_a_pagar?: number | null
          status?: string | null
          valor_pago?: number | null
          valor_venda?: number | null
        }
        Update: {
          cliente_codigo?: number
          cliente_nome?: string | null
          created_at?: string
          debito?: number | null
          expositor_retirado?: boolean | null
          funcionario_nome?: string | null
          id?: number
          observacoes_expositor?: string | null
          pedido_id?: number
          saldo_a_pagar?: number | null
          status?: string | null
          valor_pago?: number | null
          valor_venda?: number | null
        }
        Relationships: []
      }
      kit_items: {
        Row: {
          id: number
          kit_id: number
          produto_id: number
          quantidade_padrao: number
        }
        Insert: {
          id?: number
          kit_id: number
          produto_id: number
          quantidade_padrao?: number
        }
        Update: {
          id?: number
          kit_id?: number
          produto_id?: number
          quantidade_padrao?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
        ]
      }
      kits: {
        Row: {
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      meta_excecoes: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string
          funcionario_id: number | null
          id: number
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao: string
          funcionario_id?: number | null
          id?: number
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string
          funcionario_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_excecoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_funcionarios: {
        Row: {
          created_at: string
          funcionario_id: number
          id: number
          meta_diaria: number
          meta_mensal: number | null
        }
        Insert: {
          created_at?: string
          funcionario_id: number
          id?: number
          meta_diaria?: number
          meta_mensal?: number | null
        }
        Update: {
          created_at?: string
          funcionario_id?: number
          id?: number
          meta_diaria?: number
          meta_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: true
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_periodos: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          funcionario_id: number
          id: number
          valor_meta: number
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          funcionario_id: number
          id?: number
          valor_meta: number
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          funcionario_id?: number
          id?: number
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_periodos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
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
          responsavel_id: number | null
        }
        Insert: {
          cliente_id: number
          created_at?: string | null
          descricao_pendencia: string
          descricao_resolucao?: string | null
          funcionario_id: number
          id?: number
          resolvida?: boolean
          responsavel_id?: number | null
        }
        Update: {
          cliente_id?: number
          created_at?: string | null
          descricao_pendencia?: string
          descricao_resolucao?: string | null
          funcionario_id?: number
          id?: number
          resolvida?: boolean
          responsavel_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "PENDENCIAS_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "CLIENTES"
            referencedColumns: ["CODIGO"]
          },
          {
            foreignKeyName: "PENDENCIAS_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PENDENCIAS_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
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
          banco_pix: string | null
          confirmado_por: string | null
          created_at: string
          data_pix_realizado: string | null
          id: number
          nome_no_pix: string | null
          recebimento_id: number
          venda_id: number | null
        }
        Insert: {
          banco_pix?: string | null
          confirmado_por?: string | null
          created_at?: string
          data_pix_realizado?: string | null
          id?: number
          nome_no_pix?: string | null
          recebimento_id: number
          venda_id?: number | null
        }
        Update: {
          banco_pix?: string | null
          confirmado_por?: string | null
          created_at?: string
          data_pix_realizado?: string | null
          id?: number
          nome_no_pix?: string | null
          recebimento_id?: number
          venda_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "PIX_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: true
            referencedRelation: "RECEBIMENTOS"
            referencedColumns: ["id"]
          },
        ]
      }
      PRODUTOS: {
        Row: {
          CODIGO: number | null
          "CÓDIGO BARRAS": string | null
          codigo_interno: string | null
          "DESCRIÇÃO RESUMIDA": string | null
          FREQUENTES: string | null
          GRUPO: string | null
          ID: number
          PREÇO: string | null
          PRODUTO: string | null
          TIPO: string | null
        }
        Insert: {
          CODIGO?: number | null
          "CÓDIGO BARRAS"?: string | null
          codigo_interno?: string | null
          "DESCRIÇÃO RESUMIDA"?: string | null
          FREQUENTES?: string | null
          GRUPO?: string | null
          ID: number
          PREÇO?: string | null
          PRODUTO?: string | null
          TIPO?: string | null
        }
        Update: {
          CODIGO?: number | null
          "CÓDIGO BARRAS"?: string | null
          codigo_interno?: string | null
          "DESCRIÇÃO RESUMIDA"?: string | null
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
          data_pagamento: string | null
          forma_cobranca: string | null
          forma_pagamento: string
          funcionario_id: number
          id: number
          ID_da_fêmea: number | null
          motivo: string | null
          rota_id: number | null
          valor_pago: number
          valor_registrado: number | null
          vencimento: string | null
          venda_id: number
        }
        Insert: {
          cliente_id: number
          created_at?: string | null
          data_combinada?: string | null
          data_pagamento?: string | null
          forma_cobranca?: string | null
          forma_pagamento: string
          funcionario_id: number
          id?: number
          ID_da_fêmea?: number | null
          motivo?: string | null
          rota_id?: number | null
          valor_pago: number
          valor_registrado?: number | null
          vencimento?: string | null
          venda_id: number
        }
        Update: {
          cliente_id?: number
          created_at?: string | null
          data_combinada?: string | null
          data_pagamento?: string | null
          forma_cobranca?: string | null
          forma_pagamento?: string
          funcionario_id?: number
          id?: number
          ID_da_fêmea?: number | null
          motivo?: string | null
          rota_id?: number | null
          valor_pago?: number
          valor_registrado?: number | null
          vencimento?: string | null
          venda_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "RECEBIMENTOS_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "CLIENTES"
            referencedColumns: ["CODIGO"]
          },
          {
            foreignKeyName: "RECEBIMENTOS_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "RECEBIMENTOS_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "ROTA"
            referencedColumns: ["id"]
          },
        ]
      }
      RELATORIO_DE_ESTOQUE: {
        Row: {
          cliente_nome: string | null
          codigo_cliente: number | null
          created_at: string
          data_hora_acerto: string | null
          estoque_final: number | null
          estoque_por_produto: number | null
          id: number
          numero_pedido: number | null
          preco_vendido: number | null
          produto_nome: string | null
          saldo_final: number | null
        }
        Insert: {
          cliente_nome?: string | null
          codigo_cliente?: number | null
          created_at?: string
          data_hora_acerto?: string | null
          estoque_final?: number | null
          estoque_por_produto?: number | null
          id?: number
          numero_pedido?: number | null
          preco_vendido?: number | null
          produto_nome?: string | null
          saldo_final?: number | null
        }
        Update: {
          cliente_nome?: string | null
          codigo_cliente?: number | null
          created_at?: string
          data_hora_acerto?: string | null
          estoque_final?: number | null
          estoque_por_produto?: number | null
          id?: number
          numero_pedido?: number | null
          preco_vendido?: number | null
          produto_nome?: string | null
          saldo_final?: number | null
        }
        Relationships: []
      }
      "REPOSIÇÃO E DEVOLUÇÃO": {
        Row: {
          created_at: string | null
          funcionario_id: number | null
          id: number
          id_estoque_carro: number | null
          produto_id: number | null
          quantidade: number
          session_id: number | null
          TIPO: string
        }
        Insert: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          id_estoque_carro?: number | null
          produto_id?: number | null
          quantidade: number
          session_id?: number | null
          TIPO: string
        }
        Update: {
          created_at?: string | null
          funcionario_id?: number | null
          id?: number
          id_estoque_carro?: number | null
          produto_id?: number | null
          quantidade?: number
          session_id?: number | null
          TIPO?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reposicao_estoque_carro"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "REPOSIÇÃO E DEVOLUÇÃO_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "REPOSIÇÃO E DEVOLUÇÃO_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "PRODUTOS"
            referencedColumns: ["ID"]
          },
          {
            foreignKeyName: "REPOSIÇÃO E DEVOLUÇÃO_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "DATAS DE INVENTÁRIO"
            referencedColumns: ["ID INVENTÁRIO"]
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
          tarefas: string | null
          vendedor_id: number | null
          vendedor_proximo_id: number | null
          x_na_rota: number | null
        }
        Insert: {
          agregado?: boolean | null
          boleto?: boolean | null
          cliente_id?: number | null
          id?: number
          rota_id?: number | null
          tarefas?: string | null
          vendedor_id?: number | null
          vendedor_proximo_id?: number | null
          x_na_rota?: number | null
        }
        Update: {
          agregado?: boolean | null
          boleto?: boolean | null
          cliente_id?: number | null
          id?: number
          rota_id?: number | null
          tarefas?: string | null
          vendedor_id?: number | null
          vendedor_proximo_id?: number | null
          x_na_rota?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ROTA_ITEMS_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "CLIENTES"
            referencedColumns: ["CODIGO"]
          },
          {
            foreignKeyName: "ROTA_ITEMS_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "ROTA"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ROTA_ITEMS_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ROTA_ITEMS_vendedor_proximo_id_fkey"
            columns: ["vendedor_proximo_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_motoqueiro_km: {
        Row: {
          created_at: string
          data_hora: string
          funcionario_id: number
          id: number
          km_percorrido: number
        }
        Insert: {
          created_at?: string
          data_hora: string
          funcionario_id: number
          id?: number
          km_percorrido: number
        }
        Update: {
          created_at?: string
          data_hora?: string
          funcionario_id?: number
          id?: number
          km_percorrido?: number
        }
        Relationships: [
          {
            foreignKeyName: "rota_motoqueiro_km_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
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
            foreignKeyName: "sessoes_inventario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
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
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "FUNCIONARIOS"
            referencedColumns: ["id"]
          },
        ]
      }
      VEICULOS: {
        Row: {
          created_at: string
          hodometro_cadastro: number | null
          id: number
          placa: string
          status: string
        }
        Insert: {
          created_at?: string
          hodometro_cadastro?: number | null
          id?: number
          placa: string
          status?: string
        }
        Update: {
          created_at?: string
          hodometro_cadastro?: number | null
          id?: number
          placa?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      client_stats_view: {
        Row: {
          client_id: number | null
          max_data_acerto: string | null
          max_pedido: number | null
        }
        Relationships: []
      }
      debitos_com_total_view: {
        Row: {
          cliente_codigo: number | null
          cliente_nome: string | null
          created_at: string | null
          data_acerto: string | null
          debito: number | null
          debito_total: number | null
          desconto: number | null
          hora_acerto: string | null
          id: number | null
          media_mensal: number | null
          pedido_id: number | null
          rota: string | null
          rota_id: number | null
          saldo_a_pagar: number | null
          valor_pago: number | null
          valor_venda: number | null
          vendedor_nome: string | null
        }
        Relationships: []
      }
      view_client_latest_consigned_value: {
        Row: {
          client_id: number | null
          total_consigned_value: number | null
        }
        Relationships: []
      }
      view_collection_action_counts: {
        Row: {
          action_count: number | null
          pedido_id: number | null
          target_forma_pagamento: string | null
          target_vencimento: string | null
        }
        Relationships: []
      }
      view_delivery_history: {
        Row: {
          codigo_cliente: number | null
          codigo_produto: number | null
          data_movimento: string | null
          funcionario: string | null
          id: number | null
          id_estoque_carro: number | null
          nome_cliente: string | null
          pedido: number | null
          produto: string | null
          quantidade: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ESTOQUE CARRO: CARRO PARA O CLIENTE_id_estoque_carro_fkey"
            columns: ["id_estoque_carro"]
            isOneToOne: false
            referencedRelation: "ID ESTOQUE CARRO"
            referencedColumns: ["id"]
          },
        ]
      }
      view_latest_collection_actions: {
        Row: {
          acao: string | null
          action_id: number | null
          cliente_id: number | null
          data_acao: string | null
          funcionario_nome: string | null
          installment_forma_pagamento: string | null
          installment_id: number | null
          installment_valor: number | null
          installment_vencimento: string | null
          nova_data_combinada: string | null
          pedido_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_finalize_overdue_routes: { Args: never; Returns: Json }
      btrim:
        | { Args: { d: string }; Returns: string }
        | { Args: { t: string }; Returns: string }
      bulk_update_product_codes: { Args: { payload: Json }; Returns: undefined }
      delete_full_order: { Args: { p_order_id: number }; Returns: undefined }
      get_client_projections: {
        Args: never
        Returns: {
          client_id: number
          dias_entre_acertos: number
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
      get_top_selling_items_v2: {
        Args: {
          end_date: string
          p_funcionario_id?: number
          start_date: string
        }
        Returns: {
          produto_codigo: number
          produto_nome: string
          quantidade_total: number
          valor_total: number
        }[]
      }
      get_top_selling_items_v3: {
        Args: {
          end_date: string
          p_funcionario_id?: number
          p_grupo?: string
          start_date: string
        }
        Returns: {
          estoque_inicial_total: number
          produto_codigo: number
          produto_nome: string
          quantidade_total: number
          valor_total: number
        }[]
      }
      get_top_selling_items_v4: {
        Args: {
          end_date: string
          p_funcionario_id?: number
          p_grupo?: string
          start_date: string
        }
        Returns: {
          estoque_inicial_total: number
          produto_codigo: number
          produto_nome: string
          quantidade_total: number
          tipo: string
          valor_total: number
        }[]
      }
      get_top_selling_items_v5: {
        Args: {
          end_date: string
          p_funcionario_id?: number
          p_grupo?: string
          start_date: string
        }
        Returns: {
          estoque_inicial_total: number
          grupo: string
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
      get_unique_product_types: {
        Args: never
        Returns: {
          tipo: string
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
      parse_currency_sql:
        | {
            Args: { val_str: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.parse_currency_sql(val_str => text), public.parse_currency_sql(val_str => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { val_str: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.parse_currency_sql(val_str => text), public.parse_currency_sql(val_str => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
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
      transfer_unattended_items: {
        Args: { p_new_rota_id: number; p_old_rota_id: number }
        Returns: undefined
      }
      transfer_unattended_items_v2: {
        Args: { p_new_rota_id: number; p_old_rota_id: number }
        Returns: undefined
      }
      transfer_unattended_items_v3: {
        Args: { p_new_rota_id: number; p_old_rota_id: number }
        Returns: undefined
      }
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


// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: AJUSTE_SALDO_INICIAL
//   id: bigint (not null)
//   numero_pedido: bigint (nullable)
//   cliente_id: bigint (not null)
//   cliente_nome: text (nullable)
//   vendedor_id: bigint (nullable)
//   vendedor_nome: text (nullable)
//   data_acerto: timestamp with time zone (nullable, default: now())
//   saldo_anterior: numeric (nullable)
//   saldo_novo: numeric (nullable)
//   quantidade_alterada: numeric (nullable)
//   produto_id: bigint (not null)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: AÇOES DE COBRANÇA_BACKUP
//   ID AÇÃO: integer (not null)
//   CLIENTE: text (nullable)
//   COD. CLIENTE: integer (nullable)
//   CÓDIGO FUNCIONÁRIO: integer (nullable)
//   NOME FUNCIONÁRIO: text (nullable)
//   DATA AÇÃO COBRANÇA: date (nullable)
//   AÇÃO DE COBRANÇA: text (nullable)
//   NOVA DATA COMBINADA PAGAMENTO: date (nullable)
//   NÚMERO DO PEDIDO: integer (nullable)
// Table: BANCO_DE_DADOS
//   ID VENDA ITENS: bigint (not null)
//   NÚMERO DO PEDIDO: bigint (nullable)
//   CODIGO FUNCIONARIO: bigint (nullable)
//   FUNCIONÁRIO: text (nullable)
//   CÓDIGO DO CLIENTE: bigint (nullable)
//   CLIENTE: text (nullable)
//   DATA DO ACERTO: date (nullable)
//   DESCONTO POR GRUPO: text (nullable)
//   COD. PRODUTO: bigint (nullable)
//   MERCADORIA: text (nullable)
//   TIPO: text (nullable)
//   PREÇO VENDIDO: text (nullable)
//   SALDO INICIAL: bigint (nullable)
//   CONTAGEM: bigint (nullable)
//   QUANTIDADE VENDIDA: text (nullable)
//   VALOR VENDIDO: text (nullable)
//   NOVAS CONSIGNAÇÕES: text (nullable)
//   RECOLHIDO: text (nullable)
//   SALDO FINAL: bigint (nullable)
//   VALOR VENDA PRODUTO: text (nullable)
//   VALOR CONSIGNADO TOTAL (Preço Venda): text (nullable)
//   VALOR CONSIGNADO TOTAL (Custo): text (nullable)
//   FORMA: text (nullable)
//   HORA DO ACERTO: text (nullable)
//   DETALHES_PAGAMENTO: jsonb (nullable)
//   VALOR DEVIDO: numeric (nullable)
//   forma_cobranca: text (nullable)
//   data_combinada: date (nullable)
//   nota_fiscal_emitida: text (nullable, default: 'Pendente'::text)
//   nota_fiscal_cadastro: text (nullable)
//   nota_fiscal_venda: text (nullable)
//   session_id: integer (nullable)
//   solicitacao_nf: text (nullable, default: 'NÃO'::text)
//   DATA E HORA: timestamp with time zone (nullable)
//   codigo_interno: text (nullable)
//   codigo_barras: text (nullable)
// Table: CLIENTES
//   CODIGO: bigint (not null)
//   NOME CLIENTE: text (nullable)
//   TIPO: text (nullable)
//   RAZÃO SOCIAL: text (nullable)
//   Desconto: text (nullable)
//   EXPOSITOR: text (nullable)
//   CNPJ: text (nullable)
//   IE: text (nullable)
//   ENDEREÇO: text (nullable)
//   BAIRRO: text (nullable)
//   MUNICÍPIO: text (nullable)
//   FONE 1: text (nullable)
//   CONTATO 1: text (nullable)
//   FONE 2: text (nullable)
//   CONTATO 2: text (nullable)
//   EMAIL: text (nullable)
//   TIPO DE CLIENTE: text (not null, default: 'ATIVO'::text)
//   CEP OFICIO: text (nullable)
//   OBSERVAÇÃO FIXA: text (nullable)
//   NOTA FISCAL: text (nullable)
//   FORMA DE PAGAMENTO: text (nullable)
//   ALTERAÇÃO CLIENTE: text (nullable)
//   DESCONTO ACESSORIO CELULAR: text (nullable)
//   DESCONTO BRINQUEDO: text (nullable)
//   DESCONTO ACESSORIO: text (nullable)
//   DESCONTO OUTROS: text (nullable)
//   GRUPO: text (nullable)
//   GRUPO ROTA: text (nullable)
//   situacao: text (nullable, default: 'ATIVO'::text)
//   telefone_cobranca: text (nullable)
//   email_cobranca: text (nullable)
// Table: CRIAR_NOVA_ROTA
//   id: bigint (not null)
//   nome_rota: text (not null)
// Table: DATAS DE INVENTÁRIO
//   ID INVENTÁRIO: integer (not null, default: nextval('"DATAS DE INVENTÁRIO_ID INVENTÁRIO_seq"'::regclass))
//   Data de Início de Inventário: timestamp with time zone (nullable, default: now())
//   Data de Fechamento de Inventário: timestamp with time zone (nullable)
//   TIPO: text (nullable)
//   CODIGO FUNCIONARIO: integer (nullable)
// Table: DESPESAS
//   id: bigint (not null)
//   Data: timestamp with time zone (nullable, default: now())
//   Grupo de Despesas: text (not null)
//   Detalhamento: text (not null)
//   Valor: numeric (not null)
//   funcionario_id: bigint (not null)
//   saiu_do_caixa: boolean (nullable, default: true)
//   hodometro: numeric (nullable)
//   veiculo_id: integer (nullable)
//   prestador_servico: text (nullable)
//   tipo_servico: text (nullable)
//   tipo_combustivel: text (nullable, default: 'alcool'::text)
//   rota_id: bigint (nullable)
//   status: text (nullable, default: 'A confirmar'::text)
//   banco_pagamento: text (nullable)
//   banco_outro: text (nullable)
//   data_lancamento: date (nullable)
// Table: ESTOQUE CARRO AJUSTES
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   timestamp: timestamp with time zone (nullable, default: now())
//   produto_id: bigint (not null)
//   diferenca_quantidade: integer (nullable, default: 0)
//   diferenca_valor: numeric (nullable, default: 0)
//   ajuste_manual: integer (nullable, default: 0)
//   novo_saldo: integer (nullable, default: 0)
// Table: ESTOQUE CARRO CONTAGEM
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   timestamp: timestamp with time zone (nullable, default: now())
//   funcionario_nome: text (nullable)
//   funcionario_id: bigint (nullable)
//   produto_id: bigint (not null)
//   quantidade: integer (nullable, default: 0)
// Table: ESTOQUE CARRO DIFERENÇAS
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   produto_id: bigint (nullable)
//   diferenca_qtd: integer (nullable)
//   diferenca_val: numeric (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: ESTOQUE CARRO SALDO FINAL
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   timestamp: timestamp with time zone (nullable, default: now())
//   funcionario_nome: text (nullable)
//   funcionario_id: bigint (nullable)
//   produto_id: bigint (not null)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   saldo_final: integer (nullable, default: 0)
// Table: ESTOQUE CARRO SALDO INICIAL
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   timestamp: timestamp with time zone (nullable, default: now())
//   funcionario_nome: text (nullable)
//   funcionario_id: bigint (nullable)
//   produto_id: bigint (not null)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   saldo_inicial: integer (nullable, default: 0)
// Table: ESTOQUE CARRO: CARRO PARA O CLIENTE
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   produto_id: bigint (nullable)
//   quantidade: integer (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   pedido: bigint (nullable)
//   data_horario: timestamp with time zone (nullable)
//   funcionario: text (nullable)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   SAIDAS_carro_cliente: integer (nullable, default: 0)
// Table: ESTOQUE CARRO: CARRO PARA O ESTOQUE
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   produto_id: bigint (nullable)
//   quantidade: integer (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   pedido: bigint (nullable)
//   data_horario: timestamp with time zone (nullable)
//   funcionario: text (nullable)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   SAIDAS_carro_estoque: integer (nullable, default: 0)
// Table: ESTOQUE CARRO: CLIENTE PARA O CARRO
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   produto_id: bigint (nullable)
//   quantidade: integer (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   pedido: bigint (nullable)
//   data_horario: timestamp with time zone (nullable)
//   funcionario: text (nullable)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   ENTRADAS_cliente_carro: integer (nullable, default: 0)
// Table: ESTOQUE CARRO: ESTOQUE PARA O CARRO
//   id: bigint (not null)
//   id_estoque_carro: bigint (not null)
//   produto_id: bigint (nullable)
//   quantidade: integer (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   pedido: bigint (nullable)
//   data_horario: timestamp with time zone (nullable)
//   funcionario: text (nullable)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   ENTRADAS_estoque_carro: integer (nullable, default: 0)
// Table: ESTOQUE GERAL AJUSTES
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   produto_id: bigint (nullable)
//   ajuste_quantidade: numeric (nullable, default: 0)
//   novo_saldo_final: numeric (nullable, default: 0)
//   diferenca_quantidade: numeric (nullable, default: 0)
//   diferenca_valor: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
// Table: ESTOQUE GERAL CARRO PARA ESTOQUE
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   produto_id: bigint (nullable)
//   quantidade: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
//   funcionario_id: bigint (nullable)
// Table: ESTOQUE GERAL COMPRAS
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   produto_id: bigint (nullable)
//   fornecedor_id: bigint (nullable)
//   fornecedor_nome: text (nullable)
//   compras_quantidade: numeric (nullable, default: 0)
//   valor_unitario: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
// Table: ESTOQUE GERAL CONTAGEM
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   produto_id: bigint (nullable)
//   quantidade: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
// Table: ESTOQUE GERAL ESTOQUE PARA CARRO
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   produto_id: bigint (nullable)
//   quantidade: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
//   funcionario_id: bigint (nullable)
// Table: ESTOQUE GERAL SALDO INICIAL
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   pedido_id: bigint (nullable)
//   timestamp: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
//   funcionario: text (nullable)
//   codigo_produto: bigint (nullable)
//   barcode: text (nullable)
//   produto: text (nullable)
//   preco: numeric (nullable)
//   saldo_inicial: numeric (nullable, default: 0)
//   produto_id: bigint (nullable)
// Table: ESTOQUE GERAL SAÍDAS PERDAS
//   id: bigint (not null)
//   id_inventario: bigint (nullable)
//   produto_id: bigint (nullable)
//   quantidade: numeric (nullable, default: 0)
//   motivo: text (nullable)
//   created_at: timestamp with time zone (nullable, default: timezone('utc'::text, now()))
// Table: FORNECEDORES
//   id: bigint (not null)
//   nome_fornecedor: text (not null)
//   cnpj: text (nullable)
//   endereco: text (nullable)
//   telefone: text (nullable)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   contatos: jsonb (nullable, default: '[]'::jsonb)
// Table: FUNCIONARIOS
//   id: integer (not null, default: nextval('"FUNCIONARIOS_id_seq"'::regclass))
//   nome_completo: text (not null)
//   apelido: text (nullable)
//   cpf: text (nullable)
//   email: text (not null)
//   setor: _text (nullable)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   senha: text (not null, default: '0000'::text)
//   foto_url: text (nullable)
//   situacao: text (not null, default: 'ATIVO'::text)
// Table: ID ESTOQUE CARRO
//   id: bigint (not null)
//   data_inicio: timestamp with time zone (not null, default: now())
//   data_fim: timestamp with time zone (nullable)
//   funcionario_id: bigint (not null)
// Table: ID Inventário
//   id: bigint (not null)
//   data_inicio: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   data_fim: timestamp with time zone (nullable)
//   status: text (nullable, default: 'ABERTO'::text)
// Table: NOTA_FISCAL
//   id: bigint (not null)
//   venda_id: bigint (not null)
//   cliente_id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: PENDENCIAS
//   id: bigint (not null)
//   cliente_id: bigint (not null)
//   funcionario_id: bigint (not null)
//   descricao_pendencia: text (not null)
//   resolvida: boolean (not null, default: false)
//   descricao_resolucao: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   responsavel_id: integer (nullable)
// Table: PIX
//   id: bigint (not null)
//   recebimento_id: bigint (not null)
//   venda_id: bigint (nullable)
//   nome_no_pix: text (nullable)
//   banco_pix: text (nullable, default: 'BS2'::text)
//   data_pix_realizado: timestamp with time zone (nullable)
//   confirmado_por: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: PRODUTOS
//   ID: bigint (not null)
//   CÓDIGO BARRAS: text (nullable)
//   CODIGO: bigint (nullable)
//   PRODUTO: text (nullable)
//   TIPO: text (nullable)
//   PREÇO: text (nullable)
//   GRUPO: text (nullable)
//   DESCRIÇÃO RESUMIDA: text (nullable)
//   FREQUENTES: text (nullable, default: 'NÃO'::text)
//   codigo_interno: text (nullable)
// Table: RECEBIMENTOS
//   id: bigint (not null)
//   venda_id: bigint (not null)
//   cliente_id: bigint (not null)
//   forma_pagamento: text (not null)
//   valor_pago: numeric (not null)
//   vencimento: timestamp with time zone (nullable, default: now())
//   funcionario_id: bigint (not null)
//   created_at: timestamp with time zone (nullable, default: now())
//   valor_registrado: numeric (nullable, default: 0)
//   forma_cobranca: text (nullable)
//   data_combinada: date (nullable)
//   ID_da_fêmea: bigint (nullable)
//   data_pagamento: timestamp with time zone (nullable)
//   motivo: text (nullable)
//   rota_id: integer (nullable)
// Table: RELATORIO_DE_ESTOQUE
//   id: bigint (not null)
//   numero_pedido: bigint (nullable)
//   data_hora_acerto: timestamp with time zone (nullable)
//   codigo_cliente: bigint (nullable)
//   cliente_nome: text (nullable)
//   produto_nome: text (nullable)
//   saldo_final: numeric (nullable)
//   preco_vendido: numeric (nullable)
//   estoque_por_produto: numeric (nullable)
//   estoque_final: numeric (nullable)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: REPOSIÇÃO E DEVOLUÇÃO
//   id: integer (not null, default: nextval('"REPOSIÇÃO E DEVOLUÇÃO_id_seq"'::regclass))
//   TIPO: text (not null)
//   funcionario_id: integer (nullable)
//   produto_id: integer (nullable)
//   quantidade: integer (not null)
//   created_at: timestamp with time zone (nullable, default: now())
//   session_id: integer (nullable)
//   id_estoque_carro: bigint (nullable)
// Table: ROTA
//   id: integer (not null, default: nextval('"ROTA_id_seq"'::regclass))
//   data_inicio: timestamp with time zone (not null)
//   data_fim: timestamp with time zone (nullable)
// Table: ROTA_ITEMS
//   id: integer (not null, default: nextval('"ROTA_ITEMS_id_seq"'::regclass))
//   rota_id: integer (nullable)
//   cliente_id: integer (nullable)
//   x_na_rota: integer (nullable, default: 0)
//   boleto: boolean (nullable, default: false)
//   agregado: boolean (nullable, default: false)
//   vendedor_id: integer (nullable)
//   tarefas: text (nullable, default: ''::text)
//   vendedor_proximo_id: integer (nullable)
// Table: VEICULOS
//   id: integer (not null, default: nextval('"VEICULOS_id_seq"'::regclass))
//   placa: text (not null)
//   status: text (not null, default: 'ATIVO'::text)
//   hodometro_cadastro: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: acoes_cobranca
//   id: bigint (not null)
//   pedido_id: bigint (nullable)
//   acao: text (nullable)
//   data_acao: timestamp with time zone (nullable, default: now())
//   nova_data_combinada: date (nullable)
//   funcionario_nome: text (nullable)
//   funcionario_id: bigint (nullable)
//   cliente_id: bigint (nullable)
//   cliente_nome: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
//   motivo: text (nullable)
//   target_vencimento: timestamp with time zone (nullable)
//   target_forma_pagamento: text (nullable)
// Table: acoes_cobranca_vencimentos
//   id: bigint (not null)
//   acao_cobranca_id: bigint (nullable)
//   vencimento: date (not null)
//   valor: numeric (not null)
//   forma_pagamento: text (nullable)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: boletos
//   id: bigint (not null)
//   cliente_nome: text (not null)
//   cliente_codigo: bigint (not null)
//   status: text (not null, default: 'A Receber'::text)
//   vencimento: date (not null)
//   valor: numeric (not null)
//   pedido_id: bigint (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: brinde
//   id: bigint (not null)
//   cliente_codigo: bigint (nullable)
//   cliente_nome: text (nullable)
//   data: timestamp with time zone (nullable, default: now())
//   produto_codigo: bigint (nullable)
//   produto_nome: text (nullable)
//   quantidade: numeric (nullable)
//   funcionario_id: bigint (nullable)
//   funcionario_nome: text (nullable)
//   created_at: timestamp with time zone (nullable, default: now())
// Table: client_stats_view
//   client_id: bigint (nullable)
//   max_pedido: bigint (nullable)
//   max_data_acerto: date (nullable)
// Table: configuracoes
//   id: bigint (not null)
//   chave: text (not null)
//   valor: text (nullable)
// Table: debitos_com_total_view
//   id: integer (nullable)
//   rota_id: integer (nullable)
//   pedido_id: integer (nullable)
//   data_acerto: timestamp without time zone (nullable)
//   hora_acerto: text (nullable)
//   vendedor_nome: text (nullable)
//   cliente_codigo: integer (nullable)
//   cliente_nome: text (nullable)
//   rota: text (nullable)
//   media_mensal: numeric (nullable)
//   valor_venda: numeric (nullable)
//   desconto: numeric (nullable)
//   saldo_a_pagar: numeric (nullable)
//   valor_pago: numeric (nullable)
//   debito: numeric (nullable)
//   created_at: timestamp without time zone (nullable)
//   debito_total: numeric (nullable)
// Table: debitos_historico
//   id: integer (not null, default: nextval('debitos_historico_id_seq'::regclass))
//   rota_id: integer (nullable)
//   pedido_id: integer (not null)
//   data_acerto: timestamp without time zone (nullable)
//   vendedor_nome: text (nullable)
//   media_mensal: numeric (nullable)
//   valor_venda: numeric (nullable)
//   saldo_a_pagar: numeric (nullable)
//   valor_pago: numeric (nullable)
//   debito: numeric (nullable)
//   created_at: timestamp without time zone (nullable, default: now())
//   cliente_codigo: integer (nullable)
//   cliente_nome: text (nullable)
//   rota: text (nullable)
//   hora_acerto: text (nullable)
//   desconto: numeric (nullable, default: 0)
// Table: dre_categorias
//   id: bigint (not null)
//   nome: text (not null)
//   tipo: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   recorrente: boolean (not null, default: false)
// Table: dre_lancamentos
//   id: bigint (not null)
//   mes_referencia: text (not null)
//   data_lancamento: date (not null)
//   tipo: text (not null)
//   categoria: text (nullable)
//   valor: numeric (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
// Table: fechamento_caixa
//   id: bigint (not null)
//   rota_id: bigint (not null)
//   funcionario_id: bigint (not null)
//   venda_total: numeric (nullable, default: 0)
//   desconto_total: numeric (nullable, default: 0)
//   valor_a_receber: numeric (nullable, default: 0)
//   valor_dinheiro: numeric (nullable, default: 0)
//   valor_pix: numeric (nullable, default: 0)
//   valor_cheque: numeric (nullable, default: 0)
//   dinheiro_aprovado: boolean (nullable, default: false)
//   pix_aprovado: boolean (nullable, default: false)
//   cheque_aprovado: boolean (nullable, default: false)
//   responsavel_id: bigint (nullable)
//   status: text (nullable, default: 'Aberto'::text)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   valor_despesas: numeric (nullable, default: 0)
//   despesas_aprovadas: boolean (nullable, default: false)
//   saldo_acerto: numeric (nullable, default: 0)
//   saldo_acerto_aprovado: boolean (nullable, default: false)
//   valor_boleto: numeric (nullable, default: 0)
//   boleto_aprovado: boolean (nullable, default: false)
//   recolhido_por_id: bigint (nullable)
//   recolhido_at: timestamp with time zone (nullable)
// Table: inativar_clientes
//   id: bigint (not null)
//   pedido_id: bigint (not null)
//   funcionario_nome: text (nullable)
//   cliente_codigo: bigint (not null)
//   cliente_nome: text (nullable)
//   valor_venda: numeric (nullable, default: 0)
//   saldo_a_pagar: numeric (nullable, default: 0)
//   valor_pago: numeric (nullable, default: 0)
//   debito: numeric (nullable, default: 0)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   expositor_retirado: boolean (nullable, default: false)
//   observacoes_expositor: text (nullable)
//   status: text (nullable, default: 'PENDENTE'::text)
// Table: kit_items
//   id: bigint (not null)
//   kit_id: bigint (not null)
//   produto_id: bigint (not null)
//   quantidade_padrao: numeric (not null, default: 1)
// Table: kits
//   id: bigint (not null)
//   nome: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
// Table: meta_excecoes
//   id: integer (not null, default: nextval('meta_excecoes_id_seq'::regclass))
//   data_inicio: date (not null)
//   descricao: text (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   data_fim: date (not null)
//   funcionario_id: bigint (nullable)
// Table: metas_funcionarios
//   id: integer (not null, default: nextval('metas_funcionarios_id_seq'::regclass))
//   funcionario_id: integer (not null)
//   meta_diaria: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   meta_mensal: numeric (nullable)
// Table: metas_periodos
//   id: integer (not null, default: nextval('metas_periodos_id_seq'::regclass))
//   funcionario_id: integer (not null)
//   data_inicio: date (not null)
//   data_fim: date (not null)
//   valor_meta: numeric (not null)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: notas_fiscais_emitidas
//   id: integer (not null, default: nextval('notas_fiscais_emitidas_id_seq'::regclass))
//   pedido_id: integer (not null)
//   cliente_id: integer (not null)
//   numero_nota_fiscal: text (not null)
//   data_emissao: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   funcionario_id: integer (nullable)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: permissoes
//   id: bigint (not null)
//   setor: text (not null)
//   modulo: text (not null)
//   acesso: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: rota_motoqueiro_km
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: now())
//   data_hora: timestamp with time zone (not null)
//   km_percorrido: numeric (not null)
//   funcionario_id: bigint (not null)
// Table: sessoes_inventario
//   id: bigint (not null)
//   tipo: text (not null)
//   funcionario_id: bigint (nullable)
//   data_inicio: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   data_fim: timestamp with time zone (nullable)
//   status: text (not null, default: 'ABERTO'::text)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
// Table: system_logs
//   id: bigint (not null)
//   created_at: timestamp with time zone (not null, default: timezone('utc'::text, now()))
//   user_id: bigint (nullable)
//   type: text (not null)
//   description: text (not null)
//   meta: jsonb (nullable)
// Table: view_client_latest_consigned_value
//   client_id: bigint (nullable)
//   total_consigned_value: numeric (nullable)
// Table: view_collection_action_counts
//   pedido_id: bigint (nullable)
//   target_vencimento: timestamp with time zone (nullable)
//   target_forma_pagamento: text (nullable)
//   action_count: bigint (nullable)
// Table: view_delivery_history
//   id: bigint (nullable)
//   id_estoque_carro: bigint (nullable)
//   data_movimento: timestamp with time zone (nullable)
//   pedido: bigint (nullable)
//   codigo_produto: bigint (nullable)
//   produto: text (nullable)
//   quantidade: integer (nullable)
//   funcionario: text (nullable)
//   codigo_cliente: bigint (nullable)
//   nome_cliente: text (nullable)
// Table: view_latest_collection_actions
//   action_id: bigint (nullable)
//   pedido_id: bigint (nullable)
//   acao: text (nullable)
//   data_acao: timestamp with time zone (nullable)
//   nova_data_combinada: date (nullable)
//   funcionario_nome: text (nullable)
//   cliente_id: bigint (nullable)
//   installment_id: bigint (nullable)
//   installment_vencimento: date (nullable)
//   installment_valor: numeric (nullable)
//   installment_forma_pagamento: text (nullable)

// --- CONSTRAINTS ---
// Table: AJUSTE_SALDO_INICIAL
//   PRIMARY KEY AJUSTE_SALDO_INICIAL_pkey: PRIMARY KEY (id)
// Table: AÇOES DE COBRANÇA_BACKUP
//   PRIMARY KEY AÇOES DE COBRANÇA_pkey: PRIMARY KEY ("ID AÇÃO")
// Table: BANCO_DE_DADOS
//   PRIMARY KEY BANCO_DE_DADOS_pkey: PRIMARY KEY ("ID VENDA ITENS")
//   FOREIGN KEY BANCO_DE_DADOS_session_id_fkey: FOREIGN KEY (session_id) REFERENCES "DATAS DE INVENTÁRIO"("ID INVENTÁRIO")
// Table: CLIENTES
//   PRIMARY KEY CLIENTES_pkey: PRIMARY KEY ("CODIGO")
// Table: CRIAR_NOVA_ROTA
//   PRIMARY KEY CRIAR_NOVA_ROTA_pkey: PRIMARY KEY (id)
// Table: DATAS DE INVENTÁRIO
//   PRIMARY KEY DATAS DE INVENTÁRIO_pkey: PRIMARY KEY ("ID INVENTÁRIO")
// Table: DESPESAS
//   FOREIGN KEY DESPESAS_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY DESPESAS_pkey: PRIMARY KEY (id)
//   FOREIGN KEY DESPESAS_rota_id_fkey: FOREIGN KEY (rota_id) REFERENCES "ROTA"(id)
//   FOREIGN KEY DESPESAS_veiculo_id_fkey: FOREIGN KEY (veiculo_id) REFERENCES "VEICULOS"(id)
// Table: ESTOQUE CARRO AJUSTES
//   FOREIGN KEY ESTOQUE CARRO AJUSTES_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO AJUSTES_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO AJUSTES_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO CONTAGEM
//   FOREIGN KEY ESTOQUE CARRO CONTAGEM_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY ESTOQUE CARRO CONTAGEM_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO CONTAGEM_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO CONTAGEM_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO DIFERENÇAS
//   FOREIGN KEY ESTOQUE CARRO DIFERENÇAS_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO DIFERENÇAS_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO DIFERENÇAS_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO SALDO FINAL
//   FOREIGN KEY ESTOQUE CARRO SALDO FINAL_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY ESTOQUE CARRO SALDO FINAL_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO SALDO FINAL_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO SALDO FINAL_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO SALDO INICIAL
//   FOREIGN KEY ESTOQUE CARRO SALDO INICIAL_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY ESTOQUE CARRO SALDO INICIAL_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO SALDO INICIAL_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO SALDO INICIAL_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO: CARRO PARA O CLIENTE
//   FOREIGN KEY ESTOQUE CARRO: CARRO PARA O CLIENTE_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO: CARRO PARA O CLIENTE_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO: CARRO PARA O CLIENTE_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO: CARRO PARA O ESTOQUE
//   FOREIGN KEY ESTOQUE CARRO: CARRO PARA O ESTOQUE_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO: CARRO PARA O ESTOQUE_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO: CARRO PARA O ESTOQUE_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO: CLIENTE PARA O CARRO
//   FOREIGN KEY ESTOQUE CARRO: CLIENTE PARA O CARRO_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO: CLIENTE PARA O CARRO_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO: CLIENTE PARA O CARRO_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE CARRO: ESTOQUE PARA O CARRO
//   FOREIGN KEY ESTOQUE CARRO: ESTOQUE PARA O CARRO_id_estoque_carro_fkey: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id) ON DELETE CASCADE
//   PRIMARY KEY ESTOQUE CARRO: ESTOQUE PARA O CARRO_pkey: PRIMARY KEY (id)
//   FOREIGN KEY ESTOQUE CARRO: ESTOQUE PARA O CARRO_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
// Table: ESTOQUE GERAL AJUSTES
//   FOREIGN KEY ESTOQUE GERAL AJUSTES_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL AJUSTES_pkey: PRIMARY KEY (id)
// Table: ESTOQUE GERAL CARRO PARA ESTOQUE
//   FOREIGN KEY ESTOQUE GERAL CARRO PARA ESTOQUE_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY ESTOQUE GERAL CARRO PARA ESTOQUE_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL CARRO PARA ESTOQUE_pkey: PRIMARY KEY (id)
// Table: ESTOQUE GERAL COMPRAS
//   FOREIGN KEY ESTOQUE GERAL COMPRAS_fornecedor_id_fkey: FOREIGN KEY (fornecedor_id) REFERENCES "FORNECEDORES"(id)
//   FOREIGN KEY ESTOQUE GERAL COMPRAS_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL COMPRAS_pkey: PRIMARY KEY (id)
// Table: ESTOQUE GERAL CONTAGEM
//   FOREIGN KEY ESTOQUE GERAL CONTAGEM_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL CONTAGEM_pkey: PRIMARY KEY (id)
// Table: ESTOQUE GERAL ESTOQUE PARA CARRO
//   FOREIGN KEY ESTOQUE GERAL ESTOQUE PARA CARRO_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY ESTOQUE GERAL ESTOQUE PARA CARRO_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL ESTOQUE PARA CARRO_pkey: PRIMARY KEY (id)
// Table: ESTOQUE GERAL SALDO INICIAL
//   FOREIGN KEY ESTOQUE GERAL SALDO INICIAL_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL SALDO INICIAL_pkey: PRIMARY KEY (id)
// Table: ESTOQUE GERAL SAÍDAS PERDAS
//   FOREIGN KEY ESTOQUE GERAL SAÍDAS PERDAS_id_inventario_fkey: FOREIGN KEY (id_inventario) REFERENCES "ID Inventário"(id)
//   PRIMARY KEY ESTOQUE GERAL SAÍDAS PERDAS_pkey: PRIMARY KEY (id)
// Table: FORNECEDORES
//   PRIMARY KEY FORNECEDORES_pkey: PRIMARY KEY (id)
// Table: FUNCIONARIOS
//   PRIMARY KEY FUNCIONARIOS_pkey: PRIMARY KEY (id)
//   CHECK email_check: CHECK ((email ~* '^.+@.+'::text))
//   CHECK funcionarios_situacao_check: CHECK ((situacao = ANY (ARRAY['ATIVO'::text, 'INATIVO'::text])))
//   CHECK senha_check: CHECK (((senha IS NULL) OR (senha = ''::text) OR (length(senha) >= 4)))
// Table: ID ESTOQUE CARRO
//   FOREIGN KEY ID ESTOQUE CARRO_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY ID ESTOQUE CARRO_pkey: PRIMARY KEY (id)
// Table: ID Inventário
//   PRIMARY KEY ID Inventário_pkey: PRIMARY KEY (id)
// Table: NOTA_FISCAL
//   PRIMARY KEY NOTA_FISCAL_pkey: PRIMARY KEY (id)
// Table: PENDENCIAS
//   FOREIGN KEY PENDENCIAS_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES "CLIENTES"("CODIGO")
//   FOREIGN KEY PENDENCIAS_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY PENDENCIAS_pkey: PRIMARY KEY (id)
//   FOREIGN KEY PENDENCIAS_responsavel_id_fkey: FOREIGN KEY (responsavel_id) REFERENCES "FUNCIONARIOS"(id)
// Table: PIX
//   PRIMARY KEY PIX_pkey: PRIMARY KEY (id)
//   FOREIGN KEY PIX_recebimento_id_fkey: FOREIGN KEY (recebimento_id) REFERENCES "RECEBIMENTOS"(id) ON DELETE CASCADE
//   UNIQUE PIX_recebimento_id_key: UNIQUE (recebimento_id)
// Table: PRODUTOS
//   PRIMARY KEY PRODUTOS_pkey: PRIMARY KEY ("ID")
//   CHECK products_frequentes_check: CHECK (("FREQUENTES" = ANY (ARRAY['SIM'::text, 'NÃO'::text])))
// Table: RECEBIMENTOS
//   FOREIGN KEY RECEBIMENTOS_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES "CLIENTES"("CODIGO")
//   FOREIGN KEY RECEBIMENTOS_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY RECEBIMENTOS_pkey: PRIMARY KEY (id)
//   FOREIGN KEY RECEBIMENTOS_rota_id_fkey: FOREIGN KEY (rota_id) REFERENCES "ROTA"(id)
// Table: RELATORIO_DE_ESTOQUE
//   PRIMARY KEY RELATORIO_DE_ESTOQUE_pkey: PRIMARY KEY (id)
// Table: REPOSIÇÃO E DEVOLUÇÃO
//   CHECK REPOSIÇÃO E DEVOLUÇÃO_TIPO_check: CHECK (("TIPO" = ANY (ARRAY['REPOSICAO'::text, 'DEVOLUCAO'::text])))
//   FOREIGN KEY REPOSIÇÃO E DEVOLUÇÃO_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY REPOSIÇÃO E DEVOLUÇÃO_pkey: PRIMARY KEY (id)
//   FOREIGN KEY REPOSIÇÃO E DEVOLUÇÃO_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID")
//   FOREIGN KEY REPOSIÇÃO E DEVOLUÇÃO_session_id_fkey: FOREIGN KEY (session_id) REFERENCES "DATAS DE INVENTÁRIO"("ID INVENTÁRIO")
//   FOREIGN KEY fk_reposicao_estoque_carro: FOREIGN KEY (id_estoque_carro) REFERENCES "ID ESTOQUE CARRO"(id)
// Table: ROTA
//   PRIMARY KEY ROTA_pkey: PRIMARY KEY (id)
// Table: ROTA_ITEMS
//   FOREIGN KEY ROTA_ITEMS_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES "CLIENTES"("CODIGO")
//   PRIMARY KEY ROTA_ITEMS_pkey: PRIMARY KEY (id)
//   UNIQUE ROTA_ITEMS_rota_id_cliente_id_key: UNIQUE (rota_id, cliente_id)
//   FOREIGN KEY ROTA_ITEMS_rota_id_fkey: FOREIGN KEY (rota_id) REFERENCES "ROTA"(id)
//   FOREIGN KEY ROTA_ITEMS_vendedor_id_fkey: FOREIGN KEY (vendedor_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY ROTA_ITEMS_vendedor_proximo_id_fkey: FOREIGN KEY (vendedor_proximo_id) REFERENCES "FUNCIONARIOS"(id)
// Table: VEICULOS
//   PRIMARY KEY VEICULOS_pkey: PRIMARY KEY (id)
//   UNIQUE VEICULOS_placa_key: UNIQUE (placa)
//   CHECK VEICULOS_status_check: CHECK ((status = ANY (ARRAY['ATIVO'::text, 'INATIVO'::text])))
// Table: acoes_cobranca
//   PRIMARY KEY acoes_cobranca_pkey: PRIMARY KEY (id)
// Table: acoes_cobranca_vencimentos
//   FOREIGN KEY acoes_cobranca_vencimentos_acao_cobranca_id_fkey: FOREIGN KEY (acao_cobranca_id) REFERENCES acoes_cobranca(id) ON DELETE CASCADE
//   PRIMARY KEY acoes_cobranca_vencimentos_pkey: PRIMARY KEY (id)
// Table: boletos
//   FOREIGN KEY boletos_cliente_codigo_fkey: FOREIGN KEY (cliente_codigo) REFERENCES "CLIENTES"("CODIGO") ON DELETE CASCADE
//   PRIMARY KEY boletos_pkey: PRIMARY KEY (id)
// Table: brinde
//   FOREIGN KEY brinde_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY brinde_pkey: PRIMARY KEY (id)
// Table: configuracoes
//   UNIQUE configuracoes_chave_key: UNIQUE (chave)
//   PRIMARY KEY configuracoes_pkey: PRIMARY KEY (id)
// Table: debitos_historico
//   PRIMARY KEY debitos_historico_pkey: PRIMARY KEY (id)
// Table: dre_categorias
//   UNIQUE dre_categorias_nome_key: UNIQUE (nome)
//   PRIMARY KEY dre_categorias_pkey: PRIMARY KEY (id)
// Table: dre_lancamentos
//   PRIMARY KEY dre_lancamentos_pkey: PRIMARY KEY (id)
// Table: fechamento_caixa
//   FOREIGN KEY fechamento_caixa_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY fechamento_caixa_pkey: PRIMARY KEY (id)
//   FOREIGN KEY fechamento_caixa_recolhido_por_id_fkey: FOREIGN KEY (recolhido_por_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY fechamento_caixa_responsavel_id_fkey: FOREIGN KEY (responsavel_id) REFERENCES "FUNCIONARIOS"(id)
//   FOREIGN KEY fechamento_caixa_rota_id_fkey: FOREIGN KEY (rota_id) REFERENCES "ROTA"(id)
//   UNIQUE fechamento_caixa_rota_id_funcionario_id_key: UNIQUE (rota_id, funcionario_id)
// Table: inativar_clientes
//   PRIMARY KEY inativar_clientes_pkey: PRIMARY KEY (id)
// Table: kit_items
//   FOREIGN KEY kit_items_kit_id_fkey: FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE
//   PRIMARY KEY kit_items_pkey: PRIMARY KEY (id)
//   FOREIGN KEY kit_items_produto_id_fkey: FOREIGN KEY (produto_id) REFERENCES "PRODUTOS"("ID") ON DELETE CASCADE
// Table: kits
//   PRIMARY KEY kits_pkey: PRIMARY KEY (id)
// Table: meta_excecoes
//   FOREIGN KEY meta_excecoes_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id) ON DELETE CASCADE
//   PRIMARY KEY meta_excecoes_pkey: PRIMARY KEY (id)
// Table: metas_funcionarios
//   FOREIGN KEY metas_funcionarios_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id) ON DELETE CASCADE
//   UNIQUE metas_funcionarios_funcionario_id_key: UNIQUE (funcionario_id)
//   PRIMARY KEY metas_funcionarios_pkey: PRIMARY KEY (id)
// Table: metas_periodos
//   FOREIGN KEY metas_periodos_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id) ON DELETE CASCADE
//   PRIMARY KEY metas_periodos_pkey: PRIMARY KEY (id)
// Table: notas_fiscais_emitidas
//   PRIMARY KEY notas_fiscais_emitidas_pkey: PRIMARY KEY (id)
// Table: permissoes
//   PRIMARY KEY permissoes_pkey: PRIMARY KEY (id)
//   UNIQUE permissoes_setor_modulo_key: UNIQUE (setor, modulo)
// Table: rota_motoqueiro_km
//   FOREIGN KEY rota_motoqueiro_km_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY rota_motoqueiro_km_pkey: PRIMARY KEY (id)
// Table: sessoes_inventario
//   FOREIGN KEY sessoes_inventario_funcionario_id_fkey: FOREIGN KEY (funcionario_id) REFERENCES "FUNCIONARIOS"(id)
//   PRIMARY KEY sessoes_inventario_pkey: PRIMARY KEY (id)
//   CHECK sessoes_inventario_status_check: CHECK ((status = ANY (ARRAY['ABERTO'::text, 'FECHADO'::text])))
//   CHECK sessoes_inventario_tipo_check: CHECK ((tipo = ANY (ARRAY['GERAL'::text, 'FUNCIONARIO'::text])))
// Table: system_logs
//   PRIMARY KEY system_logs_pkey: PRIMARY KEY (id)
//   FOREIGN KEY system_logs_user_id_fkey: FOREIGN KEY (user_id) REFERENCES "FUNCIONARIOS"(id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: AJUSTE_SALDO_INICIAL
//   Policy "Enable insert access for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: CLIENTES
//   Policy "Allow public access to CLIENTES" (ALL, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
//   Policy "Enable delete access for authenticated users" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable insert access for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update access for authenticated users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: DATAS DE INVENTÁRIO
//   Policy "Enable all for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: DESPESAS
//   Policy "Enable delete access for all users" (DELETE, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Enable insert access for all users" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "Enable read access for all users" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Enable update access for all users" (UPDATE, PERMISSIVE) roles={public}
//     USING: true
// Table: FUNCIONARIOS
//   Policy "Allow public access to FUNCIONARIOS" (ALL, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
//   Policy "Enable delete access for all users" (DELETE, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Enable insert access for all users" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "Enable read access for all users" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Enable update access for all users" (UPDATE, PERMISSIVE) roles={public}
//     USING: true
// Table: PENDENCIAS
//   Policy "Enable delete access for authenticated users" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable insert access for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update access for authenticated users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: PIX
//   Policy "Enable all for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Enable insert for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update for authenticated users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: PRODUTOS
//   Policy "Enable delete for authenticated users" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable insert for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update for authenticated users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: RECEBIMENTOS
//   Policy "Enable all for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update for authenticated users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: REPOSIÇÃO E DEVOLUÇÃO
//   Policy "Enable all for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: acoes_cobranca
//   Policy "Enable insert access for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update access for authenticated users" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: boletos
//   Policy "Enable all for authenticated users" (ALL, PERMISSIVE) roles={public}
//     USING: (auth.role() = 'authenticated'::text)
//     WITH CHECK: (auth.role() = 'authenticated'::text)
// Table: configuracoes
//   Policy "Allow insert/update access for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Allow read access for authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: dre_categorias
//   Policy "Enable delete for authenticated users on dre_categorias" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable insert for authenticated users on dre_categorias" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable select for authenticated users on dre_categorias" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update for authenticated users on dre_categorias" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: dre_lancamentos
//   Policy "Enable all for authenticated users on dre_lancamentos" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: fechamento_caixa
//   Policy "Enable all access for all users" (ALL, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
//   Policy "Enable all access for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: metas_funcionarios
//   Policy "Enable all access for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: metas_periodos
//   Policy "Enable all access for authenticated users" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: rota_motoqueiro_km
//   Policy "Enable delete for authenticated users" (DELETE, PERMISSIVE) roles={public}
//     USING: (auth.role() = 'authenticated'::text)
//   Policy "Enable insert for authenticated users" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (auth.role() = 'authenticated'::text)
//   Policy "Enable read access for all users" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "Enable update for authenticated users" (UPDATE, PERMISSIVE) roles={public}
//     USING: (auth.role() = 'authenticated'::text)
// Table: system_logs
//   Policy "Enable insert for authenticated users" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "Enable read for authenticated users" (SELECT, PERMISSIVE) roles={public}
//     USING: true

// --- DATABASE FUNCTIONS ---
// FUNCTION auto_confirm_despesa()
//   CREATE OR REPLACE FUNCTION public.auto_confirm_despesa()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF NEW.saiu_do_caixa = true OR NEW.saiu_do_caixa IS NULL THEN
//       NEW.status := 'Confirmado';
//     ELSE
//       IF NEW.status IS NULL OR (NEW.status = 'Confirmado' AND NEW.banco_pagamento IS NULL) THEN
//         NEW.status := 'A confirmar';
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION auto_finalize_overdue_routes()
//   CREATE OR REPLACE FUNCTION public.auto_finalize_overdue_routes()
//    RETURNS jsonb
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     r RECORD;
//     processed_count INTEGER := 0;
//     rota_ids INTEGER[] := ARRAY[]::INTEGER[];
//   BEGIN
//     -- Iterate over open routes that are older than 6 days
//     -- Logic: data_fim IS NULL AND data_inicio < (NOW - 6 days)
//     -- This identifies routes that have been open for strictly more than 6 days
//     FOR r IN
//       SELECT * FROM "ROTA"
//       WHERE data_fim IS NULL
//       AND data_inicio < (NOW() - INTERVAL '6 days')
//     LOOP
//       -- 1. Update the route to close it by setting data_fim to current timestamp
//       UPDATE "ROTA"
//       SET data_fim = NOW()
//       WHERE id = r.id;
//   
//       -- 2. Execute the stock/item increment logic using the existing RPC
//       -- Using PERFORM to discard the result as we just need the side effect
//       PERFORM public.increment_rota_items_on_finalize(r.id);
//       
//       -- Track processed IDs for reporting/logging
//       rota_ids := array_append(rota_ids, r.id);
//       processed_count := processed_count + 1;
//     END LOOP;
//   
//     RETURN jsonb_build_object(
//       'success', true,
//       'processed_count', processed_count,
//       'finalized_rota_ids', rota_ids
//     );
//   END;
//   $function$
//   
// FUNCTION btrim(time without time zone)
//   CREATE OR REPLACE FUNCTION public.btrim(t time without time zone)
//    RETURNS text
//    LANGUAGE sql
//    IMMUTABLE
//   AS $function$
//     SELECT btrim(t::text);
//   $function$
//   
// FUNCTION btrim(date)
//   CREATE OR REPLACE FUNCTION public.btrim(d date)
//    RETURNS text
//    LANGUAGE sql
//    IMMUTABLE
//   AS $function$
//     SELECT btrim(d::text);
//   $function$
//   
// FUNCTION bulk_update_product_codes(json)
//   CREATE OR REPLACE FUNCTION public.bulk_update_product_codes(payload json)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     record json;
//   BEGIN
//     FOR record IN SELECT * FROM json_array_elements(payload)
//     LOOP
//       UPDATE "PRODUTOS"
//       SET 
//         "codigo_interno" = record->>'codigo_interno',
//         "CÓDIGO BARRAS" = record->>'codigo_barras'
//       WHERE "ID" = (record->>'id')::integer;
//     END LOOP;
//   END;
//   $function$
//   
// FUNCTION clear_cobranca_info_if_paid()
//   CREATE OR REPLACE FUNCTION public.clear_cobranca_info_if_paid()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     -- Clear collection info if debt is cleared (paid >= registered)
//     -- Using 0.01 tolerance for float arithmetic safety
//     IF (NEW.valor_pago + 0.01) >= NEW.valor_registrado THEN
//       NEW.forma_cobranca := NULL;
//       NEW.data_combinada := NULL;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION delete_full_order(bigint)
//   CREATE OR REPLACE FUNCTION public.delete_full_order(p_order_id bigint)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     DELETE FROM "BANCO_DE_DADOS" WHERE "NÚMERO DO PEDIDO" = p_order_id;
//     DELETE FROM "RECEBIMENTOS" WHERE venda_id = p_order_id;
//     DELETE FROM "debitos_historico" WHERE pedido_id = p_order_id;
//     DELETE FROM "RELATORIO_DE_ESTOQUE" WHERE numero_pedido = p_order_id;
//     DELETE FROM "notas_fiscais_emitidas" WHERE pedido_id = p_order_id;
//     DELETE FROM "inativar_clientes" WHERE pedido_id = p_order_id;
//     DELETE FROM "AJUSTE_SALDO_INICIAL" WHERE numero_pedido = p_order_id;
//     DELETE FROM "AÇOES DE COBRANÇA_BACKUP" WHERE "NÚMERO DO PEDIDO" = p_order_id;
//     DELETE FROM "acoes_cobranca" WHERE pedido_id = p_order_id;
//   END;
//   $function$
//   
// FUNCTION get_client_projections()
//   CREATE OR REPLACE FUNCTION public.get_client_projections()
//    RETURNS TABLE(client_id bigint, projecao numeric, dias_entre_acertos integer)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     WITH 
//     -- 1. Standard Sales Data - Using robust date fallback
//     sales_data AS (
//         SELECT
//             "CÓDIGO DO CLIENTE" as cid,
//             "NÚMERO DO PEDIDO" as oid,
//             COALESCE(NULLIF(TRIM("DATA DO ACERTO"::text), ''), to_char("DATA E HORA", 'YYYY-MM-DD')) as date_str,
//             "VALOR VENDIDO"::text as val_str
//         FROM "BANCO_DE_DADOS"
//         WHERE (NULLIF(TRIM("DATA DO ACERTO"::text), '') IS NOT NULL OR "DATA E HORA" IS NOT NULL)
//           AND "CÓDIGO DO CLIENTE" IS NOT NULL
//           AND "NÚMERO DO PEDIDO" IS NOT NULL
//     ),
//     -- 2. Initial Balance / Adjustment Data
//     adj_data AS (
//         SELECT
//             cliente_id as cid,
//             numero_pedido as oid,
//             to_char(data_acerto, 'YYYY-MM-DD') as date_str,
//             '0' as val_str -- Value is 0 for projection calc purposes (timeline anchor)
//         FROM "AJUSTE_SALDO_INICIAL"
//         WHERE data_acerto IS NOT NULL 
//           AND cliente_id IS NOT NULL
//     ),
//     -- 3. Combine Data Sources
//     combined_raw AS (
//         SELECT * FROM sales_data
//         UNION ALL
//         SELECT * FROM adj_data
//     ),
//     -- 4. Parse Dates and Values with mixed format support
//     parsed_data AS (
//         SELECT
//           cid,
//           oid,
//           val_str,
//           CASE
//               -- ISO Format (YYYY-MM-DD)
//               WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
//                   to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
//               -- BR Format (DD/MM/YYYY)
//               WHEN date_str ~ '^\d{2}/\d{2}/\d{4}' THEN 
//                   to_date(substring(date_str from 1 for 10), 'DD/MM/YYYY')
//               -- BR Short Format (DD/MM/YY)
//               WHEN date_str ~ '^\d{2}/\d{2}/\d{2}
 THEN 
//                    to_date(date_str, 'DD/MM/YY')
//               ELSE NULL
//           END as raw_dt
//         FROM combined_raw
//     ),
//     corrected_dates AS (
//         SELECT
//           cid,
//           oid,
//           val_str,
//           CASE
//               WHEN raw_dt IS NULL THEN NULL
//               -- Fix Year < 1900 (e.g., 0026 -> 2026)
//               WHEN EXTRACT(YEAR FROM raw_dt) < 1900 THEN
//                   raw_dt + (INTERVAL '2000 years')
//               ELSE raw_dt
//           END::date as dt
//         FROM parsed_data
//     ),
//     parsed_values AS (
//         SELECT
//           cid,
//           oid,
//           dt,
//           CASE 
//                WHEN val_str ~ '^[0-9.]+,[0-9]+
 THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
//                WHEN val_str ~ '^[0-9,]+
 THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
//                ELSE CAST(NULLIF(val_str, '') AS NUMERIC)
//           END as val
//         FROM corrected_dates
//         WHERE dt IS NOT NULL
//     ),
//     -- 5. Group by order to sum total value (handling multiple items per order)
//     grouped_orders AS (
//         SELECT
//             cid,
//             oid,
//             dt,
//             SUM(COALESCE(val, 0)) as total_val
//         FROM parsed_values
//         GROUP BY cid, oid, dt
//     ),
//     -- 6. Rank Orders per Client (Latest first)
//     ranked_orders AS (
//         SELECT
//             cid,
//             oid,
//             dt,
//             total_val,
//             ROW_NUMBER() OVER (PARTITION BY cid ORDER BY dt DESC, oid DESC) as rn
//         FROM grouped_orders
//     ),
//     -- 7. Get Latest and Previous
//     latest AS (
//         SELECT cid, dt, total_val FROM ranked_orders WHERE rn = 1
//     ),
//     previous AS (
//         SELECT cid, dt FROM ranked_orders WHERE rn = 2
//     ),
//     -- 8. Calculate Projection securely
//     base_calc AS (
//         SELECT
//             l.cid,
//             (l.dt - p.dt) as days_diff,
//             CASE
//                 -- If no previous data (p.dt is null), or dates are same/invalid
//                 WHEN p.dt IS NULL OR (l.dt - p.dt) <= 0 THEN 100.00
//                 
//                 -- Standard Calculation
//                 -- Monthly Avg = Val / ((DateDiff)/30)
//                 -- Projection = (DaysSinceLast/30) * Monthly Avg
//                 ELSE
//                      ((CURRENT_DATE - l.dt)::numeric / 30.0) *
//                      (l.total_val / ((l.dt - p.dt)::numeric / 30.0))
//             END as calc_proj
//         FROM latest l
//         LEFT JOIN previous p ON l.cid = p.cid
//     )
//     SELECT
//         cid as client_id,
//         CASE 
//           WHEN calc_proj IS NULL OR calc_proj = 0 THEN 100.00 
//           ELSE ROUND(calc_proj, 2) 
//         END as projecao,
//         COALESCE(days_diff, 0)::integer as dias_entre_acertos
//     FROM base_calc;
//   END;
//   $function$
//   
// FUNCTION get_clients_last_stock_value()
//   CREATE OR REPLACE FUNCTION public.get_clients_last_stock_value()
//    RETURNS TABLE(client_id integer, stock_value numeric)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     WITH latest_orders AS (
//       -- Find the most recent order for each client
//       SELECT DISTINCT ON ("CÓDIGO DO CLIENTE")
//         "CÓDIGO DO CLIENTE" as client_code,
//         "NÚMERO DO PEDIDO" as order_id
//       FROM "BANCO_DE_DADOS"
//       WHERE "NÚMERO DO PEDIDO" IS NOT NULL
//         AND "DATA DO ACERTO" IS NOT NULL
//       ORDER BY "CÓDIGO DO CLIENTE", "DATA DO ACERTO" DESC, "HORA DO ACERTO" DESC, "NÚMERO DO PEDIDO" DESC
//     )
//     SELECT
//       lo.client_code as client_id,
//       COALESCE(SUM(
//         bd."SALDO FINAL" * public.parse_currency_sql(p."PREÇO")
//       ), 0) as stock_value
//     FROM "BANCO_DE_DADOS" bd
//     JOIN latest_orders lo ON bd."NÚMERO DO PEDIDO" = lo.order_id
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."CODIGO"
//     WHERE p."PREÇO" IS NOT NULL
//     GROUP BY lo.client_code;
//   END;
//   $function$
//   
// FUNCTION get_inventory_data(integer, integer)
//   CREATE OR REPLACE FUNCTION public.get_inventory_data(p_session_id integer, p_funcionario_id integer)
//    RETURNS TABLE(id integer, codigo_barras text, codigo_produto integer, mercadoria text, tipo text, preco numeric, saldo_inicial numeric, saldo_final numeric, contagem numeric, entrada_estoque_carro numeric, saida_carro_estoque numeric, entrada_cliente_carro numeric, saida_carro_cliente numeric)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       COALESCE(p."ID", bd."COD. PRODUTO", 0)::INTEGER as id,
//       COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
//       COALESCE(bd."COD. PRODUTO", 0)::INTEGER as codigo_produto,
//       COALESCE(p."PRODUTO", bd."MERCADORIA", 'Produto Não Identificado') as mercadoria,
//       COALESCE(p."TIPO", 'OUTROS') as tipo,
//       COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
//       COALESCE(bd."SALDO INICIAL", 0) as saldo_inicial,
//       COALESCE(bd."SALDO FINAL", 0) as saldo_final,
//       COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as contagem,
//       parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
//       parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
//       0::NUMERIC as entrada_cliente_carro,
//       0::NUMERIC as saida_carro_cliente
//     FROM "BANCO_DE_DADOS" bd
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//     LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
//         ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
//     WHERE 
//       (p_session_id IS NULL OR bd.session_id = p_session_id) AND
//       (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//     ORDER BY mercadoria;
//   END;
//   $function$
//   
// FUNCTION get_inventory_items_paginated(bigint, bigint, integer, integer, text)
//   CREATE OR REPLACE FUNCTION public.get_inventory_items_paginated(p_session_id bigint DEFAULT NULL::bigint, p_funcionario_id bigint DEFAULT NULL::bigint, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50, p_search text DEFAULT NULL::text)
//    RETURNS TABLE(id bigint, codigo_barras text, codigo_produto bigint, mercadoria text, tipo text, preco numeric, saldo_inicial numeric, entrada_estoque_carro numeric, entrada_cliente_carro numeric, saida_carro_estoque numeric, saida_carro_cliente numeric, saldo_final numeric, estoque_contagem_carro numeric, total_count bigint)
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     v_offset INT;
//     v_total_count BIGINT;
//   BEGIN
//     v_offset := (p_page - 1) * p_page_size;
//   
//     -- Calculate Total Count efficiently using LEFT JOIN to handle missing products
//     SELECT COUNT(*)
//     INTO v_total_count
//     FROM "BANCO_DE_DADOS" bd
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//     WHERE 
//       (p_session_id IS NULL OR bd.session_id = p_session_id)
//       AND
//       (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//       AND
//       (p_search IS NULL OR 
//        COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
//        COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
//       );
//   
//     RETURN QUERY
//     SELECT
//       -- Robust ID selection
//       COALESCE(p."ID", bd."COD. PRODUTO", 0) as id,
//       -- Robust String casting
//       COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
//       COALESCE(bd."COD. PRODUTO", 0) as codigo_produto,
//       COALESCE(p."PRODUTO", bd."MERCADORIA", 'Produto Não Identificado') as mercadoria,
//       COALESCE(p."TIPO", 'OUTROS') as tipo,
//       -- Safe numeric parsing
//       COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
//       COALESCE(bd."SALDO INICIAL", 0) as saldo_inicial,
//       
//       -- Simplified Movement Logic (Direct from BD Snapshot)
//       parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
//       
//       -- Client movements forced to 0 as per requirement to prevent calculation errors
//       0::NUMERIC as entrada_cliente_carro,
//       
//       parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
//       
//       -- Client movements forced to 0
//       0::NUMERIC as saida_carro_cliente,
//       
//       COALESCE(bd."SALDO FINAL", 0) as saldo_final,
//       
//       -- Priority to Physical Count Table, fallback to BD
//       COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as estoque_contagem_carro,
//       
//       v_total_count
//     FROM "BANCO_DE_DADOS" bd
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//     LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
//       ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
//     WHERE 
//       (p_session_id IS NULL OR bd.session_id = p_session_id)
//       AND
//       (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//       AND
//       (p_search IS NULL OR 
//        COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
//        COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
//       )
//     ORDER BY mercadoria ASC
//     LIMIT p_page_size
//     OFFSET v_offset;
//   END;
//   $function$
//   
// FUNCTION get_inventory_summary_v2(bigint, bigint, text)
//   CREATE OR REPLACE FUNCTION public.get_inventory_summary_v2(p_session_id bigint DEFAULT NULL::bigint, p_funcionario_id bigint DEFAULT NULL::bigint, p_search text DEFAULT NULL::text)
//    RETURNS TABLE(total_saldo_inicial_qtd numeric, total_saldo_inicial_valor numeric, total_saldo_final_qtd numeric, total_saldo_final_valor numeric, total_diferenca_positiva_qtd numeric, total_diferenca_positiva_valor numeric, total_diferenca_negativa_qtd numeric, total_diferenca_negativa_valor numeric)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     WITH calculated_rows AS (
//       SELECT
//         COALESCE(bd."SALDO INICIAL", 0) as qtd_inicial,
//         COALESCE(bd."SALDO FINAL", 0) as qtd_final,
//         COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as qtd_contagem,
//         COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco_unit
//       FROM "BANCO_DE_DADOS" bd
//       LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//       LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
//         ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
//       WHERE 
//         (p_session_id IS NULL OR bd.session_id = p_session_id)
//         AND
//         (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//         AND
//         (p_search IS NULL OR 
//          COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR 
//          COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
//         )
//     ),
//     diffs AS (
//       SELECT
//         qtd_inicial,
//         qtd_inicial * preco_unit as val_inicial,
//         qtd_final,
//         qtd_final * preco_unit as val_final,
//         (qtd_contagem - qtd_final) as diff_qtd,
//         (qtd_contagem - qtd_final) * preco_unit as diff_val
//       FROM calculated_rows
//     )
//     SELECT
//       COALESCE(SUM(qtd_inicial), 0),
//       COALESCE(SUM(val_inicial), 0),
//       COALESCE(SUM(qtd_final), 0),
//       COALESCE(SUM(val_final), 0),
//       COALESCE(SUM(CASE WHEN diff_qtd > 0 THEN diff_qtd ELSE 0 END), 0),
//       COALESCE(SUM(CASE WHEN diff_qtd > 0 THEN diff_val ELSE 0 END), 0),
//       COALESCE(SUM(CASE WHEN diff_qtd < 0 THEN ABS(diff_qtd) ELSE 0 END), 0),
//       COALESCE(SUM(CASE WHEN diff_qtd < 0 THEN ABS(diff_val) ELSE 0 END), 0)
//     FROM diffs;
//   END;
//   $function$
//   
// FUNCTION get_next_order_number()
//   CREATE OR REPLACE FUNCTION public.get_next_order_number()
//    RETURNS integer
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     max_val INTEGER;
//   BEGIN
//     -- Find the current maximum order number, ignoring potential nulls
//     SELECT MAX("NÚMERO DO PEDIDO") INTO max_val FROM "public"."BANCO_DE_DADOS";
//     
//     -- Return Max + 1, or 1 if the table is empty (COALESCE handles null if table empty)
//     RETURN COALESCE(max_val, 0) + 1;
//   END;
//   $function$
//   
// FUNCTION get_top_selling_items(text, text)
//   CREATE OR REPLACE FUNCTION public.get_top_selling_items(start_date text, end_date text)
//    RETURNS TABLE(produto_nome text, produto_codigo integer, quantidade_total numeric, valor_total numeric)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       "MERCADORIA" as produto_nome,
//       "COD. PRODUTO" as produto_codigo,
//       SUM(
//           CASE 
//               WHEN "QUANTIDADE VENDIDA" IS NULL OR "QUANTIDADE VENDIDA" = '' THEN 0 
//               ELSE CAST(REPLACE(REPLACE("QUANTIDADE VENDIDA", '.', ''), ',', '.') AS numeric) 
//           END
//       ) as quantidade_total,
//       SUM(
//           CASE 
//               WHEN "VALOR VENDIDO" IS NULL OR "VALOR VENDIDO" = '' THEN 0 
//               ELSE CAST(REPLACE(REPLACE("VALOR VENDIDO", '.', ''), ',', '.') AS numeric) 
//           END
//       ) as valor_total
//     FROM
//       "BANCO_DE_DADOS"
//     WHERE
//       "DATA DO ACERTO" >= start_date AND "DATA DO ACERTO" <= end_date
//       AND "MERCADORIA" IS NOT NULL
//     GROUP BY
//       "MERCADORIA", "COD. PRODUTO"
//     ORDER BY
//       quantidade_total DESC;
//   END;
//   $function$
//   
// FUNCTION get_top_selling_items_v2(text, text, integer)
//   CREATE OR REPLACE FUNCTION public.get_top_selling_items_v2(start_date text, end_date text, p_funcionario_id integer DEFAULT NULL::integer)
//    RETURNS TABLE(produto_nome text, produto_codigo integer, quantidade_total numeric, valor_total numeric)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       "MERCADORIA" as produto_nome,
//       "COD. PRODUTO" as produto_codigo,
//       SUM(
//           CASE 
//               WHEN "QUANTIDADE VENDIDA" IS NULL OR "QUANTIDADE VENDIDA" = '' THEN 0 
//               ELSE CAST(REPLACE(REPLACE("QUANTIDADE VENDIDA", '.', ''), ',', '.') AS numeric) 
//           END
//       ) as quantidade_total,
//       SUM(
//           CASE 
//               WHEN "VALOR VENDIDO" IS NULL OR "VALOR VENDIDO" = '' THEN 0 
//               ELSE CAST(REPLACE(REPLACE("VALOR VENDIDO", '.', ''), ',', '.') AS numeric) 
//           END
//       ) as valor_total
//     FROM
//       "BANCO_DE_DADOS"
//     WHERE
//       "DATA DO ACERTO" >= start_date AND "DATA DO ACERTO" <= end_date
//       AND "MERCADORIA" IS NOT NULL
//       AND (p_funcionario_id IS NULL OR "CODIGO FUNCIONARIO" = p_funcionario_id)
//     GROUP BY
//       "MERCADORIA", "COD. PRODUTO"
//     ORDER BY
//       quantidade_total DESC;
//   END;
//   $function$
//   
// FUNCTION get_top_selling_items_v3(text, text, integer, text)
//   CREATE OR REPLACE FUNCTION public.get_top_selling_items_v3(start_date text, end_date text, p_funcionario_id integer DEFAULT NULL::integer, p_grupo text DEFAULT NULL::text)
//    RETURNS TABLE(produto_nome text, produto_codigo bigint, quantidade_total numeric, valor_total numeric, estoque_inicial_total numeric)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       bd."MERCADORIA" as produto_nome,
//       bd."COD. PRODUTO" as produto_codigo,
//       SUM(public.parse_currency_sql(bd."QUANTIDADE VENDIDA"::text)) as quantidade_total,
//       SUM(public.parse_currency_sql(bd."VALOR VENDIDO"::text)) as valor_total,
//       SUM(COALESCE(bd."SALDO INICIAL", 0)) as estoque_inicial_total
//     FROM
//       "BANCO_DE_DADOS" bd
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//     WHERE
//       bd."DATA DO ACERTO" >= start_date::date AND bd."DATA DO ACERTO" <= end_date::date
//       AND bd."MERCADORIA" IS NOT NULL
//       AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//       AND (p_grupo IS NULL OR p_grupo = '' OR p_grupo = 'todos' OR p."GRUPO" = p_grupo)
//     GROUP BY
//       bd."MERCADORIA", bd."COD. PRODUTO"
//     ORDER BY
//       quantidade_total DESC;
//   END;
//   $function$
//   
// FUNCTION get_top_selling_items_v4(text, text, integer, text)
//   CREATE OR REPLACE FUNCTION public.get_top_selling_items_v4(start_date text, end_date text, p_funcionario_id integer DEFAULT NULL::integer, p_grupo text DEFAULT NULL::text)
//    RETURNS TABLE(produto_nome text, produto_codigo bigint, quantidade_total numeric, valor_total numeric, estoque_inicial_total numeric, tipo text)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       bd."MERCADORIA" as produto_nome,
//       bd."COD. PRODUTO" as produto_codigo,
//       SUM(public.parse_currency_sql(bd."QUANTIDADE VENDIDA"::text)) as quantidade_total,
//       SUM(public.parse_currency_sql(bd."VALOR VENDIDO"::text)) as valor_total,
//       SUM(COALESCE(bd."SALDO INICIAL", 0)) as estoque_inicial_total,
//       MAX(p."TIPO") as tipo
//     FROM
//       "BANCO_DE_DADOS" bd
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//     WHERE
//       bd."DATA DO ACERTO" >= start_date::date AND bd."DATA DO ACERTO" <= end_date::date
//       AND bd."MERCADORIA" IS NOT NULL
//       AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//       AND (p_grupo IS NULL OR p_grupo = '' OR p_grupo = 'todos' OR p."GRUPO" = p_grupo)
//     GROUP BY
//       bd."MERCADORIA", bd."COD. PRODUTO"
//     ORDER BY
//       quantidade_total DESC;
//   END;
//   $function$
//   
// FUNCTION get_top_selling_items_v5(text, text, integer, text)
//   CREATE OR REPLACE FUNCTION public.get_top_selling_items_v5(start_date text, end_date text, p_funcionario_id integer DEFAULT NULL::integer, p_grupo text DEFAULT NULL::text)
//    RETURNS TABLE(produto_nome text, produto_codigo bigint, quantidade_total numeric, valor_total numeric, estoque_inicial_total numeric, grupo text)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       bd."MERCADORIA" as produto_nome,
//       bd."COD. PRODUTO" as produto_codigo,
//       SUM(public.parse_currency_sql(bd."QUANTIDADE VENDIDA"::text)) as quantidade_total,
//       SUM(public.parse_currency_sql(bd."VALOR VENDIDO"::text)) as valor_total,
//       SUM(COALESCE(bd."SALDO INICIAL", 0)) as estoque_inicial_total,
//       MAX(p."GRUPO") as grupo
//     FROM
//       "BANCO_DE_DADOS" bd
//     LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
//     WHERE
//       bd."DATA DO ACERTO" >= start_date::date AND bd."DATA DO ACERTO" <= end_date::date
//       AND bd."MERCADORIA" IS NOT NULL
//       AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
//       AND (p_grupo IS NULL OR p_grupo = '' OR p_grupo = 'todos' OR p."GRUPO" = p_grupo)
//     GROUP BY
//       bd."MERCADORIA", bd."COD. PRODUTO"
//     ORDER BY
//       quantidade_total DESC;
//   END;
//   $function$
//   
// FUNCTION get_unique_client_routes()
//   CREATE OR REPLACE FUNCTION public.get_unique_client_routes()
//    RETURNS TABLE(rota text)
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT nome_rota as rota
//     FROM "CRIAR_NOVA_ROTA"
//     ORDER BY nome_rota;
//   END;
//   $function$
//   
// FUNCTION get_unique_client_types()
//   CREATE OR REPLACE FUNCTION public.get_unique_client_types()
//    RETURNS TABLE(tipo text)
//    LANGUAGE sql
//   AS $function$
//     SELECT DISTINCT "TIPO DE CLIENTE"
//     FROM "CLIENTES"
//     WHERE "TIPO DE CLIENTE" IS NOT NULL AND "TIPO DE CLIENTE" <> ''
//     ORDER BY "TIPO DE CLIENTE";
//   $function$
//   
// FUNCTION get_unique_expositores()
//   CREATE OR REPLACE FUNCTION public.get_unique_expositores()
//    RETURNS TABLE(expositor text)
//    LANGUAGE sql
//   AS $function$
//     SELECT DISTINCT "EXPOSITOR"
//     FROM "CLIENTES"
//     WHERE "EXPOSITOR" IS NOT NULL AND "EXPOSITOR" <> ''
//     ORDER BY "EXPOSITOR";
//   $function$
//   
// FUNCTION get_unique_product_groups()
//   CREATE OR REPLACE FUNCTION public.get_unique_product_groups()
//    RETURNS TABLE(grupo text)
//    LANGUAGE sql
//   AS $function$
//     SELECT DISTINCT "GRUPO"
//     FROM "PRODUTOS"
//     WHERE "GRUPO" IS NOT NULL AND "GRUPO" <> ''
//     ORDER BY "GRUPO";
//   $function$
//   
// FUNCTION get_unique_product_types()
//   CREATE OR REPLACE FUNCTION public.get_unique_product_types()
//    RETURNS TABLE(tipo text)
//    LANGUAGE sql
//   AS $function$
//     SELECT DISTINCT "TIPO"
//     FROM "PRODUTOS"
//     WHERE "TIPO" IS NOT NULL AND "TIPO" <> ''
//     ORDER BY "TIPO";
//   $function$
//   
// FUNCTION increment_rota_items_on_finalize(bigint)
//   CREATE OR REPLACE FUNCTION public.increment_rota_items_on_finalize(p_rota_id bigint)
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     UPDATE "ROTA_ITEMS"
//     SET x_na_rota = x_na_rota + 1
//     WHERE rota_id = p_rota_id AND x_na_rota > 0;
//   END;
//   $function$
//   
// FUNCTION login_by_email(text)
//   CREATE OR REPLACE FUNCTION public.login_by_email(p_email text)
//    RETURNS TABLE(id integer, nome_completo text, apelido text, cpf text, email text, setor text[], foto_url text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT 
//       f.id,
//       f.nome_completo,
//       f.apelido,
//       f.cpf,
//       f.email,
//       f.setor,
//       f.foto_url
//     FROM public."FUNCIONARIOS" f
//     WHERE f.email ILIKE p_email;
//   END;
//   $function$
//   
// FUNCTION parse_currency_sql(character varying)
//   CREATE OR REPLACE FUNCTION public.parse_currency_sql(val_str character varying)
//    RETURNS numeric
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//       cleaned TEXT;
//   BEGIN
//       IF val_str IS NULL OR TRIM(val_str) = '' THEN
//           RETURN 0;
//       END IF;
//   
//       cleaned := REGEXP_REPLACE(val_str, '[^0-9.,-]', '', 'g');
//       
//       IF cleaned = '' OR cleaned = '-' THEN
//           RETURN 0;
//       END IF;
//   
//       IF POSITION(',' IN cleaned) > 0 THEN
//           cleaned := REPLACE(cleaned, '.', '');
//           cleaned := REPLACE(cleaned, ',', '.');
//       END IF;
//   
//       RETURN CAST(cleaned AS NUMERIC);
//   EXCEPTION WHEN OTHERS THEN
//       RETURN 0;
//   END;
//   $function$
//   
// FUNCTION parse_currency_sql(text)
//   CREATE OR REPLACE FUNCTION public.parse_currency_sql(val_str text)
//    RETURNS numeric
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//       cleaned TEXT;
//   BEGIN
//       IF val_str IS NULL OR TRIM(val_str) = '' THEN
//           RETURN 0;
//       END IF;
//   
//       cleaned := REGEXP_REPLACE(val_str, '[^0-9.,-]', '', 'g');
//       
//       IF cleaned = '' OR cleaned = '-' THEN
//           RETURN 0;
//       END IF;
//   
//       IF POSITION(',' IN cleaned) > 0 THEN
//           cleaned := REPLACE(cleaned, '.', '');
//           cleaned := REPLACE(cleaned, ',', '.');
//       END IF;
//   
//       RETURN CAST(cleaned AS NUMERIC);
//   EXCEPTION WHEN OTHERS THEN
//       RETURN 0;
//   END;
//   $function$
//   
// FUNCTION process_inventory_batch(integer, jsonb, integer)
//   CREATE OR REPLACE FUNCTION public.process_inventory_batch(p_session_id integer, p_items jsonb, p_funcionario_id integer)
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//     item JSONB;
//     v_prod_id INTEGER;
//     v_prod_code INTEGER;
//     v_qty NUMERIC;
//     v_price NUMERIC;
//     v_prod_name TEXT;
//     v_prev_balance NUMERIC;
//     v_current_record_id INTEGER;
//     v_now TIMESTAMP;
//     v_date_str TEXT;
//     v_time_str TEXT;
//   BEGIN
//     -- Validate inputs
//     IF p_session_id IS NULL THEN
//       RAISE EXCEPTION 'Session ID cannot be null';
//     END IF;
//   
//     v_now := NOW();
//     v_date_str := to_char(v_now, 'YYYY-MM-DD');
//     v_time_str := to_char(v_now, 'HH24:MI:SS');
//   
//     -- 1. Clear existing counts snapshot for this session to ensure we replace with new batch
//     -- This ensures data integrity and prevents duplicate entries if re-saved
//     DELETE FROM "CONTAGEM DE ESTOQUE FINAL"
//     WHERE session_id = p_session_id;
//   
//     -- 2. Loop through items to process
//     FOR item IN SELECT * FROM jsonb_array_elements(p_items)
//     LOOP
//       -- Safe casting with checks
//       v_prod_id := (item->>'productId')::INTEGER;
//       
//       -- Handle nullable productCode
//       IF (item->>'productCode') IS NULL OR (item->>'productCode') = 'null' THEN
//          v_prod_code := NULL;
//       ELSE
//          v_prod_code := (item->>'productCode')::INTEGER;
//       END IF;
//   
//       -- Default quantity to 0 if missing
//       IF (item->>'quantity') IS NULL OR (item->>'quantity') = 'null' THEN
//          v_qty := 0;
//       ELSE
//          v_qty := (item->>'quantity')::NUMERIC;
//       END IF;
//   
//       v_price := (item->>'price')::NUMERIC;
//       v_prod_name := item->>'productName';
//   
//       -- Insert into snapshot table
//       INSERT INTO "CONTAGEM DE ESTOQUE FINAL" (produto_id, quantidade, session_id, valor_unitario_snapshot)
//       VALUES (v_prod_id, v_qty, p_session_id, v_price);
//   
//       -- Update BANCO_DE_DADOS Ledger if we have a product code
//       -- This table drives the historical reports and session continuity
//       IF v_prod_code IS NOT NULL THEN
//         -- Check for existing record in this session
//         SELECT "ID VENDA ITENS" INTO v_current_record_id
//         FROM "BANCO_DE_DADOS"
//         WHERE "COD. PRODUTO" = v_prod_code
//           AND session_id = p_session_id
//         LIMIT 1;
//   
//         IF v_current_record_id IS NOT NULL THEN
//           -- UPDATE EXISTING:
//           -- Overwrite SALDO FINAL and CONTAGEM with the new verified count.
//           UPDATE "BANCO_DE_DADOS"
//           SET
//             "SALDO FINAL" = v_qty,
//             "CONTAGEM" = v_qty,
//             "DATA DO ACERTO" = v_date_str::DATE, -- Explicit Cast to DATE to avoid "type text" errors
//             "HORA DO ACERTO" = v_time_str,
//             "CODIGO FUNCIONARIO" = p_funcionario_id
//           WHERE "ID VENDA ITENS" = v_current_record_id;
//         ELSE
//           -- INSERT NEW:
//           -- Continuity Logic: Find the closing balance from the previous session.
//           -- We prioritize the session with the highest ID that is NOT the current one.
//           SELECT "SALDO FINAL" INTO v_prev_balance
//           FROM "BANCO_DE_DADOS"
//           WHERE "COD. PRODUTO" = v_prod_code
//             AND (session_id IS NULL OR session_id != p_session_id)
//           ORDER BY 
//             session_id DESC NULLS LAST,
//             "DATA DO ACERTO" DESC,
//             "HORA DO ACERTO" DESC
//           LIMIT 1;
//   
//           -- Default to 0 if no history exists
//           IF v_prev_balance IS NULL THEN
//             v_prev_balance := 0;
//           END IF;
//   
//           INSERT INTO "BANCO_DE_DADOS" (
//             "COD. PRODUTO",
//             "CODIGO FUNCIONARIO",
//             "SALDO FINAL",
//             "CONTAGEM",
//             "DATA DO ACERTO",
//             "HORA DO ACERTO",
//             "MERCADORIA",
//             "TIPO",
//             "SALDO INICIAL",
//             "session_id"
//           ) VALUES (
//             v_prod_code,
//             p_funcionario_id,
//             v_qty,        -- New Balance becomes Saldo Final
//             v_qty,        -- Count
//             v_date_str::DATE, -- Explicit Cast to DATE
//             v_time_str,
//             v_prod_name,
//             'CONTAGEM_FINAL',
//             v_prev_balance, -- Carried over Balance from previous session
//             p_session_id
//           );
//         END IF;
//       END IF;
//     END LOOP;
//   END;
//   $function$
//   
// FUNCTION refresh_debitos_historico()
//   CREATE OR REPLACE FUNCTION public.refresh_debitos_historico()
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//       DELETE FROM debitos_historico;
//   
//       INSERT INTO debitos_historico (
//           pedido_id,
//           data_acerto,
//           hora_acerto,
//           vendedor_nome,
//           cliente_codigo,
//           cliente_nome,
//           rota,
//           valor_venda,
//           desconto,
//           saldo_a_pagar,
//           valor_pago,
//           debito
//       )
//       WITH vendas AS (
//           SELECT 
//               "NÚMERO DO PEDIDO" as pedido_id,
//               MAX("DATA DO ACERTO") as data_acerto_str,
//               MAX("HORA DO ACERTO") as hora_acerto,
//               MAX("FUNCIONÁRIO") as vendedor_nome,
//               MAX("CÓDIGO DO CLIENTE") as cliente_id,
//               MAX("CLIENTE") as cliente_nome,
//               MAX("DESCONTO POR GRUPO") as desconto_str,
//               SUM(public.parse_currency_sql("VALOR VENDIDO")) as valor_venda
//           FROM "BANCO_DE_DADOS"
//           WHERE "NÚMERO DO PEDIDO" IS NOT NULL
//           GROUP BY "NÚMERO DO PEDIDO"
//       ),
//       vendas_calc AS (
//           SELECT 
//               v.*,
//               -- Replicate Discount Logic
//               CASE 
//                   WHEN public.parse_currency_sql(v.desconto_str) > 0 THEN
//                       CASE
//                           WHEN v.desconto_str LIKE '%%%' THEN
//                                v.valor_venda * (public.parse_currency_sql(REPLACE(v.desconto_str, '%', '')) / 100.0)
//                           WHEN public.parse_currency_sql(v.desconto_str) < 1 THEN
//                                v.valor_venda * public.parse_currency_sql(v.desconto_str)
//                           WHEN public.parse_currency_sql(v.desconto_str) <= 100 THEN
//                                v.valor_venda * (public.parse_currency_sql(v.desconto_str) / 100.0)
//                           ELSE
//                                public.parse_currency_sql(v.desconto_str)
//                       END
//                   ELSE 0
//               END as desconto_calc,
//               public.safe_cast_timestamp(v.data_acerto_str, v.hora_acerto) as data_acerto
//           FROM vendas v
//       ),
//       pagamentos AS (
//           SELECT 
//               venda_id,
//               SUM(valor_pago) as valor_pago
//           FROM "RECEBIMENTOS"
//           GROUP BY venda_id
//       ),
//       client_info AS (
//           SELECT "CODIGO" as cliente_id, "GRUPO ROTA" as rota
//           FROM "CLIENTES"
//       )
//       SELECT
//           vc.pedido_id,
//           vc.data_acerto,
//           vc.hora_acerto,
//           vc.vendedor_nome,
//           vc.cliente_id,
//           vc.cliente_nome,
//           client_info.rota,
//           vc.valor_venda,
//           vc.desconto_calc,
//           (vc.valor_venda - vc.desconto_calc),
//           COALESCE(p.valor_pago, 0),
//           GREATEST(0, (vc.valor_venda - vc.desconto_calc) - COALESCE(p.valor_pago, 0))
//       FROM vendas_calc vc
//       LEFT JOIN pagamentos p ON vc.pedido_id = p.venda_id
//       LEFT JOIN client_info ON vc.cliente_id = client_info.cliente_id;
//   END;
//   $function$
//   
// FUNCTION reset_x_na_rota_on_activity()
//   CREATE OR REPLACE FUNCTION public.reset_x_na_rota_on_activity()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//       v_active_rota_id integer;
//       v_client_id integer;
//   BEGIN
//       -- Identify the active route (route with no end date)
//       SELECT id INTO v_active_rota_id FROM "ROTA" WHERE data_fim IS NULL ORDER BY id DESC LIMIT 1;
//       
//       IF v_active_rota_id IS NULL THEN
//           RETURN NEW;
//       END IF;
//   
//       -- Determine Client ID based on source table
//       IF TG_TABLE_NAME = 'BANCO_DE_DADOS' THEN
//           v_client_id := NEW."CÓDIGO DO CLIENTE";
//       ELSIF TG_TABLE_NAME = 'RECEBIMENTOS' THEN
//           v_client_id := NEW.cliente_id;
//       END IF;
//   
//       IF v_client_id IS NOT NULL THEN
//           -- Reset x_na_rota to 0 for this client in the active route
//           UPDATE "ROTA_ITEMS"
//           SET x_na_rota = 0
//           WHERE rota_id = v_active_rota_id
//           AND cliente_id = v_client_id;
//       END IF;
//   
//       RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION safe_cast_timestamp(text, text)
//   CREATE OR REPLACE FUNCTION public.safe_cast_timestamp(p_date text, p_time text)
//    RETURNS timestamp without time zone
//    LANGUAGE plpgsql
//    IMMUTABLE
//   AS $function$
//   BEGIN
//     BEGIN
//       IF p_date IS NULL OR p_date = '' THEN RETURN NULL; END IF;
//       -- Try to combine date and time
//       IF p_time IS NULL OR p_time = '' THEN
//         RETURN p_date::TIMESTAMP;
//       ELSE
//         RETURN (p_date || ' ' || p_time)::TIMESTAMP;
//       END IF;
//     EXCEPTION WHEN OTHERS THEN
//       RETURN NULL;
//     END;
//   END;
//   $function$
//   
// FUNCTION safe_timestamp_combine(text, text)
//   CREATE OR REPLACE FUNCTION public.safe_timestamp_combine(p_date text, p_time text)
//    RETURNS timestamp without time zone
//    LANGUAGE plpgsql
//    STABLE
//   AS $function$
//   BEGIN
//     IF p_date IS NULL OR p_date = '' THEN
//       RETURN NULL;
//     END IF;
//   
//     -- Default time if missing
//     IF p_time IS NULL OR p_time = '' THEN
//       p_time := '00:00:00';
//     END IF;
//   
//     BEGIN
//       -- Try simple concatenation cast (works for ISO YYYY-MM-DD and standard formats)
//       RETURN (p_date || ' ' || p_time)::TIMESTAMP;
//     EXCEPTION WHEN OTHERS THEN
//       RETURN NULL; -- Gracefully handle malformed dates by returning NULL
//     END;
//   END;
//   $function$
//   
// FUNCTION start_new_inventory_session()
//   CREATE OR REPLACE FUNCTION public.start_new_inventory_session()
//    RETURNS json
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//       v_new_session_id integer;
//       v_last_session_id integer;
//       v_new_session_record record;
//   BEGIN
//       -- Close current open sessions
//       UPDATE "ID Inventário"
//       SET status = 'FECHADO', data_fim = NOW()
//       WHERE status = 'ABERTO';
//   
//       -- Create new session
//       INSERT INTO "ID Inventário" (status, data_inicio)
//       VALUES ('ABERTO', NOW())
//       RETURNING * INTO v_new_session_record;
//       
//       v_new_session_id := v_new_session_record.id;
//   
//       -- Find last closed session to carry over balances
//       SELECT id INTO v_last_session_id
//       FROM "ID Inventário"
//       WHERE status = 'FECHADO' AND id < v_new_session_id
//       ORDER BY id DESC
//       LIMIT 1;
//   
//       -- Copy balances if last session exists
//       IF v_last_session_id IS NOT NULL THEN
//           INSERT INTO "ESTOQUE GERAL SALDO INICIAL" (
//               id_inventario,
//               produto_id,
//               saldo_inicial,
//               produto,
//               preco,
//               codigo_produto,
//               barcode
//           )
//           SELECT
//               v_new_session_id,
//               a.produto_id,
//               a.novo_saldo_final,
//               p."PRODUTO",
//               -- Use existing helper to safely parse currency string to numeric
//               parse_currency_sql(p."PREÇO"),
//               p."CODIGO",
//               CAST(p."CÓDIGO BARRAS" AS TEXT)
//           FROM "ESTOQUE GERAL AJUSTES" a
//           JOIN "PRODUTOS" p ON a.produto_id = p."ID"
//           WHERE a.id_inventario = v_last_session_id;
//       END IF;
//   
//       RETURN row_to_json(v_new_session_record);
//   END;
//   $function$
//   
// FUNCTION sync_pix_receipt_on_insert()
//   CREATE OR REPLACE FUNCTION public.sync_pix_receipt_on_insert()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//       IF NEW.forma_pagamento ILIKE '%pix%' THEN
//           INSERT INTO "public"."PIX" (recebimento_id, venda_id)
//           VALUES (NEW.id, NEW.venda_id)
//           ON CONFLICT (recebimento_id) DO NOTHING;
//       END IF;
//       RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION transfer_unattended_items(integer, integer)
//   CREATE OR REPLACE FUNCTION public.transfer_unattended_items(p_old_rota_id integer, p_new_rota_id integer)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//       v_data_inicio timestamp;
//   BEGIN
//       -- Get start date of the old route to check for attendance
//       SELECT data_inicio INTO v_data_inicio FROM "ROTA" WHERE id = p_old_rota_id;
//   
//       -- Insert items for the new route based on unattended clients from the old route
//       -- We copy x_na_rota and vendedor_id as is (preserved)
//       INSERT INTO "ROTA_ITEMS" (
//           rota_id, 
//           cliente_id, 
//           x_na_rota, 
//           vendedor_id, 
//           boleto, 
//           agregado
//       )
//       SELECT 
//           p_new_rota_id,
//           ri.cliente_id,
//           ri.x_na_rota, -- Preserved (No increment here, assuming increment happens on assignment or manual update if needed)
//           ri.vendedor_id, -- Preserved
//           ri.boleto,
//           ri.agregado
//       FROM "ROTA_ITEMS" ri
//       WHERE ri.rota_id = p_old_rota_id
//       -- Exclude clients who had attendance (Acerto) in BANCO_DE_DADOS after route start
//       AND NOT EXISTS (
//           SELECT 1 
//           FROM "BANCO_DE_DADOS" bd 
//           WHERE bd."CÓDIGO DO CLIENTE" = ri.cliente_id 
//           AND (
//               CASE 
//                   WHEN bd."DATA DO ACERTO" ~ '^\d{4}-\d{2}-\d{2}' THEN bd."DATA DO ACERTO"::timestamp 
//                   ELSE NULL 
//               END
//           ) >= v_data_inicio
//       )
//       -- Exclude clients who had attendance (Recebimento) in RECEBIMENTOS after route start
//       AND NOT EXISTS (
//           SELECT 1
//           FROM "RECEBIMENTOS" rec
//           WHERE rec.cliente_id = ri.cliente_id
//           AND rec.created_at::timestamp >= v_data_inicio
//       );
//   END;
//   $function$
//   
// FUNCTION transfer_unattended_items_v2(bigint, bigint)
//   CREATE OR REPLACE FUNCTION public.transfer_unattended_items_v2(p_old_rota_id bigint, p_new_rota_id bigint)
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//       v_rota_inicio TIMESTAMP;
//   BEGIN
//       -- Get old route start date
//       SELECT data_inicio INTO v_rota_inicio
//       FROM "ROTA"
//       WHERE id = p_old_rota_id;
//   
//       -- Insert into new route items based on logic
//       INSERT INTO "ROTA_ITEMS" (rota_id, cliente_id, vendedor_id, x_na_rota, boleto, agregado)
//       SELECT 
//           p_new_rota_id,
//           ri.cliente_id,
//           ri.vendedor_id,
//           ri.x_na_rota,
//           ri.boleto,
//           ri.agregado
//       FROM "ROTA_ITEMS" ri
//       WHERE ri.rota_id = p_old_rota_id
//       -- Exclude clients who have been attended (Data de Acerto >= Rota Inicio)
//       AND NOT EXISTS (
//           SELECT 1 
//           FROM "BANCO_DE_DADOS" bd
//           WHERE bd."CÓDIGO DO CLIENTE" = ri.cliente_id
//           AND (
//               (bd."DATA E HORA"::TIMESTAMP >= v_rota_inicio)
//               OR
//               (bd."DATA DO ACERTO"::DATE >= v_rota_inicio::DATE)
//           )
//       )
//       -- Also exclude clients who have paid (Recebimentos >= Rota Inicio)
//       AND NOT EXISTS (
//            SELECT 1
//            FROM "RECEBIMENTOS" rec
//            WHERE rec.cliente_id = ri.cliente_id
//            AND rec.created_at >= v_rota_inicio
//       );
//   END;
//   $function$
//   
// FUNCTION transfer_unattended_items_v3(bigint, bigint)
//   CREATE OR REPLACE FUNCTION public.transfer_unattended_items_v3(p_old_rota_id bigint, p_new_rota_id bigint)
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//       v_rota_inicio TIMESTAMP;
//   BEGIN
//       -- Get old route start date
//       SELECT data_inicio INTO v_rota_inicio
//       FROM "ROTA"
//       WHERE id = p_old_rota_id;
//   
//       -- Insert into new route items based on logic
//       INSERT INTO "ROTA_ITEMS" (rota_id, cliente_id, vendedor_id, x_na_rota, boleto, agregado)
//       SELECT 
//           p_new_rota_id,
//           ri.cliente_id,
//           ri.vendedor_id,
//           COALESCE(ri.x_na_rota, 0) + 1,
//           ri.boleto,
//           ri.agregado
//       FROM "ROTA_ITEMS" ri
//       WHERE ri.rota_id = p_old_rota_id
//       -- Exclude clients who have been attended in the previous route
//       -- We use STRICT timestamp comparison to ensure visual consistency with the UI
//       -- and to avoid counting overlapping same-day previous-cycle settlements as attended in the current cycle
//       AND NOT EXISTS (
//           SELECT 1 
//           FROM "BANCO_DE_DADOS" bd
//           WHERE bd."CÓDIGO DO CLIENTE" = ri.cliente_id
//           AND (
//               bd."DATA E HORA"::TIMESTAMP >= v_rota_inicio
//           )
//       )
//       -- Also exclude clients who have paid (Recebimentos >= Rota Inicio)
//       AND NOT EXISTS (
//            SELECT 1
//            FROM "RECEBIMENTOS" rec
//            WHERE rec.cliente_id = ri.cliente_id
//            AND rec.created_at >= v_rota_inicio
//       );
//   END;
//   $function$
//   
// FUNCTION trigger_update_debito_historico()
//   CREATE OR REPLACE FUNCTION public.trigger_update_debito_historico()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF TG_OP = 'DELETE' THEN
//       PERFORM update_debito_historico_order(OLD.venda_id);
//       RETURN OLD;
//     ELSE
//       PERFORM update_debito_historico_order(NEW.venda_id);
//       RETURN NEW;
//     END IF;
//   END;
//   $function$
//   
// FUNCTION trigger_update_debito_historico_sales()
//   CREATE OR REPLACE FUNCTION public.trigger_update_debito_historico_sales()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     PERFORM update_debito_historico_order(NEW."NÚMERO DO PEDIDO");
//     RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION update_debito_historico_order(bigint)
//   CREATE OR REPLACE FUNCTION public.update_debito_historico_order(p_pedido_id bigint)
//    RETURNS void
//    LANGUAGE plpgsql
//   AS $function$
//   DECLARE
//       v_total_pago NUMERIC := 0;
//       v_valor_venda NUMERIC := 0;
//       v_desconto_str TEXT;
//       v_desconto_val NUMERIC := 0;
//       v_desconto_final NUMERIC := 0;
//       v_saldo_a_pagar NUMERIC := 0;
//       v_debito NUMERIC := 0;
//       
//       v_cliente_id BIGINT;
//       v_cliente_nome TEXT;
//       v_vendedor_nome TEXT;
//       v_data_acerto_str TEXT;
//       v_hora_acerto TEXT;
//       v_rota TEXT;
//       v_data_acerto_ts TIMESTAMP;
//   BEGIN
//       -- 1. Calculate Total Paid from RECEBIMENTOS
//       SELECT COALESCE(SUM(valor_pago), 0)
//       INTO v_total_pago
//       FROM "RECEBIMENTOS"
//       WHERE venda_id = p_pedido_id;
//   
//       -- 2. Fetch Sales Data
//       SELECT 
//           SUM(public.parse_currency_sql("VALOR VENDIDO")),
//           MAX("CÓDIGO DO CLIENTE"),
//           MAX("CLIENTE"),
//           MAX("FUNCIONÁRIO"),
//           MAX("DATA DO ACERTO"),
//           MAX("HORA DO ACERTO"),
//           MAX("DESCONTO POR GRUPO")
//       INTO 
//           v_valor_venda,
//           v_cliente_id,
//           v_cliente_nome,
//           v_vendedor_nome,
//           v_data_acerto_str,
//           v_hora_acerto,
//           v_desconto_str
//       FROM "BANCO_DE_DADOS"
//       WHERE "NÚMERO DO PEDIDO" = p_pedido_id;
//   
//       IF v_cliente_id IS NULL THEN
//           RETURN;
//       END IF;
//   
//       -- Get Rota Name
//       SELECT "GRUPO ROTA" INTO v_rota
//       FROM "CLIENTES"
//       WHERE "CODIGO" = v_cliente_id;
//   
//       -- 3. Calculate Discount safely
//       v_desconto_val := public.parse_currency_sql(v_desconto_str);
//       
//       IF v_desconto_val > 0 THEN
//           IF v_desconto_str LIKE '%%%' THEN
//                v_desconto_final := v_valor_venda * (public.parse_currency_sql(REPLACE(v_desconto_str, '%', '')) / 100.0);
//           ELSIF v_desconto_val < 1 THEN 
//                -- e.g. 0.10 -> 10%
//                v_desconto_final := v_valor_venda * v_desconto_val;
//           ELSIF v_desconto_val <= 100 THEN 
//                -- e.g. 10 -> 10%
//                v_desconto_final := v_valor_venda * (v_desconto_val / 100.0);
//           ELSE
//                -- Absolute values larger than 100
//                v_desconto_final := v_desconto_val;
//           END IF;
//       ELSE
//           v_desconto_final := 0;
//       END IF;
//   
//       -- 4. Calculate Expected Payment (Sales - Discount)
//       v_saldo_a_pagar := v_valor_venda - v_desconto_final;
//       
//       -- 5. Calculate Debt
//       v_debito := v_saldo_a_pagar - v_total_pago;
//       
//       IF v_debito < 0.01 THEN 
//           v_debito := 0; 
//       END IF;
//   
//       -- Handle date formatting reliably
//       BEGIN
//           IF v_data_acerto_str IS NOT NULL AND v_data_acerto_str <> '' THEN
//               IF v_hora_acerto IS NOT NULL AND v_hora_acerto <> '' THEN
//                   v_data_acerto_ts := (v_data_acerto_str || ' ' || v_hora_acerto)::TIMESTAMP;
//               ELSE
//                   v_data_acerto_ts := v_data_acerto_str::TIMESTAMP;
//               END IF;
//           ELSE
//               v_data_acerto_ts := NOW();
//           END IF;
//       EXCEPTION WHEN OTHERS THEN
//           v_data_acerto_ts := NOW();
//       END;
//   
//       -- 6. UPSERT into debitos_historico
//       INSERT INTO debitos_historico (
//           pedido_id,
//           cliente_codigo,
//           cliente_nome,
//           valor_venda,
//           valor_pago,
//           debito,
//           data_acerto,
//           hora_acerto,
//           vendedor_nome,
//           desconto,
//           saldo_a_pagar,
//           rota
//       ) VALUES (
//           p_pedido_id,
//           v_cliente_id,
//           v_cliente_nome,
//           v_valor_venda,
//           v_total_pago,
//           v_debito,
//           v_data_acerto_ts,
//           v_hora_acerto,
//           v_vendedor_nome,
//           v_desconto_final,
//           v_saldo_a_pagar,
//           v_rota
//       )
//       ON CONFLICT (pedido_id) DO UPDATE SET
//           valor_pago = EXCLUDED.valor_pago,
//           debito = EXCLUDED.debito,
//           saldo_a_pagar = EXCLUDED.saldo_a_pagar,
//           valor_venda = EXCLUDED.valor_venda,
//           desconto = EXCLUDED.desconto,
//           data_acerto = EXCLUDED.data_acerto,
//           hora_acerto = EXCLUDED.hora_acerto,
//           vendedor_nome = EXCLUDED.vendedor_nome,
//           rota = EXCLUDED.rota;
//           
//   END;
//   $function$
//   
// FUNCTION update_x_na_rota()
//   CREATE OR REPLACE FUNCTION public.update_x_na_rota()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     -- Manual Override Check: If x_na_rota is explicitly changed in the UPDATE, do nothing (respect manual change)
//     IF NEW.x_na_rota IS DISTINCT FROM OLD.x_na_rota THEN
//       RETURN NEW;
//     END IF;
//   
//     -- Logic: Seller Assigned (Null -> Value) -> Increment
//     IF OLD.vendedor_id IS NULL AND NEW.vendedor_id IS NOT NULL THEN
//       NEW.x_na_rota := COALESCE(OLD.x_na_rota, 0) + 1;
//     -- Logic: Seller Removed (Value -> Null) -> Decrement
//     ELSIF OLD.vendedor_id IS NOT NULL AND NEW.vendedor_id IS NULL THEN
//       NEW.x_na_rota := GREATEST(0, COALESCE(OLD.x_na_rota, 0) - 1);
//     END IF;
//   
//     RETURN NEW;
//   END;
//   $function$
//   
// FUNCTION verify_employee_credentials(text, text)
//   CREATE OR REPLACE FUNCTION public.verify_employee_credentials(p_email text, p_senha text)
//    RETURNS TABLE(id bigint, email text, nome_completo text, setor text[], foto_url text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT f.id, f.email, f.nome_completo, f.setor, f.foto_url
//     FROM "public"."FUNCIONARIOS" f
//     WHERE f.email = p_email AND f.senha = p_senha
//     LIMIT 1;
//   END;
//   $function$
//   

// --- TRIGGERS ---
// Table: BANCO_DE_DADOS
//   trg_reset_x_na_rota_bd: CREATE TRIGGER trg_reset_x_na_rota_bd AFTER INSERT ON public."BANCO_DE_DADOS" FOR EACH ROW EXECUTE FUNCTION reset_x_na_rota_on_activity()
//   trg_update_debito_historico_sales: CREATE TRIGGER trg_update_debito_historico_sales AFTER INSERT OR UPDATE ON public."BANCO_DE_DADOS" FOR EACH ROW EXECUTE FUNCTION trigger_update_debito_historico_sales()
// Table: DESPESAS
//   on_despesa_auto_confirm: CREATE TRIGGER on_despesa_auto_confirm BEFORE INSERT OR UPDATE OF saiu_do_caixa, status ON public."DESPESAS" FOR EACH ROW EXECUTE FUNCTION auto_confirm_despesa()
// Table: RECEBIMENTOS
//   trg_reset_x_na_rota_rec: CREATE TRIGGER trg_reset_x_na_rota_rec AFTER INSERT ON public."RECEBIMENTOS" FOR EACH ROW EXECUTE FUNCTION reset_x_na_rota_on_activity()
//   trg_sync_pix_receipt: CREATE TRIGGER trg_sync_pix_receipt AFTER INSERT OR UPDATE OF forma_pagamento ON public."RECEBIMENTOS" FOR EACH ROW EXECUTE FUNCTION sync_pix_receipt_on_insert()
//   trg_update_debito_historico_recebimentos: CREATE TRIGGER trg_update_debito_historico_recebimentos AFTER INSERT OR DELETE OR UPDATE ON public."RECEBIMENTOS" FOR EACH ROW EXECUTE FUNCTION trigger_update_debito_historico()
//   trigger_clear_cobranca_info: CREATE TRIGGER trigger_clear_cobranca_info BEFORE INSERT OR UPDATE ON public."RECEBIMENTOS" FOR EACH ROW EXECUTE FUNCTION clear_cobranca_info_if_paid()
// Table: ROTA_ITEMS
//   tr_update_x_na_rota: CREATE TRIGGER tr_update_x_na_rota BEFORE UPDATE ON public."ROTA_ITEMS" FOR EACH ROW EXECUTE FUNCTION update_x_na_rota()
//   trg_update_x_na_rota: CREATE TRIGGER trg_update_x_na_rota BEFORE INSERT OR UPDATE ON public."ROTA_ITEMS" FOR EACH ROW EXECUTE FUNCTION update_x_na_rota()

// --- INDEXES ---
// Table: BANCO_DE_DADOS
//   CREATE INDEX idx_banco_dados_cod_produto ON public."BANCO_DE_DADOS" USING btree ("COD. PRODUTO")
//   CREATE INDEX idx_banco_dados_funcionario_id ON public."BANCO_DE_DADOS" USING btree ("CODIGO FUNCIONARIO")
//   CREATE INDEX idx_banco_dados_session_func ON public."BANCO_DE_DADOS" USING btree (session_id, "CODIGO FUNCIONARIO")
//   CREATE INDEX idx_banco_dados_session_id ON public."BANCO_DE_DADOS" USING btree (session_id)
//   CREATE INDEX idx_banco_de_dados_cliente_data_acerto ON public."BANCO_DE_DADOS" USING btree ("CÓDIGO DO CLIENTE", "DATA DO ACERTO" DESC, "HORA DO ACERTO" DESC)
//   CREATE INDEX idx_banco_de_dados_data_do_acerto ON public."BANCO_DE_DADOS" USING btree ("DATA DO ACERTO")
// Table: CRIAR_NOVA_ROTA
//   CREATE UNIQUE INDEX criar_nova_rota_nome_rota_idx ON public."CRIAR_NOVA_ROTA" USING btree (nome_rota)
// Table: DATAS DE INVENTÁRIO
//   CREATE INDEX idx_datas_inventario_funcionario ON public."DATAS DE INVENTÁRIO" USING btree ("CODIGO FUNCIONARIO")
//   CREATE INDEX idx_datas_inventario_tipo ON public."DATAS DE INVENTÁRIO" USING btree ("TIPO")
// Table: ESTOQUE CARRO CONTAGEM
//   CREATE INDEX idx_ec_contagem_sess ON public."ESTOQUE CARRO CONTAGEM" USING btree (id_estoque_carro)
// Table: ESTOQUE CARRO SALDO FINAL
//   CREATE INDEX idx_ec_saldo_fin_sess ON public."ESTOQUE CARRO SALDO FINAL" USING btree (id_estoque_carro)
// Table: ESTOQUE CARRO SALDO INICIAL
//   CREATE INDEX idx_ec_saldo_ini_sess ON public."ESTOQUE CARRO SALDO INICIAL" USING btree (id_estoque_carro)
// Table: ID ESTOQUE CARRO
//   CREATE INDEX idx_estoque_carro_func ON public."ID ESTOQUE CARRO" USING btree (funcionario_id)
// Table: PENDENCIAS
//   CREATE INDEX idx_pendencias_cliente_id ON public."PENDENCIAS" USING btree (cliente_id)
//   CREATE INDEX idx_pendencias_funcionario_id ON public."PENDENCIAS" USING btree (funcionario_id)
//   CREATE INDEX idx_pendencias_resolvida ON public."PENDENCIAS" USING btree (resolvida)
// Table: PIX
//   CREATE UNIQUE INDEX "PIX_recebimento_id_key" ON public."PIX" USING btree (recebimento_id)
// Table: RECEBIMENTOS
//   CREATE INDEX idx_recebimentos_rota_id ON public."RECEBIMENTOS" USING btree (rota_id)
// Table: RELATORIO_DE_ESTOQUE
//   CREATE INDEX idx_relatorio_estoque_cliente ON public."RELATORIO_DE_ESTOQUE" USING btree (codigo_cliente)
//   CREATE INDEX idx_relatorio_estoque_created_at ON public."RELATORIO_DE_ESTOQUE" USING btree (created_at)
//   CREATE INDEX idx_relatorio_estoque_pedido ON public."RELATORIO_DE_ESTOQUE" USING btree (numero_pedido)
// Table: REPOSIÇÃO E DEVOLUÇÃO
//   CREATE INDEX idx_reposicao_estoque_carro ON public."REPOSIÇÃO E DEVOLUÇÃO" USING btree (id_estoque_carro)
// Table: ROTA_ITEMS
//   CREATE UNIQUE INDEX "ROTA_ITEMS_rota_id_cliente_id_key" ON public."ROTA_ITEMS" USING btree (rota_id, cliente_id)
//   CREATE INDEX idx_rota_items_cliente_id ON public."ROTA_ITEMS" USING btree (cliente_id)
//   CREATE INDEX idx_rota_items_rota_id ON public."ROTA_ITEMS" USING btree (rota_id)
//   CREATE INDEX idx_rota_items_vendedor_proximo_id ON public."ROTA_ITEMS" USING btree (vendedor_proximo_id)
// Table: VEICULOS
//   CREATE UNIQUE INDEX "VEICULOS_placa_key" ON public."VEICULOS" USING btree (placa)
// Table: boletos
//   CREATE INDEX idx_boletos_cliente_codigo ON public.boletos USING btree (cliente_codigo)
//   CREATE INDEX idx_boletos_vencimento ON public.boletos USING btree (vencimento)
// Table: configuracoes
//   CREATE UNIQUE INDEX configuracoes_chave_key ON public.configuracoes USING btree (chave)
// Table: debitos_historico
//   CREATE INDEX idx_debitos_historico_cliente_codigo ON public.debitos_historico USING btree (cliente_codigo)
//   CREATE UNIQUE INDEX idx_debitos_historico_pedido_id ON public.debitos_historico USING btree (pedido_id)
// Table: dre_categorias
//   CREATE UNIQUE INDEX dre_categorias_nome_key ON public.dre_categorias USING btree (nome)
// Table: fechamento_caixa
//   CREATE UNIQUE INDEX fechamento_caixa_rota_id_funcionario_id_key ON public.fechamento_caixa USING btree (rota_id, funcionario_id)
//   CREATE INDEX idx_fechamento_caixa_funcionario_id ON public.fechamento_caixa USING btree (funcionario_id)
//   CREATE INDEX idx_fechamento_caixa_rota_id ON public.fechamento_caixa USING btree (rota_id)
// Table: inativar_clientes
//   CREATE INDEX idx_inativar_clientes_cliente_codigo ON public.inativar_clientes USING btree (cliente_codigo)
//   CREATE INDEX idx_inativar_clientes_created_at ON public.inativar_clientes USING btree (created_at)
//   CREATE INDEX idx_inativar_clientes_status ON public.inativar_clientes USING btree (status)
// Table: metas_funcionarios
//   CREATE UNIQUE INDEX metas_funcionarios_funcionario_id_key ON public.metas_funcionarios USING btree (funcionario_id)
// Table: permissoes
//   CREATE UNIQUE INDEX permissoes_setor_modulo_key ON public.permissoes USING btree (setor, modulo)
// Table: sessoes_inventario
//   CREATE INDEX idx_sessoes_inventario_status ON public.sessoes_inventario USING btree (status)

