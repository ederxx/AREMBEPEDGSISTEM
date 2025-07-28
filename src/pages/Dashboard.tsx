import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Users, Car, FileText, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { parseISO } from 'date-fns';
import BackupDownloader from '../pages/BackupDownloader';


interface Quote {
  id: string;
  status?: string;
  [key: string]: unknown;
}

interface Vehicle {
  id: string;
  status?: string;
  placa?: string;
  modelo?: string;
  tipo?: string;
  licencaVencimento?: string;
  dataTurismo?:string;
  dataVistoria?:string;
  dataFretamento?:string;
  [key: string]: unknown;
}

interface Driver {
  id: string;
  nomeCompleto?: string;
  name?: string;
  cnhValidade?: string;
  cursoValidade?: string;
  [key: string]: unknown;
}

interface Service {
  id: string;
  date?: string;
  dataInicio?: string;
  nomeEmpresa?: string;
  tipoCarro?: string;
  localDestino?:string;
  [key: string]: unknown;
}

interface Expense {
  id: string;
  valor: number;
  status: string;
  dataVencimento: string;
  dataPagamento?: string;
  nome?: string;
  [key: string]: unknown;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Queries Firebase
  const { data: quotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: async (): Promise<Quote[]> => {
      const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
    }
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<Vehicle[]> => {
      const snapshot = await getDocs(collection(db, 'vehicles'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    }
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async (): Promise<Driver[]> => {
      const snapshot = await getDocs(collection(db, 'drivers'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
    }
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    }
  });

  // Aqui a correção importante para o status das despesas:
  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async (): Promise<Expense[]> => {
      const snapshot = await getDocs(collection(db, 'expenses'));
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const hoje = new Date();
        const vencimento = parseISO(data.dataVencimento);
        const pagamento = data.dataPagamento ? parseISO(data.dataPagamento) : null;

        let status: 'pendente' | 'pago' | 'vencido' = 'pendente';

        if (pagamento && pagamento <= hoje) {
          status = 'pago';
        } else if (vencimento < hoje && (!pagamento || (pagamento && pagamento > hoje))) {
          status = 'vencido';
        } else {
          status = 'pendente';
        }

        return {
          id: doc.id,
          ...data,
          status,
        } as Expense;
      });
    }
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  // Datas para filtros
  const now = new Date();

  // Serviços de hoje
  const today = now.toISOString().slice(0, 10);
  const todayServices = (services || []).filter(s => {
    const dateStr = s.dataInicio || s.date;
    return typeof dateStr === 'string' && dateStr.slice(0, 10) === today;
  });

  // Serviços próximos 15 dias
  const in15Days = new Date(now);
  in15Days.setDate(now.getDate() + 15);
  const upcomingServices = (services || []).filter(s => {
    const dateStr = s.dataInicio || s.date;
    if (typeof dateStr !== 'string') return false;
    const date = parseISO(dateStr);
    return date > now && date <= in15Days;
  });

  const totalValorFaturado = (services || [])
  .filter(s => s.status === 'faturado')
  .reduce((sum, s) => sum + (Number(s.valorFinal) || 0), 0);

const totalValorFinalizado = (services || [])
  .filter(s => s.status === 'finalizado')
  .reduce((sum, s) => sum + (Number(s.valorFinal) || 0), 0);

  // Veículos com licença de turismo vencendo em até 60 dias
  const in60Days = new Date(now);
  in60Days.setDate(now.getDate() + 60);
  const vehiclesExpiring = (vehicles || []).filter(v => {
    if (!v.dataTurismo || typeof v.dataTurismo !== 'string') return false;
    const licDate = parseISO(v.dataTurismo);
    return licDate > now && licDate <= in60Days;
  });

  // Veículos com licença de turismo vencida
  const vehiclesCNHExpired = (vehicles || []).filter(v => {
    if (!v.dataTurismo) return false;
    const validade = parseISO(v.dataTurismo);
    return validade < now;
  });

  // Veículos com licença de fretamento vencendo em até 60 dias
  const vehiclesfretExpiring = (vehicles || []).filter(v => {
    if (!v.dataFretamento || typeof v.dataFretamento !== 'string') return false;
    const licDate = parseISO(v.dataFretamento);
    return licDate > now && licDate <= in60Days;
  });

  // Veículos com licença de fretamento vencida
  const vehiclesfretCNHExpired = (vehicles || []).filter(v => {
    if (!v.dataFretamento) return false;
    const validade = parseISO(v.dataFretamento);
    return validade < now;
  });

  // Dados despesas
  const pendingQuotes = quotes?.filter(q => q.status === 'pendente') || [];
  const activeVehicles = vehicles?.filter(v => v.status === 'ativo') || [];
  const totalDrivers = drivers || [];
  const pendingExpenses = expenses?.filter(e => e.status === 'pendente') || [];
  const overdueExpenses = expenses?.filter(e => e.status === 'vencido') || [];
 const totalExpensesValue = pendingExpenses.reduce((sum, e) => sum + e.valor, 0) || 0;


  // Motoristas CNH e Curso
  const driversCNHExpiring = (drivers || []).filter(d => {
    if (!d.cnhValidade) return false;
    const validade = parseISO(d.cnhValidade);
    return validade >= now && validade <= in60Days;
  });

  const driversCNHExpired = (drivers || []).filter(d => {
    if (!d.cnhValidade) return false;
    const validade = parseISO(d.cnhValidade);
    return validade < now;
  });

  const driversCursoExpiring = (drivers || []).filter(d => {
    if (!d.cursoValidade) return false;
    const validade = parseISO(d.cursoValidade);
    return validade >= now && validade <= in60Days;
  });

  const driversCursoExpired = (drivers || []).filter(d => {
    if (!d.cursoValidade) return false;
    const validade = parseISO(d.cursoValidade);
    return validade < now;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-teal-primary">Dashboard Administrativo</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Olá, {user.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Orçamentos Pendentes */}

          
          <Card className="cursor-default hover:shadow-lg transition-shadow">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Receita Serviço</CardTitle>
    <DollarSign className="h-4 w-4 text-emerald-600" />
  </CardHeader>
  <CardContent>
    <div className="space-y-1">
      <div className="text-sm text-blue-600">Finalizados:</div>
      <div className="text-xl font-bold text-blue-600">
        R$ {totalValorFinalizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
      <div className="text-sm text-green-600 mt-2">Faturados:</div>
      <div className="text-xl font-bold text-green-600">
        R$ {totalValorFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
    </div>
  </CardContent>
</Card>
         
          {/* Despesas Pendentes */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/expenses')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas </CardTitle>
              <FileText className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingExpenses.length}</div>
            </CardContent>
          </Card>

          {/* Total Despesas */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/expenses')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Pendentes</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {totalExpensesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>


           {/* Despesas Vencidas */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/expenses')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Vencidas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueExpenses.length}</div>
            </CardContent>
          </Card>

          {/* Serviços Hoje */}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/services')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayServices.length}</div>
            </CardContent>
          </Card>

          {/* Veículos Ativos */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/fleet')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veículos Ativos</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeVehicles.length}</div>
            </CardContent>
          </Card>

          {/* Motoristas */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/drivers')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDrivers.length}</div>
            </CardContent>
          </Card>

           <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/quotes')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamentos Pendentes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingQuotes.length}</div>
            </CardContent>
          </Card>



          

         
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" onClick={() => navigate('/quotes')}>
                <FileText className="w-4 h-4 mr-2" />
                Gerenciar Orçamentos
              </Button>
              <Button className="w-full justify-start" onClick={() => navigate('/services')}>
                <Calendar className="w-4 h-4 mr-2" />
                Serviços Realizados
              </Button>
              <Button className="w-full justify-start" onClick={() => navigate('/expenses')}>
                <DollarSign className="w-4 h-4 mr-2" />
                Gerenciar Despesas
              </Button>
              <Button className="w-full justify-start" onClick={() => navigate('/invoices')}>
                <DollarSign className="w-4 h-4 mr-2" />
                Gerar Faturas
              </Button>
            </CardContent>
          </Card>

          {/* Alertas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehiclesExpiring.length === 0 &&
              upcomingServices.length === 0 &&
              overdueExpenses.length === 0 &&
              driversCNHExpiring.length === 0 &&
              driversCNHExpired.length === 0 &&
              driversCursoExpiring.length === 0 &&
              driversCursoExpired.length === 0 ? (
                <p className="text-gray-500">Nenhum alerta no momento.</p>
              ) : (
                <div className="space-y-4">
                  {/* Despesas vencidas */}
                  {overdueExpenses.length > 0 && (
                    <div>
                      <strong className="text-red-600">Despesas vencidas ({overdueExpenses.length}):</strong>
                      <ul className="list-disc ml-5 text-red-600">
                        {overdueExpenses.slice(0, 3).map(expense => (
                          <li key={expense.id}>
                            {expense.nome || 'Despesa'} - R$ {expense.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </li>
                        ))}
                        {overdueExpenses.length > 3 && <li>... e mais {overdueExpenses.length - 3}</li>}
                      </ul>
                    </div>
                  )} {/* Servicos proximos*/}
                  {todayServices.length > 0 && (
                    <div>
                      <strong className="text-yellow-700">Servicos proximos ({todayServices.length}):</strong>
                      <ul className="list-disc ml-5 text-yellow-700">
                        {todayServices.map(s => (
                          <li key={s.id}>
                            {s.dataInicio || s.tipoCarro || 'Veículo'} - Destino: {s.localDestino} 
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Veículos licença turismo vencendo */}
                  {vehiclesExpiring.length > 0 && (
                    <div>
                      <strong className="text-yellow-700">Veículos com licença de Turismo vencendo em até 60 dias ({vehiclesExpiring.length}):</strong>
                      <ul className="list-disc ml-5 text-yellow-700">
                        {vehiclesExpiring.map(v => (
                          <li key={v.id}>
                            {v.modelo || v.tipo || 'Veículo'} - Placa: {v.placa} - Vence em: {new Date(v.dataTurismo!).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Veículos licença turismo expiradas */}
                  {vehiclesCNHExpired.length > 0 && (
                    <div>
                      <strong className="text-red-700">Veículos com licença de Turismo vencidas ({vehiclesCNHExpired.length}):</strong>
                      <ul className="list-disc ml-5 text-red-700">
                        {vehiclesCNHExpired.slice(0, 3).map(v => (
                          <li key={v.id}>
                            {v.modelo  || v.tipo|| 'Veículo'} - Placa: {v.placa} - Vencida em {new Date(v.dataTurismo).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                        {vehiclesCNHExpired.length > 3 && <li>... e mais {vehiclesCNHExpired.length - 3}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Veículos licença fretamento vencendo */}
                  {vehiclesfretExpiring.length > 0 && (
                    <div>
                      <strong className="text-yellow-700">Veículos com licença de Fretamento vencendo em até 60 dias ({vehiclesfretExpiring.length}):</strong>
                      <ul className="list-disc ml-5 text-yellow-700">
                        {vehiclesfretExpiring.map(v => (
                          <li key={v.id}>
                            {v.modelo || v.tipo || 'Veículo'} - Placa: {v.placa} - Vence em: {new Date(v.dataFretamento!).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Veículos licença fretamento expiradas */}
                  {vehiclesfretCNHExpired.length > 0 && (
                    <div>
                      <strong className="text-red-700">Veículos com licença de Fretamento vencidas ({vehiclesfretCNHExpired.length}):</strong>
                      <ul className="list-disc ml-5 text-red-700">
                        {vehiclesfretCNHExpired.slice(0, 3).map(v => (
                          <li key={v.id}>
                            {v.modelo || v.tipo || 'Veículo'} - Placa: {v.placa} - Vencida em {new Date(v.dataFretamento).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                        {vehiclesfretCNHExpired.length > 3 && <li>... e mais {vehiclesfretCNHExpired.length - 3}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Motoristas CNH vencendo */}
                  {driversCNHExpiring.length > 0 && (
                    <div>
                      <strong className="text-yellow-700">Motoristas com CNH vencendo em até 60 dias ({driversCNHExpiring.length}):</strong>
                      <ul className="list-disc ml-5 text-yellow-700">
                        {driversCNHExpiring.map(d => (
                          <li key={d.id}>
                            {d.nomeCompleto || d.name || 'Motorista'} - Vence em: {new Date(d.cnhValidade!).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Motoristas CNH vencidas */}
                  {driversCNHExpired.length > 0 && (
                    <div>
                      <strong className="text-red-700">Motoristas com CNH vencidas ({driversCNHExpired.length}):</strong>
                      <ul className="list-disc ml-5 text-red-700">
                        {driversCNHExpired.slice(0, 3).map(d => (
                          <li key={d.id}>
                            {d.nomeCompleto || d.name || 'Motorista'} - Vencida em {new Date(d.cnhValidade).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                        {driversCNHExpired.length > 3 && <li>... e mais {driversCNHExpired.length - 3}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Motoristas Curso vencendo */}
                  {driversCursoExpiring.length > 0 && (
                    <div>
                      <strong className="text-yellow-700">Motoristas com curso vencendo em até 60 dias ({driversCursoExpiring.length}):</strong>
                      <ul className="list-disc ml-5 text-yellow-700">
                        {driversCursoExpiring.map(d => (
                          <li key={d.id}>
                            {d.nomeCompleto || d.name || 'Motorista'} - Vence em: {new Date(d.cursoValidade!).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Motoristas Curso vencidas */}
                  {driversCursoExpired.length > 0 && (
                    <div>
                      <strong className="text-red-700">Motoristas com curso vencido ({driversCursoExpired.length}):</strong>
                      <ul className="list-disc ml-5 text-red-700">
                        {driversCursoExpired.slice(0, 3).map(d => (
                          <li key={d.id}>
                            {d.nomeCompleto || d.name || 'Motorista'} - Vencido em {new Date(d.cursoValidade).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                        {driversCursoExpired.length > 3 && <li>... e mais {driversCursoExpired.length - 3}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        <BackupDownloader /> 
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
