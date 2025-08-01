// utils/status.ts
export function getStatusDespesa({
  dataPagamento,
  dataVencimento
}: {
  dataPagamento?: string;
  dataVencimento?: string;
}) {
  const hoje = new Date();
  const pagamento = dataPagamento ? new Date(dataPagamento) : null;
  const vencimento = dataVencimento ? new Date(dataVencimento) : null;

  if (pagamento) {
    if (pagamento <= hoje) return 'pago';
    if (pagamento > hoje) return 'programado';
  }

  if (!pagamento && vencimento && vencimento < hoje) {
    return 'vencido';
  }

  return 'pendente';
}
