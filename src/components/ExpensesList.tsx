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
import { parse } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface ExpensesListProps {
  expenses: Expense[];
  isLoading: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  displayName?: string; // opcional, pode ser usado se o usuário tiver um nome
}

const [openMarkAsPaidPopover, setOpenMarkAsPaidPopover] = useState<string | null>(null);

useEffect(() => {
  if (!openMarkAsPaidPopover) {
    setPaymentDate(undefined);
  }
}, [openMarkAsPaidPopover]);

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
  <CardContent className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Status */}
      <div className="flex flex-col">
        <label htmlFor="statusFilter" className="text-sm font-medium text-muted-foreground mb-1">Status</label>
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
        <label htmlFor="companyFilter" className="text-sm font-medium text-muted-foreground mb-1">Empresa</label>
        <select
          id="companyFilter"
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          <option value="">Todas</option>
          <option value="Arembepe Turismo">Arembepe Turismo</option>
          <option value="DG Transportes">DG Transportes</option>
          <option value="Terceirizado">Terceirizado</option>
        </select>
      </div>

      {/* Forma de Pagamento */}
      <div className="flex flex-col">
        <label htmlFor="paymentMethodFilter" className="text-sm font-medium text-muted-foreground mb-1">Forma de Pagamento</label>
        <select
          id="paymentMethodFilter"
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value)}
          className="rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
        <label htmlFor="monthFilter" className="text-sm font-medium text-muted-foreground mb-1">Mês</label>
        <select
          id="monthFilter"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
        <label htmlFor="startDateFilter" className="text-sm font-medium text-muted-foreground mb-1">Data Inicial</label>
        <input
          id="startDateFilter"
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className="rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>

      {/* Data Final */}
      <div className="flex flex-col">
        <label htmlFor="endDateFilter" className="text-sm font-medium text-muted-foreground mb-1">Data Final</label>
        <input
          id="endDateFilter"
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className="rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>
    </div>

    {/* Categorias */}
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-2 block">Categorias</label>
      <div className="flex flex-wrap gap-3 max-w-4xl">
        {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
          <label
            key={key}
            className="inline-flex items-center gap-2 text-sm text-gray-700"
          >
            <input
              type="checkbox"
              checked={filterCategorySet.has(key)}
              onChange={() => toggleCategory(key)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            {label}
          </label>
        ))}
      </div>
    </div>

    {/* Botão limpar filtros */}
    <div className="pt-2">
      <Button variant="outline" onClick={clearFilters}>
        Limpar Filtros
      </Button>
    </div>
  </CardContent>

  <CardContent className="flex justify-between items-center px-6 py-4">
    <div className="text-lg font-medium">
      Total filtrado: {filteredExpenses.length} {filteredExpenses.length === 1 ? 'despesa' : 'despesas'}
    </div>
    <div className="text-lg font-semibold text-green-700">
     Total: R$ {filteredExpenses.reduce((acc, e) => acc + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
<Table className="text-sm min-w-full">
            <TableHeader>
  <TableRow>
    <TableHead>Status</TableHead>
    <TableHead>Despesa</TableHead>
    <TableHead>Categoria</TableHead>
    {/* REMOVIDO: <TableHead>Subcategoria</TableHead> */}
    <TableHead>Vencimento</TableHead>
    <TableHead>Pagamento</TableHead>
    <TableHead>Valor</TableHead>
    <TableHead>Empresa</TableHead>
    <TableHead>Forma de Pagamento</TableHead>
    <TableHead>Funcionário</TableHead>
    {/* REMOVIDO: <TableHead>Usuário</TableHead> */}
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
                      
                    <TableCell>
  {parse(expense.dataVencimento, 'yyyy-MM-dd', new Date()).toLocaleDateString('pt-BR')}
</TableCell>
<TableCell>
  {expense.dataPagamento 
    ? parse(expense.dataPagamento, 'yyyy-MM-dd', new Date()).toLocaleDateString('pt-BR') 
    : '-'}
</TableCell>
                      <TableCell className="font-medium">R$ {expense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{expense.empresa || '-'}</TableCell>
                      <TableCell>{expense.formaPagamento || '-'}</TableCell>
                     <TableCell>
                            {expense.categoria === 'funcionarios' && expense.funcionario
                              ? expense.funcionario
                                             : '-'}
                          </TableCell>
                   <TableCell className="relative">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {status !== 'pago' && (
        <DropdownMenuItem onClick={() => setOpenMarkAsPaidPopover(expense.id)}>
          Marcar como pago
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => {
          setExpenseToEdit(expense);
          setIsEditModalOpen(true);
        }}
      >
        Editar
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => deleteExpenseMutation.mutate(expense.id)}
      >
        Excluir
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  {/* POPOVER PARA PAGAMENTO */}
  {openMarkAsPaidPopover === expense.id && (
    <Popover open onOpenChange={() => setOpenMarkAsPaidPopover(null)}>
      <PopoverContent className="z-50 w-[260px] space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Data de pagamento</p>
          <Calendar
            mode="single"
            selected={paymentDate}
            onSelect={(date) => setPaymentDate(date || undefined)}
          />
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (!paymentDate) {
              toast({ title: 'Selecione a data de pagamento', variant: 'destructive' });
              return;
            }
            handleMarkAsPaid(expense.id);
            setOpenMarkAsPaidPopover(null);
          }}
        >
          Confirmar pagamento
        </Button>
      </PopoverContent>
    </Popover>
  )}
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
