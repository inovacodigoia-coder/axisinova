import { useMemo } from 'react';
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro';
import { useScheduling } from '@/context/SchedulingContext';
import { useAuth } from '@/context/AuthContext';
import { 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  parseISO, 
  startOfWeek, 
  endOfWeek,
  subDays,
  format,
  eachDayOfInterval
} from 'date-fns';

export function useLabDashboardData() {
  const { user } = useAuth();
  const { orders, loading: ordersLoading } = useAttendanceCadastro();
  const { appointments } = useScheduling();

  const loading = ordersLoading;

  const stats = useMemo(() => {
    if (loading) return null;

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfW = startOfWeek(today, { weekStartsOn: 1 });
    const endOfW = endOfWeek(today, { weekStartsOn: 1 });

    // 1. Atendimentos Hoje (Lab specific)
    const todayOrders = orders.filter(o => {
      const date = parseISO(o.registeredAt);
      return o.examMode === 'lab' && isWithinInterval(date, { start: startOfToday, end: endOfToday });
    });

    const yesterdayOrders = orders.filter(o => {
      const date = parseISO(o.registeredAt);
      const yesterday = subDays(today, 1);
      return o.examMode === 'lab' && isWithinInterval(date, { start: startOfDay(yesterday), end: endOfDay(yesterday) });
    });

    const todayChange = yesterdayOrders.length > 0 
      ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 
      : todayOrders.length > 0 ? 100 : 0;

    // 2. Pacientes Ativos (Unique patients in lab orders)
    const activePatients = new Set(orders.filter(o => o.examMode === 'lab').map(o => o.patientId)).size;
    
    // 3. Agenda da Semana (Lab appointments)
    const weekAppointments = appointments.filter(a => {
      const date = parseISO(a.date);
      return isWithinInterval(date, { start: startOfW, end: endOfW });
    });

    // 4. Faturamento Mensal (Estimated from private lab orders)
    const currentMonthOrders = orders.filter(o => {
      const date = parseISO(o.registeredAt);
      return o.examMode === 'lab' && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    });
    const monthlyRevenue = currentMonthOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (o.privateValue || 0), 0);

    // Chart Data: Atendimentos da Semana
    const days = eachDayOfInterval({ start: startOfW, end: endOfW });
    const weeklyChartData = days.map(day => {
      const count = orders.filter(o => {
        const date = parseISO(o.registeredAt);
        return o.examMode === 'lab' && isWithinInterval(date, { start: startOfDay(day), end: endOfDay(day) });
      }).length;
      return {
        day: format(day, 'EEE'),
        atendimentos: count
      };
    });

    // Chart Data: Faturamento (last 6 months)
    const monthlyRevenueData = Array.from({ length: 6 }).map((_, i) => {
      const date = subDays(today, (5 - i) * 30);
      const monthOrders = orders.filter(o => {
        const d = parseISO(o.registeredAt);
        return o.examMode === 'lab' && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      return {
        month: format(date, 'MMM'),
        valor: monthOrders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (o.privateValue || 0), 0)
      };
    });

    // Upcoming appointments/orders
    const upcoming = orders
      .filter(o => o.examMode === 'lab' && o.status === 'open' || o.status === 'waiting_collection')
      .slice(0, 5)
      .map(o => ({
        time: format(parseISO(o.registeredAt), 'HH:mm'),
        patient: o.patientName,
        doctor: o.doctorName || o.requestingDoctor || '—',
        type: 'Exame',
        status: o.status
      }));

    return {
      metrics: [
        { label: 'Atendimentos Hoje', value: todayOrders.length.toString(), change: yesterdayOrders.length > 0 ? `${todayChange > 0 ? '+' : ''}${todayChange.toFixed(0)}%` : '', type: 'today' },
        { label: 'Pacientes Ativos', value: activePatients.toLocaleString('pt-BR'), change: '', type: 'patients' },
        { label: 'Agenda da Semana', value: weekAppointments.length.toString(), change: '', type: 'agenda' },
        { label: 'Faturamento Mensal', value: `R$ ${monthlyRevenue.toLocaleString('pt-BR')}`, change: '', type: 'revenue' },
      ],
      weeklyChartData,
      monthlyRevenueData,
      upcoming
    };
  }, [loading, orders, appointments]);

  return { stats, loading };
}
