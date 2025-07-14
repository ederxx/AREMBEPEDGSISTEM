import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Expense } from '@/types/expense';
import { CATEGORY_NAMES } from '@/constants/expenseCategories';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedExpense: Partial<Expense> & { id: string }) => void;
  expense: Expense | null;
  usersMap?: Record<string, { displayName?: string; email?: string }>;
}

function parseLocalDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toISOString();
}

export function EditExpenseModal({
  isOpen,
  onClose,
  onSave,
  expense,
  usersMap = {},
}: EditExpenseModalProps) {
  const [formData, setFormData] = useState<Partial<Expense>>({});

  useEffect(() => {
    if (expense) {
      setFormData({
        ...expense,
        dataVencimento: expense.dataVencimento?.slice(0, 10),
        dataPagamento: expense.dataPagamento?.slice(0, 10),
        formaPagamento: expense.formaPagamento || '',
        userId: expense.userId || '',
      });
    }
  }, [expense]);

  const handleSave = () => {
    if (!expense) return;

    const updatedExpense: Partial<Expense> & { id: string } = {
      ...formData,
      id: expense.id,
      dataVencimento: formData.dataVencimento
        ? parseLocalDate(formData.dataVencimento)
        : undefined,
      dataPagamento: formData.dataPagamento
        ? parseLocalDate(formData.dataPagamento)
        : undefined,
    };

    Object.keys(updatedExpense).forEach((key) => {
      if (updatedExpense[key as keyof typeof updatedExpense] === undefined) {
        delete updatedExpense[key as keyof typeof updatedExpense];
      }
    });

    onSave(updatedExpense);
  };

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label>Nome</Label>
            <Input
              value={formData.nome || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nome: e.target.value }))
              }
            />
          </div>

          {/* Valor */}
          <div>
            <Label>Valor</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.valor !== undefined ? formData.valor : ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  valor: e.target.value === '' ? undefined : parseFloat(e.target.value),
                }))
              }
            />
          </div>

          {/* Categoria */}
          <div>
            <Label>Categoria</Label>
            <Select
              value={formData.categoria || ''}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, categoria: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategoria */}
          <div>
            <Label>Subcategoria</Label>
            <Input
              value={formData.subcategoria || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  subcategoria: e.target.value,
                }))
              }
            />
          </div>

          {/* Empresa */}
          <div>
            <Label>Empresa</Label>
            <Select
              value={formData.empresa || ''}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, empresa: value }))
              }
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

          {/* Forma de Pagamento */}
          <div>
            <Label>Forma de Pagamento</Label>
            <Select
              value={formData.formaPagamento || ''}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, formaPagamento: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                <SelectItem value="Banco Bradesco">Banco Bradesco</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de Vencimento */}
          <div>
            <Label>Data de Vencimento</Label>
            <Input
              type="date"
              value={formData.dataVencimento || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dataVencimento: e.target.value,
                }))
              }
            />
          </div>

          {/* Data de Pagamento */}
          <div>
            <Label>Data de Pagamento</Label>
            <Input
              type="date"
              value={formData.dataPagamento || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dataPagamento: e.target.value,
                }))
              }
            />
          </div>

          {/* Usuário */}
          <div>
            <Label>Usuário</Label>
            <select
              value={formData.userId || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, userId: e.target.value }))
              }
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Selecione o usuário</option>
              {Object.entries(usersMap).map(([uid, user]) => (
                <option key={uid} value={uid}>
                  {user.displayName || user.email || uid}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
