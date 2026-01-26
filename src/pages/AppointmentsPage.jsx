import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import BarberCard from '../components/ui/BarberCard.jsx';
import Toast from '../components/ui/Toast.jsx';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import PaymentChoiceModal from '../components/ui/PaymentChoiceModal.jsx';
import ProductsModal from '../components/ui/ProductsModal.jsx';
import SuccessModal from '../components/ui/SuccessModal.jsx';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';
import { getSession, logout } from '../services/authService.js';
import { getBarbers } from '../services/barberServices.js';
import { getAllServices } from '../services/serviceServices.js';
import { getAppointments, createAppointment, deleteAppointment } from '../services/appointmentService.js';
import { criarPagamentoAgendamento, buscarPagamentoAgendamento } from '../services/paymentService.js';
import './AuthPages.css';

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getSession();

  const [view, setView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentPayments, setAppointmentPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState(null);
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('current');
  
  // Novo estado para serviço pré-selecionado
  const [preSelectedService, setPreSelectedService] = useState(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;

  const hasActiveSubscription = useMemo(() => {
    return userSubscriptions.some(sub => 
      sub.userId === currentUser?.id && sub.status === 'active'
    );
  }, [userSubscriptions, currentUser?.id]);

  // Processar serviço pré-selecionado da navegação
  useEffect(() => {
    if (location.state?.preSelectedService) {
      const preSelected = location.state.preSelectedService;
      setPreSelectedService(preSelected);
      
      // Limpa o estado da navegação
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = useCallback(async () => {
    try {
      const [barbersData, servicesData, productsData, appointmentsData, subscriptionsData] = await Promise.all([
        getBarbers(),
        getAllServices(),
        fetch('http://localhost:3000/products').then(res => res.json()),
        getAppointments(),
        fetch('http://localhost:3000/subscriptions').then(res => res.json())
      ]);

      setBarbers(barbersData);
      setServices(servicesData);
      setProducts(productsData);
      setAppointments(appointmentsData);
      setUserSubscriptions(subscriptionsData);

      const userAppointments = appointmentsData.filter(apt => apt.clientId === currentUser?.id);
      const paymentsMap = {};
      
      for (const apt of userAppointments) {
        const payment = await buscarPagamentoAgendamento(apt.id);
        if (payment) {
          paymentsMap[apt.id] = payment;
        }
      }
      
      setAppointmentPayments(paymentsMap);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.role === 'barber') {
      navigate('/barber');
      return;
    }

    loadData();
  }, [currentUser, navigate, loadData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const generateTimes = () => {
    const times = [];
    let hour = 8;
    let minute = 0;

    while (hour < 19) {
      const h = String(hour).padStart(2, '0');
      const m = String(minute).padStart(2, '0');
      times.push(`${h}:${m}`);

      minute += 30;
      if (minute >= 60) {
        minute = 0;
        hour += 1;
      }
    }

    return times;
  };

  const getBookedSlots = useCallback((barberId, date) => {
    if (!date) return [];
    
    const dateStr = date.toLocaleDateString('en-CA');
    
    return appointments
      .filter(apt => apt.barberId === barberId && apt.date === dateStr)
      .flatMap(apt => {
        let totalDuration = 30;
        
        if (Array.isArray(apt.services) && apt.services.length > 0) {
          totalDuration = apt.services.reduce((sum, s) => {
            if (s.duration) return sum + s.duration;
            if (typeof s.name === 'string' && 
                (s.name.toLowerCase().includes('corte') || s.name.toLowerCase().includes('barba'))) {
              return sum + 60;
            }
            return sum + 30;
          }, 0);
        }

        const slots = totalDuration / 30;
        const result = [];
        let [h, m] = apt.time.split(':').map(Number);

        for (let i = 0; i < slots; i++) {
          const hh = String(h).padStart(2, '0');
          const mm = String(m).padStart(2, '0');
          result.push(`${hh}:${mm}`);

          m += 30;
          if (m >= 60) {
            m = 0;
            h += 1;
          }
        }

        return result;
      });
  }, [appointments]);

  const getAvailableTimes = useCallback((barberId, date) => {
    if (!date) return [];

    const allTimes = generateTimes();
    const dateStr = date.toLocaleDateString('en-CA');
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const isToday = dateStr === todayStr;

    let currentHour = 0;
    let currentMinute = 0;

    if (isToday) {
      currentHour = today.getHours();
      currentMinute = today.getMinutes();
    }

    const bookedTimes = appointments
      .filter(apt => apt.barberId === barberId && apt.date === dateStr)
      .map(apt => apt.time);

    return allTimes.filter(time => {
      if (bookedTimes.includes(time)) return false;

      if (isToday) {
        const [hour, minute] = time.split(':').map(Number);
        
        if (hour < currentHour) return false;
        if (hour === currentHour && minute <= currentMinute) return false;
      }

      return true;
    });
  }, [appointments]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, []);

  const calculateTotal = useCallback((services) => {
    const total = services.reduce((sum, s) => {
      const priceStr = s.price || 0;
      const cleanPrice = priceStr.toString().replace(/R\$/g, '');
      const normalized = cleanPrice.replace(',', '.');
      const numeric = parseFloat(normalized);
      return sum + (isNaN(numeric) ? 0 : numeric);
    }, 0);
    
    return parseFloat(total.toFixed(2));
  }, []);

  const handleBook = useCallback(async (bookingData) => {
    try {
      if (!selectedDate) {
        showToast('Selecione uma data.', 'danger');
        return;
      }

      const dateStr = selectedDate.toLocaleDateString('en-CA');
      const availableTimes = getAvailableTimes(bookingData.barberId, selectedDate);

      if (!availableTimes.includes(bookingData.time)) {
        showToast('Este horário não está mais disponível. Por favor, selecione outro.', 'danger');
        await loadData();
        return;
      }

      const servicePrice = calculateTotal(bookingData.services);

      setPendingBookingData({
        ...bookingData,
        date: dateStr,
        servicePrice,
        dateFormatted: selectedDate.toLocaleDateString('pt-BR')
      });

      setShowProductsModal(true);
    } catch (error) {
      showToast('Erro ao realizar agendamento.', 'danger');
    }
  }, [selectedDate, getAvailableTimes, showToast, loadData, calculateTotal]);

  const handleProductsConfirm = useCallback((data) => {
    if (!pendingBookingData) return;

    setPurchaseData(data);
    setShowProductsModal(false);

    if (data.products.length === 0 && data.hasActiveSubscription) {
      handleDirectConfirmation();
      return;
    }

    setShowPaymentChoiceModal(true);
  }, [pendingBookingData]);

  const handleDirectConfirmation = useCallback(async () => {
    try {
      if (!pendingBookingData) return;

      const newAppointment = {
        barberId: pendingBookingData.barberId,
        barberName: pendingBookingData.barberName,
        services: pendingBookingData.services,
        date: pendingBookingData.date,
        time: pendingBookingData.time,
        client: currentUser.name,
        clientId: currentUser.id,
        products: []
      };

      const createdAppointment = await createAppointment(newAppointment);

      const serviceNames = pendingBookingData.services.map(s => s.name).join(', ');

      const paymentData = {
        appointmentId: createdAppointment.id,
        userId: currentUser.id,
        userName: currentUser.name,
        amount: 0,
        serviceName: serviceNames,
        barberName: pendingBookingData.barberName,
        appointmentDate: pendingBookingData.date,
        appointmentTime: pendingBookingData.time,
        products: [],
        status: 'plancovered',
        paymentMethod: 'subscription'
      };

      await criarPagamentoAgendamento(paymentData);
      await loadData();

      setSuccessData({
        title: 'Agendamento Confirmado!',
        message: 'Seu agendamento foi confirmado! Coberto pelo seu plano ativo.',
        details: [
          { label: 'Barbeiro', value: pendingBookingData.barberName },
          { label: 'Data', value: pendingBookingData.dateFormatted },
          { label: 'Horário', value: pendingBookingData.time },
          { label: 'Serviços', value: serviceNames }
        ]
      });

      setShowSuccessModal(true);
      setPendingBookingData(null);
      setPurchaseData(null);
      setView('myAppointments');
    } catch (error) {
      showToast('Erro ao realizar agendamento.', 'danger');
    }
  }, [pendingBookingData, currentUser, loadData, showToast]);

  const handlePaymentChoice = useCallback(async (payNow) => {
    try {
      if (!pendingBookingData || !purchaseData) return;

      if (payNow) {
        const serviceNames = pendingBookingData.services.map(s => s.name).join(', ');
        const productNames = purchaseData.products
          .map(p => `${p.name} x${p.quantity}`)
          .join(', ');
        
        const fullDescription = productNames 
          ? `${serviceNames}, ${productNames}` 
          : serviceNames;

        const paymentPlan = {
          id: `temp-${Date.now()}`,
          name: fullDescription,
          price: purchaseData.finalTotal
        };

        setSelectedAppointmentForPayment({
          ...paymentPlan,
          isAppointment: true,
          needsCreation: true,
          appointmentData: {
            barberId: pendingBookingData.barberId,
            barberName: pendingBookingData.barberName,
            services: pendingBookingData.services,
            date: pendingBookingData.date,
            time: pendingBookingData.time,
            client: currentUser.name,
            clientId: currentUser.id,
            products: purchaseData.products
          },
          paymentData: {
            userId: currentUser.id,
            userName: currentUser.name,
            amount: purchaseData.finalTotal,
            serviceName: serviceNames,
            barberName: pendingBookingData.barberName,
            appointmentDate: pendingBookingData.date,
            appointmentTime: pendingBookingData.time,
            products: purchaseData.products
          }
        });

        setShowPaymentChoiceModal(false);
        setPendingBookingData(null);
        setPurchaseData(null);
        setShowPaymentModal(true);
      } else {
        const newAppointment = {
          barberId: pendingBookingData.barberId,
          barberName: pendingBookingData.barberName,
          services: pendingBookingData.services,
          date: pendingBookingData.date,
          time: pendingBookingData.time,
          client: currentUser.name,
          clientId: currentUser.id,
          products: purchaseData.products
        };

        const createdAppointment = await createAppointment(newAppointment);

        const serviceNames = pendingBookingData.services.map(s => s.name).join(', ');

        const paymentData = {
          appointmentId: createdAppointment.id,
          userId: currentUser.id,
          userName: currentUser.name,
          amount: purchaseData.finalTotal,
          serviceName: serviceNames,
          barberName: pendingBookingData.barberName,
          appointmentDate: pendingBookingData.date,
          appointmentTime: pendingBookingData.time,
          products: purchaseData.products,
          status: 'pendinglocal',
          paymentMethod: 'local'
        };

        await criarPagamentoAgendamento(paymentData);
        await loadData();

        const productInfo = purchaseData.products.length > 0 
          ? `${purchaseData.products.length} produto(s)` 
          : '';

        setSuccessData({
          title: 'Agendamento Confirmado!',
          message: 'Seu agendamento foi confirmado! O pagamento será realizado no estabelecimento.',
          details: [
            { label: 'Barbeiro', value: pendingBookingData.barberName },
            { label: 'Data', value: pendingBookingData.dateFormatted },
            { label: 'Horário', value: pendingBookingData.time },
            { label: 'Serviços', value: `${serviceNames}${productInfo}` },
            { label: 'Total', value: `R$ ${purchaseData.finalTotal.toFixed(2)}` }
          ]
        });

        setShowSuccessModal(true);
        setShowPaymentChoiceModal(false);
        setPendingBookingData(null);
        setPurchaseData(null);
        setView('myAppointments');
      }
    } catch (error) {
      showToast('Erro ao realizar agendamento.', 'danger');
    }
  }, [pendingBookingData, purchaseData, currentUser, loadData, showToast]);

  const handlePaymentSuccess = useCallback(async () => {
    await loadData();
    setShowPaymentModal(false);
    setSelectedAppointmentForPayment(null);
    setView('myAppointments');
  }, [loadData]);

  const handleDeleteClick = useCallback((id) => {
    setAppointmentToDelete(id);
    setShowConfirmModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteAppointment(appointmentToDelete);
      await loadData();
      showToast('Agendamento cancelado com sucesso!', 'success');
      setAppointmentToDelete(null);
    } catch (error) {
      showToast('Erro ao cancelar agendamento.', 'danger');
    }
  }, [appointmentToDelete, loadData, showToast]);

  const myAppointments = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return appointments.filter(apt => {
      if (apt.clientId !== currentUser?.id) return false;

      const aptDate = new Date(apt.date + 'T00:00:00');
      const aptMonth = aptDate.getMonth();
      const aptYear = aptDate.getFullYear();

      if (appointmentFilter === 'current') {
        return aptMonth === currentMonth && aptYear === currentYear;
      } else if (appointmentFilter === 'upcoming') {
        if (aptYear > currentYear) return true;
        if (aptYear === currentYear && aptMonth > currentMonth) return true;
        return false;
      } else {
        return true;
      }
    });
  }, [appointments, currentUser?.id, appointmentFilter]);

  const sortedMyAppointments = useMemo(() => {
    return [...myAppointments].sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.time);
      const dateB = new Date(b.date + 'T' + b.time);
      return dateB - dateA;
    });
  }, [myAppointments]);

  if (loading) {
    return (
      <BaseLayout>
        <div className="auth">
          <div className="auth-card">
            <p>Carregando...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth-card" style={{ maxWidth: '100%', padding: '2rem' }}>
          <div className="appointments-header">
            <div>
              <h1 className="auth-title">Agendamentos</h1>
              <p className="auth-subtitle">
                Usuário: {currentUser?.name}
                {isAdmin && <span style={{ marginLeft: '10px', color: '#d4af37' }}>(Admin)</span>}
              </p>
            </div>
            <div className="admin-header-actions">
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="btn-header">
                  Painel Admin
                </button>
              )}
              <button className="btn-header btn-header-logout" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </div>

          <div className="appointments-tabs">
            <button 
              onClick={() => setView('calendar')} 
              className={`tab-btn ${view === 'calendar' ? 'tab-btn--active' : ''}`}
            >
              Novo Agendamento
            </button>
            <button 
              onClick={() => setView('myAppointments')} 
              className={`tab-btn ${view === 'myAppointments' ? 'tab-btn--active' : ''}`}
            >
              Meus Agendamentos ({myAppointments.length})
            </button>
          </div>

          {view === 'calendar' && (
            <div className="appointments-booking">
              <h2>Selecione uma data</h2>
              <DatePicker 
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
              />

              {selectedDate && (
                <div className="appointments-barbers">
                  <h2>Barbeiros disponíveis em {selectedDate.toLocaleDateString('pt-BR')}</h2>
                  {barbers.length === 0 ? (
                    <p>Nenhum barbeiro disponível.</p>
                  ) : (
                    barbers.map(barber => {
                      const barberWithPhoto = {
                        ...barber,
                        photo: barber.photo || barber.avatar || `https://i.pravatar.cc/150?img=${barber.id}`
                      };

                      const allTimes = generateTimes();
                      const bookedSlots = getBookedSlots(barber.id, selectedDate);
                      const availableTimes = getAvailableTimes(barber.id, selectedDate);

                      return (
                        <BarberCard
                          key={barber.id}
                          barber={barberWithPhoto}
                          services={services}
                          availableTimes={availableTimes}
                          allTimes={allTimes}
                          bookedSlots={bookedSlots}
                          onBook={handleBook}
                          showToast={showToast}
                          preSelectedService={preSelectedService}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'myAppointments' && (
            <div className="appointments-list">
              <h2>Seus Agendamentos</h2>
              
              <div className="appointments-filter-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #333' }}>
                <button 
                  onClick={() => setAppointmentFilter('current')} 
                  className={`tab-btn ${appointmentFilter === 'current' ? 'tab-btn--active' : ''}`}
                >
                  Este Mês ({appointments.filter(apt => {
                    const aptDate = new Date(apt.date + 'T00:00:00');
                    const today = new Date();
                    return apt.clientId === currentUser?.id && 
                           aptDate.getMonth() === today.getMonth() && 
                           aptDate.getFullYear() === today.getFullYear();
                  }).length})
                </button>
                <button 
                  onClick={() => setAppointmentFilter('upcoming')} 
                  className={`tab-btn ${appointmentFilter === 'upcoming' ? 'tab-btn--active' : ''}`}
                >
                  Próximos ({appointments.filter(apt => {
                    const aptDate = new Date(apt.date + 'T00:00:00');
                    const today = new Date();
                    return apt.clientId === currentUser?.id && 
                           (aptDate.getFullYear() > today.getFullYear() || 
                            (aptDate.getFullYear() === today.getFullYear() && aptDate.getMonth() > today.getMonth()));
                  }).length})
                </button>
                <button 
                  onClick={() => setAppointmentFilter('all')} 
                  className={`tab-btn ${appointmentFilter === 'all' ? 'tab-btn--active' : ''}`}
                >
                  Todos ({appointments.filter(apt => apt.clientId === currentUser?.id).length})
                </button>
              </div>

              {sortedMyAppointments.length === 0 ? (
                <div className="appointments-empty">
                  <div className="appointments-empty-icon"></div>
                  <p>Você não tem agendamentos.</p>
                </div>
              ) : (
                <div className="appointments-table-container">
                  <table className="appointments-table">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Barbeiro</th>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Serviços</th>
                        <th>Produtos</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMyAppointments.map(apt => {
                        const payment = appointmentPayments[apt.id];
                        const isPending = payment && payment.status === 'pending';
                        const isPendingLocal = payment && payment.status === 'pendinglocal';
                        const isPaid = payment && payment.status === 'paid';
                        const isPlanCovered = payment && payment.status === 'plancovered';

                        const appointmentDate = new Date(apt.date + 'T00:00:00');
                        const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

                        const total = (Array.isArray(apt.services) 
                          ? apt.services.reduce((sum, s) => {
                              const price = typeof s.price === 'string' 
                                ? parseFloat(s.price.replace('R$', '').replace(',', '.').trim())
                                : s.price || 0;
                              return sum + price;
                            }, 0) 
                          : 0) + 
                          (apt.products && apt.products.length > 0 
                            ? apt.products.reduce((sum, p) => {
                                const price = typeof p.price === 'string'
                                  ? parseFloat(p.price.replace('R$', '').replace(',', '.').trim())
                                  : p.price || 0;
                                return sum + (price * (p.quantity || 1));
                              }, 0)
                            : 0);

                        let statusClass = 'pending';
                        let statusText = 'Pendente';

                        if (isPaid) {
                          statusClass = 'paid';
                          statusText = 'Pago';
                        } else if (isPendingLocal) {
                          statusClass = 'pending-local';
                          statusText = 'Pagar no Local';
                        } else if (isPlanCovered) {
                          statusClass = 'plan-covered';
                          statusText = 'Plano Ativo';
                        }

                        const barber = barbers.find(b => b.id === apt.barberId);
                        const barberPhoto = barber 
                          ? (barber.photo || barber.avatar || `https://i.pravatar.cc/150?img=${barber.id}`)
                          : `https://i.pravatar.cc/150?img=${apt.barberId}`;

                        return (
                          <tr key={apt.id}>
                            <td>
                              <div className="appointment-barber">
                                <img 
                                  src={barberPhoto} 
                                  alt={apt.barberName}
                                  className="appointment-barber-avatar"
                                  onError={(e) => { e.target.src = `https://i.pravatar.cc/150?img=${apt.barberId}`; }}
                                />
                                <span className="appointment-barber-name">{apt.barberName}</span>
                              </div>
                            </td>
                            <td>
                              <span className="appointment-date">{formattedDate}</span>
                            </td>
                            <td>
                              <span className="appointment-time">{apt.time}</span>
                            </td>
                            <td>
                              <div className="appointment-services">
                                {Array.isArray(apt.services) ? (
                                  apt.services.map((service, idx) => (
                                    <div key={idx} className="appointment-service-item">
                                      {service.name}
                                    </div>
                                  ))
                                ) : (
                                  <div className="appointment-service-item">-</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="appointment-products">
                                {apt.products && apt.products.length > 0 ? (
                                  apt.products.map((product, idx) => (
                                    <div key={idx} className="appointment-product-item">
                                      {product.name} x{product.quantity}
                                    </div>
                                  ))
                                ) : (
                                  <div className="appointment-product-item">-</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="appointment-total">
                                {total > 0 ? `R$ ${total.toFixed(2)}` : 'Grátis'}
                              </span>
                            </td>
                            <td className="appointment-status-cell">
                              <span className={`appointment-status ${statusClass}`}>
                                {statusText}
                              </span>
                            </td>
                            <td>
                              <div className="appointment-actions">
                                <button 
                                  onClick={() => handleDeleteClick(apt.id)}
                                  className="btn-action cancel"
                                >
                                  Cancelar
                                </button>
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
          )}
        </div>
      </section>

      <ProductsModal
        isOpen={showProductsModal}
        onClose={() => {
          setShowProductsModal(false);
          setPendingBookingData(null);
        }}
        products={products}
        onConfirm={handleProductsConfirm}
        hasActiveSubscription={hasActiveSubscription}
        servicePrice={pendingBookingData?.servicePrice || 0}
      />

      <PaymentChoiceModal
        isOpen={showPaymentChoiceModal}
        onClose={() => {
          setShowPaymentChoiceModal(false);
          setPendingBookingData(null);
          setPurchaseData(null);
        }}
        onChoose={handlePaymentChoice}
        appointmentDetails={pendingBookingData ? {
          barberName: pendingBookingData.barberName,
          date: pendingBookingData.dateFormatted,
          time: pendingBookingData.time,
          serviceName: pendingBookingData.services.map(s => s.name).join(', ')
        } : null}
        purchaseData={purchaseData}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successData?.title}
        message={successData?.message}
        details={successData?.details}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setAppointmentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Cancelar Agendamento"
        message="Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
        confirmText="Sim, cancelar"
        cancelText="Não, manter"
        variant="danger"
      />

      {showPaymentModal && selectedAppointmentForPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedAppointmentForPayment(null);
          }}
          selectedPlan={selectedAppointmentForPayment}
          currentUser={currentUser}
          onSuccess={handlePaymentSuccess}
          isAppointmentPayment={true}
          paymentId={selectedAppointmentForPayment.paymentId}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </BaseLayout>
  );
}
