import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api.js';
import BaseLayout from '../components/layout/BaseLayout.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import axios, { all } from 'axios';
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
  deleteAppointment,
} from '../services/appointmentService.js';
import { getHomeInfo, getPaymentVisibilitySettings } from '../services/settingsService.js';
import {
  criarPagamentoAgendamento,
  buscarPagamentoAgendamento,
  criarAssinatura,
  buscarAssinaturaAtiva,
} from '../services/paymentService.js';
import './AuthPages.css';
import { getToken } from '../services/authService.js';

const extractAppointmentErrorMessage = (
  error,
  fallbackMessage = 'Não foi possível cancelar este agendamento.',
) => {
  const data = error?.response?.data;

  if (Array.isArray(data)) {
    const firstMessage = data[0];

    if (typeof firstMessage === 'string' && firstMessage.trim()) {
      return firstMessage;
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (Array.isArray(data?.message)) {
    return data.message.join(' ');
  }

  const message =
    data?.message ||
    data?.error ||
    data?.detail ||
    data?.details ||
    error?.message ||
    fallbackMessage;

  const normalizedMessage = String(message)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const isBarberChangeRuleError =
    error?.code === 'BARBER_CHANGE_LOCKED' ||
    (
      normalizedMessage.includes('barbeiro') &&
      (
        normalizedMessage.includes('30') ||
        normalizedMessage.includes('renov') ||
        normalizedMessage.includes('troca') ||
        normalizedMessage.includes('alterar') ||
        normalizedMessage.includes('outro barbeiro') ||
        normalizedMessage.includes('barbeiro fixo')
      )
    );

  return isBarberChangeRuleError
    ? 'Seu plano já possui um barbeiro fixo vinculado. Agendamentos do plano devem ser feitos com esse barbeiro.'
    : message;
};

const getSubscriptionValue = (subscription, keys) => {
  for (const key of keys) {
    const value = subscription?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
};

const getSubscriptionMonthlyBarberId = (subscription) =>
  getSubscriptionValue(subscription, ['monthly_barber_id', 'monthlyBarberId']);

const getSubscriptionMonthlyBarberName = (subscription) =>
  getSubscriptionValue(subscription, [
    'monthly_barber_name',
    'monthlyBarberName',
  ]) ||
  subscription?.monthly_barber?.displayName ||
  subscription?.monthly_barber?.display_name ||
  subscription?.monthlyBarber?.displayName ||
  subscription?.monthlyBarber?.display_name ||
  subscription?.monthlyBarber?.name ||
  null;

const getSubscriptionMonthlyBarberSetAt = (subscription) =>
  getSubscriptionValue(subscription, [
    'monthly_barber_set_at',
    'monthlyBarberSetAt',
  ]);

const MONTHLY_BARBER_LOCK_DAYS = 30;
const MONTHLY_BARBER_LOCK_MS = MONTHLY_BARBER_LOCK_DAYS * 24 * 60 * 60 * 1000;

const getMonthlyBarberLockInfo = (subscription, now = new Date()) => {
  const monthlyBarberId = getSubscriptionMonthlyBarberId(subscription);
  const setAt = getSubscriptionMonthlyBarberSetAt(subscription);
  const setAtDate = new Date(setAt);
  const hasValidSetAt = !!setAt && !Number.isNaN(setAtDate.getTime());
  const lockAgeMs = hasValidSetAt ? now.getTime() - setAtDate.getTime() : null;
  const lockAgeDays = lockAgeMs == null ? null : lockAgeMs / (24 * 60 * 60 * 1000);
  const isActive =
    !!monthlyBarberId &&
    hasValidSetAt &&
    lockAgeMs >= 0 &&
    lockAgeMs < MONTHLY_BARBER_LOCK_MS;

  return {
    monthlyBarberId,
    monthlyBarberSetAt: setAt,
    parsedMonthlyBarberSetAt: hasValidSetAt ? setAtDate.toISOString() : null,
    lockAgeMs,
    lockAgeDays,
    isActive,
  };
};

export default function AppointmentsPage() {
  const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
  const selectedPlan = JSON.parse(localStorage.getItem('selectedPlan'));
  const currentUserPlan = JSON.parse(localStorage.getItem('currentUser'));
  
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
  const [homeInfo, setHomeInfo] = useState({
    scheduleLine1: 'Seg - 14h as 20h',
    scheduleLine2: 'Terça a Sab. - 09h as 20h',
    scheduleLine3: 'Domingo: Fechado',
  });
  const [appointmentPayments, setAppointmentPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState(null);
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  const [hiddenBookingPaymentMethods, setHiddenBookingPaymentMethods] = useState([]);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMonthlyLockConfirmModal, setShowMonthlyLockConfirmModal] = useState(false);
  const [pendingMonthlyLockBookingData, setPendingMonthlyLockBookingData] = useState(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [stripeActiveSubscription, setStripeActiveSubscription] = useState(null);
  const [activeSubscriptionPlanFeatures, setActiveSubscriptionPlanFeatures] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('current');
  const [preSelectedService, setPreSelectedService] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [postPaymentLoading, setPostPaymentLoading] = useState(false);
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
  const [barberAvatarErrors, setBarberAvatarErrors] = useState({});
  const [selectedBarberId, setSelectedBarberId] = useState(null);

  const token = getToken();

  const [userDependents, setUserDependents] = useState([]);
  const [selectedClientDependents, setSelectedClientDependents] = useState([]);
  const [bookingForDependent, setBookingForDependent] = useState(null);
  const [showForWhomSelector, setShowForWhomSelector] = useState(false);

  const hasLoadedOnce = useRef(false);
  const hasShownMonthlyBarberNotice = useRef(false);
  const pendingStockUpdate = useRef([]);
  const paymentsCache = useRef({});
  const isFetchingPayments = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const preapprovalId =
      params.get('preapproval_id') || params.get('preapproval') || params.get('id');

    //"e5ebbe29ae3d420dbc87648e4b9991bc";

    console.log('PREAPPROVAL ID:', preapprovalId);

    if (preapprovalId) {
      fetch(`${import.meta.env.VITE_API_URL}/assinatura/${preapprovalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((r) => r.json())
        .then(async (data) => {
          if (data.status == 'authorized') {
            console.log('Entrou no if de autorização da assinatura:', data.status);
            const subscription = await criarAssinatura({
              userId: currentUserPlan.id,
              userName: currentUserPlan.name,
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              planPrice: selectedPlan.price,
              amount: 89.9,
              status: 'active',
              paymentMethod: 'credito',
              isRecurring: selectedPlan.isRecurring ?? true,
              autoRenewal: selectedPlan.autoRenewal ?? true,
              mp_preapproval_id: preapprovalId,
            });

            console.log(subscription);

            localStorage.setItem('planId', JSON.stringify(subscription.data.id));
          }
        })
        .catch((err) => console.error(err));
    }
  }, []);

  const clearPaymentCache = useCallback((appointmentId) => {
    if (appointmentId) {
      delete paymentsCache.current[appointmentId];
    }
  }, []);

  const clearAllPaymentsCache = useCallback(() => {
    paymentsCache.current = {};
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
  const isReceptionist = currentUser?.role === 'receptionist';
  const canScheduleForOthers = isAdmin || isReceptionist || currentUser?.permissions?.scheduleForOthers === true;
  const dependentsForBooking = canScheduleForOthers ? selectedClientDependents : userDependents;

  const availableBookingPaymentMethods = useMemo(() => {
    const hiddenSet = new Set(
      (Array.isArray(hiddenBookingPaymentMethods) ? hiddenBookingPaymentMethods : [])
        .map((item) => String(item || '').toLowerCase()),
    );

    return ['cartao', 'pix', 'local'].filter((method) => !hiddenSet.has(method));
  }, [hiddenBookingPaymentMethods]);

  const activeClient = bookingForDependent
    ? {
        id: `dep_${bookingForDependent.id}`,
        name: bookingForDependent.name,
        isDependent: true,
        dependentId: bookingForDependent.id,
      }
    : bookingForUser || currentUser;

  const calculateBlockedDurationMinutes = useCallback((durationMinutes = 30) => {
    const parsed = Number(durationMinutes);
    const realDuration = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    return Math.max(30, Math.ceil(realDuration / 30) * 30);
  }, []);

  useEffect(() => {
    const fetchDependentsForSelectedClient = async () => {
      if (!token) return;

      const parentId = canScheduleForOthers
        ? (bookingForUser?.id || currentUser?.id)
        : currentUser?.id;

      if (!parentId) {
        setSelectedClientDependents([]);
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/dependents`, {
          params: { parentId },
          headers: { Authorization: `Bearer ${token}` },
        });

        const deps = Array.isArray(response.data)
          ? response.data
          : response.data?.items || response.data?.dependents || [];

        setSelectedClientDependents(deps);

        if (bookingForDependent) {
          const stillExists = deps.some((dep) => dep.id === bookingForDependent.id);
          if (!stillExists) setBookingForDependent(null);
        }
      } catch (error) {
        console.warn('Erro ao buscar dependentes do cliente selecionado:', error);
        setSelectedClientDependents([]);
        setBookingForDependent(null);
      }
    };

    fetchDependentsForSelectedClient();
  }, [token, canScheduleForOthers, bookingForUser?.id, currentUser?.id]);

  const hasClientOrDependentTimeConflict = useCallback(
    ({ date, time, durationMinutes }) => {
      if (!date || !time || !Array.isArray(appointments)) return false;

      const targetDependentId = bookingForDependent?.id ? String(bookingForDependent.id) : null;
      const targetClientId = String(activeClient?.id || '');
      if (!targetClientId && !targetDependentId) return false;

      const newStart = new Date(`${date}T${time}:00`);
      if (Number.isNaN(newStart.getTime())) return false;
      const newEnd = new Date(
        newStart.getTime() + calculateBlockedDurationMinutes(durationMinutes) * 60_000,
      );

      return appointments.some((apt) => {
        const aptStatus = String(apt?.status || '').toLowerCase();
        if (aptStatus === 'cancelled' || aptStatus === 'no_show') return false;

        const aptDependentId = apt?.dependentId || apt?.dependent?.id || null;
        const sameOwner = targetDependentId
          ? String(aptDependentId || '') === targetDependentId
          : String(apt?.clientId || '') === targetClientId && !aptDependentId;

        if (!sameOwner) return false;

        const aptStart = apt?.startAt
          ? new Date(apt.startAt)
          : new Date(`${normalizeDateStr(apt?.date || apt?.endAt)}T${apt?.time || '00:00'}:00`);

        if (Number.isNaN(aptStart.getTime())) return false;

        const aptEnd = apt?.endAt
          ? new Date(apt.endAt)
          : new Date(
              aptStart.getTime() +
                calculateBlockedDurationMinutes(
                  Array.isArray(apt?.services)
                    ? apt.services.reduce((total, service) => {
                        const raw =
                          service?.durationMinutes ?? service?.duration ?? service?.duration_minutes;
                        const parsed = Number(raw);
                        return total + (Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
                      }, 0)
                    : 30,
                ) *
                  60_000,
            );

        if (Number.isNaN(aptEnd.getTime())) return false;

        return newStart < aptEnd && newEnd > aptStart;
      });
    },
    [appointments, bookingForDependent?.id, activeClient?.id, calculateBlockedDurationMinutes],
  );

  const getClientOrDependentAppointmentOnDate = useCallback(
    (date) => {
      if (!date || !Array.isArray(appointments)) return null;

      const selectedDateStr = normalizeDateStr(date);
      const targetDependentId = bookingForDependent?.id ? String(bookingForDependent.id) : null;
      const targetClientId = String(activeClient?.id || '');
      if (!targetClientId && !targetDependentId) return null;

      return appointments.find((apt) => {
        const aptStatus = String(apt?.status || '').toLowerCase();
        if (aptStatus === 'cancelled' || aptStatus === 'no_show') return false;

        const aptDependentId = apt?.dependentId || apt?.dependent?.id || null;
        const sameOwner = targetDependentId
          ? String(aptDependentId || '') === targetDependentId
          : String(apt?.clientId || '') === targetClientId && !aptDependentId;

        if (!sameOwner) return false;

        return normalizeDateStr(apt?.date || apt?.endAt || apt?.startAt) === selectedDateStr;
      });
    },
    [appointments, bookingForDependent?.id, activeClient?.id],
  );

  const hasActiveSubscription = useMemo(() => {
    if (bookingForDependent || bookingForUser) return false;

    const currentUserId = String(currentUser?.id ?? '');
    const hasBackendSubscription = userSubscriptions.some((sub) => {
      const subscriptionUserId = String(sub?.userId ?? sub?.user?.id ?? '');
      const subscriptionStatus = String(sub?.status ?? '').toLowerCase();
      return subscriptionUserId === currentUserId && subscriptionStatus === 'active';
    });

    const stripeStatus = String(stripeActiveSubscription?.status ?? '').toLowerCase();
    const hasStripeSubscription = stripeStatus === 'active' || stripeStatus === 'trialing';

    return hasBackendSubscription || hasStripeSubscription;
  }, [userSubscriptions, stripeActiveSubscription?.status, currentUser?.id, bookingForDependent, bookingForUser]);

  const fetchBlockedDates = useCallback(async () => {
    try {
      const response = await fetch('https://barberoneapp-back-homolog.onrender.com/blocked-dates', {
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

  const normalizeId = (value) => String(value ?? '');

  const buildDependentLookupIds = (dependents = []) =>
    new Set(
      dependents.flatMap((dependent) => {
        const normalizedId = normalizeId(dependent?.id);
        if (!normalizedId) return [];
        return [normalizedId, `dep_${normalizedId}`];
      }),
    );

  const getAppointmentClientId = (appointment) =>
    normalizeId(appointment?.clientId ?? appointment?.client?.id);

  const getAppointmentDependentId = (appointment) =>
    normalizeId(appointment?.dependentId ?? appointment?.dependent?.id);

  const isAppointmentFromCurrentUser = (appointment, userId, dependentLookupIds = new Set()) => {
    const normalizedUserId = normalizeId(userId);
    const appointmentClientId = getAppointmentClientId(appointment);
    const appointmentDependentId = getAppointmentDependentId(appointment);

    return (
      appointmentClientId === normalizedUserId ||
      dependentLookupIds.has(appointmentClientId) ||
      dependentLookupIds.has(appointmentDependentId)
    );
  };

  const getAppointmentStartDate = (appointment) => {
    const fallbackDateTime =
      appointment?.date && appointment?.time
        ? `${appointment.date}T${appointment.time}`
        : appointment?.date;

    const parsedDate = new Date(appointment?.startAt || appointment?.endAt || fallbackDateTime);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const getUpcomingReminders = useMemo(() => {
    const now = new Date();
    const dependentLookupIds = buildDependentLookupIds(userDependents);
    const userAppointments = appointments.filter((apt) =>
      isAppointmentFromCurrentUser(apt, currentUser?.id, dependentLookupIds),
    );
    const future = userAppointments.filter((apt) => {
      const aptDateTime = getAppointmentStartDate(apt);
      if (!aptDateTime) return false;
      return aptDateTime >= now;
    });
    future.sort((a, b) => getAppointmentStartDate(a) - getAppointmentStartDate(b));
    return future;
  }, [appointments, currentUser?.id, userDependents]);

  const normalizeDateStr = (value) => {
    if (!value) return '';
    if (value instanceof Date) return value.toLocaleDateString('en-CA');
    return String(value).slice(0, 10);
  };

  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const parseTimeValue = (value) => {
    const match = String(value || '').match(/(\d{1,2})(?:[:h](\d{2}))?/i);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2] || 0);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const parseDaysFromScheduleLine = (line, fallbackIndex = 0) => {
    const text = normalizeText(line);

    if (text.includes('domingo') || text.includes('dom')) return [0];
    if (text.includes('seg') || text.includes('segunda')) {
      if (text.includes('a sab')) return [1, 2, 3, 4, 5, 6];
      if (text.includes('a sex')) return [1, 2, 3, 4, 5];
      return [1];
    }
    if (text.includes('ter') || text.includes('terça')) {
      if (text.includes('a sab')) return [2, 3, 4, 5, 6];
      if (text.includes('a sex')) return [2, 3, 4, 5];
      return [2];
    }
    if (text.includes('qua') || text.includes('quarta')) return [3];
    if (text.includes('qui') || text.includes('quinta')) return [4];
    if (text.includes('sex') || text.includes('sexta')) return [5];
    if (text.includes('sab') || text.includes('sábado')) return [6];

    return fallbackIndex === 0 ? [1] : fallbackIndex === 1 ? [2, 3, 4, 5, 6] : [0];
  };

  const workingHoursByDay = useMemo(() => {
    const defaultConfig = {
      0: null,
      1: { open: 14 * 60, close: 20 * 60 },
      2: { open: 9 * 60, close: 20 * 60 },
      3: { open: 9 * 60, close: 20 * 60 },
      4: { open: 9 * 60, close: 20 * 60 },
      5: { open: 9 * 60, close: 20 * 60 },
      6: { open: 9 * 60, close: 20 * 60 },
    };

    const config = { ...defaultConfig };
    const lines = [homeInfo?.scheduleLine1, homeInfo?.scheduleLine2, homeInfo?.scheduleLine3]
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => Boolean(String(line || '').trim()));

    lines.forEach(({ line, index }) => {
      const text = normalizeText(line);
      const days = parseDaysFromScheduleLine(line, index);

      if (text.includes('fechado')) {
        days.forEach((day) => {
          config[day] = null;
        });
        return;
      }

      const times = Array.from(String(line || '').matchAll(/(\d{1,2})(?:[:h](\d{2}))?/g))
        .map((match) => parseTimeValue(`${match[1]}:${match[2] || '00'}`))
        .filter((value) => value != null);

      const open = times[0];
      const close = times[1];

      if (open == null || close == null || close <= open) return;

      days.forEach((day) => {
        config[day] = { open, close };
      });
    });

    return config;
  }, [homeInfo?.scheduleLine1, homeInfo?.scheduleLine2, homeInfo?.scheduleLine3]);

  const getWorkingHoursForDate = useCallback(
    (date) => {
      if (!date) return null;

      const config = workingHoursByDay[date.getDay()];
      if (config === null) return null;
      if (config?.open != null && config?.close != null) return config;

      return { open: 9 * 60, close: 20 * 60 };
    },
    [workingHoursByDay],
  );

  const timeToMinutes = (time) => {
    const [h, m] = String(time || '00:00')
      .split(':')
      .map(Number);
    return h * 60 + m;
  };

  const generateSlotsForDuration = (startTime, durationMinutes = 30) => {
    const slots = [];
    const totalSlots = calculateBlockedDurationMinutes(durationMinutes) / 30;
    let current = timeToMinutes(startTime);

    for (let i = 0; i < totalSlots; i++) {
      const hh = String(Math.floor(current / 60)).padStart(2, '0');
      const mm = String(current % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      current += 30;
    }

    return slots;
  };

  const isDateBlocked = (dateStr, barberId = null) => {
    const normalizedDate = normalizeDateStr(dateStr);

    return blockedDates.some((blocked) => {
      const sameDate = normalizeDateStr(blocked.date) === normalizedDate;
      const appliesToBarber =
        !blocked.barberId || normalizeId(blocked.barberId) === normalizeId(barberId);
      const isDayBlock = !blocked.startTime && !blocked.endTime;

      return sameDate && appliesToBarber && isDayBlock;
    });
  };

  const isDateBlockedForAll = (dateStr) => {
    const normalizedDate = normalizeDateStr(dateStr);

    return blockedDates.some((blocked) => {
      return (
        normalizeDateStr(blocked.date) === normalizedDate &&
        !blocked.barberId &&
        !blocked.startTime &&
        !blocked.endTime
      );
    });
  };

  const getBlockedTimeSlots = (dateStr, barberId = null) => {
    const normalizedDate = normalizeDateStr(dateStr);

    return blockedDates.filter((blocked) => {
      const sameDate = normalizeDateStr(blocked.date) === normalizedDate;
      const appliesToBarber =
        !blocked.barberId || normalizeId(blocked.barberId) === normalizeId(barberId);
      const isTimeBlock = !!blocked.startTime && !!blocked.endTime;

      return sameDate && appliesToBarber && isTimeBlock;
    });
  };

  // const isDateBlocked = (dateStr, barberId = null) => {
  //   return blockedDates.some((blocked) => {
  //     const matchDate = blocked.date === dateStr;
  //     const matchBarber = !blocked.barberId || blocked.barberId === barberId;
  //     const isDayBlock = !blocked.startTime;
  //     return matchDate && matchBarber && isDayBlock;
  //   });
  // };

  // const isDateBlockedForAll = (dateStr) => {
  //   return blockedDates.some((blocked) => blocked.date === dateStr && !blocked.barberId && !blocked.startTime);
  // };

  // const getBlockedTimeSlots = (dateStr, barberId = null) => {
  //   return blockedDates.filter((blocked) => {
  //     const matchDate = blocked.date === dateStr;
  //     const matchBarber = !blocked.barberId || blocked.barberId === barberId;
  //     return matchDate && matchBarber && blocked.startTime && blocked.endTime;
  //   });
  // };

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

    const currentUserId = String(currentUser.id);
    return (
      userSubscriptions.find((sub) => {
        const subscriptionUserId = String(sub?.userId ?? sub?.user?.id ?? '');
        const subscriptionStatus = String(sub?.status ?? '').toLowerCase();
        return subscriptionUserId === currentUserId && subscriptionStatus === 'active';
      }) || null
    );
  }, [currentUser?.id, userSubscriptions]);

  useEffect(() => {
    let cancelled = false;

    const loadStripeActiveSubscription = async () => {
      if (!currentUser?.email) {
        setStripeActiveSubscription(null);
        return;
      }

      try {
        const subscription = await buscarAssinaturaAtiva(currentUser);
        if (!cancelled) {
          setStripeActiveSubscription(subscription || null);
        }
      } catch (error) {
        if (!cancelled) {
          setStripeActiveSubscription(null);
        }
      }
    };

    loadStripeActiveSubscription();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  const activeSubscriptionForCoverage = useMemo(() => {
    return activeUserSubscription || stripeActiveSubscription || null;
  }, [activeUserSubscription, stripeActiveSubscription]);

  const activeSubscriptionForBarberLock = activeUserSubscription;
  const hasLocalActiveSubscription = !!activeSubscriptionForBarberLock;
  const localMonthlyBarberId = getSubscriptionMonthlyBarberId(activeSubscriptionForBarberLock);
  const localMonthlyBarber = useMemo(() => {
    if (!localMonthlyBarberId) return null;

    return (
      barbers.find((barber) => normalizeId(barber.id) === normalizeId(localMonthlyBarberId)) ||
      null
    );
  }, [barbers, localMonthlyBarberId]);
  const localMonthlyBarberName =
    localMonthlyBarber?.displayName ||
    localMonthlyBarber?.name ||
    getSubscriptionMonthlyBarberName(activeSubscriptionForBarberLock);
  const monthlyBarberLockInfo = useMemo(
    () => getMonthlyBarberLockInfo(activeSubscriptionForBarberLock),
    [activeSubscriptionForBarberLock],
  );
  const isMonthlyBarberLockCurrent =
    hasLocalActiveSubscription && monthlyBarberLockInfo.isActive;
  const currentLockedBarberId = isMonthlyBarberLockCurrent
    ? localMonthlyBarber?.id || localMonthlyBarberId
    : null;
  const currentLockedBarberName = isMonthlyBarberLockCurrent
    ? localMonthlyBarberName || null
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadActivePlanFeatures = async () => {
      if (!activeSubscriptionForCoverage?.planId) {
        setActiveSubscriptionPlanFeatures([]);
        return;
      }

      if (Array.isArray(activeSubscriptionForCoverage?.plan?.features)) {
        setActiveSubscriptionPlanFeatures(activeSubscriptionForCoverage.plan.features);
        return;
      }

      if (Array.isArray(activeSubscriptionForCoverage?.features)) {
        setActiveSubscriptionPlanFeatures(activeSubscriptionForCoverage.features);
        return;
      }

      try {
        const response = await api.get(`/subscription-plans/${activeSubscriptionForCoverage.planId}`);
        const features = Array.isArray(response?.data?.features) ? response.data.features : [];
        if (!cancelled) {
          setActiveSubscriptionPlanFeatures(features);
        }
      } catch (error) {
        if (!cancelled) {
          setActiveSubscriptionPlanFeatures([]);
        }
      }
    };

    loadActivePlanFeatures();

    return () => {
      cancelled = true;
    };
  }, [
    activeSubscriptionForCoverage?.planId,
    activeSubscriptionForCoverage?.plan?.features,
    activeSubscriptionForCoverage?.features,
  ]);

  const PLAN_SERVICE_FEATURE_PREFIX = 'SERVICO_INCLUSO::';

  const normalizeFeatureText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const coveredPlanServices = useMemo(() => {
    const byId = new Set();

    const planFeatures =
      activeSubscriptionForCoverage?.plan?.features ||
      activeSubscriptionForCoverage?.features ||
      activeSubscriptionPlanFeatures ||
      [];

    if (!hasActiveSubscription || !planFeatures.length) {
      return { byId };
    }

    planFeatures.forEach((feature) => {
      if (typeof feature !== 'string') return;

      if (feature.startsWith(PLAN_SERVICE_FEATURE_PREFIX)) {
        const parts = feature.split('::');
        const serviceId = parts[1];

        if (serviceId) byId.add(String(serviceId));
        return;
      }
    });

    return { byId };
  }, [
    hasActiveSubscription,
    activeSubscriptionForCoverage,
    activeSubscriptionPlanFeatures,
  ]);

  const isServiceCoveredByPlan = useCallback(
    (service) => {
      if (!hasActiveSubscription || !service) return false;

      const serviceId = service.id != null ? String(service.id) : '';
      return !!serviceId && coveredPlanServices.byId.has(serviceId);
    },
    [hasActiveSubscription, coveredPlanServices],
  );
  useEffect(() => {
    if (!activeSubscriptionForBarberLock) {
      setIsBarberLocked(false);
      setLockedBarberId(null);
      setLockedBarberName(null);
      return;
    }

    if (!isMonthlyBarberLockCurrent) {
      setIsBarberLocked(false);
      setLockedBarberId(null);
      setLockedBarberName(null);
      setSelectedBarberId((current) =>
        normalizeId(current) === normalizeId(localMonthlyBarberId) ? null : current,
      );
      return;
    }

    setIsBarberLocked(true);
    setLockedBarberId(currentLockedBarberId);
    setLockedBarberName(currentLockedBarberName);
  }, [
    activeSubscriptionForBarberLock,
    isMonthlyBarberLockCurrent,
    currentLockedBarberId,
    currentLockedBarberName,
    localMonthlyBarberId,
  ]);

  const shouldApplyMonthlyBarberLock =
    !isAdmin &&
    isMonthlyBarberLockCurrent &&
    !!currentLockedBarberId &&
    !bookingForDependent &&
    !bookingForUser;
  const effectiveLockedBarberName = shouldApplyMonthlyBarberLock
    ? lockedBarberName || currentLockedBarberName
    : null;
  const visibleLockedBarberId = shouldApplyMonthlyBarberLock ? currentLockedBarberId : null;

  useEffect(() => {
    if (shouldApplyMonthlyBarberLock && visibleLockedBarberId) {
      setSelectedBarberId(visibleLockedBarberId);
    }
  }, [shouldApplyMonthlyBarberLock, visibleLockedBarberId]);

  const visibleBarbers = useMemo(() => {
    if (!shouldApplyMonthlyBarberLock || !visibleLockedBarberId) {
      return barbers;
    }

    return barbers.filter(
      (barber) => normalizeId(barber.id) === normalizeId(visibleLockedBarberId),
    );
  }, [barbers, shouldApplyMonthlyBarberLock, visibleLockedBarberId]);

  useEffect(() => {
    console.log('[AppointmentsPage] Monthly barber lock debug:', {
      activeSubscriptionForBarberLock: activeSubscriptionForBarberLock
        ? {
            id: activeSubscriptionForBarberLock.id,
            userId: activeSubscriptionForBarberLock.userId,
            status: activeSubscriptionForBarberLock.status,
            monthly_barber_id: activeSubscriptionForBarberLock.monthly_barber_id,
            monthlyBarberId: activeSubscriptionForBarberLock.monthlyBarberId,
            monthly_barber_set_at: activeSubscriptionForBarberLock.monthly_barber_set_at,
            monthlyBarberSetAt: activeSubscriptionForBarberLock.monthlyBarberSetAt,
            monthlyBarberSetDate: activeSubscriptionForBarberLock.monthlyBarberSetDate,
          }
        : null,
      monthlyBarberLockInfo,
      hasLocalActiveSubscription,
      isMonthlyBarberLockCurrent,
      currentLockedBarberId,
      currentLockedBarberName,
      shouldApplyMonthlyBarberLock,
      visibleLockedBarberId,
      effectiveLockedBarberName,
      isAdmin,
      bookingForDependentId: bookingForDependent?.id || null,
      bookingForUserId: bookingForUser?.id || null,
      totalBarbers: barbers.length,
      visibleBarbers: visibleBarbers.map((barber) => ({
        id: barber.id,
        displayName: barber.displayName || barber.name,
      })),
    });
  }, [
    activeSubscriptionForBarberLock,
    monthlyBarberLockInfo,
    hasLocalActiveSubscription,
    isMonthlyBarberLockCurrent,
    currentLockedBarberId,
    currentLockedBarberName,
    shouldApplyMonthlyBarberLock,
    visibleLockedBarberId,
    effectiveLockedBarberName,
    isAdmin,
    bookingForDependent?.id,
    bookingForUser?.id,
    barbers,
    visibleBarbers,
  ]);

  const setMonthlyBarber = useCallback(
    async (barberId, barberName) => {
      if (!activeUserSubscription) return true;

      try {
        await api.patch(`/subscriptions/${activeUserSubscription.id}`, {
          monthlyBarberId: barberId,
        });

        setIsBarberLocked(true);
        setLockedBarberId(barberId);
        setLockedBarberName(barberName);

        setToast({
          show: true,
          message: `${barberName} é seu barbeiro fixo no plano!`,
          type: 'success',
        });
        return true;
      } catch (error) {
        setToast({
          show: true,
          message: extractAppointmentErrorMessage(error),
          type: 'danger',
        });
        return false;
      }
    },
    [activeUserSubscription],
  );

  const ensureMonthlyBarberLock = useCallback(
    async (barberId, barberName) => {
      if (isAdmin || !activeUserSubscription || shouldApplyMonthlyBarberLock) return;

      const locked = await setMonthlyBarber(barberId, barberName);
      if (!locked) {
        throw new Error('Não foi possível vincular o barbeiro fixo ao plano.');
      }
    },
    [isAdmin, activeUserSubscription, shouldApplyMonthlyBarberLock, setMonthlyBarber],
  );

  const loadData = useCallback(async () => {
    try {
      const [
        barbersData,
        servicesData,
        productsData,
        appointmentsData,
        homeInfoData,
        paymentVisibilitySettings,
      ] = await Promise.all([
        getBarbers(),
        getAllServices(),
        fetch('https://barberoneapp-back-homolog.onrender.com/products', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((res) => res.json()),
        getAppointments(),
        getHomeInfo(),
        getPaymentVisibilitySettings(),
      ]);

      const res = await fetch('https://barberoneapp-back-homolog.onrender.com/subscriptions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const subscription = await res.json();

      let allUsersArray = [];

      // Só tenta listar usuários se puder agendar para terceiros
      if (canScheduleForOthers) {
        try {
          const usersResponse = await fetch('https://barberoneapp-back-homolog.onrender.com/users', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const usersJson = await usersResponse.json();

          if (usersResponse.ok) {
            allUsersArray = Array.isArray(usersJson?.items)
              ? usersJson.items
              : Array.isArray(usersJson)
                ? usersJson
                : [];
          } else {
            console.warn('Sem permissão para listar usuários:', usersJson);
            allUsersArray = [];
          }
        } catch (err) {
          console.warn('Erro ao buscar usuários:', err);
          allUsersArray = [];
        }
      }

      console.log('allUsersArray:', allUsersArray);

      const validBarbers = barbersData.filter((barber) => {
        if (!barber.userId) return true;

        const user = allUsersArray.find((u) => u.id === barber.userId);

        return !user || user.role === 'barber';
      });

      setBarbers(validBarbers);
      setServices(servicesData);
      setProducts(productsData);
      setAppointments(appointmentsData);
      if (homeInfoData) {
        const normalizedHomeInfo = Array.isArray(homeInfoData) ? homeInfoData[0] : homeInfoData;
        setHomeInfo((prev) => ({
          ...prev,
          ...normalizedHomeInfo,
        }));
      }
      setHiddenBookingPaymentMethods(paymentVisibilitySettings?.hiddenBookingPaymentMethods || []);
      const normalizedSubscriptions = Array.isArray(subscription?.items)
        ? subscription.items
        : Array.isArray(subscription)
          ? subscription
          : [];
      console.log('[AppointmentsPage] Subscriptions API response:', {
        currentUserId: currentUser?.id,
        rawResponse: subscription,
        normalizedSubscriptions: normalizedSubscriptions.map((sub) => ({
          id: sub?.id,
          userId: sub?.userId,
          user: sub?.user,
          status: sub?.status,
          monthly_barber_id: sub?.monthly_barber_id,
          monthlyBarberId: sub?.monthlyBarberId,
          monthly_barber_set_at: sub?.monthly_barber_set_at,
          monthlyBarberSetAt: sub?.monthlyBarberSetAt,
          monthlyBarberSetDate: sub?.monthlyBarberSetDate,
          monthly_barber: sub?.monthly_barber,
          monthlyBarber: sub?.monthlyBarber,
        })),
      });
      setUserSubscriptions(normalizedSubscriptions);
      setAllUsers(allUsersArray);

      let deps = [];
      try {
        const depsRes = await fetch(
          `https://barberoneapp-back-homolog.onrender.com/dependents?parentId=${currentUser?.id}`,
          {
            headers: { authorization: `Bearer ${token}` },
          },
        );

        if (depsRes.ok) {
          const depsJson = await depsRes.json();
          deps = Array.isArray(depsJson) ? depsJson : depsJson?.items || [];
          setUserDependents(deps);
        }
      } catch (e) {
        console.warn('Erro ao buscar dependentes:', e);
      }

      const dependentLookupIds = buildDependentLookupIds(deps);

      const userAppointments = appointmentsData.filter((apt) =>
        isAppointmentFromCurrentUser(apt, currentUser?.id, dependentLookupIds),
      );

      const paymentsMap = {};
      for (const apt of userAppointments) {
        try {
          const payment = await buscarPagamentoAgendamento(apt.id);
          const normalizedPayment = Array.isArray(payment) ? payment[0] || null : payment;
          if (normalizedPayment && normalizeId(normalizedPayment.appointmentId) === normalizeId(apt.id)) {
            paymentsMap[apt.id] = normalizedPayment;
          }
        } catch (error) {
          console.error(`Erro ao buscar pagamento ${apt.id}`, error);
        }
      }

      setAppointmentPayments(paymentsMap);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      isFetchingPayments.current = false;
    } finally {
      setLoading(false);
    }
  }, [token, currentUser?.id, canScheduleForOthers]);

  // const loadData = useCallback(async () => {
  //   try {
  //     const [barbersData, servicesData, productsData, appointmentsData] = await Promise.all([
  //       getBarbers(),
  //       getAllServices(),
  //       fetch('https://barberoneapp-back-homolog.onrender.com/products', {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         }
  //       }).then((res) => res.json()),
  //       getAppointments(),
  //     ]);

  //     const res = await fetch('https://barberoneapp-back-homolog.onrender.com/subscriptions', {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       }
  //     });

  //     const subscription = await res.json();
  //     const usersResponse = await fetch('https://barberoneapp-back-homolog.onrender.com/users', {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       }
  //     });

  //     const allUsers2 = await usersResponse.json();
  //     const allUsersArray = allUsers2.items || [];
  //     console.log(allUsersArray);

  //     const validBarbers = barbersData.filter((barber) => {
  //       if (!barber.userId) return true;
  //       const user = allUsers2.items.find((u) => u.id === barber.userId);

  //       return !user || user.role === 'barber';
  //     });

  //     setBarbers(validBarbers);
  //     setServices(servicesData);
  //     setProducts(productsData);
  //     setAppointments(appointmentsData);
  //     setUserSubscriptions(subscription.items);
  //     setAllUsers(allUsersArray);
  //     console.log(allUsers);

  //     let deps = [];
  //     try {
  //       const depsRes = await fetch(`https://barberoneapp-back-homolog.onrender.com/dependents?parentId=${currentUser?.id}`, {
  //         headers: { authorization: `Bearer ${token}` },
  //       });
  //       if (depsRes.ok) {
  //         deps = await depsRes.json();
  //         setUserDependents(deps);
  //       }
  //     } catch (e) { }

  //     const depIds = deps.map(d => `dep_${d.id}`);

  //     const userAppointments = appointmentsData.filter((apt) =>
  //       apt.clientId === currentUser?.id
  //       || depIds.includes(apt.clientId)
  //     );

  //     const paymentsMap = {};
  //     for (const apt of userAppointments) {
  //       try {
  //         const payment = await buscarPagamentoAgendamento(apt.id);
  //         if (payment) paymentsMap[apt.id] = payment;
  //       } catch (error) {
  //         console.error(`Erro ao buscar pagamento ${apt.id}`, error);
  //       }
  //     }
  //     setAppointmentPayments(paymentsMap);
  //   } catch (error) {
  //     console.error('Erro ao carregar dados:', error);
  //     isFetchingPayments.current = false;
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [currentUser?.id]);

  const handleUpdateStock = useCallback(async (productId, quantity) => {
    try {
      const response = await fetch(`https://barberoneapp-back-homolog.onrender.com/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const product = await response.json();
      const newStock = Math.max(0, product.stock - quantity);

      await fetch(`https://barberoneapp-back-homolog.onrender.com/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: newStock }),
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
            if (
              selectedPlan?.needsCreation &&
              selectedPlan?.appointmentData &&
              selectedPlan?.paymentData
            ) {
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

              // Adiciona o agendamento criado ao estado local imediatamente
              setAppointments((prev) => [createdAppointment, ...prev]);

              await loadData();
              const serviceNames = selectedPlan.paymentData?.serviceName || '';
              setSuccessData({
                title: 'Agendamento Confirmado!',
                message: 'Pagamento aprovado e agendamento realizado com sucesso!',
                details: [
                  { label: 'Barbeiro', value: selectedPlan.appointmentData.barberName },
                  {
                    label: 'Data',
                    value: new Date(
                      `${selectedPlan.appointmentData.date}T00:00:00`,
                    ).toLocaleDateString('pt-BR'),
                  },
                  { label: 'Horário', value: selectedPlan.appointmentData.time },
                  { label: 'Serviços', value: serviceNames },
                  { label: 'Total', value: `R$ ${Number(finalTotal).toFixed(2)}` },
                ],
              });
              setShowSuccessModal(true);
              setView('myAppointments');
            }
          } else if (mpStatus === 'pending') {
            if (
              selectedPlan?.needsCreation &&
              selectedPlan?.appointmentData &&
              selectedPlan?.paymentData
            ) {
              const createdAppointment = await createAppointment(selectedPlan.appointmentData);
              await criarPagamentoAgendamento({
                ...selectedPlan.paymentData,
                appointmentId: createdAppointment.id,
                status: 'pending_online',
                paymentMethod: 'online',
                amount: finalTotal,
                mercadoPagoId: mpPaymentId,
              });

              // Adiciona o agendamento criado ao estado local imediatamente
              setAppointments((prev) => [createdAppointment, ...prev]);

              await loadData();
              setSuccessData({
                title: 'Pagamento em Análise',
                message:
                  'Seu agendamento foi criado e o pagamento está sendo processado. Você receberá uma confirmação em breve.',
                details: [
                  { label: 'Barbeiro', value: selectedPlan.appointmentData.barberName },
                  {
                    label: 'Data',
                    value: new Date(
                      `${selectedPlan.appointmentData.date}T00:00:00`,
                    ).toLocaleDateString('pt-BR'),
                  },
                  { label: 'Horário', value: selectedPlan.appointmentData.time },
                ],
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

  const maxBookingDate = useMemo(() => {
    const now = new Date();
    // Permite o mês atual + o próximo mês. Retorna o último dia do mês seguinte.
    const lastDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return lastDayOfNextMonth;
  }, []);

  const handleSelectDate = (date) => {
    if (date > maxBookingDate) {
      const mes = maxBookingDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      showToast(`⛔ Agendamentos só são permitidos até ${mes}.`, 'warning');
      return;
    }

    const dateStr = date.toLocaleDateString('en-CA');

    const blockedInfo = blockedDates.find((b) => b.date === dateStr && !b.barberId && !b.startTime);

    if (blockedInfo) {
      showToast(`📅 Data bloqueada: ${blockedInfo.reason}`, 'warning');
    }

    const appointmentOnDate = getClientOrDependentAppointmentOnDate(date);

    if (appointmentOnDate) {
      const matchedBarber = barbers.find(
        (barber) => normalizeId(barber.id) === normalizeId(appointmentOnDate.barberId),
      );
      const fallbackTime = appointmentOnDate.startAt
        ? new Date(appointmentOnDate.startAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: SAO_PAULO_TIME_ZONE,
          })
        : '';

      setExistingAppointment({
        ...appointmentOnDate,
        barber:
          appointmentOnDate.barber ||
          matchedBarber || {
            displayName: appointmentOnDate.barberName || 'Barbeiro',
          },
        time: appointmentOnDate.time || fallbackTime,
      });
      setSelectedDate(date);
      setShowConflictModal(true);
      return;
    }

    setSelectedDate(date);
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

  const getServiceDurationMinutes = useCallback((service) => {
    const raw = service?.durationMinutes ?? service?.duration ?? service?.duration_minutes;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }, []);

  const calculateTotalDuration = useCallback((services) => {
    if (!Array.isArray(services) || services.length === 0) return 30;
    return services.reduce((total, service) => {
      return total + getServiceDurationMinutes(service);
    }, 0);
  }, [getServiceDurationMinutes]);

  const getAppointmentBlockedDurationMinutes = useCallback((appointment) => {
    const start = appointment?.startAt ? new Date(appointment.startAt) : null;
    const end = appointment?.endAt ? new Date(appointment.endAt) : null;

    if (
      start &&
      end &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end > start
    ) {
      return calculateBlockedDurationMinutes((end.getTime() - start.getTime()) / 60_000);
    }

    if (Array.isArray(appointment?.services) && appointment.services.length > 0) {
      return calculateBlockedDurationMinutes(calculateTotalDuration(appointment.services));
    }

    return 30;
  }, [calculateTotalDuration, calculateBlockedDurationMinutes]);

  const getBookedSlots = useCallback(
    (barberId, date) => {
      if (!date) return [];

      const selectedDateStr = normalizeDateStr(date);

      return appointments
        .filter((apt) => {
          const sameBarber = normalizeId(apt.barberId) === normalizeId(barberId);
          const sameDate =
            normalizeDateStr(apt.endAt || apt.date || apt.startAt) === selectedDateStr;
          return sameBarber && sameDate;
        })
        .flatMap((apt) => {
          const startTime = new Date(apt.startAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: SAO_PAULO_TIME_ZONE,
          });

          return generateSlotsForDuration(startTime, getAppointmentBlockedDurationMinutes(apt));
        });
    },
    [appointments, getAppointmentBlockedDurationMinutes],
  );

  // const getBookedSlots = useCallback((barberId, date) => {
  //   if (!date) return [];
  //   const dateStr = date.toLocaleDateString('pt-BR');

  //   return appointments
  //     .filter((apt) => apt.barberId === barberId && new Date(apt.startAt).toLocaleDateString("pt-BR") === dateStr)
  //     .flatMap((apt) => {
  //       let totalDuration = 30;
  //       if (Array.isArray(apt.services) && apt.services.length > 0) {
  //         totalDuration = apt.services.reduce((sum, s) => {
  //           return sum + (s.durationMinutes || 30);
  //         }, 0);
  //       }

  //       const slots = Math.ceil(totalDuration / 30);
  //       const result = [];
  //       const time = new Date(apt.startAt).toLocaleTimeString('pt-BR', {
  //         hour: '2-digit',
  //         minute: '2-digit',
  //         timeZone: 'UTC',
  //       });
  //       let [h, m] = time.split(':').map(Number);

  //       for (let i = 0; i < slots; i++) {
  //         const hh = String(h).padStart(2, '0');
  //         const mm = String(m).padStart(2, '0');
  //         result.push(`${hh}:${mm}`);

  //         m += 30;
  //         if (m >= 60) {
  //           m = 0;
  //           h += 1;
  //         }
  //       }

  //       return result;
  //     });
  // }, [appointments]);

  // const getAvailableTimes = useCallback((barberId, date) => {
  //   if (!date) return [];
  //   const allTimes = generateTimes(30);
  //   const dateStr = date.toLocaleDateString('en-CA');
  //   const bookedTimes = getBookedSlots(barberId, date);
  //   const blockedSlots = getBlockedTimeSlots(dateStr, barberId);

  //   const today = new Date();
  //   const isToday = dateStr === today.toLocaleDateString('en-CA');

  //   const timeToMinutes = (t) => {
  //     const [h, m] = t.split(':').map(Number);
  //     return h * 60 + m;
  //   };

  //   return allTimes.filter(time => {
  //     if (bookedTimes.includes(time)) return false;

  //     if (isToday) {
  //       const slotMinutes = timeToMinutes(time);
  //       const nowMinutes = today.getHours() * 60 + today.getMinutes();
  //       if (slotMinutes <= nowMinutes) return false;
  //     }

  //     if (blockedSlots.length > 0) {
  //       const slotMinutes = timeToMinutes(time);
  //       const isBlocked = blockedSlots.some(blocked => {
  //         const start = timeToMinutes(blocked.startTime);
  //         const end = timeToMinutes(blocked.endTime);
  //         return slotMinutes >= start && slotMinutes <= end;
  //       });
  //       if (isBlocked) return false;
  //     }

  //     return true;
  //   });
  // }, [appointments, blockedDates]);

  const getAvailableTimes = useCallback(
    (barberId, date, durationMinutes = 30) => {
      if (!date) return [];

      const dateStr = normalizeDateStr(date);
      const blockedDurationMinutes = calculateBlockedDurationMinutes(durationMinutes);
      const bookedTimes = getBookedSlots(barberId, date);
      const blockedSlots = getBlockedTimeSlots(dateStr, barberId);
      const workingHours = getWorkingHoursForDate(date);

      if (!workingHours) return [];

      const today = new Date();
      const isToday = dateStr === normalizeDateStr(today);

      const startBoundary = Math.max(workingHours.open, 0);
      const endBoundary = Math.max(
        workingHours.close - blockedDurationMinutes,
        startBoundary,
      );

      const allTimes = [];
      for (let current = startBoundary; current <= endBoundary; current += 30) {
        const h = String(Math.floor(current / 60)).padStart(2, '0');
        const m = String(current % 60).padStart(2, '0');
        allTimes.push(`${h}:${m}`);
      }

      return allTimes.filter((time) => {
        const startMinutes = timeToMinutes(time);
        const endMinutes = startMinutes + blockedDurationMinutes;

        // impede horários passados no dia atual
        if (isToday) {
          const nowMinutes = today.getHours() * 60 + today.getMinutes();
          if (startMinutes <= nowMinutes) return false;
        }

        // verifica conflito com agendamentos já existentes
        const neededSlots = generateSlotsForDuration(time, blockedDurationMinutes);
        const conflictsWithAppointments = neededSlots.some((slot) => bookedTimes.includes(slot));
        if (conflictsWithAppointments) return false;

        // verifica conflito com bloqueios por horário
        const conflictsWithBlocks = blockedSlots.some((blocked) => {
          const blockedStart = timeToMinutes(blocked.startTime);
          const blockedEnd = timeToMinutes(blocked.endTime);

          return startMinutes < blockedEnd && endMinutes > blockedStart;
        });

        if (conflictsWithBlocks) return false;

        return true;
      });
    },
    [getBookedSlots, blockedDates, getWorkingHoursForDate, calculateBlockedDurationMinutes],
  );

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
  const handleBook = useCallback(
    async (bookingData) => {
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

        const serviceDuration = calculateTotalDuration(bookingData.services);

        if (!isRescheduling && hasClientOrDependentTimeConflict({
          date: dateStr,
          time: bookingData.time,
          durationMinutes: serviceDuration,
        })) {
          showToast('Você já possui agendamento nesse mesmo horário com outro barbeiro.', 'danger');
          return;
        }

        if (
          shouldApplyMonthlyBarberLock &&
          normalizeId(bookingData.barberId) !== normalizeId(visibleLockedBarberId)
        ) {
          showToast(
            `Seu plano já possui ${effectiveLockedBarberName || 'um barbeiro fixo'} vinculado. Agendamentos do plano devem ser feitos com esse barbeiro.`,
            'warning',
          );
          return;
        }

        if (
          !isAdmin &&
          hasLocalActiveSubscription &&
          !shouldApplyMonthlyBarberLock &&
          !bookingForDependent &&
          !bookingForUser &&
          !hasShownMonthlyBarberNotice.current
        ) {
          hasShownMonthlyBarberNotice.current = true;
          showToast(
            `Atenção: ao confirmar este agendamento, ${bookingData.barberName} ficará vinculado ao seu plano como barbeiro fixo.`,
            'warning',
          );
        }

        const availableTimes = getAvailableTimes(
          bookingData.barberId,
          selectedDate,
          serviceDuration,
        );

        if (!availableTimes.includes(bookingData.time)) {
          showToast('Este horário não está mais disponível. Por favor, selecione outro.', 'danger');
          await loadData();
          return;
        }

        const allServicePrice = calculateTotal(bookingData.services);
        const payableServices = hasActiveSubscription
          ? bookingData.services.filter((service) => !isServiceCoveredByPlan(service))
          : bookingData.services;
        const coveredServices = hasActiveSubscription
          ? bookingData.services
              .filter((service) => isServiceCoveredByPlan(service))
              .map((service) => service.name || service.serviceName)
          : [];
        const servicePrice = calculateTotal(payableServices);
        const allSelectedServicesCoveredByPlan =
          hasActiveSubscription &&
          Array.isArray(bookingData.services) &&
          bookingData.services.length > 0 &&
          payableServices.length === 0;

        setPendingBookingData({
          ...bookingData,
          date: dateStr,
          servicePrice,
          originalServicePrice: allServicePrice,
          serviceCoveredByPlan: allSelectedServicesCoveredByPlan,
          coveredServices,
          observation,
          dateFormatted: selectedDate.toLocaleDateString('pt-BR'),
        });

        setShowProductsModal(true);
      } catch (error) {
        showToast('Erro ao realizar agendamento.', 'danger');
      }
    },
    [
      selectedDate,
      isRescheduling,
      appointments,
      activeClient?.id,
      getAvailableTimes,
      showToast,
      loadData,
      calculateTotal,
      isServiceCoveredByPlan,
      isAdmin,
      hasActiveSubscription,
      hasLocalActiveSubscription,
      shouldApplyMonthlyBarberLock,
      visibleLockedBarberId,
      effectiveLockedBarberName,
      calculateTotalDuration,
      hasClientOrDependentTimeConflict,
      isDateBlocked,
      isDateBlockedForAll,
    ],
  );

  const handleProductsConfirm = useCallback(
    (data) => {
      if (!pendingBookingData) return;

      setPurchaseData(data);
      setShowProductsModal(false);

      const hasProducts = data.products.length > 0;
      const canDirectConfirmByPlanCoverage =
        pendingBookingData.serviceCoveredByPlan === true &&
        Number(pendingBookingData.servicePrice || 0) === 0;

      if (!hasProducts && data.finalTotal === 0 && canDirectConfirmByPlanCoverage) {
        handleDirectConfirmation();
        return;
      }

      if (!availableBookingPaymentMethods.length) {
        showToast('Nenhuma forma de pagamento está disponível no momento. Fale com a barbearia.', 'danger');
        return;
      }

      setShowPaymentChoiceModal(true);
    },
    [pendingBookingData, availableBookingPaymentMethods, showToast],
  );

  const handleBookWithMonthlyLockConfirm = useCallback(
    (bookingData) => {
      const requiresMonthlyLockConfirm =
        !isAdmin &&
        hasLocalActiveSubscription &&
        !shouldApplyMonthlyBarberLock &&
        !bookingForDependent &&
        !bookingForUser;

      if (requiresMonthlyLockConfirm) {
        setPendingMonthlyLockBookingData(bookingData);
        setShowMonthlyLockConfirmModal(true);
        return;
      }

      handleBook(bookingData);
    },
    [
      isAdmin,
      hasLocalActiveSubscription,
      shouldApplyMonthlyBarberLock,
      bookingForDependent,
      bookingForUser,
      handleBook,
    ],
  );

  const handleMonthlyLockConfirm = useCallback(() => {
    if (!pendingMonthlyLockBookingData) {
      setShowMonthlyLockConfirmModal(false);
      return;
    }

    const bookingData = pendingMonthlyLockBookingData;
    setPendingMonthlyLockBookingData(null);
    setShowMonthlyLockConfirmModal(false);
    handleBook(bookingData);
  }, [pendingMonthlyLockBookingData, handleBook]);

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
      showToast(
        extractAppointmentErrorMessage(
          error,
          'Não foi possível cancelar este agendamento.',
        ),
        'danger',
      );
      setExistingAppointment(null);
      setSelectedDate(null);
      setIsRescheduling(false);
      return;
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
      showToast(
        extractAppointmentErrorMessage(error, 'Não foi possível cancelar este agendamento.'),
        'danger',
      );
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

      if (activeUserSubscription && !isAdmin) {
        await ensureMonthlyBarberLock(pendingBookingData.barberId, pendingBookingData.barberName);
      }

      const selectedDependent = bookingForDependent
        ? dependentsForBooking.find((dep) => dep.id === bookingForDependent.id)
        : null;

      const responsibleId = bookingForDependent
        ? selectedDependent?.parent_id || selectedDependent?.parentId || null
        : activeClient.id;

      if (bookingForDependent && !responsibleId) {
        throw new Error('Não foi possível localizar o responsável do dependente.');
      }

      const newAppointment = {
        barberId: pendingBookingData.barberId,
        barberName: pendingBookingData.barberName,
        services: pendingBookingData.services,
        date: pendingBookingData.date,
        time: pendingBookingData.time,
        client: activeClient.name,
        clientId: responsibleId,
        ...(bookingForDependent
          ? {
              isDependent: true,
              dependentName: bookingForDependent.name,
              dependentId: bookingForDependent.id,
            }
          : {}),
        products: [],
        notes: pendingBookingData.observation || '',
      };

      console.log('bookingForUser', bookingForUser);
      console.log('activeClient', activeClient);
      console.log('newAppointment', newAppointment);

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
        status: 'covered',
        paymentMethod: 'subscription',
      };

      await criarPagamentoAgendamento(paymentData);

      // Adiciona o agendamento criado ao estado local imediatamente
      setAppointments((prev) => [createdAppointment, ...prev]);

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
          { label: 'Serviços', value: serviceNames },
        ],
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
      showToast(extractAppointmentErrorMessage(error), 'danger');
    } finally {
      setBookingInProgress(false);
    }
  }, [
    pendingBookingData,
    isRescheduling,
    existingAppointment,
    activeClient?.id,
    dependentsForBooking,
    loadData,
    showToast,
    activeUserSubscription,
    isBarberLocked,
    isAdmin,
      ensureMonthlyBarberLock,
    clearPaymentCache,
  ]);

  const handlePaymentChoice = useCallback(
    async (selectedMethod) => {
      try {
        if (!pendingBookingData || !purchaseData) return;

        if (selectedMethod === 'pix') {
          setPixLoading(true);
        }

        if (selectedMethod === 'free') {
          await handleDirectConfirmation();
          setShowPaymentChoiceModal(false);
          return;
        }

        const payNow = selectedMethod !== 'local';

        if (payNow) {
          setBookingInProgress(true);

          if (activeUserSubscription && !isAdmin) {
            await ensureMonthlyBarberLock(pendingBookingData.barberId, pendingBookingData.barberName);
          }

          const selectedDependent = bookingForDependent
            ? dependentsForBooking.find((dep) => dep.id === bookingForDependent.id)
            : null;

          const responsibleId = bookingForDependent
            ? (selectedDependent?.parent_id || selectedDependent?.parentId || null)
            : activeClient.id;

          if (bookingForDependent && !responsibleId) {
            throw new Error('Não foi possível localizar o responsável do dependente.');
          }

          const serviceNames = pendingBookingData.services.map((s) => s.name).join(', ');
          const productNames = purchaseData.products
            .map((p) => `${p.name} x${p.quantity}`)
            .join(', ');
          const fullDescription = productNames ? `${serviceNames}, ${productNames}` : serviceNames;

          const paymentPlan = {
            id: `temp-${Date.now()}`,
            name: fullDescription,
            price: purchaseData.finalTotal,
          };

          const newAppointment = {
            barberId: pendingBookingData.barberId,
            barberName: pendingBookingData.barberName,
            services: pendingBookingData.services,
            date: pendingBookingData.date,
            time: pendingBookingData.time,
            client: activeClient.name,
            clientId: responsibleId,
            ...(bookingForDependent
              ? {
                  isDependent: true,
                  dependentName: bookingForDependent.name,
                  dependentId: bookingForDependent.id,
                }
              : {}),
            products: purchaseData.products,
            notes: pendingBookingData.observation || '',
          };

          setSelectedAppointmentForPayment({
            ...paymentPlan,
            paymentMethod: selectedMethod,
            isAppointment: true,
            needsCreation: true,
            appointmentData: newAppointment,
            paymentData: {
              userId: responsibleId || currentUser.id,
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

          if (activeUserSubscription && !isAdmin) {
            await ensureMonthlyBarberLock(pendingBookingData.barberId, pendingBookingData.barberName);
          }

          const response = await axios.get(`${import.meta.env.VITE_API_URL}/dependents`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const dependentsList = Array.isArray(response.data)
            ? response.data
            : response.data?.dependents || response.data?.data || [];

          const selectedDependent = bookingForDependent
            ? dependentsList.find((dep) => dep.id === bookingForDependent.id)
            : null;

          const responsibleId = bookingForDependent
            ? selectedDependent?.parent_id || selectedDependent?.parentId || null
            : activeClient.id;

          if (bookingForDependent && !responsibleId) {
            throw new Error('Não foi possível localizar o responsável do dependente.');
          }

          const newAppointment = {
            barberId: pendingBookingData.barberId,
            barberName: pendingBookingData.barberName,
            services: pendingBookingData.services,
            date: pendingBookingData.date,
            time: pendingBookingData.time,
            client: activeClient.name,
            clientId: responsibleId,
            ...(bookingForDependent
              ? {
                  isDependent: true,
                  dependentName: bookingForDependent.name,
                  dependentId: bookingForDependent.id,
                }
              : {}),
            products: purchaseData.products,
            notes: pendingBookingData.observation || '',
          };

          const createdAppointment = await createAppointment(newAppointment);

          const serviceNames = pendingBookingData.services.map((s) => s.name).join(', ');

          const paymentData = {
            appointmentId: createdAppointment.id,
            userId: responsibleId || currentUser.id,
            userName: activeClient.name,
            amount: purchaseData.finalTotal,
            serviceName: serviceNames,
            barberName: pendingBookingData.barberName,
            appointmentDate: pendingBookingData.date,
            appointmentTime: pendingBookingData.time,
            products: purchaseData.products,
            status: 'pending',
            method: 'local',
          };

          await criarPagamentoAgendamento(paymentData);
          clearPaymentCache(createdAppointment.id);

          // Adiciona o agendamento criado ao estado local imediatamente
          setAppointments((prev) => [createdAppointment, ...prev]);

          if (purchaseData.products && purchaseData.products.length > 0) {
            await Promise.all(
              purchaseData.products.map((p) => handleUpdateStock(p.id, p.quantity || 1)),
            );
          }

          await loadData();
          await new Promise((resolve) => setTimeout(resolve, 500));

          const productInfo =
            purchaseData.products.length > 0 ? ` + ${purchaseData.products.length} produto(s)` : '';

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
              { label: 'Total', value: `R$ ${purchaseData.finalTotal.toFixed(2)}` },
            ],
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
        showToast(extractAppointmentErrorMessage(error), 'danger');
      } finally {
        setBookingInProgress(false);
        setPixLoading(false);
      }
    },
    [
      pendingBookingData,
      purchaseData,
      isRescheduling,
      existingAppointment,
      activeClient?.id,
      dependentsForBooking,
      loadData,
      showToast,
      clearPaymentCache,
      activeUserSubscription,
      isAdmin,
      ensureMonthlyBarberLock,
    ],
  );

  const handlePaymentSuccess = useCallback(async () => {
    setPostPaymentLoading(true);
    try {
      clearAllPaymentsCache();
      await loadData();
      setShowPaymentModal(false);
      setSelectedAppointmentForPayment(null);
      setView('myAppointments');
    } finally {
      setPostPaymentLoading(false);
    }
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
      showToast(
        extractAppointmentErrorMessage(error, 'Não foi possível cancelar este agendamento.'),
        'danger',
      );
    }
  }, [appointmentToDelete, loadData, showToast, clearPaymentCache]);

  const myAppointmentsBase = useMemo(() => {
    const now = new Date();
    const normalizedCurrentUserId = String(currentUser?.id ?? '');
    const dependentLookupIds = buildDependentLookupIds(userDependents);

    return appointments.filter((apt) => {
      const normalizedAppointmentClientId = String(apt?.clientId ?? apt?.client?.id ?? '');
      const isCurrentUserAppointment =
        normalizedAppointmentClientId === normalizedCurrentUserId ||
        isAppointmentFromCurrentUser(apt, normalizedCurrentUserId, dependentLookupIds);

      if (!isCurrentUserAppointment) return false;

      const appointmentStatus = String(apt.status || '').toLowerCase();
      if (['cancelled', 'no_show'].includes(appointmentStatus)) return false;

      const appointmentDateTime = getAppointmentStartDate(apt);
      if (!appointmentDateTime) return false;

      // Remove agendamentos que já passaram considerando data e hora atual.
      if (appointmentDateTime < now) return false;

      return true;
    });
  }, [appointments, currentUser?.id, userDependents]);

  const myAppointments = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return myAppointmentsBase.filter((apt) => {
      const appointmentDateTime = new Date(apt.startAt || apt.endAt);
      const aptMonth = appointmentDateTime.getMonth();
      const aptYear = appointmentDateTime.getFullYear();

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
  }, [appointmentFilter, myAppointmentsBase]);

  const currentMonthAppointmentsCount = useMemo(() => {
    const now = new Date();
    return myAppointmentsBase.filter((apt) => {
      const appointmentDateTime = new Date(apt.startAt || apt.endAt);
      return (
        appointmentDateTime.getMonth() === now.getMonth() &&
        appointmentDateTime.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [myAppointmentsBase]);

  const upcomingAppointmentsCount = useMemo(() => {
    const now = new Date();
    return myAppointmentsBase.filter((apt) => {
      const appointmentDateTime = new Date(apt.startAt || apt.endAt);
      return (
        appointmentDateTime.getFullYear() > now.getFullYear() ||
        (appointmentDateTime.getFullYear() === now.getFullYear() &&
          appointmentDateTime.getMonth() > now.getMonth())
      );
    }).length;
  }, [myAppointmentsBase]);

  const renderReminder = () => {
    if (getUpcomingReminders.length === 0) return null;
    const next = getUpcomingReminders[0];
    const appointmentDate = new Date(next.startAt);
    const isToday = appointmentDate.toDateString() === new Date().toDateString();
    const isTomorrow =
      new Date(appointmentDate.getTime() - 86400000).toDateString() === new Date().toDateString();

    let dateLabel = '';
    if (isToday) dateLabel = 'hoje';
    else if (isTomorrow) dateLabel = 'amanhã';
    else dateLabel = `dia ${appointmentDate.toLocaleDateString('pt-BR')}`;

    const time = appointmentDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: SAO_PAULO_TIME_ZONE,
    });
    const services = next.services?.map((s) => s.serviceName).join(', ') || 'serviço';
    const barberName = next.barber?.displayName || 'barbeiro';
    const products =
      next.products?.map((p) => `${p.productName} (x${p.quantity})`).join(', ') || '';
    const productText = products ? ` + produtos: ${products}` : '';

    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #d4af37, #b8932a)',
          color: '#1a1a1a',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <strong style={{ fontSize: '1rem' }}>📅 Lembrete de agendamento</strong>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Você tem um agendamento {dateLabel} às <strong>{time}</strong> com{' '}
            <strong>{barberName}</strong> para <strong>{services}</strong>
            {productText}.
          </p>
        </div>
        {/* <button
          onClick={() => {
            setView('myAppointments');
            setTimeout(() => {
              document.querySelector('.appointments-table')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          style={{
            background: '#1a1a1a',
            border: 'none',
            color: '#d4af37',
            padding: '6px 16px',
            borderRadius: '30px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.8rem',
          }}
        >
          Ver detalhes →
        </button> */}
      </div>
    );
  };

  const sortedMyAppointments = useMemo(() => {
    return [...myAppointments].sort((a, b) => {
      const dateA = getAppointmentStartDate(a) || new Date(0);
      const dateB = getAppointmentStartDate(b) || new Date(0);
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
                Usuário: {currentUser?.name}{' '}
                {isAdmin && <span style={{ marginLeft: '10px', color: '#d4af37' }}>(Admin)</span>}
              </p>
            </div>
            <div className="admin-header-actions">
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="btn-header">
                  Painel Admin
                </button>
              )}
              {/* <button className="btn-header btn-header-logout" onClick={handleLogout}>
                Sair
              </button> */}
            </div>
          </div>

          {renderReminder()}

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
              Meus Agendamentos
            </button>
          </div>

          {view === 'calendar' && (
            <div className="appointments__booking">
              <h2>Selecione uma data</h2>

              {!canScheduleForOthers && userDependents.length > 0 && (
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span style={{ color: '#a8a8a8', fontSize: '0.85rem', fontWeight: 600 }}>
                      👤 {canScheduleForOthers ? 'Dependentes do cliente selecionado' : 'Para quem é o agendamento?'}
                    </span>
                    {bookingForDependent && (
                      <button
                        onClick={() => {
                          setBookingForDependent(null);
                          setShowForWhomSelector(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                        }}
                      >
                        ✕ Limpar seleção
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div
                      onClick={() => {
                        setBookingForDependent(null);
                        setShowForWhomSelector(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '10px 12px',
                        borderRadius: 9,
                        background: !bookingForDependent ? 'rgba(255,122,26,0.10)' : '#111',
                        border: '1px solid ' + (!bookingForDependent ? '#ff7a1a' : '#222'),
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: '#2a2a2a',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {currentUser?.photo ? (
                          <img
                            src={currentUser.photo}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          '👤'
                        )}
                      </div>
                      <div>
                        <p
                          style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}
                        >
                          {currentUser?.name}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#ff7a1a' }}>
                          Você mesmo
                        </p>
                      </div>
                      {!bookingForDependent && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            color: '#ff7a1a',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          ✓ Selecionado
                        </span>
                      )}
                    </div>

                    {dependentsForBooking.map((dep) => (
                      <div
                        key={dep.id}
                        onClick={() => setBookingForDependent(dep)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '10px 12px',
                          borderRadius: 9,
                          background:
                            bookingForDependent?.id === dep.id ? 'rgba(255,122,26,0.10)' : '#111',
                          border:
                            '1px solid ' +
                            (bookingForDependent?.id === dep.id ? '#ff7a1a' : '#222'),
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'rgba(255,122,26,0.15)',
                            border: '1px solid rgba(255,122,26,0.3)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ff7a1a',
                            fontWeight: 700,
                            fontSize: '1rem',
                          }}
                        >
                          {dep.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.88rem',
                            }}
                          >
                            {dep.name}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#777' }}>
                            {dep.age} anos · CPF: {dep.cpf}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.7rem',
                              color: '#e59a00',
                              marginTop: 2,
                            }}
                          >
                            ⚠️ Pagamento individual necessário — não utiliza seu plano
                          </p>
                        </div>
                        {bookingForDependent?.id === dep.id && (
                          <span style={{ color: '#ff7a1a', fontSize: '0.75rem', fontWeight: 700 }}>
                            ✓ Selecionado
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canScheduleForOthers && (
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: bookingForUser ? '0.75rem' : 0,
                    }}
                  >
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
                      {showUserSelector
                        ? 'Fechar'
                        : bookingForUser
                          ? 'Alterar'
                          : 'Selecionar cliente'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#2a2a2a',
                        overflow: 'hidden',
                        border: '2px solid ' + (bookingForUser ? '#ff7a1a' : '#444'),
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                      }}
                    >
                      {bookingForUser?.photo || currentUser?.photo ? (
                        <img
                          src={bookingForUser?.photo || currentUser?.photo}
                          alt="avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        {bookingForUser ? bookingForUser.name : currentUser?.name}
                        {!bookingForUser && (
                          <span style={{ color: '#ff7a1a', marginLeft: 6, fontSize: '0.75rem' }}>
                            (você)
                          </span>
                        )}
                      </p>
                      {bookingForUser && (
                        <button
                          onClick={() => {
                            setBookingForUser(null);
                            setShowUserSelector(false);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: 0,
                            marginTop: 2,
                          }}
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
                          width: '100%',
                          padding: '8px 12px',
                          background: '#111',
                          border: '1px solid #333',
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                          marginBottom: '0.5rem',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <div
                        style={{
                          maxHeight: 220,
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                        }}
                      >
                        <div
                          onClick={() => {
                            setBookingForUser(null);
                            setShowUserSelector(false);
                            setUserSearch('');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: !bookingForUser ? 'rgba(255,122,26,0.12)' : '#111',
                            border: '1px solid ' + (!bookingForUser ? '#ff7a1a' : '#222'),
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: '#2a2a2a',
                              overflow: 'hidden',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {currentUser?.photo ? (
                              <img
                                src={currentUser.photo}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              '👤'
                            )}
                          </div>
                          <div>
                            <p
                              style={{
                                margin: 0,
                                color: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                              }}
                            >
                              {currentUser?.name}
                            </p>
                            <p style={{ margin: 0, color: '#ff7a1a', fontSize: '0.72rem' }}>
                              Você mesmo
                            </p>
                          </div>
                        </div>

                        {allUsers
                          .filter(
                            (u) =>
                              u.id !== currentUser?.id &&
                              u.role === 'client' &&
                              (!userSearch.trim() ||
                                u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                                u.phone?.includes(userSearch)),
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '8px 10px',
                                borderRadius: 8,
                                background:
                                  bookingForUser?.id === u.id ? 'rgba(255,122,26,0.12)' : '#111',
                                border:
                                  '1px solid ' + (bookingForUser?.id === u.id ? '#ff7a1a' : '#222'),
                                cursor: 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: '50%',
                                  background: '#2a2a2a',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {u.photo ? (
                                  <img
                                    src={u.photo}
                                    alt={u.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  '👤'
                                )}
                              </div>
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {u.name}
                                </p>
                                <p style={{ margin: 0, color: '#666', fontSize: '0.72rem' }}>
                                  {u.phone || u.email || u.role}
                                </p>
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
                disabledDates={blockedDates
                  .filter((b) => !b.barberId && !b.startTime && !b.endTime)
                  .map((b) => b.date)}
                maxDate={maxBookingDate}
              />

              {/* <DatePicker
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                disabledDates={blockedDates.filter(b => !b.startTime).map(b => b.date)}
                maxDate={maxBookingDate}
              /> */}

              {selectedDate &&
                (() => {
                  const dateStr = selectedDate.toLocaleDateString('en-CA');
                  const blockedInfo = blockedDates.find(
                    (b) => b.date === dateStr && !b.barberId && !b.startTime,
                  );

                  if (blockedInfo) {
                    return (
                      <div
                        style={{
                          background: '#ff4444',
                          color: 'white',
                          padding: '1rem',
                          borderRadius: '8px',
                          marginTop: '1rem',
                          textAlign: 'center',
                        }}
                      >
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

              {selectedDate &&
                !showConflictModal &&
                (() => {
                  const dateStr = selectedDate.toLocaleDateString('en-CA');
                  const isBlockedForAll = blockedDates.some(
                    (b) => b.date === dateStr && !b.barberId && !b.startTime,
                  );

                  if (isBlockedForAll) {
                    return null;
                  }

                  return (
                    <div className="appointments__barbers">
                      <h2>Barbeiros disponíveis em {selectedDate.toLocaleDateString('pt-BR')}</h2>
                      {shouldApplyMonthlyBarberLock && (
                        <div
                          style={{
                            margin: '0.6rem 0 1rem',
                            padding: '0.7rem 0.9rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(34, 197, 94, 0.45)',
                            background: 'rgba(34, 197, 94, 0.12)',
                            color: '#22c55e',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          Seu plano já está vinculado a {effectiveLockedBarberName || 'um barbeiro fixo'}.
                          Apenas esse barbeiro está disponível para agendamentos do plano.
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label
                          style={{
                            color: '#a8a8a8',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: '0.5rem',
                          }}
                        >
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
                      {visibleBarbers.length === 0 ? (
                        <p>Nenhum barbeiro disponível.</p>
                      ) : (
                        visibleBarbers.map((barber) => {
                          const barberWithPhoto = {
                            ...barber,
                            photo:
                              barber.photo ||
                              barber.avatar ||
                              `https://i.pravatar.cc/150?img=${barber.id}`,
                          };

                          const dateStr = selectedDate.toLocaleDateString('en-CA');
                          const isBarberBlocked = blockedDates.some(
                            (b) => b.date === dateStr && b.barberId === barber.id && !b.startTime,
                          );

                          if (isBarberBlocked) {
                            return null;
                          }

                          return (
                            <BarberCard
                              key={barber.id}
                              barber={barberWithPhoto}
                              services={
                                Array.isArray(barberWithPhoto.serviceIds)
                                  ? services.filter((s) => barberWithPhoto.serviceIds.includes(s.id))
                                  : []
                              }
                              selectedDate={selectedDate}
                              barberId={barber.id}
                              getBookedSlots={getBookedSlots}
                              generateTimes={generateTimes}
                              getAvailableTimes={getAvailableTimes}
                              calculateTotalDuration={calculateTotalDuration}
                              onBook={handleBookWithMonthlyLockConfirm}
                              onSelectBarber={() => {
                                setSelectedBarberId(barber.id);
                              }}
                              isActive={
                                normalizeId(selectedBarberId) === normalizeId(barber.id) ||
                                (
                                  shouldApplyMonthlyBarberLock &&
                                  normalizeId(visibleLockedBarberId) === normalizeId(barber.id)
                                )
                              }
                              showToast={showToast}
                              preSelectedService={preSelectedService}
                              hasActiveSubscription={hasActiveSubscription}
                              isServiceCoveredByPlan={isServiceCoveredByPlan}
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
              

              <div
                className="appointments-filter-tabs"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  borderBottom: '2px solid #333',
                }}
              >
                <button
                  onClick={() => setAppointmentFilter('current')}
                  className={`tab-btn ${appointmentFilter === 'current' ? 'tab-btn--active' : ''}`}
                >
                  Este Mês ({currentMonthAppointmentsCount})
                </button>
                <button
                  onClick={() => setAppointmentFilter('upcoming')}
                  className={`tab-btn ${appointmentFilter === 'upcoming' ? 'tab-btn--active' : ''}`}
                >
                  Próximos ({upcomingAppointmentsCount})
                </button>
                <button
                  onClick={() => setAppointmentFilter('all')}
                  className={`tab-btn ${appointmentFilter === 'all' ? 'tab-btn--active' : ''}`}
                >
                  Todos ({myAppointmentsBase.length})
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
                        <th>Pagamento</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMyAppointments.map((apt) => {
                        const payment = appointmentPayments[apt.id];
                        const appointmentStatus = String(apt.status || '').toLowerCase();
                        const isPending =
                          payment &&
                          (payment.status === 'pending' || payment.status === 'confirmed_unpaid');
                        const isPendingLocal =
                          payment && payment.status === 'pending' && payment.method === 'local';
                        const isPaid = payment && payment.status === 'paid';
                        const isPlanCovered =
                          payment &&
                          (payment.status === 'covered' ||
                            payment.status === 'plancovered' ||
                            payment.status === 'plan_covered' ||
                            payment.paymentMethod === 'subscription');
                        const paymentMethodRaw = String(
                          payment?.method || payment?.paymentMethod || '',
                        ).toLowerCase();
                        const isLocalPayment =
                          paymentMethodRaw === 'local' || paymentMethodRaw === 'pendinglocal';

                        const appointmentDate = new Date(apt.endAt);
                        const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

                        const time = new Date(apt.startAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        const servicesTotal = Array.isArray(apt.services)
                          ? apt.services.reduce((sum, s) => {
                              const price =
                                typeof s.unitPrice === 'string'
                                  ? parseFloat(
                                      s.unitPrice.replace(/R\$/g, '').replace(/,/g, '.').trim(),
                                    ) || 0
                                  : s.unitPrice || 0;
                              return sum + price;
                            }, 0)
                          : 0;

                        const productsTotal =
                          apt.products && apt.products.length > 0
                            ? apt.products.reduce((sum, p) => {
                                const price =
                                  typeof p.unitPrice === 'string'
                                    ? parseFloat(
                                        p.unitPrice.replace(/R\$/g, '').replace(/,/g, '.').trim(),
                                      ) || 0
                                    : p.unitPrice || 0;
                                return sum + price * (p.quantity || 1);
                              }, 0)
                            : 0;

                        const allServicesCoveredByPlan =
                          Array.isArray(apt.services) &&
                          apt.services.length > 0 &&
                          apt.services.every((service) =>
                            isServiceCoveredByPlan({
                              id: service.serviceId || service.id,
                              name: service.serviceName || service.name,
                            }),
                          );

                        const shouldZeroByCoverage = allServicesCoveredByPlan && productsTotal === 0;

                        const effectiveServicesTotal =
                          isPlanCovered || shouldZeroByCoverage ? 0 : servicesTotal;
                        const total = effectiveServicesTotal + productsTotal;

                        let statusClass = 'pending';
                        let statusText = 'Pendente';

                        let paymentStatusClass = 'paid';
                        let paymentStatusText = 'Pago';

                        if (isLocalPayment) {
                          paymentStatusClass = 'pending-local';
                          paymentStatusText = 'Local';
                        }

                        if (appointmentStatus === 'confirmed') {
                          statusClass = 'confirmed';
                          statusText = 'Confirmado';
                        } else if (appointmentStatus === 'completed') {
                          statusClass = 'completed';
                          statusText = 'Finalizado';
                        } else if (appointmentStatus === 'cancelled') {
                          statusClass = 'cancelled';
                          statusText = 'Cancelado';
                        } else if (appointmentStatus === 'no_show') {
                          statusClass = 'cancelled';
                          statusText = 'Não Compareceu';
                        }

                        const barber = barbers.find((b) => b.id === apt.barberId);
                        const barberDisplayName =
                          apt?.barber?.displayName || barber?.displayName || 'Barbeiro';
                        const barberPhoto = barber?.photo || barber?.avatar || apt?.barber?.photo || '';
                        const barberInitial =
                          String(barberDisplayName).trim().charAt(0).toUpperCase() || '?';
                        const showBarberPhoto = Boolean(barberPhoto) && !barberAvatarErrors[apt.id];
                        // = barber
                        //   ? barber.photo || barber.avatar || `https://i.pravatar.cc/150?img=${barber.id}`
                        //   : `https://i.pravatar.cc/150?img=${apt.barberId}`;

                        return (
                          <tr key={apt.id}>
                            <td data-label="Barbeiro">
                              <div className="appointment-barber">
                                {showBarberPhoto ? (
                                  <img
                                    src={barberPhoto}
                                    alt={barberDisplayName}
                                    className="appointment-barber-avatar"
                                    onError={() =>
                                      setBarberAvatarErrors((prev) => ({ ...prev, [apt.id]: true }))
                                    }
                                  />
                                ) : (
                                  <div className="appointment-barber-avatar appointment-barber-avatar--fallback">
                                    {barberInitial}
                                  </div>
                                )}
                                <span className="appointment-barber-name">
                                  {barberDisplayName}
                                </span>
                              </div>
                            </td>
                            <td data-label="Para">
                              {apt.dependent ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(255,122,26,0.12)',
                                    color: '#ff7a1a',
                                    border: '1px solid rgba(255,122,26,0.35)',
                                    borderRadius: '20px',
                                    padding: '2px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  👤 {apt.dependent.name}
                                </span>
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
                              {apt.notes ? (
                                <div>
                                  <button
                                    onClick={() =>
                                      setExpandedObsId(expandedObsId === apt.id ? null : apt.id)
                                    }
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
                                    <div
                                      style={{
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
                                      }}
                                    >
                                      {apt.notes}
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
                                      {product.productName} x{product.quantity}
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
                              <span className={`appointment-status ${statusClass}`}>
                                {statusText}
                              </span>
                            </td>
                            <td data-label="Pagamento" className="appointment-status-cell">
                              <span className={`appointment-status ${paymentStatusClass}`}>
                                {paymentStatusText}
                              </span>
                            </td>
                            <td data-label="Ações" className="appointment-actions-cell">
                              <div className="appointment-actions">
                                {appointmentStatus !== 'completed' && (
                                  <button
                                    onClick={() => handleDeleteClick(apt.id)}
                                    className="btn-action cancel"
                                  >
                                    Cancelar
                                  </button>
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
        serviceCoveredByPlan={pendingBookingData?.serviceCoveredByPlan || false}
        servicePrice={pendingBookingData?.servicePrice || 0}
        serviceName={pendingBookingData?.services?.map((s) => s.name).join(', ') || ''}
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
                serviceName: pendingBookingData.services.map((s) => s.name).join(', '),
              }
            : null
        }
        purchaseData={purchaseData}
        availablePaymentMethods={availableBookingPaymentMethods}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successData?.title}
        message={successData?.message}
        details={successData?.details}
      />

      <ConfirmModal
        isOpen={showMonthlyLockConfirmModal}
        onClose={() => {
          setShowMonthlyLockConfirmModal(false);
          setPendingMonthlyLockBookingData(null);
        }}
        onConfirm={handleMonthlyLockConfirm}
        title="Atenção"
        message={`Ao confirmar este agendamento com ${pendingMonthlyLockBookingData?.barberName || 'este barbeiro'}, ele ficará vinculado ao seu plano como barbeiro fixo. Enquanto esse vínculo estiver ativo, apenas esse barbeiro ficará disponível para novos agendamentos do plano.`}
        confirmText="Entendi e confirmar"
        cancelText="Cancelar"
        variant="warning"
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
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <strong>Barbeiro:</strong> {existingAppointment.barber.displayName}
                  </div>
                  <div>
                    <strong>Data:</strong>{' '}
                    {new Date(existingAppointment.endAt).toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <strong>Horário:</strong> {existingAppointment.time}
                  </div>
                  <div>
                    <strong>Serviços:</strong>{' '}
                    {Array.isArray(existingAppointment.services)
                      ? existingAppointment.services.map((s) => s.serviceName).join(', ')
                      : '-'}
                  </div>
                </div>
              </div>
              <p style={{ marginBottom: '1.5rem', color: '#999' }}>
                Gostaria de reagendar ou cancelar este agendamento?
              </p>
              <div
                style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
              >
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

      {pixLoading && (
        <div className="booking-overlay">
          <div className="booking-overlay-content">
            <div className="booking-spinner"></div>
            <h2>Gerando QR Code PIX...</h2>
            <p>Estamos preparando o pagamento, isso pode levar alguns segundos.</p>
          </div>
        </div>
      )}

      {postPaymentLoading && (
        <div className="booking-overlay">
          <div className="booking-overlay-content">
            <div className="booking-spinner"></div>
            <h2>Pagamento confirmado</h2>
            <p>Atualizando seus agendamentos...</p>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </BaseLayout>
  );
}
