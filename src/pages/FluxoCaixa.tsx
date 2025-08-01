import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Expense {
  id: string;
  nome: string;
  dataVencimento: string;
  valor: number;
  categoria: string;
  status: string; // 'pago', 'pendente', 'vencido', 'programado'
}

interface Income {
  id: string;
  nome: string;
  dataVencimento: string;
  valor: number;
}

interface FluxoDeCaixaProps {
  expenses: Expense[];
  incomes: Income[];
  isLoading: boolean;
}

interface Transaction {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  description: string;
  value: number;
  status?: string;
}

const FluxoDeCaixa = ({ expenses, incomes, isLoading }: FluxoDeCaixaProps) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const transactions = useMemo(() => {
    const relevantExpenses = expenses.filter(exp => exp.status === 'pago' || exp.status === undefined);
    const combined: Transaction[] = [
      ...relevantExpenses.map(exp => ({
        id: exp.id,
        date: exp.dataVencimento,
        type: 'despesa' as 'despesa',
        description: exp.nome,
        value: exp.valor,
        status: exp.status,
      })),
      ...incomes.map(inc => ({
        id: inc.id,
        date: inc.dataVencimento,
        type: 'receita' as 'receita',
        description: inc.nome,
        value: inc.valor,
      })),
    ];

    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return combined;
  }, [expenses, incomes]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      const tDate = parseISO(t.date);
      if (startDate && isBefore(tDate, parseISO(startDate))) return false;
      if (endDate && isAfter(tDate, parseISO(endDate))) return false;
      return true;
    });
  }, [transactions, filterType, startDate, endDate]);

  // Agrupar receitas e despesas por dia (filtrado) para o resumo diário
  const dailySummary = useMemo(() => {
    const map = new Map<string, { receita: number; despesa: number }>();

    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const parsedDate = parseISO(t.date);
      if (isNaN(parsedDate.getTime())) return;

      const day = format(parsedDate, 'yyyy-MM-dd');
      if (!map.has(day)) map.set(day, { receita: 0, despesa: 0 });
      const entry = map.get(day)!;

      if (t.type === 'receita') entry.receita += t.value;
      else entry.despesa += t.value;
    });

    return Array.from(map.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions]);

  // Totais filtrados para resumo geral
  const totalReceita = filteredTransactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.value, 0);

  const totalDespesa = filteredTransactions
    .filter(t => t.type === 'despesa' && (t.status === 'pago' || t.status === undefined))
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const saldoFinal = totalReceita - totalDespesa;
  const allStatuses = Array.from(new Set(expenses.map(exp => exp.status)));
  console.log('Status únicos em expenses:', allStatuses);
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Carregando dados...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Voltar ao Dashboard
      </Button>

      {/* Resumo geral */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col p-4 border rounded-md shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Receita Total</span>
            <span className="text-2xl font-bold text-green-600">
              R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col p-4 border rounded-md shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Débito Total</span>
            <span className="text-2xl font-bold text-red-600">
              R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col p-4 border rounded-md shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Saldo Atual</span>
            <span className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Filtros e Resumo diário */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <CardTitle>Resumo Diário</CardTitle>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="grid w-full md:w-auto items-center gap-1.5">
              <Label htmlFor="type-filter">Tipo</Label>
              <Select
                value={filterType}
                onValueChange={(value: 'all' | 'receita' | 'despesa') => setFilterType(value)}
              >
                <SelectTrigger id="type-filter" className="w-[160px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full md:w-auto items-center gap-1.5">
              <Label htmlFor="start-date">De</Label>
              <Input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="grid w-full md:w-auto items-center gap-1.5">
              <Label htmlFor="end-date">Até</Label>
              <Input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Despesa</TableHead>
                  <TableHead className="text-right">Saldo do Dia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySummary.length > 0 ? (
                  dailySummary.map(({ date, receita, despesa }) => (
                    <TableRow key={date}>
                      <TableCell>{format(new Date(date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right text-green-600">
                        R$ {receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        R$ {despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {(receita - despesa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>

              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell>Total do Período:</TableCell>
                  <TableCell className="text-right text-green-600">
                    R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoDeCaixa;
