import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/layout/BaseLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Toast from "../components/ui/Toast";
import AppointmentCard from "../components/ui/AppointmentCard";
import { getSession, logout } from "../services/authService";
import { getUserById } from "../services/userServices";
import { 
  getBarbers, 
  createBarber, 
  updateBarber, 
  deleteBarber 
} from "../services/barberServices";
import { 
  getAppointments,
  deleteAppointment,
  updateAppointment
} from "../services/appointmentService";
import { 
  buscarTodasAssinaturas,
  buscarTodosPagamentosAgendamentos,
  atualizarPagamentoAgendamento
} from "../services/paymentService";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from "../services/productService";
import "./AuthPages.css";

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUser = getSession();

  const [activeTab, setActiveTab] = useState("barbers");
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
    name: "",
    specialty: "",
    photo: ""
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({
    date: "",
    time: ""
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    subscriberDiscount: "0",
    stock: "0",
    image: ""
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.isAdmin === true;

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
        message = `Olá ${appointment.client}! \n\n` +
                  `Estamos entrando em contato para *CONFIRMAR* seu agendamento:\n\n` +
                  `📅 Data: ${date}\n` +
                  `🕐 Horário: ${appointment.time}\n` +
                  `✂️ Serviço: ${serviceName}\n` +
                  `👨‍🦰 Barbeiro: ${appointment.barberName}\n\n` +
                  `Por favor, responda esta mensagem para confirmar sua presença.\n\n` +
                  `Barbearia ADDEV`;
      } else if (type === 'cancel') {
        message = `Olá ${appointment.client}! \n\n` +
                  `Informamos que infelizmente precisaremos realizar o *CANCELAMENTO* do seu agendamento:\n\n` +
                  `📅 Data: ${date}\n` +
                  `🕐 Horário: ${appointment.time}\n` +
                  `✂️ Serviço: ${serviceName}\n\n` +
                  `Pedimos desculpas pelo transtorno. Entre em contato conosco para reagendar.\n\n` +
                  `Barbearia ADDEV`;
      }

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
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
      setSubscriptions(subscriptionsData || []);
      setAppointmentPayments(paymentsData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!isAdmin) {
      navigate("/appointments");
      return;
    }

    loadData();
  }, [currentUser, isAdmin, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
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
        specialty: barber.specialty || "",
        photo: barber.photo || ""
      });
    } else {
      setEditingBarber(null);
      setBarberForm({ name: "", specialty: "", photo: "" });
    }
    setShowBarberModal(true);
  };

  const closeBarberModal = () => {
    setShowBarberModal(false);
    setEditingBarber(null);
    setBarberForm({ name: "", specialty: "", photo: "" });
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
      console.error("Erro ao salvar barbeiro:", error);
      showToast('Erro ao salvar barbeiro. Tente novamente.', 'danger');
    }
  };

  const handleDeleteBarber = async (id) => {
    if (confirm("Deseja realmente excluir este barbeiro?")) {
      try {
        await deleteBarber(id);
        await loadData();
        showToast('Barbeiro excluído com sucesso!', 'success');
      } catch (error) {
        console.error("Erro ao excluir barbeiro:", error);
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
        description: product.description || "",
        price: product.price.toString().replace('R$ ', ''),
        subscriberDiscount: product.subscriberDiscount?.toString() || "0",
        stock: product.stock?.toString() || "0",
        image: product.image || ""
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        category: "",
        description: "",
        price: "",
        subscriberDiscount: "0",
        stock: "0",
        image: ""
      });
    }
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({
      name: "",
      category: "",
      description: "",
      price: "",
      subscriberDiscount: "0",
      stock: "0",
      image: ""
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
      console.error("Erro ao salvar produto:", error);
      showToast('Erro ao salvar produto. Tente novamente.', 'danger');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      try {
        await deleteProduct(id);
        await loadData();
        showToast('Produto excluído com sucesso!', 'success');
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
        showToast('Erro ao excluir produto.', 'danger');
      }
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
    setAppointmentForm({ date: "", time: "" });
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
      console.error("Erro ao atualizar agendamento:", error);
      showToast('Erro ao atualizar agendamento.', 'danger');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (confirm("Deseja realmente cancelar este agendamento?")) {
      try {
        await deleteAppointment(id);
        await loadData();
        showToast('Agendamento cancelado com sucesso!', 'success');
      } catch (error) {
        console.error("Erro ao cancelar:", error);
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
      console.error("Erro ao atualizar pagamento:", error);
      showToast('Erro ao atualizar pagamento.', 'danger');
    }
  };

  const calculatePaymentStats = () => {
    const stats = {
      pix: 0,
      credito: 0,
      debito: 0,
      total: 0,
      count: {
        pix: 0,
        credito: 0,
        debito: 0
      }
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

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB - dateA;
  });

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
        <div className="auth__card" style={{ maxWidth: "900px" }}>
          <div className="appointments-header">
            <div>
              <h1 className="auth__title">Painel Administrativo</h1>
              <p className="auth__subtitle">
                Usuário: {currentUser?.name}
                <span style={{ marginLeft: "10px", color: "#d4af37" }}>(Admin)</span>
              </p>
            </div>
            <div className="div_btn_admin">
              <Button onClick={() => navigate("/appointments")}>
                Agendamentos
              </Button>
              <Button className="btnSair" onClick={handleLogout}>Sair</Button>
            </div>
          </div>

          <div className="appointments-tabs">
            <button
              onClick={() => setActiveTab("barbers")}
              className={`tab-btn ${activeTab === "barbers" ? "tab-btn--active" : ""}`}
            >
              Gerenciar Barbeiros
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`tab-btn ${activeTab === "appointments" ? "tab-btn--active" : ""}`}
            >
              Todos os Agendamentos ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`tab-btn ${activeTab === "products" ? "tab-btn--active" : ""}`}
            >
              Produtos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`tab-btn ${activeTab === "payments" ? "tab-btn--active" : ""}`}
            >
              Pagamentos {pendingPayments.length > 0 && `(${pendingPayments.length} pendentes)`}
            </button>
          </div>

          {activeTab === "barbers" ? (
            <div className="manage-barbers">
              <div className="manage-barbers__header">
                <h2>Gerenciar Barbeiros</h2>
                <Button onClick={() => openBarberModal()}>+ Adicionar Barbeiro</Button>
              </div>

              <div className="barbers-admin-list">
                {barbers.length === 0 ? (
                  <p>Nenhum barbeiro cadastrado.</p>
                ) : (
                  barbers.map((barber) => (
                    <div key={barber.id} className="barber-admin-card">
                      <div className="barber-admin-info">
                        {barber.photo && (
                          <img 
                            src={barber.photo} 
                            alt={barber.name}
                            className="barber-admin-photo"
                          />
                        )}
                        <div>
                          <h3>{barber.name}</h3>
                          {barber.specialty && <p>{barber.specialty}</p>}
                        </div>
                      </div>
                      <div className="barber-admin-actions">
                        <button 
                          onClick={() => openBarberModal(barber)}
                          className="btn-edit"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteBarber(barber.id)}
                          className="btn-delete"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "appointments" ? (
            <div className="appointments-list">
              <h2>Todos os Agendamentos</h2>
              {sortedAppointments.length === 0 ? (
                <p className="calendar-empty">Nenhum agendamento encontrado.</p>
              ) : (
                <div className="calendar-list">
                  {sortedAppointments.map((apt) => (
                    <div key={apt.id} className="appointment-card-wrapper">
                      <AppointmentCard
                        appointment={apt}
                        onDelete={handleDeleteAppointment}
                      />
                      <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        marginTop: '10px',
                        flexWrap: 'wrap'
                      }}>
                        <button 
                          onClick={() => openEditModal(apt)}
                          className="btn-edit"
                          style={{ flex: 1, minWidth: '150px' }}
                        >
                          ✏️ Editar Horário
                        </button>
                        <button 
                          onClick={() => sendWhatsApp(apt.id, 'confirm')}
                          className="btn-edit"
                          style={{ 
                            flex: 1, 
                            minWidth: '150px',
                            background: '#25D366',
                            color: 'white'
                          }}
                        >
                          ✅ Confirmar (WhatsApp)
                        </button>
                        <button 
                          onClick={() => sendWhatsApp(apt.id, 'cancel')}
                          className="btn-delete"
                          style={{ 
                            flex: 1, 
                            minWidth: '150px'
                          }}
                        >
                          ❌ Cancelar (WhatsApp)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "products" ? (
            <div className="manage-products">
              <div className="manage-barbers__header">
                <h2>Gerenciar Produtos</h2>
                <Button onClick={() => openProductModal()}>+ Adicionar Produto</Button>
              </div>

              <div className="barbers-admin-list">
                {products.length === 0 ? (
                  <p>Nenhum produto cadastrado.</p>
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
                            <span className={`product-stock ${product.stock === 0 ? 'out-of-stock' : product.stock <= 5 ? 'low-stock' : ''}`}>
                              Estoque: {product.stock}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="barber-admin-actions">
                        <button 
                          onClick={() => openProductModal(product)}
                          className="btn-edit"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="btn-delete"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "payments" ? (
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
                        {pendingPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.appointmentDate).toLocaleDateString('pt-BR')}</td>
                            <td>{payment.appointmentTime}</td>
                            <td>{payment.userName}</td>
                            <td>{payment.barberName}</td>
                            <td>{payment.serviceName}</td>
                            <td>R$ {parseFloat(payment.amount || 0).toFixed(2)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <button 
                                  onClick={() => handleMarkAsPaid(payment, 'dinheiro')}
                                  className="btn-edit"
                                  style={{ fontSize: '12px', padding: '5px 10px' }}
                                >
                                  💵 Dinheiro
                                </button>
                                <button 
                                  onClick={() => handleMarkAsPaid(payment, 'pix')}
                                  className="btn-edit"
                                  style={{ fontSize: '12px', padding: '5px 10px' }}
                                >
                                  📱 PIX
                                </button>
                                <button 
                                  onClick={() => handleMarkAsPaid(payment, 'cartao')}
                                  className="btn-edit"
                                  style={{ fontSize: '12px', padding: '5px 10px' }}
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
                        {subscriptions.map((sub) => (
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
                              <span className={`status-badge status-badge--${sub.status || 'active'}`}>
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
                        {paidPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{new Date(payment.paidAt).toLocaleDateString('pt-BR')}</td>
                            <td>{new Date(payment.appointmentDate).toLocaleDateString('pt-BR')} {payment.appointmentTime}</td>
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
          ) : null}

          {showBarberModal && (
            <div className="modal-overlay" onClick={closeBarberModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{editingBarber ? "Editar Barbeiro" : "Adicionar Barbeiro"}</h2>
                <form onSubmit={handleSaveBarber} className="barber-form">
                  <Input
                    label="Nome *"
                    value={barberForm.name}
                    onChange={(e) => handleBarberFormChange("name", e.target.value)}
                    required
                  />
                  <Input
                    label="Especialidade"
                    value={barberForm.specialty}
                    onChange={(e) => handleBarberFormChange("specialty", e.target.value)}
                  />
                  <Input
                    label="URL da Foto"
                    value={barberForm.photo}
                    onChange={(e) => handleBarberFormChange("photo", e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                  <div className="modal-actions">
                    <Button type="button" onClick={closeBarberModal}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingBarber ? "Atualizar" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditModal && (
            <div className="modal-overlay" onClick={closeEditModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Editar Agendamento</h2>
                <p style={{ marginBottom: "20px", color: "#999" }}>
                  Cliente: {editingAppointment?.client} | Barbeiro: {editingAppointment?.barberName}
                </p>
                <form onSubmit={handleUpdateAppointment} className="barber-form">
                  <Input
                    label="Data *"
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => handleAppointmentFormChange("date", e.target.value)}
                    required
                  />
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#d4af37" }}>
                      Horário *
                    </label>
                    <select
                      value={appointmentForm.time}
                      onChange={(e) => handleAppointmentFormChange("time", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#2a2a2a",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "white",
                        fontSize: "16px"
                      }}
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
                    <Button type="submit">
                      Atualizar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showProductModal && (
            <div className="modal-overlay" onClick={closeProductModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{editingProduct ? "Editar Produto" : "Adicionar Produto"}</h2>
                <form onSubmit={handleSaveProduct} className="barber-form">
                  <Input
                    label="Nome do Produto *"
                    value={productForm.name}
                    onChange={(e) => handleProductFormChange("name", e.target.value)}
                    required
                  />
                  
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", color: "#d4af37" }}>
                      Categoria *
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) => handleProductFormChange("category", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#2a2a2a",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "white",
                        fontSize: "16px"
                      }}
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
                    <label style={{ display: "block", marginBottom: "8px", color: "#d4af37" }}>
                      Descrição
                    </label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => handleProductFormChange("description", e.target.value)}
                      placeholder="Descrição do produto"
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#2a2a2a",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "white",
                        fontSize: "16px",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  <Input
                    label="Preço (apenas números) *"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => handleProductFormChange("price", e.target.value)}
                    placeholder="40.00"
                    required
                  />

                  <Input
                    label="Desconto para Assinantes (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={productForm.subscriberDiscount}
                    onChange={(e) => handleProductFormChange("subscriberDiscount", e.target.value)}
                    placeholder="0"
                  />

                  <Input
                    label="Estoque *"
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) => handleProductFormChange("stock", e.target.value)}
                    required
                  />

                  <Input
                    label="URL da Imagem"
                    value={productForm.image}
                    onChange={(e) => handleProductFormChange("image", e.target.value)}
                    placeholder="https://exemplo.com/produto.jpg"
                  />

                  {productForm.image && (
                    <div style={{ marginTop: "10px", textAlign: "center" }}>
                      <img 
                        src={productForm.image} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: "200px", 
                          maxHeight: "200px", 
                          borderRadius: "8px",
                          border: "2px solid #444"
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="modal-actions">
                    <Button type="button" onClick={closeProductModal}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingProduct ? "Atualizar" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

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