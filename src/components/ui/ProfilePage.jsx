import { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { getSession, logout } from '../../services/authService';
  import { buscarAssinaturaAtiva } from '../../services/paymentService';
  import ManageSubscriptionModal from '../ui/ManageSubscriptionModal.jsx';
  import SubscriptionModal from '../ui/SubscriptionModal.jsx';
  import { FaCalendarAlt, FaShieldAlt, FaCreditCard, FaSignOutAlt, FaCamera, FaUser, FaEnvelope, FaEdit, FaCheck, FaTimes, FaArrowLeft, FaHome, FaStore, FaUsers, FaPlus, FaTrash, FaLock } from 'react-icons/fa';
  import { BARBERSHOPS, getActiveBarbershop, setActiveBarbershop } from '../layout/Barbershops';
  import './ProfilePage.css';
  import Header from '../layout/Header.jsx';
  import { uploadImagem, criarPreviewLocal } from '../../services/cloudinaryService';
  import ChangePasswordPanel from './Changepasswordpanel.jsx';

  const API_URL = 'http://localhost:3000';

  export default function ProfilePage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null); 
    const [pendingFile, setPendingFile] = useState(null);    
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoSuccess, setPhotoSuccess] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [activeTab, setActiveTab] = useState('perfil');
    const [toast, setToast] = useState(null);
    const [activeBarbershop, setActiveBarbershopState] = useState(getActiveBarbershop);


    const [dependents, setDependents] = useState([]);
    const [showDependentForm, setShowDependentForm] = useState(false);
    const [editingDependent, setEditingDependent] = useState(null); // null = novo, objeto = editar
    const [dependentForm, setDependentForm] = useState({ name: '', age: '', cpf: '' });
    const [savingDependent, setSavingDependent] = useState(false);
    const [deletingDependentId, setDeletingDependentId] = useState(null);
    const MAX_DEPENDENTS = 3;

    useEffect(() => {
      const user = getSession();
      if (!user) {
        navigate('/login');
        return;
      }
      // Renderiza imediatamente com dados da sessao local
      setCurrentUser(user);
      setNewName(user.name || '');
      loadUserPhoto(user.id);
      verificarAssinaturaAtiva(user.id);
      loadDependents(user.id);

      // Busca permissoes atualizadas no backend e sincroniza sessao
      fetch(`http://localhost:3000/users/${user.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(freshUser => {
          if (!freshUser) return;
          const updatedUser = { ...user, permissions: freshUser.permissions ?? user.permissions };
          setCurrentUser(updatedUser);
          localStorage.setItem('session', JSON.stringify(updatedUser));
        })
        .catch(() => {});
    }, []);

    const loadUserPhoto = async (userId) => {
      try {
        const res = await fetch(`${API_URL}/users/${userId}`);
        if (res.ok) {
          const userData = await res.json();
          if (userData.photo) setProfilePhoto(userData.photo);
        }
      } catch (e) {}
    };

    const loadDependents = async (userId) => {
      try {
        const res = await fetch(`${API_URL}/dependents?parentId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setDependents(data);
        }
      } catch (e) {}
    };

    const formatCPF = (value) => {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    };

    const handleDependentFormChange = (field, value) => {
      if (field === 'cpf') value = formatCPF(value);
      if (field === 'age') value = value.replace(/\D/g, '').slice(0, 3);
      setDependentForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleOpenNewDependent = () => {
      setEditingDependent(null);
      setDependentForm({ name: '', age: '', cpf: '' });
      setShowDependentForm(true);
    };

    const handleOpenEditDependent = (dep) => {
      setEditingDependent(dep);
      setDependentForm({ name: dep.name, age: String(dep.age), cpf: dep.cpf });
      setShowDependentForm(true);
    };

    const validateCPF = (cpf) => {
      const digits = cpf.replace(/[^0-9]/g, '');
      if (digits.length !== 11) return false;
      if (/^(.)\1{10}$/.test(digits)) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(digits[9])) return false;
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      return remainder === parseInt(digits[10]);
    };

    const handleSaveDependent = async () => {
      if (!dependentForm.name.trim() || !dependentForm.age || !dependentForm.cpf) {
        showToast('Preencha nome, idade e CPF.');
        return;
      }

      if (!validateCPF(dependentForm.cpf)) {
        showToast('CPF inválido. Verifique os números digitados.');
        return;
      }

      setSavingDependent(true);
      try {
        const cpfDigits = dependentForm.cpf.replace(/[^0-9]/g, '');

        const allDepsRes = await fetch(`${API_URL}/dependents`);
        const allDeps = await allDepsRes.json();
        const cpfExistsInDependents = allDeps.some((d) => {
          const isSelf = editingDependent && d.id === editingDependent.id;
          return !isSelf && d.cpf.replace(/[^0-9]/g, '') === cpfDigits;
        });
        if (cpfExistsInDependents) {
          showToast('Este CPF já está cadastrado como dependente.');
          return;
        }

        const allUsersRes = await fetch(`${API_URL}/users`);
        const allUsersData = await allUsersRes.json();
        const cpfExistsInUsers = allUsersData.some(
          (u) => u.cpf && u.cpf.replace(/[^0-9]/g, '') === cpfDigits
        );
        if (cpfExistsInUsers) {
          showToast('Este CPF pertence a um usuário já cadastrado no sistema.');
          return;
        }

        if (editingDependent) {
          const res = await fetch(`${API_URL}/dependents/${editingDependent.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...dependentForm, age: Number(dependentForm.age) }),
          });
          if (res.ok) {
            await loadDependents(currentUser.id);
            setShowDependentForm(false);
            showToast('Dependente atualizado!');
          }
        } else {
          const res = await fetch(`${API_URL}/dependents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...dependentForm,
              age: Number(dependentForm.age),
              parentId: currentUser.id,
              parentName: currentUser.name,
            }),
          });
          if (res.ok) {
            await loadDependents(currentUser.id);
            setShowDependentForm(false);
            showToast('Dependente adicionado!');
          }
        }
      } catch (e) {
        showToast('Erro ao salvar dependente.');
      } finally {
        setSavingDependent(false);
      }
    };

        const handleDeleteDependent = async (depId) => {
      setDeletingDependentId(depId);
      try {
        await fetch(`${API_URL}/dependents/${depId}`, { method: 'DELETE' });
        await loadDependents(currentUser.id);
        showToast('Dependente removido.');
      } catch (e) {
        showToast('Erro ao remover dependente.');
      } finally {
        setDeletingDependentId(null);
      }
    };

    const verificarAssinaturaAtiva = async (userId) => {
      try {
        const assinatura = await buscarAssinaturaAtiva(userId);
        setActiveSubscription(assinatura);
      } catch (e) {}
    };

  
    const handleFileSelect = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
    
        const localUrl = criarPreviewLocal(file);
        setPhotoPreview(localUrl);
        setPendingFile(file);
      } catch (err) {
        showToast(err.message);
      }
      e.target.value = '';
    };

  
    const handleConfirmUpload = async () => {
      if (!pendingFile || !currentUser) return;
      setUploadingPhoto(true);
      try {
        const secure_url = await uploadImagem(pendingFile, 'perfil');

        await fetch(`${API_URL}/users/${currentUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo: secure_url }),
        });

        URL.revokeObjectURL(photoPreview);
        setProfilePhoto(secure_url);
        setPhotoPreview(null);
        setPendingFile(null);
        setPhotoSuccess(true);
        const updatedUser = { ...currentUser, photo: secure_url };
        setCurrentUser(updatedUser);
        localStorage.setItem('session', JSON.stringify(updatedUser));
        showToast('Foto atualizada!');
        setTimeout(() => setPhotoSuccess(false), 3000);
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Erro ao enviar foto. Tente novamente.');
      } finally {
        setUploadingPhoto(false);
      }
    };

    const handleCancelPreview = () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      setPendingFile(null);
    };

    const handleSaveName = async () => {
      if (!newName.trim() || !currentUser) return;
      setSavingName(true);
      try {
        const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() }),
        });
        if (res.ok) {
          const updatedUser = { ...currentUser, name: newName.trim() };
          setCurrentUser(updatedUser);
          localStorage.setItem('session', JSON.stringify(updatedUser));
          setEditingName(false);
        }
      } catch (e) {
        alert('Erro ao salvar o nome.');
      } finally {
        setSavingName(false);
      }
    };

    const showToast = (message) => {
      setToast({ message });
      setTimeout(() => setToast(null), 2000);
    };

    const navigateWithToast = (path, message) => {
      showToast(message);
      setTimeout(() => navigate(path), 1000);
    };

    const handleSelectBarbershop = (shop) => {
      setActiveBarbershop(shop);
      setActiveBarbershopState(shop);
      showToast(`Barbearia alterada para ${shop.name}`);
    };

    const handleLogout = () => {
      logout();
      navigate('/login');
    };

    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
    const isReceptionist = currentUser?.role === 'receptionist';
    const isBarber = currentUser?.role === 'barber';
    const hasAdminAccess = isAdmin || isReceptionist || currentUser?.permissions?.viewAdmin;

    const getRoleBadge = () => {
      if (isAdmin) return { label: 'Admin', className: 'badge--admin' };
      if (isReceptionist) return { label: 'Recepcionista', className: 'badge--receptionist' };
      if (isBarber) return { label: 'Barbeiro', className: 'badge--barber' };
      return { label: 'Cliente', className: 'badge--client' };
    };

    const roleBadge = getRoleBadge();
    const displayPhoto = photoPreview || profilePhoto;
    const initials = currentUser?.name?.charAt(0).toUpperCase() || '?';

    return (
      <div className="profile-page">
        <Header />
        <div className="profile-page__bg" />

        <div className="profile-page__container">
      
          <aside className="profile-sidebar">
          
            <div className="profile-sidebar__avatar-section">
              <div className="profile-sidebar__avatar-wrapper">
                <div className="profile-sidebar__avatar">
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Foto de perfil" className="profile-sidebar__avatar-img" />
                  ) : (
                    <span className="profile-sidebar__avatar-initial">{initials}</span>
                  )}
                </div>
                <label
                  htmlFor="photo-upload-input"
                  className="profile-sidebar__camera-btn"
                  title="Alterar foto"
                  style={{ cursor: uploadingPhoto ? 'not-allowed' : 'pointer' }}
                >
                  {uploadingPhoto ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : <FaCamera />}
                </label>
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  disabled={uploadingPhoto}
                />
              </div>

              {photoSuccess && (
                <div className="profile-sidebar__success">
                  <FaCheck /> Foto atualizada!
                </div>
              )}

              <div className="profile-sidebar__user-info">
                <h2 className="profile-sidebar__name">{currentUser?.name}</h2>
                <span className={`profile-sidebar__badge ${roleBadge.className}`}>
                  {roleBadge.label}
                </span>
                {activeSubscription && (
                  <span className="profile-sidebar__plan-badge">
                    ✦ Plano {activeSubscription.planName}
                  </span>
                )}
              </div>
            </div>

            
            <nav className="profile-sidebar__nav">
              <button
                className={`profile-sidebar__nav-item ${activeTab === 'perfil' ? 'active' : ''}`}
                onClick={() => setActiveTab('perfil')}
              >
                <FaUser /> Meu Perfil
              </button>
              <button
                className={`profile-sidebar__nav-item ${activeTab === 'agendamentos' ? 'active' : ''}`}
                onClick={() => navigateWithToast('/appointments', 'Indo para Meus Agendamentos...')}
              >
                <FaCalendarAlt /> Meus Agendamentos
              </button>
              {activeSubscription ? (
                <button
                  className={`profile-sidebar__nav-item ${activeTab === 'assinatura' ? 'active' : ''}`}
                  onClick={() => setShowManageModal(true)}
                >
                  <FaCreditCard /> Gerenciar Plano
                </button>
              ) : (
                <button
                  className="profile-sidebar__nav-item"
                  onClick={() => setShowSubscriptionModal(true)}
                >
                  <FaCreditCard /> Assinar Plano
                </button>
              )}
              {hasAdminAccess && (
                <button
                  className={`profile-sidebar__nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => navigateWithToast('/admin', 'Indo para o Painel Admin...')}
                >
                  <FaShieldAlt /> Painel Admin
                </button>
              )}
              <button
                className={`profile-sidebar__nav-item ${activeTab === 'senha' ? 'active' : ''}`}
                onClick={() => setActiveTab('senha')}
              >
                <FaLock /> Mudar Senha
              </button>
              <button
                className="profile-sidebar__nav-item profile-sidebar__nav-item--logout"
                onClick={handleLogout}
              >
                <FaSignOutAlt /> Sair
              </button>
            </nav>
          </aside>

    
          <main className="profile-main">
            <div className="profile-main__header">
              <h1 className="profile-main__title">
                {activeTab === 'senha' ? 'Mudar Senha' : 'Meu Perfil'}
              </h1>
              <p className="profile-main__subtitle">
                {activeTab === 'senha' ? 'Altere a senha da sua conta' : 'Gerencie suas informações pessoais'}
              </p>
            </div>

            {activeTab === 'senha' ? (
              <div className="profile-cards">
                <ChangePasswordPanel currentUser={currentUser} onToast={showToast} />
              </div>
            ) : (
            <>
        
            <div className="profile-cards">
      
              <div className="profile-card">
                <div className="profile-card__label">
                  <FaUser className="profile-card__icon" />
                  Nome
                </div>
                {editingName ? (
                  <div className="profile-card__edit-row">
                    <input
                      className="profile-card__input"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      autoFocus
                    />
                    <div className="profile-card__edit-actions">
                      <button className="btn btn--confirm btn--sm" onClick={handleSaveName} disabled={savingName}>
                        {savingName ? <span className="spinner" /> : <FaCheck />}
                      </button>
                      <button className="btn btn--cancel btn--sm" onClick={() => { setEditingName(false); setNewName(currentUser?.name || ''); }}>
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-card__value-row">
                    <span className="profile-card__value">{currentUser?.name}</span>
                    <button className="profile-card__edit-btn" onClick={() => setEditingName(true)}>
                      <FaEdit /> Editar
                    </button>
                  </div>
                )}
              </div>

    
              <div className="profile-card">
                <div className="profile-card__label">
                  <FaEnvelope className="profile-card__icon" />
                  E-mail
                </div>
                <div className="profile-card__value-row">
                  <span className="profile-card__value">{currentUser?.email}</span>
                </div>
              </div>

          
              <div className="profile-card">
                <div className="profile-card__label">
                  <FaShieldAlt className="profile-card__icon" />
                  Tipo de Conta
                </div>
                <div className="profile-card__value-row">
                  <span className={`profile-sidebar__badge ${roleBadge.className}`} style={{ fontSize: '0.9rem' }}>
                    {roleBadge.label}
                  </span>
                </div>
              </div>

       
              {!isAdmin && !isReceptionist && !isBarber && (
                <div className="profile-card">
                  <div className="profile-card__label">
                    <FaStore className="profile-card__icon" />
                    Barbearia
                  </div>
                  <div className="profile-card__value-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span className="profile-card__value" style={{ color: '#a8a8a8', fontSize: '0.85rem' }}>
                      Barbearia selecionada: <strong style={{ color: '#fff' }}>{activeBarbershop.name}</strong>
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {BARBERSHOPS.map((shop) => (
                        <button
                          key={shop.id}
                          onClick={() => handleSelectBarbershop(shop)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: activeBarbershop.id === shop.id
                              ? '1px solid #ff7a1a'
                              : '1px solid rgba(255,255,255,0.15)',
                            background: activeBarbershop.id === shop.id
                              ? 'rgba(255,122,26,0.15)'
                              : 'transparent',
                            color: activeBarbershop.id === shop.id ? '#ff7a1a' : '#a8a8a8',
                            fontWeight: activeBarbershop.id === shop.id ? 700 : 400,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.2s',
                          }}
                        >
                          {activeBarbershop.id === shop.id && <FaCheck style={{ fontSize: '0.7rem' }} />}
                          {shop.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isAdmin && !isReceptionist && !isBarber && (
                <div className="profile-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="profile-card__label" style={{ marginBottom: '1rem' }}>
                    <FaUsers className="profile-card__icon" />
                    Dependentes
                    <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.75rem', fontWeight: 400 }}>
                      {dependents.length}/{MAX_DEPENDENTS} cadastrados
                    </span>
                  </div>

                  {dependents.length === 0 && !showDependentForm && (
                    <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      Nenhum dependente cadastrado ainda.
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: dependents.length > 0 ? '1rem' : 0 }}>
                    {dependents.map((dep) => (
                      <div key={dep.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#111', border: '1px solid #2a2a2a',
                        borderRadius: 10, padding: '0.7rem 1rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'rgba(255,122,26,0.15)', border: '1px solid rgba(255,122,26,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ff7a1a', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
                          }}>
                            {dep.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{dep.name}</p>
                            <p style={{ margin: 0, color: '#777', fontSize: '0.76rem', marginTop: 2 }}>
                              {dep.age} anos · CPF: {dep.cpf}
                            </p>
                            <p style={{ margin: 0, color: '#555', fontSize: '0.72rem', marginTop: 1, fontStyle: 'italic' }}>
                              ⚠️ Não incluso no plano · agendamento individual necessário
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleOpenEditDependent(dep)}
                            style={{
                              background: 'transparent', border: '1px solid rgba(255,122,26,0.3)',
                              color: '#ff7a1a', borderRadius: 7, padding: '5px 10px',
                              cursor: 'pointer', fontSize: '0.78rem',
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteDependent(dep.id)}
                            disabled={deletingDependentId === dep.id}
                            style={{
                              background: 'transparent', border: '1px solid rgba(231,76,60,0.3)',
                              color: '#e74c3c', borderRadius: 7, padding: '5px 10px',
                              cursor: 'pointer', fontSize: '0.78rem',
                              opacity: deletingDependentId === dep.id ? 0.5 : 1,
                            }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showDependentForm && (
                    <div style={{
                      background: '#111', border: '1px solid #2a2a2a',
                      borderRadius: 10, padding: '1rem', marginBottom: '0.75rem',
                    }}>
                      <p style={{ color: '#a8a8a8', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                        {editingDependent ? 'Editar dependente' : 'Novo dependente'}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          placeholder="Nome completo *"
                          value={dependentForm.name}
                          onChange={(e) => handleDependentFormChange('name', e.target.value)}
                          style={{
                            background: '#1a1a1a', border: '1px solid #333', borderRadius: 7,
                            padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            placeholder="Idade *"
                            value={dependentForm.age}
                            onChange={(e) => handleDependentFormChange('age', e.target.value)}
                            style={{
                              background: '#1a1a1a', border: '1px solid #333', borderRadius: 7,
                              padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none',
                              width: '30%',
                            }}
                          />
                          <input
                            placeholder="CPF (000.000.000-00) *"
                            value={dependentForm.cpf}
                            onChange={(e) => handleDependentFormChange('cpf', e.target.value)}
                            style={{
                              background: '#1a1a1a', border: '1px solid #333', borderRadius: 7,
                              padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none',
                              flex: 1,
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <button
                            onClick={handleSaveDependent}
                            disabled={savingDependent}
                            style={{
                              background: '#22c55e', border: 'none', color: '#fff',
                              borderRadius: 7, padding: '7px 16px', cursor: 'pointer',
                              fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                              opacity: savingDependent ? 0.6 : 1,
                            }}
                          >
                            {savingDependent ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : <FaCheck />}
                            Salvar
                          </button>
                          <button
                            onClick={() => setShowDependentForm(false)}
                            style={{
                              background: 'transparent', border: '1px solid rgba(231,76,60,0.4)',
                              color: '#e74c3c', borderRadius: 7, padding: '7px 14px',
                              cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}
                          >
                            <FaTimes /> Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!showDependentForm && dependents.length < MAX_DEPENDENTS && (
                    <button
                      onClick={handleOpenNewDependent}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'transparent', border: '1px solid rgba(255,122,26,0.4)',
                        color: '#ff7a1a', borderRadius: 7, padding: '6px 14px',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                      }}
                    >
                      <FaPlus style={{ fontSize: '0.7rem' }} /> Adicionar dependente
                    </button>
                  )}

                  {!showDependentForm && dependents.length >= MAX_DEPENDENTS && (
                    <p style={{ color: '#666', fontSize: '0.78rem', fontStyle: 'italic' }}>
                      Limite de {MAX_DEPENDENTS} dependentes atingido.
                    </p>
                  )}
                </div>
              )}

              <div className="profile-card profile-card--photo">                <div className="profile-card__label">
                  <FaCamera className="profile-card__icon" />
                  Foto de Perfil
                </div>
                <div className="profile-card__photo-content">
                  <div className="profile-card__current-photo">
                    {displayPhoto ? (
                      <img
                        src={displayPhoto}
                        alt="Foto atual"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="profile-card__no-photo">{initials}</div>
                    )}
                  </div>
                  <div className="profile-card__photo-info" style={{ flex: 1 }}>
                    {photoPreview ? (
                    
                      <>
                        <p style={{ color: '#f59e0b', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                          Gostou da foto?
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={handleConfirmUpload}
                            disabled={uploadingPhoto}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: '#22c55e', border: 'none', color: '#fff',
                              borderRadius: '6px', padding: '6px 14px',
                              cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                              fontWeight: 700, fontSize: '0.82rem',
                              opacity: uploadingPhoto ? 0.6 : 1,
                            }}
                          >
                            {uploadingPhoto
                              ? <><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> Enviando</>
                              : <><FaCheck /> Salvar</>
                            }
                          </button>
                          <button
                            onClick={handleCancelPreview}
                            disabled={uploadingPhoto}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: 'transparent', border: '1px solid rgba(231,76,60,0.4)',
                              color: '#e74c3c', borderRadius: '6px', padding: '6px 14px',
                              cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                            }}
                          >
                            <FaTimes /> Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                    
                      <>
                        <p style={{ color: '#a8a8a8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                          {profilePhoto ? 'Foto de perfil definida' : 'Nenhuma foto definida ainda'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <label
                            htmlFor="photo-upload-card"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: 'transparent', border: '1px solid rgba(255,122,26,0.4)',
                              color: '#ff7a1a', borderRadius: '6px', padding: '5px 12px',
                              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                            }}
                          >
                            <FaCamera style={{ fontSize: '0.7rem' }} />
                            {profilePhoto ? 'Alterar' : 'Enviar foto'}
                          </label>
                          {photoSuccess && (
                            <span style={{ color: '#22c55e', fontSize: '0.78rem' }}>
                              <FaCheck /> Atualizada!
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.4rem' }}>
                          JPG, PNG, GIF, WebP • Máx. 5MB
                        </p>
                      </>
                    )}
                    <input
                      id="photo-upload-card"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                      disabled={uploadingPhoto}
                    />
                  </div>
                </div>
              </div>

            
              <div className="profile-card profile-card--subscription">
                <div className="profile-card__label">
                  <FaCreditCard className="profile-card__icon" />
                  {activeSubscription ? 'Plano Ativo' : 'Assinatura'}
                </div>
                <div className="profile-card__value-row">
                  {activeSubscription ? (
                    <>
                      <div>
                        <span className="profile-sidebar__plan-badge" style={{ fontSize: '0.95rem' }}>
                          ✦ {activeSubscription.planName}
                        </span>
                        {activeSubscription.status && (
                          <p style={{ color: activeSubscription.status === 'cancel_pending' ? '#f59e0b' : '#22c55e', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                            {activeSubscription.status === 'cancel_pending'
                              ? `Ativo até ${new Date(activeSubscription.nextBillingDate).toLocaleDateString('pt-BR')} — não será renovado`
                              : 'Ativo'}
                          </p>
                        )}
                      </div>
                      <button
                        className="btn btn--primary"
                        onClick={() => setShowManageModal(true)}
                        style={{ width: 'fit-content' }}
                      >
                        Gerenciar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="profile-card__value" style={{ color: '#a8a8a8' }}>
                        Você não possui nenhum plano ativo
                      </span>
                      <button
                        className="btn btn--primary"
                        onClick={() => setShowSubscriptionModal(true)}
                        style={{ width: 'fit-content' }}
                      >
                        Assinar Plano
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

    
            <div className="profile-quick-actions">
              <h3 className="profile-quick-actions__title">Ações Rápidas</h3>
              <div className="profile-quick-actions__grid">
                <button className="profile-action-card" onClick={() => navigateWithToast('/appointments', 'Indo para Meus Agendamentos...')}>
                  <FaCalendarAlt className="profile-action-card__icon" />
                  <span>Meus Agendamentos</span>
                </button>
                {activeSubscription ? (
                  <button className="profile-action-card" onClick={() => setShowManageModal(true)}>
                    <FaCreditCard className="profile-action-card__icon" />
                    <span>Gerenciar Plano</span>
                  </button>
                ) : (
                  <button className="profile-action-card" onClick={() => setShowSubscriptionModal(true)}>
                    <FaCreditCard className="profile-action-card__icon" />
                    <span>Assinar Plano</span>
                  </button>
                )}
                {hasAdminAccess && (
                  <button className="profile-action-card profile-action-card--admin" onClick={() => navigateWithToast('/admin', 'Indo para o Painel Admin...')}>
                    <FaShieldAlt className="profile-action-card__icon" />
                    <span>Painel Admin</span>
                  </button>
                )}
                <button className="profile-action-card profile-action-card--logout" onClick={handleLogout}>
                  <FaSignOutAlt className="profile-action-card__icon" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
            </>
            )}
          </main>
        </div>


    
        {toast && (
          <>
            <div className="profile-toast-overlay" />
            <div className="profile-toast">
              <span>{toast.message}</span>
            </div>
          </>
        )}

        {showManageModal && activeSubscription && (
          <ManageSubscriptionModal
            isOpen={showManageModal}
            onClose={() => setShowManageModal(false)}
            subscription={activeSubscription}
          />
        )}

        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          currentUser={currentUser}
        />
      </div>
    );
  }