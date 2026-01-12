import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ptBR } from 'date-fns/locale';

/* =========================
   MODAL SIMPLES (SEM QUERY)
========================= */
const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        {children}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================
   TIPOS
========================= */
interface Transaction {
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

interface FluxoDeCaixaProps {
  transactions: Transaction[];
  isLoading: boolean;
}

/* =========================
   FUNÇÕES AUXILIARES
========================= */
const normalizeEmpresa = (empresa?: string) => {
  if (!empresa) return '';
  const lower = empresa.trim().toLowerCase();
  if (lower.includes('arembepe')) return 'Arembepe';
  if (lower.includes('dg')) return 'DG';
  return empresa.trim();
};

/* =========================
   COMPONENTE PRINCIPAL
========================= */
const FluxoDeCaixa = ({ transactions, isLoading }: FluxoDeCaixaProps) => {
  const navigate = useNavigate();

  const [filterYear, setFilterYear] = useState<'all' | string>('all');
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<'all' | 'Arembepe' | 'DG'>('all');
  const [filterBanco, setFilterBanco] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  /* =========================
     ANOS DISPONÍVEIS
  ========================= */
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => {
      if (t.date && isValid(parseISO(t.date))) {
        years.add(parseISO(t.date).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  /* =========================
     FILTROS
  ========================= */
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date || !isValid(parseISO(t.date))) return false;

      if (filterYear !== 'all') {
        const year = parseISO(t.date).getFullYear().toString();
        if (year !== filterYear) return false;
      }

      if (t.type === 'receita' && t.formadePagamento === 'faturado') {
        return false;
      }

      if (filterType !== 'all' && t.type !== filterType) return false;

      if (
        filterEmpresa !== 'all' &&
        normalizeEmpresa(t.empresa).toLowerCase() !== filterEmpresa.toLowerCase()
      ) {
        return false;
      }

      if (
        filterBanco.trim() &&
        !t.banco?.toLowerCase().includes(filterBanco.toLowerCase())
      ) {
        return false;
      }

      const tDate = parseISO(t.date);
      if (startDate && isBefore(tDate, parseISO(startDate))) return false;
      if (endDate && isAfter(tDate, parseISO(endDate))) return false;

      return true;
    });
  }, [
    transactions,
    filterYear,
    filterType,
    filterEmpresa,
    filterBanco,
    startDate,
    endDate,
  ]);

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
    .reduce((s, t) => s + t.value, 0);

  const totalDespesa = filteredTransactions
    .filter(t => t.type === 'despesa')
    .reduce((s, t) => s + t.value, 0);

  const saldoFinal = totalReceita - totalDespesa;

  /* =========================
     EDIÇÃO
  ========================= */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingTransaction(prev =>
      prev
        ? {
            ...prev,
            [name]: name === 'value' ? Number(value) || 0 : value,
          }
        : null
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Carregando dados...
        </CardContent>
      </Card>
    );
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Extrato de Movimentações</h1>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-400">
          <CardHeader>
            <CardTitle className="text-green-800">Receitas</CardTitle>
          </CardHeader>
          <CardContent className="text-green-700 font-bold text-2xl">
            R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-400">
          <CardHeader>
            <CardTitle className="text-red-800">Despesas</CardTitle>
          </CardHeader>
          <CardContent className="text-red-700 font-bold text-2xl">
            R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card className="bg-gray-100 border-gray-400">
          <CardHeader>
            <CardTitle>Saldo</CardTitle>
          </CardHeader>
          <CardContent
            className={`font-bold text-2xl ${
              saldoFinal >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            R$ {saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      {/* TABELA */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Banco</TableHead>
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
                  <TableCell>{t.empresa || '-'}</TableCell>
                  <TableCell>{t.banco || '-'}</TableCell>
                  <TableCell className="text-right">
                    R$ {t.value.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {t.saldoAcumulado.toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoDeCaixa;
