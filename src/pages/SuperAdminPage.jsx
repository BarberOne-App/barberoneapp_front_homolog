import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/ui/Toast';
import { getSession, logout } from '../services/authService';
import {
  getAllBarbershops,
  getBarbershopDetails,
  getBarbershopUsers,
  getSuperAdminDashboard,
  updateBarbershopStatus,
} from '../services/superAdminService';
import './SuperAdminPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'pending', label: 'Pendente' },
];

const SUBSCRIPTION_OPTIONS = [
  { value: '', label: 'Todas as assinaturas' },
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'expired', label: 'Expirada' },
  { value: 'none', label: 'Sem assinatura' },
];

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  if (value == null) return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status) {
  const map = {
    active: 'Ativa',
    inactive: 'Inativa',
    blocked: 'Bloqueada',
    pending: 'Pendente',
  };
  return map[String(status || '').toLowerCase()] || String(status || '-');
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getSession(), []);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [barbershops, setBarbershops] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    q: '',
    status: '',
    plan: '',
    subscriptionStatus: '',
    createdFrom: '',
    createdTo: '',
  });

  const [selectedBarbershop, setSelectedBarbershop] = useState(null);
  const [selectedBarbershopUsers, setSelectedBarbershopUsers] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, []);

  const ensureSuperAdmin = useCallback(() => {
    if (!currentUser) {
      navigate('/login');
      return false;
    }

    if (currentUser.role !== 'super_admin') {
      navigate('/home');
      return false;
    }

    return true;
  }, [currentUser, navigate]);

  const loadDashboard = useCallback(async () => {
    const data = await getSuperAdminDashboard();
    setDashboard(data);
  }, []);

  const loadBarbershops = useCallback(async () => {
    const params = {
      page,
      limit,
      q: filters.q || undefined,
      status: filters.status || undefined,
      plan: filters.plan || undefined,
      subscriptionStatus: filters.subscriptionStatus || undefined,
      createdFrom: filters.createdFrom || undefined,
      createdTo: filters.createdTo || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await getAllBarbershops(params);
    setBarbershops(Array.isArray(result?.items) ? result.items : []);
    setTotal(Number(result?.total || 0));
    setTotalPages(Number(result?.totalPages || 1));
  }, [filters, page, limit]);

  useEffect(() => {
    if (!ensureSuperAdmin()) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadDashboard(), loadBarbershops()]);
      } catch (error) {
        if (!mounted) return;
        showToast(
          error?.response?.data?.[0] ||
            error?.response?.data?.message ||
            'Nao foi possivel carregar os dados do Super Admin.',
          'danger'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ensureSuperAdmin, loadDashboard, loadBarbershops, showToast]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    setPage(1);
    try {
      setLoading(true);
      await loadBarbershops();
    } catch (error) {
      showToast('Erro ao aplicar filtros.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (barbershopId, nextStatus) => {
    try {
      let reason = null;
      if (nextStatus === 'blocked' || nextStatus === 'inactive') {
        reason = window.prompt('Informe o motivo da alteracao de status (opcional):') || null;
      }

      await updateBarbershopStatus(barbershopId, nextStatus, reason);
      showToast('Status atualizado com sucesso.');
      await Promise.all([loadDashboard(), loadBarbershops()]);

      if (selectedBarbershop?.id === barbershopId) {
        const details = await getBarbershopDetails(barbershopId);
        setSelectedBarbershop(details);
      }
    } catch (error) {
      showToast(
        error?.response?.data?.[0] ||
          error?.response?.data?.message ||
          'Nao foi possivel atualizar o status da barbearia.',
        'danger'
      );
    }
  };

  const openDetails = async (barbershopId) => {
    try {
      setDetailsLoading(true);
      const [details, users] = await Promise.all([
        getBarbershopDetails(barbershopId),
        getBarbershopUsers(barbershopId),
      ]);

      setSelectedBarbershop(details);
      setSelectedBarbershopUsers(Array.isArray(users?.items) ? users.items : []);
    } catch (error) {
      showToast('Nao foi possivel carregar os detalhes da barbearia.', 'danger');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedBarbershop(null);
    setSelectedBarbershopUsers([]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <section className="super-admin-page">
      <div className="super-admin-topbar">
        <button className="super-admin-btn super-admin-btn--ghost" onClick={handleLogout}>
          Sair
        </button>
      </div>

      <div className="super-admin-cards">
          <article className="super-admin-card">
            <h4>Total de barbearias</h4>
            <strong>{dashboard?.totalBarbershops ?? 0}</strong>
          </article>
          <article className="super-admin-card">
            <h4>Ativas</h4>
            <strong>{dashboard?.activeBarbershops ?? 0}</strong>
          </article>
          <article className="super-admin-card">
            <h4>Bloqueadas/Inativas</h4>
            <strong>{(dashboard?.blockedBarbershops ?? 0) + (dashboard?.inactiveBarbershops ?? 0)}</strong>
          </article>
          <article className="super-admin-card">
            <h4>Assinaturas ativas</h4>
            <strong>{dashboard?.activeSubscriptions ?? 0}</strong>
          </article>
          <article className="super-admin-card">
            <h4>Novas no mês</h4>
            <strong>{dashboard?.newBarbershopsThisMonth ?? 0}</strong>
          </article>
      </div>

      <form className="super-admin-filters" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone, slug ou documento"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all-status'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.subscriptionStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, subscriptionStatus: e.target.value }))}
          >
            {SUBSCRIPTION_OPTIONS.map((option) => (
              <option key={option.value || 'all-subscription'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filtrar por nome do plano"
            value={filters.plan}
            onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value }))}
          />

          <input
            type="date"
            value={filters.createdFrom}
            onChange={(e) => setFilters((prev) => ({ ...prev, createdFrom: e.target.value }))}
          />

          <input
            type="date"
            value={filters.createdTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, createdTo: e.target.value }))}
          />

          <button type="submit" className="super-admin-btn">
            Filtrar
          </button>
      </form>

      <div className="super-admin-table-wrap">
          <table className="super-admin-table">
            <thead>
              <tr>
                <th>Barbearia</th>
                <th>Responsavel</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Criacao</th>
                <th>Indicadores</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Carregando...</td>
                </tr>
              ) : barbershops.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhuma barbearia encontrada com os filtros atuais.</td>
                </tr>
              ) : (
                barbershops.map((shop) => (
                  <tr key={shop.id}>
                    <td>
                      <strong>{shop.name}</strong>
                      <small>{shop.email || '-'} | {shop.phone || '-'}</small>
                    </td>
                    <td>
                      <strong>{shop.admin?.name || '-'}</strong>
                      <small>{shop.admin?.email || '-'}</small>
                    </td>
                    <td>
                      <strong>{shop.subscription?.subscription_plans?.name || 'Sem plano'}</strong>
                      <small>{formatCurrency(shop.subscription?.subscription_plans?.price)}</small>
                    </td>
                    <td>
                      <span className={`super-admin-status super-admin-status--${shop.status}`}>
                        {statusLabel(shop.status)}
                      </span>
                    </td>
                    <td>{formatDate(shop.createdAt)}</td>
                    <td>
                      <small>
                        Ag: {shop.metrics?.appointmentsCount || 0} | Cli: {shop.metrics?.clientsCount || 0} | Func: {shop.metrics?.employeesCount || 0}
                      </small>
                      <small>
                        Serv: {shop.metrics?.servicesCount || 0} | Prod: {shop.metrics?.productsCount || 0}
                      </small>
                    </td>
                    <td>
                      <div className="super-admin-actions">
                        <button className="super-admin-btn super-admin-btn--sm" onClick={() => openDetails(shop.id)}>
                          Detalhes
                        </button>
                        <button className="super-admin-btn super-admin-btn--sm" onClick={() => handleStatusUpdate(shop.id, 'active')}>
                          Ativar
                        </button>
                        <button className="super-admin-btn super-admin-btn--sm super-admin-btn--warn" onClick={() => handleStatusUpdate(shop.id, 'inactive')}>
                          Inativar
                        </button>
                        <button className="super-admin-btn super-admin-btn--sm super-admin-btn--danger" onClick={() => handleStatusUpdate(shop.id, 'blocked')}>
                          Bloquear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      <footer className="super-admin-pagination">
          <span>
            Pagina {page} de {totalPages} | Total: {total}
          </span>
          <div>
            <button
              className="super-admin-btn super-admin-btn--ghost"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <button
              className="super-admin-btn super-admin-btn--ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Proxima
            </button>
          </div>
      </footer>

      {selectedBarbershop ? (
        <div className="super-admin-modal-overlay" onClick={closeDetails}>
          <div className="super-admin-modal" onClick={(e) => e.stopPropagation()}>
            {detailsLoading ? (
              <p>Carregando detalhes...</p>
            ) : (
              <>
                <header>
                  <h3>{selectedBarbershop.name}</h3>
                  <button className="super-admin-btn super-admin-btn--ghost" onClick={closeDetails}>
                    Fechar
                  </button>
                </header>

                <div className="super-admin-modal-grid">
                  <div>
                    <h4>Dados principais</h4>
                    <p><strong>Slug:</strong> {selectedBarbershop.slug}</p>
                    <p><strong>Email:</strong> {selectedBarbershop.email || '-'}</p>
                    <p><strong>Telefone:</strong> {selectedBarbershop.phone || '-'}</p>
                    <p><strong>CNPJ:</strong> {selectedBarbershop.cnpj || '-'}</p>
                    <p><strong>Status:</strong> {statusLabel(selectedBarbershop.status)}</p>
                    <p><strong>Criada em:</strong> {formatDate(selectedBarbershop.created_at)}</p>
                  </div>

                  <div>
                    <h4>Assinaturas recentes</h4>
                    {(selectedBarbershop.subscriptions || []).length === 0 ? (
                      <p>Sem assinaturas registradas.</p>
                    ) : (
                      <ul className="super-admin-list">
                        {selectedBarbershop.subscriptions.map((sub) => (
                          <li key={sub.id}>
                            <strong>{sub.subscription_plans?.name || 'Plano desconhecido'}</strong>
                            <span>Status: {sub.status}</span>
                            <span>Proxima cobranca: {formatDate(sub.next_billing_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <section>
                  <h4>Usuarios vinculados ({selectedBarbershopUsers.length})</h4>
                  {selectedBarbershopUsers.length === 0 ? (
                    <p>Nenhum usuario vinculado.</p>
                  ) : (
                    <div className="super-admin-users-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>Role</th>
                            <th>Criacao</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBarbershopUsers.map((user) => (
                            <tr key={user.id}>
                              <td>{user.name}</td>
                              <td>{user.email || '-'}</td>
                              <td>{user.phone || '-'}</td>
                              <td>{user.role}</td>
                              <td>{formatDate(user.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      ) : null}

      {toast.show ? <Toast message={toast.message} type={toast.type} onClose={closeToast} /> : null}
    </section>
  );
}
