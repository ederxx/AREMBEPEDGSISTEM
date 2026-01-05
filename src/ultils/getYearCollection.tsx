export const getYearCollection = (
  base: 'services' | 'expenses',
  year: number
) => {
  if (year === 2025) return base;
  return `${base}_${year}`;
};
