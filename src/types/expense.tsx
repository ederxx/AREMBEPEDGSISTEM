export interface Expense {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  subcategoria?: string;
  empresa?: string;
  formaPagamento?: string;
  dataVencimento?: string; // ISO string
  dataPagamento?: string; // ISO string
  userId?: string;
    createdAt?: any;
  status?: 'pendente' | 'pago' | 'vencido';
}

export interface ExpenseFormData {
  nome: string;
  dataVencimento: Date | undefined;
  dataPagamento: Date | undefined;
  valor: string;
  categoria: string;
  subcategoria: string;
  placa: string; 
  empresa: string;
  formaPagamento: string;
    funcionario: string;
    recorrente: boolean; // adiciona aqui para tipar bem a empresa
// placa do veículo ou nome do funcionário
}