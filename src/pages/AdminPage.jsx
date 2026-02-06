import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import { getSession, logout } from '../services/authService';
import { getUserById } from '../services/userServices';
import { getTermsDocument, uploadTermsDocument, deleteTermsDocument } from '../services/termsService';
import { getBarbers, createBarber, updateBarber, deleteBarber } from '../services/barberServices';
import {
  getAppointments,
  deleteAppointment,
  updateAppointment,
} from '../services/appointmentService';
import {
  buscarTodasAssinaturas,
  buscarTodosPagamentosAgendamentos,
  atualizarPagamentoAgendamento,
} from '../services/paymentService';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService';
import { getPixKey, savePixKey } from '../services/settingsService';
import './AuthPages.css';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
} from '../services/serviceServices';

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUser = getSession();
  const [uploadedTermsDoc, setUploadedTermsDoc] = useState(null);
  const [termsDocUrl, setTermsDocUrl] = useState('');
  const [activeTab, setActiveTab] = useState('employees');
  const [barbers, setBarbers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [appointmentPayments, setAppointmentPayments] = useState([]);
  const [clientSubscriptionStatus, setClientSubscriptionStatus] = useState({});
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: '',
    promotionalPrice: '',
    coveredByPlan: false,
    image: '',
    duration: 30,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [pixKey, setPixKey] = useState('');
  const [pixKeySaved, setPixKeySaved] = useState('');
  const [pixKeyValidation, setPixKeyValidation] = useState({ isValid: false, type: '', message: '' });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberForm, setBarberForm] = useState({
    name: '',
    specialty: '',
    photo: '',
    commissionPercent: 50,
    createUser: false,
    userEmail: '',
    userPassword: '',
    userPhone: '',
    userRole: 'barber',
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
    image: '',
  });

  const [expandedBarbers, setExpandedBarbers] = useState({});
  const [showChangeBarberModal, setShowChangeBarberModal] = useState(false);
  const [selectedAppointmentForBarberChange, setSelectedAppointmentForBarberChange] = useState(null);
  const [newBarberId, setNewBarberId] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '' });

 
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [selectedPlanForBenefit, setSelectedPlanForBenefit] = useState(null);
  const [benefitForm, setBenefitForm] = useState('');

  
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState({});

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
  const isReceptionist = currentUser?.role === 'receptionist';
  const hasAdminVisibility = isAdmin || isReceptionist || (currentUser?.permissions?.viewAdmin);

  
  const permissionsConfig = {
    viewAdmin: { label: 'Acessar Painel Admin', category: 'Acesso Básico', icon: '🔓' },
    manageEmployees: { label: 'Gerenciar Funcionários', category: 'Gestão de Pessoas', icon: '👥' },
    manageProducts: { label: 'Visualizar Aba Produtos', category: 'Gestão de Produtos', icon: '🛍️' },
    addProducts: { label: 'Adicionar Novos Produtos', category: 'Gestão de Produtos', icon: '➕' },
    editProducts: { label: 'Editar/Excluir Produtos', category: 'Gestão de Produtos', icon: '✏️' },
    manageServices: { label: 'Visualizar Aba Serviços', category: 'Gestão de Serviços', icon: '✂️' },
    addServices: { label: 'Adicionar Novos Serviços', category: 'Gestão de Serviços', icon: '➕' },
    editServices: { label: 'Editar/Excluir Serviços', category: 'Gestão de Serviços', icon: '✏️' },
    managePayments: { label: 'Ver Relatórios de Pagamentos', category: 'Financeiro', icon: '💰' },
    manageAgendamentos: { label: 'Ver Aba Agendamentos', category: 'Agendamentos', icon: '📅' },
    manageBenefits: { label: 'Gerenciar Benefícios dos Planos', category: 'Configurações', icon: '🎁' },
    manageSettings: { label: 'Alterar Configurações (PIX, Termos)', category: 'Configurações', icon: '⚙️' },
  };

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.isAdmin === true) return true;
    return currentUser.permissions?.[permission] === true;
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
    if (phoneRegex.test(cleanKey)) return { isValid: true, type: 'Telefone', message: 'Telefone válido' };
    const randomKeyRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (randomKeyRegex.test(key)) return { isValid: true, type: 'Chave Aleatória', message: 'Chave aleatória válida' };
    return { isValid: false, message: 'Formato inválido. Use CPF, CNPJ, Email, Telefone ou Chave Aleatória', type: '' };
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

  const sendWhatsApp = async (appointmentId, type) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;
      const userData = await getUserById(appointment.clientId);
      if (!userData || !userData.phone) {
        showToast('Cliente não possui telefone cadastrado.', 'danger');
        return;
      }
      const phone = userData.phone.replace(/\D/g, '');
      const date = new Date(appointment.date).toLocaleDateString('pt-BR');
      const serviceName = Array.isArray(appointment.services)
        ? appointment.services.map((s) => s.name).join(', ')
        : 'Serviço';
      let message;
      if (type === 'confirm') {
        message = `Olá ${appointment.client}! Estamos entrando em contato para CONFIRMAR seu agendamento de ${date} às ${appointment.time}: ${serviceName} com ${appointment.barberName}. Por favor, responda esta mensagem para confirmar sua presença.`;
      } else if (type === 'cancel') {
        message = `Olá ${appointment.client}! Informamos que infelizmente precisaremos realizar o CANCELAMENTO do seu agendamento de ${date} às ${appointment.time}: ${serviceName}. Nossas desculpas pelo transtorno. Entre em contato conosco para reagendar.`;
      }
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodedMessage}`;
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

  async function loadData() {
    try {
      const [barbersData, appointmentsData, subscriptionsData, paymentsData, productsData, servicesData] = await Promise.all([
        getBarbers(),
        getAppointments(),
        buscarTodasAssinaturas(),
        buscarTodosPagamentosAgendamentos(),
        getProducts(),
        getAllServices(),
      ]);
      const usersResponse = await fetch('http://localhost:3000/users');
      const allUsers = await usersResponse.json();
      const allEmployees = allUsers.filter(
        (user) => user.role === 'barber' || user.role === 'receptionist' || user.role === 'admin'
      );
      
     
      const subscriptionStatusMap = {};
      subscriptionsData.forEach(sub => {
        if (sub.status === 'active') {
          subscriptionStatusMap[sub.userId] = true;
        }
      });
      
      setBarbers(barbersData);
      setEmployees(allEmployees);
      setAppointments(appointmentsData);
      setSubscriptions(subscriptionsData);
      setAppointmentPayments(paymentsData);
      setProducts(productsData);
      setServices(servicesData);
      setClientSubscriptionStatus(subscriptionStatusMap);
    } catch (error) {
      console.error('Erro ao carregar dados', error);
    } finally {
      setLoading(false);
    }
  }

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const response = await fetch('http://localhost:3000/subscriptionPlans');
      
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
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const hasAccess = isAdmin || isReceptionist || currentUser?.permissions?.viewAdmin;
    if (!hasAccess) {
      navigate('/appointments');
      return;
    }
    loadData();
  }, [currentUser, isAdmin, isReceptionist, navigate]);

  useEffect(() => {
    if (activeTab === 'benefits' && hasAdminVisibility && plans.length === 0) {
      console.log('🔄 Carregando planos pela primeira vez...');
      loadPlans();
    }
  }, [activeTab, hasAdminVisibility, plans.length, loadPlans]);

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

  
  const openPermissionsModal = (user) => {
    setSelectedUserPermissions(user);
    const defaultPermissions = {};
    Object.keys(permissionsConfig).forEach(key => {
      defaultPermissions[key] = user.permissions?.[key] || false;
    });
    setEditingPermissions(defaultPermissions);
  };

  const closePermissionsModal = () => {
    setSelectedUserPermissions(null);
    setEditingPermissions({});
  };

  const togglePermission = (permissionKey) => {
    setEditingPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) {
      showToast('Apenas administradores podem alterar permissões.', 'danger');
      return;
    }
    try {
      await fetch(`http://localhost:3000/users/${selectedUserPermissions.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissions })
      });
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
        name: employee.name,
        specialty: employee.role === 'admin' ? 'Administrador' : 'Recepcionista',
        photo: employee.photo || '',
        commissionPercent: 50,
        createUser: false,
        userEmail: employee.email || '',
        userPassword: '',
        userPhone: employee.phone || '',
        userRole: employee.role,
      });
    } else if (barber) {
      setEditingBarber(barber);
      setBarberForm({
        name: barber.name,
        specialty: barber.specialty,
        photo: barber.photo,
        commissionPercent: barber.commissionPercent || 50,
        createUser: false,
        userEmail: '',
        userPassword: '',
        userPhone: '',
        userRole: 'barber',
      });
    } else {
      setEditingBarber(null);
      setBarberForm({
        name: '',
        specialty: '',
        photo: '',
        commissionPercent: 50,
        createUser: false,
        userEmail: '',
        userPassword: '',
        userPhone: '',
        userRole: 'barber',
      });
    }
    setShowBarberModal(true);
  };

  const closeBarberModal = () => {
    setShowBarberModal(false);
    setEditingBarber(null);
    setBarberForm({
      name: '',
      specialty: '',
      photo: '',
      commissionPercent: 50,
      createUser: false,
      userEmail: '',
      userPassword: '',
      userPhone: '',
      userRole: 'barber',
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
    if (!barberForm.name.trim()) {
      showToast('O nome do funcionário é obrigatório.', 'danger');
      return;
    }
    try {
      let userId = null;
      if (editingBarber?.isUserOnly) {
        const userData = {
          name: barberForm.name,
          photo: barberForm.photo,
          phone: barberForm.userPhone,
          role: barberForm.userRole,
          isAdmin: barberForm.userRole === 'admin',
        };
        await fetch(`http://localhost:3000/users/${editingBarber.userId}`, {
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
        const checkEmailResponse = await fetch('http://localhost:3000/users');
        const allUsers = await checkEmailResponse.json();
        const emailExists = allUsers.some((u) => u.email === barberForm.userEmail);
        if (emailExists) {
          showToast('Este email já está cadastrado.', 'danger');
          return;
        }
        const newUser = {
          name: barberForm.name,
          email: barberForm.userEmail,
          password: barberForm.userPassword,
          phone: barberForm.userPhone,
          photo: barberForm.photo,
          role: barberForm.userRole,
          isAdmin: barberForm.userRole === 'admin',
          createdAt: new Date().toISOString(),
        };
        const userResponse = await fetch('http://localhost:3000/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        });
        if (!userResponse.ok) throw new Error('Erro ao criar usuário');
        const createdUser = await userResponse.json();
        userId = createdUser.id;
      }
      if (barberForm.userRole === 'barber' || !barberForm.createUser) {
        const barberData = {
          name: barberForm.name,
          specialty: barberForm.specialty,
          photo: barberForm.photo,
          commissionPercent: barberForm.commissionPercent,
          userId: userId,
        };
        if (editingBarber && !editingBarber.isUserOnly) {
          await updateBarber(editingBarber.id, barberData);
          if (editingBarber.userId) {
            await fetch(`http://localhost:3000/users/${editingBarber.userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: barberForm.name,
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
            'success'
          );
        }
      } else {
        const roleText = barberForm.userRole === 'admin' ? 'Administrador' : 'Recepcionista';
        showToast(`${roleText} criado com sucesso!`, 'success');
      }
      await loadData();
      closeBarberModal();
    } catch (error) {
      showToast('Erro ao salvar funcionário. Tente novamente.', 'danger');
    }
  };

  const handleDeleteBarber = async (id, isUserOnly = false) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem excluir funcionários.', 'danger');
      return;
    }
    if (!confirm('Deseja realmente excluir este funcionário?')) return;
    try {
      if (isUserOnly) {
        await fetch(`http://localhost:3000/users/${id}`, { method: 'DELETE' });
      } else {
        await deleteBarber(id);
        const barber = barbers.find((b) => b.id === id);
        if (barber?.userId) {
          await fetch(`http://localhost:3000/users/${barber.userId}`, { method: 'DELETE' });
        }
      }
      await loadData();
      showToast('Funcionário excluído com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir funcionário.', 'danger');
    }
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

  const handleRemoveTermsDoc = async () => {
    if (!confirm('Deseja realmente remover o documento de termos?')) return;
    
    try {
      await deleteTermsDocument();
      setTermsDocUrl('');
      setUploadedTermsDoc(null);
      showToast('Documento removido com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover documento:', error);
      showToast('Erro ao remover documento', 'danger');
    }
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
        image: product.image,
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
        image: '',
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
      image: '',
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
        ...productForm,
        price: `R$ ${parseFloat(productForm.price).toFixed(2)}`,
        subscriberDiscount: parseInt(productForm.subscriberDiscount) || 0,
        stock: parseInt(productForm.stock) || 0,
      };
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        showToast('Produto atualizado com sucesso!', 'success');
      } else {
        await createProduct(productData);
        showToast('Produto adicionado com sucesso!', 'success');
      }
      await loadData();
      closeProductModal();
    } catch (error) {
      showToast('Erro ao salvar produto. Tente novamente.', 'danger');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!hasPermission('editProducts')) {
      showToast('Você não tem permissão para excluir produtos.', 'danger');
      return;
    }
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      await deleteProduct(id);
      await loadData();
      showToast('Produto excluído com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir produto.', 'danger');
    }
  };

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      const updatedAppointment = { ...appointment, status: 'confirmed' };
      await updateAppointment(appointmentId, updatedAppointment);
      await loadData();
      showToast('Agendamento confirmado!', 'success');
    } catch (error) {
      showToast('Erro ao confirmar agendamento.', 'danger');
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

  const handleDeleteAppointment = async (id) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    try {
      await deleteAppointment(id);
      await loadData();
      showToast('Agendamento cancelado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao cancelar agendamento.', 'danger');
    }
  };

  const handleMarkAsPaid = async (payment, method) => {
    try {
      await atualizarPagamentoAgendamento(payment.id, {
        status: 'paid',
        paymentMethod: method,
        paidAt: new Date().toISOString(),
      });
      await loadData();
      showToast('Pagamento marcado como pago!', 'success');
    } catch (error) {
      showToast('Erro ao atualizar pagamento.', 'danger');
    }
  };

  const toggleBarberExpansion = (barberId) => {
    setExpandedBarbers((prev) => ({ ...prev, [barberId]: !prev[barberId] }));
  };

  const getAppointmentsByBarber = (barberId) => {
    return appointments
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
        barberName: newBarber.name,
      };
      await updateAppointment(selectedAppointmentForBarberChange.id, updatedAppointment);
      await loadData();
      showToast(`Agendamento transferido para ${newBarber.name}!`, 'success');
      closeChangeBarberModal();
    } catch (error) {
      showToast('Erro ao alterar barbeiro.', 'danger');
    }
  };

  const calculateTotal = (services) => {
    return services.reduce((sum, service) => {
      const price = Number(String(service.price ?? 0).replace('R$', '').replace(/\./g, '').replace(',', '.'));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const calculateBarberStats = (barberId) => {
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

  const filterPaymentsByMonth = (payments) => {
    if (!selectedMonth) return payments;
    const [year, month] = selectedMonth.split('-');
    return payments.filter((payment) => {
      const paymentDate = new Date(
        payment.createdAt || payment.appointmentDate || payment.date || payment.startDate || payment.nextPaymentDate
      );
      return paymentDate.getFullYear() === parseInt(year) && paymentDate.getMonth() + 1 === parseInt(month);
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
      count: { pix: 0, credito: 0, debito: 0, dinheiro: 0, cartao: 0 },
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
      if (amount > 0) {
        stats.total += amount;
        const method = payment.paymentMethod?.toLowerCase();
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

  const filteredAppointmentPayments = filterPaymentsByMonth(appointmentPayments);

  const calculateMonthlyTotals = () => {
    const pendingAppointments = filteredAppointmentPayments
      .filter((p) => p.status === 'pending' || p.status === 'pendinglocal')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const paidAppointments = filteredAppointmentPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const filteredSubscriptions = filterPaymentsByMonth(subscriptions);
    const paidSubscriptions = filteredSubscriptions.reduce(
      (sum, sub) => sum + parseFloat(sub.amount || sub.planPrice || 0),
      0
    );
    return {
      pending: pendingAppointments,
      paid: paidAppointments + paidSubscriptions,
      total: pendingAppointments + paidAppointments + paidSubscriptions,
    };
  };

  const paymentStats = calculatePaymentStats(filteredAppointmentPayments);

  const pendingPayments = filteredAppointmentPayments.filter((p) => p.status === 'pending' || p.status === 'pendinglocal');

  const paidPayments = filteredAppointmentPayments.filter((p) => p.status === 'paid');

  const openBenefitModal = (planId, benefit = null, benefitIndex = null) => {
    setSelectedPlanForBenefit({ planId, benefitIndex });
    setEditingBenefit(benefit);
    setBenefitForm(benefit || '');
    setShowBenefitModal(true);
  };

  const closeBenefitModal = () => {
    setShowBenefitModal(false);
    setEditingBenefit(null);
    setSelectedPlanForBenefit(null);
    setBenefitForm('');
  };

  const handleSaveBenefit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Apenas administradores podem gerenciar benefícios.', 'danger');
      return;
    }
    if (!benefitForm.trim()) {
      showToast('Digite um benefício válido.', 'danger');
      return;
    }
    try {
      const plan = plans.find((p) => p.id === selectedPlanForBenefit.planId);
      if (!plan) return;
      let updatedFeatures = [...plan.features];
      if (selectedPlanForBenefit.benefitIndex !== null) {
        updatedFeatures[selectedPlanForBenefit.benefitIndex] = benefitForm.trim();
      } else {
        updatedFeatures.push(benefitForm.trim());
      }
      await fetch(`http://localhost:3000/subscriptionPlans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  const handleDeleteBenefit = async (planId, benefitIndex) => {
    if (!isAdmin) {
      showToast('Apenas administradores podem excluir benefícios.', 'danger');
      return;
    }
    if (!confirm('Deseja realmente excluir este benefício?')) return;
    try {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return;
      const updatedFeatures = plan.features.filter((_, idx) => idx !== benefitIndex);
      await fetch(`http://localhost:3000/subscriptionPlans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: updatedFeatures }),
      });
      await loadPlans();
      showToast('Benefício excluído com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir benefício.', 'danger');
    }
  };

  const loadServices = useCallback(async () => {
    try {
      const data = await getAllServices();
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
      
      const priceValue = service.price.replace(/,/g, '.').replace(/R\$/g, '').trim();
      const promotionalPriceValue = service.promotionalPrice 
        ? service.promotionalPrice.replace(/,/g, '.').replace(/R\$/g, '').trim()
        : '';
      
      setServiceForm({
        name: service.name,
        price: priceValue,
        promotionalPrice: promotionalPriceValue,
        coveredByPlan: service.coveredByPlan || false,
        image: service.image || '',
        duration: service.duration || 30,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: '',
        price: '',
        promotionalPrice: '',
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
      coveredByPlan: false,
      image: '',
      duration: 30,
    });
  };

  const handleServiceFormChange = (field, value) => {
    setServiceForm(prev => ({ ...prev, [field]: value }));
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
      
      let formattedPromotionalPrice = '';
      if (serviceForm.promotionalPrice && serviceForm.promotionalPrice.trim() !== '') {
        const promoValue = parseFloat(serviceForm.promotionalPrice);
        if (!isNaN(promoValue) && promoValue > 0) {
          formattedPromotionalPrice = `R$ ${promoValue.toFixed(2).replace('.', ',')}`;
        }
      }
      
      const serviceData = {
        name: serviceForm.name,
        price: formattedPrice,
        promotionalPrice: formattedPromotionalPrice,
        coveredByPlan: serviceForm.coveredByPlan,
        image: serviceForm.image || 'https://images.unsplash.com/photo-1596728325488-58c87691e9af',
        duration: parseInt(serviceForm.duration),
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

  const handleDeleteService = async (serviceId) => {
    if (!hasPermission('editServices')) {
      showToast('Você não tem permissão para excluir serviços.', 'danger');
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      await deleteService(serviceId);
      showToast('Serviço excluído com sucesso!', 'success');
      await loadServices();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      showToast('Erro ao excluir serviço', 'danger');
    }
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
              <button onClick={() => navigate('/appointments')} className="btn-header">
                Agendamentos
              </button>
              <button className="btn-header btn-header-logout" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </div>

          <div className="appointments-tabs">
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
                className={`tab-btn ${activeTab === 'settings' ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Configurações
              </button>
            )}
            {hasPermission('manageEmployees') && (
              <button onClick={() => setActiveTab('employees')} className={`tab-btn ${activeTab === 'employees' ? 'tab-btn--active' : ''}`}>
                Gerenciar Funcionários
              </button>
            )}
            <button onClick={() => setActiveTab('agendamentos')} className={`tab-btn ${activeTab === 'agendamentos' ? 'tab-btn--active' : ''}`}>
              Agendamentos
            </button>
            {hasPermission('manageProducts') && (
              <button onClick={() => setActiveTab('products')} className={`tab-btn ${activeTab === 'products' ? 'tab-btn--active' : ''}`}>
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
            {hasPermission('managePayments') && (
              <button
                onClick={() => setActiveTab('payments')}
                className={`tab-btn ${activeTab === 'payments' ? 'tab-btn--active' : ''}`}
              >
                Pagamentos {pendingPayments.length > 0 && `(${pendingPayments.length})`}
              </button>
            )}
          </div>

          
          {activeTab === 'employees' && (
            <div className="manage-barbers">
              <div className="manage-barbers-header">
                <h2>Gerenciar Funcionários</h2>
                {isAdmin && (
                  <button onClick={() => openBarberModal()} className="btn-add-barber">
                    Adicionar Funcionário
                  </button>
                )}
              </div>

              <div className="barbers-table-container">
                {employees.length === 0 ? (
                  <p className="no-data">Nenhum funcionário cadastrado.</p>
                ) : (
                  employees.map((employee) => {
                    const barberData = employee.role === 'barber' ? barbers.find((b) => b.userId === employee.id) : null;
                    const barberAppointments = barberData ? getAppointmentsByBarber(barberData.id) : [];
                    const isExpanded = barberData && expandedBarbers[barberData.id];
                    const stats = barberData
                      ? calculateBarberStats(barberData.id)
                      : { appointmentsCount: 0, totalRevenue: 0, commissionPercent: 0, barberEarnings: 0, shopEarnings: 0 };

                    return (
                      <div key={employee.id} className="fluig-table-parent">
                        <div
                          className="fluig-row-parent"
                          onClick={() => (barberData ? toggleBarberExpansion(barberData.id) : null)}
                          style={{ cursor: barberData ? 'pointer' : 'default' }}
                        >
                          {barberData && <div className="fluig-expand-icon">{isExpanded ? '▼' : '▶'}</div>}

                          <div className="fluig-barber-info">
                            <img
                              src={barberData?.photo || `https://i.pravatar.cc/150?img=${barberData?.id || employee.id}`}
                              alt={employee.name}
                              className="fluig-barber-photo"
                            />
                            <div className="fluig-barber-details">
                              <h3 className="fluig-barber-name">{employee.name}</h3>
                              <p className="fluig-barber-specialty">
                                {barberData?.specialty ||
                                  (employee.role === 'admin' ? 'Administrador' : employee.role === 'receptionist' ? 'Recepcionista' : 'Barbeiro')}
                              </p>
                              <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>✓ Conta de acesso criada</span>
                            </div>
                          </div>

                          {barberData && (
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
                                <span className="stat-label">Comissão ({stats.commissionPercent}%)</span>
                                <span className="stat-value stat-value-success">R$ {stats.barberEarnings.toFixed(2)}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Barbearia</span>
                                <span className="stat-value">R$ {stats.shopEarnings.toFixed(2)}</span>
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
                              <p className="no-appointments">Nenhum agendamento para este funcionário.</p>
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
                                    <th>Barbeiro ({stats.commissionPercent}%)</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {barberAppointments.map((apt) => {
                                    const aptTotal = calculateTotal(apt.services);
                                    const barberEarning = (aptTotal * stats.commissionPercent) / 100;
                                    return (
                                      <tr key={apt.id} className={apt.status === 'confirmed' ? 'row-confirmed' : ''}>
                                        <td>
                                          {apt.status === 'confirmed' ? (
                                            <span className="status-badge status-confirmed">Confirmado</span>
                                          ) : (
                                            <span className="status-badge status-pending">Pendente</span>
                                          )}
                                        </td>
                                        <td>
                                          <strong>{apt.client}</strong>
                                        </td>
                                        <td>{new Date(apt.date).toLocaleDateString('pt-BR')}</td>
                                        <td>{apt.time}</td>
                                        <td>
                                          <div className="services-list">
                                            {apt.services.map((service, idx) => (
                                              <span key={idx} className="service-pill">
                                                {service.name}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="total-price">R$ {aptTotal.toFixed(2)}</td>
                                        <td className="barber-earning">R$ {barberEarning.toFixed(2)}</td>
                                        <td>
                                          <div className="fluig-actions-buttons">
                                            {apt.status !== 'confirmed' && (
                                              <button onClick={() => handleConfirmAppointment(apt.id)} className="action-btn btn-confirm">
                                                Confirmar
                                              </button>
                                            )}
                                            <button onClick={() => openEditModal(apt)} className="action-btn btn-edit-apt">
                                              Editar
                                            </button>
                                            <button onClick={() => openChangeBarberModal(apt)} className="action-btn btn-transfer">
                                              Transferir
                                            </button>
                                            <button onClick={() => sendWhatsApp(apt.id, 'confirm')} className="action-btn btn-whatsapp">
                                              WhatsApp
                                            </button>
                                            <button onClick={() => handleDeleteAppointment(apt.id)} className="action-btn btn-cancel">
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

          
          {activeTab === 'agendamentos' && (
            <div className="manage-barbers">
              <div className="manage-barbers-header">
                <h2>Agendamentos</h2>
              </div>

              <div className="agendamentos-filter-container">
                <div className="agendamentos-filter-header">
                  <div>
                    <h3 className="agendamentos-filter-title">
                      <span className="agendamentos-filter-title-icon">📅</span>
                      Filtrar Agendamentos
                    </h3>
                    <p className="agendamentos-filter-subtitle">
                      Selecione o período desejado
                    </p>
                  </div>
                  {selectedMonth && (
                    <div className="agendamentos-results-badge">
                      {filterPaymentsByMonth(paidPayments).length} resultado(s)
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

              <div className="payments-section">
                {paidPayments.length > 0 && (
                <div className="payments-list">
                  <h3>Agendamentos realizados</h3>
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Data Pag.</th>
                          <th>Data Agend.</th>
                          <th>Cliente</th>
                          <th>Barbeiro</th>
                          <th>Serviço</th>
                          <th>Produtos</th>
                          <th>Valor</th>
                          <th>Método</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidPayments.map((payment) => {
                          const isSubscriber = clientSubscriptionStatus[payment.userId] || false;
                          const appointment = appointments.find(apt => apt.id === payment.appointmentId);
                          const productsList = appointment?.products || [];
                          
                          const productsTotal = productsList.reduce((sum, prod) => {
                            const price = typeof prod.price === 'string'
                              ? parseFloat(prod.price.replace(/R\$/g, '').replace(/,/g, '.').trim()) || 0
                              : prod.price || 0;
                            return sum + (price * (prod.quantity || 1));
                          }, 0);
                          
                          const serviceTotal = parseFloat(payment.amount || 0);
                          
                          return (
                          <tr key={payment.id}>
                            <td>{new Date(payment.paidAt).toLocaleDateString('pt-BR')}</td>
                            <td>
                              {new Date(payment.appointmentDate).toLocaleDateString('pt-BR')} {payment.appointmentTime}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {payment.userName}
                                {isSubscriber && (
                                  <span style={{
                                    background: '#d4af37',
                                    color: '#000',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}>
                                    ASSINANTE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>{payment.barberName}</td>
                            <td style={{ whiteSpace: 'pre-line' }}>
                              {Array.isArray(payment.serviceName) 
                                ? payment.serviceName.join('\n')
                                : payment.serviceName?.includes(',')
                                ? payment.serviceName.split(',').map(s => s.trim()).join('\n')
                                : payment.serviceName
                              }
                            </td>
                            <td>
                              {productsList.length > 0 ? (
                                <div>
                                  {productsList.map((prod, idx) => (
                                    <div key={idx} style={{ marginBottom: '4px' }}>
                                      {prod.name} x{prod.quantity || 1}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#666' }}>-</span>
                              )}
                            </td>
                            <td>
                              {isSubscriber ? (
                                <div>
                                  <div style={{ fontSize: '0.85rem', color: '#d4af37' }}>
                                    Serviço coberto pelo plano
                                  </div>
                                  {productsTotal > 0 && (
                                    <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
                                      + R$ {productsTotal.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontWeight: 'bold' }}>
                                  R$ {(serviceTotal + productsTotal).toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`payment-method payment-method--${payment.paymentMethod?.toLowerCase()}`}>
                                {payment.paymentMethod || 'N/A'}
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
            </div>
          )}

          {activeTab === 'products' && hasPermission('manageProducts') && (
            <div className="products-section">
              <div className="manage-barbers-header">
                <h2>Gerenciar Produtos</h2>
                {hasPermission('addProducts') && (
                  <button onClick={() => openProductModal()} className="btn-add-barber">
                    Adicionar Produto
                  </button>
                )}
              </div>

              <div className="products-grid">
                {products.map((product) => (
                  <div key={product.id} className="product-card">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-image"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    )}
                    <h3>{product.name}</h3>
                    <p className="product-category">{product.category}</p>
                    <p className="product-price">{product.price}</p>
                    <p className="product-stock">Estoque: {product.stock}</p>
                    {hasPermission('editProducts') && (
                      <div className="product-actions">
                        <Button onClick={() => openProductModal(product)} size="small" className="fluig-btn fluig-btn-edit">
                          Editar
                        </Button>
                        <Button onClick={() => handleDeleteProduct(product.id)} size="small" className="fluig-btn fluig-btn-delete">
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {activeTab === 'services' && hasPermission('manageServices') && (
            <div className="services-section">
              <div className="manage-barbers-header">
                <h2>Gerenciar Serviços</h2>
                {hasPermission('addServices') && (
                  <button onClick={() => openServiceModal()} className="btn-add-barber">
                    Adicionar Serviço
                  </button>
                )}
              </div>

              <div className="services-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginTop: '24px'
              }}>
                {services.map((service) => (
                  <div key={service.id} style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}>
                    {service.image && (
                      <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
                        <img
                          src={service.image}
                          alt={service.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1596728325488-58c87691e9af';
                          }}
                        />
                      </div>
                    )}
                    <div style={{ padding: '20px' }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.25rem',
                        color: '#fff'
                      }}>
                        {service.name}
                      </h3>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#ff7a1a'
                      }}>
                        {service.price}
                      </p>
                      <p style={{
                        margin: '0 0 16px 0',
                        fontSize: '0.9rem',
                        color: '#999'
                      }}>
                        Duração: {service.duration} minutos
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
                            onClick={() => handleDeleteService(service.id)}
                            size="small"
                            className="fluig-btn fluig-btn-delete"
                          >
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {services.length === 0 && (
                <p className="no-data">Nenhum serviço cadastrado.</p>
              )}
            </div>
          )}

          {activeTab === 'benefits' && hasPermission('manageBenefits') && (
            <div className="benefits-section">
              <div className="manage-barbers-header">
                <h2>Gerenciar Benefícios dos Planos</h2>
              </div>
              
              {plansLoading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem', 
                  color: '#d4af37',
                  fontSize: '1.1rem' 
                }}>
                  <p>Carregando planos...</p>
                </div>
              ) : plans.length === 0 ? (
                <p className="no-data">Nenhum plano cadastrado.</p>
              ) : (
                <div className="plans-benefits-grid">
                  {plans.map(plan => (
                    <div key={plan.id} className="plan-benefits-card">
                      <div className="plan-benefits-header" style={{ borderColor: plan.color }}>
                        <h3>{plan.name}</h3>
                        <span className="plan-price">R$ {plan.price.toFixed(2)}/mês</span>
                      </div>
                      <div className="benefits-list">
                        {plan.features && plan.features.length > 0 ? (
                          plan.features.map((benefit, idx) => (
                            <div key={idx} className="benefit-item">
                              <div className="benefit-text">
                                <span className="benefit-icon">✓</span> {benefit}
                              </div>
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

          
          {activeTab === 'settings' && hasPermission('manageSettings') && (
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
                      <Button onClick={handleSavePixKey} style={{ marginTop: '12px', width: '100%' }}>
                        Salvar Chave PIX
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && hasPermission('manageSettings') && (
            <div className="settings-section">
              <div className="settings-container">
                <div className="settings-card">
                  <h2>Termos e Documentos</h2>
                  <p className="settings-description">
                    Faça upload do documento de termos de contratação que será exibido no modal de pagamento.
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
                            <p><strong>Documento carregado</strong></p>
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
                                    base64Response.then(res => res.blob()).then(blob => {
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
                                  display: 'inline-block'
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

          {activeTab === 'payments' && hasPermission('managePayments') && (
            <div className="payments-section">
              <div
                className="section-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
              >
                <h2>Relatório de Pagamentos</h2>
                <div className="month-filter" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

              <div className="monthly-summary" style={{ marginBottom: '2rem' }}>
                <div
                  style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '1.5rem' }}
                >
                  <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>
                    Resumo - {generateMonthOptions().find((opt) => opt.value === selectedMonth)?.label}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>Pendente</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginTop: '0.5rem' }}>
                        R$ {calculateMonthlyTotals().pending.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>Pago</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e', marginTop: '0.5rem' }}>
                        R$ {calculateMonthlyTotals().paid.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#888' }}>Total</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--gold)', marginTop: '0.5rem' }}>
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
                <div className="payment-stat-card payment-stat-card--total">
                  <h3>Total Geral</h3>
                  <p className="stat-value">R$ {paymentStats.total.toFixed(2)}</p>
                  <p className="stat-count">{Object.values(paymentStats.count).reduce((a, b) => a + b, 0)} transações</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.9 }}>Assinaturas + Agendamentos</p>
                </div>
              </div>

              {pendingPayments.length > 0 && (
                <div className="pending-payments">
                  <h3>Pagamentos Pendentes de Agendamentos</h3>
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Horário</th>
                          <th>Cliente</th>
                          <th>Barbeiro</th>
                          <th>Serviço</th> 
                          <th>Valor</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.appointmentDate).toLocaleDateString('pt-BR')}</td>
                            <td>{payment.appointmentTime}</td>
                            <td>{payment.userName}</td>
                            <td>{payment.barberName}</td>
                            <td style={{ whiteSpace: 'pre-line' }}>
                              {Array.isArray(payment.serviceName) 
                                ? payment.serviceName.join('\n')
                                : payment.serviceName?.includes(',')
                                ? payment.serviceName.split(',').map(s => s.trim()).join('\n')
                                : payment.serviceName
                              }
                            </td>
                            <td>R$ {parseFloat(payment.amount || 0).toFixed(2)}</td>
                            <td>
                              {payment.status === 'pendinglocal' ? (
                                <span className="status-badge status-pending-local">Pagar no Local</span>
                              ) : (
                                <span className="status-badge status-pending-online">Pagar Online</span>
                              )}
                            </td>
                            <td>
                              <div className="payment-action-buttons">
                                <button onClick={() => handleMarkAsPaid(payment, 'dinheiro')} className="btn-edit btn-payment-small">
                                  Dinheiro
                                </button>
                                <button onClick={() => handleMarkAsPaid(payment, 'pix')} className="btn-edit btn-payment-small">
                                  PIX
                                </button>
                                <button onClick={() => handleMarkAsPaid(payment, 'cartao')} className="btn-edit btn-payment-small">
                                  Cartão
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                        {subscriptions.map((sub) => (
                          <tr key={sub.id}>
                            <td>{new Date(sub.createdAt || sub.startDate).toLocaleDateString('pt-BR')}</td>
                            <td>{sub.userName || 'N/A'}</td>
                            <td>{sub.planName}</td>
                            <td>R$ {parseFloat(sub.amount || sub.planPrice || 0).toFixed(2)}</td>
                            <td>
                              <span className={`payment-method payment-method--${sub.paymentMethod?.toLowerCase()}`}>
                                {sub.paymentMethod || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-badge--${sub.status}`}>{sub.status === 'active' ? 'Ativo' : 'Inativo'}</span>
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
        </div>
      </section>


      {showBarberModal && (
        <div className="modal-overlay" onClick={closeBarberModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBarber ? 'Editar Funcionário' : 'Adicionar Funcionário'}</h2>
            <form onSubmit={handleSaveBarber} className="barber-form">
              <Input label="Nome" value={barberForm.name} onChange={(e) => handleBarberFormChange('name', e.target.value)} required />
              <Input
                label="Cargo"
                value={barberForm.specialty}
                onChange={(e) => handleBarberFormChange('specialty', e.target.value)}
                placeholder="Ex: Barbeiro Sênior, Recepcionista, etc."
                disabled={editingBarber?.isUserOnly}
              />
              {!editingBarber?.isUserOnly && barberForm.userRole === 'barber' && (
                <Input
                  label="Porcentagem de Comissão (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={barberForm.commissionPercent}
                  onChange={(e) => handleBarberFormChange('commissionPercent', e.target.value)}
                  required
                />
              )}
              <Input
                label="URL da Foto"
                value={barberForm.photo}
                onChange={(e) => handleBarberFormChange('photo', e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
              />

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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={barberForm.createUser}
                      onChange={(e) => handleBarberFormChange('createUser', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 500, color: '#d4af37' }}>Criar conta de acesso para este funcionário</span>
                  </label>

                  {barberForm.createUser && (
                    <div style={{ marginTop: '1rem', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(212, 175, 55, 0.3)' }}>
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
                      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
                        O funcionário poderá acessar o painel com este email e senha
                      </p>
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
              Cliente: {editingAppointment?.client} | Barbeiro: {editingAppointment?.barberName}
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

      {showChangeBarberModal && (
        <div className="modal-overlay" onClick={closeChangeBarberModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Alterar Barbeiro do Agendamento</h2>
            <p className="modal-subtitle">Cliente: {selectedAppointmentForBarberChange?.client}</p>
            <p className="modal-subtitle">Barbeiro atual: {selectedAppointmentForBarberChange?.barberName}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChangeBarber();
              }}
              className="barber-form"
            >
              <div>
                <label className="form-label">Novo Barbeiro</label>
                <select value={newBarberId} onChange={(e) => setNewBarberId(e.target.value)} required className="form-select">
                  <option value="">Selecione um barbeiro</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
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
              <Input label="Nome do Produto" value={productForm.name} onChange={(e) => handleProductFormChange('name', e.target.value)} required />
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
              <Input
                label="URL da Imagem"
                value={productForm.image}
                onChange={(e) => handleProductFormChange('image', e.target.value)}
                placeholder="https://exemplo.com/produto.jpg"
              />
              {productForm.image && (
                <div className="image-preview-container">
                  <img
                    src={productForm.image}
                    alt="Preview"
                    className="image-preview"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                </div>
              )}
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
            <h2>{editingBenefit ? 'Editar Benefício' : 'Adicionar Benefício'}</h2>
            <form onSubmit={handleSaveBenefit} className="barber-form">
              <div>
                <label className="form-label">Descrição do Benefício</label>
                <input
                  type="text"
                  value={benefitForm}
                  onChange={(e) => setBenefitForm(e.target.value)}
                  placeholder="Ex: 2 cortes por mês"
                  required
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                  }}
                />
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
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  <input
                    type="checkbox"
                    checked={serviceForm.coveredByPlan}
                    onChange={(e) => handleServiceFormChange('coveredByPlan', e.target.checked)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      cursor: 'pointer',
                      accentColor: '#d4af37'
                    }}
                  />
                  <span style={{ 
                    color: '#d4af37',
                    fontWeight: '500',
                    fontSize: '0.95rem'
                  }}>
                    ✓ Coberto pela assinatura
                  </span>
                </label>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#888',
                  marginTop: '0.5rem',
                  marginLeft: '0.5rem'
                }}>
                  Quando marcado, usuários com plano ativo verão "Coberto pela assinatura" ao invés do preço
                </p>
              </div>
              
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
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#888',
                    marginTop: '0.5rem',
                    marginLeft: '0.5rem'
                  }}>
                    Se preenchido, o preço normal aparecerá riscado e o promocional em destaque
                  </p>
                </div>
              )}
              
              <Input
                label="URL da Imagem"
                value={serviceForm.image}
                onChange={(e) => handleServiceFormChange('image', e.target.value)}
                placeholder="https://..."
              />
              
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
                <Button type="submit">
                  {editingService ? 'Atualizar' : 'Adicionar'}
                </Button>
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
                {selectedUserPermissions.name} - {
                  selectedUserPermissions.role === 'admin' ? '👑 Administrador' : 
                  selectedUserPermissions.role === 'receptionist' ? '📋 Recepcionista' : 
                  selectedUserPermissions.role === 'barber' ? '✂️ Barbeiro' : 
                  selectedUserPermissions.role
                }
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
                  }, {})
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
                  💾 Salvar Permissões
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </BaseLayout>
  );
}