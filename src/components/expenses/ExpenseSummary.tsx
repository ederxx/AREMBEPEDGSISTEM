import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import { Expense } from '@/types/expense';

interface ExpenseSummaryProps {
  expenses: Expense[];
}

const ExpenseSummary = ({ expenses }: ExpenseSummaryProps) => {
  // Função para calcular o status, igual no seu componente ExpensesList
  const calculateStatus = (expense: Expense): 'pago' | 'pendente' | 'vencido' => {
    const hoje = new Date();
    const vencimento = new Date(expense.dataVencimento);
    const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;

    if (pagamento && pagamento <= hoje) return 'pago';
    if (vencimento > hoje && (!pagamento || pagamento > hoje)) return 'pendente';
    if (vencimento < hoje && (!pagamento || pagamento > hoje)) return 'vencido';
    return 'pendente';
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.valor, 0) || 0;

  // Agora filtro com base no status calculado na hora
  const pendingExpenses = expenses.filter((e) => calculateStatus(e) === 'pendente');
  const overdueExpenses = expenses.filter((e) => calculateStatus(e) === 'vencido');
  const paidExpenses = expenses.filter((e) => calculateStatus(e) === 'pago');

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          <FileText className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{pendingExpenses.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{overdueExpenses.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pagas</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{paidExpenses.length}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummary;
