import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CalendarIcon,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from '@/hooks/use-toast';
import { Expense } from '@/types/expense';
import { CATEGORY_NAMES } from '@/constants/expenseCategories';
import { EditExpenseModal } from '@/components/EditExpenseModal';
import { useAuth } from '@/hooks/useAuth';
interface ExpensesListProps {
  expenses: Expense[];
  isLoading: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  displayName?: string; // opcional, pode ser usado se o usuário tiver um nome
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'vencido', label: 'Vencido' },
];

// Meses para filtro por mês
const MONTH_OPTIONS = [
  { value: '', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const ExpensesList = ({ expenses, isLoading }: ExpensesListProps) => {
  const queryClient = useQueryClient();
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
const { user } = useAuth();
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategorySet, setFilterCategorySet] = useState<Set<string>>(new Set());
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>(''); // Substitui banco por formaPagamento
  const [filterStartDate, setFilterStartDate] = useState<string>(''); // yyyy-MM-dd
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  // Pega todos os métodos de pagamento disponíveis na lista para o filtro dinâmico
  const uniquePaymentMethods = Array.from(
    new Set(expenses.map((e) => e.formaPagamento).filter(Boolean))
  );

  // Função para calcular status da despesa
  const calculateStatus = (
    expense: Expense
  ): 'pago' | 'pendente' | 'vencido' => {
    const hoje = new Date();
    const vencimento = new Date(expense.dataVencimento);
    const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;

    if (pagamento && pagamento <= hoje) return 'pago';
    if (vencimento > hoje && (!pagamento || pagamento > hoje)) return 'pendente';
    if (vencimento < hoje && (!pagamento || pagamento > hoje)) return 'vencido';
    return 'pendente';
  };

  // Busca emails dos usuários
  useEffect(() => {
    const userIds = Array.from(new Set(expenses.map((e) => e.userId).filter(Boolean)));

    if (userIds.length === 0) {
      setUsersMap({});
      return;
    }

    async function fetchUsers() {
      try {
        const allUsers: Record<string, UserInfo> = {};

        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, 'users', uid));
       if (userDoc.exists()) {
  const data = userDoc.data();
  allUsers[uid] = {
    id: uid,
    email: data.email || 'Sem email',
    displayName: data.displayName || data.email || 'Desconhecido',
  };
}
        }

        setUsersMap(allUsers);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setUsersMap({});
      }
    }

    fetchUsers();
  }, [expenses]);

  // Mutations para atualizar, excluir e editar despesa
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, dataPagamento }: { id: string; dataPagamento: string }) => {
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, { dataPagamento });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Despesa marcada como paga!' });
      setEditingExpense(null);
      setPaymentDate(undefined);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar despesa', variant: 'destructive' });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'expenses', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Despesa excluída com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir despesa', variant: 'destructive' });
    },
  });

  const editExpenseMutation = useMutation({
    mutationFn: async (updated: Partial<Expense> & { id: string }) => {
      const expenseRef = doc(db, 'expenses', updated.id);
      await updateDoc(expenseRef, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Despesa atualizada com sucesso!' });
      setIsEditModalOpen(false);
      setExpenseToEdit(null);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar despesa', variant: 'destructive' });
    },
  });

  const handleMarkAsPaid = (expenseId: string) => {
    if (paymentDate) {
      markAsPaidMutation.mutate({
        id: expenseId,
        dataPagamento: format(paymentDate, 'yyyy-MM-dd'),
      });
    } else {
      toast({ title: 'Selecione a data de pagamento', variant: 'destructive' });
    }
  };

  // Badge e ícone para status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'pendente':
        return <FileText className="w-4 h-4 text-yellow-600" />;
      case 'vencido':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  // Filtra categorias
  const checkCategoryFilter = (categoria: string) => {
    if (filterCategorySet.size === 0) return true;
    return filterCategorySet.has(categoria);
  };

  // Aplica os filtros
  const filteredExpenses = expenses
    .filter((e) => {
      if (filterStatus && calculateStatus(e) !== filterStatus) return false;
      if (filterCompany && e.empresa !== filterCompany) return false;
      if (filterPaymentMethod && e.formaPagamento !== filterPaymentMethod) return false;
      if (!checkCategoryFilter(e.categoria)) return false;
      if (filterMonth) {
        const dt = new Date(e.dataVencimento);
        if (dt.getMonth() + 1 !== parseInt(filterMonth, 10)) return false;
      }
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        if (new Date(e.dataVencimento) < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        if (new Date(e.dataVencimento) > end) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

  const toggleCategory = (categoria: string) => {
    setFilterCategorySet((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) newSet.delete(categoria);
      else newSet.add(categoria);
      return newSet;
    });
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterCategorySet(new Set());
    setFilterCompany('');
    setFilterPaymentMethod('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMonth('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Carregando despesas...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Status */}
            <div className="flex flex-col">
              <label htmlFor="statusFilter" className="font-medium">
                Status
              </label>
              <select
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded border px-3 py-1"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Empresa */}
            <div className="flex flex-col">
              <label htmlFor="companyFilter" className="font-medium">
                Empresa
              </label>
              <select
                id="companyFilter"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="rounded border px-3 py-1"
              >
                <option value="">Todas</option>
                {/* Opcional: mapear empresas dinamicamente */}
                <option value="Arembepe Turismo">Arembepe Turismo</option>
                <option value="DG Transportes">DG Transportes</option>
                <option value="Terceirizado">Terceirizado</option>
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div className="flex flex-col">
              <label htmlFor="paymentMethodFilter" className="font-medium">
                Forma de Pagamento
              </label>
              <select
                id="paymentMethodFilter"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="rounded border px-3 py-1"
              >
                <option value="">Todas</option>
                {uniquePaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* Mês */}
            <div className="flex flex-col">
              <label htmlFor="monthFilter" className="font-medium">
                Mês
              </label>
              <select
                id="monthFilter"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="rounded border px-3 py-1"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Inicial */}
            <div className="flex flex-col">
              <label htmlFor="startDateFilter" className="font-medium">
                Data Inicial
              </label>
              <input
                id="startDateFilter"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="rounded border px-3 py-1"
              />
            </div>

            {/* Data Final */}
            <div className="flex flex-col">
              <label htmlFor="endDateFilter" className="font-medium">
                Data Final
              </label>
              <input
                id="endDateFilter"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="rounded border px-3 py-1"
              />
            </div>
          </div>

          {/* Categorias multi-select */}
          <div>
            <span className="font-medium">Categorias</span>
            <div className="flex flex-wrap gap-3 mt-1 max-w-xl">
              {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                <label
                  key={key}
                  className="inline-flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterCategorySet.has(key)}
                    onChange={() => toggleCategory(key)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TABELA */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Despesas ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'item' : 'itens'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Despesa</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Usuário </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => {
                  const status = calculateStatus(expense);
                  return (
                    <TableRow
                      key={expense.id}
                      className={status === 'vencido' ? 'bg-red-50' : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(status)}
                          {getStatusBadge(status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{expense.nome}</TableCell>
                      <TableCell>{CATEGORY_NAMES[expense.categoria as keyof typeof CATEGORY_NAMES]}</TableCell>
                      <TableCell>{expense.subcategoria || '-'}</TableCell>
                      <TableCell>{new Date(expense.dataVencimento).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{expense.dataPagamento ? new Date(expense.dataPagamento).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="font-medium">R$ {expense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{expense.empresa || '-'}</TableCell>
                      <TableCell>{expense.formaPagamento || '-'}</TableCell>
                     <TableCell>{usersMap[expense.userId]?.displayName || 'Desconhecido'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {status !== 'pago' && (
                            editingExpense === expense.id ? (
                              <div className="flex items-center space-x-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <CalendarIcon className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={paymentDate}
                                      onSelect={setPaymentDate}
                                      initialFocus
                                      className="p-3 pointer-events-auto"
                                    />
                                  </PopoverContent>
                                </Popover>
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(expense.id)}
                                  disabled={markAsPaidMutation.isPending}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingExpense(null);
                                    setPaymentDate(undefined);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => setEditingExpense(expense.id)}>
                                Marcar como pago
                              </Button>
                            )
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setExpenseToEdit(expense);
                              setIsEditModalOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteExpenseMutation.mutate(expense.id)}
                            disabled={deleteExpenseMutation.isLoading}
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

<EditExpenseModal
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  onSave={(updated) => {
    if (!user?.uid) {
      toast({ title: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    editExpenseMutation.mutate({ 
      ...updated, 
      id: expenseToEdit!.id,
      userId: user.uid
    });
  }}
  expense={expenseToEdit}
/>
    </div>
  );
};

export default ExpensesList;
