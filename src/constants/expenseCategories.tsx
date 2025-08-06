export const EXPENSE_CATEGORIES = {
  adm: {
    name: 'Administrativo',
    subcategories: ['Luz', 'Telefone', 'Água', 'Material de Escritório/Limpeza', 'Aluguel', 'Contabilidade', 'Impostos/CNJ','Diversos']
  },
  veiculo: {
    name: 'Despesas com Veículo',
    subcategories: ['Seguro', 'Manutenção', 'Rastreador', 'Certificados', 'Combustível', 'IPVA', 'Financiamento','Diversos']
  },
  funcionarios: {
    name: 'Funcionários',
    subcategories: ['Salário', 'Almoço', 'Transporte', 'Impostos', 'Outros']
  },
    tercerizados: {
    name: 'Tercerizados',
    subcategories: ['Serviços',  'Outros']
  },
  pessoal: {
    name: 'Pessoal',
    subcategories: ['Diversos']
  }
};

export const CATEGORY_NAMES = {
  adm: 'Administrativo',
  veiculo: 'Veículos',
  funcionarios: 'Funcionários',
  pessoal: 'Pessoal'
};

export const SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = {
  funcionarios: ['Salário', 'Vale Transporte', 'Vale Alimentação','outros'],
  adm: ['Água', 'Luz', 'Internet', 'Aluguel','Equipamento', 'Material de Escritório','outros'],
  veiculo: ['Manutenção', 'Combustível', 'Seguro', 'IPVA','outros'],
  pessoal: ['Outros','TRF'],
}
