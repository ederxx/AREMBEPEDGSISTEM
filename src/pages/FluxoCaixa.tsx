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
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Modal simples inline para demonstração
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto">
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

// As interfaces foram mantidas, mas a lógica de combinação foi para a página
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
  transactions: Transaction[]; // Agora recebe apenas a lista combinada e filtrada
  isLoading: boolean;
}
interface Service {
  id: string;
  nomeEmpresa: string;
  formadePagamento: string;
  valorFinal: number;
  // Adicione aqui outros campos do seu documento 'services' se precisar deles em outros lugares do código
}
function isValid(date: Date) {
  return date instanceof Date && !isNaN(date.getTime());
}

// A função calculateStatus foi movida para o componente pai

const FluxoDeCaixa = ({ transactions, isLoading }: FluxoDeCaixaProps) => {
  const navigate = useNavigate();

  // Estados de Filtro
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<'all' | 'Arembepe' | 'DG'>('all');
  const [filterBanco, setFilterBanco] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // A lógica de filtragem da interface agora atua sobre a lista recebida
  const filteredTransactions = useMemo(() => {
    // Função para normalizar empresa
    const normalizeEmpresa = (empresa?: string) => {
      if (!empresa) return '';
      const lower = empresa.trim().toLowerCase();
      if (lower.includes('arembepe')) return 'Arembepe';
      if (lower.includes('dg')) return 'DG';
      return empresa.trim();
    };

    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (
        filterEmpresa !== 'all' &&
        normalizeEmpresa(t.empresa).toLowerCase() !== filterEmpresa.toLowerCase()
      )
        return false;
      if (
        filterBanco.trim() !== '' &&
        t.banco?.toLowerCase().indexOf(filterBanco.toLowerCase()) === -1
      )
        return false;

      const tDate = parseISO(t.date);
      if (startDate && isBefore(tDate, parseISO(startDate))) return false;
      if (endDate && isAfter(tDate, parseISO(endDate))) return false;

      return true;
    });
  }, [transactions, filterType, startDate, endDate, filterEmpresa, filterBanco]);

  // Cálculo de saldo e totais
  const transacoesComSaldo = useMemo(() => {
    let saldo = 0;
    return filteredTransactions.map((t) => {
      saldo += t.type === 'receita' ? t.value : -t.value;
      return { ...t, saldoAcumulado: saldo };
    });
  }, [filteredTransactions]);
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    }
  });
const totalReceita = (services || [])
  .filter(s => s.formadePagamento  === 'pago')
  .reduce((sum, s) => sum + (Number(s.valorFinal) || 0), 0);
  

  const totalDespesa = filteredTransactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.value, 0);

  const saldoFinal = totalReceita - totalDespesa;

  // Lógica de despesas pagas agora precisa de um cálculo diferente, pois só recebemos as transações pagas.
  // Você pode ter um estado para o total de despesas pagas ou passar a lógica de cálculo do pai
  // Por enquanto, vou remover o card de despesas pagas, já que o novo array de transações não contém mais todas as despesas.

  // Lógica do Modal de Edição (mantida)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  function openEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  }

  function saveEdit() {
    if (!editingTransaction) return;
    setIsModalOpen(false);
    setEditingTransaction(null);
    alert('Alteração salva! (implemente a atualização real)');
  }

function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  const { name, value } = e.target;
  setEditingTransaction(prev =>
    prev
      ? {
          ...prev,
          [name]: name === 'value' ? parseFloat(value) || 0 : value,
        }
      : null
  );
}
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Carregando dados...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Extrato de Movimentações</h1>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Card de Despesas Pagas foi removido porque o componente FluxoDeCaixa não tem mais acesso a todas as despesas, apenas as que já estão combinadas e filtradas. */}
        {/* <Card className="bg-red-50 border-red-400">...</Card> */}

        <Card className="bg-green-50 border-green-400">
          <CardHeader>
            <CardTitle className="text-green-800">Total de Receitas</CardTitle>
          </CardHeader>
          <CardContent className="text-green-700 font-bold text-2xl">
            R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-400">
          <CardHeader>
            <CardTitle className="text-red-800">Total de Despesas</CardTitle>
          </CardHeader>
          <CardContent className="text-red-700 font-bold text-2xl">
            R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card className="bg-gray-100 border-gray-400">
          <CardHeader>
            <CardTitle>Saldo Atual</CardTitle>
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

      {/* Seção de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Tipo</Label>
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as 'all' | 'receita' | 'despesa')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresa</Label>
            <Select value={filterEmpresa} onValueChange={v => setFilterEmpresa(v as 'all' | 'Arembepe' | 'DG')}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Arembepe">Arembepe</SelectItem>
                <SelectItem value="DG">DG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Data de Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Tabela estilo extrato bancário com saldo acumulado */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="text-sm min-w-full">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="text-center font-bold">Data</TableHead>
                <TableHead className="text-center font-bold">Tipo</TableHead>
                <TableHead className="font-bold">Descrição</TableHead>
                <TableHead className="text-center font-bold">Empresa</TableHead>
                <TableHead className="text-center font-bold">Banco</TableHead>
                <TableHead className="text-right font-bold">Valor (R$)</TableHead>
                <TableHead className="text-right font-bold">Saldo Acumulado (R$)</TableHead>
                <TableHead className="text-center font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoesComSaldo.length > 0 ? (
                transacoesComSaldo.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-center font-medium">
                      {t.date && isValid(parseISO(t.date)) ? format(parseISO(t.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          t.type === 'receita'
                            ? 'px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold'
                            : 'px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold'
                        }
                      >
                        {t.type === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">{t.description}</TableCell>
                    <TableCell className="text-center">{t.empresa || '-'}</TableCell>
                    <TableCell className="text-center">{t.banco || '-'}</TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        t.type === 'receita' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {t.type === 'despesa' ? '-' : '+'}
                      R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        t.saldoAcumulado >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      R$ {t.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(t)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma transação encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de edição */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CardTitle>Editar Transação</CardTitle>
        {editingTransaction && (
          <div className="grid gap-4 mt-4">
            <div>
              <Label>Nome</Label>
              <Input
                name="description"
                value={editingTransaction.description}
                onChange={e =>
                  setEditingTransaction(prev =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
              />
            </div>

            <div>
              <Label>Empresa</Label>
              <Input
                name="empresa"
                value={editingTransaction.empresa || ''}
                onChange={e => handleEditChange(e)}
              />
            </div>

            <div>
              <Label>Banco</Label>
              <Input
                name="banco"
                value={editingTransaction.banco || ''}
                onChange={e => handleEditChange(e)}
              />
            </div>

            <div>
              <Label>Data</Label>
              <Input
                type="date"
                name="date"
                value={editingTransaction.date}
                onChange={e => handleEditChange(e)}
              />
            </div>

            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                name="valor"
                value={editingTransaction.value}
                onChange={e => handleEditChange(e)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveEdit}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FluxoDeCaixa;
