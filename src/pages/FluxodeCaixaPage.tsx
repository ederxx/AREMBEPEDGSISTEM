import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

/* =========================
   TIPOS
========================= */
export interface Transaction {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  description: string;
  value: number;
  status: string;
  empresa?: string;
  banco?: string;
  nome: string;
  formadePagamento?: string;
}

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
}
interface FluxoDeCaixaProps {
  transactions?: Transaction[];
  isLoading: boolean;
}
/* =========================
   COMPONENTE
========================= */
const FluxoDeCaixa = ({ transactions = [], isLoading }: FluxoDeCaixaProps) => {
  const navigate = useNavigate();

  const [filterYear, setFilterYear] = useState<'all' | string>('all');
  const [filterType, setFilterType] =
    useState<'all' | 'receita' | 'despesa'>('all');
  const [filterEmpresa, setFilterEmpresa] =
    useState<'all' | 'Arembepe' | 'DG'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  /* =========================
     ANOS DISPONÍVEIS
  ========================= */
  const availableYears = useMemo(() => {
    const years = new Set<string>();

(transactions || []).forEach(t => {

      if (t.date) {
        years.add(parseISO(t.date).getFullYear().toString());
      }
    });

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  /* =========================
     FILTRO CORRIGIDO
  ========================= */
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;

      const dateObj = parseISO(t.date);
      if (isNaN(dateObj.getTime())) return false;

      // ✅ FILTRO DE ANO (CORRIGIDO)
      if (filterYear !== 'all') {
        const year = dateObj.getFullYear().toString();
        if (year !== filterYear) return false;
      }

      // 🔥 regra: receita faturada não entra
      if (t.type === 'receita' && t.formadePagamento === 'faturado') {
        return false;
      }

      if (filterType !== 'all' && t.type !== filterType) return false;

      if (
        filterEmpresa !== 'all' &&
        t.empresa?.toLowerCase() !== filterEmpresa.toLowerCase()
      ) {
        return false;
      }

      if (startDate && isBefore(dateObj, parseISO(startDate))) return false;
      if (endDate && isAfter(dateObj, parseISO(endDate))) return false;

      return true;
    });
  }, [transactions, filterYear, filterType, filterEmpresa, startDate, endDate]);

  /* =========================
     SALDO ACUMULADO
  ========================= */
  const transacoesComSaldo = useMemo(() => {
    let saldo = 0;
    return filteredTransactions.map(t => {
      saldo += t.type === 'receita' ? t.value : -t.value;
      return { ...t, saldoAcumulado: saldo };
    });
  }, [filteredTransactions]);

  const totalReceita = filteredTransactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.value, 0);

  const totalDespesa = filteredTransactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.value, 0);

  const saldoFinal = totalReceita - totalDespesa;

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }
if (isLoading || !transactions) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        Carregando dados...
      </CardContent>
    </Card>
  );
}
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Voltar
      </Button>

      {/* RESUMO */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle>Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle>Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo</CardTitle>
          </CardHeader>
          <CardContent
            className={saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}
          >
            R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      {/* FILTROS */}
      <Card>
        <CardContent className="grid grid-cols-4 gap-4">
          <div>
            <Label>Ano</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABELA */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transacoesComSaldo.map(t => (
            <TableRow key={t.id}>
              <TableCell>
                {format(parseISO(t.date), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell>{t.type}</TableCell>
              <TableCell>{t.description}</TableCell>
              <TableCell className="text-right">
                R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">
                R$ {t.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FluxoDeCaixa;
