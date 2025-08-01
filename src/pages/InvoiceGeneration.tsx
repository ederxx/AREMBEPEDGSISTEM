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
import { format, isWithinInterval, parseISO } from 'date-fns';

// Componente principal para a geração de faturas.
const InvoiceGeneration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bankData, setBankData] = useState({
    banco: '',
    agencia: '',
    conta: '',
    pix: '',
    empresaEmissora: ''
  });

  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  // Redireciona o usuário para a página de autenticação se não estiver logado.
  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // Busca os serviços "faturados" do Firestore.
  const { data: services, isLoading } = useQuery({
    queryKey: ['unbilled-services'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(service => service.formadePagamento === 'faturado');
    },
    enabled: !!user
  });

  // Filtra os serviços com base nos critérios de empresa e datas.
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

  // Alterna a seleção de um serviço individual.
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Seleciona ou deseleciona todos os serviços filtrados.
  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices.map(service => service.id));
    }
  };

  const selectedServicesData = filteredServices.filter(service => selectedServices.includes(service.id));
  const totalValue = selectedServicesData.reduce((sum, s) => sum + (s.valorFinal || 0), 0);

  // Formata um valor numérico para o formato de moeda brasileira.
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Formata uma string de data para o formato "dd/MM/yyyy 'às' HH:mm".
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm");
    } catch {
      return dateString;
    }
  };

  // Mapeamento dos nomes das empresas para a fatura.
  const empresaNomeMap = {
    dg: "D&G Transportes e Turismo",
    arembepe: "Arembepe Transportes e Turismo"
  };

  // Lida com a geração do PDF da fatura.
  const generateInvoice = async () => {
    if (selectedServices.length === 0 || !bankData.empresaEmissora) {
      toast({ title: 'Erro', description: 'Selecione os serviços e a empresa emissora.', variant: 'destructive' });
      return;
    }

    try {
      const empresaNome = empresaNomeMap[bankData.empresaEmissora as keyof typeof empresaNomeMap];
      if (!empresaNome) {
        throw new Error('Empresa emissora selecionada não reconhecida.');
      }

      const doc = new jsPDF();
      const now = new Date();
      const dataFormatada = format(now, "dd/MM/yyyy");

      let yOffset = 20;

      // Adiciona o nome da empresa e a data de emissão
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(empresaNome, doc.internal.pageSize.width - 14, yOffset, { align: 'right' });
      yOffset += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Data de Emissão: ${dataFormatada}`, doc.internal.pageSize.width - 14, yOffset, { align: 'right' });
      yOffset += 10;
      
      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yOffset, doc.internal.pageSize.width - 14, yOffset);
      yOffset += 10;

      // Adiciona os detalhes bancários.
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('Dados Bancários:', 14, yOffset);
      yOffset += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (bankData.banco) doc.text(`Banco: ${bankData.banco}`, 14, yOffset += 5);
      if (bankData.agencia) doc.text(`Agência: ${bankData.agencia}`, 14, yOffset += 5);
      if (bankData.conta) doc.text(`Conta: ${bankData.conta}`, 14, yOffset += 5);
      if (bankData.pix) doc.text(`PIX: ${bankData.pix}`, 14, yOffset += 5);
      yOffset += 10;

      // Adiciona a tabela de serviços incluídos.
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('Serviços Incluídos:', 14, yOffset);
      yOffset += 5; // Espaço antes da tabela

      const tableColumn = ["Empresa", "Serviço", "Data Início", "Data Fim", "Valor"];
      const tableRows = selectedServicesData.map(service => {
        if (!service) return ['', '', '', '', ''];
        return [
          String(service.nomeEmpresa || ''),
          String(service.tipoServico || ''),
          formatDateTime(service.dataInicio),
          formatDateTime(service.dataFim),
          formatCurrency(service.valorFinal || 0),
        ];
      });

      const startX = 14;
      const cellWidths = [35, 35, 45, 45, 20];
      const rowHeight = 6;
      const headerFillColor = [20, 138, 146];
      const headerTextColor = [255, 255, 255];
      const cellFillColor = [255, 255, 255];
      const alternateFillColor = [240, 240, 240];

      // Desenha o cabeçalho da tabela
      doc.setFillColor(headerFillColor[0], headerFillColor[1], headerFillColor[2]);
      doc.rect(startX, yOffset, cellWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2]);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      let currentX = startX;
      tableColumn.forEach((col, index) => {
        doc.text(col, currentX + 2, yOffset + rowHeight / 2 + 1.5);
        currentX += cellWidths[index];
      });
      
      yOffset += rowHeight;

      // Desenha as linhas de dados
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      tableRows.forEach((row, rowIndex) => {
        const fillColor = rowIndex % 2 === 0 ? cellFillColor : alternateFillColor;
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(startX, yOffset, cellWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        
        currentX = startX;
        row.forEach((cell, cellIndex) => {
          doc.text(cell, currentX + 2, yOffset + rowHeight / 2 + 1.5);
          currentX += cellWidths[cellIndex];
        });
        yOffset += rowHeight;
      });

      yOffset += 10; // Espaço antes do total
      // Linha separadora antes do total
      doc.setDrawColor(200, 200, 200);
      doc.line(doc.internal.pageSize.width / 2, yOffset, doc.internal.pageSize.width - 14, yOffset);
      yOffset += 5;

      // Adiciona o total no final
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${formatCurrency(totalValue)}`, doc.internal.pageSize.width - 14, yOffset, { align: 'right' });
      
      doc.save(`fatura-${dataFormatada}.pdf`);
      toast({ title: 'Sucesso', description: 'Fatura gerada com sucesso!' });
    } catch (err: any) {
      console.error("Erro ao gerar fatura:", err);
      toast({ title: 'Erro', description: `Falha ao gerar fatura: ${err.message || 'Erro desconhecido'}`, variant: 'destructive' });
    }
  };

  if (!user) return null;

  const empresasUnicas = Array.from(new Set(services?.map(s => s.nomeEmpresa).filter(Boolean)));
  const selectedEmpresaNome = bankData.empresaEmissora ? empresaNomeMap[bankData.empresaEmissora as keyof typeof empresaNomeMap] : '';
  const headerTitle = selectedEmpresaNome || "Geração de Faturas";

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <h1 className="text-2xl font-bold text-teal-600">{headerTitle}</h1>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="flex items-end sm:col-span-2">
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold">
                <DollarSign className="w-5 h-5 mr-2" />
                Serviços Faturados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {isLoading ? (
                <p className="text-center text-sm py-8">Carregando...</p>
              ) : filteredServices.length ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSelectAll}
                    size="sm"
                    className="mb-2"
                  >
                    {selectedServices.length === filteredServices.length && filteredServices.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                  <div className="overflow-x-auto max-h-[400px]">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">
                            <Checkbox
                              checked={selectedServices.length === filteredServices.length && filteredServices.length > 0}
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
        </div>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Dados Bancários e Emissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {['banco', 'agencia', 'conta', 'pix'].map((field) => (
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
              <div>
                <Label className="text-sm font-medium mb-1 block">Empresa Emissora</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={bankData.empresaEmissora || ''}
                  onChange={e => setBankData({ ...bankData, empresaEmissora: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="arembepe">Arembepe Transportes e Turismo</option>
                  <option value="dg">DG Turismo</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={generateInvoice}
                  className="w-full"
                  disabled={selectedServices.length === 0 || !bankData.empresaEmissora}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Fatura PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InvoiceGeneration;
