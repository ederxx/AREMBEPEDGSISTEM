import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Calendar, Car, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash } from "lucide-react";



const ServicesManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    dataInicio: '',
    dataFim: '',
    tipoCarro: '',
    motorista: '',
    numeroPassageiros: '',
    localSaida: '',
    localDestino: '',
    hrServico: '',
    valorFinal: '',
    status: 'pendente',
    formadePagamento: '',
    observacoes: ''
  });
const [drivers, setDrivers] = useState<any[]>([]);
  // Funções para formatar status e definir cor do Badge
  const formatStatus = (status?: string) => {
    if (!status) return 'Sem status';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'finalizado':
        return 'bg-green-500 hover:bg-green-600';
      case 'agendado':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'em_andamento':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'cancelado':
        return 'bg-red-500 hover:bg-red-600';
      case 'pendente':
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);
useEffect(() => {
  const fetchDrivers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'drivers'));
      const driverList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nomeCompleto || 'Sem nome',
        };
      });
      setDrivers(driverList);
    } catch (error) {
      console.error("Erro ao buscar motoristas:", error);
    }
  };

  fetchDrivers();
}, []);
  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: data.status || 'pendente' // garante que o status sempre tenha um valor
        };
      });
    }
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'vehicles'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      await addDoc(collection(db, 'services'), {
        ...data,
        numeroPassageiros: parseInt(data.numeroPassageiros),
        valorFinal: parseFloat(data.valorFinal),
        createdAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Serviço registrado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao registrar serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar serviço. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await updateDoc(doc(db, 'services', id), {
        ...data,
        numeroPassageiros: parseInt(data.numeroPassageiros),
        valorFinal: parseFloat(data.valorFinal),
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditingService(null);
      setShowForm(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Serviço atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar serviço. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'services', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir serviço. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      nomeEmpresa: '',
      dataInicio: '',
      dataFim: '',
      tipoCarro: '',
      motorista: '',
      numeroPassageiros: '',
      localSaida: '',
      localDestino: '',
      hrServico: '',
      valorFinal: '',
      status: 'pendente',
      formadePagamento: '',
      observacoes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nomeEmpresa.trim() ||
      !formData.dataInicio ||
      !formData.tipoCarro ||
      !formData.numeroPassageiros ||
      !formData.valorFinal
    ) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: formData });
    } else {
      addServiceMutation.mutate(formData);
    }
  };
  const handleResumo = (service: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const html = `
    <html>
      <head>
        <title>Resumo do Serviço</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          .info { margin-bottom: 12px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Ordem de Serviço</h1>
        <div class="info"><span class="label">Empresa:</span> ${service.nomeEmpresa}</div>
        <div class="info"><span class="label">Data:</span> ${formatDate(service.dataInicio)} ${service.dataFim ? ` até ${formatDate(service.dataFim)}` : ''}</div>
        <div class="info"><span class="label">Hora:</span> ${service.hrServico}</div>
        <div class="info"><span class="label">Veículo:</span> ${service.tipoCarro}</div>
        <div class="info"><span class="label">Motorista:</span> ${service.motorista}</div>
        <div class="info"><span class="label">Passageiros:</span> ${service.numeroPassageiros}</div>
        <div class="info"><span class="label">Local de Saída:</span> ${service.localSaida}</div>
        <div class="info"><span class="label">Destino:</span> ${service.localDestino}</div>
        <div class="info"><span class="label">Valor:</span> ${formatCurrency(service.valorFinal)}</div>
        <div class="info"><span class="label">Forma de Pagamento:</span> ${service.formadePagamento}</div>
        <div class="info"><span class="label">Status:</span> ${formatStatus(service.status)}</div>
        <div class="info"><span class="label">Observações:</span> ${service.observacoes || '-'}</div>

        <br><br>
        <button onclick="window.print()">Imprimir</button>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      nomeEmpresa: service.nomeEmpresa || '',
      dataInicio: service.dataInicio || '',
      dataFim: service.dataFim || '',
      tipoCarro: service.tipoCarro || '',
      motorista: service.motorista || '',
      numeroPassageiros: service.numeroPassageiros?.toString() || '',
      localSaida: service.localSaida || '',
      localDestino: service.localDestino || '',
          hrServico: service.hrServico || '',
      valorFinal: service.valorFinal?.toString() || '',
      status: service.status || 'pendente',
      formadePagamento: service.formadePagamento || '',
      observacoes: service.observacoes || ''
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-2xl font-bold text-teal-primary">Serviços Realizados</h1>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Serviço
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingService ? 'Editar Serviço' : 'Registrar Novo Serviço'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nomeEmpresa">Nome da Empresa *</Label>
                  <Input
                    id="nomeEmpresa"
                    value={formData.nomeEmpresa}
                    onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataInicio">Data de Início *</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">Data de Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={formData.dataFim}
                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                  />
                </div>
                  <div>
                  <Label htmlFor="hrServico">Hora do Serviço</Label>
                  <Input
                    id="hrServico"
                    type="time"
                    value={formData.hrServico}
                    onChange={(e) => setFormData({ ...formData, hrServico: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tipoCarro">Tipo de Carro *</Label>
                  <Select
                    value={formData.tipoCarro}
                    onValueChange={(value) => setFormData({ ...formData, tipoCarro: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((vehicle: any) => (
                        <SelectItem key={vehicle.id} value={`${vehicle.tipo} - ${vehicle.placa}`}>
                          {vehicle.tipo} - {vehicle.placa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                    <div>
                  <Label htmlFor="tipoCarro">Motorista *</Label>
                  <Select
                    value={formData.motorista}
                    onValueChange={(value) => setFormData({ ...formData, motorista: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Motorista" />
                    </SelectTrigger>
                   <SelectContent>
                        {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.nome}>
                      {driver.nome}
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                </div>




                <div>
                  <Label htmlFor="numeroPassageiros">Número de Passageiros *</Label>
                  <Input
                    id="numeroPassageiros"
                    type="number"
                    min="1"
                    value={formData.numeroPassageiros}
                    onChange={(e) => setFormData({ ...formData, numeroPassageiros: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="valorFinal">Valor Final (R$) *</Label>
                  <Input
                    id="valorFinal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valorFinal}
                    onChange={(e) => setFormData({ ...formData, valorFinal: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status do Serviço</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="faturado">Faturado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
  <Label htmlFor="formadePagamento">Forma de Pagamento</Label>
  <Select
    value={formData.formadePagamento}
    onValueChange={(value) =>
      setFormData({ ...formData, formadePagamento: value })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione a forma de pagamento" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="pago">Pago</SelectItem>
      <SelectItem value="faturado">Faturado</SelectItem>
    </SelectContent>
  </Select>
</div>
                <div>
                  <Label htmlFor="localSaida">Local de Saída</Label>
                  <Input
                    id="localSaida"
                    value={formData.localSaida}
                    onChange={(e) => setFormData({ ...formData, localSaida: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="localDestino">Local de Destino</Label>
                  <Input
                    id="localDestino"
                    value={formData.localDestino}
                    onChange={(e) => setFormData({ ...formData, localDestino: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Input
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais sobre o serviço..."
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex space-x-4">
                  <Button
                    type="submit"
                    disabled={addServiceMutation.isPending || updateServiceMutation.isPending}
                  >
                    {addServiceMutation.isPending || updateServiceMutation.isPending
                      ? 'Salvando...'
                      : editingService
                      ? 'Atualizar Serviço'
                      : 'Registrar Serviço'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Lista de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : services && services.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                 <TableHeader>
  <TableRow>
<TableHead className="w-[80px]">Empresa</TableHead>
<TableHead className="w-[120px]">Período</TableHead>
<TableHead className="w-[80px]">Hora</TableHead>
<TableHead className="min-w-[140px]">Veículo</TableHead>
<TableHead className="min-w-[140px]">Motorista</TableHead>
<TableHead className="w-[80px]">Passageiros</TableHead>
<TableHead className="w-[120px]">Saída</TableHead>
<TableHead className="w-[120px]">Destino</TableHead>
<TableHead className="w-[100px]">Valor</TableHead>
<TableHead className="w-[100px]">Pagamento</TableHead>
<TableHead className="w-[100px]">Status</TableHead>
<TableHead className="w-[50px]">Ações</TableHead>
  </TableRow>
</TableHeader>
                  <TableBody>
                    {services.map((service: any) => (
                     <TableRow key={service.id}>
  <TableCell className="font-medium">{service.nomeEmpresa}</TableCell>
  <TableCell>
    {formatDate(service.dataInicio)}
    {service.dataFim && (
      <span className="text-sm text-gray-500"> até {formatDate(service.dataFim)}</span>
    )}
  </TableCell>
  <TableCell>{service.hrServico || '-'}</TableCell>
  <TableCell>{service.tipoCarro}</TableCell>
  <TableCell>{service.motorista}</TableCell>
  <TableCell>{service.numeroPassageiros}</TableCell>
  <TableCell>{service.localSaida}</TableCell>
  <TableCell>{service.localDestino}</TableCell>
  <TableCell>{formatCurrency(service.valorFinal || 0)}</TableCell>
  <TableCell>{service.formadePagamento || '-'}</TableCell>
  <TableCell>
    <Badge className={getBadgeClass(service.status)}>
      {formatStatus(service.status)}
    </Badge>
  </TableCell>
 <TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-6 w-6 p-0">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => handleEdit(service)}>
    <Edit className="mr-2 h-4 w-4" />
    Editar
  </DropdownMenuItem>

  <DropdownMenuItem onClick={() => handleResumo(service)}>
    <FileText className="mr-2 h-4 w-4" />
    Ordem de Serviço
  </DropdownMenuItem>

  <DropdownMenuItem
    onClick={() => deleteServiceMutation.mutate(service.id)}
    disabled={deleteServiceMutation.isPending}
    className="text-red-600 focus:text-red-600"
  >
    <Trash className="mr-2 h-4 w-4" />
    Excluir
  </DropdownMenuItem>
</DropdownMenuContent>
  </DropdownMenu>
</TableCell>
</TableRow>

                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum serviço registrado ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ServicesManagement;
