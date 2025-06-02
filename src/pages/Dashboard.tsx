import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Users, Car, FileText, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Quote {
  id: string;
  status?: string;
  [key: string]: unknown;
}

interface Vehicle {
  id: string;
  status?: string;
  [key: string]: unknown;
}

interface Driver {
  id: string;
  [key: string]: unknown;
}

interface Service {
  id: string;
  date?: string;
  [key: string]:unknown;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Orçamentos
  const { data: quotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: async (): Promise<Quote[]> => {
      const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
    }
  });

  // Veículos
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<Vehicle[]> => {
      const snapshot = await getDocs(collection(db, 'vehicles'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    }
  });

  // Motoristas
  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async (): Promise<Driver[]> => {
      const snapshot = await getDocs(collection(db, 'drivers'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
    }
  });

  // Serviços (todos)
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    }
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  // Serviços de hoje
  const today = new Date().toISOString().split('T')[0];
  const todayServices = (services || []).filter(s => {
    const date = s.dataInicio || s.date;
    return typeof date === 'string' && date.slice(0, 10) === today;
  });

  // Serviços próximos 15 dias
  const now = new Date();
  const in15Days = new Date();
  in15Days.setDate(now.getDate() + 15);
  const upcomingServices = (services || []).filter(s => {
    const dateStr = s.dataInicio || s.date;
    if (typeof dateStr !== 'string') return false;
    const date = new Date(dateStr);
    return date > now && date <= in15Days;
  });

  // Veículos com licença vencendo em até 60 dias
  const vehiclesExpiring = (vehicles || []).filter(v => {
    if (!v.licencaVencimento) return false;
    const licDate = new Date(v.licencaVencimento as string);
    const diff = (licDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 60;
  });

  // Outros dados
  const pendingQuotes = quotes?.filter(q => q.status === 'pendente') || [];
  const activeVehicles = vehicles?.filter(v => v.status === 'ativo') || [];
  const totalDrivers = drivers || [];

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
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/quotes')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamentos Pendentes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingQuotes.length}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/services')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayServices.length}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/fleet')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veículos Ativos</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeVehicles.length}</div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/drivers')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Motoristas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDrivers.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
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
              <Button className="w-full justify-start" onClick={() => navigate('/invoices')}>
                <DollarSign className="w-4 h-4 mr-2" />
                Gerar Faturas
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehiclesExpiring.length === 0 && upcomingServices.length === 0 ? (
                <p className="text-gray-500">Nenhum alerta no momento.</p>
              ) : (
                <div className="space-y-2">
                  {vehiclesExpiring.length > 0 && (
                    <div>
                      <strong>Veículos com licença vencendo em até 60 dias:</strong>
                      <ul className="list-disc ml-5">
                        {vehiclesExpiring.map(v => (
                          <li key={v.id}>
                            {v.modelo || v.tipo || 'Veículo'} - Placa: {v.placa} - Vence em: {new Date(String(v.licencaVencimento)).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {upcomingServices.length > 0 && (
                    <div>
                      <strong>Serviços nos próximos 15 dias:</strong>
                      <ul className="list-disc ml-5">
                        {upcomingServices.map(s => (
                          <li key={s.id}>
                            {s.nomeEmpresa || s.tipoCarro || 'Serviço'} - Data: {new Date(s.dataInicio || s.date).toLocaleDateString('pt-BR')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
