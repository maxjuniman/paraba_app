export type StudentCategoryId = 'all' | 'kids' | 'juvenil' | 'adulto';

export type StudentCategory = {
  id: Exclude<StudentCategoryId, 'all'>;
  label: string;
  minAge: number;
  maxAge?: number;
};

export const STUDENT_CATEGORIES: StudentCategory[] = [
  { id: 'kids', label: 'Kids', minAge: 0, maxAge: 10 },
  { id: 'juvenil', label: 'Juvenil', minAge: 11, maxAge: 18 },
  { id: 'adulto', label: 'Adulto', minAge: 19 },
];

export const STUDENT_CATEGORY_FILTERS: { id: StudentCategoryId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  ...STUDENT_CATEGORIES.map((category) => ({ id: category.id, label: category.label })),
];

export function calculateAgeFromIsoDate(isoDate?: string | null, referenceDate = new Date()): number | null {
  if (!isoDate) return null;

  const dateOnly = isoDate.trim().slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return null;

  let age = referenceDate.getFullYear() - year;
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function getStudentCategoryByBirthDate(isoDate?: string | null): StudentCategory | null {
  const age = calculateAgeFromIsoDate(isoDate);
  if (age == null) return null;

  return (
    STUDENT_CATEGORIES.find((category) => {
      const afterMin = age >= category.minAge;
      const beforeMax = category.maxAge == null || age <= category.maxAge;
      return afterMin && beforeMax;
    }) ?? null
  );
}
