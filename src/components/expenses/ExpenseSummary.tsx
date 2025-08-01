import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { Expense } from '@/types/expense';

interface ExpenseSummaryProps {
  expenses: Expense[];
}

const ExpenseSummary = ({ expenses }: ExpenseSummaryProps) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const calculateStatus = (expense: Expense): 'pago' | 'pendente' | 'programado' | 'vencido' => {
    const vencimento = new Date(expense.dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;

    if (pagamento) {
      // Se a dataPagamento é maior que hoje, está programado (agendado para pagar depois)
      if (pagamento > hoje) return 'programado';
      // Se a dataPagamento é hoje ou menor, está pago
      return 'pago';
    }

    if (vencimento < hoje) return 'vencido';
    return 'pendente';
  };

  const classified = expenses.reduce(
    (acc, expense) => {
      const status = calculateStatus(expense);
      acc.total += expense.valor;

      if (status === 'pendente') {
        acc.pendentes.count += 1;
        acc.pendentes.total += expense.valor;
      } else if (status === 'vencido') {
        acc.vencidas.count += 1;
        acc.vencidas.total += expense.valor;
      } else if (status === 'pago') {
        acc.pagas.count += 1;
        acc.pagas.total += expense.valor;
      } else if (status === 'programado') {
        acc.programadas.count += 1;
        acc.programadas.total += expense.valor;
      }

      return acc;
    },
    {
      total: 0,
      pendentes: { count: 0, total: 0 },
      vencidas: { count: 0, total: 0 },
      pagas: { count: 0, total: 0 },
      programadas: { count: 0, total: 0 },  // novo status programado
    }
  );

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="grid md:grid-cols-5 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pagas</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(classified.pagas.total)}
          </div>
          <div className="text-sm text-muted-foreground">
            {classified.pagas.count} despesa(s)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Programadas</CardTitle>
          <Calendar className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-yellow-600">
            {formatCurrency(classified.programadas.total)}
          </div>
          <div className="text-sm text-muted-foreground">
            {classified.programadas.count} despesa(s)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          <FileText className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-yellow-600">
            {formatCurrency(classified.pendentes.total)}
          </div>
          <div className="text-sm text-muted-foreground">
            {classified.pendentes.count} despesa(s)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-red-600">
            {formatCurrency(classified.vencidas.total)}
          </div>
          <div className="text-sm text-muted-foreground">
            {classified.vencidas.count} despesa(s)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(classified.total)}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummary;
