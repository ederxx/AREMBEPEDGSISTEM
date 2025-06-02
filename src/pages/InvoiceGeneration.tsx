
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, DollarSign, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

const InvoiceGeneration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bankData, setBankData] = useState({
    banco: '',
    agencia: '',
    conta: '',
    pix: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: services, isLoading } = useQuery({
    queryKey: ['unfaturated-services'],
    queryFn: async () => {
      const q = query(collection(db, 'services'), where('faturado', '==', false));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as { valorFinal?: number } }));
    }
  });

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedServices.length === services?.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(services?.map(service => service.id) || []);
    }
  };

  const generateInvoice = () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um serviço para gerar a fatura.",
        variant: "destructive"
      });
      return;
    }

    if (!bankData.banco || !bankData.agencia || !bankData.conta) {
      toast({
        title: "Erro",
        description: "Preencha os dados bancários para gerar a fatura.",
        variant: "destructive"
      });
      return;
    }

    // Aqui seria implementada a geração do PDF
    toast({
      title: "Sucesso",
      description: "Fatura gerada com sucesso! (Funcionalidade de PDF será implementada)",
    });
  };

  const selectedServicesData = services?.filter(service => selectedServices.includes(service.id)) || [];
  const totalValue = selectedServicesData.reduce((sum, service) => sum + (service.valorFinal || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
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
              <h1 className="text-2xl font-bold text-teal-primary">Geração de Faturas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Serviços Não Faturados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : services && services.length > 0 ? (
                <>
                  <div className="mb-4">
                    <Button 
                      variant="outline" 
                      onClick={handleSelectAll}
                      className="mb-4"
                    >
                      {selectedServices.length === services.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedServices.length === services.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.map((service: { 
                          id: string; 
                          nomeEmpresa: string; 
                          dataInicio: string; 
                          valorFinal?: number; 
                        }) => (
                          <TableRow key={service.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={() => handleServiceToggle(service.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{service.nomeEmpresa}</TableCell>
                            <TableCell>{formatDate(service.dataInicio)}</TableCell>
                            <TableCell>{formatCurrency(service.valorFinal || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium">
                        Total selecionado: {formatCurrency(totalValue)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedServices.length} serviço(s) selecionado(s)
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center py-8 text-gray-500">
                  Todos os serviços já foram faturados.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    value={bankData.banco}
                    onChange={(e) => setBankData({ ...bankData, banco: e.target.value })}
                    placeholder="Nome do banco"
                  />
                </div>
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={bankData.agencia}
                    onChange={(e) => setBankData({ ...bankData, agencia: e.target.value })}
                    placeholder="Número da agência"
                  />
                </div>
                <div>
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    value={bankData.conta}
                    onChange={(e) => setBankData({ ...bankData, conta: e.target.value })}
                    placeholder="Número da conta"
                  />
                </div>
                <div>
                  <Label htmlFor="pix">PIX (opcional)</Label>
                  <Input
                    id="pix"
                    value={bankData.pix}
                    onChange={(e) => setBankData({ ...bankData, pix: e.target.value })}
                    placeholder="Chave PIX"
                  />
                </div>
                <Button 
                  onClick={generateInvoice}
                  className="w-full"
                  disabled={selectedServices.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Fatura PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InvoiceGeneration;
