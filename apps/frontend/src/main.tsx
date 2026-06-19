import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from 'sonner';

import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster richColors position="top-right" />
    </QueryProvider>
  </StrictMode>
);
