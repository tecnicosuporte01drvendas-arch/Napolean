// Mock data for Napolean Platform

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  averageScore: number;
  totalTranscriptions: number;
}

export interface Transcription {
  id: string;
  salespersonId: string;
  date: string;
  scores: {
    conexao: number;
    investigacao: number;
    diagnostico: number;
    apresentacao: number;
    negociacao: number;
    fechamento: number;
    posVenda: number;
  };
  totalScore: number;
  audioUrl?: string;
  transcriptUrl?: string;
  reportUrl?: string;
}

export const METHODOLOGY_STEPS = [
  { key: 'apresentacao', label: 'Apresentação' },
  { key: 'identificacao', label: 'Identificação de Necessidades' },
  { key: 'historia', label: 'Conexão por História Pessoal' },
  { key: 'pilares', label: 'Pilares da Mentoria' },
  { key: 'objecoes', label: 'Quebra de Objeções' },
  { key: 'impacto', label: 'Impacto e Transformação' },
  { key: 'proposta', label: 'Proposta de Valor' },
] as const;

export const mockSalespeople: Salesperson[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana.silva@empresa.com',
    role: 'Vendedora Sênior',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    averageScore: 8.7,
    totalTranscriptions: 24,
  },
  {
    id: '2',
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@empresa.com',
    role: 'Vendedor Pleno',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    averageScore: 7.9,
    totalTranscriptions: 18,
  },
  {
    id: '3',
    name: 'Beatriz Santos',
    email: 'beatriz.santos@empresa.com',
    role: 'Vendedora Júnior',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz',
    averageScore: 6.8,
    totalTranscriptions: 12,
  },
  {
    id: '4',
    name: 'Diego Ferreira',
    email: 'diego.ferreira@empresa.com',
    role: 'Vendedor Sênior',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego',
    averageScore: 8.3,
    totalTranscriptions: 21,
  },
  {
    id: '5',
    name: 'Eduarda Lima',
    email: 'eduarda.lima@empresa.com',
    role: 'Vendedora Pleno',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eduarda',
    averageScore: 7.5,
    totalTranscriptions: 15,
  },
];

export const mockTranscriptions: Transcription[] = [
  // Ana Silva transcriptions
  {
    id: 't1',
    salespersonId: '1',
    date: '2025-01-15',
    scores: { conexao: 9.0, investigacao: 8.5, diagnostico: 8.8, apresentacao: 8.9, negociacao: 8.7, fechamento: 9.0, posVenda: 8.5 },
    totalScore: 8.8,
  },
  {
    id: 't2',
    salespersonId: '1',
    date: '2025-01-10',
    scores: { conexao: 8.8, investigacao: 8.7, diagnostico: 8.5, apresentacao: 9.0, negociacao: 8.8, fechamento: 8.7, posVenda: 8.6 },
    totalScore: 8.7,
  },
  {
    id: 't3',
    salespersonId: '1',
    date: '2025-01-05',
    scores: { conexao: 8.5, investigacao: 8.9, diagnostico: 8.7, apresentacao: 8.6, negociacao: 8.5, fechamento: 8.8, posVenda: 8.7 },
    totalScore: 8.7,
  },
  // Carlos Oliveira transcriptions
  {
    id: 't4',
    salespersonId: '2',
    date: '2025-01-14',
    scores: { conexao: 8.0, investigacao: 7.8, diagnostico: 7.9, apresentacao: 8.1, negociacao: 7.7, fechamento: 7.9, posVenda: 8.0 },
    totalScore: 7.9,
  },
  {
    id: 't5',
    salespersonId: '2',
    date: '2025-01-08',
    scores: { conexao: 7.9, investigacao: 7.7, diagnostico: 8.0, apresentacao: 7.8, negociacao: 7.9, fechamento: 8.1, posVenda: 7.8 },
    totalScore: 7.9,
  },
  // Beatriz Santos transcriptions
  {
    id: 't6',
    salespersonId: '3',
    date: '2025-01-12',
    scores: { conexao: 7.0, investigacao: 6.8, diagnostico: 6.7, apresentacao: 6.9, negociacao: 6.5, fechamento: 6.8, posVenda: 7.0 },
    totalScore: 6.8,
  },
  {
    id: 't7',
    salespersonId: '3',
    date: '2025-01-06',
    scores: { conexao: 6.7, investigacao: 6.9, diagnostico: 6.8, apresentacao: 6.7, negociacao: 6.8, fechamento: 6.9, posVenda: 6.8 },
    totalScore: 6.8,
  },
  // Diego Ferreira transcriptions
  {
    id: 't8',
    salespersonId: '4',
    date: '2025-01-13',
    scores: { conexao: 8.5, investigacao: 8.2, diagnostico: 8.4, apresentacao: 8.3, negociacao: 8.1, fechamento: 8.5, posVenda: 8.2 },
    totalScore: 8.3,
  },
  {
    id: 't9',
    salespersonId: '4',
    date: '2025-01-09',
    scores: { conexao: 8.3, investigacao: 8.4, diagnostico: 8.2, apresentacao: 8.3, negociacao: 8.3, fechamento: 8.4, posVenda: 8.2 },
    totalScore: 8.3,
  },
  // Eduarda Lima transcriptions
  {
    id: 't10',
    salespersonId: '5',
    date: '2025-01-11',
    scores: { conexao: 7.6, investigacao: 7.4, diagnostico: 7.5, apresentacao: 7.6, negociacao: 7.3, fechamento: 7.5, posVenda: 7.6 },
    totalScore: 7.5,
  },
];

export const getTranscriptionsForSalesperson = (salespersonId: string): Transcription[] => {
  return mockTranscriptions.filter(t => t.salespersonId === salespersonId);
};

export const getTeamAverageByStep = () => {
  const allScores = mockTranscriptions.reduce((acc, t) => {
    METHODOLOGY_STEPS.forEach(step => {
      if (!acc[step.key]) acc[step.key] = [];
      acc[step.key].push(t.scores[step.key as keyof typeof t.scores]);
    });
    return acc;
  }, {} as Record<string, number[]>);

  return METHODOLOGY_STEPS.map(step => ({
    step: step.label,
    score: (allScores[step.key].reduce((a, b) => a + b, 0) / allScores[step.key].length).toFixed(1),
  }));
};
