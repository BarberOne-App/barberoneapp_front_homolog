import { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { getSession, logout } from '../../services/authService';
  import { buscarAssinaturaAtiva } from '../../services/paymentService';
  import ManageSubscriptionModal from '../ui/ManageSubscriptionModal.jsx';
  import SubscriptionModal from '../ui/SubscriptionModal.jsx';
  import { FaCalendarAlt, FaShieldAlt, FaCreditCard, FaSignOutAlt, FaCamera, FaUser, FaEnvelope, FaEdit, FaCheck, FaTimes, FaArrowLeft, FaHome, FaStore } from 'react-icons/fa';
  import { BARBERSHOPS, getActiveBarbershop, setActiveBarbershop } from '../layout/Barbershops';
  import './ProfilePage.css';
  import Header from '../layout/Header.jsx';
  import { uploadImagem, criarPreviewLocal } from '../../services/cloudinaryService';

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

    useEffect(() => {
      const user = getSession();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
      setNewName(user.name || '');
      loadUserPhoto(user.id);
      verificarAssinaturaAtiva(user.id);
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
                className="profile-sidebar__nav-item profile-sidebar__nav-item--logout"
                onClick={handleLogout}
              >
                <FaSignOutAlt /> Sair
              </button>
            </nav>
          </aside>

    
          <main className="profile-main">
            <div className="profile-main__header">
              <h1 className="profile-main__title">Meu Perfil</h1>
              <p className="profile-main__subtitle">Gerencie suas informações pessoais</p>
            </div>

        
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

              <div className="profile-card profile-card--photo">
                <div className="profile-card__label">
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