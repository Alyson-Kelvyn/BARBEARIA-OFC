import React, { useState, useEffect } from "react";
import { Calendar, Scissors, User, X, Phone, Search } from "lucide-react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  format,
  addMinutes,
  startOfToday,
  isBefore,
  parseISO,
  differenceInMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../supabase";
import type { Service, Appointment, Barber } from "../types";

// Função auxiliar para obter a imagem do barbeiro com base no ID
const getBarberImageUrl = (barberId: string | undefined | null): string => {
  if (!barberId) return "/img/img2.png"; // Imagem padrão para "Sem preferência"

  // Mapeamento de IDs de barbeiros para caminhos de imagem
  const barberImageMap: { [key: string]: string } = {
    // Substitua 'barber_id_1', etc., pelos IDs reais dos seus barbeiros
    "817c4198-3ced-4634-bdd0-fc3c20f678ec": "/img/img2.png", // Exemplo
    "fb46ce6e-baf8-4fde-947b-97f4de5451ef": "/img/img2.png", // Exemplo
    "3b5bfb72-7a01-4967-99a1-31962678b0ab": "/img/img2.png", // Exemplo
    "870db269-1314-46f7-a545-95185d59d693": "/img/img2.png", // Exemplo
    // Adicione mais mapeamentos conforme necessário
  };

  // Retorna o caminho da imagem mapeado ou uma imagem padrão se o ID não for encontrado
  return barberImageMap[barberId] || "/img/img2.png"; // Imagem padrão se o barbeiro não estiver mapeado
};

// Componente principal da página de agendamento
// Gerencia o processo de agendamento de horários para clientes
function Booking() {
  // Estados para gerenciar os dados do formulário e interface
  const [clientName, setClientName] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"morning" | "afternoon">(
    "morning"
  );
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clientPhone, setClientPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>(
    []
  );
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showBarberPicker, setShowBarberPicker] = useState(false);

  // Efeito para carregar serviços, barbeiros e agendamentos ao montar o componente
  // Também configura a altura da aplicação para dispositivos móveis
  useEffect(() => {
    fetchServices();
    fetchBarbers();
    fetchAppointments();

    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
    };

    window.addEventListener("resize", setAppHeight);
    setAppHeight();

    return () => window.removeEventListener("resize", setAppHeight);
  }, []);

  // Função para buscar os serviços disponíveis no banco de dados
  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*");
    if (data) {
      const parsedServices = data.map((service) => ({
        ...service,
        price:
          typeof service.price === "string"
            ? parseFloat(service.price)
            : service.price,
      }));
      setServices(parsedServices);
    }
  };

  // Função para buscar os barbeiros disponíveis
  const fetchBarbers = async () => {
    console.log("Buscando barbeiros...");
    const { data, error } = await supabase.from("barbers").select("*");
    console.log("Resposta do Supabase:", { data, error });
    if (error) {
      console.error("Erro ao buscar barbeiros:", error);
      return;
    }
    if (data) {
      console.log("Barbeiros encontrados:", data);
      setBarbers(data);
    }
  };

  // Função para buscar os agendamentos existentes
  const fetchAppointments = async () => {
    setLoadingTimeSlots(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:services(*)
        `
        )
        .gte("appointment_date", startOfDay.toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      const parsedAppointments = data.map((apt) => ({
        ...apt,
        date: parseISO(apt.appointment_date),
      }));

      setAppointments(parsedAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Função para verificar se um horário está disponível
  const isTimeSlotAvailable = (dateTime: Date) => {
    if (!selectedService || !selectedBarber) {
      console.log("Serviço ou barbeiro não selecionado");
      return false;
    }

    if (isBefore(dateTime, new Date())) {
      console.log("Data no passado");
      return false;
    }

    const dayOfWeek = dateTime.getDay();
    const hour = dateTime.getHours();
    const minutes = dateTime.getMinutes();

    // Verifica se é domingo (0) ou segunda (1), quarta (3), sexta (5) ou sábado (6)
    const isExtendedHoursDay = [1, 3, 5, 6].includes(dayOfWeek);
    const isRegularHoursDay = [2, 4].includes(dayOfWeek); // Terça (2) e Quinta (4)

    if (isExtendedHoursDay) {
      if (selectedPeriod === "morning" && (hour < 8 || hour >= 12)) {
        console.log("Fora do horário da manhã");
        return false;
      }
      if (
        selectedPeriod === "afternoon" &&
        (hour < 14 || hour >= 20 || (hour === 20 && minutes > 30))
      ) {
        console.log("Fora do horário da tarde");
        return false;
      }
    } else if (isRegularHoursDay) {
      if (selectedPeriod === "morning" && (hour < 8 || hour >= 12)) {
        console.log("Fora do horário da manhã");
        return false;
      }
      if (selectedPeriod === "afternoon" && (hour < 14 || hour >= 18)) {
        console.log("Fora do horário da tarde");
        return false;
      }
    } else {
      console.log("Dia não disponível para agendamento");
      return false;
    }

    // Calcula o horário de término do serviço
    // Se a duração for 75 minutos, trata como 90 minutos (1h30)
    const serviceDuration =
      selectedService.duration === 75 ? 90 : selectedService.duration;
    const slotEnd = addMinutes(dateTime, serviceDuration);
    console.log("Duração do serviço:", serviceDuration, "minutos");
    console.log("Horário de início:", format(dateTime, "HH:mm"));
    console.log("Horário de término:", format(slotEnd, "HH:mm"));

    // Verifica se o horário de término ultrapassa o período de trabalho
    if (isExtendedHoursDay) {
      if (selectedPeriod === "morning" && slotEnd.getHours() > 12) {
        console.log("Serviço ultrapassa o horário da manhã");
        return false;
      }
      if (
        selectedPeriod === "afternoon" &&
        (slotEnd.getHours() > 20 ||
          (slotEnd.getHours() === 20 && slotEnd.getMinutes() > 30))
      ) {
        console.log("Serviço ultrapassa o horário da tarde");
        return false;
      }
    } else if (isRegularHoursDay) {
      if (selectedPeriod === "morning" && slotEnd.getHours() > 12) {
        console.log("Serviço ultrapassa o horário da manhã");
        return false;
      }
      if (selectedPeriod === "afternoon" && slotEnd.getHours() > 18) {
        console.log("Serviço ultrapassa o horário da tarde");
        return false;
      }
    }

    // Verifica conflitos com outros agendamentos
    const hasConflict = appointments.some((apt) => {
      if (apt.barber_id !== selectedBarber.id) return false;

      const appointmentStart = parseISO(apt.appointment_date);
      const appointmentEnd = addMinutes(
        appointmentStart,
        apt.service?.duration === 75 ? 90 : apt.service?.duration || 30
      );

      console.log("Verificando conflito com agendamento:", {
        barbeiro: apt.barber_id,
        início: format(appointmentStart, "HH:mm"),
        fim: format(appointmentEnd, "HH:mm"),
        duração:
          apt.service?.duration === 75 ? 90 : apt.service?.duration || 30,
      });

      const hasOverlap =
        (dateTime >= appointmentStart && dateTime < appointmentEnd) || // Novo agendamento começa durante um existente
        (slotEnd > appointmentStart && slotEnd <= appointmentEnd) || // Novo agendamento termina durante um existente
        (dateTime <= appointmentStart && slotEnd >= appointmentEnd); // Novo agendamento engloba um existente

      if (hasOverlap) {
        console.log("Conflito encontrado!");
      }

      return hasOverlap;
    });

    return !hasConflict;
  };

  // Função para formatar o telefone enquanto digita
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    let formattedValue = "";

    if (value.length <= 2) {
      formattedValue = value;
    } else if (value.length <= 7) {
      formattedValue = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else {
      formattedValue = `(${value.slice(0, 2)}) ${value.slice(
        2,
        7
      )}-${value.slice(7, 11)}`;
    }

    setClientPhone(formattedValue);
  };

  // Função para lidar com o envio do formulário de agendamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !clientName ||
      !selectedService ||
      !selectedDate ||
      !clientPhone ||
      !selectedBarber
    ) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Validação do telefone
    const cleanedPhone = clientPhone.replace(/\D/g, "");
    if (cleanedPhone.length !== 11) {
      alert(
        "Por favor, insira um número de telefone válido com DDD (11 dígitos)."
      );
      return;
    }

    if (!isTimeSlotAvailable(selectedDate)) {
      alert(
        "Este horário não está mais disponível. Por favor, escolha outro horário."
      );
      fetchAppointments();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          client_name: clientName,
          client_phone: cleanedPhone,
          service_id: selectedService.id,
          barber_id: selectedBarber.id,
          appointment_date: selectedDate.toISOString(),
        })
        .select();

      if (error) {
        console.error("Erro detalhado:", error);
        throw new Error(`Erro ao criar agendamento: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum dado retornado após a inserção");
      }

      // Abre o WhatsApp com a mensagem de confirmação
      const message =
        `*📅 Novo Agendamento*\n\n` +
        `*👤 Cliente:* ${clientName}\n` +
        `*📱 Telefone:* ${clientPhone}\n` +
        `*✂️ Serviço:* ${selectedService.name}\n` +
        `*💰 Valor:* R$ ${selectedService.price.toFixed(2)}\n` +
        `*⏱️ Duração:* ${selectedService.duration} minutos\n` +
        `*👨‍💼 Barbeiro:* ${selectedBarber.name}\n` +
        `*📆 Data:* ${format(selectedDate, "dd/MM/yyyy")}\n` +
        `*⏰ Horário:* ${format(selectedDate, "HH:mm")}\n\n` +
        `_Aguardo sua confirmação!_`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=5585994015283&text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");

      // Limpa o formulário após o agendamento
      setClientName("");
      setClientPhone("");
      setSelectedService(null);
      setSelectedBarber(null);
      setSelectedDate(null);
      await fetchAppointments();
      alert("Agendamento realizado com sucesso!");
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert(
        `Erro ao criar agendamento: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }. Por favor, tente novamente.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar os horários disponíveis baseado no período selecionado
  const getTimeSlots = () => {
    if (!selectedDate || !selectedService) return [];

    const slots = [];
    let startHour, endHour;
    const dayOfWeek = selectedDate.getDay();

    // Verifica se é um dia válido para agendamento
    if (dayOfWeek === 0) return []; // Domingo

    // Define os horários com base no dia da semana
    if ([1, 3, 5, 6].includes(dayOfWeek)) {
      // Segunda, Quarta, Sexta e Sábado
      startHour = selectedPeriod === "morning" ? 8 : 14;
      endHour = selectedPeriod === "morning" ? 12 : 20;
    } else {
      // Terça e Quinta
      startHour = selectedPeriod === "morning" ? 8 : 14;
      endHour = selectedPeriod === "morning" ? 12 : 18;
    }

    let currentTime = new Date(selectedDate);
    currentTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, 0, 0, 0);

    // Se for o dia atual, ajusta o horário inicial para o próximo intervalo disponível
    if (
      format(currentTime, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    ) {
      const now = new Date();
      if (now > currentTime) {
        currentTime = new Date(now);
        currentTime.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
        currentTime.setSeconds(0);
        currentTime.setMilliseconds(0);
      }
    }

    // Gera slots a cada 30 minutos
    while (currentTime < endTime) {
      // Verifica se o serviço cabe no horário atual
      const serviceEndTime = addMinutes(currentTime, selectedService.duration);

      // Verifica se o horário de término não ultrapassa o limite do dia
      const isExtendedHoursDay = [1, 3, 5, 6].includes(dayOfWeek);
      const maxEndHour = isExtendedHoursDay ? 20 : 18;
      const maxEndMinutes = isExtendedHoursDay ? 30 : 0;

      if (
        serviceEndTime.getHours() < maxEndHour ||
        (serviceEndTime.getHours() === maxEndHour &&
          serviceEndTime.getMinutes() <= maxEndMinutes)
      ) {
        if (isTimeSlotAvailable(currentTime)) {
          slots.push(new Date(currentTime));
        }
      }

      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  };

  // Função para buscar agendamentos por telefone
  const searchAppointmentsByPhone = async () => {
    if (!searchPhone) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:services(*),
          barber:barbers(*)
        `
        )
        .eq("client_phone", searchPhone)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      const parsedAppointments = data.map((apt) => ({
        ...apt,
        date: parseISO(apt.appointment_date),
      }));

      setClientAppointments(parsedAppointments);
    } catch (error) {
      console.error("Error searching appointments:", error);
      alert("Erro ao buscar agendamentos. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Função para cancelar agendamento
  const cancelAppointment = async (appointmentId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (error) throw error;

      // Atualiza a lista de agendamentos do cliente
      setClientAppointments((prev) =>
        prev.filter((apt) => apt.id !== appointmentId)
      );

      // Atualiza a lista geral de agendamentos
      await fetchAppointments();

      alert("Agendamento cancelado com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
      alert("Erro ao cancelar agendamento. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Função para enviar lembrete via WhatsApp
  const sendReminder = async (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const minutesUntilAppointment = differenceInMinutes(appointmentDate, now);

    // Se faltar exatamente 30 minutos para o agendamento
    if (minutesUntilAppointment === 30) {
      const reminderMessage =
        `*⏰ Lembrete de Agendamento*\n\n` +
        `Olá ${appointment.client_name}! Seu agendamento está chegando:\n\n` +
        `*✂️ Serviço:* ${appointment.service?.name}\n` +
        `*👨‍💼 Barbeiro:* ${appointment.barber?.name}\n` +
        `*⏰ Horário:* ${format(appointmentDate, "HH:mm")}\n\n` +
        `_Não se esqueça do seu horário!_`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${
        appointment.client_phone
      }&text=${encodeURIComponent(reminderMessage)}`;

      window.open(whatsappUrl, "_blank");
    }
  };

  // Função para verificar e enviar lembretes
  const checkAndSendReminders = () => {
    const now = new Date();
    appointments.forEach((appointment) => {
      const appointmentDate = new Date(appointment.appointment_date);

      // Só envia lembrete se o agendamento for para hoje
      if (format(appointmentDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")) {
        sendReminder(appointment);
      }
    });
  };

  // Efeito para verificar lembretes a cada minuto
  useEffect(() => {
    const reminderInterval = setInterval(checkAndSendReminders, 60000); // 60000ms = 1 minuto

    return () => clearInterval(reminderInterval);
  }, [appointments]);

  // Layout da Pagina
  return (
    <div className="h-[100dvh] overflow-hidden app-background text-white">
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto flex flex-col items-center p-4">
          <h1 className="text-3xl font-bold text-yellow-500 logo-text mb-0">
            <img
              src="/img/img2.png"
              alt="Logo Alyson Barber"
              className="h-32 w-auto"
            />
          </h1>

          <div className="w-full">
            {showSearchForm ? (
              <div className="space-y-4 bg-black/50 backdrop-blur-sm p-6 md:p-8 rounded-lg shadow-xl border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-yellow-500">
                    Buscar Agendamentos
                  </h2>
                  <button
                    onClick={() => setShowSearchForm(false)}
                    className="p-2 text-gray-400 hover:text-yellow-500 transition-colors flex items-center gap-2"
                  >
                    <span className="text-sm">Voltar</span>
                    <X size={20} />
                  </button>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-gray-300 mb-1 text-sm">
                    <Phone size={15} className="text-yellow-500" />
                    <span>Telefone</span>
                  </label>
                  <input
                    type="tel"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
                <button
                  onClick={searchAppointmentsByPhone}
                  disabled={loading}
                  className="w-full bg-yellow-500 text-black font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {loading ? "Buscando..." : "Buscar Agendamentos"}
                </button>

                {clientAppointments.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-yellow-500">
                        Seus Agendamentos
                      </h3>
                      <button
                        onClick={() => {
                          setClientAppointments([]);
                          setSearchPhone("");
                        }}
                        className="p-2 text-gray-400 hover:text-yellow-500 transition-colors flex items-center gap-2"
                      >
                        <span className="text-sm">Voltar</span>
                        <X size={20} />
                      </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                      {clientAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="bg-black/30 p-6 rounded-md border border-white/10"
                        >
                          <div className="flex flex-col items-left">
                            <p className="font-semibold text-yellow-500 text-xl mb-4">
                              {appointment.client_name}
                            </p>
                            <div className="space-y-3 text-left mb-4">
                              <p className="text-gray-300 text-lg">
                                {appointment.service?.name}
                              </p>
                              <p className="text-gray-400 text-lg">
                                R$ {appointment.service?.price.toFixed(2)}
                              </p>
                              <p className="text-gray-300 text-lg">
                                Barbeiro: {appointment.barber?.name}
                              </p>
                              <p className="text-gray-300 text-lg">
                                {format(
                                  new Date(appointment.appointment_date),
                                  "dd/MM/yyyy"
                                )}
                              </p>
                              <p className="text-gray-400 text-lg">
                                {format(
                                  new Date(appointment.appointment_date),
                                  "HH:mm"
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => cancelAppointment(appointment.id)}
                              className="text-red-500 hover:text-red-600 transition-colors text-lg font-medium"
                              title="Cancelar Agendamento"
                            >
                              Cancelar Agendamento
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-4 bg-black/50 backdrop-blur-sm p-6 md:p-8 rounded-lg shadow-xl border border-white/10"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm">
                      <User size={15} className="text-yellow-500" />
                      <span>Nome</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
                      required
                      placeholder="Seu nome e sobrenome"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm">
                      <Phone size={15} className="text-yellow-500" />
                      <span>Telefone</span>
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={handlePhoneChange}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors"
                      required
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm">
                      <Scissors size={20} className="text-yellow-500" />
                      <span>Serviço</span>
                    </label>
                    <div
                      onClick={() => setShowServicePicker(true)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors text-left cursor-pointer"
                    >
                      {selectedService
                        ? `${
                            selectedService.name
                          } - R$ ${selectedService.price.toFixed(2)} - ${
                            selectedService.duration
                          } min`
                        : "Selecione um serviço"}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm">
                      <User size={20} className="text-yellow-500" />
                      <span>Barbeiro</span>
                    </label>
                    <div
                      onClick={() => setShowBarberPicker(true)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors text-left cursor-pointer"
                    >
                      {selectedBarber
                        ? selectedBarber.name
                        : "Selecione um barbeiro"}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm">
                      <Calendar size={20} className="text-yellow-500" />
                      <span>Data e Horário</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors text-left"
                    >
                      {selectedDate
                        ? `${format(selectedDate, "dd 'de' MMMM", {
                            locale: ptBR,
                          })} às ${format(selectedDate, "HH:mm")}`
                        : "Selecione a data e horário"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !clientName ||
                    !selectedService ||
                    !selectedDate ||
                    !selectedBarber
                  }
                  className="w-full bg-yellow-500 text-black py-3 rounded-md hover:bg-yellow-400 disabled:bg-gray-300 disabled:text-black-900 disabled:cursor-not-allowed transition-colors font-semibold mt-6"
                >
                  {loading ? "Agendando..." : "Agendar Horário"}
                </button>

                <div className="flex flex-row gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowSearchForm(!showSearchForm)}
                    className="flex-1 p-3 bg-black/50 border border-white/10 rounded-md text-white hover:bg-black/70 transition-colors flex items-center justify-center gap-2"
                  >
                    <Search size={20} />
                    <span className="text-sm md:text-base">
                      Cancelar Agendamento
                    </span>
                  </button>

                  <Link
                    to="/login"
                    className="flex-1 p-3 bg-black/50 border border-white/10 rounded-md text-white hover:bg-black/70 transition-colors flex items-center justify-center gap-2"
                  >
                    <User size={20} />
                    <span className="text-sm md:text-base">
                      Área do Barbeiro
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showDatePicker && (
        <div className="date-picker-modal">
          <div className="date-picker-header">
            <h2 className="text-xl font-semibold">
              {selectedDate ? "Selecione o horário" : "Selecione a data"}
            </h2>
            <button
              onClick={() => {
                setShowDatePicker(false);
                if (!selectedDate) {
                  setSelectedDate(null);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="date-picker-content">
            {!selectedDate ? (
              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setSelectedPeriod("morning");
                  }
                }}
                inline
                locale={ptBR}
                minDate={startOfToday()}
                filterDate={(date) => {
                  const day = date.getDay();
                  return day !== 0;
                }}
              />
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-center text-gray-300 mb-2">
                    Data selecionada:{" "}
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-yellow-500 hover:text-yellow-400 text-sm"
                  >
                    Alterar data
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod("morning")}
                    className={`time-period-button ${
                      selectedPeriod === "morning" ? "selected" : ""
                    }`}
                  >
                    Manhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod("afternoon")}
                    className={`time-period-button ${
                      selectedPeriod === "afternoon" ? "selected" : ""
                    }`}
                  >
                    Tarde
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {loadingTimeSlots ? (
                    <div className="col-span-3 flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-yellow-500"></div>
                    </div>
                  ) : getTimeSlots().length > 0 ? (
                    getTimeSlots().map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setHours(slot.getHours(), slot.getMinutes());
                          setSelectedDate(newDate);
                          setShowDatePicker(false);
                        }}
                        className={`time-slot-button ${
                          selectedDate?.getTime() === slot.getTime()
                            ? "selected"
                            : ""
                        }`}
                      >
                        {format(slot, "HH:mm")}
                      </button>
                    ))
                  ) : (
                    <p className="col-span-3 text-center text-gray-400 py-4">
                      Nenhum horário disponível neste período
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {!selectedDate && (
            <div className="date-picker-footer">
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="w-full bg-white text-black py-3 rounded-xl font-semibold"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {showServicePicker && (
        <div className="date-picker-modal">
          <div className="date-picker-header">
            <h2 className="text-xl font-semibold">Escolha um serviço</h2>
            <button
              onClick={() => setShowServicePicker(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="date-picker-content">
            <div className="grid gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-black/30 p-4 rounded-md border border-white/10 cursor-pointer hover:bg-black/50 transition-colors"
                  onClick={() => {
                    setSelectedService(service);
                    setShowServicePicker(false);
                    setSelectedDate(null);
                  }}
                >
                  <p className="font-semibold text-white text-lg">
                    {service.name}
                  </p>
                  <p className="text-gray-400 text-md">
                    R$ {service.price.toFixed(2)} · {service.duration} min
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              onClick={() => setShowServicePicker(false)}
              className="w-full bg-white text-black py-3 rounded-xl font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showBarberPicker && (
        <div className="date-picker-modal">
          <div className="date-picker-header">
            <h2 className="text-xl font-semibold">Selecionar profissional</h2>
            <button
              onClick={() => setShowBarberPicker(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="date-picker-content">
            <div className="grid gap-4">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="bg-black/30 p-4 rounded-md border border-white/10 cursor-pointer hover:bg-black/50 transition-colors flex items-center gap-4"
                  onClick={() => {
                    setSelectedBarber(barber);
                    setShowBarberPicker(false);
                    setSelectedDate(null);
                  }}
                >
                  <img
                    src={getBarberImageUrl(barber.id)}
                    alt={`${barber.name}'s photo`}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {barber.name}
                    </p>
                    <p className="text-gray-400 text-md">Função: Barbeiro</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              onClick={() => setShowBarberPicker(false)}
              className="w-full bg-white text-black py-3 rounded-xl font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Booking;
