import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout';
import Toast from '../components/ui/Toast';
import { getSession, logout } from '../services/authService';
import { getUserById } from '../services/userServices';
import { getAppointments, updateAppointment } from '../services/appointmentService';
import { getBarbers } from '../services/barberServices';
import './AuthPages.css';

export default function BarberPage() {
  const navigate = useNavigate();
  const currentUser = getSession();
  const [appointments, setAppointments] = useState([]);
  const [barberProfile, setBarberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filter, setFilter] = useState('today');
  const [notificationSent, setNotificationSent] = useState(new Set());
  const [activeTab, setActiveTab] = useState('appointments');
  const [earningsFilter, setEarningsFilter] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const isBarber = currentUser?.role === 'barber';

  async function loadData() {
    try {
      const [appointmentsData, barbersData] = await Promise.all([getAppointments(), getBarbers()]);
      const barber = barbersData.find(b => b.userId === currentUser?.id);
      setBarberProfile(barber);
      if (barber) {
        setAppointments(appointmentsData.filter(apt => apt.barberId === barber.id));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) return navigate('/login');
    if (!isBarber) return navigate('/appointments');
    loadData();
  }, []);

  
  useEffect(() => {
    const checkUpcomingAppointments = () => {
      const now = new Date();
      getFilteredAppointments().forEach(apt => {
        const [hours, minutes] = apt.time.split(':').map(Number);
        const appointmentDate = new Date(apt.date + 'T00:00:00');
        appointmentDate.setHours(hours, minutes, 0, 0);
        const diffMinutes = (appointmentDate - now) / (1000 * 60);

        if (diffMinutes <= 15 && diffMinutes >= 14 && !notificationSent.has(apt.id)) {
          sendBarberNotification(apt);
          setNotificationSent(prev => new Set([...prev, apt.id]));
        }
      });
    };

    const interval = setInterval(checkUpcomingAppointments, 30000);
    checkUpcomingAppointments();
    return () => clearInterval(interval);
  }, [appointments, notificationSent]);

  const sendBarberNotification = async (appointment) => {
    try {
      const userData = await getUserById(appointment.clientId);
      const clientName = userData?.name || appointment.client;
      const clientPhone = userData?.phone || 'Não cadastrado';
      const message = `🔔 PRÓXIMO CLIENTE EM 15 MINUTOS!\n\nCliente: ${clientName}\nHorário: ${appointment.time}\nServiço: ${appointment.services.map(s => s.name).join(', ')}\nTelefone: ${clientPhone}`;
      
      if (currentUser?.phone) {
        const barberPhone = currentUser.phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${barberPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }
      showToast('Notificação: Próximo cliente em 15 minutos!', 'info');
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };


  const sendWhatsAppToClient = async (appointmentId, type = 'confirm') => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (!appointment) return;

      const userData = await getUserById(appointment.clientId);
      const rawPhone = userData?.phone || appointment.clientPhone;
      if (!rawPhone) return showToast('Cliente não possui telefone cadastrado.', 'danger');

      const phone = rawPhone.replace(/\D/g, '');
      const date = new Date(appointment.date + 'T00:00:00').toLocaleDateString('pt-BR');
      const serviceName = Array.isArray(appointment.services) 
        ? appointment.services.map(s => s.name).join(', ') 
        : 'Serviço';

      const messages = {
        confirm: `Olá ${appointment.client}!\n\nGostaria de CONFIRMAR seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${appointment.time}\n✂️ Serviço: ${serviceName}\n👨‍🦰 Barbeiro: ${appointment.barberName}\n\nPor favor, responda esta mensagem para confirmar sua presença.\n\n✨ ADDEV Barbearia`,
        reminder: `Olá ${appointment.client}!\n\n⏰ LEMBRETE do seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${appointment.time}\n✂️ Serviço: ${serviceName}\n👨‍🦰 Barbeiro: ${appointment.barberName}\n\nTe esperamos!\n\n✨ ADDEV Barbearia`
      };

      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(messages[type])}`, '_blank');
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
    const today = now.toLocaleDateString('en-CA');

    let filtered = [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });

    if (filter === 'today') filtered = filtered.filter(apt => apt.date === today);
    if (filter === 'upcoming') filtered = filtered.filter(apt => new Date(`${apt.date}T${apt.time}`) >= now);

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

      return appointments.filter(apt => {
        const aptDate = new Date(apt.date + 'T00:00:00');
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
    }

    if (earningsFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return appointments.filter(apt => {
        const aptDate = new Date(apt.date + 'T00:00:00');
        return aptDate >= monthStart && aptDate <= monthEnd;
      });
    }

    if (earningsFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00');
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate + 'T00:00:00');
      end.setHours(23, 59, 59, 999);
      return appointments.filter(apt => {
        const aptDate = new Date(apt.date + 'T00:00:00');
        return aptDate >= start && aptDate <= end;
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

    return {
      totalRevenue,
      totalServices,
      appointmentsCount: filtered.length,
      commissionPercent,
      barberEarnings,
      shopEarnings,
      filteredAppointments: filtered
    };
  };


  const showToast = (message, type = 'success') => setToast({ show: true, message, type });
  const closeToast = () => setToast({ show: false, message: '', type: 'success' });
  const handleLogout = () => { logout(); navigate('/login'); };

  const filteredAppointments = getFilteredAppointments();
  const todayAppointments = appointments.filter(apt => apt.date === new Date().toLocaleDateString('en-CA'));
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
              <button className="btn-header btn-header-logout" onClick={handleLogout}>Sair</button>
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
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map(apt => {
                          const appointmentDateTime = new Date(`${apt.date}T${apt.time}`);
                          const isPast = appointmentDateTime < new Date();
                          const isCompleted = apt.status === 'completed';
                          const isConfirmed = apt.status === 'confirmed';

                          return (
                            <tr key={apt.id} className={`${isCompleted ? 'row-completed' : ''} ${isPast && !isCompleted ? 'row-past' : ''} ${isConfirmed ? 'row-confirmed' : ''}`}>
                              <td><strong>{apt.client}</strong></td>
                              <td>{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                              <td><span className="appointment-time">{apt.time}</span></td>
                              <td>
                                <div className="services-list-compact">
                                  {apt.services.map((service, idx) => (
                                    <div key={idx} className="service-item-compact">{service.name}</div>
                                  ))}
                                </div>
                              </td>
                              <td><span className="client-phone">{apt.clientPhone || '-'}</span></td>
                              <td>
                                {isCompleted ? (
                                  <span className="status-badge status-completed">Finalizado</span>
                                ) : isConfirmed ? (
                                  <span className="status-badge status-confirmed">Confirmado</span>
                                ) : (
                                  <span className="status-badge status-pending">Pendente</span>
                                )}
                              </td>
                              <td>
                                <div className="barber-table-actions">
                                  {!isCompleted && (
                                    <>
                                      {!isConfirmed && (
                                        <button onClick={() => handleConfirmAppointment(apt.id)} className="action-btn-table btn-confirm-table">
                                          Confirmar
                                        </button>
                                      )}
                                      <button onClick={() => sendWhatsAppToClient(apt.id, 'confirm')} className="action-btn-table btn-whatsapp-table">
                                        💬 Enviar Mensagem
                                      </button>
                                      <button onClick={() => sendWhatsAppToClient(apt.id, 'reminder')} className="action-btn-table btn-reminder-table">
                                        🔔 Lembrete
                                      </button>
                                      {!isPast && (
                                        <button onClick={() => handleCompleteAppointment(apt.id)} className="action-btn-table btn-complete-table">
                                          ✅ Finalizar
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
                      <span className="stat-label">Sua Comissão ({stats.commissionPercent}%)</span>
                      <span className="stat-value stat-value-success">R$ {stats.barberEarnings.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Barbearia</span>
                      <span className="stat-value">R$ {stats.shopEarnings.toFixed(2)}</span>
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
                        {stats.filteredAppointments.sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)).map(apt => {
                          const aptTotal = calculateTotal(apt.services);
                          const barberEarning = (aptTotal * stats.commissionPercent) / 100;

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
                              <td><strong>{apt.client}</strong></td>
                              <td>{new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                              <td>{apt.time}</td>
                              <td>
                                <div className="services-list">
                                  {apt.services.map((service, idx) => (
                                    <span key={idx} className="service-pill">{service.name}</span>
                                  ))}
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