import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api.js';
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
import {
  getAppointments,
  createAppointment,
  deleteAppointment
} from '../services/appointmentService.js';
import {
  criarPagamentoAgendamento,
  buscarPagamentoAgendamento
} from '../services/paymentService.js';
import './AuthPages.css';
import { getToken } from "../services/authService.js";

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserRef = useRef(getSession());
  const currentUser = currentUserRef.current;

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
  const [preSelectedService, setPreSelectedService] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [observation, setObservation] = useState('');
  const [expandedObsId, setExpandedObsId] = useState(null);
  const [isBarberLocked, setIsBarberLocked] = useState(false);
  const [lockedBarberId, setLockedBarberId] = useState(null);
  const [lockedBarberName, setLockedBarberName] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [existingAppointment, setExistingAppointment] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [bookingForUser, setBookingForUser] = useState(null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const token = getToken();

  const [userDependents, setUserDependents] = useState([]);
  const [bookingForDependent, setBookingForDependent] = useState(null);
  const [showForWhomSelector, setShowForWhomSelector] = useState(false);

  const hasLoadedOnce = useRef(false);
  const pendingStockUpdate = useRef([]);
  const paymentsCache = useRef({});
  const isFetchingPayments = useRef(false);

  const clearPaymentCache = useCallback((appointmentId) => {
    if (appointmentId) {
      delete paymentsCache.current[appointmentId];
    }
  }, []);

  const clearAllPaymentsCache = useCallback(() => {
    paymentsCache.current = {};
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
  const canScheduleForOthers = isAdmin || currentUser?.permissions?.scheduleForOthers === true;


  const activeClient = bookingForDependent
    ? { id: `dep_${bookingForDependent.id}`, name: bookingForDependent.name, isDependent: true, dependentId: bookingForDependent.id }
    : bookingForUser || currentUser;

  const checkExistingAppointmentOnDate = useCallback((date) => {
    if (!date || !activeClient?.id) return null;
    const dateStr = date.toLocaleDateString('en-CA');
    const existingApt = appointments.find(
      (apt) => apt.clientId === activeClient.id && apt.date === dateStr
    );
    return existingApt || null;
  }, [appointments, activeClient?.id]);

  const hasActiveSubscription = useMemo(() => {
    if (bookingForDependent || bookingForUser) return false;
    return userSubscriptions.some(
      (sub) => sub.userId === currentUser?.id && sub.status === 'active'
    );
  }, [userSubscriptions, currentUser?.id, bookingForDependent, bookingForUser]);

  const fetchBlockedDates = useCallback(async () => {
    try {
      const response = await fetch('https://barbearia-addev-backend.onrender.com/blocked-dates', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBlockedDates(data);
    } catch (error) {
      console.error('Erro ao buscar datas bloqueadas:', error);
    }
  }, []);



  const isDateBlocked = (dateStr, barberId = null) => {
    return blockedDates.some((blocked) => {
      const matchDate = blocked.date === dateStr;
      const matchBarber = !blocked.barberId || blocked.barberId === barberId;
      const isDayBlock = !blocked.startTime;
      return matchDate && matchBarber && isDayBlock;
    });
  };

  const isDateBlockedForAll = (dateStr) => {
    return blockedDates.some((blocked) => blocked.date === dateStr && !blocked.barberId && !blocked.startTime);
  };

  const getBlockedTimeSlots = (dateStr, barberId = null) => {
    return blockedDates.filter((blocked) => {
      const matchDate = blocked.date === dateStr;
      const matchBarber = !blocked.barberId || blocked.barberId === barberId;
      return matchDate && matchBarber && blocked.startTime && blocked.endTime;
    });
  };

  useEffect(() => {
    if (location.state?.preSelectedService) {
      const preSelected = location.state.preSelectedService;
      setPreSelectedService(preSelected);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const activeUserSubscription = useMemo(() => {
    if (!currentUser?.id || !userSubscriptions || userSubscriptions.length === 0) {
      return null;
    }
    return userSubscriptions.find((s) => s.userId === currentUser.id && s.status === 'active') || null;
  }, [currentUser?.id, userSubscriptions]);

  useEffect(() => {
    if (!userSubscriptions.length || !hasLoadedOnce.current) return;

    hasLoadedOnce.current = true;

    if (!activeUserSubscription) {
      setIsBarberLocked(false);
      setLockedBarberId(null);
      setLockedBarberName(null);
      return;
    }

    if (!activeUserSubscription.monthlyBarberId || !activeUserSubscription.monthlyBarberSetDate) {
      setIsBarberLocked(false);
      setLockedBarberId(null);
      setLockedBarberName(null);
      return;
    }

    const setDate = new Date(activeUserSubscription.monthlyBarberSetDate);
    const currentDate = new Date();
    const isSameMonth = setDate.getMonth() === currentDate.getMonth() && setDate.getFullYear() === currentDate.getFullYear();

    if (isSameMonth) {
      setIsBarberLocked(true);
      setLockedBarberId(activeUserSubscription.monthlyBarberId);
      setLockedBarberName(activeUserSubscription.monthlyBarberName);
    } else {
      setIsBarberLocked(false);
      setLockedBarberId(null);
      setLockedBarberName(null);
    }
  }, [userSubscriptions.length, activeUserSubscription]);

  const setMonthlyBarber = useCallback(async (barberId, barberName) => {
    if (!activeUserSubscription) return;

    try {
      await api.patch(`/subscriptions/${activeUserSubscription.id}`, {
        monthlyBarberId: barberId,
        monthlyBarberName: barberName,
        monthlyBarberSetDate: new Date().toISOString()
      });

      setIsBarberLocked(true);
      setLockedBarberId(barberId);
      setLockedBarberName(barberName);

      setToast({
        show: true,
        message: `${barberName} é seu barbeiro fixo este mês!`,
        type: 'success'
      });
    } catch (error) {
      setToast({
        show: true,
        message: 'Erro ao definir barbeiro fixo',
        type: 'danger'
      });
    }
  }, [activeUserSubscription]);

  const loadData = useCallback(async () => {
    try {
      const [barbersData, servicesData, productsData, appointmentsData] = await Promise.all([
        getBarbers(),
        getAllServices(),
        fetch('https://barbearia-addev-backend.onrender.com/products', {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }).then((res) => res.json()),
        getAppointments(),
        // fetch('https://barbearia-addev-backend.onrender.com/subscriptions', {
        //   headers: {
        //     Authorization: `Bearer ${token}`,
        //   }
        // }).then((res) => res.json())

      ]);

      const res = await fetch('https://barbearia-addev-backend.onrender.com/subscriptions', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const subscription = await res.json();
      console.log(subscription);


      const usersResponse = await fetch('https://barbearia-addev-backend.onrender.com/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      const allUsers = await usersResponse.json();

      const validBarbers = barbersData.filter((barber) => {
        if (!barber.userId) return true;
        const user = allUsers.find((u) => u.id === barber.userId);

        return !user || user.role === 'barber';
      });

      setBarbers(validBarbers);
      setServices(servicesData);
      setProducts(productsData);
      setAppointments(appointmentsData);
      setUserSubscriptions(subscription.items);
      setAllUsers(allUsers);

      let deps = [];
      // try {
      //   const depsRes = await fetch(`https://barbearia-addev-backend.onrender.com/dependents?parentId=${currentUser?.id}`);
      //   if (depsRes.ok) {
      //     deps = await depsRes.json();
      //     setUserDependents(deps);
      //   }
      // } catch (e) {}

      // const depIds = deps.map(d => `dep_${d.id}`);

      const userAppointments = appointmentsData.filter((apt) =>
        apt.clientId === currentUser?.id
        // || depIds.includes(apt.clientId)
      );

      const paymentsMap = {};
      for (const apt of userAppointments) {
        try {
          const payment = await buscarPagamentoAgendamento(apt.id);
          if (payment) paymentsMap[apt.id] = payment;
        } catch (error) {
          console.error(`Erro ao buscar pagamento ${apt.id}`, error);
        }
      }
      console.log("PAGAMENTOS AQUI: ", paymentsMap)
      setAppointmentPayments(paymentsMap);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      isFetchingPayments.current = false;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const handleUpdateStock = useCallback(async (productId, quantity) => {
    try {
      const response = await fetch(`https://barbearia-addev-backend.onrender.com/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      const product = await response.json();
      const newStock = Math.max(0, product.stock - quantity);

      await fetch(`https://barbearia-addev-backend.onrender.com/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: newStock })
      });

      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)));
      return true;
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      return false;
    }
  }, []);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.role === 'barber') {
      navigate('/barber');
      return;
    }

    initializedRef.current = true;
    loadData();
    fetchBlockedDates();


    const mpPending = sessionStorage.getItem('mp_pending_plan');
    const urlParams = new URLSearchParams(window.location.search);
    const mpStatus = urlParams.get('status');
    const mpPaymentId = urlParams.get('payment_id');

    if (mpPending && mpStatus) {
      const handleMpReturn = async () => {
        try {
          const { selectedPlan, finalTotal } = JSON.parse(mpPending);
          sessionStorage.removeItem('mp_pending_plan');

          window.history.replaceState({}, document.title, window.location.pathname);

          if (mpStatus === 'approved') {
            if (selectedPlan?.needsCreation && selectedPlan?.appointmentData && selectedPlan?.paymentData) {
              const createdAppointment = await createAppointment(selectedPlan.appointmentData);
              await criarPagamentoAgendamento({
                ...selectedPlan.paymentData,
                appointmentId: createdAppointment.id,
                status: 'paid',
                paymentMethod: 'online',
                paidAt: new Date().toISOString(),
                amount: finalTotal,
                mercadoPagoId: mpPaymentId,
              });
              await loadData();
              const serviceNames = selectedPlan.paymentData?.serviceName || '';
              setSuccessData({
                title: 'Agendamento Confirmado!',
                message: 'Pagamento aprovado e agendamento realizado com sucesso!',
                details: [
                  { label: 'Barbeiro', value: selectedPlan.appointmentData.barberName },
                  { label: 'Data', value: new Date(`${selectedPlan.appointmentData.date}T00:00:00`).toLocaleDateString('pt-BR') },
                  { label: 'Horário', value: selectedPlan.appointmentData.time },
                  { label: 'Serviços', value: serviceNames },
                  { label: 'Total', value: `R$ ${Number(finalTotal).toFixed(2)}` },
                ]
              });
              setShowSuccessModal(true);
              setView('myAppointments');
            }
          } else if (mpStatus === 'pending') {
            if (selectedPlan?.needsCreation && selectedPlan?.appointmentData && selectedPlan?.paymentData) {
              const createdAppointment = await createAppointment(selectedPlan.appointmentData);
              await criarPagamentoAgendamento({
                ...selectedPlan.paymentData,
                appointmentId: createdAppointment.id,
                status: 'pending_online',
                paymentMethod: 'online',
                amount: finalTotal,
                mercadoPagoId: mpPaymentId,
              });
              await loadData();
              setSuccessData({
                title: 'Pagamento em Análise',
                message: 'Seu agendamento foi criado e o pagamento está sendo processado. Você receberá uma confirmação em breve.',
                details: [
                  { label: 'Barbeiro', value: selectedPlan.appointmentData.barberName },
                  { label: 'Data', value: new Date(`${selectedPlan.appointmentData.date}T00:00:00`).toLocaleDateString('pt-BR') },
                  { label: 'Horário', value: selectedPlan.appointmentData.time },
                ]
              });
              setShowSuccessModal(true);
              setView('myAppointments');
            }
          } else if (mpStatus === 'failure') {
            showToast('Pagamento recusado. Tente novamente.', 'danger');
          }
        } catch (err) {
          console.error('Erro ao processar retorno MP:', err);
          showToast('Erro ao finalizar agendamento. Entre em contato.', 'danger');
        }
      };

      handleMpReturn();
    }

  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectDate = (date) => {
    const dateStr = date.toLocaleDateString('en-CA');

    const blockedInfo = blockedDates.find(b => b.date === dateStr && !b.barberId && !b.startTime);

    if (blockedInfo) {
      showToast(`📅 Data bloqueada: ${blockedInfo.reason}`, 'warning');
    }

    const existing = checkExistingAppointmentOnDate(date);
    setSelectedDate(date);

    if (existing && !isRescheduling) {
      setExistingAppointment(existing);
      setShowConflictModal(true);
    }
  };

  const generateTimes = useCallback((intervalMinutes = 30) => {
    const times = [];
    let hour = 8;
    let minute = 0;

    while (hour < 20 || (hour === 20 && minute === 0)) {
      const h = String(hour).padStart(2, '0');
      const m = String(minute).padStart(2, '0');
      times.push(`${h}:${m}`);

      minute += intervalMinutes;
      if (minute >= 60) {
        hour += Math.floor(minute / 60);
        minute = minute % 60;
      }
    }

    return times;
  }, []);

  const calculateTotalDuration = useCallback((services) => {
    if (!Array.isArray(services) || services.length === 0) return 30;
    return services.reduce((total, service) => {
      return total + (service.duration || 30);
    }, 0);
  }, []);

  const getBookedSlots = useCallback((barberId, date) => {
    if (!date) return [];
    const dateStr = date.toLocaleDateString('en-CA');

    return appointments
      .filter((apt) => apt.barberId === barberId && apt.date === dateStr)
      .flatMap((apt) => {
        let totalDuration = 30;
        if (Array.isArray(apt.services) && apt.services.length > 0) {
          totalDuration = apt.services.reduce((sum, s) => {
            return sum + (s.duration || 30);
          }, 0);
        }

        const slots = Math.ceil(totalDuration / 30);
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
    const allTimes = generateTimes(30);
    const dateStr = date.toLocaleDateString('en-CA');
    const bookedTimes = getBookedSlots(barberId, date);
    const blockedSlots = getBlockedTimeSlots(dateStr, barberId);

    const today = new Date();
    const isToday = dateStr === today.toLocaleDateString('en-CA');

    const timeToMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    return allTimes.filter(time => {
      if (bookedTimes.includes(time)) return false;

      if (isToday) {
        const slotMinutes = timeToMinutes(time);
        const nowMinutes = today.getHours() * 60 + today.getMinutes();
        if (slotMinutes <= nowMinutes) return false;
      }

      if (blockedSlots.length > 0) {
        const slotMinutes = timeToMinutes(time);
        const isBlocked = blockedSlots.some(blocked => {
          const start = timeToMinutes(blocked.startTime);
          const end = timeToMinutes(blocked.endTime);
          return slotMinutes >= start && slotMinutes <= end;
        });
        if (isBlocked) return false;
      }

      return true;
    });
  }, [appointments, blockedDates]);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, []);

  const calculateTotal = useCallback((services) => {
    const total = services.reduce((sum, s) => {
      const priceStr = s.basePrice || 0;
      const cleanPrice = priceStr.toString().replace(/R\$/g, '');
      const normalized = cleanPrice.replace(/,/g, '.');
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

      if (isDateBlockedForAll(dateStr)) {
        showToast('Esta data está bloqueada para agendamentos.', 'danger');
        return;
      }

      if (isDateBlocked(dateStr, bookingData.barberId)) {
        showToast('Este barbeiro não está disponível nesta data.', 'danger');
        return;
      }

      const existingAptOnDate = appointments.find(
        (apt) => apt.clientId === activeClient.id && apt.date === dateStr
      );

      if (existingAptOnDate && !isRescheduling) {
        setExistingAppointment(existingAptOnDate);
        setShowConflictModal(true);
        return;
      }

      if (
        !isAdmin &&
        activeUserSubscription &&
        isBarberLocked &&
        bookingData.barberId !== lockedBarberId
      ) {
        showToast(
          `Você já selecionou ${lockedBarberName} no início deste mês. O barbeiro só pode ser alterado no próximo mês.`,
          'warning'
        );
        return;
      }

      const serviceDuration = calculateTotalDuration(bookingData.services);
      const availableTimes = getAvailableTimes(bookingData.barberId, selectedDate, serviceDuration);

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
        observation,
        dateFormatted: selectedDate.toLocaleDateString('pt-BR')
      });

      setShowProductsModal(true);
    } catch (error) {
      showToast('Erro ao realizar agendamento.', 'danger');
    }
  }, [
    selectedDate,
    isRescheduling,
    appointments,
    activeClient?.id,
    getAvailableTimes,
    showToast,
    loadData,
    calculateTotal,
    isAdmin,
    activeUserSubscription,
    isBarberLocked,
    lockedBarberId,
    lockedBarberName,
    calculateTotalDuration,
    isDateBlocked,
    isDateBlockedForAll
  ]);

  const handleProductsConfirm = useCallback((data) => {
    if (!pendingBookingData) return;

    setPurchaseData(data);
    setShowProductsModal(false);

    const hasProducts = data.products.length > 0;

    const hasSubscription = data.hasActiveSubscription && !bookingForDependent && !bookingForUser;

    if (!hasProducts && hasSubscription) {
      handleDirectConfirmation();
      return;
    }

    setShowPaymentChoiceModal(true);
  }, [pendingBookingData, bookingForDependent]);

  const handleReschedule = useCallback(async () => {
    if (!existingAppointment) return;

    setShowConflictModal(false);

    try {
      clearPaymentCache(existingAppointment.id);
      await deleteAppointment(existingAppointment.id);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadData();
      showToast('Agendamento cancelado. Escolha novo horário.', 'info');
    } catch (error) {
      console.error('Erro ao deletar:', error);
      showToast('Escolha novo horário. O anterior será substituído.', 'warning');
    }

    setIsRescheduling(true);
  }, [existingAppointment, loadData, showToast, clearPaymentCache]);

  const handleCancelExisting = useCallback(async () => {
    if (!existingAppointment) return;

    try {
      setShowConflictModal(false);
      clearPaymentCache(existingAppointment.id);
      await deleteAppointment(existingAppointment.id);
      await loadData();
      showToast('Agendamento cancelado com sucesso!', 'success');
      setExistingAppointment(null);
      setSelectedDate(null);
      setIsRescheduling(false);
    } catch (error) {
      showToast('Erro ao cancelar agendamento.', 'danger');
    }
  }, [existingAppointment, loadData, showToast, clearPaymentCache]);

  const handleKeepExisting = useCallback(() => {
    setShowConflictModal(false);
    setExistingAppointment(null);
    setSelectedDate(null);
    setIsRescheduling(false);
  }, []);

  const handleDirectConfirmation = useCallback(async () => {
    try {
      if (!pendingBookingData) return;

      setBookingInProgress(true);

      if (activeUserSubscription && !isBarberLocked && !isAdmin) {
        const selectedBarber = barbers.find((b) => b.id === pendingBookingData.barberId);
        if (selectedBarber) {
          await setMonthlyBarber(selectedBarber.id, selectedBarber.name);
        }
      }

      const newAppointment = {
        barberId: pendingBookingData.barberId,
        barberName: pendingBookingData.barberName,
        services: pendingBookingData.services,
        date: pendingBookingData.date,
        time: pendingBookingData.time,
        client: activeClient.name,
        clientId: activeClient.id,
        ...(bookingForDependent ? { isDependent: true, dependentName: bookingForDependent.name, dependentId: bookingForDependent.id } : {}),
        products: [],
        observation: pendingBookingData.observation || '',
      };

      const createdAppointment = await createAppointment(newAppointment);

      const serviceNames = pendingBookingData.services.map((s) => s.name).join(', ');

      const paymentData = {
        appointmentId: createdAppointment.id,
        userId: currentUser.id,
        userName: activeClient.name,
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
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSuccessData({
        title: isRescheduling ? 'Reagendamento Confirmado!' : 'Agendamento Confirmado!',
        message: isRescheduling
          ? 'Seu agendamento foi reagendado com sucesso! Coberto pelo seu plano ativo.'
          : 'Seu agendamento foi confirmado! Coberto pelo seu plano ativo.',
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
      setExistingAppointment(null);
      setIsRescheduling(false);
      setSelectedDate(null);
      setBookingForDependent(null);
      setView('myAppointments');
    } catch (error) {
      console.error('Erro:', error);
      showToast(error.response?.data?.message || error.message, 'danger');
      setExistingAppointment(null);
      setIsRescheduling(false);
      setSelectedDate(null);
    } finally {
      setBookingInProgress(false);
    }
  }, [
    pendingBookingData,
    isRescheduling,
    existingAppointment,
    activeClient?.id,
    loadData,
    showToast,
    activeUserSubscription,
    isBarberLocked,
    isAdmin,
    barbers,
    setMonthlyBarber,
    clearPaymentCache
  ]);

  const handlePaymentChoice = useCallback(async (payNow) => {
    try {
      if (!pendingBookingData || !purchaseData) return;

      if (payNow) {
        const serviceNames = pendingBookingData.services.map((s) => s.name).join(', ');
        const productNames = purchaseData.products
          .map((p) => `${p.name} x${p.quantity}`)
          .join(', ');
        const fullDescription = productNames ? `${serviceNames}, ${productNames}` : serviceNames;

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
            client: activeClient.name,
            clientId: activeClient.id,
            ...(bookingForDependent ? { isDependent: true, dependentName: bookingForDependent.name, dependentId: bookingForDependent.id } : {}),
            products: purchaseData.products,
            observation: pendingBookingData.observation || '',
          },
          paymentData: {
            userId: currentUser.id,
            userName: activeClient.name,
            amount: purchaseData.finalTotal,
            serviceName: serviceNames,
            services: pendingBookingData.services,
            servicePrice: purchaseData.servicePrice || 0,
            barberName: pendingBookingData.barberName,
            appointmentDate: pendingBookingData.date,
            appointmentTime: pendingBookingData.time,
            products: purchaseData.products,
          }

        });


        pendingStockUpdate.current = purchaseData.products || [];

        setShowPaymentChoiceModal(false);
        setPendingBookingData(null);
        setPurchaseData(null);
        setShowPaymentModal(true);
      } else {
        setBookingInProgress(true);

        const newAppointment = {
          barberId: pendingBookingData.barberId,
          barberName: pendingBookingData.barberName,
          services: pendingBookingData.services,
          date: pendingBookingData.date,
          time: pendingBookingData.time,
          client: activeClient.name,
          clientId: activeClient.id,
          ...(bookingForDependent ? { isDependent: true, dependentName: bookingForDependent.name, dependentId: bookingForDependent.id } : {}),
          products: purchaseData.products,
          observation: pendingBookingData.observation || '',
        };

        const createdAppointment = await createAppointment(newAppointment);

        const serviceNames = pendingBookingData.services.map((s) => s.name).join(', ');

        const paymentData = {
          appointmentId: createdAppointment.id,
          userId: currentUser.id,
          userName: activeClient.name,
          amount: purchaseData.finalTotal,
          serviceName: serviceNames,
          barberName: pendingBookingData.barberName,
          appointmentDate: pendingBookingData.date,
          appointmentTime: pendingBookingData.time,
          products: purchaseData.products,
          status: 'pending',
          method: 'local'
        };

        await criarPagamentoAgendamento(paymentData);
        clearPaymentCache(createdAppointment.id);


        if (purchaseData.products && purchaseData.products.length > 0) {
          await Promise.all(
            purchaseData.products.map(p => handleUpdateStock(p.id, p.quantity || 1))
          );
        }

        await loadData();
        await new Promise((resolve) => setTimeout(resolve, 500));

        const productInfo = purchaseData.products.length > 0 ? ` + ${purchaseData.products.length} produto(s)` : '';

        setSuccessData({
          title: isRescheduling ? 'Reagendamento Confirmado!' : 'Agendamento Confirmado!',
          message: isRescheduling
            ? 'Seu agendamento foi reagendado com sucesso! O pagamento será realizado no estabelecimento.'
            : 'Seu agendamento foi confirmado! O pagamento será realizado no estabelecimento.',
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
        setExistingAppointment(null);
        setIsRescheduling(false);
        setSelectedDate(null);
        setView('myAppointments');
      }
    } catch (error) {
      console.error('Erro:', error);
      showToast(error.response?.data?.message || error.message, 'danger');
      setExistingAppointment(null);
      setIsRescheduling(false);
      setSelectedDate(null);
    } finally {
      setBookingInProgress(false);
    }
  }, [
    pendingBookingData,
    purchaseData,
    isRescheduling,
    existingAppointment,
    activeClient?.id,
    loadData,
    showToast,
    clearPaymentCache
  ]);

  const handlePaymentSuccess = useCallback(async () => {
    clearAllPaymentsCache();
    await loadData();
    setShowPaymentModal(false);
    setSelectedAppointmentForPayment(null);
    setView('myAppointments');
  }, [loadData, clearAllPaymentsCache]);

  const handleDeleteClick = useCallback((id) => {
    setAppointmentToDelete(id);
    setShowConfirmModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      clearPaymentCache(appointmentToDelete);
      await deleteAppointment(appointmentToDelete);
      await loadData();
      showToast('Agendamento cancelado com sucesso!', 'success');
      setAppointmentToDelete(null);
    } catch (error) {
      showToast('Erro ao cancelar agendamento.', 'danger');
    }
  }, [appointmentToDelete, loadData, showToast, clearPaymentCache]);

  const myAppointments = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const depClientIds = userDependents.map(d => `dep_${d.id}`);
    console.log('MEUS APONTAMENTOS', appointments)
    return appointments.filter((apt) => {
      const isOwn = apt.clientId === currentUser?.id;
      const isDep = depClientIds.includes(apt.clientId);
      if (!isOwn && !isDep) return false;

      const aptDate = new Date(apt.endAt);
      const aptMonth = aptDate.getMonth();
      const aptYear = aptDate.getFullYear();

      if (appointmentFilter === 'current') {
        return aptMonth === currentMonth && aptYear === currentYear;
      } else if (appointmentFilter === 'upcoming') {
        if (aptYear > currentYear) return true;
        if (aptYear === currentYear && aptMonth >= currentMonth) return true;
        return false;
      } else {
        return true;
      }
    });
  }, [appointments, currentUser?.id, appointmentFilter, userDependents]);

  console.log("APONTAMENTOS", myAppointments);

  const sortedMyAppointments = useMemo(() => {
    return [...myAppointments].sort((a, b) => {
      console.log(a.date);
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
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
        <div className="auth-card auth-card--full" style={{ padding: '2rem' }}>
          <div className="appointments-header">
            <div>
              <h1 className="auth-title">Agendamentos</h1>
              <p className="auth-subtitle">
                Usuário: {currentUser?.name} {isAdmin && <span style={{ marginLeft: '10px', color: '#d4af37' }}>(Admin)</span>}
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
            <div className="appointments__booking">
              <h2>Selecione uma data</h2>


              {!canScheduleForOthers && userDependents.length > 0 && (
                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#a8a8a8', fontSize: '0.85rem', fontWeight: 600 }}>
                      👤 Para quem é o agendamento?
                    </span>
                    {(bookingForDependent) && (
                      <button
                        onClick={() => { setBookingForDependent(null); setShowForWhomSelector(false); }}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        ✕ Limpar seleção
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

                    <div
                      onClick={() => { setBookingForDependent(null); setShowForWhomSelector(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '10px 12px', borderRadius: 9,
                        background: !bookingForDependent ? 'rgba(255,122,26,0.10)' : '#111',
                        border: '1px solid ' + (!bookingForDependent ? '#ff7a1a' : '#222'),
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#2a2a2a',
                        overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {currentUser?.photo
                          ? <img src={currentUser.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '👤'}
                      </div>
                      <div>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{currentUser?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#ff7a1a' }}>Você mesmo</p>
                      </div>
                      {!bookingForDependent && <span style={{ marginLeft: 'auto', color: '#ff7a1a', fontSize: '0.75rem', fontWeight: 700 }}>✓ Selecionado</span>}
                    </div>


                    {userDependents.map((dep) => (
                      <div
                        key={dep.id}
                        onClick={() => setBookingForDependent(dep)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '10px 12px', borderRadius: 9,
                          background: bookingForDependent?.id === dep.id ? 'rgba(255,122,26,0.10)' : '#111',
                          border: '1px solid ' + (bookingForDependent?.id === dep.id ? '#ff7a1a' : '#222'),
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'rgba(255,122,26,0.15)', border: '1px solid rgba(255,122,26,0.3)',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#ff7a1a', fontWeight: 700, fontSize: '1rem',
                        }}>
                          {dep.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{dep.name}</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#777' }}>
                            {dep.age} anos · CPF: {dep.cpf}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#e59a00', marginTop: 2 }}>
                            ⚠️ Pagamento individual necessário — não utiliza seu plano
                          </p>
                        </div>
                        {bookingForDependent?.id === dep.id && <span style={{ color: '#ff7a1a', fontSize: '0.75rem', fontWeight: 700 }}>✓ Selecionado</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {canScheduleForOthers && (
                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: bookingForUser ? '0.75rem' : 0 }}>
                    <span style={{ color: '#a8a8a8', fontSize: '0.85rem', fontWeight: 600 }}>
                      📅 Agendar para:
                    </span>
                    <button
                      onClick={() => setShowUserSelector((v) => !v)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,122,26,0.5)',
                        color: '#ff7a1a',
                        borderRadius: '7px',
                        padding: '5px 14px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {showUserSelector ? 'Fechar' : bookingForUser ? 'Alterar' : 'Selecionar cliente'}
                    </button>
                  </div>


                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: '#2a2a2a',
                      overflow: 'hidden',
                      border: '2px solid ' + (bookingForUser ? '#ff7a1a' : '#444'),
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}>
                      {(bookingForUser?.photo || currentUser?.photo) ? (
                        <img
                          src={bookingForUser?.photo || currentUser?.photo}
                          alt="avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : '👤'}
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        {bookingForUser ? bookingForUser.name : currentUser?.name}
                        {!bookingForUser && <span style={{ color: '#ff7a1a', marginLeft: 6, fontSize: '0.75rem' }}>(você)</span>}
                      </p>
                      {bookingForUser && (
                        <button
                          onClick={() => { setBookingForUser(null); setShowUserSelector(false); }}
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.75rem', padding: 0, marginTop: 2 }}
                        >
                          ✕ Remover seleção
                        </button>
                      )}
                    </div>
                  </div>


                  {showUserSelector && (
                    <div style={{ marginTop: '1rem' }}>
                      <input
                        type="text"
                        placeholder="🔍 Buscar por nome ou telefone..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: '#111', border: '1px solid #333',
                          borderRadius: 8, color: '#fff', fontSize: '0.85rem',
                          boxSizing: 'border-box', marginBottom: '0.5rem',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

                        <div
                          onClick={() => { setBookingForUser(null); setShowUserSelector(false); setUserSearch(''); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '8px 10px', borderRadius: 8,
                            background: !bookingForUser ? 'rgba(255,122,26,0.12)' : '#111',
                            border: '1px solid ' + (!bookingForUser ? '#ff7a1a' : '#222'),
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: '#2a2a2a', overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {currentUser?.photo
                              ? <img src={currentUser.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : '👤'}
                          </div>
                          <div>
                            <p style={{ margin: 0, color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{currentUser?.name}</p>
                            <p style={{ margin: 0, color: '#ff7a1a', fontSize: '0.72rem' }}>Você mesmo</p>
                          </div>
                        </div>

                        {allUsers
                          .filter((u) =>
                            u.id !== currentUser?.id &&
                            u.role === 'client' &&
                            (
                              !userSearch.trim() ||
                              u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.phone?.includes(userSearch)
                            )
                          )
                          .map((u) => (
                            <div
                              key={u.id}
                              onClick={() => {
                                setBookingForUser({ id: u.id, name: u.name, photo: u.photo || '' });
                                setShowUserSelector(false);
                                setUserSearch('');
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '8px 10px', borderRadius: 8,
                                background: bookingForUser?.id === u.id ? 'rgba(255,122,26,0.12)' : '#111',
                                border: '1px solid ' + (bookingForUser?.id === u.id ? '#ff7a1a' : '#222'),
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: '#2a2a2a', overflow: 'hidden', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {u.photo
                                  ? <img src={u.photo} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                  : '👤'}
                              </div>
                              <div>
                                <p style={{ margin: 0, color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{u.name}</p>
                                <p style={{ margin: 0, color: '#666', fontSize: '0.72rem' }}>{u.phone || u.email || u.role}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DatePicker
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                disabledDates={blockedDates.filter(b => !b.startTime).map(b => b.date)}
              />

              {selectedDate && (() => {
                const dateStr = selectedDate.toLocaleDateString('en-CA');
                const blockedInfo = blockedDates.find(b => b.date === dateStr && !b.barberId && !b.startTime);

                if (blockedInfo) {
                  return (
                    <div style={{
                      background: '#ff4444',
                      color: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginTop: '1rem',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>⚠️ Data Bloqueada</h3>
                      <p style={{ margin: '0.5rem 0' }}>{blockedInfo.reason}</p>
                      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                        Nenhum agendamento disponível nesta data.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {selectedDate && !showConflictModal && (() => {
                const dateStr = selectedDate.toLocaleDateString('en-CA');
                const isBlockedForAll = blockedDates.some(b => b.date === dateStr && !b.barberId && !b.startTime);

                if (isBlockedForAll) {
                  return null;
                }

                return (
                  <div className="appointments__barbers">
                    <h2>Barbeiros disponíveis em {selectedDate.toLocaleDateString('pt-BR')}</h2>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ color: '#a8a8a8', fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                        Observação (opcional)
                      </label>
                      <textarea
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        placeholder="Ex: Quero o cabelo mais curto dos lados, barba degradê..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                    {barbers.length === 0 ? (
                      <p>Nenhum barbeiro disponível.</p>
                    ) : (
                      barbers.map((barber) => {
                        const barberWithPhoto = {
                          ...barber,
                          photo: barber.photo || barber.avatar || `https://i.pravatar.cc/150?img=${barber.id}`,
                        };

                        const dateStr = selectedDate.toLocaleDateString('en-CA');
                        const isBarberBlocked = blockedDates.some(
                          b => b.date === dateStr && b.barberId === barber.id && !b.startTime
                        );

                        if (isBarberBlocked) {
                          return null;
                        }

                        const shouldHideBarber =
                          !isAdmin &&
                          activeUserSubscription &&
                          isBarberLocked &&
                          barber.id !== lockedBarberId;

                        if (shouldHideBarber) return null;

                        return (
                          <BarberCard
                            key={barber.id}
                            barber={barberWithPhoto}
                            services={
                              barberWithPhoto.serviceIds && barberWithPhoto.serviceIds.length > 0
                                ? services.filter((s) => barberWithPhoto.serviceIds.includes(s.id))
                                : services
                            }
                            selectedDate={selectedDate}
                            barberId={barber.id}
                            getBookedSlots={getBookedSlots}
                            generateTimes={generateTimes}
                            getAvailableTimes={getAvailableTimes}
                            calculateTotalDuration={calculateTotalDuration}
                            onBook={handleBook}
                            showToast={showToast}
                            preSelectedService={preSelectedService}
                          />
                        );
                      })
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {view === 'myAppointments' && (
            <div className="appointments__list">
              <h2>Seus Agendamentos</h2>

              <div className="appointments-filter-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #333' }}>
                <button
                  onClick={() => setAppointmentFilter('current')}
                  className={`tab-btn ${appointmentFilter === 'current' ? 'tab-btn--active' : ''}`}
                >
                  Este Mês ({appointments.filter(apt => {
                    const aptDate = new Date(apt.endAt);
                    const today = new Date();
                    const dIds1 = userDependents.map(d => `dep_${d.id}`); return (apt.clientId === currentUser?.id || dIds1.includes(apt.clientId)) && aptDate.getMonth() === today.getMonth() && aptDate.getFullYear() === today.getFullYear();
                  }).length})
                </button>
                <button
                  onClick={() => setAppointmentFilter('upcoming')}
                  className={`tab-btn ${appointmentFilter === 'upcoming' ? 'tab-btn--active' : ''}`}
                >
                  Próximos ({appointments.filter(apt => {
                    const aptDate = new Date(apt.endAt);
                    const today = new Date();
                    const dIds2 = userDependents.map(d => `dep_${d.id}`); return (apt.clientId === currentUser?.id || dIds2.includes(apt.clientId)) && (aptDate.getFullYear() > today.getFullYear() || (aptDate.getFullYear() === today.getFullYear() && aptDate.getMonth() >= today.getMonth()));
                  }).length})
                </button>
                <button
                  onClick={() => setAppointmentFilter('all')}
                  className={`tab-btn ${appointmentFilter === 'all' ? 'tab-btn--active' : ''}`}
                >
                  Todos ({appointments.filter(apt => { const dIds3 = userDependents.map(d => `dep_${d.id}`); return apt.clientId === currentUser?.id || dIds3.includes(apt.clientId); }).length})
                </button>
              </div>

              {sortedMyAppointments.length === 0 ? (
                <div className="appointments__empty">
                  <div className="appointments__empty-icon"></div>
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
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Barbeiro</th>
                        <th>Para</th>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Serviços</th>
                        <th>Obs.</th>
                        <th>Produtos</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMyAppointments.map((apt) => {
                        const payment = appointmentPayments[apt.id];
                        const isPending = payment && (payment.status === 'pending' || payment.status === 'confirmed_unpaid');
                        const isPendingLocal = payment[0].status === 'pending' && payment[0].method === 'local';
                        const isPaid = payment && payment.status === 'paid';
                        const isPlanCovered = payment && payment.status === 'plancovered';

                        const appointmentDate = new Date(apt.endAt);
                        const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

                        const time = `${String(appointmentDate.getHours()).padStart(2, '0')}:${String(appointmentDate.getMinutes()).padStart(2, '0')}`;

                        const servicesTotal = Array.isArray(apt.services)
                          ? apt.services.reduce((sum, s) => {
                            const price = typeof s.unitPrice === 'string'
                              ? parseFloat(s.unitPrice.replace(/R\$/g, '').replace(/,/g, '.').trim()) || 0
                              : s.unitPrice || 0;
                            return sum + price;
                          }, 0)
                          : 0;

                        const productsTotal = apt.products && apt.products.length > 0
                          ? apt.products.reduce((sum, p) => {
                            const price = typeof p.price === 'string'
                              ? parseFloat(p.price.replace(/R\$/g, '').replace(/,/g, '.').trim()) || 0
                              : p.price || 0;
                            return sum + (price * (p.quantity || 1));
                          }, 0)
                          : 0;

                        const total = servicesTotal + productsTotal;

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

                        const barber = barbers.find((b) => b.id === apt.barberId);
                        const barberPhoto = "";
                        // = barber
                        //   ? barber.photo || barber.avatar || `https://i.pravatar.cc/150?img=${barber.id}`
                        //   : `https://i.pravatar.cc/150?img=${apt.barberId}`;

                        return (
                          <tr key={apt.id}>
                            <td data-label="Barbeiro">
                              <div className="appointment-barber">
                                <img
                                  src={barberPhoto}
                                  alt={apt.barber.displayName}
                                  className="appointment-barber-avatar"
                                // onError={(e) => {
                                //   e.target.src = `https://i.pravatar.cc/150?img=${apt.barberId}`;
                                // }}
                                />
                                <span className="appointment-barber-name">{apt.barber.displayName}</span>
                              </div>
                            </td>
                            <td data-label="Para">
                              {apt.isDependent ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  background: 'rgba(255,122,26,0.12)', color: '#ff7a1a',
                                  border: '1px solid rgba(255,122,26,0.35)', borderRadius: '20px',
                                  padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700
                                }}>👤 {apt.dependentName}</span>
                              ) : (
                                <span style={{ color: '#666', fontSize: '0.82rem' }}>Você</span>
                              )}
                            </td>
                            <td data-label="Data">
                              <span className="appointment-date">{formattedDate}</span>
                            </td>
                            <td data-label="Horário">
                              <span className="appointment-time">{time}</span>
                            </td>
                            <td data-label="Serviço">
                              <div className="appointment-services">
                                {Array.isArray(apt.services) ? (
                                  apt.services.map((service, idx) => (
                                    <div key={idx} className="appointment-service-item">
                                      {service.serviceName}
                                    </div>
                                  ))
                                ) : (
                                  <div className="appointment-service-item">-</div>
                                )}
                              </div>
                            </td>
                            <td data-label="Obs.">
                              {apt.observation ? (
                                <div>
                                  <button
                                    onClick={() => setExpandedObsId(expandedObsId === apt.id ? null : apt.id)}
                                    style={{
                                      background: 'rgba(212,175,55,0.12)',
                                      border: '1px solid rgba(212,175,55,0.35)',
                                      color: '#d4af37',
                                      borderRadius: '20px',
                                      padding: '3px 12px',
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    📝 Ver
                                  </button>
                                  {expandedObsId === apt.id && (
                                    <div style={{
                                      marginTop: 8,
                                      background: 'rgba(212,175,55,0.07)',
                                      border: '1px solid rgba(212,175,55,0.2)',
                                      borderRadius: '8px',
                                      padding: '8px 10px',
                                      fontSize: '0.82rem',
                                      color: '#d4c48a',
                                      fontStyle: 'italic',
                                      maxWidth: '200px',
                                      lineHeight: '1.5',
                                    }}>
                                      {apt.observation}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#444', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                            <td data-label="Produtos">
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
                            <td data-label="Total">
                              <span className="appointment-total">
                                {total > 0 ? `R$ ${total.toFixed(2)}` : 'Grátis'}
                              </span>
                            </td>
                            <td data-label="Status" className="appointment-status-cell">
                              <span className={`appointment-status ${statusClass}`}>{statusText}</span>
                            </td>
                            <td>
                              <div className="appointment-actions">
                                <button onClick={() => handleDeleteClick(apt.id)} className="btn-action cancel">
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
        }}
        products={products}
        onConfirm={handleProductsConfirm}
        hasActiveSubscription={hasActiveSubscription}
        servicePrice={pendingBookingData?.servicePrice || 0}
        serviceName={pendingBookingData?.services?.map(s => s.name).join(', ') || ''}
        onUpdateStock={handleUpdateStock}
      />

      <PaymentChoiceModal
        isOpen={showPaymentChoiceModal}
        onClose={() => {
          setShowPaymentChoiceModal(false);
          setPendingBookingData(null);
          setPurchaseData(null);
        }}
        onChoose={handlePaymentChoice}
        appointmentDetails={
          pendingBookingData
            ? {
              barberName: pendingBookingData.barberName,
              date: pendingBookingData.dateFormatted,
              time: pendingBookingData.time,
              serviceName: pendingBookingData.services.map((s) => s.name).join(', ')
            }
            : null
        }
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

      {showConflictModal && existingAppointment && (
        <div className="modal-overlay" onClick={handleKeepExisting}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agendamento Existente</h2>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                Você já possui um agendamento para esta data:
              </p>
              <div style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div><strong>Barbeiro:</strong> {existingAppointment.barberName}</div>
                  <div><strong>Data:</strong> {new Date(`${existingAppointment.date}T00:00:00`).toLocaleDateString('pt-BR')}</div>
                  <div><strong>Horário:</strong> {existingAppointment.time}</div>
                  <div>
                    <strong>Serviços:</strong> {Array.isArray(existingAppointment.services) ? existingAppointment.services.map((s) => s.name).join(', ') : '-'}
                  </div>
                </div>
              </div>
              <p style={{ marginBottom: '1.5rem', color: '#999' }}>
                Gostaria de reagendar ou cancelar este agendamento?
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCancelExisting}
                  className="btn-action cancel"
                  style={{ flex: '1', minWidth: '150px' }}
                >
                  Cancelar Agendamento
                </button>
                <button
                  onClick={handleReschedule}
                  className="btn-action"
                  style={{ flex: '1', minWidth: '150px', background: '#d4af37', color: '#000' }}
                >
                  Reagendar
                </button>
                <button
                  onClick={handleKeepExisting}
                  className="btn-secondary"
                  style={{ flex: '1', minWidth: '150px' }}
                >
                  Manter e Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bookingInProgress && (
        <div className="booking-overlay">
          <div className="booking-overlay-content">
            <div className="booking-spinner"></div>
            <h2>Processando Agendamento...</h2>
            <p>Aguarde enquanto confirmamos seu horário</p>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </BaseLayout>
  );
}