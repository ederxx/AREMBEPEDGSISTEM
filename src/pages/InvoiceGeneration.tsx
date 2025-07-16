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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Função para carregar imagem como Base64
const getImageBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Erro no contexto do canvas');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
  });
};

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
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // ✅ Consulta corrigida
  const { data: services, isLoading } = useQuery({
    queryKey: ['unbilled-services'], // Correção aqui
queryFn: async () => {
  const snapshot = await getDocs(collection(db, 'services'));
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() as any }))
    .filter(service => service.status === 'faturados');
},
    enabled: !!user
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

  const selectedServicesData = services?.filter(service => selectedServices.includes(service.id)) || [];
  const totalValue = selectedServicesData.reduce((sum, s) => sum + (s.valorFinal || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const generateInvoice = async () => {
    if (selectedServices.length === 0) {
      toast({ title: 'Erro', description: 'Selecione serviços.', variant: 'destructive' });
      return;
    }

    if (!bankData.banco || !bankData.agencia || !bankData.conta) {
      toast({ title: 'Erro', description: 'Preencha os dados bancários.', variant: 'destructive' });
      return;
    }

    const doc = new jsPDF();

    try {
      const logoBase64 = await getImageBase64('https://i.imgur.com/filHQ4A.jpeg');
      doc.addImage(logoBase64, 'PNG', 14, 10, 50, 20);
    } catch (err) {
      console.warn('Erro ao carregar logo:', err);
    }

    doc.setFontSize(20);
    doc.text("FATURA DE SERVIÇOS", 105, 40, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Banco: ${bankData.banco}`, 14, 55);
    doc.text(`Agência: ${bankData.agencia}`, 14, 62);
    doc.text(`Conta: ${bankData.conta}`, 14, 69);
    if (bankData.pix) doc.text(`PIX: ${bankData.pix}`, 14, 76);

    autoTable(doc, {
      startY: 85,
      head: [["Empresa", "Data", "Valor"]],
      body: selectedServicesData.map(s => [
        s.nomeEmpresa || '—',
        formatDate(s.dataInicio),
        formatCurrency(s.valorFinal || 0)
      ]),
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 11 }
    });

    // Use doc.lastAutoTable.finalY to get the Y position after the table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(14);
    doc.text(`Total: ${formatCurrency(totalValue)}`, 14, finalY + 15);

    doc.save(`fatura-${new Date().toISOString().slice(0,10)}.pdf`);

    toast({ title: 'Sucesso', description: 'Fatura gerada com sucesso!' });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <h1 className="text-2xl font-bold text-teal-600">Geração de Faturas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Lista de Serviços */}
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
              ) : services?.length ? (
                <>
                  <Button variant="outline" onClick={handleSelectAll} className="mb-4">
                    {selectedServices.length === services.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><Checkbox checked={selectedServices.length === services.length} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map(service => (
                        <TableRow key={service.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedServices.includes(service.id)}
                              onCheckedChange={() => handleServiceToggle(service.id)}
                            />
                          </TableCell>
                          <TableCell>{service.nomeEmpresa || '—'}</TableCell>
                          <TableCell>{formatDate(service.dataInicio)}</TableCell>
                          <TableCell>{formatCurrency(service.valorFinal || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-center py-8 text-gray-500">Nenhum serviço pendente de faturamento.</p>
              )}
            </CardContent>
          </Card>

          {/* Dados Bancários */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input id="banco" value={bankData.banco} onChange={e => setBankData({ ...bankData, banco: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input id="agencia" value={bankData.agencia} onChange={e => setBankData({ ...bankData, agencia: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="conta">Conta</Label>
                  <Input id="conta" value={bankData.conta} onChange={e => setBankData({ ...bankData, conta: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pix">PIX (opcional)</Label>
                  <Input id="pix" value={bankData.pix} onChange={e => setBankData({ ...bankData, pix: e.target.value })} />
                </div>
                <Button onClick={generateInvoice} className="w-full" disabled={selectedServices.length === 0}>
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
