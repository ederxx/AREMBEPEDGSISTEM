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
  proprietario: string;
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
    dataFretamento: '',
    proprietario: ''
  });

  useEffect(() => {
    if (!user) navigate('/auth');
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
      await addDoc(collection(db, 'vehicles'), {
        ...data,
        numeroPassageiros: parseInt(data.numeroPassageiros.toString()),
        createdAt: new Date().toISOString(),
        status: 'ativo'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      resetForm();
      toast({ title: 'Sucesso', description: 'Veículo cadastrado com sucesso.' });
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
      toast({ title: 'Sucesso', description: 'Veículo atualizado com sucesso.' });
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => await deleteDoc(doc(db, 'vehicles', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: 'Sucesso', description: 'Veículo excluído com sucesso.' });
    }
  });

  const resetForm = () => setFormData({
    placa: '', tipo: '', cor: '', numeroPassageiros: 0, renavam: '',
    licencaTurismo: false, licencaFretamento: false, dataVistoria: '',
    dataTurismo: '', dataFretamento: '', proprietario: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placa || !formData.tipo || !formData.cor || !formData.renavam || !formData.proprietario) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    editingVehicle && editingVehicle.id
      ? updateVehicleMutation.mutate({ id: editingVehicle.id, data: formData })
      : addVehicleMutation.mutate(formData);
  };

  const handleEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData(v);
    setShowForm(true);
  };

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30 && diff >= 0;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <h1 className="text-2xl font-bold text-teal-600">Gestão de Frota</h1>
          </div>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Novo Veículo</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader><CardTitle>{editingVehicle ? 'Editar' : 'Cadastrar'} Veículo</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><Label>Placa *</Label><Input value={formData.placa} onChange={e => setFormData({ ...formData, placa: e.target.value })} required /></div>
                <div><Label>Tipo *</Label><Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Tercerizado">Tercerizado</SelectItem>
                <SelectItem value="Sedan">Sedan</SelectItem>
                <SelectItem value="Micro-Onibus">Micro-Onibus</SelectItem>
                <SelectItem value="Ônibus">Ônibus</SelectItem>
                </SelectContent></Select></div>
                <div><Label>Cor *</Label><Input value={formData.cor} onChange={e => setFormData({ ...formData, cor: e.target.value })} required /></div>
                <div><Label>RENAVAM *</Label><Input value={formData.renavam} onChange={e => setFormData({ ...formData, renavam: e.target.value })} required /></div>
                <div><Label>Passageiros *</Label><Input type="number" min={1} value={formData.numeroPassageiros} onChange={e => setFormData({ ...formData, numeroPassageiros: parseInt(e.target.value) })} required /></div>
                <div><Label>Proprietário *</Label><Input value={formData.proprietario} onChange={e => setFormData({ ...formData, proprietario: e.target.value })} required /></div>
                <div><Label>Data Vistoria</Label><Input type="date" value={formData.dataVistoria} onChange={e => setFormData({ ...formData, dataVistoria: e.target.value })} /></div>
                <div><Checkbox checked={formData.licencaTurismo} onCheckedChange={v => setFormData({ ...formData, licencaTurismo: !!v })} /><Label>Licença Turismo</Label></div>
                <div><Label>Exp. Turismo</Label><Input type="date" value={formData.dataTurismo} onChange={e => setFormData({ ...formData, dataTurismo: e.target.value })} /></div>
                <div><Checkbox checked={formData.licencaFretamento} onCheckedChange={v => setFormData({ ...formData, licencaFretamento: !!v })} /><Label>Licença Fretamento</Label></div>
                <div><Label>Exp. Fretamento</Label><Input type="date" value={formData.dataFretamento} onChange={e => setFormData({ ...formData, dataFretamento: e.target.value })} /></div>
                <div className="col-span-full flex gap-4"><Button type="submit">Salvar</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditingVehicle(null); resetForm(); }}>Cancelar</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Veículos Cadastrados</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p>Carregando...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Tipo/Cor</TableHead>
                    <TableHead>Passageiros</TableHead>
                    <TableHead>Proprietário</TableHead>
                    <TableHead>Licenças</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles?.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>{v.placa}</TableCell>
                      <TableCell>{v.tipo} / {v.cor}</TableCell>
                      <TableCell>{v.numeroPassageiros}</TableCell>
                      <TableCell>{v.proprietario}</TableCell>
                      <TableCell>
                        {v.licencaTurismo && <Badge variant="secondary">Turismo</Badge>} {' '}
                        {v.licencaFretamento && <Badge variant="secondary">Fretamento</Badge>}
                      </TableCell>
                      <TableCell className="space-y-1">
                        {isExpiringSoon(v.dataVistoria) && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Vistoria</Badge>}
                        {isExpiringSoon(v.dataTurismo) && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Turismo</Badge>}
                        {isExpiringSoon(v.dataFretamento) && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Fretamento</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(v)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => deleteVehicleMutation.mutate(v.id!)}><Trash className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FleetManagement;
