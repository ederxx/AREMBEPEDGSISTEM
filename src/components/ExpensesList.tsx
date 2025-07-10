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

interface ExpensesListProps {
  expenses: Expense[];
  isLoading: boolean;
}

interface UserInfo {
  id: string;
  name: string;
}

const ExpensesList = ({ expenses, isLoading }: ExpensesListProps) => {
  const queryClient = useQueryClient();
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [usersMap, setUsersMap] = useState<Record<string, UserInfo>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const calculateStatus = (
    expense: Expense
  ): 'pago' | 'pendente' | 'vencido' => {
    const hoje = new Date();
    const vencimento = new Date(expense.dataVencimento);
    const pagamento = expense.dataPagamento
      ? new Date(expense.dataPagamento)
      : null;

    if (pagamento && pagamento <= hoje) return 'pago';
    if (vencimento > hoje && (!pagamento || pagamento > hoje)) return 'pendente';
    if (vencimento < hoje && (!pagamento || pagamento > hoje)) return 'vencido';
    return 'pendente';
  };

  useEffect(() => {
    const userIds = Array.from(
      new Set(expenses.map((e) => e.userId).filter(Boolean))
    );

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
              name: data.name || data.email || 'Sem nome',
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
    mutationFn: async ({
      id,
      dataPagamento,
    }: {
      id: string;
      dataPagamento: string;
    }) => {
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

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Carregando despesas...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Despesas ({sortedExpenses.length} {sortedExpenses.length === 1 ? 'item' : 'itens'})
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.map((expense) => {
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
                      <TableCell>{expense.subcategoria}</TableCell>
                      <TableCell>{new Date(expense.dataVencimento).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{expense.dataPagamento ? new Date(expense.dataPagamento).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className="font-medium">R$ {expense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{usersMap[expense.userId]?.name || 'Desconhecido'}</TableCell>
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
                                <Button size="sm" onClick={() => handleMarkAsPaid(expense.id)} disabled={markAsPaidMutation.isPending}>Confirmar</Button>
                                <Button variant="outline" size="sm" onClick={() => { setEditingExpense(null); setPaymentDate(undefined); }}>Cancelar</Button>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => setEditingExpense(expense.id)}>Marcar como pago</Button>
                            )
                          )}
                          <Button variant="secondary" size="sm" onClick={() => { setExpenseToEdit(expense); setIsEditModalOpen(true); }}>Editar</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteExpenseMutation.mutate(expense.id)} disabled={deleteExpenseMutation.isLoading}>Excluir</Button>
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
        onSave={(updated) => editExpenseMutation.mutate({ ...updated, id: expenseToEdit!.id })}
        expense={expenseToEdit}
      />
    </div>
  );
};

export default ExpensesList;
