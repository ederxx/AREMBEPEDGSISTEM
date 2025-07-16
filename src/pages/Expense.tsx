
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

const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
    queryKey: ['expenses'],
    queryFn: async (): Promise<Expense[]> => {
      if (!user) {
        console.log('Usuário não autenticado - não buscando despesas');
        return [];
      }
      
      try {
        console.log('=== INICIANDO BUSCA DE DESPESAS ===');
        console.log('Usuário:', user.uid);
        console.log('Database:', db);
        
        const expensesRef = collection(db, 'expenses');
        console.log('Referência expenses:', expensesRef);
        console.log('Path da coleção:', expensesRef.path);
        
        console.log('Chamando getDocs...');
        const snapshot = await getDocs(expensesRef);
        console.log('=== SNAPSHOT RECEBIDO ===');
        console.log('Tamanho do snapshot:', snapshot.size);
        console.log('Vazio?', snapshot.empty);
        console.log('Metadados:', snapshot.metadata);
        
        const expenses: Expense[] = [];
        snapshot.docs.forEach((doc, index) => {
          console.log(`Documento ${index}:`, doc.id, doc.data());
          
          const data = doc.data();
          const hoje = new Date();
          const vencimento = new Date(data.dataVencimento);
          
          let status: 'pendente' | 'pago' | 'vencido' = 'pendente';
          if (data.dataPagamento) {
            status = 'pago';
          } else if (vencimento < hoje) {
            status = 'vencido';
          }

          expenses.push({
            id: doc.id,
            nome: data.nome,
            valor: data.valor,
            categoria: data.categoria,
            ...data,
            status,
            createdAt: data.createdAt || null // Ensure createdAt is present
          } as Expense);
        });
        
        console.log('=== DESPESAS PROCESSADAS ===');
        console.log('Total de despesas:', expenses.length);
        console.log('Despesas:', expenses);
        
        return expenses;
      } catch (error) {
        console.error('=== ERRO AO BUSCAR DESPESAS ===');
        console.error('Erro completo:', error);
        console.error('Tipo do erro:', typeof error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem do erro:', error.message);
        console.error('Stack trace:', error.stack);
        
        toast({
          title: 'Erro ao carregar despesas',
          description: `Erro: ${error.code} - ${error.message}`,
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !!user
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

  <Tabs defaultValue="add" className="space-y-6">
    <TabsList className="grid w-full grid-cols-4">
      <TabsTrigger value="add">Adicionar Despesa</TabsTrigger>
      <TabsTrigger value="list">Lista de Despesas</TabsTrigger>
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
