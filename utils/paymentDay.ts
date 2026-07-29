/**
 * Resolve o dia de pagamento dentro de um mes.
 * Aceita 1-31; se o mes nao tiver esse dia (ex.: 31 em abril), usa 30.
 * Em fevereiro (sem 30/31), usa o ultimo dia do mes.
 */
export function resolvePaymentDayInMonth(day: number, year: number, monthIndexZeroBased: number): number {
  if (!Number.isInteger(day) || day < 1) return 1;

  const lastDay = new Date(year, monthIndexZeroBased + 1, 0).getDate();
  if (day <= lastDay) return day;
  if (lastDay >= 30) return 30;
  return lastDay;
}

export function paymentDueDate(day: number, year: number, monthIndexZeroBased: number): Date {
  const resolvedDay = resolvePaymentDayInMonth(day, year, monthIndexZeroBased);
  return new Date(year, monthIndexZeroBased, resolvedDay, 23, 59, 59, 999);
}
