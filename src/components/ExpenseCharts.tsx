
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';

interface Expense {
  id: string;
  nome: string;
  dataVencimento: string;
  dataPagamento?: string;
  valor: number;
  categoria: string;
  subcategoria: string;
  status: 'pendente' | 'pago' | 'vencido';
  createdAt: string;
}

interface ExpenseChartsProps {
  expenses: Expense[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

const CATEGORY_NAMES = {
  adm: 'Administrativo',
  veiculo: 'Veículos',
  funcionarios: 'Funcionários',
  pessoal: 'Pessoal'
};

const ExpenseCharts = ({ expenses }: ExpenseChartsProps) => {
  // Dados para gráfico de pizza por categoria
  const categoryData = Object.entries(CATEGORY_NAMES).map(([key, name]) => {
    const categoryExpenses = expenses.filter(e => e.categoria === key);
    const total = categoryExpenses.reduce((sum, e) => sum + e.valor, 0);
    return {
      name,
      value: total,
      count: categoryExpenses.length
    };
  }).filter(item => item.value > 0);

  // Dados para gráfico de status
  const statusData = [
    {
      name: 'Pagas',
      value: expenses.filter(e => e.status === 'pago').reduce((sum, e) => sum + e.valor, 0),
      count: expenses.filter(e => e.status === 'pago').length
    },
    {
      name: 'Pendentes',
      value: expenses.filter(e => e.status === 'pendente').reduce((sum, e) => sum + e.valor, 0),
      count: expenses.filter(e => e.status === 'pendente').length
    },
    {
      name: 'Vencidas',
      value: expenses.filter(e => e.status === 'vencido').reduce((sum, e) => sum + e.valor, 0),
      count: expenses.filter(e => e.status === 'vencido').length
    }
  ].filter(item => item.value > 0);

  // Dados para gráfico de barras por subcategoria
  const subcategoryData = expenses.reduce((acc, expense) => {
    const key = `${expense.categoria}-${expense.subcategoria}`;
    if (!acc[key]) {
      acc[key] = {
        name: expense.subcategoria,
        categoria: CATEGORY_NAMES[expense.categoria as keyof typeof CATEGORY_NAMES],
        value: 0,
        count: 0
      };
    }
    acc[key].value += expense.valor;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const subcategoryArray = Object.values(subcategoryData)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10); // Top 10 subcategorias

  // Dados para gráfico de linha temporal (últimos 6 meses)
  const getMonthlyData = () => {
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    
    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = 0;
    }

    // Somar despesas pagas por mês
    expenses.filter(e => e.dataPagamento).forEach(expense => {
      const date = new Date(expense.dataPagamento!);
      const monthKey = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += expense.valor;
      }
    });

    return Object.entries(monthlyData).map(([month, value]) => ({
      month,
      value
    }));
  };

  const monthlyData = getMonthlyData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Valor: R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          {payload[0].payload.count && (
            <p className="text-gray-600">
              Quantidade: {payload[0].payload.count}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras - Top Subcategorias */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Subcategorias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={subcategoryArray} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Linha - Evolução Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução das Despesas (Últimos 6 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resumo Estatístico */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Média Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {(monthlyData.reduce((sum, item) => sum + item.value, 0) / monthlyData.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Maior Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {Math.max(...expenses.map(e => e.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {expenses.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseCharts;
