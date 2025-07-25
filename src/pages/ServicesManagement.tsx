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

type Service = {
  id: string;
  nomeEmpresa?: string;
  dataInicio?: string;
  dataFim?: string;
  hrServico?: string;
  tipoCarro?: string;
  motorista?: string;
  numeroPassageiros?: number;
  localSaida?: string;
  localDestino?: string;
  valorFinal?: number;
  formadePagamento?: string;
  status?: string;
};

const ServicesManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados de formulário, filtros e ordenação
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; nome: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; nome?: string }[]>([]);

  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<'dataInicio' | 'valorFinal' | 'nomeEmpresa'>('dataInicio');
  const [ordemAscendente, setOrdemAscendente] = useState(true);

  // Estado do formData com valores iniciais
  const initialFormData = {
    nomeEmpresa: '',
    dataInicio: '',
    dataFim: '',
    hrServico: '',
    tipoCarro: '',
    motorista: '',
    numeroPassageiros: 1,
    localSaida: '',
    localDestino: '',
    valorFinal: 0,
    formadePagamento: '',
    status: 'pendente',
  };

  const [formData, setFormData] = useState<typeof initialFormData>(initialFormData);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // Buscar motoristas
  useEffect(() => {
    const fetchDrivers = async () => {
      const sn = await getDocs(collection(db, 'drivers'));
      setDrivers(sn.docs.map(d => ({ id: d.id, nome: d.data().nomeCompleto || 'Sem nome' })));
    };
    fetchDrivers();
  }, []);

  // Buscar veículos
  useEffect(() => {
    const fetchVehicles = async () => {
      const sn = await getDocs(collection(db, 'vehicles'));
      setVehicles(sn.docs.map(d => ({ id: d.id, nome: d.data().nome || 'Sem nome' })));
    };
    fetchVehicles();
  }, []);

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () =>
      (await getDocs(collection(db, 'services'))).docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'pendente',
      })) as Service[],
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) =>
      addDoc(collection(db, 'services'), {
        ...data,
        numeroPassageiros: +data.numeroPassageiros,
        valorFinal: +data.valorFinal,
        createdAt: new Date().toISOString(),
      }),
    onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['services'] });      setShowForm(false);
      setFormData(initialFormData);
      toast({ title: "Sucesso", description: "Serviço registrado com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) =>
      updateDoc(doc(db, 'services', id), {
        ...data,
        numeroPassageiros: +data.numeroPassageiros,
        valorFinal: +data.valorFinal,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['services'] });      setShowForm(false);
      setEditingService(null);
      setFormData(initialFormData);
      toast({ title: "Sucesso", description: "Serviço atualizado com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDoc(doc(db, 'services', id)),
    onSuccess: () => {
queryClient.invalidateQueries({ queryKey: ['services'] });      toast({ title: "Sucesso", description: "Serviço excluído com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }),
  });

  const resetForm = () => setFormData(initialFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode colocar validações específicas se quiser
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleEdit = (svc: Service) => {
    setEditingService(svc);
    setFormData({
      nomeEmpresa: svc.nomeEmpresa || '',
      dataInicio: svc.dataInicio || '',
      dataFim: svc.dataFim || '',
      hrServico: svc.hrServico || '',
      tipoCarro: svc.tipoCarro || '',
      motorista: svc.motorista || '',
      numeroPassageiros: svc.numeroPassageiros || 1,
      localSaida: svc.localSaida || '',
      localDestino: svc.localDestino || '',
      valorFinal: svc.valorFinal || 0,
      formadePagamento: svc.formadePagamento || '',
      status: svc.status || 'pendente',
    });
    setShowForm(true);
  };

  const handleResumo = (svc: Service) => {
    // lógica para gerar resumo ou ordem de serviço
    alert(`Resumo do serviço para ${svc.nomeEmpresa}`);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatDate = (ds: string) =>
    ds ? `${ds.split('-')[2]}/${ds.split('-')[1]}/${ds.split('-')[0]}` : '';

  const formatStatus = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : 'Sem status';

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
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
<Button variant="ghost" onClick={() => navigate('/dashboard')}>
  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
</Button>
            </Button>
            <h1 className="text-2xl font-bold text-teal-primary">Serviços Realizados</h1>
          </div>
          <Button onClick={() => { resetForm(); setEditingService(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Registrar Serviço
          </Button>
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
                  <Label htmlFor="nomeEmpresa">Empresa</Label>
                  <Input
                    id="nomeEmpresa"
                    value={formData.nomeEmpresa}
                    onChange={e => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="dataInicio">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={formData.dataInicio}
                    onChange={e => setFormData({ ...formData, dataInicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={formData.dataFim}
                    onChange={e => setFormData({ ...formData, dataFim: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="hrServico">Hora Serviço</Label>
                  <Input
                    id="hrServico"
                    type="time"
                    value={formData.hrServico}
                    onChange={e => setFormData({ ...formData, hrServico: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="tipoCarro">Veículo</Label>
                  <Select
                    value={formData.tipoCarro}
                    onValueChange={v => setFormData({ ...formData, tipoCarro: v })}
                    id="tipoCarro"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.nome || ''}>
                          {vehicle.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="motorista">Motorista</Label>
                  <Select
                    value={formData.motorista}
                    onValueChange={v => setFormData({ ...formData, motorista: v })}
                    id="motorista"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.nome}>
                          {driver.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numeroPassageiros">Número Passageiros</Label>
                  <Input
                    id="numeroPassageiros"
                    type="number"
                    min={1}
                    value={formData.numeroPassageiros}
                    onChange={e => setFormData({ ...formData, numeroPassageiros: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="localSaida">Local Saída</Label>
                  <Input
                    id="localSaida"
                    value={formData.localSaida}
                    onChange={e => setFormData({ ...formData, localSaida: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="localDestino">Local Destino</Label>
                  <Input
                    id="localDestino"
                    value={formData.localDestino}
                    onChange={e => setFormData({ ...formData, localDestino: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="valorFinal">Valor Final</Label>
                  <Input
                    id="valorFinal"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.valorFinal}
                    onChange={e => setFormData({ ...formData, valorFinal: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="formadePagamento">Forma de Pagamento</Label>
                  <Input
                    id="formadePagamento"
                    value={formData.formadePagamento}
                    onChange={e => setFormData({ ...formData, formadePagamento: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={formData.status}
                    onValueChange={v => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex space-x-4 mt-4">
                  <Button
                    type="submit"
                    disabled={addMutation.isLoading || updateMutation.isLoading}
                  >
                    {addMutation.isLoading || updateMutation.isLoading
                      ? 'Salvando...'
                      : editingService
                        ? 'Atualizar Serviço'
                        : 'Registrar Serviço'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                      setEditingService(null);
                    }}
                  >
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
              <Calendar className="w-5 h-5 mr-2" /> Lista de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : services?.length ? (
              <>
                {/* FILTROS & ORDENAÇÃO */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label>Empresa</Label>
                    <Input
                      placeholder="Filtrar por empresa"
                      value={filtroEmpresa}
                      onChange={e => setFiltroEmpresa(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={e => setFiltroDataInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={e => setFiltroDataFim(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Ordenar por</Label>
                    <Select value={ordenarPor} onValueChange={v => setOrdenarPor(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dataInicio">Data</SelectItem>
                        <SelectItem value="valorFinal">Valor</SelectItem>
                        <SelectItem value="nomeEmpresa">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => setOrdemAscendente(!ordemAscendente)}
                    >
                      {ordemAscendente ? 'Ascendente' : 'Descendente'}
                    </Button>
                  </div>
                </div>

                {/* TABELA DE SERVIÇOS */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Passageiros</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services
                        .filter(svc =>
                          (filtroEmpresa
                            ? svc.nomeEmpresa?.toLowerCase().includes(filtroEmpresa.toLowerCase())
                            : true) &&
                          (filtroDataInicio ? svc.dataInicio >= filtroDataInicio : true) &&
                          (filtroDataFim ? svc.dataFim <= filtroDataFim : true)
                        )
                        .sort((a, b) => {
                          const aVal = a[ordenarPor] || '';
                          const bVal = b[ordenarPor] || '';
                          if (aVal < bVal) return ordemAscendente ? -1 : 1;
                          if (aVal > bVal) return ordemAscendente ? 1 : -1;
                          return 0;
                        })
                        .map(svc => (
                          <TableRow key={svc.id}>
                            <TableCell>{svc.nomeEmpresa}</TableCell>
                            <TableCell>
                              {formatDate(svc.dataInicio || '')}
                              {svc.dataFim && svc.dataFim !== svc.dataInicio ? ` a ${formatDate(svc.dataFim)}` : ''}
                            </TableCell>
                            <TableCell>{svc.hrServico}</TableCell>
                            <TableCell>{svc.tipoCarro}</TableCell>
                            <TableCell>{svc.motorista}</TableCell>
                            <TableCell>{svc.numeroPassageiros}</TableCell>
                            <TableCell>{svc.localSaida}</TableCell>
                            <TableCell>{svc.localDestino}</TableCell>
                            <TableCell>{formatCurrency(svc.valorFinal || 0)}</TableCell>
                            <TableCell>
                              <Badge className={getBadgeClass(svc.status || '')}>
                                {formatStatus(svc.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Ações">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleEdit(svc)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteMutation.mutate(svc.id)}>
                                    <Trash className="mr-2 h-4 w-4" /> Excluir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleResumo(svc)}>
                                    <FileText className="mr-2 h-4 w-4" /> Resumo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p>Nenhum serviço registrado.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ServicesManagement;
