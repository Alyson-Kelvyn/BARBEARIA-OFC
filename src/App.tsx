import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User } from './types';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthError = (error: any) => {
      if (error?.message?.includes('Invalid Refresh Token')) {
        // Limpa o armazenamento local e redireciona para o login
        localStorage.clear();
        navigate('/login');
        return;
      }
    };

    // Verifica sessões ativas e define o usuário
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        handleAuthError(error);
        return;
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuta mudanças no estado de autenticação (login, logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Configura intervalo para limpar agendamentos antigos (semanalmente)
    const cleanupInterval = setInterval(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-appointments`, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to cleanup appointments');
        }
      } catch (error) {
        console.error('Error cleaning up appointments:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Executa a cada semana

    // Limpa as subscrições e intervalos ao desmontar o componente
    return () => {
      subscription.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Booking />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          user ? <Dashboard user={user} /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;