export interface Expense {
  id: string;
  nome: string;
  dataVencimento: string;
  dataPagamento?: string;
  valor: number;
  categoria: string;
  subcategoria: string;
  status: 'pendente' | 'pago' | 'vencido';
  createdAt: string;
  userId: string; // adiciona aqui para tipar bem o usuário
}

export interface ExpenseFormData {
  nome: string;
  dataVencimento: Date | undefined;
  dataPagamento: Date | undefined;
  valor: string;
  categoria: string;
  subcategoria: string;
  placa: string; 
// placa do veículo ou nome do funcionário
}