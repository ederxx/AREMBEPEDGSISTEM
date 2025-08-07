  import { useQuery } from '@tanstack/react-query';
  import { collection, getDocs } from 'firebase/firestore';
  import { db } from '@/config/firebase';
  import FluxoDeCaixa from './FluxoCaixa';
  import { useMemo } from 'react';

  // Interfaces e tipos (mantidos por clareza)
  interface Expense {
    id: string;
    nome: string;
    dataVencimento: string;
    valor: number;
    categoria: string;
    dataPagamento?: string; // Adicionado para a lógica de status
    empresa: string;
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
  interface Transaction {
    id: string;
    date: string;
    dateVencimento?: string;
    type: 'receita' | 'despesa';
    description: string;
    value: number;
    status: string;
    empresa?: string;
    banco?: string;
    nome: string;
    formadePagamento?: string;
  }

  // A função de cálculo de status agora está aqui, pois é lógica de negócio
  const calculateStatus = (expense: Expense) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pagamento = expense.dataPagamento ? new Date(expense.dataPagamento) : null;
    const vencimento = expense.dataVencimento ? new Date(expense.dataVencimento) : null;

    if (pagamento) {
      if (pagamento <= hoje) return 'pago';
      return 'programado';
    }

    if (vencimento) {
      if (vencimento < hoje) return 'vencido';
    }

    return 'pendente';
  };

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

    const isLoading = isLoadingExpenses || isLoadingServices;

    // Lógica para combinar e ordenar transações agora centralizada aqui
    const transactions = useMemo(() => {
      // Filtra as despesas com status 'pago' usando a função 'calculateStatus'
      const relevantExpenses = expenses.filter(exp => calculateStatus(exp) === 'pago');
      // Filtra as receitas com status 'finalizado'
      const relevantService = services.filter(inc => inc.status === "finalizado");

      const combined: Transaction[] = [
        ...relevantExpenses.map(exp => ({
          id: exp.id,
          date: exp.dataVencimento,
          type: 'despesa' as const,
          description: exp.nome,
          value: exp.valor,
          status: calculateStatus(exp),
          empresa: exp.empresa,
          nome: exp.nome,
        })),
...relevantService.map(serv => ({
  id: serv.id,
  date: serv.dataInicio ?? '',
  type: 'receita' as const,
  description: String(serv.nomeEmpresa ?? ''),
  value: Number(serv.valorFinal ?? 0),
  nome: String(serv.nomeEmpresa ?? ''),
  status: String(serv.status ?? 'pendente'),
})),
      ];

      combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return combined;
    }, [expenses, services]);


    return (
      <div className="flex-1 flex-col p-4 md:p-8">
        {/* Passando o array de transações combinado para o componente filho */}
        <FluxoDeCaixa
          transactions={transactions}
          isLoading={isLoading}
        />
      </div>
    );
  };

  export default FluxoDeCaixaPage;
