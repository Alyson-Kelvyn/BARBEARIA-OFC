// Interface que define a estrutura de um serviço oferecido pela barbearia
export interface Service {
  id: string; // Identificador único do serviço
  name: string; // Nome do serviço (ex: Corte de Cabelo, Barba, etc)
  duration: number; // Duração do serviço em minutos
  price: number; // Preço do serviço em reais
}

// Interface que define a estrutura de um barbeiro
export interface Barber {
  id: string; // Identificador único do barbeiro
  name: string; // Nome do barbeiro
  photo_url?: string; // URL da foto do barbeiro
  specialties?: string[]; // Especialidades do barbeiro
}

// Interface que define a estrutura de um agendamento
export interface Appointment {
  id: string; // Identificador único do agendamento
  client_name: string; // Nome do cliente
  client_phone: string; // Número de telefone do cliente
  service_id: string; // ID do serviço agendado
  barber_id: string; // ID do barbeiro selecionado
  appointment_date: string; // Data e hora do agendamento
  created_at: string; // Data de criação do registro
  status?: string; // Status do agendamento (confirmado, cancelado, etc)
  service?: Service; // Dados do serviço relacionado
  barber?: Barber; // Dados do barbeiro relacionado
}

// Interface que define a estrutura de um usuário do sistema
export interface User {
  id: string; // Identificador único do usuário
  email: string; // Email do usuário
  role?: string; // Papel do usuário no sistema (admin, barbeiro, etc)
}
