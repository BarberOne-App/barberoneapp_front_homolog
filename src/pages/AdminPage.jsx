import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/layout/BaseLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import { getSession, logout } from '../services/authService';
import { getUserById } from '../services/userServices';
import { getBarbers, createBarber, updateBarber, deleteBarber } from '../services/barberServices';
import { getAppointments, deleteAppointment, updateAppointment } from '../services/appointmentService';
import { buscarTodasAssinaturas, buscarTodosPagamentosAgendamentos, atualizarPagamentoAgendamento } from '../services/paymentService';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import './AuthPages.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUser = getSession();
  
  const [activeTab, setActiveTab] = useState('barbers');
  const [barbers, setBarbers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [appointmentPayments, setAppointmentPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberForm, setBarberForm] = useState({ 
    name: '', 
    specialty: '', 
    photo: '',
    commissionPercent: 50
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
    image: ''
  });
  
  const [expandedBarbers, setExpandedBarbers] = useState({});
  const [showChangeBarberModal, setShowChangeBarberModal] = useState(false);
  const [selectedAppointmentForBarberChange, setSelectedAppointmentForBarberChange] = useState(null);
  const [newBarberId, setNewBarberId] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({ date: '', time: '' });
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;

  const sendWhatsApp = async (appointmentId, type) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (!appointment) return;

      const userData = await getUserById(appointment.clientId);
      if (!userData || !userData.phone) {
        showToast('Cliente não possui telefone cadastrado.', 'danger');
        return;
      }

      const phone = userData.phone.replace(/\D/g, '');
      const date = new Date(appointment.date).toLocaleDateString('pt-BR');
      const serviceName = Array.isArray(appointment.services)
        ? appointment.services.map(s => s.name).join(', ')
        : 'Serviço';

      let message = '';
      if (type === 'confirm') {
        message = `Olá ${appointment.client}! Estamos entrando em contato para CONFIRMAR seu agendamento:\n\nData: ${date}\nHorário: ${appointment.time}\nServiço: ${serviceName}\nBarbeiro: ${appointment.barberName}\n\nPor favor, responda esta mensagem para confirmar sua presença.\n\nBarbearia ADDEV`;
      } else if (type === 'cancel') {
        message = `Olá ${appointment.client}! Informamos que infelizmente precisaremos realizar o CANCELAMENTO do seu agendamento:\n\nData: ${date}\nHorário: ${appointment.time}\nServiço: ${serviceName}\n\nPedimos desculpas pelo transtorno. Entre em contato conosco para reagendar.\n\nBarbearia ADDEV`;
      }

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      showToast('Erro ao abrir WhatsApp.', 'danger');
    }
  };

  async function loadData() {
    try {
      const [barbersData, appointmentsData, subscriptionsData, paymentsData, productsData] = await Promise.all([
        getBarbers(),
        getAppointments(),
        buscarTodasAssinaturas(),
        buscarTodosPagamentosAgendamentos(),
        getProducts()
      ]);

      setBarbers(barbersData);
      setAppointments(appointmentsData);
      setSubscriptions(subscriptionsData);
      setAppointmentPayments(paymentsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/appointments');
      return;
    }

    loadData();
  }, [currentUser, isAdmin, navigate]);

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

  const openBarberModal = (barber = null) => {
    if (barber) {
      setEditingBarber(barber);
      setBarberForm({
        name: barber.name,
        specialty: barber.specialty,
        photo: barber.photo,
        commissionPercent: barber.commissionPercent || 50
      });
    } else {
      setEditingBarber(null);
      setBarberForm({ name: '', specialty: '', photo: '', commissionPercent: 50 });
    }
    setShowBarberModal(true);
  };

  const closeBarberModal = () => {
    setShowBarberModal(false);
    setEditingBarber(null);
    setBarberForm({ name: '', specialty: '', photo: '', commissionPercent: 50 });
  };

  const handleBarberFormChange = (field, value) => {
    setBarberForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    if (!barberForm.name.trim()) {
      showToast('O nome do barbeiro é obrigatório.', 'danger');
      return;
    }

    try {
      if (editingBarber) {
        await updateBarber(editingBarber.id, barberForm);
        showToast('Barbeiro atualizado com sucesso!', 'success');
      } else {
        await createBarber(barberForm);
        showToast('Barbeiro adicionado com sucesso!', 'success');
      }
      await loadData();
      closeBarberModal();
    } catch (error) {
      console.error('Erro ao salvar barbeiro:', error);
      showToast('Erro ao salvar barbeiro. Tente novamente.', 'danger');
    }
  };

  const handleDeleteBarber = async (id) => {
    if (confirm('Deseja realmente excluir este barbeiro?')) {
      try {
        await deleteBarber(id);
        await loadData();
        showToast('Barbeiro excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir barbeiro:', error);
        showToast('Erro ao excluir barbeiro.', 'danger');
      }
    }
  };

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price.toString().replace('R$ ', ''),
        subscriberDiscount: product.subscriberDiscount?.toString() || '0',
        stock: product.stock?.toString() || '0',
        image: product.image
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: '',
        description: '',
        price: '',
        subscriberDiscount: '0',
        stock: '0',
        image: ''
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
      subscriberDiscount: '0',
      stock: '0',
      image: ''
    });
  };

  const handleProductFormChange = (field, value) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.category || !productForm.price) {
      showToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    try {
      const productData = {
        ...productForm,
        price: `R$ ${parseFloat(productForm.price).toFixed(2)}`,
        subscriberDiscount: parseInt(productForm.subscriberDiscount) || 0,
        stock: parseInt(productForm.stock) || 0
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
      console.error('Erro ao salvar produto:', error);
      showToast('Erro ao salvar produto. Tente novamente.', 'danger');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      try {
        await deleteProduct(id);
        await loadData();
        showToast('Produto excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showToast('Erro ao excluir produto.', 'danger');
      }
    }
  };

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      const updatedAppointment = {
        ...appointment,
        status: 'confirmed'
      };
      await updateAppointment(appointmentId, updatedAppointment);
      await loadData();
      showToast('Agendamento confirmado!', 'success');
    } catch (error) {
      console.error('Erro ao confirmar:', error);
      showToast('Erro ao confirmar agendamento.', 'danger');
    }
  };

  const openEditModal = (appointment) => {
    setEditingAppointment(appointment);
    setAppointmentForm({
      date: appointment.date,
      time: appointment.time
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAppointment(null);
    setAppointmentForm({ date: '', time: '' });
  };

  const handleAppointmentFormChange = (field, value) => {
    setAppointmentForm(prev => ({ ...prev, [field]: value }));
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
        time: appointmentForm.time
      };
      await updateAppointment(editingAppointment.id, updatedData);
      await loadData();
      showToast('Agendamento atualizado com sucesso!', 'success');
      closeEditModal();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      showToast('Erro ao atualizar agendamento.', 'danger');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (confirm('Deseja realmente cancelar este agendamento?')) {
      try {
        await deleteAppointment(id);
        await loadData();
        showToast('Agendamento cancelado com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao cancelar:', error);
        showToast('Erro ao cancelar agendamento.', 'danger');
      }
    }
  };

  const handleMarkAsPaid = async (payment, method) => {
    try {
      await atualizarPagamentoAgendamento(payment.id, {
        status: 'paid',
        paymentMethod: method,
        paidAt: new Date().toISOString()
      });
      await loadData();
      showToast('Pagamento marcado como pago!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      showToast('Erro ao atualizar pagamento.', 'danger');
    }
  };

  const toggleBarberExpansion = (barberId) => {
    setExpandedBarbers(prev => ({
      ...prev,
      [barberId]: !prev[barberId]
    }));
  };

  const getAppointmentsByBarber = (barberId) => {
    return appointments
      .filter(apt => apt.barberId === barberId)
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
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

    const newBarber = barbers.find(b => b.id.toString() === newBarberId);
    if (!newBarber) return;

    try {
      const updatedAppointment = {
        ...selectedAppointmentForBarberChange,
        barberId: newBarber.id,
        barberName: newBarber.name
      };

      await updateAppointment(selectedAppointmentForBarberChange.id, updatedAppointment);
      await loadData();
      showToast(`Agendamento transferido para ${newBarber.name}!`, 'success');
      closeChangeBarberModal();
    } catch (error) {
      console.error('Erro ao alterar barbeiro:', error);
      showToast('Erro ao alterar barbeiro.', 'danger');
    }
  };

  const calculateTotal = (services) => {
    return services.reduce((sum, service) => {
      const price = Number(String(service.price ?? '0')
        .replace(/[R$.-]/g, '')
        .replace(',', '.'));
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const calculateBarberStats = (barberId) => {
    const barber = barbers.find(b => b.id === barberId);
    const barberAppointments = getAppointmentsByBarber(barberId);
    
    let totalRevenue = 0;
    let totalServices = 0;

    barberAppointments.forEach(apt => {
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
      shopEarnings
    };
  };

  const calculatePaymentStats = () => {
    const stats = {
      pix: 0,
      credito: 0,
      debito: 0,
      total: 0,
      count: { pix: 0, credito: 0, debito: 0 }
    };

    subscriptions.forEach(sub => {
      const amount = parseFloat(sub.amount || sub.planPrice || 0);
      if (amount > 0) {
        stats.total += amount;
        const method = (sub.paymentMethod || '').toLowerCase();
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

    return stats;
  };

  const paymentStats = calculatePaymentStats();
  const pendingPayments = appointmentPayments.filter(p => p.status === 'pending');
  const paidPayments = appointmentPayments.filter(p => p.status === 'paid');

  if (loading) {
    return (
      <BaseLayout>
        <div className="auth">
          <div className="auth__card">
            <p>Carregando...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <section className="auth">
        <div className="auth__card auth__card--wide">
          <div className="appointments-header">
            <div>
              <h1 className="auth__title">Painel Administrativo</h1>
              <p className="auth__subtitle">
                Usuário: {currentUser?.name} <span className="admin-badge">Admin</span>
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
            <button
              onClick={() => setActiveTab('barbers')}
              className={`tab-btn ${activeTab === 'barbers' ? 'tab-btn--active' : ''}`}
            >
              Gerenciar Barbeiros
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`tab-btn ${activeTab === 'products' ? 'tab-btn--active' : ''}`}
            >
              Produtos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`tab-btn ${activeTab === 'payments' ? 'tab-btn--active' : ''}`}
            >
              Pagamentos {pendingPayments.length > 0 && `(${pendingPayments.length})`}
            </button>
          </div>

          {activeTab === 'barbers' && (
            <div className="manage-barbers">
              <div className="manage-barbers__header">
                <h2>Gerenciar Barbeiros</h2>
                <button onClick={() => openBarberModal()} className="btn-add-barber">
                  + Adicionar Barbeiro
                </button>
              </div>

              <div className="barbers-table-container">
                {barbers.length === 0 ? (
                  <p className="no-data">Nenhum barbeiro cadastrado.</p>
                ) : (
                  barbers.map((barber) => {
                    const barberAppointments = getAppointmentsByBarber(barber.id);
                    const isExpanded = expandedBarbers[barber.id];
                    const stats = calculateBarberStats(barber.id);

                    return (
                      <div key={barber.id} className="fluig-table-parent">
                        <div className="fluig-row-parent" onClick={() => toggleBarberExpansion(barber.id)}>
                          <div className="fluig-expand-icon">
                            {isExpanded ? '▼' : '▶'}
                          </div>
                          <div className="fluig-barber-info">
                            <img
                              src={barber.photo || `https://i.pravatar.cc/150?img=${barber.id}`}
                              alt={barber.name}
                              className="fluig-barber-photo"
                            />
                            <div className="fluig-barber-details">
                              <h3 className="fluig-barber-name">{barber.name}</h3>
                              <p className="fluig-barber-specialty">{barber.specialty}</p>
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
                              <span className="stat-label">Comissão ({stats.commissionPercent}%)</span>
                              <span className="stat-value stat-value-success">R$ {stats.barberEarnings.toFixed(2)}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Barbearia</span>
                              <span className="stat-value">R$ {stats.shopEarnings.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="fluig-parent-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openBarberModal(barber);
                              }}
                              className="fluig-btn fluig-btn-edit"
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBarber(barber.id);
                              }}
                              className="fluig-btn fluig-btn-delete"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="fluig-children-container">
                            {barberAppointments.length === 0 ? (
                              <p className="no-appointments">Nenhum agendamento para este barbeiro.</p>
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
                                  {barberAppointments.map(apt => {
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
                                        <td><strong>{apt.client}</strong></td>
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
                                            <button
                                              onClick={() => openChangeBarberModal(apt)}
                                              className="action-btn btn-transfer"
                                            >
                                              Transferir
                                            </button>
                                            <button
                                              onClick={() => sendWhatsApp(apt.id, 'confirm')}
                                              className="action-btn btn-whatsapp"
                                            >
                                              WhatsApp
                                            </button>
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

          {activeTab === 'products' && (
            <div className="manage-products">
              <div className="manage-barbers__header">
                <h2>Gerenciar Produtos</h2>
                <button onClick={() => openProductModal()} className="btn-add-barber">
                  + Adicionar Produto
                </button>
              </div>

              <div className="barbers-admin-list">
                {products.length === 0 ? (
                  <p className="no-data">Nenhum produto cadastrado.</p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="barber-admin-card product-admin-card">
                      <div className="barber-admin-info">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="barber-admin-photo"
                          />
                        )}
                        <div>
                          <h3>{product.name}</h3>
                          <p className="product-category">{product.category}</p>
                          <p className="product-description">{product.description}</p>
                          <div className="product-details">
                            <span className="product-price">{product.price}</span>
                            {product.subscriberDiscount > 0 && (
                              <span className="product-discount">
                                -{product.subscriberDiscount}% para assinantes
                              </span>
                            )}
                            <span
                              className={`product-stock ${
                                product.stock === 0 ? 'out-of-stock' : product.stock <= 5 ? 'low-stock' : ''
                              }`}
                            >
                              Estoque: {product.stock}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="barber-admin-actions">
                        <button onClick={() => openProductModal(product)} className="btn-edit">
                          Editar
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="btn-delete">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="payments-section">
              <h2>Relatório de Pagamentos</h2>

              <div className="payment-stats">
                <div className="payment-stat-card">
                  <h3>💳 Cartão de Crédito</h3>
                  <p className="stat-value">R$ {paymentStats.credito.toFixed(2)}</p>
                  <p className="stat-count">{paymentStats.count.credito} transações</p>
                </div>
                <div className="payment-stat-card">
                  <h3>💳 Cartão de Débito</h3>
                  <p className="stat-value">R$ {paymentStats.debito.toFixed(2)}</p>
                  <p className="stat-count">{paymentStats.count.debito} transações</p>
                </div>
                <div className="payment-stat-card">
                  <h3>📱 PIX</h3>
                  <p className="stat-value">R$ {paymentStats.pix.toFixed(2)}</p>
                  <p className="stat-count">{paymentStats.count.pix} transações</p>
                </div>
                <div className="payment-stat-card payment-stat-card--total">
                  <h3>💰 Total Assinaturas</h3>
                  <p className="stat-value">R$ {paymentStats.total.toFixed(2)}</p>
                  <p className="stat-count">
                    {paymentStats.count.pix + paymentStats.count.credito + paymentStats.count.debito} transações
                  </p>
                </div>
              </div>

              {pendingPayments.length > 0 && (
                <div className="pending-payments">
                  <h3>⏳ Pagamentos Pendentes de Agendamentos</h3>
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
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPayments.map(payment => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.appointmentDate).toLocaleDateString('pt-BR')}</td>
                            <td>{payment.appointmentTime}</td>
                            <td>{payment.userName}</td>
                            <td>{payment.barberName}</td>
                            <td>{payment.serviceName}</td>
                            <td>R$ {parseFloat(payment.amount || 0).toFixed(2)}</td>
                            <td>
                              <div className="payment-action-buttons">
                                <button
                                  onClick={() => handleMarkAsPaid(payment, 'dinheiro')}
                                  className="btn-edit btn-payment-small"
                                >
                                  💵 Dinheiro
                                </button>
                                <button
                                  onClick={() => handleMarkAsPaid(payment, 'pix')}
                                  className="btn-edit btn-payment-small"
                                >
                                  📱 PIX
                                </button>
                                <button
                                  onClick={() => handleMarkAsPaid(payment, 'cartao')}
                                  className="btn-edit btn-payment-small"
                                >
                                  💳 Cartão
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
                <h3>📋 Histórico de Assinaturas</h3>
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
                        {subscriptions.map(sub => (
                          <tr key={sub.id}>
                            <td>{new Date(sub.createdAt || sub.startDate).toLocaleDateString('pt-BR')}</td>
                            <td>{sub.userName || 'N/A'}</td>
                            <td>{sub.planName}</td>
                            <td>R$ {parseFloat(sub.amount || sub.planPrice || 0).toFixed(2)}</td>
                            <td>
                              <span className={`payment-method payment-method--${(sub.paymentMethod || '').toLowerCase()}`}>
                                {sub.paymentMethod || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-badge--${sub.status === 'active'}`}>
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

              {paidPayments.length > 0 && (
                <div className="payments-list">
                  <h3>✅ Pagamentos Realizados de Agendamentos</h3>
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Data Pag.</th>
                          <th>Data Agend.</th>
                          <th>Cliente</th>
                          <th>Barbeiro</th>
                          <th>Serviço</th>
                          <th>Valor</th>
                          <th>Método</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidPayments.map(payment => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.paidAt).toLocaleDateString('pt-BR')}</td>
                            <td>
                              {new Date(payment.appointmentDate).toLocaleDateString('pt-BR')} {payment.appointmentTime}
                            </td>
                            <td>{payment.userName}</td>
                            <td>{payment.barberName}</td>
                            <td>{payment.serviceName}</td>
                            <td>R$ {parseFloat(payment.amount || 0).toFixed(2)}</td>
                            <td>
                              <span className={`payment-method payment-method--${(payment.paymentMethod || '').toLowerCase()}`}>
                                {payment.paymentMethod || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {showBarberModal && (
        <div className="modal-overlay" onClick={closeBarberModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBarber ? 'Editar Barbeiro' : 'Adicionar Barbeiro'}</h2>
            <form onSubmit={handleSaveBarber} className="barber-form">
              <Input
                label="Nome"
                value={barberForm.name}
                onChange={(e) => handleBarberFormChange('name', e.target.value)}
                required
              />
              <Input
                label="Especialidade"
                value={barberForm.specialty}
                onChange={(e) => handleBarberFormChange('specialty', e.target.value)}
              />
              <Input
                label="Porcentagem de Comissão (%)"
                type="number"
                min="0"
                max="100"
                value={barberForm.commissionPercent}
                onChange={(e) => handleBarberFormChange('commissionPercent', e.target.value)}
                required
              />
              <Input
                label="URL da Foto"
                value={barberForm.photo}
                onChange={(e) => handleBarberFormChange('photo', e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
              />
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
                <select
                  value={newBarberId}
                  onChange={(e) => setNewBarberId(e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">Selecione um barbeiro</option>
                  {barbers.map(barber => (
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

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </BaseLayout>
  );
}
