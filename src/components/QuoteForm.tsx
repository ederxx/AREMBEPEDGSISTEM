import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

interface QuoteFormProps {
  selectedService: string | null;
  services: { id: string; title: string; vehicles: any[] }[];
  onClose: () => void;
}

const QuoteForm = ({ selectedService, services, onClose }: QuoteFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    servico: selectedService || '',
    veiculo: '',
    passageiros: '',
    data: '',
    horario: '',
    origem: '',
    destino: '',
    observacoes: ''
  });

  const selectedServiceData = services.find(s => s.id === formData.servico);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Convert passageiros to a number and validate
      const passageirosNumber = parseInt(formData.passageiros, 10);
      if (isNaN(passageirosNumber) || passageirosNumber <= 0) {
        toast({
          title: "Erro",
          description: "Número de passageiros inválido. Deve ser um número inteiro positivo.",
          variant: "destructive",
        });
        return;
      }

      // Combine data and horario into a single string
      const combinedDateTimeString = `${formData.data} ${formData.horario}`;

      // Create a Date object from the combined string
      const combinedDateTime = new Date(combinedDateTimeString);

      // Validate the Date object
      if (isNaN(combinedDateTime.getTime())) {
        toast({
          title: "Erro",
          description: "Data e/ou horário inválidos.",
          variant: "destructive",
        });
        return;
      }

      // Format the Date object as an ISO string
      const dataISO = combinedDateTime.toISOString();

      // Prepare the data to be sent to Firestore
      const quoteData = {
        ...formData,
        passageiros: passageirosNumber,
        data: dataISO,
        status: 'pendente',
        createdAt: new Date().toISOString(),
      };

      console.log("Data being sent to Firestore:", quoteData); // Log the data

      await addDoc(collection(db, 'quotes'), quoteData);

      toast({
        title: "Orçamento enviado!",
        description: "Entraremos em contato em breve.",
      });

      onClose();
    } catch (error: any) {
      console.error("Error adding quote:", error);
      console.error("Error details:", error.code, error.message, error.stack);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o orçamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Solicitar Orçamento</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="servico">Tipo de Serviço</Label>
              <Select value={formData.servico} onValueChange={(value) => setFormData({ ...formData, servico: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedServiceData && (
              <div>
                <Label htmlFor="veiculo">Tipo de Veículo</Label>
                <Select value={formData.veiculo} onValueChange={(value) => setFormData({ ...formData, veiculo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedServiceData.vehicles.map((vehicle: any, index: number) => (
                      <SelectItem key={index} value={vehicle.type}>
                        {vehicle.type} - {vehicle.passengers} passageiros
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="passageiros">Número de passageiros</Label>
                <Input
                  id="passageiros"
                  type="number"
                  min="1"
                  value={formData.passageiros}
                  onChange={(e) => setFormData({ ...formData, passageiros: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="data">Data desejada</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origem">Local de origem</Label>
                <Input
                  id="origem"
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="destino">Destino</Label>
                <Input
                  id="destino"
                  value={formData.destino}
                  onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações adicionais</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais sobre sua necessidade..."
              />
            </div>

            <div className="flex space-x-4">
              <Button type="submit" className="flex-1">
                Enviar Solicitação
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteForm;
