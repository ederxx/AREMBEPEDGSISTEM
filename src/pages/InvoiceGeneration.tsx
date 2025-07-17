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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, isWithinInterval, parseISO } from 'date-fns';

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

  // Estados para filtros
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const { data: services, isLoading } = useQuery({
    queryKey: ['unbilled-services'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(service => service.status === 'faturado');
    },
    enabled: !!user
  });

  // Filtrar serviços conforme empresa e datas
  const filteredServices = services?.filter(service => {
    const empresaMatch = filterEmpresa ? service.nomeEmpresa === filterEmpresa : true;

    let dataMatch = true;
    if (filterDataInicio && filterDataFim && service.dataInicio) {
      const dataServico = parseISO(service.dataInicio);
      const inicio = parseISO(filterDataInicio);
      const fim = parseISO(filterDataFim);
      dataMatch = isWithinInterval(dataServico, { start: inicio, end: fim });
    }

    return empresaMatch && dataMatch;
  }) || [];

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices.map(service => service.id));
    }
  };

  const selectedServicesData = filteredServices.filter(service => selectedServices.includes(service.id));
  const totalValue = selectedServicesData.reduce((sum, s) => sum + (s.valorFinal || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm");
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

    doc.setFontSize(20);
    doc.text("FATURA DE SERVIÇOS", 14, 20);

    doc.setFontSize(12);
    doc.text(`Empresa: ${filterEmpresa || 'Todas'}`, 14, 30);
    if (filterDataInicio && filterDataFim) {
      doc.text(`Período: ${format(parseISO(filterDataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filterDataFim), 'dd/MM/yyyy')}`, 14, 37);
    }

    doc.text(`Banco: ${bankData.banco}`, 14, 47);
    doc.text(`Agência: ${bankData.agencia}`, 14, 54);
    doc.text(`Conta: ${bankData.conta}`, 14, 61);
    if (bankData.pix) doc.text(`PIX: ${bankData.pix}`, 14, 68);

    autoTable(doc, {
      startY: 80,
      head: [["Data / Horário", "Serviço", "Motorista", "Carro", "Valor"]],
      body: selectedServicesData.map(s => [
        formatDateTime(s.dataInicio),
        s.nomeServico || '—',
        s.motorista || '—',
        s.carro || '—',
        formatCurrency(s.valorFinal || 0)
      ]),
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 11 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(14);
    doc.text(`Total: ${formatCurrency(totalValue)}`, 14, finalY + 15);

    doc.save(`fatura-${new Date().toISOString().slice(0,10)}.pdf`);

    toast({ title: 'Sucesso', description: 'Fatura gerada com sucesso!' });
  };

  if (!user) return null;

  // Obter lista única de empresas para filtro
  const empresasUnicas = Array.from(new Set(services?.map(s => s.nomeEmpresa).filter(Boolean)));

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
<main className="container mx-auto px-4 py-6 max-w-7xl">
  <div className="grid lg:grid-cols-3 gap-6">
    
    {/* FILTROS */}
    <Card className="max-w-md mx-auto lg:mx-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1 block">Empresa</Label>
            <select
              value={filterEmpresa}
              onChange={e => setFilterEmpresa(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">Todas</option>
              {empresasUnicas.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Data Início</Label>
            <Input
              type="date"
              value={filterDataInicio}
              onChange={e => setFilterDataInicio(e.target.value)}
              className="text-sm py-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Data Fim</Label>
            <Input
              type="date"
              value={filterDataFim}
              onChange={e => setFilterDataFim(e.target.value)}
              className="text-sm py-1"
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => setSelectedServices([])}
              size="sm"
              variant="outline"
              className="w-full"
            >
              Limpar Seleção
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Lista de Serviços */}
    <Card className="max-w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <DollarSign className="w-5 h-5 mr-2" />
          Serviços Faturados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {isLoading ? (
          <p className="text-center text-sm">Carregando...</p>
        ) : filteredServices.length ? (
          <>
            <Button 
              variant="outline" 
              onClick={handleSelectAll} 
              size="sm" 
              className="mb-2"
            >
              {selectedServices.length === filteredServices.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
            <div className="overflow-x-auto max-h-[400px]">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={selectedServices.length === filteredServices.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map(service => (
                    <TableRow key={service.id} className="hover:bg-gray-100">
                      <TableCell className="w-8">
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                        />
                      </TableCell>
                      <TableCell>{service.nomeEmpresa || '—'}</TableCell>
                      <TableCell>{formatDateTime(service.dataInicio)}</TableCell>
                      <TableCell>{formatCurrency(service.valorFinal || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-center py-8 text-gray-500 text-sm">Nenhum serviço faturado no período selecionado.</p>
        )}
      </CardContent>
    </Card>

    {/* Dados Bancários */}
    <Card className="max-w-md mx-auto lg:mx-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Dados Bancários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {['banco', 'agencia', 'conta', 'pix'].map((field, i) => (
            <div key={field}>
              <Label htmlFor={field} className="text-sm font-medium mb-1 block">
                {field === 'pix' ? 'PIX (opcional)' : field.charAt(0).toUpperCase() + field.slice(1)}
              </Label>
              <Input
                id={field}
                value={(bankData as any)[field]}
                onChange={e => setBankData({ ...bankData, [field]: e.target.value })}
                className="text-sm py-1"
              />
            </div>
          ))}
          <Button
            onClick={generateInvoice}
            className="w-full"
            disabled={selectedServices.length === 0}
            size="sm"
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
