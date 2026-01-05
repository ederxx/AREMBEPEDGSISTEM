import { createContext, useContext, useState } from 'react';

type YearContextType = {
  year: number;
  setYear: (year: number) => void;
};

const YearContext = createContext<YearContextType | null>(null);

export const YearProvider = ({ children }: { children: React.ReactNode }) => {
  const [year, setYear] = useState<number>(2026); // 👈 padrão fixo

  return (
    <YearContext.Provider value={{ year, setYear }}>
      {children}
    </YearContext.Provider>
  );
};

export const useYear = () => {
  const context = useContext(YearContext);
  if (!context) throw new Error('useYear fora do provider');
  return context;
};
