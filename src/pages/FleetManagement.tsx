import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id?: string;
  placa: string;
  tipo: string;
  cor: string;
  numeroPassageiros: number;
  renavam: string;
  licencaTurismo: boolean;
  licencaFretamento: boolean;
  dataVistoria: string;
  dataTurismo: string;
  dataFretamento: string;
}

const FleetManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Vehicle>({
    placa: '',
    tipo: '',
    cor: '',
    numeroPassageiros: 0,
    renavam: '',
    licencaTurismo: false,
    licencaFretamento: false,
    dataVistoria: '',
    dataTurismo: '',
    dataFretamento: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'vehicles'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Vehicle[];
    }
  });

  const addVehicleMutation = useMutation({
    mutationFn: async (data: Vehicle) => {
      const vehicleData = {
        ...data,
        numeroPassageiros: parseInt(data.numeroPassageiros.toString()),
        createdAt: new Date().toISOString(),
        status: 'ativo'
      };
      await addDoc(collection(db, 'vehicles'), vehicleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Veículo cadastrado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar veículo:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar veículo. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Vehicle }) => {
      await updateDoc(doc(db, 'vehicles', id), {
        ...data,
        numeroPassageiros: parseInt(data.numeroPassageiros.toString()),
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setEditingVehicle(null);
      setShowForm(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Veículo atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar veículo:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar veículo. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'vehicles', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: "Sucesso",
        description: "Veículo excluído com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir veículo:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir veículo. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      placa: '',
      tipo: '',
      cor: '',
      numeroPassageiros: 0,
      renavam: '',
      licencaTurismo: false,
      licencaFretamento: false,
      dataVistoria: '',
      dataTurismo: '',
      dataFretamento: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.placa.trim() || !formData.tipo || !formData.cor.trim() || 
        !formData.numeroPassageiros || !formData.renavam.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (editingVehicle) {
      if (editingVehicle.id) {
        updateVehicleMutation.mutate({ id: editingVehicle.id, data: formData });
      } else {
        console.error("Vehicle ID is missing for editing.");
        toast({
          title: "Erro",
          description: "ID do veículo faltando. Não é possível atualizar.",
          variant: "destructive"
        });
      }
    } else {
      addVehicleMutation.mutate(formData);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      placa: vehicle.placa || '',
      tipo: vehicle.tipo || '',
      cor: vehicle.cor || '',
      numeroPassageiros: vehicle.numeroPassageiros || 0,
      renavam: vehicle.renavam || '',
      licencaTurismo: vehicle.licencaTurismo || false,
      licencaFretamento: vehicle.licencaFretamento || false,
      dataVistoria: vehicle.dataVistoria || '',
      dataTurismo: vehicle.dataTurismo || '',
      dataFretamento: vehicle.dataFretamento || ''
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVehicle(null);
    resetForm();
  };

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
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
              <h1 className="text-2xl font-bold text-teal-primary">Gestão da Frota</h1>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Veículo
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingVehicle ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="placa">Placa *</Label>
                  <Input
                    id="placa"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC-1234"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de Veículo *</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sedan">Sedan</SelectItem>
                      <SelectItem value="Van">Van</SelectItem>
                      <SelectItem value="Micro-ônibus">Micro-ônibus</SelectItem>
                      <SelectItem value="Ônibus">Ônibus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cor">Cor *</Label>
                  <Input
                    id="cor"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numeroPassageiros">Número de Passageiros *</Label>
                  <Input
                    id="numeroPassageiros"
                    type="number"
                    min="1"
                    value={formData.numeroPassageiros.toString()}
                    onChange={(e) => setFormData({ ...formData, numeroPassageiros: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="renavam">RENAVAM *</Label>
                  <Input
                    id="renavam"
                    value={formData.renavam}
                    onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataVistoria">Data Vistoria</Label>
                  <Input
                    id="dataVistoria"
                    type="date"
                    value={formData.dataVistoria}
                    onChange={(e) => setFormData({ ...formData, dataVistoria: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="licencaTurismo"
                    checked={formData.licencaTurismo}
                    onCheckedChange={(checked) => setFormData({ ...formData, licencaTurismo: !!checked })}
                  />
                  <Label htmlFor="licencaTurismo">Licença de Turismo</Label>
                </div>
                <div>
                  <Label htmlFor="dataTurismo">Data Expiração Turismo</Label>
                  <Input
                    id="dataTurismo"
                    type="date"
                    value={formData.dataTurismo}
                    onChange={(e) => setFormData({ ...formData, dataTurismo: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="licencaFretamento"
                    checked={formData.licencaFretamento}
                    onCheckedChange={(checked) => setFormData({ ...formData, licencaFretamento: !!checked })}
                  />
                  <Label htmlFor="licencaFretamento">Licença de Fretamento</Label>
                </div>
                <div>
                  <Label htmlFor="dataFretamento">Data Expiração Fretamento</Label>
                  <Input
                    id="dataFretamento"
                    type="date"
                    value={formData.dataFretamento}
                    onChange={(e) => setFormData({ ...formData, dataFretamento: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex space-x-4">
                  <Button 
                    type="submit" 
                    disabled={addVehicleMutation.isPending || updateVehicleMutation.isPending}
                  >
                    {addVehicleMutation.isPending || updateVehicleMutation.isPending ? 'Salvando...' : 
                     editingVehicle ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
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
            <CardTitle>Lista de Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : vehicles && vehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Tipo/Cor</TableHead>
                    <TableHead>Passageiros</TableHead>
                    <TableHead>Licenças</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle: Vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono">{vehicle.placa}</TableCell>
                      <TableCell>
                        <div>
                          <p>{vehicle.tipo}</p>
                          <p className="text-sm text-gray-500">{vehicle.cor}</p>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.numeroPassageiros}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {vehicle.licencaTurismo && <Badge variant="secondary">Turismo</Badge>}
                          {vehicle.licencaFretamento && <Badge variant="secondary">Fretamento</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {isExpiringSoon(vehicle.dataVistoria) && (
                            <Badge variant="destructive" className="flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Vistoria
                            </Badge>
                          )}
                          {isExpiringSoon(vehicle.dataTurismo) && (
                            <Badge variant="destructive" className="flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Turismo
                            </Badge>
                          )}
                          {isExpiringSoon(vehicle.dataFretamento) && (
                            <Badge variant="destructive" className="flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Fretamento
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(vehicle)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => deleteVehicleMutation.mutate(vehicle.id!)}
                            disabled={deleteVehicleMutation.isPending}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-gray-500">Nenhum veículo cadastrado.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FleetManagement;