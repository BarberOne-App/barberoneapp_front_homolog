import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout';
import Toast from '../components/ui/Toast';
import { getSession, getToken, logout } from '../services/authService';
import { getUserById } from '../services/userServices';
import { getAppointments, updateAppointment } from '../services/appointmentService';
import { getBarbers } from '../services/barberServices';
import './AuthPages.css';

export default function BarberPage() {
  const navigate = useNavigate();
  const currentUser = getSession();
  const [appointments, setAppointments] = useState([]);
  const [employeePayments, setEmployeePayments] = useState([]);
  const [barberProfile, setBarberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filter, setFilter] = useState('today');
  const [notificationSent, setNotificationSent] = useState(new Set());
  const [activeTab, setActiveTab] = useState('appointments');
  const [earningsFilter, setEarningsFilter] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const token = getToken();
  const isBarber = currentUser?.role === 'barber';

  const parseDateOnly = (dateStr) => {
    const [year, month, day] = String(dateStr || '')
      .split('-')
      .map(Number);

    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  };

  const normalizeTimeValue = (value) => {
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return '';

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return '';
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const getAppointmentStartDate = (appointment) => {
    const rawStartAt = appointment?.startAt || appointment?.start_at;
    if (rawStartAt) {
      const parsedStartAt = new Date(rawStartAt);
      if (!Number.isNaN(parsedStartAt.getTime())) return parsedStartAt;
    }

    const rawDate = appointment?.date || appointment?.appointmentDate;
    const rawTime = normalizeTimeValue(appointment?.time || appointment?.appointmentTime);

    if (rawDate && rawTime) {
      const parsedDateTime = new Date(`${rawDate}T${rawTime}:00`);
      if (!Number.isNaN(parsedDateTime.getTime())) return parsedDateTime;
    }

    if (rawDate) {
      const parsedDateOnly = parseDateOnly(rawDate);
      if (parsedDateOnly) return parsedDateOnly;
    }

    return null;
  };

  const formatDateKey = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  };

  const getAppointmentDateKey = (appointment) => formatDateKey(getAppointmentStartDate(appointment));

  const getAppointmentTime = (appointment) => {
    const startDate = getAppointmentStartDate(appointment);
    if (startDate && !Number.isNaN(startDate.getTime())) {
      return startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    return normalizeTimeValue(appointment?.time || appointment?.appointmentTime);
  };

  const getAppointmentPhone = (appointment, userData = null) =>
    userData?.phone ||
    appointment?.client?.phone ||
    appointment?.clientPhone ||
    appointment?.client_phone ||
    appointment?.phone ||
    '';

  const getAppointmentClientName = (appointment) =>
    (typeof appointment?.client === 'string' ? appointment.client : appointment?.client?.name) ||
    appointment?.clientName ||
    'Cliente';

  const getServiceDisplayName = (service) => {
    if (!service) return '';
    if (typeof service === 'string') return service.trim();

    return (
      service?.serviceName ||
      service?.name ||
      service?.service?.name ||
      service?.service?.serviceName ||
      service?.appointmentService?.name ||
      service?.appointmentService?.serviceName ||
      service?.title ||
      ''
    );
  };

  const getAppointmentServiceNames = (appointment) => {
    const rawServices = appointment?.services;

    if (Array.isArray(rawServices)) {
      return rawServices.map((service) => getServiceDisplayName(service)).filter(Boolean);
    }

    if (rawServices && typeof rawServices === 'object') {
      const nestedItems = rawServices.items || rawServices.data || rawServices.services;
      if (Array.isArray(nestedItems)) {
        return nestedItems.map((service) => getServiceDisplayName(service)).filter(Boolean);
      }

      const singleServiceName = getServiceDisplayName(rawServices);
      if (singleServiceName) return [singleServiceName];
    }

    const fallbackNames = [
      appointment?.serviceName,
      appointment?.service?.name,
      appointment?.service?.serviceName,
    ].filter(Boolean);

    return fallbackNames;
  };

  const getAppointmentServicesLabel = (appointment) => getAppointmentServiceNames(appointment).join(', ');

  async function loadData() {
    try {
      const [appointmentsData, barbersData, employeePaymentsResponse] = await Promise.all([
        getAppointments(),
        getBarbers(),
        fetch('https://barberoneapp-back-homolog.onrender.com/employeePayments', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const employeePaymentsData = employeePaymentsResponse.ok
        ? await employeePaymentsResponse.json()
        : [];

      const barber = barbersData.find(b => b.userId === currentUser?.id);
      setBarberProfile(barber);
      setEmployeePayments(Array.isArray(employeePaymentsData) ? employeePaymentsData : []);
      if (barber) {
        setAppointments(appointmentsData.filter(apt => apt.barberId === barber.id));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const isExtraPayment = (payment) => {
    if (!payment) return false;
    const start = payment.periodStart;
    const end = payment.periodEnd;
    const salarioFixo = Number(payment.salarioFixo || 0);
    const commission = Number(payment.commission || 0);
    const totalVales = Number(payment.totalVales || 0);
    const liquido = Number(payment.liquido || 0);

    return Boolean(
      start &&
      end &&
      start === end &&
      salarioFixo > 0 &&
      commission === 0 &&
      totalVales === 0 &&
      Math.abs(salarioFixo - liquido) < 0.01
    );
  };

  const getFilteredExtraPaymentsByPeriod = () => {
    if (!Array.isArray(employeePayments)) return [];

    const base = employeePayments
      .filter(isExtraPayment)
      .filter((payment) => String(payment.employeeId) === String(currentUser?.id));

    const now = new Date();

    if (earningsFilter === 'week') {
      const today = now.getDay();
      const mondayOffset = today === 0 ? -6 : 1 - today;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return base.filter((payment) => {
        const ref = payment.paidAt || payment.periodStart;
        if (!ref) return false;
        const d = new Date(ref);
        return !Number.isNaN(d.getTime()) && d >= weekStart && d <= weekEnd;
      });
    }

    if (earningsFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return base.filter((payment) => {
        const ref = payment.paidAt || payment.periodStart;
        if (!ref) return false;
        const d = new Date(ref);
        return !Number.isNaN(d.getTime()) && d >= monthStart && d <= monthEnd;
      });
    }

    if (earningsFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T23:59:59`);
      return base.filter((payment) => {
        const ref = payment.paidAt || payment.periodStart;
        if (!ref) return false;
        const d = new Date(ref);
        return !Number.isNaN(d.getTime()) && d >= start && d <= end;
      });
    }

    return base;
  };

  useEffect(() => {
    if (!currentUser) return navigate('/login');
    if (!isBarber) return navigate('/appointments');
    loadData();
  }, []);

  
  useEffect(() => {
    const checkUpcomingAppointments = () => {
      const now = new Date();
      getFilteredAppointments().forEach((apt) => {
        const appointmentDate = getAppointmentStartDate(apt);
        if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) return;

        const diffMinutes = (appointmentDate - now) / (1000 * 60);

        if (diffMinutes <= 15 && diffMinutes >= 14 && !notificationSent.has(apt.id)) {
          sendBarberNotification(apt);
          setNotificationSent((prev) => new Set([...prev, apt.id]));
        }
      });
    };

    const interval = setInterval(checkUpcomingAppointments, 30000);
    checkUpcomingAppointments();
    return () => clearInterval(interval);
  }, [appointments, notificationSent]);

  const sendBarberNotification = async (appointment) => {
    try {
      const clientIdRaw = appointment.clientId || appointment.client?.id;
      const userData = clientIdRaw ? await getUserById(clientIdRaw) : null;
      const clientName = userData?.name || getAppointmentClientName(appointment);
      const clientPhone = getAppointmentPhone(appointment, userData) || 'Não cadastrado';

      const startDate = getAppointmentStartDate(appointment);
      const time = startDate && !Number.isNaN(startDate.getTime())
        ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : (getAppointmentTime(appointment) || 'Horário não informado');

      const serviceName = getAppointmentServicesLabel(appointment) || 'Serviço';

      const message = `🔔 PRÓXIMO CLIENTE EM 15 MINUTOS!\n\nCliente: ${clientName}\nHorário: ${time}\nServiço: ${serviceName || 'Serviço'}\nTelefone: ${clientPhone}`;

      if (currentUser?.phone) {
        let barberPhone = currentUser.phone.replace(/\D/g, '');
        if (!barberPhone.startsWith('55')) barberPhone = `55${barberPhone}`;
        window.open(`https://wa.me/${barberPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }
      showToast('Notificação: Próximo cliente em 15 minutos!', 'info');
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };


  const sendWhatsAppToClient = async (appointmentId, type = 'confirm') => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const clientIdRaw = appointment.clientId || appointment.client?.id;
      const userData = clientIdRaw ? await getUserById(clientIdRaw) : null;
      const rawPhone = getAppointmentPhone(appointment, userData);
      if (!rawPhone) return showToast('Cliente não possui telefone cadastrado.', 'danger');

      let phone = rawPhone.replace(/\D/g, '');
      if (!phone.startsWith('55')) phone = `55${phone}`;

      const clientName = (userData?.name || getAppointmentClientName(appointment)).toLowerCase();

      const barberName =
        appointment.barberName ||
        appointment.barber?.displayName ||
        barberProfile?.displayName ||
        currentUser?.name ||
        'barbeiro';

      const startDate = getAppointmentStartDate(appointment);
      const date = startDate && !Number.isNaN(startDate.getTime())
        ? startDate.toLocaleDateString('pt-BR')
        : 'data não informada';
      const time = startDate && !Number.isNaN(startDate.getTime())
        ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : (getAppointmentTime(appointment) || 'horário não informado');

      const serviceName = getAppointmentServicesLabel(appointment) || 'Serviço';

      const messages = {
        confirm: `Olá ${clientName}!\n\nGostaria de CONFIRMAR seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${time}\n✂️ Serviço: ${serviceName}\n👨‍🦰 Barbeiro: ${barberName}\n\nPor favor, responda esta mensagem para confirmar sua presença.\n\n✨ ADDEV Barbearia`,
        reminder: `Olá ${clientName}!\n\n⏰ LEMBRETE do seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${time}\n✂️ Serviço: ${serviceName}\n👨‍🦰 Barbeiro: ${barberName}\n\nTe esperamos!\n\n✨ ADDEV Barbearia`,
      };

      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messages[type])}`, '_blank');
      showToast('WhatsApp aberto com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao abrir WhatsApp.', 'danger');
    }
  };


  const handleConfirmAppointment = async (appointmentId) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      await updateAppointment(appointmentId, { ...appointment, status: 'confirmed' });
      await loadData();
      showToast('Agendamento confirmado!', 'success');
    } catch (error) {
      showToast('Erro ao confirmar agendamento.', 'danger');
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      await updateAppointment(appointmentId, { ...appointment, status: 'completed' });
      await loadData();
      showToast('Atendimento finalizado!', 'success');
    } catch (error) {
      showToast('Erro ao finalizar atendimento.', 'danger');
    }
  };


  const getFilteredAppointments = () => {
    const now = new Date();
    const today = formatDateKey(now);

    let filtered = [...appointments].sort((a, b) => {
      const dateA = getAppointmentStartDate(a);
      const dateB = getAppointmentStartDate(b);
      const timeA = dateA && !Number.isNaN(dateA.getTime()) ? dateA.getTime() : 0;
      const timeB = dateB && !Number.isNaN(dateB.getTime()) ? dateB.getTime() : 0;
      return timeA - timeB;
    });

    if (filter === 'today') {
      filtered = filtered.filter((apt) => getAppointmentDateKey(apt) === today);
    }
    if (filter === 'upcoming') {
      filtered = filtered.filter((apt) => {
        const appointmentDate = getAppointmentStartDate(apt);
        return appointmentDate && !Number.isNaN(appointmentDate.getTime()) && appointmentDate >= now;
      });
    }

    return filtered;
  };

  const getFilteredAppointmentsByPeriod = () => {
    const now = new Date();

    if (earningsFilter === 'week') {
      const today = now.getDay();
      const mondayOffset = today === 0 ? -6 : 1 - today;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return appointments.filter((apt) => {
        const aptDate = getAppointmentStartDate(apt);
        return aptDate && !Number.isNaN(aptDate.getTime()) && aptDate >= weekStart && aptDate <= weekEnd;
      });
    }

    if (earningsFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return appointments.filter((apt) => {
        const aptDate = getAppointmentStartDate(apt);
        return aptDate && !Number.isNaN(aptDate.getTime()) && aptDate >= monthStart && aptDate <= monthEnd;
      });
    }

    if (earningsFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate + 'T00:00:00');
      end.setHours(23, 59, 59, 999);
      return appointments.filter((apt) => {
        const aptDate = getAppointmentStartDate(apt);
        return aptDate && !Number.isNaN(aptDate.getTime()) && aptDate >= start && aptDate <= end;
      });
    }

    return appointments;
  };


  const calculateTotal = (services) => {
    return services.reduce((sum, service) => {
      const price = Number(String(service.price ?? '0').replace(/[R$.\-]/g, '').replace(',', '.'));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const getPeriodLabel = () => {
    const now = new Date();

    if (earningsFilter === 'week') {
      const today = now.getDay();
      const mondayOffset = today === 0 ? -6 : 1 - today;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    }

    if (earningsFilter === 'month') {
      return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    if (earningsFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T00:00:00');
      return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    }

    return 'Todos os períodos';
  };

  const calculateBarberStats = () => {
    const filtered = getFilteredAppointmentsByPeriod();
    const filteredExtraPayments = getFilteredExtraPaymentsByPeriod();
    let totalRevenue = 0;
    let totalServices = 0;

    filtered.forEach(apt => {
      const aptTotal = calculateTotal(apt.services);
      totalRevenue += aptTotal;
      totalServices += apt.services.length;
    });

    const commissionPercent = barberProfile?.commissionPercent || 50;
    const barberEarnings = (totalRevenue * commissionPercent) / 100;
    const shopEarnings = totalRevenue - barberEarnings;
    const extraPaymentsTotal = filteredExtraPayments.reduce((sum, p) => sum + Number(p.liquido || 0), 0);

    return {
      totalRevenue,
      totalServices,
      appointmentsCount: filtered.length,
      commissionPercent,
      barberEarnings,
      shopEarnings,
      filteredAppointments: filtered,
      filteredExtraPayments,
      extraPaymentsTotal,
      totalWithExtras: barberEarnings + extraPaymentsTotal,
    };
  };


  const showToast = (message, type = 'success') => setToast({ show: true, message, type });
  const closeToast = () => setToast({ show: false, message: '', type: 'success' });
  const handleLogout = () => { logout(); navigate('/login'); };

  const filteredAppointments = getFilteredAppointments();
  const todayAppointments = appointments.filter((apt) => getAppointmentDateKey(apt) === formatDateKey(new Date()));
  const stats = calculateBarberStats();


  if (loading) {
    return (
      <BaseLayout>
        <div className="auth">
          <div className="auth-card"><p>Carregando...</p></div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth-card auth-card--wide">
      
          <div className="appointments-header">
            <div>
              <h1 className="auth-title">Painel do Barbeiro</h1>
              <p className="auth-subtitle">Bem-vindo, {barberProfile?.name || currentUser?.name}</p>
              <p className="auth-subtitle" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {todayAppointments.length} atendimentos hoje
              </p>
            </div>
            <div className="admin-header-actions">
              {/* <button className="btn-header btn-header-logout" onClick={handleLogout}>Sair</button> */}
            </div>
          </div>

          <div className="appointments-tabs">
            <button onClick={() => setActiveTab('appointments')} className={`tab-btn ${activeTab === 'appointments' ? 'tab-btn--active' : ''}`}>
              Agendamentos
            </button>
            <button onClick={() => setActiveTab('earnings')} className={`tab-btn ${activeTab === 'earnings' ? 'tab-btn--active' : ''}`}>
              Ganhos
            </button>
          </div>

          {activeTab === 'appointments' && (
            <>
              <div className="appointments-tabs" style={{ marginTop: '1rem' }}>
                <button onClick={() => setFilter('today')} className={`tab-btn ${filter === 'today' ? 'tab-btn--active' : ''}`}>
                  Hoje ({todayAppointments.length})
                </button>
                <button onClick={() => setFilter('upcoming')} className={`tab-btn ${filter === 'upcoming' ? 'tab-btn--active' : ''}`}>
                  Próximos
                </button>
                <button onClick={() => setFilter('all')} className={`tab-btn ${filter === 'all' ? 'tab-btn--active' : ''}`}>
                  Todos ({appointments.length})
                </button>
              </div>

              <div className="barber-appointments-section">
                {filteredAppointments.length === 0 ? (
                  <p className="calendar-empty">
                    {filter === 'today' ? 'Nenhum atendimento agendado para hoje.' : 'Nenhum agendamento encontrado.'}
                  </p>
                ) : (
                  <div className="fluig-table-parent" style={{ marginTop: '1.5rem' }}>
                    <table className="fluig-table-children">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Data</th>
                          <th>Horário</th>
                          <th>Serviços</th>
                          <th>Telefone</th>
                          <th className="status-column-header">Status</th>
                          <th className="actions-column-header">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map(apt => {
                          const appointmentDateTime = getAppointmentStartDate(apt);
                          const isPast = appointmentDateTime && !Number.isNaN(appointmentDateTime.getTime()) ? appointmentDateTime < new Date() : false;
                          const isCompleted = apt.status === 'completed';
                          const isConfirmed = apt.status === 'confirmed';
                          const serviceNames = getAppointmentServiceNames(apt);

                          return (
                            <tr key={apt.id} className={`${isCompleted ? 'row-completed' : ''} ${isPast && !isCompleted ? 'row-past' : ''} ${isConfirmed ? 'row-confirmed' : ''}`}>
                              <td><strong>{getAppointmentClientName(apt)}</strong></td>
                              <td>{appointmentDateTime && !Number.isNaN(appointmentDateTime.getTime()) ? appointmentDateTime.toLocaleDateString('pt-BR') : '-'}</td>
                              <td><span className="appointment-time">{getAppointmentTime(apt) || '-'}</span></td>
                              <td>
                                <div className="services-list-compact">
                                  {serviceNames.length > 0 ? (
                                    serviceNames.map((serviceName, idx) => (
                                      <div key={idx} className="service-item-compact">{serviceName}</div>
                                    ))
                                  ) : (
                                    <div className="service-item-compact">-</div>
                                  )}
                                </div>
                              </td>
                              <td><span className="client-phone">{getAppointmentPhone(apt) || '-'}</span></td>
                              <td className="status-cell">
                                <div className="status-cell-content">
                                  {isCompleted ? (
                                    <span className="status-badge status-completed">Finalizado</span>
                                  ) : isConfirmed ? (
                                    <span className="status-badge status-confirmed">Confirmado</span>
                                  ) : (
                                    <span className="status-badge status-pending">Pendente</span>
                                  )}
                                </div>
                              </td>
                              <td className="actions-cell">
                                <div className="barber-table-actions">
                                  {!isCompleted && (
                                    <>
                                      {!isConfirmed && (
                                        <button onClick={() => handleConfirmAppointment(apt.id)} className="action-btn-table btn-confirm-table">
                                          Confirmar
                                        </button>
                                      )}
                                      <button onClick={() => sendWhatsAppToClient(apt.id, 'confirm')} className="action-btn-table btn-whatsapp-table">
                                        Mensagem
                                      </button>
                                      {!isPast && (
                                        <button onClick={() => handleCompleteAppointment(apt.id)} className="action-btn-table btn-complete-table">
                                          Finalizar
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

       
          {activeTab === 'earnings' && (
            <div className="earnings-section">
              <div className="earnings-filters">
                <div className="appointments-tabs" style={{ marginBottom: '1rem', borderBottom: 'none' }}>
                  <button onClick={() => setEarningsFilter('week')} className={`tab-btn ${earningsFilter === 'week' ? 'tab-btn--active' : ''}`}>
                    Semana Atual
                  </button>
                  <button onClick={() => setEarningsFilter('month')} className={`tab-btn ${earningsFilter === 'month' ? 'tab-btn--active' : ''}`}>
                    Mês Atual
                  </button>
                  <button onClick={() => setEarningsFilter('custom')} className={`tab-btn ${earningsFilter === 'custom' ? 'tab-btn--active' : ''}`}>
                    Período Personalizado
                  </button>
                </div>

                {earningsFilter === 'custom' && (
                  <div className="custom-date-filters">
                    <div className="date-input-group">
                      <label className="form-label">Data Inicial</label>
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="form-select" style={{ maxWidth: '200px' }} />
                    </div>
                    <div className="date-input-group">
                      <label className="form-label">Data Final</label>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="form-select" style={{ maxWidth: '200px' }} />
                    </div>
                  </div>
                )}

                <div className="period-display">
                  <p className="auth-subtitle" style={{ margin: '1rem 0', fontSize: '1rem' }}>
                    Período: <strong style={{ color: 'var(--gold)' }}>{getPeriodLabel()}</strong>
                  </p>
                </div>
              </div>

              <div className="fluig-table-parent" style={{ marginTop: '1.5rem' }}>
                <div className="fluig-row-parent" style={{ cursor: 'default' }}>
                  <div className="fluig-barber-info">
                    <img src={barberProfile?.photo || `https://i.pravatar.cc/150?img=${barberProfile?.id}`} alt={barberProfile?.name} className="fluig-barber-photo" />
                    <div className="fluig-barber-details">
                      <h3 className="fluig-barber-name">{barberProfile?.name}</h3>
                      <p className="fluig-barber-specialty">{barberProfile?.specialty}</p>
                    </div>
                  </div>

                  <div className="fluig-barber-stats">
                    <div className="stat-item">
                      <span className="stat-label">Atendimentos</span>
                      <span className="stat-value">{stats.appointmentsCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Faturamento Total</span>
                      <span className="stat-value stat-value-highlight">R$ {stats.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">({stats.commissionPercent}%)</span>
                      <span className="stat-value stat-value-success">R$ {stats.barberEarnings.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pag. extras</span>
                      <span className="stat-value stat-value-success">R$ {stats.extraPaymentsTotal.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Barbearia</span>
                      <span className="stat-value">R$ {stats.shopEarnings.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total c/ extras</span>
                      <span className="stat-value stat-value-highlight">R$ {stats.totalWithExtras.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="fluig-children-container">
                  {stats.filteredAppointments.length === 0 ? (
                    <p className="no-appointments">Nenhum agendamento encontrado neste período.</p>
                  ) : (
                    <table className="fluig-table-children">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Cliente</th>
                          <th>Data</th>
                          <th>Horário</th>
                          <th>Serviços</th>
                          <th>Total</th>
                          <th>Seus Ganhos ({stats.commissionPercent}%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.filteredAppointments.sort((a, b) => { const dateA = getAppointmentStartDate(a); const dateB = getAppointmentStartDate(b); const timeA = dateA && !Number.isNaN(dateA.getTime()) ? dateA.getTime() : 0; const timeB = dateB && !Number.isNaN(dateB.getTime()) ? dateB.getTime() : 0; return timeB - timeA; }).map(apt => {
                          const aptTotal = calculateTotal(apt.services);
                          const barberEarning = (aptTotal * stats.commissionPercent) / 100;

                          const appointmentDateTime = getAppointmentStartDate(apt);
                          const serviceNames = getAppointmentServiceNames(apt);

                          return (
                            <tr key={apt.id} className={apt.status === 'confirmed' ? 'row-confirmed' : ''}>
                              <td>
                                {apt.status === 'confirmed' ? (
                                  <span className="status-badge status-confirmed">Confirmado</span>
                                ) : apt.status === 'completed' ? (
                                  <span className="status-badge status-completed">Finalizado</span>
                                ) : (
                                  <span className="status-badge status-pending">Pendente</span>
                                )}
                              </td>
                              <td><strong>{getAppointmentClientName(apt)}</strong></td>
                              <td>{appointmentDateTime && !Number.isNaN(appointmentDateTime.getTime()) ? appointmentDateTime.toLocaleDateString('pt-BR') : '-'}</td>
                              <td>{getAppointmentTime(apt) || '-'}</td>
                              <td>
                                <div className="services-list">
                                  {serviceNames.length > 0 ? (
                                    serviceNames.map((serviceName, idx) => (
                                      <span key={idx} className="service-pill">{serviceName}</span>
                                    ))
                                  ) : (
                                    <span className="service-pill">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="total-price">R$ {aptTotal.toFixed(2)}</td>
                              <td className="barber-earning">R$ {barberEarning.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {stats.filteredExtraPayments.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <h4 style={{ color: 'var(--gold)', marginBottom: '0.75rem' }}>Pagamentos extras do período</h4>
                      <table className="fluig-table-children">
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Registrado por</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.filteredExtraPayments.map((payment) => {
                            const dateRef = payment.paidAt || payment.periodStart;
                            const formattedDate = dateRef
                              ? new Date(dateRef).toLocaleDateString('pt-BR')
                              : '-';

                            return (
                              <tr key={payment.id}>
                                <td><strong>Pagamento Extra</strong></td>
                                <td>{formattedDate}</td>
                                <td className="barber-earning">R$ {Number(payment.liquido || 0).toFixed(2)}</td>
                                <td>{payment.paidByName || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </BaseLayout>
  );
}





