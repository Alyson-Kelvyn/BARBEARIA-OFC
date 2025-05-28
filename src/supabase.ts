// Importa a função createClient do Supabase
import { createClient } from '@supabase/supabase-js';

// Obtém a URL do projeto Supabase das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Obtém a chave anônima do projeto Supabase das variáveis de ambiente
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria e exporta o cliente Supabase configurado com as credenciais
export const supabase = createClient(supabaseUrl, supabaseKey);