import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { YearProvider } from '@/contexts/YearContext';

createRoot(document.getElementById('root')!).render(
  <YearProvider>
    <App />
  </YearProvider>
);
