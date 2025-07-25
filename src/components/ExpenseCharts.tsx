import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

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
  empresa?: string;
  funcionario?: string;
  formaPagamento?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

const CATEGORY_NAMES = {
  adm: 'Administrativo',
  veiculo: 'Veículos',
  funcionarios: 'Funcionários',
  pessoal: 'Pessoal',
  diversos: 'Diversos', // ✅ Adicionado
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'vencido', label: 'Vencido' },
];

const ExpenseCharts = ({ expenses }: { expenses: Expense[] }) => {
  // Estados dos filtros
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategoriaSet, setSelectedCategoriaSet] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>('');
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState<string>('');

  // Opções dinâmicas para filtros
  const empresas = useMemo(() => Array.from(new Set(expenses.map(e => e.empresa).filter(Boolean) as string[])), [expenses]);
  const funcionarios = useMemo(() => Array.from(new Set(expenses.map(e => e.funcionario).filter(Boolean) as string[])), [expenses]);
  const formasPagamento = useMemo(() => Array.from(new Set(expenses.map(e => e.formaPagamento).filter(Boolean) as string[])), [expenses]);

  // Função para alternar categoria no filtro
  const toggleCategoria = (cat: string) => {
    setSelectedCategoriaSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cat)) {
        newSet.delete(cat);
      } else {
        newSet.add(cat);
      }
      return newSet;
    });
  };

  // Filtra despesas conforme filtros selecionados
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Categoria
      if (selectedCategoriaSet.size > 0 && !selectedCategoriaSet.has(e.categoria)) return false;

      // Status
      if (selectedStatus && e.status !== selectedStatus) return false;

      // Datas vencimento
      if (startDate && new Date(e.dataVencimento) < new Date(startDate)) return false;
      if (endDate && new Date(e.dataVencimento) > new Date(endDate)) return false;

      // Empresa
      if (selectedEmpresa && e.empresa !== selectedEmpresa) return false;

      // Funcionário
      if (selectedFuncionario && e.funcionario !== selectedFuncionario) return false;

      // Forma de pagamento
      if (selectedFormaPagamento && e.formaPagamento !== selectedFormaPagamento) return false;

      return true;
    });
  }, [expenses, selectedCategoriaSet, selectedStatus, startDate, endDate, selectedEmpresa, selectedFuncionario, selectedFormaPagamento]);

  // Dados para gráficos (usando filteredExpenses)
 const categoryData = useMemo(() => {
  const totals: Record<string, { name: string; value: number; count: number }> = {};

  filteredExpenses.forEach((e) => {
    const key = e.categoria;
    const name = CATEGORY_NAMES[key as keyof typeof CATEGORY_NAMES] || capitalizeFirstLetter(key);

    if (!totals[key]) {
      totals[key] = { name, value: 0, count: 0 };
    }

    totals[key].value += e.valor;
    totals[key].count += 1;
  });

  return Object.values(totals).filter(item => item.value > 0);
}, [filteredExpenses]);
function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
  const subcategoryData = filteredExpenses.reduce((acc, expense) => {
    const key = `${expense.categoria}-${expense.subcategoria}`;
    if (!acc[key]) {
      acc[key] = {
        name: expense.subcategoria,
        categoria: CATEGORY_NAMES[expense.categoria as keyof typeof CATEGORY_NAMES],
        value: 0,
        count: 0,
      };
    }
    acc[key].value += expense.valor;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const subcategoryArray = Object.values(subcategoryData)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10);

  const getMonthlyData = () => {
    const monthlyData: Record<string, number> = {};
    const now = new Date();

    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = 0;
    }

    filteredExpenses.filter(e => e.dataPagamento).forEach(expense => {
      const date = new Date(expense.dataPagamento!);
      const monthKey = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += expense.valor;
      }
    });

    return Object.entries(monthlyData).map(([month, value]) => ({
      month,
      value,
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
      {/* FILTROS */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Status */}
            <div className="flex flex-col">
              <label>Status</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="rounded border px-3 py-1"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Empresa */}
            <div className="flex flex-col">
              <label>Empresa</label>
              <select
                value={selectedEmpresa}
                onChange={e => setSelectedEmpresa(e.target.value)}
                className="rounded border px-3 py-1"
              >
                <option value="">Todas</option>
                {empresas.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Funcionário */}
            <div className="flex flex-col">
              <label>Funcionário</label>
              <select
                value={selectedFuncionario}
                onChange={e => setSelectedFuncionario(e.target.value)}
                className="rounded border px-3 py-1"
              >
                <option value="">Todos</option>
                {funcionarios.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Forma de pagamento */}
            <div className="flex flex-col">
              <label>Forma de Pagamento</label>
              <select
                value={selectedFormaPagamento}
                onChange={e => setSelectedFormaPagamento(e.target.value)}
                className="rounded border px-3 py-1"
              >
                <option value="">Todas</option>
                {formasPagamento.map(fp => (
                  <option key={fp} value={fp}>{fp}</option>
                ))}
              </select>
            </div>

            {/* Data Inicial */}
            <div className="flex flex-col">
              <label>Data Inicial (vencimento)</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded border px-3 py-1"
              />
            </div>

            {/* Data Final */}
            <div className="flex flex-col">
              <label>Data Final (vencimento)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded border px-3 py-1"
              />
            </div>
          </div>

          {/* Categorias checkbox */}
          <div>
            <label className="font-medium">Categorias</label>
            <div className="flex flex-wrap gap-3 mt-1 max-w-xl">
              {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                <label key={key} className="inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategoriaSet.has(key)}
                    onChange={() => toggleCategoria(key)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pizza Categoria */}
        <Card>
          <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
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

        {/* Pizza Status */}
        <Card>
          <CardHeader><CardTitle>Status das Despesas</CardTitle></CardHeader>
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

      {/* Barras Subcategorias */}
      <Card>
        <CardHeader><CardTitle>Top 10 Subcategorias</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={subcategoryArray} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={value => `R$ ${value.toLocaleString('pt-BR')}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Linha temporal */}
      <Card>
        <CardHeader><CardTitle>Evolução das Despesas (Últimos 6 Meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={value => `R$ ${value.toLocaleString('pt-BR')}`} />
              <Tooltip
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                labelFormatter={label => `Mês: ${label}`}
              />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const calculateStatus = (expense: Expense): 'pago' | 'pendente' | 'vencido' => {
  const hoje = new Date();
  const vencimento = new Date(expense.dataVencimento);
  const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;

  if (pagamento && pagamento <= hoje) return 'pago';
  if (vencimento > hoje && (!pagamento || pagamento > hoje)) return 'pendente';
  if (vencimento < hoje && (!pagamento || pagamento > hoje)) return 'vencido';
  return 'pendente';
};

export default ExpenseCharts;

