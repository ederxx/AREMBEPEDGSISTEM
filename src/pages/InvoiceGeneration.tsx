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
import logoAre from '../imagens/are.jpg';
import logoDg from '../imagens/dg.jpg';

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

      // Adiciona a logo no topo
      const logoMap: Record<string, string> = {
        arembepe: logoAre,
        dg: logoDg,
      };
      const logoSrc = logoMap[bankData.empresaEmissora] || logoAre; // fallback para are

      const img = new window.Image();
      img.src = logoSrc;
      img.onload = function () {
        const logoWidth = 40;
        const logoHeight = 24;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const yHeader = 14;

        // Logo à esquerda
        doc.addImage(img, 'JPEG', margin, yHeader, logoWidth, logoHeight);

        // Nome da empresa emissora logo abaixo da logo, à esquerda
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(empresaNome, margin, yHeader + logoHeight + 8); // 8px abaixo da logo

        // Data de emissão à direita
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Data de Emissão: ${dataFormatada}`, pageWidth - margin, yHeader + 6, { align: 'right' });

        // Próxima linha após o cabeçalho
        let yOffset = yHeader + logoHeight + 22; // espaço após logo e nome emissora

        // Empresa faturada e referência de datas
        // Extrai o nome da empresa faturada dos serviços selecionados
        const empresaFaturada = selectedServicesData.length > 0 ? selectedServicesData[0].nomeEmpresa : '';
        // Monta referência de datas, se houver filtro
        const referencia = (filterDataInicio && filterDataFim)
          ? `Referência: ${format(parseISO(filterDataInicio), "dd/MM/yyyy")} a ${format(parseISO(filterDataFim), "dd/MM/yyyy")}`
          : '';

        if (empresaFaturada) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`Empresa Faturada: ${empresaFaturada}`, margin, yOffset);
          yOffset += 9;
        }
        if (referencia) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(referencia, margin, yOffset);
          yOffset += 9;
        }

        // Linha separadora
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, yOffset, pageWidth - margin, yOffset);
        yOffset += 12;


        // Tabela de serviços incluídos
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Serviços Incluídos:', margin, yOffset);
        yOffset += 10;

        // Cabeçalho da tabela
        const tableColumn = ["Data", "Hora", "Serviço", "Motorista", "Veículo", "Valor"];
        const cellWidths = [22, 15, 38, 35, 35, 22];
        const rowHeight = 7;
        const headerFillColor: [number, number, number] = [20, 138, 146];
        const headerTextColor: [number, number, number] = [255, 255, 255];
        const cellFillColor: [number, number, number] = [255, 255, 255];
        const alternateFillColor: [number, number, number] = [240, 240, 240];

        doc.setFillColor(...headerFillColor);
        doc.rect(margin, yOffset, cellWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        doc.setTextColor(...headerTextColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        let currentX = margin;
        tableColumn.forEach((col, index) => {
          doc.text(col, currentX + 2, yOffset + rowHeight / 2 + 2);
          currentX += cellWidths[index];
        });
        yOffset += rowHeight;

        // Linhas da tabela
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const tableRows = selectedServicesData.map(service => {
          const dataObj = service.dataInicio ? new Date(service.dataInicio) : null;
          return [
            dataObj ? format(dataObj, "dd/MM/yyyy") : '',
            dataObj ? format(dataObj, "HH:mm") : '',
            service.localSaida? String(service.localSaida) : '—',
            service.motorista ? String(service.motorista) : '—',
            service.tipoCarro ? String(service.tipoCarro) : '—',
            formatCurrency(service.valorFinal || 0),
          ];
        });
        tableRows.forEach((row, rowIndex) => {
          const fillColor = rowIndex % 2 === 0 ? cellFillColor : alternateFillColor;
          doc.setFillColor(...fillColor);
          doc.rect(margin, yOffset, cellWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
          currentX = margin;
          row.forEach((cell, cellIndex) => {
            doc.text(cell, currentX + 2, yOffset + rowHeight / 2 + 2);
            currentX += cellWidths[cellIndex];
          });
          yOffset += rowHeight;
        });

        // Espaço extra após a tabela
        yOffset += 24;

        // Linha separadora antes do total
        doc.setDrawColor(180, 180, 180);
        doc.line(pageWidth / 2, yOffset, pageWidth - margin, yOffset);
        yOffset += 12;

        // Total
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Total: ${formatCurrency(totalValue)}`, pageWidth - margin, yOffset, { align: 'right' });

        // Espaço antes dos dados bancários
        yOffset += 18;

        // Dados Bancários (agora abaixo do total)
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Dados Bancários:', margin, yOffset);
        yOffset += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        if (bankData.banco) doc.text(`Banco: ${bankData.banco}`, margin, yOffset += 8);
        if (bankData.agencia) doc.text(`Agência: ${bankData.agencia}`, margin, yOffset += 8);
        if (bankData.conta) doc.text(`Conta: ${bankData.conta}`, margin, yOffset += 8);
        if (bankData.pix) doc.text(`PIX: ${bankData.pix}`, margin, yOffset += 8);
        yOffset += 12;

        // Espaço antes da assinatura
        yOffset += 10;

        // Assinatura personalizada
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text('Atenciosamente', margin, yOffset);
        yOffset += 12;
        doc.setFont("helvetica", "bold");
        doc.text('Egildo Anunciação da Cruz', margin, yOffset);
        yOffset += 10;
        doc.setFont("helvetica", "normal");
        doc.text('Sócio gerente.', margin, yOffset);

        doc.save(`fatura-${dataFormatada}.pdf`);
        toast({ title: 'Sucesso', description: 'Fatura gerada com sucesso!' });
      };
      img.onerror = function () {
        toast({ title: 'Erro', description: 'Erro ao carregar a logo.', variant: 'destructive' });
      };
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
