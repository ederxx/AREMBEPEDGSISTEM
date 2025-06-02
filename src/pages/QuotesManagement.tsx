import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle, Edit, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, updateDoc, doc, orderBy, query, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

const QuotesManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateDoc(doc(db, 'quotes', id), {
        status,
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: "Sucesso",
        description: "Status do orçamento atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Função para transformar orçamento em serviço
  const handleConvertToService = async (quote: any) => {
    try {
      // Monte os dados do serviço a partir do orçamento
      const serviceData = {
        nomeEmpresa: quote.empresa || quote.nomeCompleto || '',
        dataInicio: quote.dataServico || quote.data || '',
        dataFim: '', // ou algum campo do orçamento se existir
        tipoCarro: quote.tipoServico || quote.servico || '',
        numeroPassageiros: quote.numeroPassageiros || quote.passageiros || 0,
        localSaida: quote.localOrigem || quote.origem || '',
        localDestino: quote.localDestino || quote.destino || '',
        valorFinal: 0, // Defina conforme necessário
        faturado: false,
        observacoes: quote.observacoes || '',
        criadoPorOrcamento: quote.id,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'services'), serviceData);

      toast({
        title: "Sucesso",
        description: "Orçamento convertido em serviço!",
      });

      // (Opcional) Atualize o status do orçamento
      await updateDoc(doc(db, 'quotes', quote.id), { status: 'convertido' });

      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível converter o orçamento.",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = (quoteId: string, newStatus: string) => {
    updateQuoteStatusMutation.mutate({ id: quoteId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'confirmado':
        return <Badge className="bg-green-500 hover:bg-green-600">Confirmado</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não informada';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Horário não informado';
    return timeString;
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
              <h1 className="text-2xl font-bold text-teal-primary">Gestão de Orçamentos</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Lista de Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando...</p>
            ) : quotes && quotes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Data/Horário</TableHead>
                      <TableHead>Passageiros</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote: any) => (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{quote.nomeCompleto || 'Nome não informado'}</p>
                            <p className="text-sm text-gray-500">{quote.empresa || 'Empresa não informada'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{quote.telefone || 'Telefone não informado'}</p>
                            <p className="text-sm text-gray-500">{quote.email || 'Email não informado'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{quote.tipoServico || 'Tipo não informado'}</p>
                            <div className="text-sm text-gray-500">
                              <p>De: {quote.localOrigem || 'Origem não informada'}</p>
                              <p>Para: {quote.localDestino || 'Destino não informado'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{formatDate(quote.dataServico)}</p>
                            <p className="text-sm text-gray-500">{formatTime(quote.horarioServico)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{quote.numeroPassageiros || 'Não informado'}</TableCell>
                        <TableCell>{getStatusBadge(quote.status || 'pendente')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Select
                              value={quote.status || 'pendente'}
                              onValueChange={(value) => handleStatusChange(quote.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="confirmado">Confirmar</SelectItem>
                                <SelectItem value="cancelado">Cancelar</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleConvertToService(quote)}
                            >
                              Enviar para Serviços
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum orçamento recebido ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default QuotesManagement;
