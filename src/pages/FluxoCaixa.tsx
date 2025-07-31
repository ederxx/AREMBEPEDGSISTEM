import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// As interfaces e tipos permanecem os mesmos
interface Expense {
  id: string;
  nome: string;
  dataVencimento: string;
  valor: number;
  categoria: string;
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
}

const FluxoDeCaixa = ({ expenses, incomes, isLoading }: FluxoDeCaixaProps) => {
  const navigate = useNavigate();
  
  // --- NOVOS ESTADOS PARA FILTROS ---
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Lógica de cálculo (permanece a mesma)
  const transactions = [
    ...expenses.map(exp => ({ id: exp.id, date: exp.dataVencimento, type: 'despesa' as 'despesa', description: exp.nome, value: exp.valor })),
    ...incomes.map(inc => ({ id: inc.id, date: inc.dataVencimento, type: 'receita' as 'receita', description: inc.nome, value: inc.valor })),
  ];

  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentBalance = 0;
  const totalRevenue = incomes.reduce((sum, inc) => sum + inc.valor, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.valor, 0);

  const transactionsWithBalance = transactions.map(trans => {
    if (trans.type === 'receita') {
      currentBalance += trans.value;
    } else {
      currentBalance -= trans.value;
    }
    return { ...trans, balanceAfter: currentBalance };
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Carregando dados...</CardContent>
      </Card>
    );
  }

  // --- LÓGICA DE FILTRAGEM ---
  const filteredTransactions = transactionsWithBalance.filter(trans => {
    // Filtra por tipo de transação
    if (filterType !== 'all' && trans.type !== filterType) {
      return false;
    }

    // Filtra por período de datas
    const transactionDate = parseISO(trans.date);
    if (startDate && isBefore(transactionDate, parseISO(startDate))) {
      return false;
    }
    if (endDate && isAfter(transactionDate, parseISO(endDate))) {
      return false;
    }

    return true;
  });
  
  const finalBalance = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Voltar ao Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col p-4 border rounded-md shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Receita Total</span>
            <span className="text-2xl font-bold text-green-600">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col p-4 border rounded-md shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Débito Total</span>
            <span className="text-2xl font-bold text-red-600">
              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col p-4 border rounded-md shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Saldo Atual</span>
            <span className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Histórico de Movimentações</CardTitle>
          {/* --- NOVOS FILTROS DE VISUALIZAÇÃO --- */}
          <div className="flex gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="type-filter">Tipo</Label>
              <Select value={filterType} onValueChange={(value: 'all' | 'receita' | 'despesa') => setFilterType(value)}>
                <SelectTrigger id="type-filter" className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="start-date">De</Label>
              <Input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="end-date">Até</Label>
              <Input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          {/* --- FIM DOS FILTROS --- */}
        </CardHeader>
      <CardContent>
  <div className="overflow-x-auto">
    <Table className="text-sm min-w-full">
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="text-right">Saldo após</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((trans) => (
            <TableRow key={trans.id}>
              <TableCell>{trans.date ? format(new Date(trans.date), 'dd/MM/yyyy') : '-'}</TableCell>
              <TableCell>{trans.description}</TableCell>
              <TableCell>
                <Badge className={trans.type === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {trans.type === 'receita' ? 'Entrada' : 'Saída'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span className={trans.type === 'receita' ? 'text-green-600' : 'text-red-600'}>
                  {trans.type === 'receita' ? '+' : '-'} R$ {trans.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold">
                <span className={trans.balanceAfter >= 0 ? 'text-green-600' : 'text-red-600'}>
                  R$ {trans.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma transação encontrada.</TableCell>
          </TableRow>
        )}
      </TableBody>
      {/* --- NOVO: RODAPÉ DA TABELA COM TOTAIS --- */}
         <TableFooter>
        <TableRow className="font-bold">
          <TableCell colSpan={2}>Total do Período:</TableCell>
          <TableCell className="text-right text-green-600 font-bold">
            +{filteredTransactions
              .filter(t => t.type === 'receita')
              .reduce((sum, t) => sum + t.value, 0)
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell className="text-right text-red-600 font-bold">
            -{filteredTransactions
              .filter(t => t.type === 'despesa')
              .reduce((sum, t) => sum + t.value, 0)
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </TableCell>
          <TableCell className="text-right">
            {(filteredTransactions
              .filter(t => t.type === 'receita')
              .reduce((sum, t) => sum + t.value, 0) - filteredTransactions
              .filter(t => t.type === 'despesa')
              .reduce((sum, t) => sum + t.value, 0))
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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