import { paymentDueDate, resolvePaymentDayInMonth } from '@/utils/paymentDay';

export type PaymentStatus = 'pago' | 'atrasado' | 'venceHoje' | 'aguardando' | 'semDia' | 'naoIniciado';

export type PaymentAluno = {
  dataPagamento?: string | number | null;
  data_pagamento?: string | number | null;
  pagamentoPago?: boolean | null;
  pagamento_pago?: boolean | null;
  pagamentoReferencia?: string | null;
  pagamento_referencia?: string | null;
  pagamentosPagos?: string[] | null;
  pagamentos_pagos?: string[] | null;
  /** Data do cadastro do usuario no aplicativo. */
  cadastroAppAt?: string | null;
  createdAt?: string;
  created_at?: string;
};

export function normalizePaymentDay(value: unknown): string | null {
  if (value == null || value === '') return null;

  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31) {
    return String(value);
  }

  const text = String(value).trim();
  if (/^\d{1,2}$/.test(text)) {
    const day = Number(text);
    return day >= 1 && day <= 31 ? String(day) : null;
  }

  const isoMatch = text.match(/^\d{4}-\d{2}-(\d{2})/);
  if (isoMatch) {
    const day = Number(isoMatch[1]);
    return day >= 1 && day <= 31 ? String(day) : null;
  }

  return null;
}

export function normalizePaymentAluno(aluno: PaymentAluno): PaymentAluno {
  return {
    ...aluno,
    dataPagamento: normalizePaymentDay(aluno.dataPagamento ?? aluno.data_pagamento),
    pagamentoPago: aluno.pagamentoPago ?? aluno.pagamento_pago ?? false,
    pagamentoReferencia: aluno.pagamentoReferencia ?? aluno.pagamento_referencia ?? null,
    pagamentosPagos: aluno.pagamentosPagos ?? aluno.pagamentos_pagos ?? [],
    cadastroAppAt: aluno.cadastroAppAt ?? null,
    createdAt: aluno.createdAt ?? aluno.created_at,
  };
}

export function currentPaymentReference(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function previousPaymentReference(date = new Date()): string {
  const previous = new Date(date);
  previous.setMonth(previous.getMonth() - 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
}

export function isPaidForReference(aluno: PaymentAluno, reference: string): boolean {
  const normalized = normalizePaymentAluno(aluno);
  return (
    normalized.pagamentosPagos?.includes(reference) ||
    (normalized.pagamentoPago === true && normalized.pagamentoReferencia === reference)
  );
}

/** Inicio da cobranca: cadastro no app; fallback para cadastro do aluno. */
function billingStartAt(aluno: PaymentAluno): Date | null {
  const normalized = normalizePaymentAluno(aluno);
  const raw = normalized.cadastroAppAt ?? normalized.createdAt ?? null;
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shouldCountForReference(aluno: PaymentAluno, reference: string): boolean {
  const normalized = normalizePaymentAluno(aluno);
  const paymentDay = Number(normalized.dataPagamento);
  // Sem dia de pagamento no cadastro do aluno, nao contabiliza cobranca.
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return false;

  const startAt = billingStartAt(normalized);

  // Sem data de inicio, so contabiliza o mes atual.
  if (!startAt) {
    return reference === currentPaymentReference();
  }

  const [year, month] = reference.split('-').map(Number);
  const dueDate = paymentDueDate(paymentDay, year, month - 1);

  return startAt.getTime() <= dueDate.getTime();
}

export function paymentStatus(aluno: PaymentAluno, reference: string, now = new Date()): PaymentStatus {
  const normalized = normalizePaymentAluno(aluno);
  const paymentDay = Number(normalized.dataPagamento);
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return 'semDia';

  if (isPaidForReference(normalized, reference)) return 'pago';
  if (!shouldCountForReference(normalized, reference)) return 'naoIniciado';
  if (reference !== currentPaymentReference(now)) return 'atrasado';

  const dueDay = resolvePaymentDayInMonth(paymentDay, now.getFullYear(), now.getMonth());
  const today = now.getDate();
  if (today > dueDay) return 'atrasado';
  if (today === dueDay) return 'venceHoje';
  return 'aguardando';
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pago: 'Pago',
    atrasado: 'Em atraso',
    venceHoje: 'Vence hoje',
    aguardando: 'Nao chegou o dia de pagar ainda',
    semDia: 'Dia de pagamento nao informado',
    naoIniciado: 'Aguardando proximo vencimento',
  };

  return labels[status];
}

export function formatPaymentReference(reference: string): string {
  const [year, month] = reference.split('-');
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Marco',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return reference;
  return `${monthNames[monthIndex]}/${year}`;
}

/** Meses anteriores nao pagos (nao inclui o mes atual). */
export function unpaidPreviousReferences(aluno: PaymentAluno, now = new Date(), maxMonths = 12): string[] {
  const normalized = normalizePaymentAluno(aluno);
  const paymentDay = Number(normalized.dataPagamento);
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return [];

  const unpaid: string[] = [];

  for (let i = 1; i <= maxMonths; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const reference = currentPaymentReference(date);

    if (!shouldCountForReference(normalized, reference)) continue;
    if (isPaidForReference(normalized, reference)) continue;

    unpaid.push(reference);
  }

  return unpaid;
}
