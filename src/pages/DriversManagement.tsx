import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Edit, Trash, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, parseISO } from 'date-fns';

interface Driver {
  id?: string;
  nomeCompleto: string;
  telefone: string;
  empresa: string;
  photoURL: string;
  dadosBancarios: string;
  cnHNumber: string;
  cnhValidade: string;
  cursoValidade: string;
}

const DriversManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();

  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState<Omit<Driver, 'id'>>({
    nomeCompleto: '',
    telefone: '',
    empresa: '',
    photoURL: '',
    dadosBancarios: '',
    cnHNumber: '',
    cnhValidade: '',
    cursoValidade: '',
  });

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const { data: drivers, isLoading, error } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'drivers'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Driver[];
    },
  });

  const cnhExpiring =
    drivers?.filter(driver => {
      if (!driver.cnhValidade) return false;
      const validade = parseISO(driver.cnhValidade);
      const diff = differenceInDays(validade, today);
      return diff <= 60;
    }) || [];

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`;
    const photoRef = ref(storage, `drivers/${fileName}`);
    await uploadBytes(photoRef, file);
    return await getDownloadURL(photoRef);
  };

  const addDriverMutation = useMutation({
    mutationFn: async (data: Omit<Driver, 'id'>) => {
      let photoURL = data.photoURL;
      if (photoFile) {
        setUploadingPhoto(true);
        photoURL = await uploadPhoto(photoFile);
        setUploadingPhoto(false);
      }
await addDoc(collection(db, 'drivers'), {
  nomeCompleto: data.nomeCompleto || '',
  telefone: data.telefone || '',
  empresa: data.empresa || '',
  photoURL: photoURL || '',
  dadosBancarios: data.dadosBancarios || '',
  cnHNumber: data.cnHNumber || '',
  cnhValidade: data.cnhValidade || '',
  cursoValidade: data.cursoValidade || '',
  createdAt: new Date().toISOString(),
});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      resetForm();
      setShowForm(false);
      toast({ title: 'Sucesso', description: 'Funcionário cadastrado.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Erro ao cadastrar funcionário.', variant: 'destructive' }),
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<Driver, 'id'> }) => {
      let photoURL = data.photoURL;
      if (photoFile) {
        setUploadingPhoto(true);
        photoURL = await uploadPhoto(photoFile);
        setUploadingPhoto(false);
      }
      await updateDoc(doc(db, 'drivers', id), {
        ...data,
        photoURL,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      resetForm();
      setEditingDriver(null);
      setShowForm(false);
      toast({ title: 'Sucesso', description: 'Funcionário atualizado.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Erro ao atualizar funcionário.', variant: 'destructive' }),
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => await deleteDoc(doc(db, 'drivers', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: 'Sucesso', description: 'Funcionário excluído.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Erro ao excluir funcionário.', variant: 'destructive' }),
  });

  const resetForm = () => {
    setFormData({
      nomeCompleto: '',
      telefone: '',
      empresa: '',
      photoURL: '',
      dadosBancarios: '',
      cnHNumber: '',
      cnhValidade: '',
      cursoValidade: '',
    });
    setPhotoFile(null);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
 setFormData({
    nomeCompleto: driver.nomeCompleto || '',
    telefone: driver.telefone || '',
    empresa: driver.empresa || '',
    photoURL: driver.photoURL || '',
    dadosBancarios: driver.dadosBancarios || '',
    cnHNumber: driver.cnHNumber || '',
    cnhValidade: driver.cnhValidade || '',
    cursoValidade: driver.cursoValidade || '',
  });
    setShowForm(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        return toast({ title: 'Erro', description: 'Arquivo inválido. Apenas imagens até 5MB.', variant: 'destructive' });
      }
      setPhotoFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeCompleto || !formData.telefone || !formData.empresa) {
      return toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
    }
    editingDriver
      ? updateDriverMutation.mutate({ id: editingDriver.id!, data: formData })
      : addDriverMutation.mutate(formData);
  };

  const isSubmitting = addDriverMutation.isPending || updateDriverMutation.isPending || uploadingPhoto;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {showModal && selectedDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl" onClick={() => setShowModal(false)}>
              ✕
            </button>
            <div className="flex items-center space-x-4 mb-4">
              {selectedDriver.photoURL ? (
                <img src={selectedDriver.photoURL} alt={selectedDriver.nomeCompleto} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{selectedDriver.nomeCompleto}</h2>
                <p className="text-gray-600">{selectedDriver.empresa}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <p><strong>Telefone:</strong> {selectedDriver.telefone}</p>
                <a
                  href={`https://wa.me/${selectedDriver.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 font-semibold underline hover:text-green-700"
                >
                  WhatsApp
                </a>
              </div>
              <p><strong>Número da CNH:</strong> {selectedDriver.cnHNumber}</p>
              <p><strong>Validade da CNH:</strong> {selectedDriver.cnhValidade}</p>
              <p><strong>Validade do Curso:</strong> {selectedDriver.cursoValidade}</p>
              <p><strong>Dados Bancários:</strong> {selectedDriver.dadosBancarios}</p>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-teal-600">Gestão de Funcionários</h1>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingDriver ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.nomeCompleto}
                    onChange={e => setFormData({ ...formData, nomeCompleto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input
                    value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Empresa *</Label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 text-sm"
                    value={formData.empresa}
                    onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                    required
                  >
                    <option value="">Selecione a empresa</option>
                    <option value="Arembepe Transportes e Turismo">Arembepe Transportes e Turismo</option>
                    <option value="Dg Turismo e Transportes">Dg Turismo e Transportes</option>
                    <option value="Tercerizado">Tercerizado</option>
                  </select>
                </div>
                <div>
                  <Label>Dados Bancários *</Label>
                  <Input
                    value={formData.dadosBancarios}
                    onChange={e => setFormData({ ...formData, dadosBancarios: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nº CNH *</Label>
                  <Input
                    value={formData.cnHNumber}
                    onChange={e => setFormData({ ...formData, cnHNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Validade CNH *</Label>
                  <Input
                    type="date"
                    value={formData.cnhValidade}
                    onChange={e => setFormData({ ...formData, cnhValidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Validade Curso *</Label>
                  <Input
                    type="date"
                    value={formData.cursoValidade}
                    onChange={e => setFormData({ ...formData, cursoValidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Foto</Label>
                  <Input type="file" accept="image/*" onChange={handlePhotoChange} />
                  {photoFile && <p className="text-sm text-gray-500 mt-1">Selecionado: {photoFile.name}</p>}
                </div>
                <div className="md:col-span-2 flex space-x-4">
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingDriver(null); resetForm(); }}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Funcionários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : error ? (
              <p className="text-red-500">Erro ao carregar os dados.</p>
            ) : drivers?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map(driver => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        {driver.photoURL ? (
                          <img src={driver.photoURL} alt={driver.nomeCompleto} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{driver.nomeCompleto}</TableCell>
                      <TableCell>{driver.telefone}</TableCell>
                      <TableCell>{driver.empresa}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(driver)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteDriverMutation.mutate(driver.id!)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedDriver(driver); setShowModal(true); }}>
                            Ver Detalhes
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-gray-500">Nenhum funcionário cadastrado.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DriversManagement;
