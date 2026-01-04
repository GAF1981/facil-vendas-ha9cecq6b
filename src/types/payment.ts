export type PaymentMethodType = 'Pix' | 'Dinheiro' | 'Boleto' | 'Cheque'

export interface PaymentInstallment {
  number: number
  value: number
  paidValue: number // Maps to "Valor Pago" for individual installments (e.g. ENTRADA)
  dueDate: string
}

export interface PaymentEntry {
  method: PaymentMethodType
  value: number // Maps to "Valor Registrado"
  paidValue: number // Maps to "Valor Pago"
  installments: number
  dueDate: string
  details?: PaymentInstallment[] // For granular control
  hasZeroDownPayment?: boolean // New field for "Sem Entrada" logic
}

// Reordered to prioritize PIX
export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Pix',
  'Dinheiro',
  'Boleto',
  'Cheque',
]
