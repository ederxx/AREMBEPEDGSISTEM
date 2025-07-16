import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORIES } from '@/constants/expenseCategories';
import { ExpenseFormData } from '@/types/expense';


interface ExpenseFormProps {
  vehiclePlates: string[];
  employeeNames: string[];
}

const ExpenseForm = ({ vehiclePlates, employeeNames }: ExpenseFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ExpenseFormData>({
    nome: '',
    dataVencimento: undefined,
    dataPagamento: undefined,
    valor: '',
    categoria: '',
    subcategoria: '',
    placa: '',
    empresa: '',
    formaPagamento: '', 
      funcionario: '',
      recorrente: false,// ✅ novo campo
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: any) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const expensesRef = collection(db, 'expenses');
      const docRef = await addDoc(expensesRef, expense);
      return docRef;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Despesa adicionada com sucesso!' });

      setFormData({
        nome: '',
        dataVencimento: undefined, 
        dataPagamento: undefined,
        valor: '',
        categoria: '',
        subcategoria: '',
        placa: '',
        empresa: '',
        formaPagamento: '',
        funcionario: '',
         recorrente: false // reset também aqui
      });

      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar despesa',
        description: `${error.code || ''}: ${error.message || 'Erro inesperado'}`,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (
      !formData.nome ||
      !formData.dataVencimento ||
      !formData.valor ||
      !formData.categoria ||
      !formData.subcategoria ||
      !formData.empresa ||
      !formData.formaPagamento // validação nova
    ) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    let finalName = formData.nome;

    if (formData.categoria === 'veiculo' && formData.placa) {
      finalName = `${formData.nome} - ${formData.placa}`;
    }

  if (formData.categoria === 'funcionarios' && formData.funcionario) {
  finalName = `${formData.funcionario} - ${formData.nome}`;
}

   const expenseData = {
  nome: formData.nome,
  valor: parseFloat(formData.valor),
  categoria: formData.categoria,
  subcategoria: formData.subcategoria,
  empresa: formData.empresa,
  formaPagamento: formData.formaPagamento,
  dataVencimento: formData.dataVencimento ? format(formData.dataVencimento, 'yyyy-MM-dd') : undefined,
  dataPagamento: formData.dataPagamento ? format(formData.dataPagamento, 'yyyy-MM-dd') : undefined,
funcionario: formData.funcionario || null, // opcional
  userId: user?.uid || '',           // salva o uid do usuário
  userName: user?.displayName || '', // salva o nome do usuário

  createdAt: new Date().toISOString(),
};
if (formData.recorrente) {
  setIsSubmitting(true);
  try {
    // Lançar uma despesa para cada um dos 12 meses
    for (let i = 0; i < 12; i++) {
      const dataVencimentoMes = new Date(formData.dataVencimento!);
      dataVencimentoMes.setMonth(dataVencimentoMes.getMonth() + i);

      const expenseData = {
        nome: formData.nome,
        valor: parseFloat(formData.valor),
        categoria: formData.categoria,
        subcategoria: formData.subcategoria,
        empresa: formData.empresa,
        formaPagamento: formData.formaPagamento,
        dataVencimento: format(dataVencimentoMes, 'yyyy-MM-dd'),
        dataPagamento: null,
        funcionario: formData.funcionario || null,
        status: 'pendente', // Força pendente
        recorrente: true,
        mesReferencia: format(dataVencimentoMes, 'MM/yyyy'),
        userId: user?.uid || '',
        userName: user?.displayName || '',
        createdAt: new Date().toISOString(),
      };

      await addExpenseMutation.mutateAsync(expenseData);
    }
    toast({ title: 'Despesas recorrentes adicionadas com sucesso!' });

    setFormData({
      nome: '',
      dataVencimento: undefined,
      dataPagamento: undefined,
      valor: '',
      categoria: '',
      subcategoria: '',
      placa: '',
      empresa: '',
      formaPagamento: '',
      funcionario: '',
      recorrente: false,
    });
  } catch (error) {
    toast({
      title: 'Erro ao adicionar despesas recorrentes',
      variant: 'destructive',
    });
  } finally {
    setIsSubmitting(false);
  }
  return;
}

    try {
      await addExpenseMutation.mutateAsync(expenseData);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const getSubcategories = () => {
    if (!formData.categoria) return [];
    return EXPENSE_CATEGORIES[formData.categoria as keyof typeof EXPENSE_CATEGORIES]?.subcategories || [];
  };
console.log('Funcionários disponíveis:', employeeNames);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Despesa</CardTitle>
      </CardHeader>
      <CardContent>
       <form onSubmit={handleSubmit} className="space-y-6">
  {/* Categoria / Subcategoria */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Categoria *</Label>
      <Select
        value={formData.categoria}
        onValueChange={(value) =>
          setFormData({ ...formData, categoria: value, subcategoria: '' })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a categoria" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
            <SelectItem key={key} value={key}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Subcategoria *</Label>
      <Select
        value={formData.subcategoria}
        onValueChange={(value) => setFormData({ ...formData, subcategoria: value })}
        disabled={!formData.categoria}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a subcategoria" />
        </SelectTrigger>
        <SelectContent>
          {getSubcategories().map((sub) => (
            <SelectItem key={sub} value={sub}>
              {sub}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>

  {/* Veículo ou Funcionário */}
  {formData.categoria === 'veiculo' && (
    <div>
      <Label>Placa do Veículo</Label>
      <Select
        value={formData.placa}
        onValueChange={(value) => setFormData({ ...formData, placa: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a placa" />
        </SelectTrigger>
        <SelectContent>
          {vehiclePlates.map((placa) => (
            <SelectItem key={placa} value={placa}>
              {placa}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}

 {formData.categoria === 'funcionarios' && (
  <div>
    <Label>Nome do Funcionário</Label>
    <Select
      value={formData.funcionario}
      onValueChange={(value) => setFormData({ ...formData, funcionario: value })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione o funcionário" />
      </SelectTrigger>
      <SelectContent>
        {employeeNames.map((nome) => (
          <SelectItem key={nome} value={nome}>
            {nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

  {/* Empresa / Forma Pagamento */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Empresa *</Label>
      <Select
        value={formData.empresa}
        onValueChange={(value) => setFormData({ ...formData, empresa: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a empresa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Arembepe Turismo">Arembepe Turismo</SelectItem>
          <SelectItem value="DG Transportes">DG Transportes</SelectItem>
          <SelectItem value="Terceirizado">Terceirizado</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Forma de Pagamento *</Label>
      <Select
        value={formData.formaPagamento}
        onValueChange={(value) => setFormData({ ...formData, formaPagamento: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a forma de pagamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Bradesco">Bradesco</SelectItem>
          <SelectItem value="Brasil">Brasil</SelectItem>
          <SelectItem value="Pix">Pix</SelectItem>
          <SelectItem value="À Vista">À Vista</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  {/* Nome da Despesa */}
  <div>
    <Label>Nome da Despesa *</Label>
    <Input
      value={formData.nome}
      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
      placeholder="Ex: Conta de luz, Seguro do veículo..."
    />
  </div>

  {/* Datas e Valor */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <Label>Data de Vencimento *</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !formData.dataVencimento && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formData.dataVencimento
              ? format(formData.dataVencimento, 'dd/MM/yyyy', { locale: ptBR })
              : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={formData.dataVencimento}
            onSelect={(date) => setFormData({ ...formData, dataVencimento: date })}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    <div>
      <Label>Data de Pagamento</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !formData.dataPagamento && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formData.dataPagamento
              ? format(formData.dataPagamento, 'dd/MM/yyyy', { locale: ptBR })
              : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={formData.dataPagamento}
            onSelect={(date) => setFormData({ ...formData, dataPagamento: date })}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    <div>
      <Label>Valor *</Label>
      <Input
        type="number"
        step="0.01"
        value={formData.valor}
        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
        placeholder="0,00"
      />
    </div>
  </div>
  <div className="flex items-center space-x-2">
  <input
    type="checkbox"
    id="recorrente"
    checked={formData.recorrente}
    onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
  />
  <label htmlFor="recorrente" className="text-sm select-none">Despesa Recorrente (12 meses)</label>
</div>

  {/* Botão */}
  <Button type="submit" className="w-full" disabled={isSubmitting}>
    {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
  </Button>
</form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;
