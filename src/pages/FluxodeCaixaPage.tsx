import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useYear } from '@/contexts/YearContext';
import { getYearCollection } from '../ultils/getYearCollection';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react';

/* =========================
   TIPOS UNIFICADOS
========================= */
interface UnifiedTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: 'receita' | 'despesa';
  category: string;
  status: string;
}

const FluxoDeCaixaMaster = () => {
  const { user } = useAuth();
  const { year } = useYear();
  const navigate = useNavigate();

  // 1. Buscar Receitas (Services)
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services-flow', year],
    queryFn: async () => {
      const snap = await getDocs(collection(db, getYearCollection('services', year)));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user
  });

  // 2. Buscar Despesas (Expenses)
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses-flow', year],
    queryFn: async () => {
      const snap = await getDocs(collection(db, getYearCollection('expenses', year)));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!user
  });

  /* =========================
     LÓGICA DE UNIFICAÇÃO (SÓ O QUE ESTÁ PAGO)
  ========================= */
  const { transactions, totalReceitas, totalDespesas, saldoFinal } = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    // Processar Receitas Pagas
    services.forEach((s: any) => {
      if (s.formadePagamento === 'pago') {
        list.push({
          id: s.id,
          date: s.dataInicio, // Usando data de início como referência
          description: `Serviço: ${s.nomeEmpresa}`,
          value: Number(s.valorFinal) || 0,
          type: 'receita',
          category: s.tipoCarro || 'Serviço',
          status: 'pago'
        });
      }
    });

    // Processar Despesas Pagas
    expenses.forEach((e: any) => {
      if (e.dataPagamento) {
        list.push({
          id: e.id,
          date: e.dataPagamento, // Data real que saiu o dinheiro
          description: e.descricao || e.subcategoria,
          value: Number(e.valor) || 0,
          type: 'despesa',
          category: e.categoria || 'Geral',
          status: 'pago'
        });
      }
    });

    // Ordenar por data (mais recente primeiro)
    const sorted = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const receitas = list.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.value, 0);
    const despesas = list.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.value, 0);

    return {
      transactions: sorted,
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldoFinal: receitas - despesas
    };
  }, [services, expenses]);

  if (loadingServices || loadingExpenses) {
    return <div className="p-8 text-center">Carregando Fluxo de Caixa...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa Realizado</h1>
          <p className="text-muted-foreground">Baseado em pagamentos e recebimentos confirmados ({year}).</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receitas Realizadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${saldoFinal >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo em Caixa</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {saldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABELA DE MOVIMENTAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle>Extrato Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Despesa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{t.description}</span>
                      <Badge variant="outline" className="w-fit text-[10px] uppercase">
                        {t.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(parseISO(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className={`text-right font-bold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'receita' ? '+' : '-'} {t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Nenhuma movimentação financeira encontrada para este período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoDeCaixaMaster;