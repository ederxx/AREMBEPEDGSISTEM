import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/types/expense';
import { EXPENSE_CATEGORIES, CATEGORY_NAMES } from '@/constants/expenseCategories';

interface ExpenseReportsProps {
  expenses: Expense[];
}

// Função para calcular status da despesa, igual você usa antes
const calculateStatus = (expense: Expense): 'pago' | 'pendente' | 'vencido' => {
  const hoje = new Date();
  const vencimento = new Date(expense.dataVencimento);
  const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;

  if (pagamento && pagamento <= hoje) return 'pago';
  if (vencimento > hoje && (!pagamento || pagamento > hoje)) return 'pendente';
  if (vencimento < hoje && (!pagamento || pagamento > hoje)) return 'vencido';
  return 'pendente';
};

const ExpenseReports = ({ expenses }: ExpenseReportsProps) => {
  // Agora filtra usando a função calculateStatus
  const pendingExpenses = expenses.filter(e => calculateStatus(e) === 'pendente');
  const overdueExpenses = expenses.filter(e => calculateStatus(e) === 'vencido');
  const paidExpenses = expenses.filter(e => calculateStatus(e) === 'pago');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatórios Detalhados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Despesas por Categoria</h3>
            {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => {
              const categoryExpenses = expenses.filter(e => e.categoria === key) || [];
              const total = categoryExpenses.reduce((sum, e) => sum + e.valor, 0);
              return (
                <div key={key} className="flex justify-between py-2 border-b">
                  <span>{cat.name}</span>
                  <span className="font-medium">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Status das Despesas</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-green-600">Pagas</span>
                <span className="font-medium">R$ {paidExpenses.reduce((sum, e) => sum + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-yellow-600">Pendentes</span>
                <span className="font-medium">R$ {pendingExpenses.reduce((sum, e) => sum + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-red-600">Vencidas</span>
                <span className="font-medium">R$ {overdueExpenses.reduce((sum, e) => sum + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseReports;
