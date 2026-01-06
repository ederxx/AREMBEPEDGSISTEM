
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from '@/hooks/use-toast';

import ExpenseSummary from '@/components/expenses/ExpenseSummary';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpensesList from '@/components/ExpensesList';
import ExpenseCharts from '@/components/ExpenseCharts';
import ExpenseReports from '@/components/expenses/ExpenseReports';
import { Expense } from '@/types/expense';
import { useYear } from '@/contexts/YearContext';
import { getYearCollection } from '../ultils/getYearCollection';

const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { year } = useYear();

  const [vehiclePlates, setVehiclePlates] = useState<string[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      console.log('Usuário autenticado:', user.uid);
      console.log('Email do usuário:', user.email);
    }
  }, [user, navigate]);
//buscar funcionario 


  // Buscar placas dos veículos
  useQuery({
    queryKey: ['vehicle-plates'],
    queryFn: async () => {
      if (!user) {
        console.log('Usuário não autenticado - não buscando placas');
        return [];
      }
      
      try {
        console.log('Buscando placas de veículos...');
        const vehiclesRef = collection(db, 'vehicles');
        console.log('Referência vehicles:', vehiclesRef);
        
        const snapshot = await getDocs(vehiclesRef);
        console.log('Snapshot vehicles recebido:', snapshot.size, 'documentos');
        
        const plates = snapshot.docs.map(doc => {
          console.log('Documento vehicle:', doc.id, doc.data());
          return doc.data().placa;
        }).filter(Boolean);
        
        console.log('Placas encontradas:', plates);
        setVehiclePlates(plates);
        return plates;
      } catch (error) {
        console.error('Erro detalhado ao buscar placas:', error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        
        toast({
          title: 'Erro ao carregar placas de veículos',
          description: `Erro: ${error.message}`,
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !!user
  });

  // Buscar nomes dos funcionários
  useQuery({
    queryKey: ['employee-names'],
    queryFn: async () => {
      if (!user) {
        console.log('Usuário não autenticado - não buscando funcionários');
        return [];
      }
      
      try {
        console.log('Buscando nomes de funcionários...');
        const driversRef = collection(db, 'drivers');
        console.log('Referência drivers:', driversRef);
        
        const snapshot = await getDocs(driversRef);
        console.log('Snapshot drivers recebido:', snapshot.size, 'documentos');
    const names = snapshot.docs.map(doc => {
  console.log('Documento driver:', doc.id, doc.data());
  return doc.data().nomeCompleto;
}).filter(Boolean);
        
        console.log('Nomes encontrados:', names);
        setEmployeeNames(names);
        return names;
      } catch (error) {
        console.error('Erro detalhado ao buscar funcionários:', error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        
        toast({
          title: 'Erro ao carregar nomes de funcionários',
          description: `Erro: ${error.message}`,
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !!user
  });

  // Buscar despesas
const { data: expenses, isLoading } = useQuery({
  queryKey: ['expenses', year],
  queryFn: async (): Promise<Expense[]> => {
    if (!user) return [];

    try {
      const collectionName = getYearCollection('expenses', year);
      const expensesRef = collection(db, collectionName);

      const snapshot = await getDocs(expensesRef);

      const expenses: Expense[] = [];
      const hoje = new Date();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const vencimento = new Date(data.dataVencimento);

        let status: 'pendente' | 'pago' | 'vencido' = 'pendente';
        if (data.dataPagamento) status = 'pago';
        else if (vencimento < hoje) status = 'vencido';

        expenses.push({
          id: doc.id,
          ...data,
          status,
          createdAt: data.createdAt || null,
        } as Expense);
      });

      return expenses;
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar despesas',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  },
  enabled: !!user,
});

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">Gestão de Despesas</h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>
<main className="container mx-auto px-4 py-8">

  {/* Cards de Resumo */}
  {!isLoading && expenses?.length > 0 && (
    <ExpenseSummary expenses={expenses} />
  )}

  <Tabs defaultValue="list" className="space-y-6">
    <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="list">Lista de Despesas</TabsTrigger>
      <TabsTrigger value="add">Adicionar Despesa</TabsTrigger>

      <TabsTrigger value="charts">Análises</TabsTrigger>
      <TabsTrigger value="reports">Relatórios</TabsTrigger>
    </TabsList>

    <TabsContent value="add">
      <ExpenseForm 
        vehiclePlates={vehiclePlates} 
        employeeNames={employeeNames}
      />
    </TabsContent>

    <TabsContent value="list">
      <ExpensesList expenses={expenses || []} isLoading={isLoading} />
    </TabsContent>

    <TabsContent value="charts">
      <ExpenseCharts
        expenses={
          (expenses || []).map(exp =>
            ({
              ...exp,
              dataVencimento: exp.dataVencimento ?? '',
              subcategoria: exp.subcategoria ?? '',
              status: exp.status ?? 'pendente',
              createdAt: exp.createdAt ?? null
            })
          )
        }
      />
    </TabsContent>

    <TabsContent value="reports">
      <ExpenseReports expenses={expenses || []} />
    </TabsContent>
  </Tabs>
</main>
    </div>
  );
};

export default Expenses;
