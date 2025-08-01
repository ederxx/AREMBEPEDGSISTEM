import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/types/expense';
import { EXPENSE_CATEGORIES } from '@/constants/expenseCategories';

interface ExpenseReportsProps {
  expenses: Expense[];
}

const calculateStatus = (expense: Expense): 'pago' | 'pendente' | 'vencido' | 'programado' => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(expense.dataVencimento);
  vencimento.setHours(0, 0, 0, 0);

  const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;
  if (pagamento) {
    pagamento.setHours(0, 0, 0, 0);
    if (pagamento > hoje) return 'programado'; // pagamento futuro
    return 'pago'; // pagamento já realizado
  }

  if (vencimento < hoje) return 'vencido';
  return 'pendente';
};

const ExpenseReports = ({ expenses }: ExpenseReportsProps) => {
  const pendingExpenses = expenses.filter(e => calculateStatus(e) === 'pendente');
  const overdueExpenses = expenses.filter(e => calculateStatus(e) === 'vencido');
  const paidExpenses = expenses.filter(e => calculateStatus(e) === 'pago');
  const scheduledExpenses = expenses.filter(e => calculateStatus(e) === 'programado');

  const totalPaid = paidExpenses.reduce((sum, e) => sum + e.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatórios Detalhados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Despesas por categoria - só pagas */}
          <div>
            <h3 className="font-semibold mb-3">Despesas por Categoria (Pagas)</h3>
            {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => {
              const categoryPaidExpenses = paidExpenses.filter(e => e.categoria === key) || [];
              const total = categoryPaidExpenses.reduce((sum, e) => sum + e.valor, 0);
              return (
                <div key={key} className="flex justify-between py-2 border-b">
                  <span>{cat.name}</span>
                  <span className="font-medium">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
            {/* Total geral pago */}
            <div className="flex justify-between py-2 border-t font-semibold mt-2">
              <span>Total Geral Pago</span>
              <span>
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Status das despesas */}
          <div>
            <h3 className="font-semibold mb-3">Status das Despesas</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-green-600">Pagas</span>
                <span className="font-medium">
                  R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-yellow-600">Programadas</span>
                <span className="font-medium">
                  R$ {scheduledExpenses.reduce((sum, e) => sum + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-yellow-600">Pendentes</span>
                <span className="font-medium">
                  R$ {pendingExpenses.reduce((sum, e) => sum + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-red-600">Vencidas</span>
                <span className="font-medium">
                  R$ {overdueExpenses.reduce((sum, e) => sum + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseReports;
