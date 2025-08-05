import { useState, useEffect, useRef } from 'react';
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
  TableFooter,
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
  MoreHorizontal,
  FileUp,
  TimerIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ptBR } from 'date-fns/locale';

interface ExpensesListProps {
  expenses: Expense[];
  isLoading: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  displayName?: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'programado', label: 'Programado' },
  { value: 'vencido', label: 'Vencido' },

];

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
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const { user } = useAuth();

  const tableRef = useRef(null);

  const handleExportExcel = () => {
    const dataToExport = filteredExpenses.map(expense => ({
      Categoria: CATEGORY_NAMES[expense.categoria as keyof typeof CATEGORY_NAMES] || '-',
      Subcategoria: expense.subcategoria || '-',
      Despesa: expense.nome,
      Empresa: expense.empresa || '-',
      Funcionário: expense.categoria === 'funcionarios' ? expense.funcionario || '-' : '-',
      Vencimento: expense.dataVencimento ? new Date(expense.dataVencimento).toLocaleDateString('pt-BR') : '-',
      Pagamento: expense.dataPagamento ? new Date(expense.dataPagamento).toLocaleDateString('pt-BR') : '-',
      Valor: expense.valor,
      'Forma de Pagamento': expense.formaPagamento || '-',
      Status: calculateStatus(expense),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {type: "application/octet-stream"});
    saveAs(blob, "despesas.xlsx");
  };

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategorySet, setFilterCategorySet] = useState<Set<string>>(new Set());
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  const uniquePaymentMethods = Array.from(
    new Set(expenses.map((e) => e.formaPagamento).filter(Boolean))
  );

const calculateStatus = (
  expense: Expense
): 'pago' | 'programado' | 'pendente' | 'vencido' => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(expense.dataVencimento);
  vencimento.setHours(0, 0, 0, 0);

  const pagamento = expense.dataPagamento
    ? new Date(expense.dataPagamento)
    : null;

  if (pagamento) {
    pagamento.setHours(0, 0, 0, 0);
    if (pagamento <= hoje) return 'pago';
    if (pagamento > hoje) return 'programado';
  }

  if (!pagamento && vencimento < hoje) return 'vencido';

  return 'pendente';
};

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

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, dataPagamento }: { id: string; dataPagamento: string }) => {
      const expenseRef = doc(db, 'expenses', id);
      await updateDoc(expenseRef, { dataPagamento });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Despesa marcada como paga!' });
      setEditingExpenseId(null);
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
      dataPagamento: paymentDate.toISOString(),
    });
  } else {
    toast({ title: 'Selecione a data de pagamento', variant: 'destructive' });
  }
};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-gray-800">Pendente</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
            case 'programado':
        return <Badge className="bg-blue-100 text-blue-800">Programado</Badge>; // Changed from red to blue for programmed
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
            case 'programado':
        return <TimerIcon className="w-4 h-4 text-blue-600" />; // Changed from red to blue for programmed
      default:
        return null;
    }
  };

  const checkCategoryFilter = (categoria: string) => {
    if (filterCategorySet.size === 0) return true;
    return filterCategorySet.has(categoria);
  };

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
        start.setHours(0, 0, 0, 0);
        if (new Date(e.dataVencimento) < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
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
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">Carregando despesas...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* FILTROS */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Despesas</CardTitle>
        </CardHeader>
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
                  className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
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

          <div className="flex items-center justify-between">
            {/* Botão limpar filtros */}
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <div className="flex items-center space-x-4">
              <span className="text-lg font-medium">
                Total de despesas filtradas: {filteredExpenses.length}
              </span>
              <span className="text-lg font-semibold text-green-700">
                Valor total: R$ {filteredExpenses.reduce((acc, e) => acc + e.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABELA */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lista de Despesas</CardTitle>
          <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white">
            <FileUp className="w-4 h-4 mr-2" />
            Exportar para Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm min-w-full" ref={tableRef}>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Despesa</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => {
                    const status = calculateStatus(expense);
                    const isBeingEdited = editingExpenseId === expense.id;
                    return (
                      <TableRow
                        key={expense.id}
                        className={status === 'vencido' ? 'bg-red-50 hover:bg-red-100' : undefined}
                      >
                        <TableCell>
                          {CATEGORY_NAMES[expense.categoria as keyof typeof CATEGORY_NAMES] || '-'}
                        </TableCell>
                        <TableCell>{expense.subcategoria || '-'}</TableCell>
                        <TableCell className="font-medium">{expense.nome}</TableCell>
                        <TableCell>{expense.empresa || '-'}</TableCell>
                        <TableCell>
                          {expense.categoria === 'funcionarios' && expense.funcionario
                            ? expense.funcionario
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {expense.dataVencimento
                            ? new Date(expense.dataVencimento).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {isBeingEdited ? (
                            <div className="flex flex-col space-y-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className="w-full justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {paymentDate ? format(paymentDate, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={paymentDate}
                                    onSelect={setPaymentDate}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(expense.id)}
                                >
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingExpenseId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            expense.dataPagamento
                              ? new Date(expense.dataPagamento).toLocaleDateString('pt-BR')
                              : '-'
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          R$ {expense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{expense.formaPagamento || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(status)}
                            {getStatusBadge(status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {status !== 'pago' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingExpenseId(expense.id);
                                    setPaymentDate(new Date());
                                  }}
                                >
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
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center h-24">
                      Nenhuma despesa encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {filteredExpenses.length > 0 && (
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={7}>Total de Despesas</TableCell>
                    <TableCell className="text-right">
                      R$ {filteredExpenses
                        .reduce((sum, expense) => sum + (expense.valor || 0), 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updated) => {
          if (!user?.uid || !expenseToEdit) {
            toast({ title: 'Erro: Usuário ou despesa não encontrados.', variant: 'destructive' });
            return;
          }
          editExpenseMutation.mutate({
            ...updated,
            id: expenseToEdit.id,
            userId: user.uid,
          });
        }}
        expense={expenseToEdit}
      />
    </div>
  );
};


export default ExpensesList;

