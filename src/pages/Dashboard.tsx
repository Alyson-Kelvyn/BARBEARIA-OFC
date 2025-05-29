import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  format,
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Scissors,
  Calendar,
  Clock,
  ArrowLeft,
  X,
  Phone,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Calendar as CalendarIcon,
} from "lucide-react";
import { supabase } from "../supabase";

// Interface para as props do componente Dashboard
interface DashboardProps {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

// Interface para um agendamento
interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  status: "pending" | "confirmed" | "cancelled";
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  } | null;
  barber: {
    id: string;
    name: string;
  } | null;
  service_id?: string;
  barber_id?: string;
  created_at?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BarberData {
  id: string;
  name: string;
}

interface AppointmentWithRelations extends Appointment {
  service: Service | null;
  barber: BarberData | null;
}

interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

// Interface para as estatísticas do painel
interface Stats {
  total: number;
  confirmed: number;
  cancelled: number;
  revenue: number;
  averageTicket: number;
  monthlyRevenue: number;
  monthlyAppointments: number;
  barberStats?: {
    [key: string]: {
      name: string;
      total: number;
      confirmed: number;
      revenue: number;
      monthlyRevenue: number;
      monthlyAppointments: number;
    };
  };
}

// Interface para o período selecionado
interface Period {
  start: Date;
  end: Date;
}

// Componente do painel administrativo
// Gerencia a visualização e controle de agendamentos
function Dashboard({ user }: DashboardProps) {
  // Estados para gerenciar os dados e interface do painel
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "week">("today");
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarberStats, setSelectedBarberStats] = useState<string>("all");
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
    averageTicket: 0,
    monthlyRevenue: 0,
    monthlyAppointments: 0,
    barberStats: {},
  });
  const [barbers, setBarbers] = useState<BarberData[]>([]);
  const [selectedBarber] = useState<string>("all");
  const [appointmentFilter, setAppointmentFilter] = useState<
    "all" | "booked" | "empty"
  >("all");
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [listDate, setListDate] = useState(new Date());

  // Função para obter o período baseado no filtro
  const getPeriod = (filter: "all" | "today" | "week"): Period => {
    const now = selectedDate; // Usar a data selecionada ao invés da data atual
    switch (filter) {
      case "today":
        return {
          start: startOfDay(now),
          end: new Date(now.setHours(23, 59, 59, 999)),
        };
      case "week":
        return {
          start: startOfWeek(now, { locale: ptBR }),
          end: endOfWeek(now, { locale: ptBR }),
        };
      default:
        return {
          start: startOfDay(now),
          end: new Date(now.setFullYear(now.getFullYear() + 1)),
        };
    }
  };

  useEffect(() => {
    console.log("Iniciando carregamento do Dashboard...");
    fetchBarbers();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, selectedBarber, filter]);

  useEffect(() => {
    fetchListAppointments();
  }, [listDate]);

  const fetchBarbers = async () => {
    try {
      console.log("Buscando barbeiros...");
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Erro ao buscar barbeiros:", error.message);
        alert("Erro ao carregar lista de barbeiros: " + error.message);
        return;
      }

      console.log("Barbeiros encontrados:", data);
      setBarbers(data || []);
    } catch (error) {
      console.error("Erro ao buscar barbeiros:", error);
      alert("Erro ao carregar lista de barbeiros. Por favor, tente novamente.");
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      let startDate, endDate;

      if (filter === "week") {
        startDate = startOfWeek(selectedDate, { locale: ptBR });
        endDate = endOfWeek(selectedDate, { locale: ptBR });
      } else {
        startDate = startOfDay(selectedDate);
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log("Buscando agendamentos para estatísticas:", {
        startDate,
        endDate,
      });

      // Buscar agendamentos para estatísticas
      const { data: statsData, error: statsError } = (await supabase
        .from("appointments")
        .select(
          `
          id,
          client_name,
          client_phone,
          appointment_date,
          status,
          service:services(id, name, price, duration),
          barber:barbers(id, name)
        `
        )
        .is("deleted_at", null)
        .gte("appointment_date", startDate.toISOString())
        .lte("appointment_date", endDate.toISOString())
        .order("appointment_date", { ascending: true })) as SupabaseResponse<
        AppointmentWithRelations[]
      >;

      if (statsError) {
        console.error("Erro ao buscar estatísticas:", statsError.message);
        throw new Error(statsError.message);
      }

      // Calcular estatísticas para o período selecionado
      const stats: Stats = {
        total: statsData?.length || 0,
        confirmed:
          statsData?.filter((apt) => apt.status === "confirmed").length || 0,
        cancelled:
          statsData?.filter((apt) => apt.status === "cancelled").length || 0,
        revenue:
          statsData?.reduce(
            (acc, apt) =>
              apt.status === "confirmed" &&
              apt.service &&
              typeof apt.service.price === "number"
                ? acc + apt.service.price
                : acc,
            0
          ) || 0,
        averageTicket: 0,
        monthlyRevenue: 0,
        monthlyAppointments: 0,
        barberStats: {},
      };

      // Calcular estatísticas por barbeiro
      const barberStats: {
        [key: string]: {
          name: string;
          total: number;
          confirmed: number;
          revenue: number;
          monthlyRevenue: number;
          monthlyAppointments: number;
        };
      } = {};

      // Inicializar estatísticas para todos os barbeiros
      barbers.forEach((barber) => {
        barberStats[barber.id] = {
          name: barber.name,
          total: 0,
          confirmed: 0,
          revenue: 0,
          monthlyRevenue: 0,
          monthlyAppointments: 0,
        };
      });

      // Atualizar estatísticas do período selecionado
      statsData?.forEach((apt) => {
        if (
          apt.barber &&
          typeof apt.barber.id === "string" &&
          barberStats[apt.barber.id]
        ) {
          barberStats[apt.barber.id].total++;
          if (apt.status === "confirmed") {
            barberStats[apt.barber.id].confirmed++;
            if (apt.service && typeof apt.service.price === "number") {
              barberStats[apt.barber.id].revenue += apt.service.price;
            }
          }
        }
      });

      stats.barberStats = barberStats;

      // Buscar estatísticas mensais do mês selecionado
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      const { data: monthlyData, error: monthlyError } = (await supabase
        .from("appointments")
        .select(
          `
          id,
          status,
          service:services(id, price, duration),
          barber:barbers(id, name)
        `
        )
        .is("deleted_at", null)
        .gte("appointment_date", monthStart.toISOString())
        .lte("appointment_date", monthEnd.toISOString())
        .eq("status", "confirmed")) as SupabaseResponse<
        AppointmentWithRelations[]
      >;

      if (monthlyError) {
        console.error(
          "Erro ao buscar estatísticas mensais:",
          monthlyError.message
        );
        throw new Error(monthlyError.message);
      }

      if (monthlyData) {
        stats.monthlyRevenue = monthlyData.reduce(
          (acc, apt) =>
            apt.service && typeof apt.service.price === "number"
              ? acc + apt.service.price
              : acc,
          0
        );
        stats.monthlyAppointments = monthlyData.length;

        // Atualizar estatísticas mensais por barbeiro
        monthlyData.forEach((apt) => {
          if (
            apt.barber &&
            typeof apt.barber.id === "string" &&
            barberStats[apt.barber.id]
          ) {
            barberStats[apt.barber.id].monthlyAppointments++;
            if (apt.service && typeof apt.service.price === "number") {
              barberStats[apt.barber.id].monthlyRevenue += apt.service.price;
            }
          }
        });
      }

      setStats(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      alert("Erro ao carregar estatísticas. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchListAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          client_name,
          client_phone,
          appointment_date,
          status,
          service:services(id, name, price, duration),
          barber:barbers(id, name)
        `
        )
        .is("deleted_at", null)
        .gte("appointment_date", startOfDay(listDate).toISOString())
        .lte(
          "appointment_date",
          new Date(listDate.setHours(23, 59, 59, 999)).toISOString()
        )
        .order("appointment_date", { ascending: true });

      if (error) {
        console.error("Erro ao buscar agendamentos da lista:", error.message);
        return;
      }

      // Confirmar automaticamente agendamentos pendentes
      const pendingAppointments =
        data?.filter((apt) => apt.status === "pending") || [];
      for (const appointment of pendingAppointments) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", appointment.id);

        if (updateError) {
          console.error("Erro ao confirmar agendamento:", updateError.message);
        }
      }

      // Buscar agendamentos novamente após as confirmações
      const { data: updatedData, error: updatedError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          client_name,
          client_phone,
          appointment_date,
          status,
          service:services(id, name, price, duration),
          barber:barbers(id, name)
        `
        )
        .is("deleted_at", null)
        .gte("appointment_date", startOfDay(listDate).toISOString())
        .lte(
          "appointment_date",
          new Date(listDate.setHours(23, 59, 59, 999)).toISOString()
        )
        .order("appointment_date", { ascending: true });

      if (updatedError) {
        console.error(
          "Erro ao buscar agendamentos atualizados:",
          updatedError.message
        );
        return;
      }

      setAppointments(updatedData as unknown as Appointment[]);
    } catch (error) {
      console.error("Erro ao buscar agendamentos da lista:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);

    try {
      const { error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
      });

      if (error) throw error;

      alert("Usuário criado com sucesso!");
      setShowNewUserModal(false);
      setNewUserEmail("");
      setNewUserPassword("");
    } catch (error) {
      console.error("Error creating user:", error);
      alert(
        "Erro ao criar usuário. Verifique as credenciais e tente novamente."
      );
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(apt.appointment_date);
    const isSameDay =
      appointmentDate.toDateString() === listDate.toDateString();
    const matchesSearch =
      apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.service?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return isSameDay && matchesSearch;
  });

  const getBarberImageUrl = (barberId: string | undefined | null): string => {
    if (!barberId) return "/img/img2.png"; // Imagem padrão para "Sem preferência"

    const barberImageMap: { [key: string]: string } = {
      // Substitua 'barber_id_1', etc., pelos IDs reais dos seus barbeiros
      "817c4198-3ced-4634-bdd0-fc3c20f678ec": "/img/img1.jpg",
      "fb46ce6e-baf8-4fde-947b-97f4de5451ef": "/img/barbeiro2.jpg",
      "3b5bfb72-7a01-4967-99a1-31962678b0ab": "/img/barbeiro3.jpg",
      "870db269-1314-46f7-a545-95185d59d693": "/img/barbeiro4.jpg",
      // Adicione mais mapeamentos conforme necessário
    };

    return barberImageMap[barberId] || "/img/img2.png"; // Imagem padrão
  };

  return (
    <div className="min-h-screen app-background text-white">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 -ml-2 text-gray-400 hover:text-yellow-500 transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={24} />
            </Link>
            <img
              src="/img/img2.png"
              alt="Logo Alyson Barber"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-yellow-500 logo-text">
                Painel Administrativo
              </h1>
              <p className="text-gray-400 text-sm">Bem-vindo, {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto"></div>
        </header>

        {/* Filtros de Período */}
        <div className="flex gap-2 sm:gap-4 mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-md border border-white/10">
            <button
              onClick={() => {
                const previousDay = new Date(selectedDate);
                previousDay.setDate(previousDay.getDate() - 1);
                setSelectedDate(previousDay);
                setFilter("today");
              }}
              className="p-1 text-yellow-500 hover:text-yellow-400 transition-colors"
              title="Dia anterior"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="text-white font-medium">
              {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => {
                const nextDay = new Date(selectedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                setSelectedDate(nextDay);
                setFilter("today");
              }}
              className="p-1 text-yellow-500 hover:text-yellow-400 transition-colors rotate-180"
              title="Próximo dia"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          <button
            onClick={() => setFilter("week")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md transition-colors text-sm sm:text-base ${
              filter === "week"
                ? "bg-yellow-500 text-black"
                : "bg-black/30 text-gray-400 hover:bg-black/50"
            }`}
          >
            Esta Semana
          </button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 sm:gap-6 mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg p-4 sm:p-6 border border-yellow-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-200 text-lg sm:text-xl font-semibold">
                {filter === "week"
                  ? "Agendamentos da Semana"
                  : selectedDate.toDateString() === new Date().toDateString()
                  ? "Agendamentos de Hoje"
                  : `Agendamentos de ${format(selectedDate, "dd/MM/yyyy", {
                      locale: ptBR,
                    })}`}
              </h3>
              <CalendarIcon className="text-yellow-500" size={24} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-2">{stats.total}</p>
            <p className="text-sm text-gray-200">
              {stats.confirmed} confirmados
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 sm:p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-200 text-lg sm:text-xl font-semibold">
                {filter === "week"
                  ? "Faturamento da Semana"
                  : selectedDate.toDateString() === new Date().toDateString()
                  ? "Faturamento de Hoje"
                  : `Faturamento de ${format(selectedDate, "dd/MM/yyyy", {
                      locale: ptBR,
                    })}`}
              </h3>
              <DollarSign className="text-green-500" size={24} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-2">
              R$ {stats.revenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-200">
              {stats.confirmed} agendamentos
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4 sm:p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-200 text-lg sm:text-xl font-semibold">
                Faturamento de {format(selectedDate, "MMMM", { locale: ptBR })}
              </h3>
              <TrendingUp className="text-blue-500" size={24} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-2">
              R$ {stats.monthlyRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-200">
              {stats.monthlyAppointments} agendamentos
            </p>
          </div>
        </div>

        {/* Estatísticas por Barbeiro */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-yellow-500">
              Estatísticas por Barbeiro
            </h2>
            {/* <div className="flex items-center gap-2">
              <Filter className="text-yellow-500" size={20} />
              <select
                value={selectedBarberStats}
                onChange={(e) => setSelectedBarberStats(e.target.value)}
                className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors"
              >
                <option value="all">Todos os Barbeiros</option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div> */}
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stats.barberStats || {})
              .filter(
                ([barberId]) =>
                  selectedBarberStats === "all" ||
                  barberId === selectedBarberStats
              )
              .map(([barberId, barberStat]) => (
                <div
                  key={barberId}
                  className="bg-black/30 rounded-lg p-4 sm:p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <img
                        src="img/img2.png"
                        alt="Barber photo"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <h3 className="text-lg font-semibold text-yellow-500">
                        {barberStat.name}
                      </h3>
                    </div>
                    {/* <User className="text-yellow-500" size={24} /> */}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">
                        {filter === "week"
                          ? "Agendamentos da Semana"
                          : selectedDate.toDateString() ===
                            new Date().toDateString()
                          ? "Agendamentos Hoje"
                          : `Agendamentos de ${format(
                              selectedDate,
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}`}
                      </span>
                      <span className="text-white font-semibold">
                        {barberStat.total}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">
                        {filter === "week"
                          ? "Faturamento da Semana"
                          : selectedDate.toDateString() ===
                            new Date().toDateString()
                          ? "Faturamento Hoje"
                          : `Faturamento de ${format(
                              selectedDate,
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}`}
                      </span>
                      <span className="text-yellow-500 font-semibold">
                        R$ {barberStat.revenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">
                        Agendamentos Mensais
                      </span>
                      <span className="text-white font-semibold">
                        {barberStat.monthlyAppointments}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Faturamento Mensal</span>
                      <span className="text-blue-500 font-semibold">
                        R$ {barberStat.monthlyRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do cliente ou serviço..."
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors text-sm sm:text-base"
            />
            <Search
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
          </div>
        </div>

        {/* Filtro de Barbeiro */}
        {/* <div className="mb-6">
          <div className="flex items-center gap-2">
            <Filter className="text-yellow-500" size={20} />
            <select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm sm:text-base"
            >
              <option value="all">Todos os Barbeiros</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </div>
        </div> */}

        {/* Filtro de Horários */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Filter className="text-yellow-500" size={20} />
            <select
              value={appointmentFilter}
              onChange={(e) =>
                setAppointmentFilter(
                  e.target.value as "all" | "booked" | "empty"
                )
              }
              className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm sm:text-base"
            >
              <option value="all">Todos os Horários</option>
              <option value="booked">Apenas Agendados</option>
              <option value="empty">Apenas Vazios</option>
            </select>
          </div>
        </div>

        {/* Lista de Agendamentos Agrupados por Barbeiro */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-yellow-500">
              Agendamentos de {format(listDate, "dd/MM/yyyy", { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-md border border-white/10">
                <button
                  onClick={() => {
                    const previousDay = new Date(listDate);
                    previousDay.setDate(previousDay.getDate() - 1);
                    setListDate(previousDay);
                  }}
                  className="p-1 text-yellow-500 hover:text-yellow-400 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-white font-medium">
                  {format(listDate, "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <button
                  onClick={() => {
                    const nextDay = new Date(listDate);
                    nextDay.setDate(nextDay.getDate() + 1);
                    setListDate(nextDay);
                  }}
                  className="p-1 text-yellow-500 hover:text-yellow-400 transition-colors rotate-180"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex overflow-x-auto pb-4 -mx-4 px-4">
            {/* Coluna de Horários */}
            {appointmentFilter !== "booked" && (
              <div className="flex-shrink-0 w-20 mr-4">
                <div className="bg-black/50 rounded-t-md py-3 text-center font-semibold text-yellow-500">
                  Horários
                </div>
                <div className="bg-black/30 rounded-b-md p-2 space-y-0 min-h-[4500px]">
                  {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                    <div
                      key={hour}
                      className="h-[500px] border-b border-white/100 relative"
                    >
                      <div className="text-center text-gray-400 text-sm h-[250px] flex items-center justify-center border-b border-white/100">
                        {`${hour.toString().padStart(2, "0")}:00`}
                      </div>
                      <div className="text-center text-gray-400 text-sm h-[250px] flex items-center justify-center">
                        {`${hour.toString().padStart(2, "0")}:30`}
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/100"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {barbers.map((barber) => {
              const barberAppointments = filteredAppointments.filter(
                (apt) => apt.barber?.id === barber.id
              );

              if (
                barberAppointments.length === 0 &&
                selectedBarber !== barber.id &&
                selectedBarber !== "all"
              ) {
                return null;
              }

              return (
                <div
                  key={barber.id}
                  className={`flex-shrink-0 ${
                    appointmentFilter === "booked"
                      ? "w-80 sm:w-96 lg:w-[500px]"
                      : "w-64 sm:w-72 lg:w-80"
                  } mr-4`}
                >
                  <div className="bg-black/50 rounded-t-md py-3 text-center font-semibold text-yellow-500 flex items-center justify-center gap-2">
                    <img
                      src="img/img2.png"
                      alt={`${barber.name}'s photo`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span>{barber.name}</span>
                  </div>
                  <div className="bg-black/30 rounded-b-md p-4 space-y-0 min-h-[4500px] relative">
                    {/* Grade de horários de fundo */}
                    {appointmentFilter !== "booked" &&
                      Array.from({ length: 13 }, (_, i) => i + 8).map(
                        (hour) => (
                          <div
                            key={hour}
                            className="h-[500px] border-b border-white/10"
                          >
                            <div className="h-[246px] border-b border-white/10"></div>
                            <div className="h-[246px]"></div>
                          </div>
                        )
                      )}

                    {/* Agendamentos existentes */}
                    {barberAppointments
                      .sort(
                        (a, b) =>
                          new Date(a.appointment_date).getTime() -
                          new Date(b.appointment_date).getTime()
                      )
                      .map((appointment) => {
                        const appointmentHour = new Date(
                          appointment.appointment_date
                        ).getHours();
                        const appointmentMinute = new Date(
                          appointment.appointment_date
                        ).getMinutes();
                        const topPosition =
                          appointmentFilter === "booked"
                            ? barberAppointments.indexOf(appointment) * 250 + 16
                            : (appointmentHour - 8) * 500 +
                              (appointmentMinute >= 30 ? 250 : 0) +
                              16;

                        // Calcular a altura do card baseado na duração do serviço e no filtro
                        const serviceDuration =
                          appointment.service?.duration || 30;
                        const cardHeight =
                          appointmentFilter === "booked"
                            ? 230 // Altura fixa para o modo "apenas agendados"
                            : serviceDuration >= 75
                            ? 720 // 750px para 1:30 (75+ minutos)
                            : serviceDuration >= 40
                            ? 470 // 500px para 1 hora (40-74 minutos)
                            : 230; // 230px para 30 minutos

                        if (appointmentFilter === "empty") return null;

                        return (
                          <div
                            key={appointment.id}
                            className={`absolute left-0 right-0 p-2 rounded-md border flex flex-col justify-between ${getStatusColor(
                              appointment.status || "pending"
                            )}`}
                            style={{
                              top: `${topPosition}px`,
                              height: `${cardHeight}px`,
                              margin: "8px",
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1 text-yellow-500 font-bold text-xl">
                                <Clock size={20} />
                                <span>
                                  {format(
                                    new Date(appointment.appointment_date),
                                    "HH:mm"
                                  )}
                                </span>
                              </div>
                              <span
                                className={`text-base font-medium px-3 py-1.5 rounded ${
                                  appointment.status === "confirmed"
                                    ? "bg-green-500/10 text-green-400"
                                    : appointment.status === "cancelled"
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-yellow-500/10 text-yellow-400"
                                }`}
                              >
                                {appointment.status === "confirmed"
                                  ? "Confirmado"
                                  : appointment.status === "cancelled"
                                  ? "Cancelado"
                                  : "Pendente"}
                              </span>
                            </div>
                            <div className="text-gray-300 flex flex-col gap-1 flex-1">
                              <div className="flex flex-col gap-2">
                                <h4 className="font-semibold text-white text-xl">
                                  {appointment.client_name}
                                </h4>
                                <div className="flex items-center gap-1 text-gray-400">
                                  <Phone size={20} />
                                  <span className="text-lg">
                                    {appointment.client_phone}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                  <Scissors size={20} />
                                  <span className="text-lg">
                                    {appointment.service?.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-500 font-semibold">
                                  <span className="text-lg">
                                    R$ {appointment.service?.price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Cards de "Nenhum agendamento" para todos os intervalos */}
                    {Array.from({ length: 26 }, (_, i) => {
                      const hour = Math.floor(i / 2) + 8;
                      const isHalfHour = i % 2 === 1;
                      const hasAppointment = barberAppointments.some((apt) => {
                        const aptHour = new Date(
                          apt.appointment_date
                        ).getHours();
                        const aptMinute = new Date(
                          apt.appointment_date
                        ).getMinutes();
                        const serviceDuration = apt.service?.duration || 30;

                        // Verifica se o slot atual está dentro do intervalo do agendamento
                        if (serviceDuration >= 75) {
                          // Para serviços de 75+ minutos, ocupa 1:30
                          const aptStartTime = aptHour * 60 + aptMinute;
                          const currentSlotTime =
                            hour * 60 + (isHalfHour ? 30 : 0);
                          return (
                            currentSlotTime >= aptStartTime &&
                            currentSlotTime < aptStartTime + 90 // 90 minutos = 1:30
                          );
                        } else if (serviceDuration >= 40) {
                          // Para serviços de 40-74 minutos, ocupa 1 hora
                          const aptStartTime = aptHour * 60 + aptMinute;
                          const currentSlotTime =
                            hour * 60 + (isHalfHour ? 30 : 0);
                          return (
                            currentSlotTime >= aptStartTime &&
                            currentSlotTime < aptStartTime + 60 // 60 minutos = 1 hora
                          );
                        }

                        // Para serviços de 30 minutos, verifica apenas o slot exato
                        return (
                          aptHour === hour &&
                          ((isHalfHour && aptMinute >= 30) ||
                            (!isHalfHour && aptMinute < 30))
                        );
                      });

                      if (hasAppointment && appointmentFilter === "empty")
                        return null;
                      if (!hasAppointment && appointmentFilter === "booked")
                        return null;

                      if (hasAppointment) return null;

                      return (
                        <div
                          key={`${hour}-${isHalfHour ? "30" : "00"}`}
                          className="absolute left-0 right-0 p-2 rounded-md border bg-blue-500/10 text-blue-500 border-yellow-500/20 h-[230px] flex items-center justify-center"
                          style={{
                            top: `${
                              (hour - 8) * 500 + (isHalfHour ? 250 : 0) + 16
                            }px`,
                            margin: "8px",
                          }}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Calendar size={30} />
                            <span className="text-xl font-medium">
                              Nenhum agendamento
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Novo Usuário */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black/90 rounded-lg p-4 sm:p-6 max-w-md w-full border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-yellow-500">
                Novo Usuário
              </h2>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-md text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm sm:text-base"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creatingUser}
                className="w-full bg-yellow-500 text-black py-2 rounded-md hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-semibold text-sm sm:text-base"
              >
                {creatingUser ? "Criando..." : "Criar Usuário"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
