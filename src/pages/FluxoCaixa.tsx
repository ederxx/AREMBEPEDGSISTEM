import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/* =========================
   TIPOS
========================= */
export interface Transaction {
  id: string;
  date: string;
  type: 'receita' | 'despesa';
  description: string;
  value: number;
  empresa?: string;
  formadePagamento?: string;
}

interface FluxoDeCaixaProps {
  transactions: Transaction[];
  isLoading: boolean;
}

const FluxoDeCaixa = ({ transactions = [], isLoading }: FluxoDeCaixaProps) => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');

  // 1. Filtragem
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date || !isValid(parseISO(t.date))) return false;
      
      const tDate = parseISO(t.date);
      if (startDate && isBefore(tDate, parseISO(startDate))) return false;
      if (endDate && isAfter(tDate, parseISO(endDate))) return false;
      if (filterEmpresa && !t.empresa?.toLowerCase().includes(filterEmpresa.toLowerCase())) return false;
      
      return true;
    });
  }, [transactions, startDate, endDate, filterEmpresa]);

  // 2. Cálculo de Saldo Acumulado (CRONOLÓGICO)
  const { tableData, totalReceita, totalDespesa } = useMemo(() => {
    let runningSaldo = 0;
    let rec = 0;
    let des = 0;

    const withSaldo = filteredTransactions.map(t => {
      if (t.type === 'receita') {
        runningSaldo += t.value;
        rec += t.value;
      } else {
        runningSaldo -= t.value;
        des += t.value;
      }
      return { ...t, saldoAcumulado: runningSaldo };
    });

    return { 
      tableData: [...withSaldo].reverse(), // Inverte para mostrar a mais recente no topo da tabela
      totalReceita: rec, 
      totalDespesa: des 
    };
  }, [filteredTransactions]);

  if (isLoading) return <div className="p-10 text-center">Carregando dados do caixa...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fluxo de Caixa Realizado</h1>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Voltar</Button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader><CardTitle className="text-green-700 text-sm">Receitas (Pagas)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-green-800">
            R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader><CardTitle className="text-red-700 text-sm">Despesas (Pagas)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-red-800">
            R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardHeader><CardTitle className="text-sm">Saldo em Caixa</CardTitle></CardHeader>
          <CardContent className={`text-2xl font-bold ${totalReceita - totalDespesa >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            R$ {(totalReceita - totalDespesa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      {/* FILTROS RÁPIDOS */}
      <Card>
        <CardContent className="pt-6 flex gap-4">
          <div className="flex-1">
            <Label>Empresa</Label>
            <Input placeholder="Buscar empresa..." value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)} />
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* TABELA */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo Acum.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(parseISO(t.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{t.description}</div>
                    <div className="text-xs text-gray-400 uppercase">{t.empresa}</div>
                  </TableCell>
                  <TableCell className={`text-right font-bold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'receita' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-gray-500 font-mono">
                    R$ {t.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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