// src/pages/FluxoDeCaixaPage.tsx

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import FluxoDeCaixa from './fluxoCaixa';

// ... outras importações

interface Expense {
  id: string;
  nome: string;
  dataVencimento: string;
  valor: number;
  categoria: string;
}

// A nova interface para um serviço
interface Service {
  id: string;
  nomeEmpresa: string;
  dataInicio: string;
  valorFinal: number;
  formadePagamento: string;
  // ... outras propriedades do serviço
}

const FluxoDeCaixaPage = () => {
  // ... (o seu código do user e navigate)

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'expenses'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Expense }));
    },
    // ...
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['services-for-incomes'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'services'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Service }));
    },
    // ...
  });

  // A MÁGICA ACONTECE AQUI:
  // Filtra os serviços que são 'faturado' ou 'pago' e os converte para o formato de 'receita'
  const incomes = services
    .filter(service => service.formadePagamento === 'faturado' || service.formadePagamento === 'pago')
    .map(service => ({
      id: service.id,
      nome: `Serviço para ${service.nomeEmpresa}`, // A descrição que aparecerá no fluxo de caixa
      valor: service.valorFinal,
      dataVencimento: service.dataInicio, // A data que você usará como referência
    }));

  const isLoading = isLoadingExpenses || isLoadingServices;

  return (
    <div className="flex-1 flex-col p-4 md:p-8">
      <FluxoDeCaixa
        expenses={expenses}
        incomes={incomes}
        isLoading={isLoading}
      />
    </div>
  );
};

export default FluxoDeCaixaPage;