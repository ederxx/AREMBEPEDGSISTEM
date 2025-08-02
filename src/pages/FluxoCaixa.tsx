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

// Modal simples inline para demonstração
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

interface Expense {
  id: string;
  nome: string;
  dataVencimento: string;
  valor: number;
  categoria: string;
  status: string; // 'pago', 'pendente', 'vencido', 'programado'
  empresa?: string;
  banco?: string;
}

interface Income {
  id: string;
  nome: string;
  empresa: 'Arembepe' | 'DG';
  banco: string;
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
  empresa?: string;
  banco?: string;
  nome: string;
}

const FluxoDeCaixa = ({ expenses, incomes, isLoading }: FluxoDeCaixaProps) => {
  const [manualIncomes, setManualIncomes] = useState<Income[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    empresa: 'Arembepe',
    banco: '',
    dataVencimento: '',
    valor: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddIncome = () => {
    if (
      !formData.nome.trim() ||
      !formData.banco.trim() ||
      !formData.dataVencimento.trim() ||
      !formData.valor.trim() ||
      isNaN(Number(formData.valor)) ||
      Number(formData.valor) <= 0
    ) {
      alert('Por favor, preencha todos os campos corretamente.');
      return;
    }

    const newIncome: Income = {
      id: Date.now().toString(),
      nome: formData.nome,
      empresa: formData.empresa as 'Arembepe' | 'DG',
      banco: formData.banco,
      dataVencimento: formData.dataVencimento,
      valor: parseFloat(formData.valor),
    };
    setManualIncomes(prev => [...prev, newIncome]);
    setFormData({ nome: '', empresa: 'Arembepe', banco: '', dataVencimento: '', valor: '' });
  };

  const [filterEmpresa, setFilterEmpresa] = useState<'all' | 'Arembepe' | 'DG'>('all');
  const [filterBanco, setFilterBanco] = useState<string>('');
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
        type: 'despesa' as const,
        description: exp.nome,
        value: exp.valor,
        status: exp.status,
        empresa: exp.empresa,
        banco: exp.banco,
        nome: exp.nome,
      })),
      ...[...incomes, ...manualIncomes].map(inc => ({
        id: inc.id,
        date: inc.dataVencimento,
        type: 'receita' as const,
        description: inc.nome,
        value: inc.valor,
        empresa: inc.empresa,
        banco: inc.banco,
        nome: inc.nome,
      })),
    ];

    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return combined;
  }, [expenses, incomes, manualIncomes]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterEmpresa !== 'all' && t.empresa !== filterEmpresa) return false;
      if (filterBanco.trim() !== '' && t.banco?.toLowerCase().indexOf(filterBanco.toLowerCase()) === -1)
        return false;

      const tDate = parseISO(t.date);
      if (startDate && isBefore(tDate, parseISO(startDate))) return false;
      if (endDate && isAfter(tDate, parseISO(endDate))) return false;

      return true;
    });
  }, [transactions, filterType, startDate, endDate, filterEmpresa, filterBanco]);

  // Função auxiliar para validar datas
  function isValid(date: Date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  const totalReceita = filteredTransactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.value, 0);

  const totalDespesa = filteredTransactions
    .filter(t => t.type === 'despesa' && (t.status === 'pago' || t.status === undefined))
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const saldoFinal = totalReceita - totalDespesa;

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
      prev ? { ...prev, [name]: name === 'valor' ? parseFloat(value) || 0 : value } : null
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
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Voltar ao Dashboard
      </Button>

      {/* Form de receita manual */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Receita Manual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Nome</Label>
            <Input name="nome" value={formData.nome} onChange={handleInputChange} />
          </div>
          <div>
            <Label>Empresa</Label>
            <select
              name="empresa"
              value={formData.empresa}
              onChange={handleInputChange}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="Arembepe">Arembepe</option>
              <option value="DG">DG</option>
            </select>
          </div>
          <div>
            <Label>Banco</Label>
            <Input name="banco" value={formData.banco} onChange={handleInputChange} />
          </div>
          <div>
            <Label>Data do Pagamento</Label>
            <Input
              name="dataVencimento"
              type="date"
              value={formData.dataVencimento}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label>Valor</Label>
            <Input
              name="valor"
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddIncome}>Adicionar Receita</Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <CardTitle>Saldo em Caixa</CardTitle>
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

      {/* Tabelas lado a lado */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Receitas */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Receitas do Período</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="text-sm min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeader className="text-center">Data</TableHeader>
                  <TableHeader>Descrição</TableHeader>
                  <TableHeader className="text-center">Empresa</TableHeader>
                  <TableHeader className="text-center">Banco</TableHeader>
                  <TableHeader className="text-right">Valor (R$)</TableHeader>
                  <TableHeader className="text-center">Ações</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.filter(t => t.type === 'receita').length > 0 ? (
                  filteredTransactions
                    .filter(t => t.type === 'receita')
                    .map(t => (
                      <TableRow key={t.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell className="text-center font-medium">
                          {t.date && isValid(parseISO(t.date)) ? format(parseISO(t.date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell className="text-center">{t.empresa || '-'}</TableCell>
                        <TableCell className="text-center">{t.banco || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-green-700">
                          R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma receita encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Despesas do Período</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="text-sm min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeader className="text-center">Data</TableHeader>
                  <TableHeader>Descrição</TableHeader>
                  <TableHeader className="text-center">Empresa</TableHeader>
                  <TableHeader className="text-center">Banco</TableHeader>
                  <TableHeader className="text-right">Valor (R$)</TableHeader>
                  <TableHeader className="text-center">Ações</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.filter(t => t.type === 'despesa').length > 0 ? (
                  filteredTransactions
                    .filter(t => t.type === 'despesa')
                    .map(t => (
                      <TableRow key={t.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell className="text-center font-medium">
                          {t.date && isValid(parseISO(t.date)) ? format(parseISO(t.date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell className="text-center">{t.empresa || '-'}</TableCell>
                        <TableCell className="text-center">{t.banco || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-red-700">
                          R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma despesa encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
