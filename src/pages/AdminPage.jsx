import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import { getSession, logout } from '../services/authService';
import { getUserById, getUsers, importUsers as importUsersBatch } from '../services/userServices';
import {
  getTermsDocument,
  uploadTermsDocument,
  deleteTermsDocument,
} from '../services/termsService';
import { getBarbers, createBarber, updateBarber, deleteBarber } from '../services/barberServices';
import {
  getAppointments,
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from '../services/appointmentService';
import {
  criarPagamentoAgendamento,
  buscarTodasAssinaturas,
  buscarTodosPagamentosAgendamentos,
  atualizarPagamentoAgendamento,
  buscarTodasVendasProdutos,
  atualizarVendaProduto,
} from '../services/paymentService';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  reactivateProduct,
  importProducts as importProductsBatch,
} from '../services/productService';
import {
  getPixKey,
  savePixKey,
  getHomeInfo,
  saveHomeInfo,
  getPaymentVisibilitySettings,
  savePaymentVisibilitySettings,
} from '../services/settingsService';
import './AuthPages.css';

import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  reactivateService,
  importServices as importServicesBatch,
} from '../services/serviceServices';

import {
  getGallery,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} from '../services/homeServices';
import { uploadImagem } from '../services/cloudinaryService';
import { getToken } from '../services/authService';

export default function AdminPage() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const currentUserRef = useRef(getSession());
  const currentUser = currentUserRef.current;
  const [uploadedTermsDoc, setUploadedTermsDoc] = useState(null);
  const [termsDocUrl, setTermsDocUrl] = useState('');
  /*   const [activeTab, setActiveTab] = useState('employees');*/
  const [activeTab, setActiveTab] = useState('agendamentos');
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin' || currentUser.isAdmin === true) {
        setActiveTab('homeInfo');  // ou a aba que desejar para admin
      } else {
        setActiveTab('agendamentos');
      }
    }
  }, [currentUser]);
  const [barbers, setBarbers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allDependents, setAllDependents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [confirmCancelSub, setConfirmCancelSub] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [subscriptionSearchType, setSubscriptionSearchType] = useState('name');
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState({
    date: '',
    reason: '',
    barberId: null,
    blockType: 'day',
    startTime: '',
    endTime: '',
  });
  const [loadingBlockedDates, setLoadingBlockedDates] = useState(false);
  const [appointmentPayments, setAppointmentPayments] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [clientSubscriptionStatus, setClientSubscriptionStatus] = useState({});
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: '',
    promotionalPrice: '',
    commissionPercent: '',
    coveredByPlan: false,
    image: '',
    duration: '',
  });

  const [earningsFilter, setEarningsFilter] = useState('week');
  const [barberProfile, setBarberProfile] = useState(null);
  const isBarber = useMemo(() => currentUser?.role === 'barber', [currentUser?.role]);
  const loggedInBarberProfile = useMemo(() => {
    const isAdminUser = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
    if (isAdminUser) return barberProfile;

    const matchedBarber = barbers.find(
      (barber) =>
        String(barber.userId || '') === String(currentUser?.id || '') ||
        String(barber.id || '') === String(currentUser?.barberId || '') ||
        (currentUser?.email &&
          String(barber.email || '').toLowerCase() === String(currentUser.email).toLowerCase()),
    );

    return barberProfile || matchedBarber || null;
  }, [barbers, barberProfile, currentUser?.barberId, currentUser?.email, currentUser?.id, currentUser?.isAdmin, currentUser?.role]);
  const loggedInBarberReferenceIds = useMemo(() => {
    return Array.from(
      new Set(
        [
          loggedInBarberProfile?.id,
          loggedInBarberProfile?.userId,
          currentUser?.id,
          currentUser?.barberId,
        ]
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    );
  }, [loggedInBarberProfile?.id, loggedInBarberProfile?.userId, currentUser?.barberId, currentUser?.id]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [pixKey, setPixKey] = useState('');
  const [pixKeySaved, setPixKeySaved] = useState('');
  const [pixKeyValidation, setPixKeyValidation] = useState({
    isValid: false,
    type: '',
    message: '',
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [appointmentDateFilter, setAppointmentDateFilter] = useState('');
  const [appointmentStartDate, setAppointmentStartDate] = useState('');
  const [appointmentEndDate, setAppointmentEndDate] = useState('');
  const [paymentDateFilter, setPaymentDateFilter] = useState('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  const [selectedBarberFilter, setSelectedBarberFilter] = useState('all');

  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberForm, setBarberForm] = useState({
    displayName: '',
    specialty: '',
    photo: '',
    salarioFixo: '',
    paymentFrequency: 'mensal',
    createUser: false,
    userEmail: '',
    userPassword: '',
    userPhone: '',
    userRole: 'barber',
    serviceIds: [],
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    subscriberDiscount: 0,
    stock: 0,
    imageUrl: '',
  });
  const [homeInfo, setHomeInfo] = useState({
    heroTitle: '',
    heroSubtitle: '',
    heroImage: '',
    heroImages: [],
    aboutTitle: '',
    aboutText1: '',
    aboutText2: '',
    aboutText3: '',
    scheduleTitle: '',
    scheduleLine1: '',
    scheduleLine2: '',
    scheduleLine3: '',
    whatsappNumber: '',
    locationTitle: '',
    locationAddress: '',
    locationCity: '',
  });
  const [homeInfoLoading, setHomeInfoLoading] = useState(false);
  const [expandedBarbers, setExpandedBarbers] = useState({});
  const [expandedObsId, setExpandedObsId] = useState(null);
  const [employeeVales, setEmployeeVales] = useState([]);
  const [employeePayments, setEmployeePayments] = useState([]);
  const [extraPaymentForm, setExtraPaymentForm] = useState({
    employeeId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [extraPaymentLoading, setExtraPaymentLoading] = useState(false);
  const [extraPaymentMonthFilter, setExtraPaymentMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollPeriodFilter, setPayrollPeriodFilter] = useState('mensal');
  const [payrollMonthFilter, setPayrollMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [valeForm, setValeForm] = useState({
    employeeId: '',
    valor: '',
    observacao: '',
    data: new Date().toISOString().split('T')[0],
  });
  const [showValeModal, setShowValeModal] = useState(false);
  const [payrollExpandedId, setPayrollExpandedId] = useState(null);
  const [showChangeBarberModal, setShowChangeBarberModal] = useState(false);
  const [selectedAppointmentForBarberChange, setSelectedAppointmentForBarberChange] =
    useState(null);
  const [newBarberId, setNewBarberId] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '' });
  const [showOffScheduleModal, setShowOffScheduleModal] = useState(false);
  const [offScheduleSaving, setOffScheduleSaving] = useState(false);
  const [offScheduleForm, setOffScheduleForm] = useState({
    clientId: '',
    barberId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    serviceIds: [],
    notes: '',
  });

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

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

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
    if (text.includes('ter') || text.includes('terca')) {
      if (text.includes('a sab')) return [2, 3, 4, 5, 6];
      if (text.includes('a sex')) return [2, 3, 4, 5];
      return [2];
    }
    if (text.includes('qua') || text.includes('quarta')) return [3];
    if (text.includes('qui') || text.includes('quinta')) return [4];
    if (text.includes('sex') || text.includes('sexta')) return [5];
    if (text.includes('sab') || text.includes('sabado')) return [6];

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

  const formatMinutesAsTime = (minutes) => {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const getOffScheduleTimeOptions = useCallback(
    (dateStr) => {
      const selectedDate = parseDateOnly(dateStr);
      if (!selectedDate) return [];

      const workingHours = getWorkingHoursForDate(selectedDate);
      const options = [];

      for (let current = 0; current < 24 * 60; current += 30) {
        const isOutsideWorkingHours =
          !workingHours || current < workingHours.open || current >= workingHours.close;

        if (isOutsideWorkingHours) {
          options.push(formatMinutesAsTime(current));
        }
      }

      return options;
    },
    [getWorkingHoursForDate],
  );

  const offScheduleTimeOptions = useMemo(
    () => getOffScheduleTimeOptions(offScheduleForm.date),
    [getOffScheduleTimeOptions, offScheduleForm.date],
  );

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    mpPreapprovalPlanId: '',
    mpSubscriptionUrl: '',
  });
  const [planSaving, setPlanSaving] = useState(false);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [selectedPlanForBenefit, setSelectedPlanForBenefit] = useState(null);
  const [benefitForm, setBenefitForm] = useState('');
  const [benefitServiceId, setBenefitServiceId] = useState('');

  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState({});

  const [categoryFilter, setCategoryFilter] = useState('all');
  const usersImportInputRef = useRef(null);
  const productsImportInputRef = useRef(null);
  const servicesImportInputRef = useRef(null);
  const [importingUsers, setImportingUsers] = useState(false);
  const [importingProducts, setImportingProducts] = useState(false);
  const [importingServices, setImportingServices] = useState(false);

  const [gallery, setGallery] = useState([]);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingGalleryImage, setEditingGalleryImage] = useState(null);
  const [galleryForm, setGalleryForm] = useState({ url: '', alt: '' });
  const [galleryLoading, setGalleryLoading] = useState(false);
  const MAX_GALLERY_IMAGES = 15;

  const [barberPhotoUploading, setBarberPhotoUploading] = useState(false);
  const [serviceImageUploading, setServiceImageUploading] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [heroCarouselUploading, setHeroCarouselUploading] = useState(false);
  const [heroCarouselInput, setHeroCarouselInput] = useState('');
  const [galleryImageUploading, setGalleryImageUploading] = useState(false);
  const HOME_INFO_LOCAL_KEY = 'barberone_home_info_local';

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [hiddenBookingPaymentMethods, setHiddenBookingPaymentMethods] = useState([]);
  const [savingPaymentVisibility, setSavingPaymentVisibility] = useState(false);

  const normalizedAppointmentPayments = Array.isArray(appointmentPayments)
    ? appointmentPayments
    : Array.isArray(appointmentPayments?.items)
      ? appointmentPayments.items
      : [];
  const getFilteredPayments = () => {
    // let filtered = [...appointmentPayments];
    let filtered = [...normalizedAppointmentPayments];

    const getPaymentDate = (payment) => {
      if (payment.appointmentDate) return String(payment.appointmentDate).slice(0, 10);
      if (payment.createdAt) return String(payment.createdAt).slice(0, 10);
      return '';
    };

    if (paymentDateFilter) {
      filtered = filtered.filter(
        (payment) => getPaymentDate(payment) === toDateStr(paymentDateFilter),
      );
    } else if (paymentStartDate || paymentEndDate) {
      filtered = filtered.filter((payment) =>
        isDateInRange(getPaymentDate(payment), paymentStartDate, paymentEndDate),
      );
    } else if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter((payment) => {
        const [y, m] = getPaymentDate(payment).split('-');
        return parseInt(y) === parseInt(year) && parseInt(m) === parseInt(month);
      });
    }

    if (selectedBarberFilter !== 'all') {
      const selectedBarber = barbers.find(
        (b) => b.id?.toString() === selectedBarberFilter.toString(),
      );
      if (selectedBarber) {
        filtered = filtered.filter((payment) => payment.barberName === selectedBarber.name);
      }
    }

    return filtered;
  };

  const allPaid = getFilteredPayments().filter(
    (p) => p.status === 'paid' || p.status === 'plan_covered' || p.status === 'plancovered',
  );

  const token = getToken();

  const isAdmin = useMemo(
    () => currentUser?.role === 'admin' || currentUser?.isAdmin === true,
    [currentUser?.role, currentUser?.isAdmin],
  );
  const isReceptionist = useMemo(() => currentUser?.role === 'receptionist', [currentUser?.role]);
  const canAccessEarnings = useMemo(() => isBarber && !isAdmin, [isBarber, isAdmin]);
  const hasAdminVisibility = useMemo(
    () => isAdmin || isReceptionist || currentUser?.permissions?.viewAdmin,
    [isAdmin, isReceptionist, currentUser?.permissions?.viewAdmin],
  );

  const barberNames = useMemo(() => {
    const allNames = [
      ...new Set(allPaid.map((p) => p.appointment?.barber?.displayName || 'Sem barbeiro')),
    ];

    if (isAdmin) {
      return allNames;
    } else {
      return allNames.filter(
        (name) => name === currentUser?.name || name === currentUser?.displayName,
      );
    }
  }, [allPaid, isAdmin, currentUser]);

  const loadHomeInfo = useCallback(async () => {
    try {
      const data = await getHomeInfo();
      if (data) {
        // Se for array, pega o primeiro elemento
        const homeData = Array.isArray(data) ? data[0] : data;
        setHomeInfo((prev) => ({
          ...prev,
          ...homeData,
          heroImages: Array.isArray(homeData?.heroImages) ? homeData.heroImages : [],
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar informações da home:', error);
    }
  }, []);
  const permissionsConfig = {
    viewAdmin: { label: 'Acessar Painel Admin', category: 'Acesso Básico', icon: '🔓' },
    manageEmployees: { label: 'Gerenciar Funcionários', category: 'Gestão de Pessoas', icon: '👥' },
    manageProducts: {
      label: 'Visualizar Aba Produtos',
      category: 'Gestão de Produtos',
      icon: '🛍️',
    },
    addProducts: { label: 'Adicionar Novos Produtos', category: 'Gestão de Produtos', icon: '➕' },
    editProducts: { label: 'Editar/Excluir Produtos', category: 'Gestão de Produtos', icon: '✏️' },
    manageServices: {
      label: 'Visualizar Aba Serviços',
      category: 'Gestão de Serviços',
      icon: '✂️',
    },
    addServices: { label: 'Adicionar Novos Serviços', category: 'Gestão de Serviços', icon: '➕' },
    editServices: { label: 'Editar/Excluir Serviços', category: 'Gestão de Serviços', icon: '✏️' },
    managePayments: { label: 'Ver Relatórios de Pagamentos', category: 'Financeiro', icon: '💰' },
    manageAgendamentos: { label: 'Ver Aba Agendamentos', category: 'Agendamentos', icon: '📅' },
    scheduleForOthers: {
      label: 'Agendar para Outros Clientes',
      category: 'Agendamentos',
      icon: '🗓️',
    },
    manageOffScheduleAppointments: { label: 'Agendar Fora do Horário', category: 'Agendamentos', icon: '⏰' },
    manageBenefits: {
      label: 'Gerenciar Benefícios dos Planos',
      category: 'Configurações',
      icon: '🎁',
    },
    manageSettings: {
      label: 'Alterar Configurações (PIX, Termos)',
      category: 'Configurações',
      icon: '⚙️',
    },
    manageGallery: { label: 'Gerenciar Galeria de Fotos', category: 'Conteúdo', icon: '🖼️' },
    managePayroll: { label: 'Ver Pagamentos de Funcionários', category: 'Financeiro', icon: '💰' },
    manageBlockedDates: { label: 'Bloquear Dias e Horários', category: 'Agendamentos', icon: '🚫' },
  };

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.isAdmin === true) return true;
    return currentUser.permissions?.[permission] === true;
  };

  const canManageGallery = hasPermission('manageGallery');
  const canManageAgendamentos = hasPermission('manageAgendamentos');

  const getFilteredEmployees = () => {
    if (categoryFilter === 'all') {
      return employees;
    }
    return employees.filter((emp) => emp.role === categoryFilter);
  };

  const [filter, setFilter] = useState('today');
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);

  // useEffect para atualizar os estados derivados
  useEffect(() => {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA');
    let filtered = [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
    if (filter === 'today') filtered = filtered.filter(apt => apt.date === today);
    if (filter === 'upcoming') filtered = filtered.filter(apt => new Date(`${apt.date}T${apt.time}`) >= now);
    setFilteredAppointments(filtered);
    setTodayAppointments(appointments.filter(apt => apt.date === today));
  }, [appointments, filter]);

  const loadGallery = async () => {
    try {
      setGalleryLoading(true);
      const data = await getGallery();
      setGallery(data || []);
    } catch (error) {
      console.error('Erro ao carregar galeria:', error);
      showToast('Erro ao carregar galeria', 'danger');
    } finally {
      setGalleryLoading(false);
    }
  };

  const openGalleryModal = (image = null) => {
    if (image) {
      setEditingGalleryImage(image);
      setGalleryForm({ url: image.url, alt: image.alt });
    } else {
      setEditingGalleryImage(null);
      setGalleryForm({ url: '', alt: '' });
    }
    setShowGalleryModal(true);
  };

  const closeGalleryModal = () => {
    setShowGalleryModal(false);
    setEditingGalleryImage(null);
    setGalleryForm({ url: '', alt: '' });
  };

  const handleGalleryFormChange = (field, value) => {
    setGalleryForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveGalleryImage = async (e) => {
    e.preventDefault();
    if (!galleryForm.url.trim()) {
      showToast('URL da imagem é obrigatória', 'danger');
      return;
    }
    if (!editingGalleryImage && gallery.length >= MAX_GALLERY_IMAGES) {
      showToast(`Limite de ${MAX_GALLERY_IMAGES} imagens atingido`, 'danger');
      return;
    }
    try {
      const imageData = {
        url: galleryForm.url.trim(),
        alt: galleryForm.alt.trim() || 'Imagem da galeria',
      };
      if (editingGalleryImage) {
        await updateGalleryImage(editingGalleryImage.id, imageData);
        showToast('Imagem atualizada com sucesso!', 'success');
      } else {
        await createGalleryImage(imageData);
        showToast('Imagem adicionada com sucesso!', 'success');
      }
      await loadGallery();
      closeGalleryModal();
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      showToast('Erro ao salvar imagem', 'danger');
    }
  };

  const handleDeleteGalleryImage = (imageId) => {
    showConfirm('Tem certeza que deseja excluir esta imagem?', async () => {
      try {
        await deleteGalleryImage(imageId);
        setGallery((prev) => prev.filter((img) => img.id !== imageId));
        showToast('Imagem excluída com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        showToast('Erro ao excluir imagem', 'danger');
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'gallery' && canManageGallery) {
      loadGallery();
    }
  }, [activeTab, canManageGallery]);

  useEffect(() => {
    if (activeTab === 'gallery' && !canManageGallery) {
      setActiveTab('calendario');
    }

    if (activeTab === 'agendamentos' && !canManageAgendamentos) {
      setActiveTab('calendario');
    }
  }, [activeTab, canManageGallery, canManageAgendamentos]);

  const toDateStr = (val) => {
    if (!val) return '';
    const s = String(val);

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    return s.slice(0, 10);
  };

  const isDateInRange = (dateStr, startDate, endDate) => {
    if (!startDate && !endDate) return true;
    const d = toDateStr(dateStr);
    const s = toDateStr(startDate);
    const e = toDateStr(endDate);
    if (s && e) return d >= s && d <= e;
    if (s) return d >= s;
    if (e) return d <= e;
    return true;
  };

  const getFilteredAppointments = () => {
    let filtered = [...appointments];

    if (isBarber) {
      const loggedInBarber = barbers.find(
        (b) =>
          b.userId?.toString() === currentUser?.id?.toString() ||
          b.id?.toString() === currentUser?.barberId?.toString() ||
          (currentUser?.email && b.email === currentUser.email),
      );

      if (loggedInBarber) {
        filtered = filtered.filter(
          (appointment) =>
            (appointment.barberId || appointment.barber?.id)?.toString() ===
            loggedInBarber.id?.toString(),
        );
      } else {
        filtered = [];
      }
    }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter((appointment) => {
        const appointmentDate = new Date(appointment.startAt);
        return (
          appointmentDate.getFullYear() === parseInt(year) &&
          appointmentDate.getMonth() + 1 === parseInt(month)
        );
      });
    }

    if (appointmentDateFilter) {
      filtered = filtered.filter((appointment) => {
        const appointmentDateStr = new Date(appointment.startAt).toISOString().split('T')[0];
        return appointmentDateStr === appointmentDateFilter;
      });
    } else if (appointmentStartDate || appointmentEndDate) {
      filtered = filtered.filter((appointment) => {
        const appointmentDateStr = new Date(appointment.startAt).toISOString().split('T')[0];
        return isDateInRange(appointmentDateStr, appointmentStartDate, appointmentEndDate);
      });
    }

    if (selectedBarberFilter !== 'all') {
      filtered = filtered.filter((appointment) => appointment.barberId === selectedBarberFilter);
    }

    return filtered;
  };

  const carregarHomeInfo = useCallback(async () => {
    try {
      const data = await getHomeInfo();
      setHomeInfo((prev) => ({
        ...prev,
        ...data,
        heroImages: Array.isArray(data?.heroImages) ? data.heroImages : [],
      }));
    } catch (error) {
      console.error('Erro ao carregar informações da home:', error);
    }
  }, []);

  const handleSaveHomeInfo = async (e) => {
    e.preventDefault();
    setHomeInfoLoading(true);

    try {
      await saveHomeInfo(homeInfo);
      showToast('Informações da home atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar informações da home:', error);
      showToast('Erro ao salvar informações da home', 'danger');
    } finally {
      setHomeInfoLoading(false);
    }
  };

  const handleHomeInfoChange = (field, value) => {
    setHomeInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const persistHomeInfo = async (nextHomeInfo) => {
    try {
      await saveHomeInfo(nextHomeInfo);
    } catch (error) {
      console.error('Erro ao salvar informações da home:', error);
      showToast('Erro ao salvar informações da home', 'danger');
      throw error;
    }
  };

  useEffect(() => {
    try {
      const heroImages = Array.isArray(homeInfo?.heroImages)
        ? homeInfo.heroImages.map((item) => String(item || '').trim()).filter(Boolean)
        : [];

      const localPayload = {
        heroTitle: String(homeInfo?.heroTitle || ''),
        heroSubtitle: String(homeInfo?.heroSubtitle || ''),
        heroImage: String(homeInfo?.heroImage || ''),
        heroImages,
      };

      localStorage.setItem(HOME_INFO_LOCAL_KEY, JSON.stringify(localPayload));
    } catch {
      // sem bloqueio: cache local apenas para resiliência do formulário
    }
  }, [homeInfo?.heroTitle, homeInfo?.heroSubtitle, homeInfo?.heroImage, homeInfo?.heroImages]);

  const addHeroImageToCarousel = async (rawUrl) => {
    const imageUrl = String(rawUrl || '').trim();
    if (!imageUrl) return;

    const current = Array.isArray(homeInfo?.heroImages) ? homeInfo.heroImages : [];
    if (current.includes(imageUrl)) return;

    const nextHomeInfo = {
      ...homeInfo,
      heroImages: [...current, imageUrl],
      heroImage: homeInfo?.heroImage || imageUrl,
    };

    setHomeInfo(nextHomeInfo);
    await persistHomeInfo(nextHomeInfo);
  };

  const removeHeroImageFromCarousel = async (indexToRemove) => {
    const current = Array.isArray(homeInfo?.heroImages) ? homeInfo.heroImages : [];
    const nextImages = current.filter((_, index) => index !== indexToRemove);

    let nextHeroImage = homeInfo?.heroImage || '';
    if (!nextImages.includes(nextHeroImage)) {
      nextHeroImage = nextImages[0] || '';
    }

    const nextHomeInfo = {
      ...homeInfo,
      heroImages: nextImages,
      heroImage: nextHeroImage,
    };

    setHomeInfo(nextHomeInfo);
    await persistHomeInfo(nextHomeInfo);
  };

  const handleHeroCarouselUpload = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    setHeroCarouselUploading(true);
    try {
      for (const file of selectedFiles) {
        const url = await uploadImagem(file, 'banner');
        await addHeroImageToCarousel(url);
      }
      showToast('Imagens do carrossel enviadas com sucesso!', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao enviar imagens do carrossel.', 'danger');
    } finally {
      setHeroCarouselUploading(false);
    }
  };

  const formatWhatsAppNumber = (value) => {
    const cleaned = String(value || '').replace(/\D/g, '').slice(0, 11);

    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;

    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const formatCpfDisplay = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length !== 11) return value || '—';
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhoneDisplay = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '—';

    const local = digits.startsWith('55') ? digits.slice(2) : digits;
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }

    return value || '—';
  };

  const getFilteredAppointmentPayments = () => {
    const payments = Array.isArray(appointmentPayments)
      ? appointmentPayments
      : Array.isArray(appointmentPayments?.items)
        ? appointmentPayments.items
        : [];

    let filtered = [...payments];

    if (!isAdmin && !isReceptionist) {
      const loggedInBarber = barbers.find(
        (b) =>
          b.userId === currentUser?.id ||
          b.id === currentUser?.barberId ||
          b.email === currentUser?.email,
      );

      if (loggedInBarber) {
        filtered = filtered.filter((payment) => {
          const paymentBarberId =
            payment.appointment?.barberId || payment.appointment?.barber?.id || payment.barberId;
          return paymentBarberId?.toString() === loggedInBarber.id?.toString();
        });
      } else {
        filtered = [];
      }
    }

    const getDate = (payment) => {
      const rawDate =
        payment?.appointment?.startAt ||
        payment?.appointment?.endAt ||
        payment?.startAt ||
        payment?.endAt ||
        payment?.createdAt ||
        '';

      return rawDate ? String(rawDate).split('T')[0] : '';
    };

    if (appointmentDateFilter) {
      filtered = filtered.filter((payment) => getDate(payment) === appointmentDateFilter);
    } else if (appointmentStartDate || appointmentEndDate) {
      filtered = filtered.filter((payment) =>
        isDateInRange(getDate(payment), appointmentStartDate, appointmentEndDate),
      );
    } else if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');

      filtered = filtered.filter((payment) => {
        const d = getDate(payment);
        if (!d) return false;

        const [y, m] = d.split('-');
        return Number(y) === Number(year) && Number(m) === Number(month);
      });
    }

    if (selectedBarberFilter !== 'all') {
      filtered = filtered.filter((payment) => {
        const selectedBarber = barbers.find(
          (b) => b.id?.toString() === selectedBarberFilter.toString(),
        );
        if (!selectedBarber) return false;

        return payment.appointment.barber.displayName === selectedBarber.displayName;
      });
    }

    return filtered;
  };

  const clearAppointmentFilters = () => {
    setAppointmentDateFilter('');
    setAppointmentStartDate('');
    setAppointmentEndDate('');
    setSelectedBarberFilter('all');
  };

  const clearPaymentFilters = () => {
    setPaymentDateFilter('');
    setPaymentStartDate('');
    setPaymentEndDate('');
  };

  const loadPaymentVisibility = useCallback(async () => {
    try {
      const data = await getPaymentVisibilitySettings();
      setHiddenBookingPaymentMethods(data.hiddenBookingPaymentMethods || []);
    } catch (error) {
      console.error('Erro ao carregar visibilidade de formas de pagamento:', error);
      setHiddenBookingPaymentMethods([]);
    }
  }, []);

  const handleToggleBookingPaymentVisibility = async (method) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem alterar as formas de pagamento.', 'danger');
      return;
    }

    const normalizedMethod = String(method || '').toLowerCase();
    if (!['cartao', 'pix', 'local'].includes(normalizedMethod)) return;

    const nextHidden = hiddenBookingPaymentMethods.includes(normalizedMethod)
      ? hiddenBookingPaymentMethods.filter((item) => item !== normalizedMethod)
      : [...hiddenBookingPaymentMethods, normalizedMethod];

    try {
      setSavingPaymentVisibility(true);
      const saved = await savePaymentVisibilitySettings(nextHidden);
      setHiddenBookingPaymentMethods(saved.hiddenBookingPaymentMethods || []);
      showToast('Configuração de formas de pagamento atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar visibilidade de formas de pagamento:', error);
      showToast('Erro ao salvar configuração de formas de pagamento.', 'danger');
    } finally {
      setSavingPaymentVisibility(false);
    }
  };

  const getFilteredSubscriptions = () => {
    let filtered = [...subscriptions];

    const getSubDate = (sub) =>
      new Date(sub.createdAt || sub.startDate).toISOString().split('T')[0];

    if (paymentDateFilter) {
      filtered = filtered.filter((sub) => getSubDate(sub) === paymentDateFilter);
    } else if (paymentStartDate || paymentEndDate) {
      filtered = filtered.filter((sub) =>
        isDateInRange(getSubDate(sub), paymentStartDate, paymentEndDate),
      );
    } else if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter((sub) => {
        const d = getSubDate(sub);
        const [y, m] = d.split('-');
        return parseInt(y) === parseInt(year) && parseInt(m) === parseInt(month);
      });
    }
    return filtered;
  };

  const validateCPF = (cpf) => {
    if (cpf.length !== 11 || !/^\d{11}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    let digito1 = resto === 10 || resto === 11 ? 0 : resto;
    if (digito1 !== parseInt(cpf.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    let digito2 = resto === 10 || resto === 11 ? 0 : resto;
    return digito2 === parseInt(cpf.charAt(10));
  };

  const validateCNPJ = (cnpj) => {
    if (cnpj.length !== 14 || !/^\d{14}$/.test(cnpj)) return false;
    const calcularDigito = (cnpj, posicoes) => {
      let soma = 0;
      let pos = posicoes - 7;
      for (let i = posicoes; i >= 1; i--) {
        soma += cnpj.charAt(posicoes - i) * pos--;
        if (pos < 2) pos = 9;
      }
      return soma % 11 < 2 ? 0 : 11 - (soma % 11);
    };
    const digito1 = calcularDigito(cnpj, 12);
    const digito2 = calcularDigito(cnpj, 13);
    return digito1 === parseInt(cnpj.charAt(12)) && digito2 === parseInt(cnpj.charAt(13));
  };

  const validatePixKey = (key) => {
    if (!key || !key.trim()) {
      return { isValid: false, message: 'Chave PIX não pode estar vazia', type: '' };
    }
    const cleanKey = key.replace(/\D/g, '');
    if (/^\d{11}$/.test(cleanKey)) {
      if (validateCPF(cleanKey)) return { isValid: true, type: 'CPF', message: 'CPF válido' };
      return { isValid: false, message: 'CPF inválido', type: '' };
    }
    if (/^\d{14}$/.test(cleanKey)) {
      if (validateCNPJ(cleanKey)) return { isValid: true, type: 'CNPJ', message: 'CNPJ válido' };
      return { isValid: false, message: 'CNPJ inválido', type: '' };
    }
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(key)) return { isValid: true, type: 'Email', message: 'Email válido' };
    const phoneRegex = /^55?[1-9]{2}9?[0-9]{8,9}$/;
    if (phoneRegex.test(cleanKey))
      return { isValid: true, type: 'Telefone', message: 'Telefone válido' };
    const randomKeyRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (randomKeyRegex.test(key))
      return { isValid: true, type: 'Chave Aleatória', message: 'Chave aleatória válida' };
    return {
      isValid: false,
      message: 'Formato inválido. Use CPF, CNPJ, Email, Telefone ou Chave Aleatória',
      type: '',
    };
  };

  const normalizeHeader = (header) =>
    String(header || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const parseBooleanValue = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const text = String(value || '')
      .trim()
      .toLowerCase();
    if (!text) return undefined;
    if (['1', 'true', 'sim', 'yes', 'y'].includes(text)) return true;
    if (['0', 'false', 'nao', 'não', 'no', 'n'].includes(text)) return false;
    return undefined;
  };

  const parseNumberValue = (value) => {
    if (typeof value === 'number') return value;
    const normalized = String(value || '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getMappedValue = (rawRow, keys) => {
    const rowMap = Object.entries(rawRow || {}).reduce((acc, [key, value]) => {
      acc[normalizeHeader(key)] = value;
      return acc;
    }, {});

    for (const key of keys) {
      const value = rowMap[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }

    return '';
  };

  const readExcelRows = async (file) => {
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    return utils.sheet_to_json(worksheet, { defval: '' });
  };

  const clearFileInput = (ref) => {
    if (ref?.current) {
      ref.current.value = '';
    }
  };

  const handleImportUsersExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingUsers(true);
    try {
      const rows = await readExcelRows(file);
      const preparedRows = rows
        .map((row, index) => {
          const email = String(getMappedValue(row, ['email', 'mail']))
            .trim()
            .toLowerCase();
          const phone = String(getMappedValue(row, ['telefone', 'phone', 'celular']))
            .trim();
          const cpf = String(getMappedValue(row, ['cpf'])).replace(/\D/g, '');

          return {
            rowNumber: index + 2,
            name: String(getMappedValue(row, ['nome', 'name', 'usuario'])).trim(),
            email,
            phone,
            cpf,
            role: 'client',
            isAdmin: false,
          };
        });

      const mappedRows = preparedRows.filter((row) => {
        const hasPhone = String(row.phone || '').replace(/\D/g, '').length > 0;
        const hasCpf = String(row.cpf || '').replace(/\D/g, '').length > 0;
        return row.name && row.email && hasPhone && hasCpf;
      });

      const missingRequiredCount = preparedRows.length - mappedRows.length;

      if (!mappedRows.length) {
        showToast(
          'Nenhuma linha válida encontrada. Nome, email, CPF e telefone são obrigatórios.',
          'danger',
        );
        return;
      }

      const result = await importUsersBatch({
        defaultPassword: '123456',
        skipExisting: true,
        rows: mappedRows,
      });

      await loadData();

      const message = `Clientes importados: ${result.createdCount}. Ignorados: ${(result.skippedCount || 0) + missingRequiredCount}. Erros: ${result.failedCount}. Senha padrão: 123456${missingRequiredCount > 0 ? `. Linhas sem nome/email/cpf/telefone: ${missingRequiredCount}` : ''}`;
      showToast(message, result.failedCount > 0 ? 'danger' : 'success');
    } catch (error) {
      console.error('Erro ao importar usuários por Excel:', error);
      showToast('Erro ao importar clientes por Excel.', 'danger');
    } finally {
      setImportingUsers(false);
      clearFileInput(usersImportInputRef);
    }
  };

  const handleImportProductsExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingProducts(true);
    try {
      const rows = await readExcelRows(file);
      const mappedRows = rows
        .map((row) => ({
          name: String(getMappedValue(row, ['nome', 'name', 'produto'])).trim(),
          description: String(getMappedValue(row, ['descricao', 'description'])).trim(),
          category: String(getMappedValue(row, ['categoria', 'category'])).trim(),
          price: parseNumberValue(getMappedValue(row, ['preco', 'price', 'valor'])),
          stock: Math.max(
            0,
            Math.round(parseNumberValue(getMappedValue(row, ['estoque', 'stock']))),
          ),
          subscriberDiscount: Math.max(
            0,
            Math.round(
              parseNumberValue(
                getMappedValue(row, ['descontoassinate', 'subscriberdiscount', 'desconto']),
              ),
            ),
          ),
          imageUrl: String(getMappedValue(row, ['imagem', 'imageurl', 'image'])).trim(),
          active: parseBooleanValue(getMappedValue(row, ['ativo', 'active'])),
        }))
        .filter((row) => row.name && row.price > 0);

      if (!mappedRows.length) {
        showToast('Nenhuma linha válida encontrada no Excel de produtos.', 'danger');
        return;
      }

      const result = await importProductsBatch({ rows: mappedRows });
      await loadProducts();
      showToast(
        `Produtos importados: ${result.createdCount}. Erros: ${result.failedCount}.`,
        result.failedCount > 0 ? 'danger' : 'success',
      );
    } catch (error) {
      console.error('Erro ao importar produtos por Excel:', error);
      showToast('Erro ao importar produtos por Excel.', 'danger');
    } finally {
      setImportingProducts(false);
      clearFileInput(productsImportInputRef);
    }
  };

  const handleImportServicesExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingServices(true);
    try {
      const rows = await readExcelRows(file);
      const mappedRows = rows
        .map((row) => ({
          name: String(getMappedValue(row, ['nome', 'name', 'servico', 'servico_nome'])).trim(),
          basePrice: parseNumberValue(
            getMappedValue(row, ['preco', 'price', 'valor', 'baseprice']),
          ),
          promotionalPrice: parseNumberValue(
            getMappedValue(row, ['precopromocional', 'promotionalprice']),
          ),
          durationMinutes: Math.max(
            1,
            Math.round(
              parseNumberValue(getMappedValue(row, ['duracao', 'duration', 'durationminutes'])) ||
              30,
            ),
          ),
          comissionPercent: Math.max(
            0,
            Math.min(
              100,
              Math.round(
                parseNumberValue(
                  getMappedValue(row, ['comissao', 'comissionpercent', 'commissionpercent']),
                ),
              ),
            ),
          ),
          covered_by_plan: parseBooleanValue(
            getMappedValue(row, ['cobertoporplano', 'coveredbyplan', 'covered_by_plan']),
          ),
          imageUrl: String(getMappedValue(row, ['imagem', 'imageurl', 'image'])).trim(),
          active: parseBooleanValue(getMappedValue(row, ['ativo', 'active'])),
        }))
        .filter((row) => row.name && row.basePrice > 0);

      if (!mappedRows.length) {
        showToast('Nenhuma linha válida encontrada no Excel de serviços.', 'danger');
        return;
      }

      const result = await importServicesBatch({ rows: mappedRows });
      await loadServices();
      showToast(
        `Serviços importados: ${result.createdCount}. Erros: ${result.failedCount}.`,
        result.failedCount > 0 ? 'danger' : 'success',
      );
    } catch (error) {
      console.error('Erro ao importar serviços por Excel:', error);
      showToast('Erro ao importar serviços por Excel.', 'danger');
    } finally {
      setImportingServices(false);
      clearFileInput(servicesImportInputRef);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      setLoadingBlockedDates(true);
      const response = await fetch('https://barberoneapp-back-homolog.onrender.com/blocked-dates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log(data);
      setBlockedDates(data);
    } catch (error) {
      console.error('Erro ao carregar dias bloqueados:', error);
    } finally {
      setLoadingBlockedDates(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!isAdmin && !hasPermission('manageBlockedDates')) {
      showToast('Você não tem permissão para bloquear datas.', 'danger');
      return;
    }
    if (!newBlockedDate.date) {
      showToast('Por favor, selecione uma data', 'danger');
      return;
    }

    const [year, month, day] = newBlockedDate.date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const isInvalidDate =
      !year ||
      !month ||
      !day ||
      selectedDate.getFullYear() !== year ||
      selectedDate.getMonth() !== month - 1 ||
      selectedDate.getDate() !== day;

    if (isInvalidDate) {
      showToast('Informe uma data válida para o bloqueio', 'danger');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      showToast('Não é possível bloquear uma data passada', 'danger');
      return;
    }

    const isTimeBlock = newBlockedDate.blockType === 'time';

    if (isTimeBlock) {
      if (!newBlockedDate.startTime || !newBlockedDate.endTime) {
        showToast('Informe o horário de início e fim do bloqueio', 'danger');
        return;
      }
      if (newBlockedDate.startTime >= newBlockedDate.endTime) {
        showToast('O horário de início deve ser menor que o de fim', 'danger');
        return;
      }
    }

    const dateExists = blockedDates.some((blocked) => {
      const sameDate = blocked.date === newBlockedDate.date;
      const sameBarber = blocked.barberId === newBlockedDate.barberId;
      if (!sameDate || !sameBarber) return false;
      if (!isTimeBlock) return !blocked.startTime;
      if (!blocked.startTime) return false;
      return (
        newBlockedDate.startTime < blocked.endTime && newBlockedDate.endTime > blocked.startTime
      );
    });

    if (dateExists) {
      showToast(
        isTimeBlock ? 'Já existe um bloqueio nesse intervalo!' : 'Esta data já está bloqueada!',
        'danger',
      );
      return;
    }

    try {
      const blockData = {
        date: newBlockedDate.date,
        reason: newBlockedDate.reason || (isTimeBlock ? 'Horário bloqueado' : 'Dia bloqueado'),
        barberId: newBlockedDate.barberId || null,
        startTime: isTimeBlock ? newBlockedDate.startTime : null,
        endTime: isTimeBlock ? newBlockedDate.endTime : null,
        createdBy: currentUser?.id,
        createdAt: new Date().toISOString(),
      };
      const response = await fetch('https://barberoneapp-back-homolog.onrender.com/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(blockData),
      });
      const responseText = await response.text();
      let responseBody = null;
      try {
        responseBody = responseText ? JSON.parse(responseText) : null;
      } catch {
        responseBody = responseText;
      }

      if (!response.ok) {
        const apiMessage =
          typeof responseBody === 'string'
            ? responseBody
            : responseBody?.message || responseBody?.error || responseBody?.errors?.[0]?.message;
        const conflictMessage = isTimeBlock
          ? 'Já existe um bloqueio para esse horário.'
          : 'Já existe um bloqueio para essa data.';

        showToast(
          response.status === 409 ? conflictMessage : apiMessage || 'Erro ao bloquear data',
          'danger',
        );
        return;
      }

      if (response.ok) {
        showToast(
          isTimeBlock ? 'Horário bloqueado com sucesso!' : 'Data bloqueada com sucesso!',
          'success',
        );
        fetchBlockedDates();
        setNewBlockedDate({
          date: '',
          reason: '',
          barberId: null,
          blockType: 'day',
          startTime: '',
          endTime: '',
        });
      }
    } catch (error) {
      console.error('Erro ao bloquear data:', error);
      showToast('Erro ao bloquear data', 'danger');
    }
  };

  const handleRemoveBlockedDate = (id) => {
    showConfirm('Deseja realmente desbloquear esta data?', async () => {
      try {
        const response = await fetch(`https://barberoneapp-back-homolog.onrender.com/blocked-dates/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          showToast('Data desbloqueada com sucesso!', 'success');
          fetchBlockedDates();
        }
      } catch (error) {
        console.error('Erro ao desbloquear data:', error);
        showToast('Erro ao desbloquear data', 'danger');
      }
    });
  };

  const handlePixKeyChange = (value) => {
    setPixKey(value);
    if (value.trim() !== '') {
      const validation = validatePixKey(value);
      setPixKeyValidation(validation);
    } else {
      setPixKeyValidation({ isValid: false, type: '', message: '' });
    }
  };

  const getAppointmentDependentInfo = (appointment) => {
    const clientIdRaw = appointment?.clientId || appointment?.client?.id;
    const dependentIdFromClient = clientIdRaw?.toString().startsWith('dep_')
      ? clientIdRaw.toString().replace('dep_', '')
      : null;
    const dependentId =
      appointment?.dependentId ||
      appointment?.dependent?.id ||
      dependentIdFromClient ||
      null;
    const dependent =
      appointment?.dependent ||
      allDependents.find((dep) => dependentId && dep.id?.toString() === dependentId.toString()) ||
      null;
    const dependentName = appointment?.dependentName || dependent?.name || '';
    const isDependent =
      Boolean(appointment?.isDependent) ||
      Boolean(appointment?.dependent) ||
      Boolean(appointment?.dependentName) ||
      Boolean(dependentIdFromClient);

    return {
      isDependent,
      dependent,
      dependentId,
      dependentName,
    };
  };

  const getAppointmentResponsibleUser = async (appointment, dependentInfo) => {
    const clientIdRaw = appointment?.clientId || appointment?.client?.id;
    const parentId =
      dependentInfo?.dependent?.parentId ||
      dependentInfo?.dependent?.parent_id ||
      appointment?.dependent?.parentId ||
      appointment?.dependent?.parent_id ||
      null;

    if (dependentInfo?.isDependent && parentId) {
      const localParent = allUsers.find((user) => user.id?.toString() === parentId.toString());
      return localParent || getUserById(parentId);
    }

    if (appointment?.client?.phone) return appointment.client;
    if (clientIdRaw && !clientIdRaw.toString().startsWith('dep_')) return getUserById(clientIdRaw);

    return null;
  };

  const getAppointmentClientName = (appointment, responsibleUser) =>
    responsibleUser?.name ||
    (typeof appointment?.client === 'string' ? appointment.client : appointment?.client?.name) ||
    appointment?.clientName ||
    'cliente';

  const getAppointmentTargetLine = (dependentInfo, responsibleName) => {
    if (!dependentInfo?.isDependent || !dependentInfo?.dependentName) return '';

    return responsibleName && responsibleName !== 'cliente'
      ? `\n👤 Atendimento para: ${dependentInfo.dependentName}, dependente de ${responsibleName}`
      : `\n👤 Atendimento para: ${dependentInfo.dependentName}`;
  };

  const getAppointmentStartDate = (appointment) => {
    const rawStartAt = appointment?.startAt || appointment?.start_at;
    if (rawStartAt) {
      const parsedStartAt = new Date(rawStartAt);
      if (!Number.isNaN(parsedStartAt.getTime())) return parsedStartAt;
    }

    if (appointment?.date && appointment?.time) {
      const parsedDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
      if (!Number.isNaN(parsedDateTime.getTime())) return parsedDateTime;
    }

    return null;
  };

  const canCompleteAppointment = (appointment) => {
    const appointmentStartDate = getAppointmentStartDate(appointment);
    return Boolean(appointmentStartDate && appointmentStartDate <= new Date());
  };

  const sendWhatsApp = async (appointmentId, type) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const appointmentBarberName =
        appointment.barberName || appointment.barber?.displayName || 'barbeiro';

      const startDate = appointment.startAt
        ? new Date(appointment.startAt)
        : appointment.date
          ? new Date(`${appointment.date}T${appointment.time || '00:00:00'}`)
          : null;
      const date =
        startDate && !Number.isNaN(startDate.getTime())
          ? startDate.toLocaleDateString('pt-BR')
          : 'data não informada';
      const time =
        startDate && !Number.isNaN(startDate.getTime())
          ? startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : appointment.time || 'horário não informado';

      const serviceName =
        Array.isArray(appointment.services) && appointment.services.length > 0
          ? appointment.services
            .map((s) => s?.serviceName || s?.name)
            .filter(Boolean)
            .join(', ')
          : appointment.serviceName || 'Serviço';

      const dependentInfo = getAppointmentDependentInfo(appointment);
      const userData = await getAppointmentResponsibleUser(appointment, dependentInfo);
      if (!userData || !userData.phone) {
        showToast('Cliente não possui telefone cadastrado.', 'danger');
        return;
      }
      let phone = userData.phone.replace(/\D/g, '');
      if (!phone.startsWith('55')) phone = `55${phone}`;
      const appointmentClientName = getAppointmentClientName(appointment, userData);
      const appointmentTargetLine = getAppointmentTargetLine(dependentInfo, appointmentClientName);

      let message;
      if (type === 'confirm') {
        message = `Olá ${appointmentClientName}!\n\nEstamos entrando em contato para CONFIRMAR seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${time}\n✂️ Serviço: ${serviceName}\n👨‍🦰 Barbeiro: ${appointmentBarberName}${appointmentTargetLine}\n\nPor favor, responda esta mensagem para confirmar sua presença.`;
      } else if (type === 'cancel') {
        message = `Olá ${appointmentClientName}!\n\nInformamos que precisaremos realizar o CANCELAMENTO do seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${time}\n✂️ Serviço: ${serviceName}${appointmentTargetLine}\n\nNossas desculpas pelo transtorno. Entre em contato conosco para reagendar.`;
      } else if (type === 'noshow') {
        message = `Olá ${appointmentClientName}!\n\nNotamos que você não compareceu ao seu agendamento:\n\n📅 Data: ${date}\n🕐 Horário: ${time}\n✂️ Serviço: ${serviceName}${appointmentTargetLine}\n\nSentimos pela ausência. Entre em contato conosco para reagendar quando quiser.`;
      }
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      showToast('Erro ao abrir WhatsApp.', 'danger');
    }
  };

  useEffect(() => {
    const loadPixKey = async () => {
      try {
        const data = await getPixKey();
        setPixKey(data.pixKey);
        setPixKeySaved(data.pixKey);
        if (data.pixKey) {
          const validation = validatePixKey(data.pixKey);
          setPixKeyValidation(validation);
        }
      } catch (error) {
        console.error('Erro ao carregar chave PIX', error);
      }
    };
    loadPixKey();
  }, []);

  useEffect(() => {
    const loadTermsDoc = async () => {
      try {
        const data = await getTermsDocument();
        setTermsDocUrl(data.documentUrl || '');
      } catch (error) {
        console.error('Erro ao carregar documento de termos:', error);
      }
    };

    loadTermsDoc();
  }, []);

  const handleSavePixKey = async () => {
    if (!isAdmin) {
      showToast('Apenas administradores podem alterar a chave PIX.', 'danger');
      return;
    }
    const validation = validatePixKey(pixKey);
    if (!validation.isValid) {
      showToast(validation.message, 'danger');
      return;
    }
    try {
      await savePixKey(pixKey);
      setPixKeySaved(pixKey);
      showToast(`Chave PIX salva com sucesso! (${validation.type})`, 'success');
    } catch (error) {
      console.error('Erro ao salvar chave PIX', error);
      showToast('Erro ao salvar chave PIX', 'danger');
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [
        barbersData,
        appointmentsData,
        subscriptionsData,
        paymentsData,
        productsData,
        servicesData,
        productSalesData,
      ] = await Promise.all([
        getBarbers(),
        getAppointments(),
        buscarTodasAssinaturas(),
        buscarTodosPagamentosAgendamentos(),
        getProducts(true),
        getAllServices(true),
        buscarTodasVendasProdutos(),
      ]);

      // const usersResponse = await fetch('https://barberoneapp-back-homolog.onrender.com/users', {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //   },
      // });

      const usersResponse = await getUsers();
      const allUsers = usersResponse.items;
      const allEmployees = allUsers.filter(
        (user) => user.role === 'barber' || user.role === 'receptionist' || user.role === 'admin',
      );

      const subscriptionStatusMap = {};
      if (subscriptionsData.items) {
        subscriptionsData.items.forEach((sub) => {
          if (sub.status === 'active') {
            subscriptionStatusMap[sub.userId] = true;
          }
        });
      }

      setBarbers(barbersData);
      setEmployees(allEmployees);
      setAppointments(appointmentsData);

      const today = new Date();
      const toExpire = subscriptionsData.items.filter(
        (s) =>
          s.status === 'cancel_pending' && s.nextBillingDate && new Date(s.nextBillingDate) < today,
      );
      for (const s of toExpire) {
        await fetch(`https://barberoneapp-back-homolog.onrender.com/subscriptions/${s.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', updatedAt: new Date().toISOString() }),
        });
      }
      const updatedSubs =
        toExpire.length > 0
          ? subscriptionsData.map((s) =>
            toExpire.find((e) => e.id === s.id) ? { ...s, status: 'cancelled' } : s,
          )
          : subscriptionsData;

      const subsWithCpf = updatedSubs.items.map((sub) => {
        const user = allUsers.find((u) => u.id === sub.userId);
        return user?.cpf ? { ...sub, userCpf: user.cpf } : sub;
      });

      setSubscriptions(subsWithCpf);
      setAppointmentPayments(paymentsData);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setServices(servicesData);
      setProductSales(productSalesData);
      setAllUsers(allUsers);
      setClientSubscriptionStatus(subscriptionStatusMap);
      try {
        const valesRes = await fetch('https://barberoneapp-back-homolog.onrender.com/employeeVales', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const paymentsRes = await fetch('https://barberoneapp-back-homolog.onrender.com/employeePayments', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (valesRes.ok) setEmployeeVales(await valesRes.json());
        if (paymentsRes.ok) setEmployeePayments(await paymentsRes.json());
      } catch (e) {
        console.warn('Payroll não carregado', e);
      }
    } catch (error) {
      console.error('Erro ao carregar dados', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts(true);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      showToast('Erro ao carregar produtos', 'danger');
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const response = await fetch(`${API_URL}/subscription-plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('Planos não disponíveis');
        setPlans([]);
        return;
      }

      const data = await response.json();
      console.log('✅ Planos carregados:', data);
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Erro ao carregar planos:', error);
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [API_URL, token]);

  const adminInitializedRef = useRef(false);

  useEffect(() => {
    if (adminInitializedRef.current) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Busca permissões frescas do backend antes de checar acesso
    fetch(`${import.meta.env.VITE_API_URL}/users/${currentUser.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((freshUser) => {
        if (freshUser) {
          const updatedUser = { ...currentUser, ...freshUser };
          localStorage.setItem('session', JSON.stringify(updatedUser));
          currentUserRef.current = updatedUser;
        }
        const user = currentUserRef.current;
        const hasAccess =
          user.role === 'admin' ||
          user.isAdmin === true ||
          user.role === 'receptionist' ||
          user.permissions?.viewAdmin === true;

        if (!hasAccess) {
          navigate('/appointments');
          return;
        }
        adminInitializedRef.current = true;
        loadData();
        loadHomeInfo();
      })
      .catch(() => {
        const hasAccess = isAdmin || isReceptionist || currentUser?.permissions?.viewAdmin;
        if (!hasAccess) {
          navigate('/appointments');
          return;
        }
        adminInitializedRef.current = true;
        loadData();
        loadHomeInfo();
      });
  }, []);
  useEffect(() => {
    if (activeTab === 'calendario') {
      fetchBlockedDates();
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'benefits' && hasAdminVisibility && plans.length === 0) {
      console.log('🔄 Carregando planos pela primeira vez...');
      loadPlans();
    }
  }, [activeTab, hasAdminVisibility, plans.length, loadPlans]);

  useEffect(() => {
    if (activeTab === 'products' && products.length === 0) {
      console.log('🔄 Carregando produtos pela primeira vez...');
      loadProducts();
    }
  }, [activeTab, products.length, loadProducts]);

  useEffect(() => {
    if (!canAccessEarnings && activeTab === 'earnings') {
      setActiveTab('calendario');
    }
  }, [canAccessEarnings, activeTab]);

  useEffect(() => {
    if (isAdmin && activeTab === 'homeInfo') {
      loadPaymentVisibility();
    }
  }, [isAdmin, activeTab, loadPaymentVisibility]);

  const getAppointmentByPayment = (payment) => {
    const appointmentId = payment.appointmentId || payment.appointment?.id;

    if (!appointmentId) return null;

    return appointments.find((apt) => apt.id?.toString() === appointmentId?.toString()) || null;
  };

  const getServiceNamesFromPayment = (payment) => {
    const appointment = getAppointmentByPayment(payment);
    if (!appointment?.services?.length) return [];

    return appointment.services.map((service) => service.serviceName);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmModal({ open: true, message, onConfirm });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, message: '', onConfirm: null });
  };

  const formatUserBirthDayMonth = (user) => {
    const raw =
      user?.birth_date ??
      user?.birthDate ??
      user?.dateOfBirth ??
      user?.birthday ??
      user?.nascimento;
    if (!raw) return '—';

    if (typeof raw === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return `${raw.slice(8, 10)}/${raw.slice(5, 7)}`;
      }

      const brDate = raw.match(/^(\d{2})\/(\d{2})(?:\/\d{2,4})?$/);
      if (brDate) {
        return `${brDate[1]}/${brDate[2]}`;
      }
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    return '—';
  };

  const openPermissionsModal = (user) => {
    setSelectedUserPermissions(user);
    const defaultPermissions = {};
    Object.keys(permissionsConfig).forEach((key) => {
      defaultPermissions[key] = user.permissions?.[key] || false;
    });
    setEditingPermissions(defaultPermissions);
  };

  const closePermissionsModal = () => {
    setSelectedUserPermissions(null);
    setEditingPermissions({});
  };

  const togglePermission = (permissionKey) => {
    setEditingPermissions((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey],
    }));
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordUser(user);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowResetPasswordModal(true);
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetPasswordUser(null);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordForm.newPassword || resetPasswordForm.newPassword.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'danger');
      return;
    }
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      showToast('As senhas não coincidem.', 'danger');
      return;
    }
    setResetPasswordLoading(true);
    try {
      await fetch(`https://barberoneapp-back-homolog.onrender.com/users/${resetPasswordUser.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetPassword: resetPasswordForm.newPassword,
          newPassword: resetPasswordForm.newPassword,
        }),
      });
    } catch (error) {
      showToast('Erro ao redefinir senha.', 'danger');
    } finally {
      showToast(`Senha de ${resetPasswordUser.name} redefinida com sucesso!`, 'success');
      closeResetPasswordModal();
      setResetPasswordLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) {
      showToast('Apenas administradores podem alterar permissões.', 'danger');
      return;
    }
    try {
      await fetch(
        `https://barberoneapp-back-homolog.onrender.com/users/${selectedUserPermissions.id}/permissions`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ permissions: editingPermissions }),
        },
      );
      await loadData();
      showToast('Permissões atualizadas com sucesso!', 'success');
      closePermissionsModal();
    } catch (error) {
      showToast('Erro ao salvar permissões.', 'danger');
    }
  };

  const openBarberModal = (employee = null, barber = null) => {
    if (employee && !barber) {
      setEditingBarber({ isUserOnly: true, userId: employee.id });
      setBarberForm({
        displayName: employee.name,
        specialty: employee.role === 'admin' ? 'Administrador' : 'Recepcionista',
        photo: employee.photo || '',
        salarioFixo: employee.salarioFixo || '',
        paymentFrequency: employee.paymentFrequency || 'mensal',
        createUser: false,
        userEmail: employee.email || '',
        userPassword: '',
        userPhone: employee.phone || '',
        userRole: employee.role,
      });
    } else if (barber) {
      setEditingBarber(barber);
      setBarberForm({
        displayName: barber.displayName,
        specialty: barber.specialty,
        photo: barber.photo,
        salarioFixo: barber.salarioFixo || '',
        paymentFrequency: barber.paymentFrequency || 'mensal',
        createUser: false,
        userEmail: '',
        userPassword: '',
        userPhone: '',
        userRole: 'barber',
        serviceIds: barber.serviceIds || [],
      });
    } else {
      setEditingBarber(null);
      setBarberForm({
        displayName: '',
        specialty: '',
        photo: '',
        createUser: false,
        userEmail: '',
        userPassword: '',
        userPhone: '',
        userRole: 'barber',
        serviceIds: [],
      });
    }
    setShowBarberModal(true);
  };

  const closeBarberModal = () => {
    setShowBarberModal(false);
    setEditingBarber(null);
    setBarberForm({
      displayName: '',
      specialty: '',
      photo: '',
      createUser: false,
      userEmail: '',
      userPassword: '',
      userPhone: '',
      userRole: 'barber',
      serviceIds: [],
    });
  };

  const handleBarberFormChange = (field, value) => {
    setBarberForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Apenas administradores podem adicionar ou editar funcionários.', 'danger');
      return;
    }
    if (!barberForm.displayName.trim()) {
      showToast('O nome do funcionário é obrigatório.', 'danger');
      return;
    }
    try {
      let userId = null;
      if (editingBarber?.isUserOnly) {
        const userData = {
          name: barberForm.displayName,
          photo: barberForm.photo,
          phone: barberForm.userPhone,
          role: barberForm.userRole,
          isAdmin: barberForm.userRole === 'admin',
          salarioFixo: parseFloat(barberForm.salarioFixo) || 0,
          paymentFrequency: barberForm.paymentFrequency || 'mensal',
        };
        await fetch(`https://barberoneapp-back-homolog.onrender.com/users/${editingBarber.userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
        showToast('Funcionário atualizado com sucesso!', 'success');
        await loadData();
        closeBarberModal();
        return;
      }
      if (barberForm.createUser && !editingBarber) {
        if (!barberForm.userEmail || !barberForm.userPassword) {
          showToast('Email e senha são obrigatórios para criar conta de acesso.', 'danger');
          return;
        }
        // const checkEmailResponse = await fetch('https://barberoneapp-back-homolog.onrender.com/users', {
        //   headers: {
        //     Authorization: `Bearer ${token}`,
        //   },
        // });

        const checkEmailResponse = await getUsers();
        const allUsers = checkEmailResponse.items;
        const emailExists = allUsers.some((u) => u.email === barberForm.userEmail);
        if (emailExists) {
          showToast('Este email já está cadastrado.', 'danger');
          return;
        }
        const newUser = {
          name: barberForm.displayName,
          email: barberForm.userEmail,
          password: barberForm.userPassword,
          phone: barberForm.userPhone,
          photo: barberForm.photo,
          role: barberForm.userRole,
          isAdmin: barberForm.userRole === 'admin',
          createdAt: new Date().toISOString(),
        };
        const userResponse = await fetch('https://barberoneapp-back-homolog.onrender.com/users', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newUser),
        });
        if (!userResponse.ok) throw new Error('Erro ao criar usuário');
        const createdUser = await userResponse.json();
        userId = createdUser.id;
      }
      if (barberForm.userRole === 'barber' || !barberForm.createUser) {
        const barberData = {
          displayName: barberForm.displayName,
          specialty: barberForm.specialty,
          photo: barberForm.photo,
          salarioFixo: parseFloat(barberForm.salarioFixo) || 0,
          paymentFrequency: barberForm.paymentFrequency || 'mensal',
          serviceIds: barberForm.serviceIds || [],

          ...(editingBarber && !editingBarber.isUserOnly
            ? { userId: editingBarber.userId }
            : { userId: userId }),
        };
        if (editingBarber && !editingBarber.isUserOnly) {
          await updateBarber(editingBarber.id, barberData);
          if (editingBarber.userId) {
            await fetch(`https://barberoneapp-back-homolog.onrender.com/users/${editingBarber.userId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                displayName: barberForm.displayName,
                photo: barberForm.photo,
                phone: barberForm.userPhone,
              }),
            });
          }
          showToast('Funcionário atualizado com sucesso!', 'success');
        } else {
          await createBarber(barberData);
          showToast(
            barberForm.createUser
              ? 'Funcionário e conta de barbeiro criados com sucesso!'
              : 'Funcionário adicionado com sucesso!',
            'success',
          );
        }
      } else {
        const roleText = barberForm.userRole === 'admin' ? 'Administrador' : 'Recepcionista';
        showToast(`${roleText} criado com sucesso!`, 'success');
      }
      await loadData();
      closeBarberModal();
    } catch (error) {
      console.log(error);
      showToast('Erro ao salvar funcionário. Tente novamente.', 'danger');
    }
  };

  const handleDeleteBarber = (id, isUserOnly = false) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem excluir funcionários.', 'danger');
      return;
    }
    showConfirm('Deseja realmente excluir este funcionário?', async () => {
      try {
        if (isUserOnly) {
          await fetch(`https://barberoneapp-back-homolog.onrender.com/users/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } else {
          await deleteBarber(id);
          const barber = barbers.find((b) => b.id === id);
          if (barber?.userId) {
            await fetch(`https://barberoneapp-back-homolog.onrender.com/users/${barber.userId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          }
        }
        await loadData();
        showToast('Funcionário excluído com sucesso!', 'success');
      } catch (error) {
        showToast('Erro ao excluir funcionário.', 'danger');
      }
    });
  };

  const handleTermsDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Por favor, envie apenas arquivos PDF', 'danger');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('O arquivo deve ter no máximo 5MB', 'danger');
      return;
    }

    try {
      const data = await uploadTermsDocument(file);
      setTermsDocUrl(data.documentUrl);
      setUploadedTermsDoc(file);
      showToast('Documento de termos carregado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao fazer upload do documento:', error);
      showToast('Erro ao fazer upload do documento', 'danger');
    }
  };

  const handleRemoveTermsDoc = () => {
    showConfirm('Deseja realmente remover o documento de termos?', async () => {
      try {
        await deleteTermsDocument();
        setTermsDocUrl('');
        setUploadedTermsDoc(null);
        showToast('Documento removido com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao remover documento:', error);
        showToast('Erro ao remover documento', 'danger');
      }
    });
  };

  const openProductModal = (product = null) => {
    if (product && !hasPermission('editProducts')) {
      showToast('Você não tem permissão para editar produtos', 'danger');
      return;
    }
    if (!product && !hasPermission('addProducts')) {
      showToast('Você não tem permissão para adicionar produtos', 'danger');
      return;
    }

    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price.toString().replace('R$ ', ''),
        subscriberDiscount: product.subscriberDiscount?.toString() || '0',
        stock: product.stock?.toString() || '0',
        imageUrl: product.imageUrl || product.image || '',
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: '',
        description: '',
        price: '',
        subscriberDiscount: 0,
        stock: 0,
        imageUrl: '',
      });
    }
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: '',
      description: '',
      price: '',
      subscriberDiscount: 0,
      stock: 0,
      imageUrl: '',
    });
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const requiredPermission = editingProduct ? 'editProducts' : 'addProducts';
    if (!hasPermission(requiredPermission)) {
      showToast('Você não tem permissão para salvar produtos.', 'danger');
      return;
    }
    if (!productForm.name.trim() || !productForm.category || !productForm.price) {
      showToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }
    try {
      const productData = {
        // ...productForm,
        name: productForm.name,
        category: productForm.category,
        description: productForm.description,
        price: Number(productForm.price),
        subscriberDiscount: parseInt(productForm.subscriberDiscount) || 0,
        stock: parseInt(productForm.stock) || 0,
        imageUrl: productForm.imageUrl || '',
      };
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        showToast('Produto atualizado com sucesso!', 'success');
      } else {
        await createProduct(productData);
        showToast('Produto adicionado com sucesso!', 'success');
      }
      await loadProducts();
      closeProductModal();
    } catch (error) {
      showToast('Erro ao salvar produto. Tente novamente.', 'danger');
    }
  };

  const handleDeleteProduct = (product) => {
    if (!hasPermission('editProducts')) {
      showToast('Você não tem permissão para excluir produtos.', 'danger');
      return;
    }

    const isActive = product.active !== false;
    const confirmMessage = isActive
      ? 'Tem certeza que deseja desativar este produto?'
      : 'Tem certeza que deseja ativar novamente este produto?';

    showConfirm(confirmMessage, async () => {
      try {
        if (isActive) {
          const response = await deleteProduct(product.id);
          await loadProducts();
          showToast(response?.reason || 'Produto desativado com sucesso!', 'success');
        } else {
          const response = await reactivateProduct(product.id);
          await loadProducts();
          showToast(response?.reason || 'Produto reativado com sucesso!', 'success');
        }
      } catch (error) {
        console.error('Erro ao alterar status do produto:', error);
        showToast('Erro ao alterar o status do produto', 'danger');
      }
    });
  };

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      const updatedAppointment = { ...appointment, status: 'confirmed' };
      await updateAppointment(appointmentId, updatedAppointment);
      await loadData();
      showToast('Agendamento confirmado!', 'success');

      try {
        const dependentInfo = getAppointmentDependentInfo(appointment);
        const userData = await getAppointmentResponsibleUser(appointment, dependentInfo);
        if (userData?.phone) {
          let phone = userData.phone.replace(/\D/g, '');
          if (!phone.startsWith('55')) phone = `55${phone}`;
          const appointmentClientName = getAppointmentClientName(appointment, userData);
          const appointmentTargetText =
            dependentInfo.isDependent && dependentInfo.dependentName
              ? ` Atendimento para ${dependentInfo.dependentName}, dependente de ${appointmentClientName}.`
              : '';
          const message = `Olá ${appointmentClientName}! Seu agendamento foi confirmado.${appointmentTargetText} Obrigado pela preferência e confiança em nosso serviço! 😊✂️`;
          const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        }
      } catch (whatsErr) {
        console.warn('Não foi possível abrir WhatsApp:', whatsErr);
      }
    } catch (error) {
      showToast('Erro ao confirmar agendamento.', 'danger');
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) {
        showToast('Agendamento não encontrado.', 'danger');
        return;
      }

      if (appointment.status !== 'confirmed') {
        showToast('É necessário confirmar o agendamento antes de finalizá-lo.', 'danger');
        return;
      }

      if (!canCompleteAppointment(appointment)) {
        showToast(
          'Só é possível finalizar no horário ou após o horário do atendimento.',
          'danger',
        );
        return;
      }

      await updateAppointment(appointmentId, { ...appointment, status: 'completed' });
      await loadData();
      showToast('Atendimento finalizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao finalizar atendimento:', error);
      showToast('Erro ao finalizar atendimento.', 'danger');
    }
  };

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    setAppointmentForm({ date: appointment.date, time: appointment.time });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAppointment(null);
    setAppointmentForm({ date: '', time: '' });
  };

  const handleAppointmentFormChange = (field, value) => {
    setAppointmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const openOffScheduleModal = () => {
    if (!isAdmin && !hasPermission('manageOffScheduleAppointments')) {
      showToast('Você não tem permissão para agendar fora do horário.', 'danger');
      return;
    }

    setOffScheduleForm({
      clientId: '',
      barberId: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      serviceIds: [],
      notes: '',
    });
    setShowOffScheduleModal(true);
  };

  const closeOffScheduleModal = () => {
    setShowOffScheduleModal(false);
    setOffScheduleSaving(false);
  };

  const handleOffScheduleFormChange = (field, value) => {
    setOffScheduleForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'date' ? { time: '' } : {}),
    }));
  };

  const handleSubmitOffScheduleAppointment = async (e) => {
    e.preventDefault();

    if (!isAdmin && !hasPermission('manageOffScheduleAppointments')) {
      showToast('Você não tem permissão para agendar fora do horário.', 'danger');
      return;
    }

    if (
      !offScheduleForm.clientId ||
      !offScheduleForm.barberId ||
      !offScheduleForm.date ||
      !offScheduleForm.time
    ) {
      showToast('Preencha cliente, barbeiro, data e horário.', 'danger');
      return;
    }

    if (!offScheduleForm.serviceIds.length) {
      showToast('Selecione pelo menos um serviço.', 'danger');
      return;
    }

    if (!offScheduleTimeOptions.includes(offScheduleForm.time)) {
      showToast('Selecione um horário fora do expediente da barbearia.', 'danger');
      return;
    }

    const selectedClient = allUsers.find((u) => String(u.id) === String(offScheduleForm.clientId));
    const selectedBarber = barbers.find((b) => String(b.id) === String(offScheduleForm.barberId));

    if (!selectedClient) {
      showToast('Cliente inválido.', 'danger');
      return;
    }

    if (!selectedBarber) {
      showToast('Barbeiro inválido.', 'danger');
      return;
    }
    const selectedServices = services.filter((s) => offScheduleForm.serviceIds.includes(s.id));
    const mappedServices = selectedServices
      .map((service) => {
        const basePrice = Number(service.basePrice ?? service.price ?? 0);
        const duration = Number(service.durationMinutes ?? service.duration ?? 50);
        return {
          id: service.id,
          name: service.name,
          basePrice: Number.isNaN(basePrice) ? 0 : basePrice,
          duration: Number.isNaN(duration) || duration <= 0 ? 50 : duration,
          quantity: 1,
        };
      })
      .filter((service) => service.id && service.name);

    if (!mappedServices.length) {
      showToast('Não foi possível montar os serviços do agendamento.', 'danger');
      return;
    }

    const totalAmount = mappedServices.reduce(
      (sum, service) => sum + (Number(service.basePrice) || 0),
      0,
    );

    const localDateTime = new Date(`${offScheduleForm.date}T${offScheduleForm.time}:00`);
    const startAtUTC = localDateTime.toISOString();

    try {
      setOffScheduleSaving(true);

      const utcDate = startAtUTC.split('T')[0];            // "2026-04-02"
      const utcTime = startAtUTC.split('T')[1].slice(0, 5); // "22:00"

      const createdAppointment = await createAppointment({
        barberId: selectedBarber.id,
        clientId: selectedClient.id,
        date: utcDate,
        time: utcTime,
        notes: offScheduleForm.notes?.trim() || '',
        services: mappedServices,
        products: [],
      });

      await criarPagamentoAgendamento({
        appointmentId: createdAppointment.id,
        userId: selectedClient.id,
        userName: selectedClient.name,
        amount: totalAmount,
        serviceName: mappedServices.map((service) => service.name).join(', '),
        barberName: selectedBarber.displayName,
        appointmentDate: offScheduleForm.date,
        appointmentTime: offScheduleForm.time,
        products: [],
        status: 'pending',
        method: 'local',
      });

      setAppointments((prev) => [createdAppointment, ...prev]);
      await loadData();
      closeOffScheduleModal();
      showToast('Agendamento fora do horário registrado com sucesso!', 'success');
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (Array.isArray(error?.response?.data) ? error.response.data.join(', ') : null) ||
        'Erro ao registrar agendamento fora do horário.';
      showToast(message, 'danger');
    } finally {
      setOffScheduleSaving(false);
    }
  };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentForm.date || !appointmentForm.time) {
      showToast('Data e horário são obrigatórios.', 'danger');
      return;
    }
    try {
      const updatedData = {
        ...editingAppointment,
        date: appointmentForm.date,
        time: appointmentForm.time,
      };
      await updateAppointment(editingAppointment.id, updatedData);
      await loadData();
      showToast('Agendamento atualizado com sucesso!', 'success');
      closeEditModal();
    } catch (error) {
      showToast('Erro ao atualizar agendamento.', 'danger');
    }
  };

  const handleScheduleCancelSubscription = (sub) => {
    setConfirmCancelSub(sub);
  };

  const confirmCancelSubscription = async () => {
    const sub = confirmCancelSub;
    setConfirmCancelSub(null);
    const expDate = sub.currentCycle?.periodEnd || sub.nextBillingDate
      ? new Date(sub.currentCycle?.periodEnd || sub.nextBillingDate).toLocaleDateString('pt-BR')
      : 'data não definida';
    try {
      await fetch(`https://barberoneapp-back-homolog.onrender.com/stripe/subscriptions/${sub.subscriptionId || sub.id}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const matchedUser = allUsers.find((user) => {
        const userEmail = String(user.email || '').toLowerCase();
        const subEmail = String(sub.user?.email || sub.customerEmail || '').toLowerCase();
        return userEmail && userEmail === subEmail;
      });

      if (matchedUser?.phone) {
        const phone = matchedUser.phone.replace(/\D/g, '');
        if (phone) {
          const msg = encodeURIComponent(
            `Olá ${matchedUser.name}, seu plano *${sub.planName || sub.plan?.name || 'Plano'}* na Barbearia Rodrigues foi cancelado.\n\nVocê mantém acesso aos benefícios até *${expDate}*. Após essa data o plano não será renovado.\n\nQualquer dúvida estamos à disposição!`,
          );
          window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
        }
      }

      await loadData();
      showToast(`Plano de ${sub.user?.name || sub.userName || 'cliente'} cancelado.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao cancelar plano.', 'danger');
    }
  };

  const handleDeleteAppointment = (id) => {
    showConfirm('Deseja realmente cancelar este agendamento?', async () => {
      try {
        await deleteAppointment(id);
        await loadData();
        showToast('Agendamento cancelado com sucesso!', 'success');
      } catch (error) {
        showToast('Erro ao cancelar agendamento.', 'danger');
      }
    });
  };

  const handleMarkAsPaid = async (payment, method) => {
    try {
      const normalizedMethod = String(method || '').toLowerCase();
      await atualizarPagamentoAgendamento(payment.id, {
        status: 'paid',
        method: normalizedMethod,
        paymentMethod: normalizedMethod,
        paidAt: new Date().toISOString(),
      });
      await loadData();

      // setAppointmentPayments(prev =>
      //   prev.map(p => p.id === payment.id ? { ...p, status: 'paid', paymentMethod: method, paidAt: new Date().toISOString() } : p)
      // );
      showToast('Pagamento marcado como pago!', 'success');
    } catch (error) {
      console.error('Erro handleMarkAsPaid:', error);
      showToast('Erro ao atualizar pagamento.', 'danger');
    }
  };

  const handleConfirmCutDone = async (payment) => {
    try {
      const currentMethod = String(payment.paymentMethod || payment.method || '')
        .toLowerCase()
        .trim();
      const alreadyHasMethod = currentMethod !== '' && currentMethod !== 'local';
      const newStatus = alreadyHasMethod ? 'paid' : 'pending';
      await atualizarPagamentoAgendamento(payment.id, {
        status: newStatus,
        confirmedAt: new Date().toISOString(),
        ...(newStatus === 'paid' ? { paidAt: new Date().toISOString() } : {}),
      });
      await loadData();
      showToast(
        newStatus === 'paid'
          ? 'Agendamento confirmado e pago!'
          : 'Corte confirmado! Pagamento ainda pendente.',
        'success',
      );
    } catch (error) {
      console.error('Erro handleConfirmCutDone:', error);
      showToast('Erro ao confirmar agendamento.', 'danger');
    }
  };

  const handleCancelFromPending = (payment) => {
    showConfirm('Deseja realmente cancelar este agendamento?', async () => {
      try {
        if (payment.appointmentId) {
          await deleteAppointment(payment.appointmentId);
        }
        setAppointmentPayments((prev) => prev.filter((p) => p.id !== payment.id));
        showToast('Agendamento cancelado com sucesso!', 'success');
      } catch (error) {
        showToast('Erro ao cancelar agendamento.', 'danger');
      }
    });
  };

  const handleNoShow = async (payment) => {
    try {
      const appointment = appointments.find((apt) => apt.id === payment.appointmentId);
      await atualizarPagamentoAgendamento(payment.id, { noShow: true });
      setAppointmentPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, noShow: true } : p)),
      );
      if (appointment) {
        await sendWhatsApp(appointment.id, 'noshow');
      } else {
        showToast('Não comparecimento registrado.', 'success');
      }
    } catch (error) {
      showToast('Erro ao registrar não comparecimento.', 'danger');
    }
  };

  const toggleBarberExpansion = (barberId) => {
    setExpandedBarbers((prev) => ({ ...prev, [barberId]: !prev[barberId] }));
  };

  const getAppointmentsByBarber = (barberId) => {
    return getFilteredAppointments()
      .filter((apt) => apt.barberId === barberId)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateB - dateA;
      });
  };

  const openChangeBarberModal = (appointment) => {
    setSelectedAppointmentForBarberChange(appointment);
    setNewBarberId(appointment.barberId.toString());
    setShowChangeBarberModal(true);
  };

  const closeChangeBarberModal = () => {
    setShowChangeBarberModal(false);
    setSelectedAppointmentForBarberChange(null);
    setNewBarberId('');
  };

  const handleChangeBarber = async () => {
    if (!newBarberId || newBarberId === selectedAppointmentForBarberChange.barberId.toString()) {
      showToast('Selecione um barbeiro diferente', 'danger');
      return;
    }
    const newBarber = barbers.find((b) => b.id.toString() === newBarberId);
    if (!newBarber) return;
    try {
      const updatedAppointment = {
        ...selectedAppointmentForBarberChange,
        barberId: newBarber.id,
        barberName: newBarber.displayName,
      };
      await updateAppointment(selectedAppointmentForBarberChange.id, updatedAppointment);
      await loadData();
      showToast(`Agendamento transferido para ${newBarber.displayName}!`, 'success');
      closeChangeBarberModal();
    } catch (error) {
      showToast('Erro ao alterar barbeiro.', 'danger');
    }
  };

  const calculateTotal = (services) => {
    return services.reduce((sum, service) => {
      const price = Number(
        String(service.unitPrice ?? 0)
          .replace('R$', '')
          .replace(/\./g, '')
          .replace(',', '.'),
      );
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const calculateBarberStatsbyBarber = (barberId) => {
    const barber = barbers.find((b) => b.id === barberId);
    const barberAppointments = getAppointmentsByBarber(barberId);
    let totalRevenue = 0;
    let totalServices = 0;
    barberAppointments.forEach((apt) => {
      const aptTotal = calculateTotal(apt.services);
      totalRevenue += aptTotal;
      totalServices += apt.services.length;
    });
    const commissionPercent = barber?.commissionPercent || 50;
    const barberEarnings = (totalRevenue * commissionPercent) / 100;
    const shopEarnings = totalRevenue - barberEarnings;
    return {
      totalRevenue,
      totalServices,
      appointmentsCount: barberAppointments.length,
      commissionPercent,
      barberEarnings,
      shopEarnings,
    };
  };

  const getFilteredAppointmentsByPeriod = useCallback(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (earningsFilter === 'week') {
      const today = now.getDay();
      const diff = now.getDate() - today + (today === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (earningsFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (earningsFilter === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
    }

    return appointments.filter((apt) => {
      const aptBarberId = String(apt.barberId || apt.barber || '');
      const myId = String(barberProfile?.id || '');

      const dateStr = apt.startAt || apt.date || apt.appointmentDate;
      const aptDate = new Date(dateStr);

      if (earningsFilter === 'all') {
        return aptBarberId === myId && myId !== '';
      }

      return aptBarberId === myId && aptDate >= start && aptDate <= end;
    });
  }, [appointments, earningsFilter, customStartDate, customEndDate, barberProfile]);

  const filtered = getFilteredAppointmentsByPeriod();

  const statsbyPeriod = useMemo(() => {



    let totalRevenue = 0;

    filtered.forEach((apt) => {
      totalRevenue += calculateTotal(apt.services || []);
    });

    const commissionPercent = barberProfile?.commissionPercent || 50;
    const barberEarnings = (totalRevenue * commissionPercent) / 100;

    return {
      totalRevenue,
      appointmentsCount: filtered.length,
      commissionPercent,
      barberEarnings,
      shopEarnings: totalRevenue - barberEarnings,
      filteredAppointments: filtered,
    };
  }, [getFilteredAppointmentsByPeriod, barberProfile, calculateTotal]);

  const calculateBarberStatsbyPeriod = () => {
    const filtered = getFilteredAppointmentsByPeriod();
    let totalRevenue = 0;
    let totalServices = 0;

    filtered.forEach((apt) => {
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
      filteredAppointments: filtered,
    };
  };

  const filterPaymentsByMonth = (payments) => {
    if (!selectedMonth) return payments;
    const [year, month] = selectedMonth.split('-');
    return payments.filter((payment) => {
      const paymentDate = new Date(
        payment.createdAt ||
        payment.appointmentDate ||
        payment.date ||
        payment.startDate ||
        payment.nextPaymentDate,
      );
      return (
        paymentDate.getFullYear() === parseInt(year) &&
        paymentDate.getMonth() + 1 === parseInt(month)
      );
    });
  };

  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  const calculatePaymentStats = (paymentsToUse) => {
    const stats = {
      pix: 0,
      credito: 0,
      debito: 0,
      dinheiro: 0,
      cartao: 0,
      total: 0,
      planCovered: 0,
      count: { pix: 0, credito: 0, debito: 0, dinheiro: 0, cartao: 0, planCovered: 0 },
    };
    const filteredSubscriptions = filterPaymentsByMonth(subscriptions);
    filteredSubscriptions.forEach((sub) => {
      const amount = parseFloat(sub.amount || sub.planPrice || 0);
      if (amount > 0) {
        stats.total += amount;
        const method = sub.paymentMethod?.toLowerCase();
        if (method === 'pix') {
          stats.pix += amount;
          stats.count.pix++;
        } else if (method === 'credito' || method === 'crédito') {
          stats.credito += amount;
          stats.count.credito++;
        } else if (method === 'debito' || method === 'débito') {
          stats.debito += amount;
          stats.count.debito++;
        }
      }
    });
    const paidAppointmentPayments = paymentsToUse.filter((p) => p.status === 'paid');
    paidAppointmentPayments.forEach((payment) => {
      const amount = parseFloat(payment.amount || 0);
      const method = String(payment.paymentMethod || payment.method || '').toLowerCase();
      const isPlanCovered =
        payment.status === 'plan_covered' ||
        payment.status === 'plancovered' ||
        method === 'subscription';
      if (isPlanCovered) {
        stats.count.planCovered++;
        return;
      }
      if (amount > 0) {
        stats.total += amount;
        if (method === 'pix') {
          stats.pix += amount;
          stats.count.pix++;
        } else if (method === 'credito' || method === 'crédito') {
          stats.credito += amount;
          stats.count.credito++;
        } else if (method === 'debito' || method === 'débito') {
          stats.debito += amount;
          stats.count.debito++;
        } else if (method === 'dinheiro') {
          stats.dinheiro += amount;
          stats.count.dinheiro++;
        } else if (method === 'cartao' || method === 'cartão') {
          stats.cartao += amount;
          stats.count.cartao++;
        }
      }
    });
    return stats;
  };

  const statsbyBarber = calculateBarberStatsbyBarber();
  /*   const statsbyPeriod = calculateBarberStatsbyPeriod();
   */
  const handleMarkProductSalePaid = async (sale, method) => {
    try {
      await atualizarVendaProduto(sale.id, {
        status: 'paid',
        paymentMethod: method,
        paidAt: new Date().toISOString(),
      });

      if (sale.products && sale.products.length > 0) {
        await Promise.all(
          sale.products.map(async (item) => {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/products/${item.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              const product = await res.json();
              const newStock = Math.max(0, (product.stock ?? 0) - (item.quantity ?? 1));
              await fetch(`${import.meta.env.VITE_API_URL}/products/${item.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ stock: newStock }),
              });
            } catch (stockError) {
              console.error(`Erro ao atualizar estoque do produto ${item.id}:`, stockError);
            }
          }),
        );

        const updatedProducts = await getProducts(true);
        setProducts(Array.isArray(updatedProducts) ? updatedProducts : []);
      }

      setProductSales((prev) =>
        prev.map((s) =>
          s.id === sale.id
            ? { ...s, status: 'paid', paymentMethod: method, paidAt: new Date().toISOString() }
            : s,
        ),
      );
      showToast('Venda marcada como paga e estoque atualizado!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar venda.', 'danger');
    }
  };

  const handleCancelProductSale = (sale) => {
    showConfirm('Deseja realmente cancelar esta venda?', async () => {
      try {
        await atualizarVendaProduto(sale.id, { status: 'cancelled' });
        setProductSales((prev) => prev.filter((s) => s.id !== sale.id));
        showToast('Venda cancelada.', 'success');
      } catch (error) {
        showToast('Erro ao cancelar venda.', 'danger');
      }
    });
  };


  const statsForEarnings = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (earningsFilter === 'week') {
      const today = now.getDay();
      const diff = now.getDate() - today + (today === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (earningsFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (earningsFilter === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(0);
      end = new Date();
    }

    let filtered = appointments.filter(apt => {
      if (!apt.startAt) return false;
      const aptDate = new Date(apt.startAt);
      return aptDate >= start && aptDate <= end;
    });

    if (!isAdmin && loggedInBarberProfile) {
      filtered = filtered.filter((apt) => String(apt.barberId) === String(loggedInBarberProfile.id));
    }

    let totalRevenue = 0;
    filtered.forEach(apt => {
      totalRevenue += calculateTotal(apt.services);
    });

    let extraPaymentsTotal = 0;
    if (!isAdmin && loggedInBarberProfile) {
      const extraPaymentsInPeriod = employeePayments.filter(payment => {
        if (!isExtraPayment(payment)) return false;
        if (
          loggedInBarberReferenceIds.length > 0 &&
          !loggedInBarberReferenceIds.includes(String(payment.employeeId))
        ) {
          return false;
        }
        const paymentDate = new Date(payment.paidAt || payment.periodStart || payment.createdAt);
        return paymentDate >= start && paymentDate <= end;
      });
      extraPaymentsTotal = extraPaymentsInPeriod.reduce((sum, p) => sum + (p.liquido || 0), 0);
    }

    const commissionPercent = loggedInBarberProfile?.commissionPercent || 50;
    const barberEarnings = (totalRevenue * commissionPercent) / 100;

    return {
      totalRevenue,
      appointmentsCount: filtered.length,
      commissionPercent,
      barberEarnings,
      shopEarnings: totalRevenue - barberEarnings,
      filteredAppointments: filtered,
      extraPaymentsTotal,   // <-- novo campo
    };
  }, [appointments, earningsFilter, customStartDate, customEndDate, isAdmin, loggedInBarberProfile, calculateTotal, employeePayments]);


  const filteredAppointmentsAdmin = useMemo(() => {
    let filtered = [...appointments];

    if (isBarber) {
      const loggedInBarber = barbers.find(
        (b) =>
          b.userId?.toString() === currentUser?.id?.toString() ||
          b.id?.toString() === currentUser?.barberId?.toString() ||
          (currentUser?.email && b.email === currentUser.email),
      );

      if (loggedInBarber) {
        filtered = filtered.filter(
          (apt) => (apt.barberId || apt.barber?.id)?.toString() === loggedInBarber.id?.toString(),
        );
      } else {
        filtered = [];
      }
    }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.startAt);
        return aptDate.getFullYear() === parseInt(year) && aptDate.getMonth() + 1 === parseInt(month);
      });
    }

    if (appointmentDateFilter) {
      filtered = filtered.filter((apt) => {
        const aptDateStr = new Date(apt.startAt).toISOString().split('T')[0];
        return aptDateStr === appointmentDateFilter;
      });
    } else if (appointmentStartDate || appointmentEndDate) {
      filtered = filtered.filter((apt) => {
        const aptDateStr = new Date(apt.startAt).toISOString().split('T')[0];
        return isDateInRange(aptDateStr, appointmentStartDate, appointmentEndDate);
      });
    }

    if (selectedBarberFilter !== 'all') {
      filtered = filtered.filter((apt) => apt.barberId === selectedBarberFilter);
    }

    filtered.sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    return filtered;
  }, [
    appointments,
    selectedMonth,
    appointmentDateFilter,
    appointmentStartDate,
    appointmentEndDate,
    selectedBarberFilter,
    isBarber,
    barbers,
    currentUser?.id,
    currentUser?.barberId,
    currentUser?.email,
  ]);

  const filteredAppointmentPayments = getFilteredPayments();

  const filteredAppointmentPaymentsForAgendamentos = getFilteredAppointmentPayments();

  const calculateMonthlyTotals = () => {
    const pendingAppointments = filteredAppointmentPayments
      .filter(
        (p) =>
          p.status === 'pending' || p.status === 'pendinglocal' || p.status === 'confirmed_unpaid',
      )
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const paidAppointments = filteredAppointmentPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const filteredSubscriptions = filterPaymentsByMonth(subscriptions);
    const paidSubscriptions = filteredSubscriptions.reduce(
      (sum, sub) => sum + parseFloat(sub.amount || sub.planPrice || 0),
      0,
    );
    return {
      pending: pendingAppointments,
      paid: paidAppointments + paidSubscriptions,
      total: pendingAppointments + paidAppointments + paidSubscriptions,
    };
  };

  const paymentStats = calculatePaymentStats(filteredAppointmentPayments);

  const pendingPayments = (() => {
    // let base = appointmentPayments.filter(
    //   (p) => p.status === 'pending' || p.status === 'pendinglocal' || p.status === 'confirmed_unpaid'
    // );
    let base = normalizedAppointmentPayments.filter(
      (p) =>
        p.status === 'pending' || p.status === 'pendinglocal' || p.status === 'confirmed_unpaid',
    );

    const getDate = (p) => toDateStr(p.appointmentDate) || toDateStr(p.createdAt);
    if (paymentDateFilter) {
      base = base.filter((p) => getDate(p) === toDateStr(paymentDateFilter));
    } else if (paymentStartDate || paymentEndDate) {
      base = base.filter((p) => isDateInRange(getDate(p), paymentStartDate, paymentEndDate));
    } else if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      base = base.filter((p) => {
        const [y, m] = getDate(p).split('-');
        return parseInt(y) === parseInt(year) && parseInt(m) === parseInt(month);
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return base.map((p) => {
      const apptDate = p.appointmentDate ? new Date(p.appointmentDate) : null;
      const isPast = apptDate && apptDate < today;
      const isConfirmedUnpaid = p.status === 'confirmed_unpaid';
      const displayStatus = isConfirmedUnpaid ? 'confirmed_unpaid' : isPast ? 'overdue' : p.status;
      return { ...p, displayStatus };
    });
  })();

  const paidPayments = filteredAppointmentPaymentsForAgendamentos.filter(
    (p) =>
      p.status === 'paid' ||
      p.status === 'plan_covered' ||
      p.status === 'plancovered' ||
      String(p.paymentMethod || p.method || '').toLowerCase() === 'subscription',
  );

  const BENEFIT_SERVICE_PREFIX = 'SERVICO_INCLUSO::';

  const sanitizeBenefitText = (value) => {
    if (typeof value !== 'string') return '';
    let cleaned = value.trim().replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/(\d)([a-zA-Z])/g, '$1 $2');
    return cleaned;
  };

  const parseBenefit = (benefit) => {
    const raw = typeof benefit === 'string' ? benefit : '';

    if (raw.startsWith(BENEFIT_SERVICE_PREFIX)) {
      const parts = raw.split('::');
      return {
        raw,
        isServiceLinked: true,
        serviceId: parts[1] || '',
        serviceName: parts.slice(2).join('::').trim(),
      };
    }

    return {
      raw,
      isServiceLinked: false,
      serviceId: '',
      serviceName: '',
    };
  };

  const formatBenefitLabel = (benefit) => {
    const parsed = parseBenefit(benefit);
    if (parsed.isServiceLinked) {
      return `Serviço incluído: ${parsed.serviceName || 'Serviço'}`;
    }
    return sanitizeBenefitText(parsed.raw);
  };

  const openBenefitModal = (planId, benefit = null, benefitIndex = null) => {
    const parsedBenefit = parseBenefit(benefit);
    setSelectedPlanForBenefit({ planId, benefitIndex });
    setEditingBenefit(benefit);
    setBenefitForm(parsedBenefit.isServiceLinked ? '' : parsedBenefit.raw || '');
    setBenefitServiceId(parsedBenefit.serviceId || '');
    setShowBenefitModal(true);
  };

  const openPlanModal = (plan = null) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem gerenciar planos.', 'danger');
      return;
    }

    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name || '',
        price: Number(plan.price || 0),
        mpPreapprovalPlanId: plan.mpPreapprovalPlanId || '',
        mpSubscriptionUrl: plan.mpSubscriptionUrl || '',
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: '', price: '', mpPreapprovalPlanId: '', mpSubscriptionUrl: '' });
    }

    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanForm({ name: '', price: '', mpPreapprovalPlanId: '', mpSubscriptionUrl: '' });
  };

  const handlePlanFormChange = (field, value) => {
    setPlanForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      showToast('Apenas administradores podem gerenciar planos.', 'danger');
      return;
    }

    const planName = planForm.name?.trim();
    const planPrice = Number(planForm.price);
    const planMpPreapprovalId = planForm.mpPreapprovalPlanId?.trim() || null;
    const planSubscriptionUrl = planForm.mpSubscriptionUrl?.trim() || null;

    if (!planName) {
      showToast('Informe o nome do plano.', 'danger');
      return;
    }

    if (Number.isNaN(planPrice) || planPrice < 0) {
      showToast('Informe um preço válido.', 'danger');
      return;
    }

    try {
      setPlanSaving(true);

      if (editingPlan) {
        const response = await fetch(`${API_URL}/subscription-plans/${editingPlan.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: planName,
            price: planPrice,
            mpPreapprovalPlanId: planMpPreapprovalId,
            mpSubscriptionUrl: planSubscriptionUrl,
          }),
        });

        if (!response.ok) throw new Error('Falha ao atualizar plano');
        showToast('Plano atualizado com sucesso!', 'success');
      } else {
        const response = await fetch(`${API_URL}/subscription-plans`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: planName,
            price: planPrice,
            cutsPerMonth: 0,
            features: [],
            active: true,
            recommended: false,
            mpPreapprovalPlanId: planMpPreapprovalId,
            mpSubscriptionUrl: planSubscriptionUrl,
          }),
        });

        if (!response.ok) throw new Error('Falha ao criar plano');
        showToast('Plano criado com sucesso!', 'success');
      }

      await loadPlans();
      closePlanModal();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      showToast('Erro ao salvar plano.', 'danger');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleTogglePlanActive = (plan) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem alterar o status do plano.', 'danger');
      return;
    }

    const shouldDeactivate = Boolean(plan?.active);
    const actionLabel = shouldDeactivate ? 'desativar' : 'ativar';

    showConfirm(`Deseja realmente ${actionLabel} o plano "${plan.name}"?`, async () => {
      try {
        const response = await fetch(`${API_URL}/subscription-plans/${plan.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ active: !shouldDeactivate }),
        });

        if (!response.ok) throw new Error('Falha ao atualizar status do plano');

        await loadPlans();
        showToast(
          shouldDeactivate
            ? 'Plano desativado com sucesso!'
            : 'Plano ativado com sucesso!',
          'success'
        );
      } catch (error) {
        console.error('Erro ao alterar status do plano:', error);
        showToast('Erro ao alterar status do plano.', 'danger');
      }
    });
  };

  const handleDeletePlan = (plan) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem excluir planos.', 'danger');
      return;
    }

    showConfirm(`Deseja realmente excluir o plano "${plan.name}"? Esta ação não pode ser desfeita.`, async () => {
      try {
        const response = await fetch(`${API_URL}/subscription-plans/${plan.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Falha ao excluir plano');

        await loadPlans();
        showToast('Plano excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir plano:', error);
        showToast('Erro ao excluir plano. Verifique se não há assinaturas vinculadas.', 'danger');
      }
    });
  };

  const closeBenefitModal = () => {
    setShowBenefitModal(false);
    setEditingBenefit(null);
    setSelectedPlanForBenefit(null);
    setBenefitForm('');
    setBenefitServiceId('');
  };

  const handleSaveBenefit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Apenas administradores podem gerenciar benefícios.', 'danger');
      return;
    }

    const selectedService = benefitServiceId
      ? services.find((service) => String(service.id) === String(benefitServiceId))
      : null;

    const cleaned = sanitizeBenefitText(benefitForm);

    if (!selectedService && !cleaned) {
      showToast('Digite um benefício válido ou selecione um serviço.', 'danger');
      return;
    }

    const benefitValue = selectedService
      ? `${BENEFIT_SERVICE_PREFIX}${selectedService.id}::${selectedService.name}`
      : cleaned;

    try {
      const plan = plans.find((p) => p.id === selectedPlanForBenefit.planId);
      if (!plan) return;

      let updatedFeatures = [...plan.features];
      if (selectedPlanForBenefit.benefitIndex !== null) {
        updatedFeatures[selectedPlanForBenefit.benefitIndex] = benefitValue;
      } else {
        updatedFeatures.push(benefitValue);
      }

      await fetch(`${API_URL}/subscription-plans/${plan.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features: updatedFeatures }),
      });

      await loadPlans();
      showToast(
        selectedPlanForBenefit.benefitIndex !== null
          ? 'Benefício atualizado com sucesso!'
          : 'Benefício adicionado com sucesso!',
        'success'
      );
      closeBenefitModal();
    } catch (error) {
      showToast('Erro ao salvar benefício.', 'danger');
    }
  };

  const handleDeleteBenefit = (planId, benefitIndex) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem excluir benefícios.', 'danger');
      return;
    }
    showConfirm('Deseja realmente excluir este benefício?', async () => {
      try {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) return;
        const updatedFeatures = plan.features.filter((_, idx) => idx !== benefitIndex);
        await fetch(`${API_URL}/subscription-plans/${plan.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ features: updatedFeatures }),
        });
        await loadPlans();
        showToast('Benefício excluído com sucesso!', 'success');
      } catch (error) {
        showToast('Erro ao excluir benefício.', 'danger');
      }
    });
  };

  const loadServices = useCallback(async () => {
    try {
      const data = await getAllServices(true);
      setServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      showToast('Erro ao carregar serviços', 'danger');
    }
  }, []);

  const openServiceModal = (service = null) => {
    if (service && !hasPermission('editServices')) {
      showToast('Você não tem permissão para editar serviços', 'danger');
      return;
    }
    if (!service && !hasPermission('addServices')) {
      showToast('Você não tem permissão para adicionar serviços', 'danger');
      return;
    }

    if (service) {
      setEditingService(service);

      const priceValue = service.basePrice;
      //.replace(/,/g, '.').replace(/R\$/g, '').trim();
      // const promotionalPriceValue = service.promotionalPrice
      //   ? service.promotionalPrice.replace(/,/g, '.').replace(/R\$/g, '').trim()
      //   : '';

      setServiceForm({
        name: service.name,
        price: priceValue,
        promotionalPrice: service.promotionalPrice || 0,
        commissionPercent: service.commissionPercent ?? service.commission_percent ?? 0,
        coveredByPlan: service.covered_by_plan || false,
        image: service.image || '',
        duration: service.durationMinutes || 30,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        price: '',
        promotionalPrice: '',
        commissionPercent: '',
        coveredByPlan: false,
        image: '',
        duration: 30,
      });
    }
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm({
      name: '',
      price: '',
      promotionalPrice: '',
      commissionPercent: '',
      coveredByPlan: false,
      image: '',
      duration: 30,
    });
  };

  const handleServiceFormChange = (field, value) => {
    setServiceForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveService = async (e) => {
    e.preventDefault();

    const requiredPermission = editingService ? 'editServices' : 'addServices';
    if (!hasPermission(requiredPermission)) {
      showToast('Você não tem permissão para salvar serviços.', 'danger');
      return;
    }

    try {
      const formattedPrice = `R$ ${parseFloat(serviceForm.price).toFixed(2).replace('.', ',')}`;
      const parsedCommissionPercent = Number(serviceForm.commissionPercent);

      if (
        Number.isNaN(parsedCommissionPercent) ||
        parsedCommissionPercent < 0 ||
        parsedCommissionPercent > 100
      ) {
        showToast('A porcentagem da comissão deve estar entre 0 e 100.', 'danger');
        return;
      }

      let formattedPromotionalPrice = '';
      // if (serviceForm.promotionalPrice && serviceForm.promotionalPrice.trim() !== '') {
      //   const promoValue = parseFloat(serviceForm.promotionalPrice);
      //   if (!isNaN(promoValue) && promoValue > 0) {
      //     formattedPromotionalPrice = `R$ ${promoValue.toFixed(2).replace('.', ',')}`;
      //   }
      // }

      const serviceData = {
        name: serviceForm.name,
        basePrice: Number(serviceForm.price),
        promotionalPrice: Number(serviceForm.promotionalPrice) || 0,
        comissionPercent: parsedCommissionPercent,
        covered_by_plan: serviceForm.coveredByPlan,
        imageUrl:
          serviceForm.image || 'https://images.unsplash.com/photo-1596728325488-58c87691e9af',
        durationMinutes: parseInt(serviceForm.duration),
      };

      if (editingService) {
        await updateService(editingService.id, serviceData);
        showToast('Serviço atualizado com sucesso!', 'success');
      } else {
        await createService(serviceData);
        showToast('Serviço criado com sucesso!', 'success');
      }

      await loadServices();
      closeServiceModal();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      showToast('Erro ao salvar serviço', 'danger');
    }
  };

  const handleDeleteService = (service) => {
    if (!hasPermission('editServices')) {
      showToast('Você não tem permissão para excluir serviços.', 'danger');
      return;
    }

    const isActive = service.active !== false;
    const confirmMessage = isActive
      ? 'Tem certeza que deseja desativar este serviço?'
      : 'Tem certeza que deseja ativar novamente este serviço?';

    showConfirm(confirmMessage, async () => {
      try {
        if (isActive) {
          const response = await deleteService(service.id);
          const updatedService = { ...service, active: false };
          setServices((prev) => prev.map((item) => (item.id === service.id ? updatedService : item)));
          showToast(response?.reason || 'Serviço desativado com sucesso!', 'success');
        } else {
          const response = await reactivateService(service.id);
          const updatedService = { ...service, active: true };
          setServices((prev) => prev.map((item) => (item.id === service.id ? updatedService : item)));
          showToast(response?.reason || 'Serviço reativado com sucesso!', 'success');
        }
      } catch (error) {
        console.error('Erro ao alterar status do serviço:', error);
        showToast('Erro ao alterar o status do serviço', 'danger');
      }
    });
  };

  const getPayrollPeriodDates = (period, monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const now = new Date();
    if (period === 'mensal') {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { start, end };
    }
    if (period === 'quinzenal') {
      const day = now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() : 15;
      if (day <= 15) {
        return {
          start: `${year}-${String(month).padStart(2, '0')}-01`,
          end: `${year}-${String(month).padStart(2, '0')}-15`,
        };
      }
      const lastDay = new Date(year, month, 0).getDate();
      return {
        start: `${year}-${String(month).padStart(2, '0')}-16`,
        end: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
      };
    }
    if (period === 'semanal') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      };
    }
    return { start: '', end: '' };
  };

  const getBarberCommissionInPeriod = (barberId, start, end) => {
    if (!barberId || !start || !end) return 0;
    const barberData = barbers.find((b) => String(b.id) === String(barberId));
    if (!barberData) return 0;
    const commissionPercent = Number(barberData.commissionPercent) || 50;
    const relevantPayments = normalizedAppointmentPayments.filter((p) => {
      if (
        String(p.appointment.barber.id) !== String(barberId) &&
        p.appointment.barber.displayName !== barberData.displayName
      )
        return false;
      // if (p.status !== 'paid') return false;
      // if (p.commissionPaid === true) return false;
      const d = p.appointmentDate
        ? String(p.appointmentDate).slice(0, 10)
        : p.paidAt
          ? String(p.paidAt).slice(0, 10)
          : '';
      return d >= start && d <= end;
    });
    // const total = normalizedAppointmentPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const total = normalizedAppointmentPayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0,
    );
    return parseFloat(((total * commissionPercent) / 100).toFixed(2));
  };

  const getValesInPeriod = (employeeId, start, end) => {
    if (!start || !end) return [];
    return employeeVales.filter(
      (v) => String(v.employeeId) === String(employeeId) && v.data >= start && v.data <= end,
    );
  };

  const getExtraPaymentsInPeriod = (employeeId, start, end) => {
    if (!start || !end || !Array.isArray(employeePayments)) return [];

    return employeePayments.filter((payment) => {
      if (!isExtraPayment(payment)) return false;
      if (String(payment.employeeId) !== String(employeeId)) return false;

      const dateRef = payment.paidAt || payment.periodStart;
      if (!dateRef) return false;

      const dateStr = String(dateRef).slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const handleSaveVale = async (e) => {
    e.preventDefault();
    if (!valeForm.employeeId || !valeForm.valor) {
      showToast('Funcionário e valor são obrigatórios.', 'danger');
      return;
    }
    try {
      const vale = {
        ...valeForm,
        valor: parseFloat(valeForm.valor),
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id,
      };
      await fetch('https://barberoneapp-back-homolog.onrender.com/employeeVales', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vale),
      });
      const res = await fetch('https://barberoneapp-back-homolog.onrender.com/employeeVales', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setEmployeeVales(await res.json());
      setValeForm({
        employeeId: '',
        valor: '',
        observacao: '',
        data: new Date().toISOString().split('T')[0],
      });
      setShowValeModal(false);
      showToast('Vale registrado com sucesso!', 'success');
    } catch {
      showToast('Erro ao registrar vale.', 'danger');
    }
  };

  const handleDeleteVale = (id) => {
    showConfirm('Deseja excluir este vale?', async () => {
      await fetch(`https://barberoneapp-back-homolog.onrender.com/employeeVales/${id}`, {
        method: 'DELETE',
      });
      setEmployeeVales((prev) => prev.filter((v) => v.id !== id));
      showToast('Vale excluído.', 'success');
    });
  };

  function isExtraPayment(payment) {
    const start = payment?.periodStart;
    const end = payment?.periodEnd;
    const salarioFixo = Number(payment?.salarioFixo || 0);
    const commission = Number(payment?.commission || 0);
    const totalVales = Number(payment?.totalVales || 0);
    const liquido = Number(payment?.liquido || 0);

    return Boolean(
      start &&
      end &&
      start === end &&
      salarioFixo > 0 &&
      commission === 0 &&
      totalVales === 0 &&
      Math.abs(salarioFixo - liquido) < 0.01,
    );
  }

  const getFilteredExtraPayments = () => {
    if (!Array.isArray(employeePayments)) return [];

    return employeePayments
      .filter(isExtraPayment)
      .filter((payment) => {
        if (!extraPaymentMonthFilter) return true;
        const dateRef = payment.paidAt || payment.periodStart;
        if (!dateRef) return false;
        const date = new Date(dateRef);
        if (Number.isNaN(date.getTime())) return false;
        const [year, month] = extraPaymentMonthFilter.split('-').map(Number);
        return date.getFullYear() === year && date.getMonth() + 1 === month;
      })
      .sort(
        (a, b) => new Date(b.paidAt || b.createdAt || 0) - new Date(a.paidAt || a.createdAt || 0),
      );
  };

  const handleExtraPaymentFormChange = (field, value) => {
    setExtraPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveExtraPayment = async (e) => {
    e.preventDefault();

    if (!isAdmin || !hasPermission('managePayroll')) {
      showToast('Você não tem permissão para registrar pagamento extra.', 'danger');
      return;
    }

    const employee = employees.find(
      (emp) => String(emp.id) === String(extraPaymentForm.employeeId),
    );
    const amount = Number(extraPaymentForm.amount);
    const paymentDate = extraPaymentForm.date;

    if (!employee) {
      showToast('Selecione um funcionário válido.', 'danger');
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      showToast('Informe um valor maior que zero.', 'danger');
      return;
    }

    if (!paymentDate) {
      showToast('Informe a data do pagamento.', 'danger');
      return;
    }

    try {
      setExtraPaymentLoading(true);

      const payload = {
        employeeId: employee.id,
        employeeName: employee.name,
        period: 'mensal',
        periodStart: paymentDate,
        periodEnd: paymentDate,
        salarioFixo: amount,
        commission: 0,
        totalVales: 0,
        liquido: amount,
      };

      const response = await fetch('https://barberoneapp-back-homolog.onrender.com/employeePayments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Falha ao registrar pagamento extra');
      }

      const created = await response.json();
      setEmployeePayments((prev) => [created, ...prev]);
      setExtraPaymentForm({
        employeeId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      showToast('Pagamento extra registrado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao registrar pagamento extra:', error);
      showToast('Erro ao registrar pagamento extra.', 'danger');
    } finally {
      setExtraPaymentLoading(false);
    }
  };

  const checkAlreadyPaidInPeriod = (employeeId, period, monthStr) => {
    const { start, end } = getPayrollPeriodDates(period, monthStr);

    return (
      employeePayments.find(
        (p) =>
          String(p.employeeId) === String(employeeId) &&
          p.period === period &&
          p.periodStart === start &&
          p.periodEnd === end,
      ) || null
    );
  };

  const handleMarkPayrollPaid = async (employee, barberData, period) => {
    const { start, end } = getPayrollPeriodDates(period, payrollMonthFilter);
    const barberId = barberData?.id;
    const commission = barberId ? getBarberCommissionInPeriod(barberId, start, end) : 0;
    const vales = getValesInPeriod(employee.id, start, end);
    const totalExtraPayments = getExtraPaymentsInPeriod(employee.id, start, end).reduce(
      (sum, payment) => sum + Number(payment.liquido || 0),
      0,
    );
    const totalVales = vales.reduce((s, v) => s + v.valor, 0);
    const salarioFixo = parseFloat(barberData?.salarioFixo ?? employee.salarioFixo ?? 0) || 0;
    const liquido = salarioFixo + commission + totalExtraPayments - totalVales;

    const existingPayment = checkAlreadyPaidInPeriod(employee.id, period, payrollMonthFilter);
    const periodLabel =
      period === 'semanal' ? 'semana' : period === 'quinzenal' ? 'quinzena' : 'mês';
    const confirmMsg = existingPayment
      ? `⚠️ ${employee.name} já recebeu R$ ${parseFloat(existingPayment.liquido).toFixed(2)} nessa ${periodLabel} (pago em ${new Date(existingPayment.paidAt).toLocaleDateString('pt-BR')}).\n\nTem certeza que deseja registrar um segundo pagamento de R$ ${liquido.toFixed(2)}?`
      : `Confirmar pagamento de R$ ${liquido.toFixed(2)} para ${employee.name}?`;

    showConfirm(confirmMsg, async () => {
      try {
        const paymentRecord = {
          employeeId: employee.id,
          employeeName: employee.name,
          period,
          periodStart: start,
          periodEnd: end,
          salarioFixo,
          commission,
          totalVales,
          liquido,
          paidAt: new Date().toISOString(),
          paidBy: currentUser?.id,
        };
        await fetch('https://barberoneapp-back-homolog.onrender.com/employeePayments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentRecord),
        });
        for (const v of vales)
          await fetch(`https://barberoneapp-back-homolog.onrender.com/employeeVales/${v.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

        if (barberId) {
          const toMark = normalizedAppointmentPayments.filter((p) => {
            if (String(p.barberId) !== String(barberId) && p.barberName !== barberData?.name)
              return false;
            if (p.status !== 'paid' || p.commissionPaid === true) return false;
            const d = p.appointmentDate
              ? String(p.appointmentDate).slice(0, 10)
              : p.paidAt
                ? String(p.paidAt).slice(0, 10)
                : '';
            return d >= start && d <= end;
          });
          await Promise.all(
            toMark.map((p) =>
              fetch(`https://barberoneapp-back-homolog.onrender.com/appointmentPayments/${p.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commissionPaid: true }),
              }),
            ),
          );
        }

        const [valesRes, paymentsRes, aptsRes] = await Promise.all([
          fetch('https://barberoneapp-back-homolog.onrender.com/employeeVales'),
          fetch('https://barberoneapp-back-homolog.onrender.com/employeePayments'),
          fetch('https://barberoneapp-back-homolog.onrender.com/appointmentPayments', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);
        setEmployeeVales(await valesRes.json());
        setEmployeePayments(await paymentsRes.json());
        setAppointmentPayments(await aptsRes.json());
        showToast(`✅ Pagamento de ${employee.name} registrado com sucesso!`, 'success');
      } catch {
        showToast('Erro ao registrar pagamento.', 'danger');
      }
    });
  };

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

  const PaymentBadge = ({ method }) => {
    const raw = (method || '').toLowerCase().trim();

    const m = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const map = {
      pix: { label: 'PIX', bg: '#00b37722', color: '#00b377', border: '#00b37755' },
      credito: { label: 'Crédito', bg: '#8b5cf622', color: '#a78bfa', border: '#8b5cf655' },
      debito: { label: 'Débito', bg: '#3b82f622', color: '#60a5fa', border: '#3b82f655' },
      cartao: { label: 'Cartão', bg: '#f59e0b22', color: '#fbbf24', border: '#f59e0b55' },
      dinheiro: { label: 'Dinheiro', bg: '#22c55e22', color: '#4ade80', border: '#22c55e55' },
      subscription: { label: 'Plano', bg: '#d4af3722', color: '#d4af37', border: '#d4af3755' },
      local: { label: 'No Local', bg: '#64748b22', color: '#94a3b8', border: '#64748b55' },
    };
    const s = map[m] || {
      label: method || 'N/A',
      bg: '#33333322',
      color: '#888',
      border: '#44444455',
    };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '10px',
          fontSize: '0.78rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
        }}
      >
        {s.label}
      </span>
    );
  };

  const getPaymentMethodValue = (payment) => {
    return String(payment?.paymentMethod || payment?.method || '').toLowerCase().trim();
  };

  const getPaymentTypeLabel = (payment) => {
    const method = getPaymentMethodValue(payment);
    const isPlanCovered = payment?.status === 'plan_covered' || payment?.status === 'plancovered' || method === 'subscription';

    if (isPlanCovered) return 'Plano';
    if (method === 'local' || payment?.status === 'pendinglocal') return 'No Local';
    if (method === 'pix') return 'PIX';
    if (method === 'credito' || method === 'crédito' || method === 'debito' || method === 'débito' || method === 'cartao' || method === 'cartão') return 'Cartão';
    if (method === 'dinheiro') return 'Dinheiro';
    return 'Avulso';
  };

  const getAppointmentPaymentMethodLabel = (appointmentId) => {
    const payment = normalizedAppointmentPayments.find(
      (item) => String(item.appointmentId ?? item.appointment?.id ?? '') === String(appointmentId),
    );

    if (!payment) return 'Não informado';

    const method = getPaymentMethodValue(payment);
    const isPlanCovered =
      payment?.status === 'plan_covered' || payment?.status === 'plancovered' || method === 'subscription';

    if (isPlanCovered) return 'Plano';
    if (method === 'pix') return 'Online via PIX';
    if (method === 'credito' || method === 'crédito' || method === 'debito' || method === 'débito' || method === 'cartao' || method === 'cartão') {
      return 'Online via cartão';
    }
    if (method === 'local' || payment?.status === 'pendinglocal') return 'Pagamento local';
    if (method === 'dinheiro') return 'Dinheiro';
    return getPaymentTypeLabel(payment);
  };


  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth-card auth-card--wide">
          <div className="appointments-header">
            <div>
              <h1 className="auth-title">Painel Administrativo</h1>
              <p className="auth-subtitle">
                Usuário: {currentUser?.name}{' '}
                <span className="admin-badge">
                  {isAdmin ? 'Admin' : isReceptionist ? 'Recepcionista' : 'Funcionário'}
                </span>
              </p>
            </div>
            <div className="admin-header-actions">
              {/* <button onClick={() => navigate('/appointments')} className="btn-header">
                Agendamentos
              </button> */}
              {/* <button className="btn-header btn-header-logout" onClick={handleLogout}>
                Sair
              </button> */}
            </div>
          </div>


          <div className="appointments-tabs">
            {/* Abas visíveis para todos (inclusive barbeiros) */}
            <button
              onClick={() => setActiveTab('calendario')}
              className={`tab-btn ${activeTab === 'calendario' ? 'tab-btn--active' : ''}`}
            >
              Calendário
            </button>
            {canAccessEarnings && (
              <button
                onClick={() => setActiveTab('earnings')}
                className={`tab-btn ${activeTab === 'earnings' ? 'tab-btn--active' : ''}`}
              >
                Ganhos
              </button>
            )}
            <button
              onClick={() => setActiveTab('agendamentos')}
              className={`tab-btn ${activeTab === 'agendamentos' ? 'tab-btn--active' : ''}`}
            >
              Agendamentos
            </button>

            {/* Abas que NÃO aparecem para barbeiros */}
            {!isBarber && (
              <>
                {hasPermission('manageSettings') && (
                  <button
                    className={`tab-btn ${activeTab === 'terms' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('terms')}
                  >
                    Termos e Documentos
                  </button>
                )}
                {hasPermission('manageServices') && (
                  <button
                    className={`tab-btn ${activeTab === 'services' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('services')}
                  >
                    Serviços ({services.length})
                  </button>
                )}
                {hasPermission('manageSettings') && (
                  <button
                    className={`tab-btn ${activeTab === 'homeInfo' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('homeInfo')}
                  >
                    Configurações
                  </button>
                )}
                <button
                  className={`tab-btn ${activeTab === 'gallery' ? 'tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('gallery')}
                >
                  Galeria
                </button>
                {hasPermission('manageEmployees') && (
                  <button
                    onClick={() => setActiveTab('employees')}
                    className={`tab-btn ${activeTab === 'employees' ? 'tab-btn--active' : ''}`}
                  >
                    Gerenciar Funcionários
                  </button>
                )}
                {(isAdmin || hasPermission('managePayroll')) && (
                  <>
                    <button
                      onClick={() => setActiveTab('payroll')}
                      className={`tab-btn ${activeTab === 'payroll' ? 'tab-btn--active' : ''}`}
                    >
                      Pagamentos Funcionários
                    </button>
                    <button
                      onClick={() => setActiveTab('extraPayments')}
                      className={`tab-btn ${activeTab === 'extraPayments' ? 'tab-btn--active' : ''}`}
                    >
                      Pagamentos Extras
                    </button>
                  </>
                )}
                {hasPermission('manageProducts') && (
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`tab-btn ${activeTab === 'products' ? 'tab-btn--active' : ''}`}
                  >
                    Produtos ({products.length})
                  </button>
                )}
                {hasPermission('manageBenefits') && (
                  <button
                    onClick={() => setActiveTab('benefits')}
                    className={`tab-btn ${activeTab === 'benefits' ? 'tab-btn--active' : ''}`}
                  >
                    Benefícios dos Planos
                  </button>
                )}
                {isAdmin && hasPermission('managePayments') && (
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`tab-btn ${activeTab === 'payments' ? 'tab-btn--active' : ''}`}
                  >
                    Pagamentos {pendingPayments.length > 0 && `(${pendingPayments.length})`}
                  </button>
                )}
                {hasPermission('managePayments') && (
                  <button
                    onClick={() => setActiveTab('cancelPlanos')}
                    className={`tab-btn ${activeTab === 'cancelPlanos' ? 'tab-btn--active' : ''}`}
                  >
                    Planos
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`tab-btn ${activeTab === 'usuarios' ? 'tab-btn--active' : ''}`}
                  >
                    Usuários
                  </button>
                )}
              </>
            )}
          </div>





          {canManageGallery && activeTab === 'gallery' && (
            <div className="tab-content gallery-admin-container">
              <div className="gallery-section-header">
                <div className="gallery-header-content">
                  <h2>
                    Galeria de Fotos
                    <span className="gallery-counter-badge">
                      {gallery.length}/{MAX_GALLERY_IMAGES}
                    </span>
                  </h2>
                  <p>Gerencie as fotos exibidas na galeria da página inicial</p>
                </div>
                {gallery.length < MAX_GALLERY_IMAGES && (
                  <Button onClick={() => openGalleryModal()}>➕ Adicionar Foto</Button>
                )}
              </div>

              {galleryLoading ? (
                <div className="gallery-loading">
                  <div className="gallery-loading-spinner"></div>
                  <p className="gallery-loading-text">Carregando galeria...</p>
                </div>
              ) : gallery.length === 0 ? (
                <div className="gallery-empty-state">
                  <div className="gallery-empty-icon">📷</div>
                  <h3 className="gallery-empty-title">Nenhuma foto na galeria ainda</h3>
                  <p className="gallery-empty-subtitle">
                    Clique em "Adicionar Foto" para começar a construir sua galeria!
                  </p>
                </div>
              ) : (
                <div className="gallery-grid">
                  {gallery.map((image, index) => (
                    <div key={image.id} className="gallery-card">
                      <div className="gallery-card-image-wrapper">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="gallery-card-image"
                          onError={(e) => {
                            e.target.src =
                              'https://via.placeholder.com/280x220?text=Erro+ao+Carregar';
                          }}
                        />
                        <div className="gallery-card-overlay">
                          <span className="gallery-card-overlay-text">
                            {image.alt || 'Sem descrição'}
                          </span>
                        </div>
                      </div>
                      <div className="gallery-card-info">
                        <p className="gallery-card-description">{image.alt || 'Sem descrição'}</p>
                        <div className="gallery-card-actions">
                          <button
                            onClick={() => openGalleryModal(image)}
                            className="gallery-btn gallery-btn-edit"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteGalleryImage(image.id)}
                            className="gallery-btn gallery-btn-delete"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {gallery.length >= MAX_GALLERY_IMAGES && (
                <div className="gallery-limit-alert">
                  <div>
                    <strong>⚠️ Limite atingido</strong>
                  </div>
                  <p className="gallery-limit-alert-text">
                    Você atingiu o limite de {MAX_GALLERY_IMAGES} fotos na galeria. Exclua uma foto
                    para adicionar uma nova.
                  </p>
                </div>
              )}
            </div>
          )}

          {canAccessEarnings && activeTab === 'earnings' && (
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
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="form-select" />
                    </div>
                    <div className="date-input-group">
                      <label className="form-label">Data Final</label>
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="form-select" />
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
                    <img
                      src={barberProfile?.photo || `https://i.pravatar.cc/150?img=${barberProfile?.id}`}
                      alt={barberProfile?.name}
                      className="fluig-barber-photo"
                    />
                    <div className="fluig-barber-details">
                      <h3 className="fluig-barber-name">{barberProfile?.name || currentUser?.name}</h3>
                      <p className="fluig-barber-specialty">{barberProfile?.specialty || 'Barbeiro'}</p>
                    </div>
                  </div>

                  <div className="fluig-barber-stats">
                    <div className="stat-item">
                      <span className="stat-label">Atendimentos</span>
                      <span className="stat-value">{statsForEarnings.appointmentsCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Faturamento Total</span>
                      <span className="stat-value stat-value-highlight">R$ {statsForEarnings.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pagamentos Extras</span>
                      <span className="stat-value stat-value-highlight"> R$ {statsForEarnings.extraPaymentsTotal?.toFixed(2) || '0,00'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Comissão ({statsForEarnings.commissionPercent}%)</span>
                      <span className="stat-value stat-value-success">R$ {statsForEarnings.barberEarnings.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Barbearia</span>
                      <span className="stat-value">R$ {statsForEarnings.shopEarnings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="fluig-children-container">
                  {statsForEarnings.filteredAppointments.length === 0 ? (
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
                          <th>Ganhos do Barbeiro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsForEarnings.filteredAppointments.map((apt) => {
                          const aptTotal = calculateTotal(apt.services);
                          const barberEarning = (aptTotal * statsForEarnings.commissionPercent) / 100;
                          const aptDate = new Date(apt.startAt);
                          const formattedDate = aptDate.toLocaleDateString('pt-BR');
                          const formattedTime = aptDate.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            // timeZone: 'UTC'
                          });
                          return (
                            <tr key={apt.id}>
                              <td>
                                {apt.status === 'confirmed' ? (
                                  <span className="status-badge status-confirmed">Confirmado</span>
                                ) : apt.status === 'completed' ? (
                                  <span className="status-badge status-completed">Finalizado</span>
                                ) : (
                                  <span className="status-badge status-pending">Pendente</span>
                                )}
                              </td>
                              <td><strong>{apt.client.name}</strong></td>
                              <td>{formattedDate}</td>
                              <td>
                                <span className="appointment-time">{formattedTime}</span>
                              </td>
                              <td>
                                <div className="services-list">
                                  {apt.services.map((s, idx) => (
                                    <span key={idx} className="service-pill">{s.serviceName}</span>
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

          {activeTab === 'homeInfo' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>🏠 Configurações</h2>
                <p>Edite os textos que aparecem na página inicial</p>
              </div>

              {isAdmin && (
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--gold)', fontSize: '1rem' }}>
                    Formas de pagamento no agendamento
                  </h3>
                  <p style={{ margin: '0 0 0.9rem 0', color: '#a8a8a8', fontSize: '0.85rem' }}>
                    Marque para ocultar no agendamento. Apenas administradores podem alterar.
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                      <input
                        type="checkbox"
                        checked={hiddenBookingPaymentMethods.includes('cartao')}
                        disabled={savingPaymentVisibility}
                        onChange={() => handleToggleBookingPaymentVisibility('cartao')}
                      />
                      Ocultar Pagar no Cartão
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                      <input
                        type="checkbox"
                        checked={hiddenBookingPaymentMethods.includes('pix')}
                        disabled={savingPaymentVisibility}
                        onChange={() => handleToggleBookingPaymentVisibility('pix')}
                      />
                      Ocultar Pagar no Pix
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                      <input
                        type="checkbox"
                        checked={hiddenBookingPaymentMethods.includes('local')}
                        disabled={savingPaymentVisibility}
                        onChange={() => handleToggleBookingPaymentVisibility('local')}
                      />
                      Ocultar Pagar no Local
                    </label>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveHomeInfo} className="home-info-form">
                <div className="form-section">
                  <h3 className="section-subtitle">Banner de Início</h3>
                  <div style={{ marginTop: '0.9rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
                      Imagens do carrossel
                    </label>

                    <p style={{ color: '#777', fontSize: '0.78rem', marginBottom: '0.55rem' }}>
                      A ordem define o clique do banner na Home: 1a imagem = Planos, 2a = Servicos, 3a = Agendamentos.
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={heroCarouselInput}
                        onChange={(e) => setHeroCarouselInput(e.target.value)}
                        placeholder="Cole uma URL e clique em adicionar"
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: 6,
                          color: '#aaa',
                          fontSize: '0.78rem',
                        }}
                      />

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await addHeroImageToCarousel(heroCarouselInput);
                            setHeroCarouselInput('');
                          } catch {
                            // erro ja tratado em persistHomeInfo
                          }
                        }}
                        style={{
                          background: '#ff7a1a',
                          color: '#111',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Adicionar
                      </button>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <label
                        htmlFor="hero-carousel-upload"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'transparent',
                          border: '1px solid rgba(255,122,26,0.5)',
                          color: '#ff7a1a',
                          borderRadius: '6px',
                          padding: '7px 12px',
                          cursor: heroCarouselUploading ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          opacity: heroCarouselUploading ? 0.6 : 1,
                        }}
                      >
                        {heroCarouselUploading ? '⏳ Enviando...' : '📤 Enviar imagens para carrossel'}
                      </label>
                      <input
                        id="hero-carousel-upload"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        style={{ display: 'none' }}
                        disabled={heroCarouselUploading}
                        onChange={async (e) => {
                          await handleHeroCarouselUpload(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.35rem' }}>
                        Selecione uma ou mais imagens (JPG, PNG, GIF, WebP).
                      </p>
                    </div>

                    <div style={{ marginTop: '0.6rem', display: 'grid', gap: '0.45rem' }}>
                      {(Array.isArray(homeInfo.heroImages) ? homeInfo.heroImages : []).map((imageUrl, index) => (
                        <div
                          key={`${imageUrl}-${index}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#161616',
                            border: '1px solid #292929',
                            borderRadius: 8,
                            padding: '6px 8px',
                            width: '100%',
                            minWidth: 0,
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt={`Banner ${index + 1}`}
                            style={{
                              width: 42,
                              height: 32,
                              objectFit: 'cover',
                              borderRadius: 4,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              color: '#9f9f9f',
                              fontSize: '0.73rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0,
                            }}
                            title={imageUrl}
                          >
                            {imageUrl}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await removeHeroImageFromCarousel(index);
                              } catch {
                                // erro ja tratado em persistHomeInfo
                              }
                            }}
                            style={{
                              background: 'transparent',
                              color: '#ef4444',
                              border: '1px solid #ef444466',
                              borderRadius: 6,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-section" style={{ marginTop: '2rem' }}>
                  <h3 className="section-subtitle">Sobre Nós</h3>

                  <Input
                    label="Título da Seção"
                    value={homeInfo.aboutTitle}
                    onChange={(e) => handleHomeInfoChange('aboutTitle', e.target.value)}
                    placeholder="Ex: Barbearia Rodrigues"
                  />

                  <div className="form-group">
                    <label>Parágrafo 1</label>
                    <textarea
                      value={homeInfo.aboutText1}
                      onChange={(e) => handleHomeInfoChange('aboutText1', e.target.value)}
                      placeholder="Ex: A Barbearia Rodrigues é referência em cortes masculinos há mais de 10 anos."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Parágrafo 2</label>
                    <textarea
                      value={homeInfo.aboutText2}
                      onChange={(e) => handleHomeInfoChange('aboutText2', e.target.value)}
                      placeholder="Ex: Combinamos técnicas tradicionais com tendências modernas..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Parágrafo 3</label>
                    <textarea
                      value={homeInfo.aboutText3}
                      onChange={(e) => handleHomeInfoChange('aboutText3', e.target.value)}
                      placeholder="Ex: Nosso ambiente proporciona conforto e uma experiência única."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                <div className="form-section" style={{ marginTop: '2rem' }}>
                  <h3 className="section-subtitle">🕐 Horário de Funcionamento</h3>

                  <Input
                    label="Título da Seção"
                    value={homeInfo.scheduleTitle}
                    onChange={(e) => handleHomeInfoChange('scheduleTitle', e.target.value)}
                    placeholder="Ex: Horário de Funcionamento"
                  />

                  <Input
                    label="Linha 1"
                    value={homeInfo.scheduleLine1}
                    onChange={(e) => handleHomeInfoChange('scheduleLine1', e.target.value)}
                    placeholder="Ex: Seg - 14h as 20h"
                  />

                  <Input
                    label="Linha 2"
                    value={homeInfo.scheduleLine2}
                    onChange={(e) => handleHomeInfoChange('scheduleLine2', e.target.value)}
                    placeholder="Ex: Terça a Sab. - 09h as 20h"
                  />

                  <Input
                    label="Linha 3"
                    value={homeInfo.scheduleLine3}
                    onChange={(e) => handleHomeInfoChange('scheduleLine3', e.target.value)}
                    placeholder="Ex: Domingo: Fechado"
                  />

                  <div
                    style={{
                      marginTop: '1.2rem',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 182, 39, 0.2)',
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
                      <h4
                        style={{
                          margin: 0,
                          color: '#ffb627',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                        }}
                      >
                        📞 Contato WhatsApp
                      </h4>
                    </div>

                    <div
                      style={{
                        height: '2px',
                        width: '100%',
                        background: 'linear-gradient(90deg, #ffb627 0%, rgba(255, 182, 39, 0.35) 100%)',
                        borderRadius: '999px',
                        marginBottom: '1.2rem',
                      }}
                    />

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Número do WhatsApp (com DDD)</label>
                      <input
                        type="text"
                        value={homeInfo.whatsappNumber}
                        onChange={(e) =>
                          handleHomeInfoChange(
                            'whatsappNumber',
                            formatWhatsAppNumber(e.target.value),
                          )
                        }
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="Ex: 85991173279"
                        style={{
                          width: '100%',
                          padding: '0.9rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid #1f1f1f',
                          background: '#0e0e0e',
                          color: '#f5f5f5',
                          fontSize: '1rem',
                        }}
                      />
                      <p
                        style={{
                          marginTop: '0.65rem',
                          marginBottom: 0,
                          color: '#9ca3af',
                          fontSize: '0.86rem',
                        }}
                      >
                        Use apenas números ou formato com DDD. Será usado no link "fale conosco".
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-section" style={{ marginTop: '2rem' }}>
                  <h3 className="section-subtitle">📍 Localização</h3>

                  <Input
                    label="Título da Seção"
                    value={homeInfo.locationTitle}
                    onChange={(e) => handleHomeInfoChange('locationTitle', e.target.value)}
                    placeholder="Ex: Localização"
                  />

                  <Input
                    label="Endereço"
                    value={homeInfo.locationAddress}
                    onChange={(e) => handleHomeInfoChange('locationAddress', e.target.value)}
                    placeholder="Ex: Av. val paraíso,1396"
                  />

                  <Input
                    label="Cidade/Bairro"
                    value={homeInfo.locationCity}
                    onChange={(e) => handleHomeInfoChange('locationCity', e.target.value)}
                    placeholder="Ex: Jangurussu - Fortaleza/CE"
                  />
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                  <Button type="submit" disabled={homeInfoLoading} className="btn-admin-save">
                    {homeInfoLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="manage-barbers">
              <div className="manage-barbers-header">
                <h2>Gerenciar Funcionários</h2>
                <div className="filter-actions-container">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="category-filter-select"
                  >
                    <option value="all">📋 Todas as Categorias</option>
                    <option value="barber">✂️ Barbeiros</option>
                    <option value="receptionist">📋 Recepcionistas</option>
                    <option value="admin">👑 Administradores</option>
                  </select>
                  {isAdmin && (
                    <button onClick={() => openBarberModal()} className="btn-add-barber">
                      Adicionar Funcionário
                    </button>
                  )}
                </div>
              </div>

              <div className="barbers-table-container">
                {getFilteredEmployees().length === 0 ? (
                  <p className="no-data">Nenhum funcionário encontrado nesta categoria.</p>
                ) : (
                  getFilteredEmployees().map((employee) => {
                    const barberData =
                      employee.role === 'barber'
                        ? barbers.find((b) => b.userId === employee.id)
                        : null;
                    const barberAppointments = barberData
                      ? getAppointmentsByBarber(barberData.id)
                      : [];
                    const isExpanded = barberData && expandedBarbers[barberData.id];
                    const stats = barberData
                      ? calculateBarberStatsbyBarber(barberData.id)
                      : {
                        appointmentsCount: 0,
                        totalRevenue: 0,
                        commissionPercent: 0,
                        barberEarnings: 0,
                        shopEarnings: 0,
                      };

                    return (
                      <div key={employee.id} className="fluig-table-parent">
                        <div
                          className="fluig-row-parent"
                          onClick={() => (barberData ? toggleBarberExpansion(barberData.id) : null)}
                          style={{ cursor: barberData ? 'pointer' : 'default' }}
                        >
                          {barberData && (
                            <div className="fluig-expand-icon">{isExpanded ? '▼' : '▶'}</div>
                          )}

                          <div className="fluig-barber-info">
                            {barberData?.photo ? (
                              <img
                                src={barberData.photo}
                                alt={employee.name}
                                className="fluig-barber-photo"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}

                            <div
                              className="fluig-barber-photo-fallback"
                              style={{
                                display: barberData?.photo ? 'none' : 'flex',
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#2a2a2a',
                                border: '1px solid #d4af37',
                                fontSize: '1.2rem',
                              }}
                            >
                              👤
                            </div>
                            <div className="fluig-barber-details">
                              <h3 className="fluig-barber-name">{employee.name}</h3>
                              <p className="fluig-barber-specialty">
                                {barberData?.specialty ||
                                  (employee.role === 'admin'
                                    ? 'Administrador'
                                    : employee.role === 'receptionist'
                                      ? 'Recepcionista'
                                      : 'Barbeiro')}
                              </p>
                              <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>
                                ✓ Conta de acesso criada
                              </span>
                            </div>
                          </div>

                          {barberData && (
                            <div className="fluig-barber-stats">
                              <div className="stat-item">
                                <span className="stat-label">Atendimentos</span>
                                <span className="stat-value">{stats.appointmentsCount}</span>
                              </div>
                            </div>
                          )}

                          {isAdmin && (
                            <div className="fluig-parent-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPermissionsModal(employee);
                                }}
                                className="fluig-btn fluig-btn-permissions"
                              >
                                🔐 Permissões
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (barberData) {
                                    openBarberModal(null, barberData);
                                  } else {
                                    openBarberModal(employee, null);
                                  }
                                }}
                                className="fluig-btn fluig-btn-edit"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (barberData) {
                                    handleDeleteBarber(barberData.id, false);
                                  } else {
                                    handleDeleteBarber(employee.id, true);
                                  }
                                }}
                                className="fluig-btn fluig-btn-delete"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>

                        {isExpanded && barberData && (
                          <div className="fluig-children-container">
                            {barberAppointments.length === 0 ? (
                              <p className="no-appointments">
                                Nenhum agendamento para este funcionário.
                              </p>
                            ) : (
                              <table className="fluig-table-children">
                                <thead>
                                  <tr>
                                    <th>Status</th>
                                    <th>Cliente</th>
                                    <th>Para</th>
                                    <th>Data</th>
                                    <th>Horário</th>
                                    <th>Serviços</th>
                                    <th>Total</th>
                                    <th>Obs.</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {barberAppointments.map((apt) => {
                                    const aptTotal = calculateTotal(apt.services);
                                    return (
                                      <tr
                                        key={apt.id}
                                        className={
                                          apt.status === 'confirmed' ? 'row-confirmed' : ''
                                        }
                                      >
                                        <td>
                                          {apt.status === 'confirmed' ? (
                                            <span className="status-badge status-confirmed">
                                              Confirmado
                                            </span>
                                          ) : (
                                            <span className="status-badge status-pending">
                                              Pendente
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <strong>{apt.client.name}</strong>
                                        </td>
                                        <td>
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
                                                padding: '2px 9px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                              }}
                                            >
                                              👤 {apt.dependentName}
                                            </span>
                                          ) : (
                                            <span style={{ color: '#555' }}>—</span>
                                          )}
                                        </td>
                                        <td>{new Date(apt.startAt).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                          {new Date(apt.startAt).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            // timeZone: 'UTC'
                                          })}
                                        </td>
                                        <td>
                                          <div className="services-list">
                                            {apt.services.map((service, idx) => (
                                              <span key={idx} className="service-pill">
                                                {service.serviceName}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="total-price">R$ {aptTotal.toFixed(2)}</td>
                                        <td>
                                          {apt.notes ? (
                                            <div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedObsId(
                                                    expandedObsId === apt.id ? null : apt.id,
                                                  );
                                                }}
                                                className="obs-btn"
                                              >
                                                📝 Ver
                                              </button>
                                              {expandedObsId === apt.id && (
                                                <div className="obs-card">
                                                  <div className="obs-card-label">Observação</div>
                                                  <div className="obs-card-text">{apt.notes}</div>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="obs-empty">—</span>
                                          )}
                                        </td>
                                        <td>
                                          <div className="fluig-actions-buttons">
                                            {apt.status !== 'confirmed' && (
                                              <button
                                                onClick={() => handleConfirmAppointment(apt.id)}
                                                className="action-btn btn-confirm"
                                              >
                                                Confirmar
                                              </button>
                                            )}
                                            <button
                                              onClick={() => openEditModal(apt)}
                                              className="action-btn btn-edit-apt"
                                            >
                                              Editar
                                            </button>
                                            {apt.status !== 'confirmed' && (
                                              <button
                                                onClick={() => openChangeBarberModal(apt)}
                                                className="action-btn btn-transfer"
                                              >
                                                Transferir
                                              </button>
                                            )}
                                            {/* <button onClick={() => sendWhatsApp(apt.id, 'confirm')} className="action-btn btn-whatsapp">
                                              WhatsApp
                                            </button> */}
                                            <button
                                              onClick={() => handleDeleteAppointment(apt.id)}
                                              className="action-btn btn-cancel"
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
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'payroll' && isAdmin && hasPermission('managePayroll') && (
            <div className="manage-barbers">
              <div className="manage-barbers-header">
                <h2>Pagamentos de Funcionários</h2>
                <div className="payroll-header-controls">
                  <div className="payroll-period-buttons">
                    {['semanal', 'quinzenal', 'mensal'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPayrollPeriodFilter(p)}
                        className={`payroll-period-btn${payrollPeriodFilter === p ? ' payroll-period-btn--active' : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <input
                    type="month"
                    value={payrollMonthFilter}
                    onChange={(e) => setPayrollMonthFilter(e.target.value)}
                    className="payroll-month-input"
                  />
                  <button onClick={() => setShowValeModal(true)} className="payroll-vale-btn">
                    Registrar Vale
                  </button>
                </div>
              </div>

              <div className="payroll-table-wrapper">
                <table className="payroll-main-table">
                  <thead>
                    <tr className="payroll-thead-row">
                      <th className="payroll-th">Funcionário</th>
                      <th className="payroll-th">Frequência</th>
                      <th className="payroll-th payroll-th--right">Salário Fixo</th>
                      <th className="payroll-th payroll-th--right">Comissão</th>
                      <th className="payroll-th payroll-th--right">Pagamentos Extras</th>
                      <th className="payroll-th payroll-th--right">Vales</th>
                      <th className="payroll-th payroll-th--right">Líquido</th>
                      <th className="payroll-th payroll-th--center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(
                        (emp) =>
                          emp.role === 'barber' ||
                          emp.role === 'receptionist' ||
                          emp.role === 'admin',
                      )
                      .map((emp) => {
                        const barberData = barbers.find((b) => String(b.userId) === String(emp.id));
                        const { start, end } = getPayrollPeriodDates(
                          payrollPeriodFilter,
                          payrollMonthFilter,
                        );
                        const commission = barberData
                          ? getBarberCommissionInPeriod(barberData.id, start, end)
                          : 0;
                        const vales = getValesInPeriod(emp.id, start, end);
                        const totalVales = vales.reduce((s, v) => s + v.valor, 0);
                        const totalExtraPayments = getExtraPaymentsInPeriod(emp.id, start, end)
                          .reduce((sum, payment) => sum + Number(payment.liquido || 0), 0);

                        const salarioFixo =
                          parseFloat(barberData?.salarioFixo ?? emp.salarioFixo ?? 0) || 0;
                        const liquido = salarioFixo + commission + totalExtraPayments - totalVales;
                        const isExp = payrollExpandedId === emp.id;

                        const alreadyPaid = !!checkAlreadyPaidInPeriod(
                          emp.id,
                          payrollPeriodFilter,
                          payrollMonthFilter,
                        );

                        return (
                          <React.Fragment key={emp.id}>
                            <tr className={`payroll-row${isExp ? ' payroll-row--expanded' : ''}`}>
                              <td className="payroll-td">
                                <div className="payroll-employee-cell">
                                  {barberData?.photo || emp.photo ? (
                                    <img
                                      src={barberData?.photo || emp.photo}
                                      alt={emp.name}
                                      className="payroll-employee-photo"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className="payroll-employee-photo"
                                    style={{
                                      display: barberData?.photo || emp.photo ? 'none' : 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: '#2a2a2a',
                                      border: '1px solid #d4af37',
                                      color: '#d4af37',
                                      fontWeight: 700,
                                      fontSize: '0.95rem',
                                    }}
                                  >
                                    {String(emp.name || '?').trim().charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="payroll-employee-name">{emp.name}</div>
                                    <div className="payroll-employee-role">{emp.role}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="payroll-td">
                                <span className="payroll-frequency-badge">
                                  {barberData?.paymentFrequency || 'mensal'}
                                </span>
                              </td>

                              <td className="payroll-td payroll-td--right payroll-value--green">
                                R$ {salarioFixo.toFixed(2)}
                              </td>

                              <td className="payroll-td payroll-td--right payroll-value--blue">
                                R$ {commission.toFixed(2)}
                              </td>

                              <td className="payroll-td payroll-td--right payroll-value--green">
                                R$ {totalExtraPayments.toFixed(2)}
                              </td>

                              <td className="payroll-td payroll-td--right">
                                <div className="payroll-vales-cell">
                                  <span className="payroll-value--red">
                                    - R$ {totalVales.toFixed(2)}
                                  </span>
                                  {vales.length > 0 && (
                                    <button
                                      onClick={() => setPayrollExpandedId(isExp ? null : emp.id)}
                                      className="payroll-vales-toggle"
                                    >
                                      {isExp ? '▲' : `${vales.length}x`}
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="payroll-td payroll-td--right">
                                <span
                                  className={`payroll-liquido${liquido >= 0 ? ' payroll-liquido--positive' : ' payroll-liquido--negative'}`}
                                >
                                  R$ {liquido.toFixed(2)}
                                </span>
                              </td>

                              <td className="payroll-td payroll-td--center">
                                {alreadyPaid ? (
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <span className="payroll-paid-badge">✅ Pago</span>
                                    <button
                                      onClick={() =>
                                        handleMarkPayrollPaid(emp, barberData, payrollPeriodFilter)
                                      }
                                      className="payroll-repay-btn"
                                    >
                                      Pagar novamente
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleMarkPayrollPaid(emp, barberData, payrollPeriodFilter)
                                    }
                                    className="payroll-pay-btn"
                                  >
                                    Pagar
                                  </button>
                                )}
                              </td>
                            </tr>

                            {isExp && (
                              <tr className="payroll-row-expanded-detail">
                                <td colSpan={8} className="payroll-td-vales-detail">
                                  <div className="payroll-vales-header">
                                    Vales do período: {start} → {end}
                                  </div>
                                  {vales.map((v) => (
                                    <div key={v.id} className="payroll-vale-item">
                                      <span className="payroll-vale-valor">
                                        - R$ {parseFloat(v.valor).toFixed(2)}
                                      </span>
                                      <span className="payroll-vale-data">
                                        {v.data?.split('-').reverse().join('/')}
                                      </span>
                                      <span className="payroll-vale-obs">{v.observacao}</span>
                                      <button
                                        onClick={() => handleDeleteVale(v.id)}
                                        className="payroll-vale-delete"
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="payroll-history-section">
                <h3 className="payroll-history-title">Pagamentos Realizados</h3>
                {employeePayments.filter((p) => {
                  if (!payrollMonthFilter) return true;
                  const [y, m] = payrollMonthFilter.split('-').map(Number);
                  const d = new Date(p.paidAt);
                  return d.getFullYear() === y && d.getMonth() + 1 === m;
                }).length === 0 ? (
                  <p className="no-data">Nenhum pagamento registrado neste período.</p>
                ) : (
                  <div className="payroll-table-wrapper">
                    <table className="payroll-history-table">
                      <thead>
                        <tr className="payroll-thead-row">
                          <th className="payroll-th">Funcionário</th>
                          <th className="payroll-th payroll-th--center">Período</th>
                          <th className="payroll-th payroll-th--center">De → Até</th>
                          <th className="payroll-th payroll-th--right">Salário</th>
                          <th className="payroll-th payroll-th--right">Comissão</th>
                          <th className="payroll-th payroll-th--right">Vales</th>
                          <th className="payroll-th payroll-th--right">Líquido Pago</th>
                          <th className="payroll-th payroll-th--center">Data Pgto.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...employeePayments]
                          .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
                          .filter((p) => {
                            if (!payrollMonthFilter) return true;
                            const [y, m] = payrollMonthFilter.split('-').map(Number);
                            const d = new Date(p.paidAt);
                            return d.getFullYear() === y && d.getMonth() + 1 === m;
                          })
                          .map((p) => (
                            <tr key={p.id} className="payroll-history-row">
                              <td className="payroll-td payroll-td--name">{p.employeeName}</td>
                              <td className="payroll-td payroll-td--center">
                                <span className="payroll-frequency-badge">{p.period}</span>
                              </td>
                              <td className="payroll-td payroll-td--center payroll-td--muted">
                                {p.periodStart?.split('-').reverse().join('/')} →{' '}
                                {p.periodEnd?.split('-').reverse().join('/')}
                              </td>
                              <td className="payroll-td payroll-td--right payroll-value--green">
                                R$ {parseFloat(p.salarioFixo || 0).toFixed(2)}
                              </td>
                              <td className="payroll-td payroll-td--right payroll-value--blue">
                                R$ {parseFloat(p.commission || 0).toFixed(2)}
                              </td>
                              <td className="payroll-td payroll-td--right payroll-value--red">
                                - R$ {parseFloat(p.totalVales || 0).toFixed(2)}
                              </td>
                              <td className="payroll-td payroll-td--right">
                                <span
                                  className={`payroll-liquido${parseFloat(p.liquido) >= 0 ? ' payroll-liquido--positive' : ' payroll-liquido--negative'}`}
                                >
                                  R$ {parseFloat(p.liquido || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="payroll-td payroll-td--center payroll-td--muted">
                                {new Date(p.paidAt).toLocaleDateString('pt-BR')}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'extraPayments' && isAdmin && hasPermission('managePayroll') && (
            <div className="manage-barbers">
              <div className="manage-barbers-header">
                <h2>Pagamentos Extras</h2>
              </div>

              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Registrar pagamento extra</h3>
                <form onSubmit={handleSaveExtraPayment} style={{ display: 'grid', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <label className="form-label">Funcionário</label>
                      <select
                        value={extraPaymentForm.employeeId}
                        onChange={(e) => handleExtraPaymentFormChange('employeeId', e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Selecione...</option>
                        {employees
                          .filter(
                            (emp) =>
                              emp.role === 'barber' ||
                              emp.role === 'receptionist' ||
                              emp.role === 'admin',
                          )
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.role})
                            </option>
                          ))}
                      </select>
                    </div>

                    <Input
                      label="Valor (R$)"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={extraPaymentForm.amount}
                      onChange={(e) => handleExtraPaymentFormChange('amount', e.target.value)}
                      placeholder="0,00"
                      required
                    />

                    <Input
                      label="Data do pagamento"
                      type="date"
                      value={extraPaymentForm.date}
                      onChange={(e) => handleExtraPaymentFormChange('date', e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      className="payroll-pay-btn"
                      disabled={extraPaymentLoading}
                      style={{ minWidth: '220px' }}
                    >
                      {extraPaymentLoading ? 'Registrando...' : 'Registrar pagamento extra'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="payroll-history-section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <h3 className="payroll-history-title" style={{ margin: 0 }}>
                    Histórico de pagamentos extras
                  </h3>
                  <input
                    type="month"
                    value={extraPaymentMonthFilter}
                    onChange={(e) => setExtraPaymentMonthFilter(e.target.value)}
                    className="payroll-month-input"
                  />
                </div>

                {getFilteredExtraPayments().length === 0 ? (
                  <p className="no-data">
                    Nenhum pagamento extra encontrado para o período selecionado.
                  </p>
                ) : (
                  <div className="payroll-table-wrapper">
                    <table className="payroll-history-table">
                      <thead>
                        <tr className="payroll-thead-row">
                          <th className="payroll-th">Funcionário</th>
                          <th className="payroll-th payroll-th--right">Valor</th>
                          <th className="payroll-th payroll-th--center">Data do pagamento</th>
                          <th className="payroll-th payroll-th--center">Registrado por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredExtraPayments().map((payment) => (
                          <tr key={payment.id} className="payroll-history-row">
                            <td className="payroll-td payroll-td--name">{payment.employeeName}</td>
                            <td className="payroll-td payroll-td--right payroll-value--green">
                              R$ {Number(payment.liquido || 0).toFixed(2)}
                            </td>
                            <td className="payroll-td payroll-td--center payroll-td--muted">
                              {payment.paidAt
                                ? new Date(payment.paidAt).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="payroll-td payroll-td--center payroll-td--muted">
                              {payment.paidByName || 'Admin'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}



          {canManageAgendamentos && activeTab === 'agendamentos' && (
            <div className="manage-barbers">
              <div className="manage-barbers-header">
                <h2>Agendamentos</h2>
                {(isAdmin || hasPermission('manageOffScheduleAppointments')) && (
                  <button onClick={openOffScheduleModal} className="btn-add-barber">
                    Registrar fora do horário
                  </button>
                )}
              </div>

              {/* FILTROS (originais do AdminPage) */}
              <div className="agendamentos-filter-container">
                <div className="agendamentos-filter-header">
                  <div>
                    <h3 className="agendamentos-filter-title">
                      <span className="agendamentos-filter-title-icon">📅</span>
                      Filtrar Agendamentos
                    </h3>
                    <p className="agendamentos-filter-subtitle">Selecione o período desejado</p>
                  </div>
                  {selectedMonth && (
                    <div className="agendamentos-results-badge">
                      {filteredAppointmentsAdmin.length} resultado(s)
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label htmlFor="agendamentos-month-select" className="agendamentos-filter-label">
                    Período
                  </label>
                  <select
                    id="agendamentos-month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="agendamentos-month-select"
                  >
                    {generateMonthOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filters-container">
                <div className="filter-group">
                  <label>Data Específica:</label>
                  <input
                    type="date"
                    value={appointmentDateFilter}
                    onChange={(e) => {
                      setAppointmentDateFilter(e.target.value);
                      if (e.target.value) {
                        setAppointmentStartDate('');
                        setAppointmentEndDate('');
                      }
                    }}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>De:</label>
                  <input
                    type="date"
                    value={appointmentStartDate}
                    onChange={(e) => {
                      setAppointmentStartDate(e.target.value);
                      if (e.target.value) setAppointmentDateFilter('');
                    }}
                    className="filter-input"
                    disabled={!!appointmentDateFilter}
                  />
                </div>

                <div className="filter-group">
                  <label>Até:</label>
                  <input
                    type="date"
                    value={appointmentEndDate}
                    onChange={(e) => {
                      setAppointmentEndDate(e.target.value);
                      if (e.target.value) setAppointmentDateFilter('');
                    }}
                    className="filter-input"
                    disabled={!!appointmentDateFilter}
                  />
                </div>

                {(isAdmin || isReceptionist) && (
                  <div className="filter-group">
                    <label>Barbeiro:</label>
                    <select
                      value={selectedBarberFilter}
                      onChange={(e) => setSelectedBarberFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">Todos os Barbeiros</option>
                      {barbers.map((barber) => (
                        <option key={barber.id} value={barber.id}>
                          {barber.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(appointmentDateFilter || appointmentStartDate || appointmentEndDate || selectedBarberFilter !== 'all') && (
                  <div className="filter-group">
                    <button onClick={clearAppointmentFilters} className="clear-filters-btn">
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>

              {/* TABELA (copiada da BarberPage) */}
              <div className="barber-appointments-section">
                {filteredAppointmentsAdmin.length === 0 ? (
                  <p className="calendar-empty">
                    Nenhum agendamento encontrado para o período selecionado.
                  </p>
                ) : (
                  <div className="fluig-table-parent" style={{ marginTop: '1.5rem' }}>
                    <div className="agendamentos-table-scroll">
                    <table className="fluig-table-children">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Barbeiro</th>
                          <th>Para</th>
                          <th>Data</th>
                          <th>Horário</th>
                          <th>Serviços</th>
                          <th>Telefone</th>
                          <th>Pagamento</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointmentsAdmin.map((apt) => {
                          const appointmentDate = getAppointmentStartDate(apt);
                          const canComplete = canCompleteAppointment(apt);
                          const isPast = canComplete;
                          const isCompleted = apt.status === 'completed';
                          const isConfirmed = apt.status === 'confirmed';

                          // Formatação da data e hora
                          const formattedDate = appointmentDate
                            ? appointmentDate.toLocaleDateString('pt-BR')
                            : 'Data não informada';
                          const formattedTime = appointmentDate
                            ? appointmentDate.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              // timeZone: 'UTC',
                            })
                            : 'Horário não informado';

                          // Nome do cliente (pode estar em apt.client.name ou apt.clientName)
                          const clientName = apt.client?.name || apt.clientName || 'Cliente';
                          const barberName =
                            apt.barber?.displayName || apt.barberName || 'Sem barbeiro';
                          const dependentLabel = apt.dependent?.name || apt.dependentName || '';

                          // Telefone do cliente
                          const clientPhone = apt.client?.phone || apt.clientPhone || '-';
                          const paymentLabel = getAppointmentPaymentMethodLabel(apt.id);

                          // Lista de serviços (cada serviço pode ter serviceName ou name)
                          const serviceNames = Array.isArray(apt.services)
                            ? apt.services.map(s => s.serviceName || s.name).filter(Boolean)
                            : [];

                          return (
                            <tr key={apt.id} className={`${isCompleted ? 'row-completed' : ''} ${isPast && !isCompleted ? 'row-past' : ''} ${isConfirmed ? 'row-confirmed' : ''}`}>
                              <td><strong>{clientName}</strong></td>
                              <td>{barberName}</td>
                              <td>
                                {dependentLabel ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(255,122,26,0.12)',
                                      color: '#ff7a1a',
                                      border: '1px solid rgba(255,122,26,0.35)',
                                      borderRadius: '20px',
                                      padding: '2px 9px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    👤 {dependentLabel}
                                  </span>
                                ) : (
                                  <span style={{ color: '#ddd', fontWeight: 600 }}>{clientName}</span>
                                )}
                              </td>
                              <td>{formattedDate}</td>
                              <td><span className="appointment-time">{formattedTime}</span></td>
                              <td>
                                <div className="services-list-compact">
                                  {serviceNames.length > 0 ? (
                                    serviceNames.map((name, idx) => (
                                      <div key={idx} className="service-item-compact">{name}</div>
                                    ))
                                  ) : (
                                    <span className="no-services">—</span>
                                  )}
                                </div>
                              </td>
                              <td><span className="client-phone">{clientPhone}</span></td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderRadius: '20px',
                                    padding: '2px 9px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color:
                                      paymentLabel === 'Pagamento local'
                                        ? '#e5b84a'
                                        : paymentLabel === 'Online via PIX'
                                          ? '#2ecc71'
                                          : paymentLabel === 'Online via cartão'
                                            ? '#4ea1ff'
                                            : paymentLabel === 'Plano'
                                              ? '#d4af37'
                                              : '#888',
                                    border: '1px solid currentColor',
                                    background: 'rgba(255,255,255,0.03)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {paymentLabel}
                                </span>
                              </td>
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
                                      <button onClick={() => sendWhatsApp(apt.id, 'confirm')} className="action-btn-table btn-whatsapp-table">
                                        💬 Mensagem
                                      </button>
                                      <button onClick={() => handleDeleteAppointment(apt.id)} className="action-btn-table btn-cancel-table">
                                        Cancelar
                                      </button>
                                      {isConfirmed && canComplete && (
                                        <button onClick={() => handleCompleteAppointment(apt.id)} className="action-btn-table btn-complete-table">
                                          ✅ Concluir
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
                  </div>
                )}
              </div>
            </div>
          )}




          {activeTab === 'products' && hasPermission('manageProducts') && (
            <div className="products-section">
              <div className="manage-barbers-header">
                <h2>Gerenciar Produtos</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {hasPermission('addProducts') && (
                    <>
                      <input
                        ref={productsImportInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleImportProductsExcel}
                      />
                      <button
                        onClick={() => productsImportInputRef.current?.click()}
                        className="btn-add-barber"
                        disabled={importingProducts}
                      >
                        {importingProducts ? 'Importando...' : 'Importar Produtos (Excel)'}
                      </button>
                    </>
                  )}
                  {hasPermission('addProducts') && (
                    <button onClick={() => openProductModal()} className="btn-add-barber">
                      Adicionar Produto
                    </button>
                  )}
                </div>
              </div>

              <div className="products-grid">
                {products.map((product) => {
                  const productImageUrl = String(
                    product.imageUrl || product.image || product.image_url || '',
                  ).trim();

                  return (
                    <div
                      key={product.id}
                      style={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        opacity: product.active === false ? 0.6 : 1,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: productImageUrl ? 'auto' : '238px',
                      }}
                    >
                      {product.active === false && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: '#ff4444',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            zIndex: 1,
                          }}
                        >
                          Desativado
                        </div>
                      )}
                      {productImageUrl && (
                        <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
                          <img
                            src={productImageUrl}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              filter: product.active === false ? 'grayscale(100%)' : 'none',
                            }}
                          />
                        </div>
                      )}
                      <div
                        style={{
                          padding: productImageUrl ? '20px' : '16px 20px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                        }}
                      >
                        <h3
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '1.25rem',
                            color: '#fff',
                          }}
                        >
                          {product.name}
                        </h3>
                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '0.9rem',
                            color: '#999',
                          }}
                        >
                          {product.category}
                        </p>
                        <p
                          style={{
                            margin: '0 0 8px 0',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: '#ff7a1a',
                          }}
                        >
                          {product.price}
                        </p>
                        <p
                          style={{
                            margin: '0 0 16px 0',
                            fontSize: '0.9rem',
                            color: '#999',
                          }}
                        >
                          Estoque: {product.stock}
                        </p>
                        <div style={{ flex: 1 }} />
                        {hasPermission('editProducts') && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                              onClick={() => openProductModal(product)}
                              size="small"
                              className="fluig-btn fluig-btn-edit"
                            >
                              Editar
                            </Button>
                            <Button
                              onClick={() => handleDeleteProduct(product)}
                              size="small"
                              className="fluig-btn fluig-btn-delete"
                            >
                              {product.active !== false ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'services' && hasPermission('manageServices') && (
            <div className="services-section">
              <div className="manage-barbers-header">
                <h2>Gerenciar Serviços</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {hasPermission('addServices') && (
                    <>
                      <input
                        ref={servicesImportInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleImportServicesExcel}
                      />
                      <button
                        onClick={() => servicesImportInputRef.current?.click()}
                        className="btn-add-barber"
                        disabled={importingServices}
                      >
                        {importingServices ? 'Importando...' : 'Importar Serviços (Excel)'}
                      </button>
                    </>
                  )}
                  {hasPermission('addServices') && (
                    <button onClick={() => openServiceModal()} className="btn-add-barber">
                      Adicionar Serviço
                    </button>
                  )}
                </div>
              </div>

              <div
                className="services-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px',
                  marginTop: '24px',
                }}
              >
                {services.map((service) => (
                  <div
                    key={service.id}
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      opacity: service.active === false ? 0.6 : 1,
                      position: 'relative',
                    }}
                  >
                    {service.active === false && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#ff4444',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          zIndex: 1,
                        }}
                      >
                        Desativado
                      </div>
                    )}
                    {service.image && (
                      <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
                        <img
                          src={service.image}
                          alt={service.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: service.active === false ? 'grayscale(100%)' : 'none',
                          }}
                          onError={(e) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1596728325488-58c87691e9af';
                          }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '20px' }}>
                      <h3
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '1.25rem',
                          color: '#fff',
                        }}
                      >
                        {service.name}
                      </h3>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#ff7a1a',
                        }}
                      >
                        {service.price}
                      </p>
                      <p
                        style={{
                          margin: '0 0 16px 0',
                          fontSize: '0.9rem',
                          color: '#999',
                        }}
                      >
                        Duração: {service.durationMinutes} minutos
                      </p>
                      {hasPermission('editServices') && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            onClick={() => openServiceModal(service)}
                            size="small"
                            className="fluig-btn fluig-btn-edit"
                          >
                            Editar
                          </Button>
                          <Button
                            onClick={() => handleDeleteService(service)}
                            size="small"
                            className="fluig-btn fluig-btn-delete"
                          >
                            {service.active !== false ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {services.length === 0 && <p className="no-data">Nenhum serviço cadastrado.</p>}
            </div>
          )}

          {activeTab === 'benefits' && hasPermission('manageBenefits') && (
            <div className="benefits-section">
              <div className="manage-barbers-header">
                <h2>Gerenciar Benefícios dos Planos</h2>
                {isAdmin && (
                  <button onClick={() => openPlanModal()} className="btn-add-barber">
                    Novo Plano
                  </button>
                )}
              </div>

              {plansLoading ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#d4af37',
                    fontSize: '1.1rem',
                  }}
                >
                  <p>Carregando planos...</p>
                </div>
              ) : plans.length === 0 ? (
                <p className="no-data">Nenhum plano cadastrado.</p>
              ) : (
                <div className="plans-benefits-grid">
                  {plans.map((plan) => (
                    <div key={plan.id} className="plan-benefits-card">
                      <div className="plan-benefits-header" style={{ borderColor: plan.color }}>
                        <h3>{plan.name}</h3>
                        <span className="plan-price">R$ {plan.price.toFixed(2)}/mês</span>
                      </div>
                      <div style={{ padding: '0 1rem', marginTop: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.4px',
                            color: plan.active ? '#22c55e' : '#f59e0b'
                          }}
                        >
                          {plan.active ? 'ATIVO' : 'DESATIVADO'}
                        </span>
                      </div>
                      {isAdmin && (
                        <div style={{ padding: '0.35rem 1rem 0.75rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => openPlanModal(plan)}
                            className="fluig-btn fluig-btn-edit"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            Editar nome e preço
                          </button>
                          <button
                            onClick={() => handleTogglePlanActive(plan)}
                            className="fluig-btn"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              background: plan.active ? '#f59e0b22' : '#22c55e22',
                              color: plan.active ? '#f59e0b' : '#22c55e',
                              border: `1px solid ${plan.active ? '#f59e0b66' : '#22c55e66'}`
                            }}
                          >
                            {plan.active ? 'Desativar plano' : 'Ativar plano'}
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan)}
                            className="fluig-btn fluig-btn-delete"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            Excluir plano
                          </button>
                        </div>
                      )}
                      <div className="benefits-list">
                        {plan.features && plan.features.length > 0 ? (
                          plan.features.map((benefit, idx) => (

                            <div key={idx} className="benefit-item">
                              <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', display: 'inline-block' }}>
                                <span className="benefit-icon">✓</span>{' '}
                                {formatBenefitLabel(benefit)}
                              </div>
                              {/* whiteSpace: 'normal !important', wordBreak: 'break-word', */}
                              {isAdmin && (
                                <div className="benefit-actions">
                                  <button
                                    onClick={() => openBenefitModal(plan.id, benefit, idx)}
                                    className="fluig-btn fluig-btn-edit"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBenefit(plan.id, idx)}
                                    className="fluig-btn fluig-btn-delete"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="no-data">Nenhum benefício cadastrado.</p>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => openBenefitModal(plan.id)}
                          className="btn-add-benefit"
                          style={{ backgroundColor: plan.color }}
                        >
                          Adicionar Benefício
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* {activeTab === 'settings' && hasPermission('manageSettings') && (
            <div className="settings-section">
              <div className="settings-container">
                <div className="settings-card">
                  <h2>Configurações da Barbearia</h2>
                  {!isAdmin && (
                    <p style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      Apenas administradores podem alterar as configurações
                    </p>
                  )}

                  <div className="pix-key-section">
                    <h3>Chave PIX</h3>
                    <p className="settings-description">
                      Configure sua chave PIX para receber pagamentos. Aceita CPF, CNPJ, Email, Telefone ou Chave Aleatória.
                    </p>

                    <Input
                      label="Chave PIX"
                      value={pixKey}
                      onChange={(e) => handlePixKeyChange(e.target.value)}
                      placeholder="Digite sua chave PIX"
                      disabled={!isAdmin}
                    />

                    {pixKeyValidation.message && (
                      <p className={`validation-message ${pixKeyValidation.isValid ? 'valid' : 'invalid'}`}>
                        {pixKeyValidation.message} {pixKeyValidation.type && ` (${pixKeyValidation.type})`}
                      </p>
                    )}

                    {pixKeySaved && (
                      <div className="pix-key-preview">
                        <p style={{ color: 'var(--green)', fontSize: '0.9rem', margin: '8px 0' }}>
                          Chave PIX atual: <strong>{pixKeySaved}</strong>
                        </p>
                      </div>
                    )}

                    {isAdmin && (
                      <Button onClick={handleSavePixKey} className="btn-admin-save">
                        Salvar Chave PIX
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {activeTab === 'terms' && hasPermission('manageSettings') && (
            <div className="settings-section">
              <div className="settings-container">
                <div className="settings-card">
                  <h2>Termos e Documentos</h2>
                  <p className="settings-description">
                    Faça upload do documento de termos de contratação que será exibido no modal de
                    pagamento.
                  </p>

                  {!isAdmin && (
                    <p style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      Apenas administradores podem alterar os documentos de termos.
                    </p>
                  )}

                  <div className="terms-upload-container" style={{ marginTop: '20px' }}>
                    {!termsDocUrl ? (
                      <div className="upload-area">
                        <label htmlFor="terms-upload" className="upload-label">
                          <div className="upload-icon">📄</div>
                          <p>Clique para fazer upload do documento de termos (PDF)</p>
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            Tamanho máximo: 5MB
                          </span>
                        </label>
                        <input
                          id="terms-upload"
                          type="file"
                          accept=".pdf"
                          onChange={handleTermsDocUpload}
                          style={{ display: 'none' }}
                          disabled={!isAdmin}
                        />
                      </div>
                    ) : (
                      <div className="uploaded-doc-preview">
                        <div className="doc-info">
                          <span className="doc-icon">📄</span>
                          <div>
                            <p>
                              <strong>Documento carregado</strong>
                            </p>
                            {uploadedTermsDoc?.name && (
                              <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '4px' }}>
                                {uploadedTermsDoc.name}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                              <button
                                onClick={() => {
                                  try {
                                    const base64Response = fetch(termsDocUrl);
                                    base64Response
                                      .then((res) => res.blob())
                                      .then((blob) => {
                                        const url = URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                                      });
                                  } catch (error) {
                                    console.error('Erro ao abrir PDF:', error);
                                    showToast('Erro ao abrir o documento', 'danger');
                                  }
                                }}
                                className="fluig-btn fluig-btn-edit"
                                style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                              >
                                📄 Ver Documento
                              </button>
                              <a
                                href={termsDocUrl}
                                download={uploadedTermsDoc?.name || 'termos-contratacao.pdf'}
                                className="fluig-btn fluig-btn-edit"
                                style={{
                                  fontSize: '0.9rem',
                                  padding: '8px 16px',
                                  textDecoration: 'none',
                                  display: 'inline-block',
                                }}
                              >
                                💾 Baixar
                              </a>
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={handleRemoveTermsDoc}
                            className="fluig-btn fluig-btn-delete"
                            style={{ marginTop: '15px' }}
                          >
                            Remover Documento
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cancelPlanos' && hasPermission('managePayments') && (
            <div className="tab-content">
              <div className="section-header" style={{ marginBottom: '1.5rem' }}>
                <h2>Planos</h2>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Veja os planos ativos de clientes. O plano permanece ativo até o fim do período já
                  pago.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}
              >
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--orange)' }}>
                    {subscriptions.filter((s) => s.status === 'active').length}
                  </div>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Planos Ativos
                  </div>
                </div>
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                    {subscriptions.filter((s) => s.status === 'cancel_pending').length}
                  </div>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Cancelamento Pendente
                  </div>
                </div>
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)' }}>
                    R${' '}
                    {subscriptions
                      .filter((s) => s.status === 'active')
                      .reduce((acc, s) => acc + (parseFloat(s.plan.price) || 0), 0)
                      .toFixed(2)}
                  </div>
                  <div style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Receita Mensal Ativa
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => {
                      setSubscriptionSearchType('name');
                      setSubscriptionSearch('');
                    }}
                    style={{
                      padding: '0.55rem 1rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background:
                        subscriptionSearchType === 'name' ? 'var(--orange)' : 'transparent',
                      color: subscriptionSearchType === 'name' ? '#0c0c0c' : '#a8a8a8',
                      transition: 'all 0.2s',
                    }}
                  >
                    Nome
                  </button>
                  <button
                    onClick={() => {
                      setSubscriptionSearchType('cpf');
                      setSubscriptionSearch('');
                    }}
                    style={{
                      padding: '0.55rem 1rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background:
                        subscriptionSearchType === 'cpf' ? 'var(--orange)' : 'transparent',
                      color: subscriptionSearchType === 'cpf' ? '#0c0c0c' : '#a8a8a8',
                      transition: 'all 0.2s',
                    }}
                  >
                    CPF
                  </button>
                </div>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder={
                      subscriptionSearchType === 'name'
                        ? 'Buscar por nome do cliente...'
                        : 'Buscar por CPF (ex: 123.456.789-00)...'
                    }
                    value={subscriptionSearch}
                    onChange={(e) => setSubscriptionSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.4rem 0.6rem 1rem',
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--orange)')}
                    onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')}
                  />
                  {subscriptionSearch && (
                    <button
                      onClick={() => setSubscriptionSearch('')}
                      style={{
                        position: 'absolute',
                        right: '0.6rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1,
                        padding: 0,
                      }}
                      title="Limpar busca"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {subscriptionSearch && (
                  <span style={{ color: '#a8a8a8', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
                    {
                      subscriptions.filter(
                        (s) =>
                          (s.status === 'active' || s.status === 'cancel_pending') &&
                          (subscriptionSearchType === 'name'
                            ? (s.userName || '')
                              .toLowerCase()
                              .includes(subscriptionSearch.toLowerCase())
                            : (s.userCpf || '')
                              .replace(/\D/g, '')
                              .includes(subscriptionSearch.replace(/\D/g, ''))),
                      ).length
                    }{' '}
                    resultado(s)
                  </span>
                )}
              </div>

              <div className="payments-table">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Plano</th>
                      <th>Valor/mês</th>
                      <th>Ativo até</th>
                      <th>Status</th>
                      {/* <th>Ação</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.filter(
                      (s) => s.status === 'active' || s.status === 'cancel_pending',
                    ).length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: 'center',
                            color: 'var(--text-gray)',
                            padding: '2rem',
                          }}
                        >
                          Nenhuma assinatura encontrada.
                        </td>
                      </tr>
                    ) : subscriptions
                      .filter((s) => s.status === 'active' || s.status === 'cancel_pending')
                      .filter((s) => {
                        if (!subscriptionSearch.trim()) return true;
                        if (subscriptionSearchType === 'name') {
                          return (s.user.name || '')
                            .toLowerCase()
                            .includes(subscriptionSearch.toLowerCase());
                        } else {
                          return (s.userCpf || '')
                            .replace(/\D/g, '')
                            .includes(subscriptionSearch.replace(/\D/g, ''));
                        }
                      }).length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: 'center',
                            color: 'var(--text-gray)',
                            padding: '2rem',
                          }}
                        >
                          Nenhum resultado para "{subscriptionSearch}".
                        </td>
                      </tr>
                    ) : (
                      subscriptions
                        .filter((s) => s.status === 'active' || s.status === 'cancel_pending')
                        .filter((s) => {
                          if (!subscriptionSearch.trim()) return true;
                          if (subscriptionSearchType === 'name') {
                            return (s.user.name || '')
                              .toLowerCase()
                              .includes(subscriptionSearch.toLowerCase());
                          } else {
                            return (s.userCpf || '')
                              .replace(/\D/g, '')
                              .includes(subscriptionSearch.replace(/\D/g, ''));
                          }
                        })
                        .map((sub) => (
                          <tr
                            key={sub.id}
                            style={{ opacity: sub.status === 'cancel_pending' ? 0.75 : 1 }}
                          >
                            <td>
                              <div style={{ fontWeight: 600, color: '#fff' }}>
                                {sub.user.name || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: 'rgba(255,122,26,0.15)',
                                  color: 'var(--orange)',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                }}
                              >
                                {sub.plan.name}
                              </span>
                            </td>
                            <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                              R$ {parseFloat(sub.plan.price || 0).toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                              {(sub.currentCycle?.periodEnd || sub.nextBillingDate)
                                ? new Date(sub.currentCycle?.periodEnd || sub.nextBillingDate).toLocaleDateString('pt-BR')
                                : 'N/A'}
                            </td>
                            <td>
                              {sub.status === 'active' && (
                                <span
                                  style={{
                                    background: 'rgba(34,197,94,0.15)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34,197,94,0.35)',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  Ativo
                                </span>
                              )}
                              {sub.status === 'cancel_pending' && (
                                <span
                                  style={{
                                    background: 'rgba(245,158,11,0.15)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245,158,11,0.35)',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Cancelamento Pendente
                                </span>
                              )}
                            </td>
                            {/* <td>
                              {sub.status === 'active' ? (
                                <button
                                  onClick={() => handleScheduleCancelSubscription(sub)}
                                  className="fluig-btn fluig-btn-delete"
                                  title="Cancelar ao fim do período atual"
                                >
                                  Cancelar Plano
                                </button>
                              ) : (
                                <span style={{ color: '#555', fontSize: '0.8rem' }}>
                                  Aguardando expiração
                                </span>
                              )}
                            </td> */}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && hasPermission('managePayments') && (
            <div className="payments-section">
              <div
                className="section-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h2>Relatório de Pagamentos</h2>
                <div
                  className="month-filter"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <label htmlFor="month-select" style={{ color: 'var(--gold)', fontWeight: 500 }}>
                    Filtrar por mês
                  </label>
                  <select
                    id="month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="form-select"
                    style={{ minWidth: '200px' }}
                  >
                    {generateMonthOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filters-container">
                <div className="filter-group">
                  <label>Data Específica:</label>
                  <input
                    type="date"
                    value={paymentDateFilter}
                    onChange={(e) => {
                      setPaymentDateFilter(e.target.value);
                      if (e.target.value) {
                        setPaymentStartDate('');
                        setPaymentEndDate('');
                      }
                    }}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>De:</label>
                  <input
                    type="date"
                    value={paymentStartDate}
                    onChange={(e) => {
                      setPaymentStartDate(e.target.value);
                      if (e.target.value) {
                        setPaymentDateFilter('');
                      }
                    }}
                    className="filter-input"
                    disabled={!!paymentDateFilter}
                  />
                </div>

                <div className="filter-group">
                  <label>Até:</label>
                  <input
                    type="date"
                    value={paymentEndDate}
                    onChange={(e) => {
                      setPaymentEndDate(e.target.value);
                      if (e.target.value) {
                        setPaymentDateFilter('');
                      }
                    }}
                    className="filter-input"
                    disabled={!!paymentDateFilter}
                  />
                </div>

                {(paymentDateFilter || paymentStartDate || paymentEndDate) && (
                  <div className="filter-group">
                    <button onClick={clearPaymentFilters} className="clear-filters-btn">
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>

              <div className="monthly-summary" style={{ marginBottom: '2rem' }}>
                <div
                  style={{
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid var(--gold)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                  }}
                >
                  <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>
                    Resumo -{' '}
                    {generateMonthOptions().find((opt) => opt.value === selectedMonth)?.label}
                  </h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>Pendente</span>
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#ef4444',
                          marginTop: '0.5rem',
                        }}
                      >
                        R$ {calculateMonthlyTotals().pending.toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>Pago</span>
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#22c55e',
                          marginTop: '0.5rem',
                        }}
                      >
                        R$ {calculateMonthlyTotals().paid.toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(212, 175, 55, 0.1)',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>Total</span>
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: 'var(--gold)',
                          marginTop: '0.5rem',
                        }}
                      >
                        R$ {calculateMonthlyTotals().total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="payment-stats">
                <div className="payment-stat-card">
                  <h3>Cartão de Crédito</h3>
                  <p className="stat-value">R$ {paymentStats.credito.toFixed(2)}</p>
                  <p className="stat-count">{paymentStats.count.credito} transações</p>
                </div>
                <div className="payment-stat-card">
                  <h3>Cartão de Débito</h3>
                  <p className="stat-value">R$ {paymentStats.debito.toFixed(2)}</p>
                  <p className="stat-count">{paymentStats.count.debito} transações</p>
                </div>
                <div className="payment-stat-card">
                  <h3>PIX</h3>
                  <p className="stat-value">R$ {paymentStats.pix.toFixed(2)}</p>
                  <p className="stat-count">{paymentStats.count.pix} transações</p>
                </div>
                {paymentStats.dinheiro > 0 && (
                  <div className="payment-stat-card">
                    <h3>Dinheiro</h3>
                    <p className="stat-value">R$ {paymentStats.dinheiro.toFixed(2)}</p>
                    <p className="stat-count">{paymentStats.count.dinheiro} transações</p>
                  </div>
                )}
                {paymentStats.cartao > 0 && (
                  <div className="payment-stat-card">
                    <h3>Cartão Local</h3>
                    <p className="stat-value">R$ {paymentStats.cartao.toFixed(2)}</p>
                    <p className="stat-count">{paymentStats.count.cartao} transações</p>
                  </div>
                )}
                {paymentStats.count.planCovered > 0 && (
                  <div className="payment-stat-card">
                    <h3>🏅 Cobertos por Plano</h3>
                    <p className="stat-value">Grátis</p>
                    <p className="stat-count">{paymentStats.count.planCovered} agendamentos</p>
                  </div>
                )}
                <div className="payment-stat-card payment-stat-card--total">
                  <h3>Total Geral</h3>
                  <p className="stat-value">R$ {paymentStats.total.toFixed(2)}</p>
                  <p className="stat-count">
                    {Object.entries(paymentStats.count)
                      .filter(([k]) => k !== 'planCovered')
                      .reduce((a, [, v]) => a + v, 0)}{' '}
                    transações pagas
                    {paymentStats.count.planCovered > 0 &&
                      ` + ${paymentStats.count.planCovered} por plano`}
                  </p>
                  <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.9 }}>
                    Agendamentos pagos + Assinaturas
                  </p>
                </div>
              </div>

              <div className="pending-payments">
                <h3>
                  Pagamentos Pendentes de Agendamentos{' '}
                  {pendingPayments.length > 0 && `(${pendingPayments.length})`}
                </h3>
                {pendingPayments.length === 0 ? (
                  <p
                    className="calendar-empty"
                    style={{ color: '#888', fontSize: '0.9rem', padding: '1rem 0' }}
                  >
                    Nenhum pagamento pendente encontrado para o período selecionado.
                  </p>
                ) : (
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Data Agend.</th>
                          <th>Horário</th>
                          <th>Cliente</th>
                          <th>Para</th>
                          <th>Barbeiro</th>
                          <th>Serviço</th>
                          <th>Valor</th>
                          <th>Status</th>
                          <th>Data Pagamento</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...pendingPayments]
                          .sort((a, b) =>
                            (b.appointmentDate || b.createdAt || '').localeCompare(
                              a.appointmentDate || a.createdAt || '',
                            ),
                          )
                          .map((payment) => (
                            <tr
                              key={payment.id}
                              style={{
                                opacity: payment.noShow ? 0.65 : 1,
                                background:
                                  payment.displayStatus === 'overdue'
                                    ? 'rgba(231,76,60,0.06)'
                                    : payment.displayStatus === 'pending'
                                      ? 'rgba(243,156,18,0.06)'
                                      : 'transparent',
                              }}
                            >
                              <td>
                                {new Date(payment.appointment.startAt).toLocaleDateString('pt-BR')}
                              </td>
                              <td>
                                {new Date(payment.appointment.startAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'UTC',
                                })}
                              </td>
                              <td>
                                {payment.user.name}
                                {payment.noShow && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontSize: '0.72rem',
                                      background: '#555',
                                      color: '#fff',
                                      borderRadius: 8,
                                      padding: '1px 6px',
                                    }}
                                  >
                                    Não compareceu
                                  </span>
                                )}
                              </td>
                              <td>
                                {(() => {
                                  const la = appointments.find(
                                    (a) => a.id?.toString() === payment.appointmentId?.toString(),
                                  );
                                  return la?.dependent ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(255,122,26,0.12)',
                                        color: '#ff7a1a',
                                        border: '1px solid rgba(255,122,26,0.35)',
                                        borderRadius: '20px',
                                        padding: '2px 9px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                      }}
                                    >
                                      👤 {la.dependent.name}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#555' }}>—</span>
                                  );
                                })()}
                              </td>
                              <td>{payment.appointment.barber.displayName}</td>
                              <td style={{ whiteSpace: 'pre-line' }}>
                                {(() => {
                                  const serviceNames = getServiceNamesFromPayment(payment);
                                  return serviceNames.length > 0
                                    ? serviceNames.join('\n')
                                    : 'Sem serviço';
                                })()}
                                {/* {Array.isArray(payment.serviceName)
                                ? payment.serviceName.join('\n')
                                : payment.serviceName?.includes(',')
                                  ? payment.serviceName.split(',').map(s => s.trim()).join('\n')
                                  : payment.serviceName
                              } */}
                              </td>
                              <td>R$ {parseFloat(payment.amount || 0).toFixed(2)}</td>
                              <td>
                                {payment.displayStatus === 'overdue' ? (
                                  <span
                                    className="status-badge"
                                    style={{
                                      background: '#e74c3c22',
                                      color: '#e74c3c',
                                      border: '1px solid #e74c3c55',
                                    }}
                                  >
                                    Em Atraso
                                  </span>
                                ) : payment.displayStatus === 'confirmed_unpaid' ? (
                                  <span
                                    className="status-badge"
                                    style={{
                                      background: '#f39c1222',
                                      color: '#f39c12',
                                      border: '1px solid #f39c1255',
                                    }}
                                  >
                                    Confirmado · Pag. Pendente
                                  </span>
                                ) : payment.status === 'pendinglocal' ||
                                  (payment.status === 'pending' &&
                                    String(
                                      payment.method || payment.paymentMethod || '',
                                    ).toLowerCase() === 'local') ? (
                                  <span className="status-badge status-pending-local">
                                    Pagar no Local
                                  </span>
                                ) : (
                                  <span className="status-badge status-pending-online">
                                    Pagar Online
                                  </span>
                                )}
                              </td>
                              <td>
                                {payment.paidAt ? (
                                  payment.paidAt.slice(0, 10).split('-').reverse().join('/')
                                ) : (
                                  <span style={{ color: '#666' }}>—</span>
                                )}
                              </td>
                              <td>
                                <div
                                  className="payment-action-buttons"
                                  style={{ flexWrap: 'wrap', gap: '4px' }}
                                >
                                  {payment.displayStatus !== 'confirmed_unpaid' && (
                                    <button
                                      onClick={() => handleConfirmCutDone(payment)}
                                      className="btn-edit btn-payment-small"
                                      style={{
                                        background: '#27ae6022',
                                        color: '#27ae60',
                                        border: '1px solid #27ae6055',
                                      }}
                                      title="Marcar corte como realizado"
                                    >
                                      ✓ Confirmado
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleMarkAsPaid(payment, 'dinheiro')}
                                    className="btn-edit btn-payment-small"
                                  >
                                    Dinheiro
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsPaid(payment, 'pix')}
                                    className="btn-edit btn-payment-small"
                                  >
                                    PIX
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsPaid(payment, 'credito')}
                                    className="btn-edit btn-payment-small"
                                  >
                                    Crédito
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsPaid(payment, 'debito')}
                                    className="btn-edit btn-payment-small"
                                  >
                                    Débito
                                  </button>
                                  {!payment.noShow && (
                                    <button
                                      onClick={() => handleNoShow(payment)}
                                      className="btn-edit btn-payment-small"
                                      style={{
                                        background: '#8e44ad22',
                                        color: '#8e44ad',
                                        border: '1px solid #8e44ad55',
                                      }}
                                    >
                                      👻 Não compareceu
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCancelFromPending(payment)}
                                    className="btn-edit btn-payment-small"
                                    style={{
                                      background: '#e74c3c22',
                                      color: '#e74c3c',
                                      border: '1px solid #e74c3c55',
                                    }}
                                  >
                                    ✕ Cancelar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {activeTab === 'payments' &&
                barberNames.map((barberName) => {
                  const isExpanded = expandedBarbers[`pay_${barberName}`];
                  const barberPayments = allPaid.filter(
                    (p) => (p.appointment?.barber?.displayName || 'Sem barbeiro') === barberName,
                  );
                  const barberObj = barbers.find((b) => b.displayName === barberName);
                  const commissionPercent = barberObj?.commissionPercent || 50;

                  const paidOnly = barberPayments.filter((p) => {
                    const isPlanCovered =
                      p.status === 'plan_covered' ||
                      p.status === 'plancovered' ||
                      p.paymentMethod === 'subscription';
                    return !isPlanCovered;
                  });

                  const totalRevenue = paidOnly.reduce(
                    (sum, p) => sum + parseFloat(p.amount || 0),
                    0,
                  );
                  const barberEarnings = (totalRevenue * commissionPercent) / 100;
                  const shopEarnings = totalRevenue - barberEarnings;
                  const planCount = barberPayments.length - paidOnly.length;

                  return (
                    <div
                      key={barberName}
                      className="fluig-table-parent"
                      style={{ marginBottom: '0.75rem' }}
                    >
                      <div
                        className="fluig-row-parent"
                        onClick={() =>
                          setExpandedBarbers((prev) => ({
                            ...prev,
                            [`pay_${barberName}`]: !prev[`pay_${barberName}`],
                          }))
                        }
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="fluig-expand-icon">{isExpanded ? '▼' : '▶'}</div>

                        <div className="fluig-barber-info">
                          {barberObj?.photo && (
                            <img
                              src={barberObj.photo}
                              alt={barberName}
                              className="fluig-barber-photo"
                            />
                          )}
                          <div className="fluig-barber-details">
                            <h3 className="fluig-barber-name">{barberName}</h3>
                            <p className="fluig-barber-specialty">
                              {barberObj?.specialty || 'Barbeiro'}
                            </p>
                          </div>
                        </div>

                        <div className="fluig-barber-stats">
                          <div className="stat-item">
                            <span className="stat-label">Atendimentos</span>
                            <span className="stat-value">
                              {barberPayments.length}
                              {planCount > 0 && (
                                <span
                                  style={{ color: '#d4af37', fontSize: '0.75rem', marginLeft: 4 }}
                                >
                                  ({planCount} plano)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Faturamento</span>
                            <span className="stat-value stat-value-highlight">
                              R$ {totalRevenue.toFixed(2)}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Comissão ({commissionPercent}%)</span>
                            <span className="stat-value stat-value-success">
                              R$ {barberEarnings.toFixed(2)}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Barbearia</span>
                            <span className="stat-value">R$ {shopEarnings.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="fluig-children-container">
                          <div className="payments-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Data Agend.</th>
                                  <th>Cliente</th>
                                  <th>Serviço</th>
                                  <th>Produtos</th>
                                  <th>Data Pag.</th>
                                  <th>Valor</th>
                                  <th>Comissão</th>
                                  <th>Método</th>
                                  <th>Tipo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...barberPayments]
                                  .sort((a, b) =>
                                    (
                                      b.appointmentDate ||
                                      b.paidAt ||
                                      b.createdAt ||
                                      ''
                                    ).localeCompare(
                                      a.appointmentDate || a.paidAt || a.createdAt || '',
                                    ),
                                  )
                                  .map((payment) => {
                                    const paymentMethodValue = String(
                                      payment.paymentMethod || payment.method || '',
                                    )
                                      .toLowerCase()
                                      .trim();
                                    const isPlanCovered =
                                      payment.status === 'plan_covered' ||
                                      payment.status === 'plancovered' ||
                                      paymentMethodValue === 'subscription';
                                    const isSubscriber =
                                      clientSubscriptionStatus[payment.userId] || isPlanCovered;
                                    const tipo = isPlanCovered
                                      ? 'plano'
                                      : paymentMethodValue === 'local' ||
                                        payment.status === 'pendinglocal'
                                        ? 'local'
                                        : 'avulso';

                                    const appointment = payment.appointmentId
                                      ? appointments.find(
                                        (apt) =>
                                          apt.id?.toString() ===
                                          payment.appointmentId?.toString(),
                                      )
                                      : appointments.find(
                                        (apt) =>
                                          apt.clientId === payment.userId &&
                                          apt.date === payment.appointmentDate &&
                                          apt.time === payment.appointmentTime,
                                      );
                                    const productsList =
                                      appointment?.products?.filter((pr) => pr && pr.productName) ||
                                      [];
                                    const hasProducts = productsList.length > 0;
                                    const productsTotal = productsList.reduce((s, prod) => {
                                      const price =
                                        typeof prod.unitPrice === 'string'
                                          ? parseFloat(
                                            prod.unitPrice
                                              .replace(/R\$/g, '')
                                              .replace(/,/g, '.')
                                              .trim(),
                                          ) || 0
                                          : prod.unitPrice || 0;
                                      return s + price * (prod.quantity || 1);
                                    }, 0);
                                    const serviceVal = parseFloat(payment.amount || 0);
                                    const totalVal = isPlanCovered ? productsTotal : serviceVal;
                                    const planOnly = isPlanCovered && !hasProducts;
                                    const rowComm = isPlanCovered
                                      ? 0
                                      : (serviceVal * commissionPercent) / 100;

                                    return (
                                      <tr key={payment.id}>
                                        <td>
                                          {payment.appointment?.startAt
                                            ? new Date(
                                              payment.appointment.startAt,
                                            ).toLocaleDateString('pt-BR')
                                            : '—'}
                                        </td>
                                        <td>
                                          <div
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                            }}
                                          >
                                            {payment.user?.name || 'Cliente'}
                                            {isSubscriber && (
                                              <span
                                                style={{
                                                  background: '#d4af37',
                                                  color: '#000',
                                                  padding: '1px 7px',
                                                  borderRadius: '10px',
                                                  fontSize: '0.72rem',
                                                  fontWeight: 'bold',
                                                }}
                                              >
                                                ASSINANTE
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ whiteSpace: 'pre-line' }}>
                                          {(() => {
                                            const serviceNames =
                                              getServiceNamesFromPayment(payment);
                                            return serviceNames.length > 0
                                              ? serviceNames.join('\n')
                                              : 'Sem serviço';
                                          })()}
                                        </td>
                                        <td>
                                          {hasProducts ? (
                                            productsList.map((prod, idx) => (
                                              <div key={idx} style={{ fontSize: '0.85rem' }}>
                                                {prod.productName}{' '}
                                                <span style={{ color: '#888' }}>
                                                  x{prod.quantity || 1}
                                                </span>
                                              </div>
                                            ))
                                          ) : (
                                            <span style={{ color: '#555' }}>—</span>
                                          )}
                                        </td>
                                        <td>
                                          {payment.paidAt
                                            ? new Date(payment.paidAt).toLocaleDateString('pt-BR')
                                            : '—'}
                                        </td>
                                        <td>
                                          {planOnly ? (
                                            <span
                                              style={{
                                                color: '#d4af37',
                                                fontSize: '0.85rem',
                                                fontStyle: 'italic',
                                              }}
                                            >
                                              Coberto pelo plano
                                            </span>
                                          ) : (
                                            <strong>R$ {totalVal.toFixed(2)}</strong>
                                          )}
                                          {isPlanCovered && hasProducts && (
                                            <div
                                              style={{
                                                fontSize: '0.78rem',
                                                color: '#888',
                                                marginTop: '2px',
                                              }}
                                            >
                                              serviço coberto · +R$ {productsTotal.toFixed(2)}{' '}
                                              produtos
                                            </div>
                                          )}
                                        </td>
                                        <td>
                                          {isPlanCovered ? (
                                            <span style={{ color: '#555', fontSize: '0.82rem' }}>
                                              —
                                            </span>
                                          ) : (
                                            <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                              R$ {rowComm.toFixed(2)}
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <PaymentBadge
                                            method={paymentMethodValue}
                                          />
                                        </td>
                                        <td>
                                          <span
                                            style={{
                                              padding: '3px 10px',
                                              borderRadius: '10px',
                                              fontSize: '0.78rem',
                                              fontWeight: 600,
                                              ...(tipo === 'plano'
                                                ? {
                                                  background: '#d4af3722',
                                                  color: '#d4af37',
                                                  border: '1px solid #d4af3744',
                                                }
                                                : tipo === 'local'
                                                  ? {
                                                    background: '#3498db22',
                                                    color: '#3498db',
                                                    border: '1px solid #3498db44',
                                                  }
                                                  : {
                                                    background: '#ff7a1a22',
                                                    color: '#ff7a1a',
                                                    border: '1px solid #ff7a1a44',
                                                  }),
                                            }}
                                          >
                                            {tipo === 'plano'
                                              ? '🏅 Plano'
                                              : tipo === 'local'
                                                ? '🏪 Local'
                                                : '💳 Avulso'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              <div className="payments-list" style={{ marginBottom: '2rem' }}>
                <h3>
                  Vendas de Produtos{' '}
                  {(() => {
                    let base = [...productSales];
                    const getDate = (s) => String(s.saleDate || s.createdAt || '').slice(0, 10);
                    if (paymentDateFilter) {
                      base = base.filter((s) => getDate(s) === toDateStr(paymentDateFilter));
                    } else if (paymentStartDate || paymentEndDate) {
                      base = base.filter((s) =>
                        isDateInRange(getDate(s), paymentStartDate, paymentEndDate),
                      );
                    } else if (selectedMonth) {
                      const [y, m] = selectedMonth.split('-');
                      base = base.filter((s) => {
                        const [sy, sm] = getDate(s).split('-');
                        return parseInt(sy) === parseInt(y) && parseInt(sm) === parseInt(m);
                      });
                    }
                    return base.length > 0 ? `(${base.length})` : '';
                  })()}
                </h3>
                {(() => {
                  const filtered = (() => {
                    let base = [...productSales];
                    const getDate = (s) => String(s.saleDate || s.createdAt || '').slice(0, 10);
                    if (paymentDateFilter) {
                      base = base.filter((s) => getDate(s) === toDateStr(paymentDateFilter));
                    } else if (paymentStartDate || paymentEndDate) {
                      base = base.filter((s) =>
                        isDateInRange(getDate(s), paymentStartDate, paymentEndDate),
                      );
                    } else if (selectedMonth) {
                      const [y, m] = selectedMonth.split('-');
                      base = base.filter((s) => {
                        const [sy, sm] = getDate(s).split('-');
                        return parseInt(sy) === parseInt(y) && parseInt(sm) === parseInt(m);
                      });
                    }
                    return [...base].sort((a, b) =>
                      (b.saleDate || b.createdAt || '').localeCompare(
                        a.saleDate || a.createdAt || '',
                      ),
                    );
                  })();

                  if (filtered.length === 0) {
                    return (
                      <p
                        className="calendar-empty"
                        style={{ color: '#888', fontSize: '0.9rem', padding: '1rem 0' }}
                      >
                        Nenhuma venda de produto encontrada para o período selecionado.
                      </p>
                    );
                  }

                  const grandTotal = filtered
                    .filter((s) => s.status === 'paid')
                    .reduce((sum, s) => sum + parseFloat(s.productsTotal || 0), 0);

                  return (
                    <>
                      <div
                        style={{ marginBottom: '0.75rem', color: '#a8a8a8', fontSize: '0.88rem' }}
                      >
                        Total pago no período:{' '}
                        <strong style={{ color: '#ff7a1a', fontSize: '1rem' }}>
                          R$ {grandTotal.toFixed(2)}
                        </strong>
                      </div>
                      <div className="payments-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Cliente</th>
                              <th>Produtos</th>
                              <th>Total</th>
                              <th>Método</th>
                              <th>Status</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((sale) => {
                              const isPaid = sale.status === 'paid';
                              const isPendingLocal = sale.status === 'pendinglocal';
                              const isPendingOnline = sale.status === 'pending_online';
                              return (
                                <tr key={sale.id}>
                                  <td data-label="Data">
                                    {String(sale.saleDate || sale.createdAt || '')
                                      .slice(0, 10)
                                      .split('-')
                                      .reverse()
                                      .join('/')}
                                  </td>
                                  <td data-label="Cliente">{sale.userName}</td>
                                  <td data-label="Produtos">
                                    {(sale.products || []).map((p, i) => (
                                      <div key={i} style={{ fontSize: '0.85rem' }}>
                                        {p.name}{' '}
                                        <span style={{ color: '#888' }}>x{p.quantity || 1}</span>
                                      </div>
                                    ))}
                                  </td>
                                  <td data-label="Total">
                                    <strong>
                                      R$ {parseFloat(sale.productsTotal || 0).toFixed(2)}
                                    </strong>
                                  </td>
                                  <td data-label="Método">
                                    <PaymentBadge method={sale.paymentMethod} />
                                  </td>
                                  <td data-label="Status">
                                    {isPaid ? (
                                      <span
                                        style={{
                                          color: '#27ae60',
                                          fontWeight: 600,
                                          fontSize: '0.82rem',
                                        }}
                                      >
                                        ✓ Pago
                                      </span>
                                    ) : isPendingLocal ? (
                                      <span
                                        style={{
                                          color: '#f39c12',
                                          fontWeight: 600,
                                          fontSize: '0.82rem',
                                        }}
                                      >
                                        Pagar no Local
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          color: '#3498db',
                                          fontWeight: 600,
                                          fontSize: '0.82rem',
                                        }}
                                      >
                                        Aguardando Online
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {!isPaid && (
                                      <div
                                        className="payment-action-buttons"
                                        style={{ flexWrap: 'wrap', gap: '4px' }}
                                      >
                                        <button
                                          onClick={() =>
                                            handleMarkProductSalePaid(sale, 'dinheiro')
                                          }
                                          className="btn-edit btn-payment-small"
                                        >
                                          Dinheiro
                                        </button>
                                        <button
                                          onClick={() => handleMarkProductSalePaid(sale, 'pix')}
                                          className="btn-edit btn-payment-small"
                                        >
                                          PIX
                                        </button>
                                        <button
                                          onClick={() => handleMarkProductSalePaid(sale, 'credito')}
                                          className="btn-edit btn-payment-small"
                                        >
                                          Crédito
                                        </button>
                                        <button
                                          onClick={() => handleMarkProductSalePaid(sale, 'debito')}
                                          className="btn-edit btn-payment-small"
                                        >
                                          Débito
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="payments-list">
                <h3>Histórico de Assinaturas</h3>
                {subscriptions.length === 0 ? (
                  <p className="calendar-empty">Nenhuma assinatura registrada.</p>
                ) : (
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Cliente</th>
                          <th>Plano</th>
                          <th>Valor</th>
                          <th>Método</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...getFilteredSubscriptions()]
                          .sort((a, b) =>
                            (b.createdAt || b.startDate || '').localeCompare(
                              a.createdAt || a.startDate || '',
                            ),
                          )
                          .map((sub) => (
                            <tr key={sub.id}>
                              <td data-label="Data">
                                {new Date(sub.createdAt || sub.startDate).toLocaleDateString(
                                  'pt-BR',
                                )}
                              </td>
                              <td data-label="Cliente">{sub.userName || 'N/A'}</td>
                              <td data-label="Plano">{sub.planName}</td>
                              <td data-label="Valor">
                                R$ {parseFloat(sub.amount || sub.planPrice || 0).toFixed(2)}
                              </td>
                              <td data-label="Método">
                                <PaymentBadge method={sub.paymentMethod} />
                              </td>
                              <td data-label="Status">
                                <span className={`status-badge status-badge--${sub.status}`}>
                                  {sub.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && isAdmin && (
            <div style={{ padding: '1.5rem 0' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>
                    👤 Gerenciamento de Usuários
                  </h2>
                  <p style={{ color: '#888', fontSize: '0.82rem', margin: '4px 0 0' }}>
                    Redefina senhas e importe clientes em massa via Excel.
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <input
                    ref={usersImportInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleImportUsersExcel}
                  />
                  <button
                    onClick={() => usersImportInputRef.current?.click()}
                    className="btn-add-barber"
                    disabled={importingUsers}
                  >
                    {importingUsers ? 'Importando...' : 'Importar Clientes (Excel)'}
                  </button>
                  <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      background: '#111',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '9px 14px',
                      fontSize: '0.85rem',
                      minWidth: '240px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }} className="usuarios-table">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      {['Nome', 'E-mail', 'CPF', 'Telefone', 'Aniversário', 'Função', 'Ações'].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: '#888',
                            fontWeight: 600,
                            padding: '10px 12px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers
                      .filter((u) => {
                        if (!userSearch.trim()) return true;
                        const q = userSearch.toLowerCase();
                        return (
                          (u.name || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q)
                        );
                      })
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((user) => (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: '1px solid #1e1e1e',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#161616')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td data-label="Nome" style={{ padding: '12px 12px', color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {user.picture ? (
                                <img
                                  src={user.picture}
                                  alt=""
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: '#2a2a2a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ff7a1a',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {(user.name || '?')[0].toUpperCase()}
                                </div>
                              )}
                              <span>{user.name || '—'}</span>
                            </div>
                          </td>
                          <td
                            data-label="E-mail"
                            style={{ padding: '12px 12px', color: '#a8a8a8' }}
                          >
                            {user.email || '—'}
                          </td>
                          <td
                            data-label="CPF"
                            style={{ padding: '12px 12px', color: '#a8a8a8', whiteSpace: 'nowrap' }}
                          >
                            {formatCpfDisplay(user.cpf)}
                          </td>
                          <td
                            data-label="Telefone"
                            style={{ padding: '12px 12px', color: '#a8a8a8', whiteSpace: 'nowrap' }}
                          >
                            {formatPhoneDisplay(user.phone)}
                          </td>
                          <td
                            data-label="Aniversário"
                            style={{ padding: '12px 12px', color: '#a8a8a8' }}
                          >
                            {formatUserBirthDayMonth(user)}
                          </td>
                          <td data-label="Função" style={{ padding: '12px 12px' }}>
                            <span
                              style={{
                                background:
                                  user.role === 'admin' || user.isAdmin
                                    ? 'rgba(255,122,26,0.15)'
                                    : user.role === 'barber'
                                      ? 'rgba(100,200,100,0.12)'
                                      : 'rgba(100,150,255,0.12)',
                                color:
                                  user.role === 'admin' || user.isAdmin
                                    ? '#ff7a1a'
                                    : user.role === 'barber'
                                      ? '#6dc96d'
                                      : '#7aadff',
                                borderRadius: '6px',
                                padding: '3px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              {user.role === 'admin' || user.isAdmin
                                ? 'Admin'
                                : user.role === 'barber'
                                  ? 'Barbeiro'
                                  : user.role === 'receptionist'
                                    ? 'Recepcionista'
                                    : 'Cliente'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <button
                              onClick={() => openResetPasswordModal(user)}
                              style={{
                                background: 'rgba(255,122,26,0.12)',
                                border: '1px solid rgba(255,122,26,0.3)',
                                color: '#ff7a1a',
                                borderRadius: '7px',
                                padding: '6px 14px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,122,26,0.22)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,122,26,0.12)';
                              }}
                            >
                              Redefinir Senha
                            </button>
                          </td>
                        </tr>
                      ))}
                    {allUsers.filter((u) => {
                      if (!userSearch.trim()) return true;
                      const q = userSearch.toLowerCase();
                      return (
                        (u.name || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{ padding: '2rem', textAlign: 'center', color: '#555' }}
                          >
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
              <p style={{ color: '#444', fontSize: '0.78rem', marginTop: '1rem' }}>
                Total: {allUsers.length} usuários cadastrados
              </p>
            </div>
          )}

          {activeTab === 'calendario' && (
            <div className="calendario-container">
              <h2 className="calendario-titulo">Gerenciar Calendário</h2>

              <div className="bloqueio-form-card">
                <h3 className="bloqueio-form-titulo">Bloquear Calendário</h3>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {[
                    { value: 'day', label: ' Dia inteiro' },
                    { value: 'time', label: ' Horário específico' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setNewBlockedDate({
                          ...newBlockedDate,
                          blockType: opt.value,
                          startTime: '',
                          endTime: '',
                        })
                      }
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border:
                          newBlockedDate.blockType === opt.value
                            ? '1.5px solid #ff7a1a'
                            : '1.5px solid #444',
                        background:
                          newBlockedDate.blockType === opt.value
                            ? 'rgba(255,122,26,0.12)'
                            : 'transparent',
                        color: newBlockedDate.blockType === opt.value ? '#ff7a1a' : '#888',
                        fontWeight: newBlockedDate.blockType === opt.value ? 600 : 400,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="bloqueio-form-grid">
                  <div className="bloqueio-form-campo">
                    <label className="bloqueio-form-label">Data *</label>
                    <input
                      type="date"
                      value={newBlockedDate.date}
                      onChange={(e) =>
                        setNewBlockedDate({ ...newBlockedDate, date: e.target.value })
                      }
                      min={new Date().toISOString().split('T')[0]}
                      className="bloqueio-form-input"
                    />
                  </div>

                  <div className="bloqueio-form-campo">
                    <label className="bloqueio-form-label">Barbeiro (opcional)</label>
                    <select
                      value={newBlockedDate.barberId || ''}
                      onChange={(e) =>
                        setNewBlockedDate({ ...newBlockedDate, barberId: e.target.value || null })
                      }
                      className="bloqueio-form-select"
                    >
                      <option value="">Todos os barbeiros</option>
                      {barbers.map((barber) => (
                        <option key={barber.id} value={barber.id}>
                          {barber.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {newBlockedDate.blockType === 'time' && (
                    <>
                      <div className="bloqueio-form-campo">
                        <label className="bloqueio-form-label">Horário início *</label>
                        <input
                          type="time"
                          value={newBlockedDate.startTime}
                          onChange={(e) =>
                            setNewBlockedDate({ ...newBlockedDate, startTime: e.target.value })
                          }
                          className="bloqueio-form-input"
                          min="08:00"
                          max="20:00"
                        />
                      </div>
                      <div className="bloqueio-form-campo">
                        <label className="bloqueio-form-label">Horário fim *</label>
                        <input
                          type="time"
                          value={newBlockedDate.endTime}
                          onChange={(e) =>
                            setNewBlockedDate({ ...newBlockedDate, endTime: e.target.value })
                          }
                          className="bloqueio-form-input"
                          min="08:00"
                          max="20:00"
                        />
                      </div>
                    </>
                  )}

                  <div className="bloqueio-form-campo">
                    <label className="bloqueio-form-label">Motivo (opcional)</label>
                    <input
                      type="text"
                      value={newBlockedDate.reason}
                      onChange={(e) =>
                        setNewBlockedDate({ ...newBlockedDate, reason: e.target.value })
                      }
                      placeholder={
                        newBlockedDate.blockType === 'time'
                          ? 'Ex: Reunião, Intervalo...'
                          : 'Ex: Feriado, Manutenção...'
                      }
                      className="bloqueio-form-input"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddBlockedDate}
                  disabled={!isAdmin && !hasPermission('manageBlockedDates')}
                  className="bloqueio-btn"
                >
                  {newBlockedDate.blockType === 'time' ? 'Bloquear Horário' : 'Bloquear Data'}
                </button>

                {!isAdmin && !hasPermission('manageBlockedDates') && (
                  <p className="bloqueio-aviso">Você não tem permissão para bloquear datas</p>
                )}
              </div>

              <div className="datas-bloqueadas-card">
                <h3 className="datas-bloqueadas-titulo">Datas Bloqueadas</h3>

                {loadingBlockedDates ? (
                  <p className="datas-loading">Carregando...</p>
                ) : blockedDates.length === 0 ? (
                  <p className="datas-vazio">Nenhuma data bloqueada.</p>
                ) : (
                  <div className="datas-tabela-container">
                    <table className="datas-tabela">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Horário</th>
                          <th>Barbeiro</th>
                          <th>Motivo</th>
                          <th>Criado em</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockedDates
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .map((blocked) => {
                            const barber = blocked.barberId
                              ? barbers.find((b) => b.id === blocked.barberId)
                              : null;
                            return (
                              <tr key={blocked.id}>
                                <td className="datas-tabela-data">
                                  {blocked.date?.split('-').reverse().join('/')}
                                </td>
                                <td className="datas-tabela-horario">
                                  {blocked.startTime && blocked.endTime ? (
                                    <span
                                      style={{
                                        color: '#ff7a1a',
                                        fontWeight: 500,
                                        fontSize: '0.85rem',
                                      }}
                                    >
                                      🕐 {blocked.startTime} – {blocked.endTime}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#666', fontSize: '0.82rem' }}>
                                      Dia inteiro
                                    </span>
                                  )}
                                </td>
                                <td className="datas-tabela-barbeiro">
                                  {barber ? barber.displayName : 'Todos'}
                                </td>
                                <td className="datas-tabela-motivo">{blocked.reason || '-'}</td>
                                <td className="datas-tabela-criado">
                                  {new Date(blocked.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleRemoveBlockedDate(blocked.id)}
                                      className="datas-btn-desbloquear"
                                    >
                                      Desbloquear
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {showBarberModal && (
        <div className="modal-overlay" onClick={closeBarberModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBarber ? 'Editar Funcionário' : 'Adicionar Funcionário'}</h2>
            <form onSubmit={handleSaveBarber} className="barber-form">
              <Input
                label="Nome"
                value={barberForm.displayName}
                onChange={(e) => handleBarberFormChange('displayName', e.target.value)}
                required
              />
              <Input
                label="Cargo"
                value={barberForm.specialty}
                onChange={(e) => handleBarberFormChange('specialty', e.target.value)}
                placeholder="Ex: Barbeiro Sênior, Recepcionista, etc."
                disabled={editingBarber?.isUserOnly}
              />

              <Input
                label="Salário Fixo (R$)"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 1500.00"
                value={barberForm.salarioFixo}
                onChange={(e) => handleBarberFormChange('salarioFixo', e.target.value)}
              />

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Frequência de Pagamento</label>
                <select
                  value={barberForm.paymentFrequency}
                  onChange={(e) => handleBarberFormChange('paymentFrequency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Foto do Funcionário</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {barberForm.photo && (
                    <img
                      src={barberForm.photo}
                      alt="Preview"
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #333',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="barber-photo-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,122,26,0.5)',
                        color: '#ff7a1a',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: barberPhotoUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: barberPhotoUploading ? 0.6 : 1,
                      }}
                    >
                      {barberPhotoUploading
                        ? '⏳ Enviando...'
                        : '📷 ' + (barberForm.photo ? 'Alterar foto' : 'Enviar foto')}
                    </label>
                    <input
                      id="barber-photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      disabled={barberPhotoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setBarberPhotoUploading(true);
                        try {
                          const url = await uploadImagem(file, 'barbeiros');
                          handleBarberFormChange('photo', url);
                          showToast('Foto enviada!', 'success');
                        } catch (err) {
                          showToast(err.message || 'Erro ao enviar foto.', 'danger');
                        } finally {
                          setBarberPhotoUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                      JPG, PNG, GIF, WebP • Máx. 5MB
                    </p>
                    {barberForm.photo && (
                      <input
                        type="text"
                        value={barberForm.photo}
                        onChange={(e) => handleBarberFormChange('photo', e.target.value)}
                        placeholder="Ou cole a URL aqui"
                        style={{
                          marginTop: '0.5rem',
                          width: '100%',
                          padding: '6px 10px',
                          background: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: 6,
                          color: '#aaa',
                          fontSize: '0.78rem',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {editingBarber?.isUserOnly && (
                <Input
                  label="Telefone WhatsApp"
                  value={barberForm.userPhone}
                  onChange={(e) => handleBarberFormChange('userPhone', e.target.value)}
                  placeholder="(85) 99999-9999"
                />
              )}

              {!editingBarber && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={barberForm.createUser}
                      onChange={(e) => handleBarberFormChange('createUser', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 500, color: '#d4af37' }}>
                      Criar conta de acesso para este funcionário
                    </span>
                  </label>

                  {barberForm.createUser && (
                    <div
                      style={{
                        marginTop: '1rem',
                        paddingLeft: '1.5rem',
                        borderLeft: '2px solid rgba(212, 175, 55, 0.3)',
                      }}
                    >
                      <div style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Tipo de Conta</label>
                        <select
                          value={barberForm.userRole}
                          onChange={(e) => handleBarberFormChange('userRole', e.target.value)}
                          required={barberForm.createUser}
                          className="form-select"
                        >
                          <option value="barber">Barbeiro</option>
                          <option value="receptionist">Recepcionista</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>

                      <Input
                        label="Email de acesso"
                        type="email"
                        value={barberForm.userEmail}
                        onChange={(e) => handleBarberFormChange('userEmail', e.target.value)}
                        required={barberForm.createUser}
                        placeholder="funcionario@exemplo.com"
                      />
                      <Input
                        label="Senha"
                        type="password"
                        value={barberForm.userPassword}
                        onChange={(e) => handleBarberFormChange('userPassword', e.target.value)}
                        required={barberForm.createUser}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <Input
                        label="Telefone WhatsApp"
                        value={barberForm.userPhone}
                        onChange={(e) => handleBarberFormChange('userPhone', e.target.value)}
                        placeholder="(85) 99999-9999"
                      />
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255,255,255,0.6)',
                          marginTop: '0.5rem',
                        }}
                      >
                        O funcionário poderá acessar o painel com este email e senha
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!editingBarber?.isUserOnly && barberForm.userRole === 'barber' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <label
                    className="form-label"
                    style={{
                      marginBottom: '0.6rem',
                      display: 'block',
                      fontWeight: 600,
                      color: '#e0e0e0',
                    }}
                  >
                    SERVIÇOS DE DOMÍNIO DO BARBEIRO
                  </label>
                  {services.length === 0 ? (
                    <p style={{ color: '#666', fontSize: '0.85rem' }}>
                      Nenhum serviço cadastrado ainda.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginTop: '0.4rem',
                      }}
                    >
                      {services.map((service) => {
                        const isSelected = barberForm.serviceIds.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => {
                              handleBarberFormChange(
                                'serviceIds',
                                isSelected
                                  ? barberForm.serviceIds.filter((id) => id !== service.id)
                                  : [...barberForm.serviceIds, service.id],
                              );
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              border: isSelected ? '1.5px solid #ff7a1a' : '1.5px solid #444',
                              background: isSelected ? 'rgba(255,122,26,0.15)' : 'transparent',
                              color: isSelected ? '#ff7a1a' : '#888',
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                            {service.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <Button type="button" onClick={closeBarberModal}>
                  Cancelar
                </Button>
                <Button type="submit">{editingBarber ? 'Atualizar' : 'Adicionar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Agendamento</h2>
            <p className="modal-subtitle">
              Cliente: {editingAppointment?.client.name} | Barbeiro:{' '}
              {editingAppointment?.barber.displayName}
            </p>
            <form onSubmit={handleUpdateAppointment} className="barber-form">
              <Input
                label="Data"
                type="date"
                value={appointmentForm.date}
                onChange={(e) => handleAppointmentFormChange('date', e.target.value)}
                required
              />
              <div>
                <label className="form-label">Horário</label>
                <select
                  value={appointmentForm.time}
                  onChange={(e) => handleAppointmentFormChange('time', e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">Selecione um horário</option>
                  <option value="08:00">08:00</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                  <option value="13:00">13:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>
              <div className="modal-actions">
                <Button type="button" onClick={closeEditModal}>
                  Cancelar
                </Button>
                <Button type="submit">Atualizar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOffScheduleModal && (
        <div className="modal-overlay" onClick={closeOffScheduleModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Agendamento Fora do Horário</h2>
            <p className="modal-subtitle">
              Registre atendimentos feitos fora do horário de funcionamento.
            </p>
            <form onSubmit={handleSubmitOffScheduleAppointment} className="barber-form">
              <div>
                <label className="form-label">Cliente</label>
                <select
                  className="form-select"
                  value={offScheduleForm.clientId}
                  onChange={(e) => handleOffScheduleFormChange('clientId', e.target.value)}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {allUsers
                    .filter((user) => user.role === 'client')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label">Barbeiro</label>
                <select
                  className="form-select"
                  value={offScheduleForm.barberId}
                  onChange={(e) => handleOffScheduleFormChange('barberId', e.target.value)}
                  required
                >
                  <option value="">Selecione um barbeiro</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Data"
                type="date"
                value={offScheduleForm.date}
                onChange={(e) => handleOffScheduleFormChange('date', e.target.value)}
                required
              />

              <div>
                <label className="form-label">Horário</label>
                <select
                  className="form-select"
                  value={offScheduleForm.time}
                  onChange={(e) => handleOffScheduleFormChange('time', e.target.value)}
                  required
                >
                  <option value="">Selecione um horário fora do expediente</option>
                  {offScheduleTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Serviços</label>
                {services.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.85rem' }}>Nenhum serviço cadastrado.</p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginTop: '0.4rem',
                    }}
                  >
                    {services.map((service) => {
                      const isSelected = offScheduleForm.serviceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            handleOffScheduleFormChange(
                              'serviceIds',
                              isSelected
                                ? offScheduleForm.serviceIds.filter((id) => id !== service.id)
                                : [...offScheduleForm.serviceIds, service.id],
                            );
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            border: isSelected ? '1.5px solid #ff7a1a' : '1.5px solid #444',
                            background: isSelected ? 'rgba(255,122,26,0.15)' : 'transparent',
                            color: isSelected ? '#ff7a1a' : '#888',
                            fontSize: '0.82rem',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                          {service.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Observação</label>
                <textarea
                  value={offScheduleForm.notes}
                  onChange={(e) => handleOffScheduleFormChange('notes', e.target.value)}
                  placeholder="Ex.: cliente chegou após o fechamento"
                  rows="3"
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions">
                <Button type="button" onClick={closeOffScheduleModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={offScheduleSaving}>
                  {offScheduleSaving ? 'Registrando...' : 'Registrar atendimento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChangeBarberModal && (
        <div className="modal-overlay" onClick={closeChangeBarberModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Alterar Barbeiro do Agendamento</h2>
            <p className="modal-subtitle">
              Cliente: {selectedAppointmentForBarberChange?.client.name}
            </p>
            <p className="modal-subtitle">
              Barbeiro atual: {selectedAppointmentForBarberChange?.barber.displayName}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChangeBarber();
              }}
              className="barber-form"
            >
              <div>
                <label className="form-label">Novo Barbeiro</label>
                <select
                  value={newBarberId}
                  onChange={(e) => setNewBarberId(e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">Selecione um barbeiro</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <Button type="button" onClick={closeChangeBarberModal}>
                  Cancelar
                </Button>
                <Button type="submit">Alterar Barbeiro</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? 'Editar Produto' : 'Adicionar Produto'}</h2>
            <form onSubmit={handleSaveProduct} className="barber-form">
              <Input
                label="Nome do Produto"
                value={productForm.name}
                onChange={(e) => handleProductFormChange('name', e.target.value)}
                required
              />
              <div>
                <label className="form-label">Categoria</label>
                <select
                  value={productForm.category}
                  onChange={(e) => handleProductFormChange('category', e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Pomadas">Pomadas</option>
                  <option value="Óleos">Óleos</option>
                  <option value="Cuidados">Cuidados</option>
                  <option value="Acessórios">Acessórios</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="form-label">Descrição</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => handleProductFormChange('description', e.target.value)}
                  placeholder="Descrição do produto"
                  rows="3"
                  className="form-textarea"
                />
              </div>
              <Input
                label="Preço (apenas números)"
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) => handleProductFormChange('price', e.target.value)}
                placeholder="40.00"
                required
              />
              <Input
                label="Desconto para Assinantes (%)"
                type="number"
                min="0"
                max="100"
                value={productForm.subscriberDiscount}
                onChange={(e) => handleProductFormChange('subscriberDiscount', e.target.value)}
                placeholder="0"
              />
              <Input
                label="Estoque"
                type="number"
                min="0"
                value={productForm.stock}
                onChange={(e) => handleProductFormChange('stock', e.target.value)}
                required
              />

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Imagem do Produto</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {productForm.imageUrl && (
                    <img
                      src={productForm.imageUrl}
                      alt="Preview"
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #333',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="product-image-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,122,26,0.5)',
                        color: '#ff7a1a',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: productImageUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: productImageUploading ? 0.6 : 1,
                      }}
                    >
                      {productImageUploading
                        ? '⏳ Enviando...'
                        : '🖼️ ' + (productForm.imageUrl ? 'Alterar imagem' : 'Enviar imagem')}
                    </label>
                    <input
                      id="product-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      disabled={productImageUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setProductImageUploading(true);
                        try {
                          const url = await uploadImagem(file, 'produtos');
                          handleProductFormChange('imageUrl', url);
                          showToast('Imagem enviada!', 'success');
                        } catch (err) {
                          showToast(err.message || 'Erro ao enviar imagem.', 'danger');
                        } finally {
                          setProductImageUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                      JPG, PNG, GIF, WebP • Máx. 5MB
                    </p>
                    <input
                      type="text"
                      value={productForm.imageUrl}
                      onChange={(e) => handleProductFormChange('image', e.target.value)}
                      placeholder="Ou cole a URL aqui"
                      style={{
                        marginTop: '0.5rem',
                        width: '100%',
                        padding: '6px 10px',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: 6,
                        color: '#aaa',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <Button type="button" onClick={closeProductModal}>
                  Cancelar
                </Button>
                <Button type="submit">{editingProduct ? 'Atualizar' : 'Adicionar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBenefitModal && (
        <div className="modal-overlay" onClick={closeBenefitModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBenefit ? '✏️ Editar Benefício' : '➕ Adicionar Benefício'}</h2>
            <form onSubmit={handleSaveBenefit} className="barber-form">
              <div>
                <label className="form-label">Serviço vinculado (opcional)</label>
                <select
                  value={benefitServiceId}
                  onChange={(e) => setBenefitServiceId(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="">Nenhum (benefício textual)</option>
                  {services
                    .slice()
                    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '6px' }}>
                  Ao selecionar um serviço, ele será coberto pelo plano no agendamento.
                </p>
              </div>
              <div>
                <label className="form-label">Descrição do Benefício</label>
                <textarea
                  value={benefitForm}
                  onChange={(e) => setBenefitForm(e.target.value)}
                  placeholder="Ex.: 2 cortes por mês | Brinde especial | Desconto em produtos"
                  required={!benefitServiceId}
                  disabled={!!benefitServiceId}
                  rows="3"
                  className="form-textarea"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: benefitServiceId ? '#121212' : '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: benefitServiceId ? '#666' : '#fff',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '6px' }}>
                  Evite quebras de linha e espaços duplicados – eles serão removidos automaticamente.
                </p>
              </div>
              <div className="modal-actions">
                <Button type="button" onClick={closeBenefitModal}>
                  Cancelar
                </Button>
                <Button type="submit">{editingBenefit ? 'Atualizar' : 'Adicionar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="modal-overlay" onClick={closePlanModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
            <form onSubmit={handleSavePlan} className="barber-form">
              <Input
                label="Nome do Plano"
                value={planForm.name}
                onChange={(e) => handlePlanFormChange('name', e.target.value)}
                placeholder="Ex: Plano Premium"
                required
              />

              <Input
                label="Preço (R$)"
                type="number"
                min="0"
                step="0.01"
                value={planForm.price}
                onChange={(e) => handlePlanFormChange('price', e.target.value)}
                placeholder="Ex: 99.90"
                required
              />

              <Input
                label="ID do plano na Stripe"
                value={planForm.mpPreapprovalPlanId}
                onChange={(e) => handlePlanFormChange('mpPreapprovalPlanId', e.target.value)}
                placeholder="Ex: plan_123456"
              />

              <Input
                label="Link de assinatura (Stripe)"
                value={planForm.mpSubscriptionUrl}
                onChange={(e) => handlePlanFormChange('mpSubscriptionUrl', e.target.value)}
                placeholder="Ex: https://buy.stripe.com/..."
              />

              <div className="modal-actions">
                <Button type="button" onClick={closePlanModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={planSaving}>
                  {planSaving ? 'Salvando...' : editingPlan ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="modal-overlay" onClick={closeServiceModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
            </div>

            <form onSubmit={handleSaveService} className="modal-form">
              <Input
                label="Nome do Serviço"
                value={serviceForm.name}
                onChange={(e) => handleServiceFormChange('name', e.target.value)}
                required
              />

              <Input
                label="Preço"
                type="number"
                step="0.01"
                min="0"
                value={serviceForm.price}
                onChange={(e) => handleServiceFormChange('price', e.target.value)}
                placeholder="40.00"
                required
              />

              <Input
                label="Porcentagem da Comissão (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={serviceForm.commissionPercent}
                onChange={(e) => handleServiceFormChange('commissionPercent', e.target.value)}
                placeholder="50"
                required
              />

              {/* <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={serviceForm.coveredByPlan}
                    onChange={(e) => handleServiceFormChange('coveredByPlan', e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#d4af37',
                    }}
                  />
                  <span
                    style={{
                      color: '#d4af37',
                      fontWeight: '500',
                      fontSize: '0.95rem',
                    }}
                  >
                    ✓ Coberto pela assinatura
                  </span>
                </label>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#888',
                    marginTop: '0.5rem',
                    marginLeft: '0.5rem',
                  }}
                >
                  Quando marcado, usuários com plano ativo verão "Coberto pela assinatura" ao invés
                  do preço
                </p>
              </div> */}

              {!serviceForm.coveredByPlan && (
                <div style={{ marginBottom: '1rem' }}>
                  <Input
                    label="Preço Promocional (opcional)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceForm.promotionalPrice}
                    onChange={(e) => handleServiceFormChange('promotionalPrice', e.target.value)}
                    placeholder="30.00"
                  />
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: '#888',
                      marginTop: '0.5rem',
                      marginLeft: '0.5rem',
                    }}
                  >
                    Se preenchido, o preço normal aparecerá riscado e o promocional em destaque
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Imagem do Serviço</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {serviceForm.image && (
                    <img
                      src={serviceForm.image}
                      alt="Preview"
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #333',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="service-image-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,122,26,0.5)',
                        color: '#ff7a1a',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: serviceImageUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: serviceImageUploading ? 0.6 : 1,
                      }}
                    >
                      {serviceImageUploading
                        ? '⏳ Enviando...'
                        : '🖼️ ' + (serviceForm.image ? 'Alterar imagem' : 'Enviar imagem')}
                    </label>
                    <input
                      id="service-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      disabled={serviceImageUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setServiceImageUploading(true);
                        try {
                          const url = await uploadImagem(file, 'servicos');
                          handleServiceFormChange('image', url);
                          showToast('Imagem enviada!', 'success');
                        } catch (err) {
                          showToast(err.message || 'Erro ao enviar imagem.', 'danger');
                        } finally {
                          setServiceImageUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                      JPG, PNG, GIF, WebP • Máx. 5MB
                    </p>
                    <input
                      type="text"
                      value={serviceForm.image}
                      onChange={(e) => handleServiceFormChange('image', e.target.value)}
                      placeholder="Ou cole a URL aqui"
                      style={{
                        marginTop: '0.5rem',
                        width: '100%',
                        padding: '6px 10px',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: 6,
                        color: '#aaa',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              <Input
                label="Duração (minutos)"
                type="number"
                min="15"
                step="15"
                value={serviceForm.duration}
                onChange={(e) => handleServiceFormChange('duration', e.target.value)}
                required
              />

              <div className="modal-actions">
                <Button type="button" onClick={closeServiceModal} className="btn-cancel">
                  Cancelar
                </Button>
                <Button type="submit">{editingService ? 'Atualizar' : 'Adicionar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUserPermissions && (
        <div className="modal-overlay" onClick={closePermissionsModal}>
          <div className="modal-permissions" onClick={(e) => e.stopPropagation()}>
            <div className="modal-permissions-header">
              <h3>🔐 Gerenciar Permissões</h3>
              <p className="modal-permissions-subtitle">
                {selectedUserPermissions.name} -{' '}
                {selectedUserPermissions.role === 'admin'
                  ? '👑 Administrador'
                  : selectedUserPermissions.role === 'receptionist'
                    ? '📋 Recepcionista'
                    : selectedUserPermissions.role === 'barber'
                      ? '✂️ Barbeiro'
                      : selectedUserPermissions.role}
              </p>
            </div>

            {selectedUserPermissions.role === 'admin' ? (
              <div className="modal-permissions-body">
                <div className="permission-admin-full-notice">
                  <h4>Administrador do Sistema</h4>
                  <p>Este usuário possui acesso total a todas as funcionalidades.</p>
                </div>
              </div>
            ) : (
              <div className="modal-permissions-body">
                {Object.entries(
                  Object.entries(permissionsConfig).reduce((acc, [key, config]) => {
                    if (!acc[config.category]) acc[config.category] = [];
                    acc[config.category].push([key, config]);
                    return acc;
                  }, {}),
                ).map(([category, permissions]) => (
                  <div key={category} className="permission-category">
                    <h4 className="permission-category-title">{category}</h4>
                    <div className="permission-checkboxes">
                      {permissions.map(([key, config]) => (
                        <label key={key} className="permission-checkbox-label">
                          <input
                            type="checkbox"
                            checked={editingPermissions[key] || false}
                            onChange={() => togglePermission(key)}
                            className="permission-checkbox"
                          />
                          <span className="permission-checkbox-custom"></span>
                          <span className="permission-label-text">
                            <span className="permission-icon">{config.icon}</span>
                            {config.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-permissions-footer">
              <button onClick={closePermissionsModal} className="btn-cancel">
                Cancelar
              </button>
              {selectedUserPermissions.role !== 'admin' && (
                <button onClick={handleSavePermissions} className="btn-save-permissions">
                  Salvar Permissões
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showGalleryModal && (
        <div className="modal-overlay" onClick={closeGalleryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGalleryImage ? '✏️ Editar Foto' : '➕ Adicionar Foto'}</h2>
            </div>
            <form onSubmit={handleSaveGalleryImage} className="modal-form">
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Imagem da Galeria *</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {galleryForm.url && (
                    <img
                      src={galleryForm.url}
                      alt="Preview"
                      style={{
                        width: 72,
                        height: 72,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #333',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <label
                      htmlFor="gallery-image-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,122,26,0.5)',
                        color: '#ff7a1a',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        cursor: galleryImageUploading ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: galleryImageUploading ? 0.6 : 1,
                      }}
                    >
                      {galleryImageUploading
                        ? '⏳ Enviando...'
                        : '🖼️ ' + (galleryForm.url ? 'Alterar imagem' : 'Enviar imagem')}
                    </label>
                    <input
                      id="gallery-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      disabled={galleryImageUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setGalleryImageUploading(true);
                        try {
                          const url = await uploadImagem(file, 'galeria');
                          handleGalleryFormChange('url', url);
                          showToast('Imagem enviada!', 'success');
                        } catch (err) {
                          showToast(err.message || 'Erro ao enviar imagem.', 'danger');
                        } finally {
                          setGalleryImageUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                      JPG, PNG, GIF, WebP • Máx. 5MB
                    </p>
                    <input
                      type="text"
                      value={galleryForm.url}
                      onChange={(e) => handleGalleryFormChange('url', e.target.value)}
                      placeholder="Ou cole a URL aqui"
                      style={{
                        marginTop: '0.5rem',
                        width: '100%',
                        padding: '6px 10px',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: 6,
                        color: '#aaa',
                        fontSize: '0.78rem',
                      }}
                    />
                  </div>
                </div>
              </div>
              <Input
                label="Descrição/Alt Text"
                value={galleryForm.alt}
                onChange={(e) => handleGalleryFormChange('alt', e.target.value)}
                placeholder="Ex: Corte masculino degradê"
              />
              <div className="modal-actions">
                <Button type="button" onClick={closeGalleryModal} className="btn-cancel">
                  Cancelar
                </Button>
                <Button type="submit">{editingGalleryImage ? 'Atualizar' : 'Adicionar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetPasswordModal && resetPasswordUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={closeResetPasswordModal}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ color: '#fff', fontSize: '1.05rem', margin: 0 }}>
                  🔑 Redefinir Senha
                </h2>
                <p style={{ color: '#888', fontSize: '0.8rem', margin: '4px 0 0' }}>
                  Usuário: <strong style={{ color: '#ff7a1a' }}>{resetPasswordUser.name}</strong>
                </p>
              </div>
              <button
                onClick={closeResetPasswordModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleResetPassword}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    color: '#888',
                    fontSize: '0.82rem',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Nova senha *
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) =>
                    setResetPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    color: '#888',
                    fontSize: '0.82rem',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Confirmar nova senha *
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="Repita a senha"
                  required
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {resetPasswordForm.confirmPassword &&
                  resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword && (
                    <span
                      style={{
                        color: '#e74c3c',
                        fontSize: '0.78rem',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      As senhas não coincidem.
                    </span>
                  )}
              </div>

              <div
                style={{
                  background: 'rgba(255,122,26,0.07)',
                  border: '1px solid rgba(255,122,26,0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginTop: '0.25rem',
                }}
              >
                <p style={{ color: '#ff7a1a', fontSize: '0.78rem', margin: 0 }}>
                  ⚠️ Após redefinir, informe a nova senha ao usuário para que ele possa acessar o
                  sistema.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={closeResetPasswordModal}
                  style={{
                    background: 'transparent',
                    border: '1px solid #333',
                    color: '#a8a8a8',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordLoading}
                  style={{
                    background: 'linear-gradient(135deg, #ff7a1a, #e06010)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    cursor: resetPasswordLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    opacity: resetPasswordLoading ? 0.7 : 1,
                  }}
                >
                  {resetPasswordLoading ? 'Salvando...' : 'Redefinir Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {confirmModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <h3 style={{ color: '#fff', margin: '0 0 0.75rem', fontSize: '1rem' }}>
              Confirmar ação
            </h3>
            <p style={{ color: '#a8a8a8', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeConfirmModal}
                style={{
                  background: 'transparent',
                  border: '1px solid #333',
                  color: '#a8a8a8',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  closeConfirmModal();
                }}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancelSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <h3 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
              Cancelar plano
            </h3>
            <p style={{ color: '#a8a8a8', fontSize: '0.9rem', margin: '0 0 0.4rem' }}>
              Tem certeza que deseja cancelar o plano{' '}
              <strong style={{ color: '#ff7a1a' }}>{confirmCancelSub.planName}</strong> de{' '}
              <strong style={{ color: '#fff' }}>{confirmCancelSub.userName}</strong>?
            </p>
            <p style={{ color: '#a8a8a8', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
              O plano permanece ativo até{' '}
              <strong style={{ color: '#fff' }}>
                {confirmCancelSub.nextBillingDate
                  ? new Date(confirmCancelSub.nextBillingDate).toLocaleDateString('pt-BR')
                  : 'data não definida'}
              </strong>{' '}
              e não será renovado. O cliente será notificado via WhatsApp.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmCancelSub(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #333',
                  color: '#a8a8a8',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Voltar
              </button>
              <button
                onClick={confirmCancelSubscription}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {showValeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowValeModal(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>💸 Registrar Vale</h2>
              <button
                onClick={() => setShowValeModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSaveVale}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    color: '#888',
                    fontSize: '0.82rem',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Funcionário *
                </label>
                <select
                  value={valeForm.employeeId}
                  onChange={(e) => setValeForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="">Selecione o funcionário</option>
                  {employees
                    .filter((e) => e.role === 'barber' || e.role === 'receptionist')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    color: '#888',
                    fontSize: '0.82rem',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valeForm.valor}
                  onChange={(e) => setValeForm((prev) => ({ ...prev, valor: e.target.value }))}
                  required
                  placeholder="Ex: 50.00"
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: '#888',
                    fontSize: '0.82rem',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Data
                </label>
                <input
                  type="date"
                  value={valeForm.data}
                  onChange={(e) => setValeForm((prev) => ({ ...prev, data: e.target.value }))}
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: '#888',
                    fontSize: '0.82rem',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Observação
                </label>
                <input
                  type="text"
                  value={valeForm.observacao}
                  onChange={(e) => setValeForm((prev) => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Ex: Adiantamento, transporte..."
                  style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowValeModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #333',
                    color: '#a8a8a8',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37, #b8932a)',
                    border: 'none',
                    color: '#000',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                  }}
                >
                  Registrar Vale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </BaseLayout>
  );
}
