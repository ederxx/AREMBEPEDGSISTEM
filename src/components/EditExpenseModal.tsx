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
  onSave: (updatedExpense: Partial<Expense>) => void;
  expense: Expense | null;
}

// Função que converte string "yyyy-MM-dd" para uma data ISO ajustada
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
}: EditExpenseModalProps) {
  const [formData, setFormData] = useState<Partial<Expense>>({});

  useEffect(() => {
    if (expense) {
      setFormData({
        ...expense,
        dataVencimento: expense.dataVencimento?.slice(0, 10),
        dataPagamento: expense.dataPagamento?.slice(0, 10),
      });
    }
  }, [expense]);

  const handleSave = () => {
    const updatedExpense: Partial<Expense> = {
      ...formData,
      dataVencimento: formData.dataVencimento
        ? parseLocalDate(formData.dataVencimento)
        : undefined,
      dataPagamento: formData.dataPagamento
        ? parseLocalDate(formData.dataPagamento)
        : undefined,
    };
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
          <div>
            <Label>Nome</Label>
            <Input
              value={formData.nome || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nome: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Valor</Label>
            <Input
              type="number"
              value={formData.valor ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  valor: parseFloat(e.target.value),
                }))
              }
            />
          </div>

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
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
