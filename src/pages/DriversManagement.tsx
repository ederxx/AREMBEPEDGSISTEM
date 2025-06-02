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

interface Driver {
  id?: string;
  nomeCompleto: string;
  telefone: string;
  empresa: string;
  photoURL: string;
}

const DriversManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState<Omit<Driver, 'id'>>({
    nomeCompleto: '',
    telefone: '',
    empresa: '',
    photoURL: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: drivers, isLoading, error } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      try {
        console.log("Fetching drivers...");
        const snapshot = await getDocs(collection(db, 'drivers'));
        console.log("Snapshot data:", snapshot.docs.map(doc => doc.data()));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Driver[];
        console.log("Drivers data:", data);
        return data;
      } catch (err: any) {
        console.error("Error fetching drivers:", err);
        toast({
          title: "Erro",
          description: "Erro ao carregar motoristas. Tente novamente.",
          variant: "destructive"
        });
        throw err;
      }
    },
    onError: (err: any) => {
      console.error("Query error:", err);
      toast({
        title: "Erro",
        description: "Erro ao carregar motoristas. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const uploadPhoto = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const photoRef = ref(storage, `drivers/${fileName}`);
    
    await uploadBytes(photoRef, file);
    const downloadURL = await getDownloadURL(photoRef);
    return downloadURL;
  };

  const addDriverMutation = useMutation({
    mutationFn: async (data: Omit<Driver, 'id'>) => {
      let photoURL = '';
      
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          photoURL = await uploadPhoto(photoFile);
        } catch (error) {
          console.error('Erro ao fazer upload da foto:', error);
          throw new Error('Erro ao fazer upload da foto');
        } finally {
          setUploadingPhoto(false);
        }
      }

      await addDoc(collection(db, 'drivers'), {
        ...data,
        photoURL,
        createdAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowForm(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Motorista cadastrado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao cadastrar motorista:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar motorista. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<Driver, 'id'> }) => {
      let photoURL = data.photoURL;
      
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          photoURL = await uploadPhoto(photoFile);
        } catch (error) {
          console.error('Erro ao fazer upload da foto:', error);
          throw new Error('Erro ao fazer upload da foto');
        } finally {
          setUploadingPhoto(false);
        }
      }

      await updateDoc(doc(db, 'drivers', id), {
        ...data,
        photoURL,
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setEditingDriver(null);
      setShowForm(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Motorista atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar motorista:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar motorista. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'drivers', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: "Sucesso",
        description: "Motorista excluído com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir motorista:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir motorista. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      nomeCompleto: '',
      telefone: '',
      empresa: '',
      photoURL: ''
    });
    setPhotoFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeCompleto.trim() || !formData.telefone.trim() || !formData.empresa.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver.id!, data: formData });
    } else {
      addDriverMutation.mutate(formData);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      nomeCompleto: driver.nomeCompleto || '',
      telefone: driver.telefone || '',
      empresa: driver.empresa || '',
      photoURL: driver.photoURL || ''
    });
    setShowForm(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive"
        });
        return;
      }
      
      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setPhotoFile(file);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDriver(null);
    resetForm();
  };

  if (!user) return null;

  const isSubmitting = addDriverMutation.isPending || updateDriverMutation.isPending || uploadingPhoto;

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
              <h1 className="text-2xl font-bold text-teal-primary">Gestão de Motoristas</h1>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Motorista
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingDriver ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="empresa">Empresa *</Label>
                  <Input
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="photo">Foto do Motorista</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  {photoFile && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivo selecionado: {photoFile.name}
                    </p>
                  )}
                  {editingDriver?.photoURL && !photoFile && (
                    <p className="text-sm text-gray-500 mt-1">
                      Foto atual mantida
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 flex space-x-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 
                     editingDriver ? 'Atualizar Motorista' : 'Cadastrar Motorista'}
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
            <CardTitle>Lista de Motoristas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : error ? (
              <p className="text-red-500">Erro ao carregar os dados.</p>
            ) : drivers && drivers.length > 0 ? (
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
                  {drivers.map((driver: Driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        {driver.photoURL ? (
                          <img 
                            src={driver.photoURL} 
                            alt={driver.nomeCompleto}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{driver.nomeCompleto}</TableCell>
                      <TableCell>{driver.telefone}</TableCell>
                      <TableCell>{driver.empresa}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(driver)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => deleteDriverMutation.mutate(driver.id!)}
                            disabled={deleteDriverMutation.isPending}
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
              <p className="text-center py-8 text-gray-500">Nenhum motorista cadastrado.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DriversManagement;