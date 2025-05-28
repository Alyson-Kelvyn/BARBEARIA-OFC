// Importações necessárias do React e outras bibliotecas
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Cria a raiz da aplicação React e renderiza o componente principal
createRoot(document.getElementById('root')!).render(
  // StrictMode ajuda a identificar problemas potenciais na aplicação
  <StrictMode>
    {/* BrowserRouter fornece o contexto de roteamento para a aplicação */}
    <BrowserRouter>
      {/* Componente principal da aplicação */}
      <App />
    </BrowserRouter>
  </StrictMode>
);