import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buscarAssinaturaAtivaBarbearias } from '../services/paymentService';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/ui/Toast';
import { getSession, logout } from '../services/authService';
import {
    getAllBarbershops,
    getBarbershopDetails,
    getBarbershopUsers,
    getSuperAdminDashboard,
    getSuperAdminUsers,
    updateSuperAdminUser,
    updateBarbershopStatus,
    resetUserPassword,
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

const PANEL_SECTIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'barbershops', label: 'Barbearias' },
    { key: 'users', label: 'Usuários' },
    { key: 'subscriptions', label: 'Assinaturas' },
    { key: 'reports', label: 'Relatórios' },
];

const SECTION_CONTENT = {
    dashboard: {
        title: 'Visão Geral da Plataforma',
        subtitle: 'Acompanhe os principais indicadores globais do sistema.',
    },
    barbershops: {
        title: 'Gestão de Barbearias',
        subtitle: 'Filtre, visualize detalhes e atualize o status das barbearias.',
    },
    users: {
        title: 'Gestão de Usuários',
        subtitle: 'Acesse todas as contas e atualize email, telefone ou senha.',
    },
    subscriptions: {
        title: 'Gestão de Assinaturas',
        subtitle: 'Visualize o resumo de planos e situação atual das assinaturas.',
    },
    reports: {
        title: 'Relatórios Operacionais',
        subtitle: 'Consulte distribuição de status e atividade por barbearia.',
    },
};

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
    const [activeSection, setActiveSection] = useState('dashboard');
    const [subscriptionsByShop, setSubscriptionsByShop] = useState({});
    const [dashboard, setDashboard] = useState(null);
    const [barbershops, setBarbershops] = useState([]);
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [usersPage, setUsersPage] = useState(1);
    const [usersLimit] = useState(15);
    const [usersTotalPages, setUsersTotalPages] = useState(1);
    const [usersTotal, setUsersTotal] = useState(0);

    const [filters, setFilters] = useState({
        q: '',
        status: '',
        plan: '',
        subscriptionStatus: '',
        createdFrom: '',
        createdTo: '',
    });
    const [userFilters, setUserFilters] = useState({
        q: '',
        role: '',
    });

    const [selectedBarbershop, setSelectedBarbershop] = useState(null);
    const [selectedBarbershopUsers, setSelectedBarbershopUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserForm, setSelectedUserForm] = useState({
        email: '',
        phone: '',
        newPassword: '',
    });
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [resettingUserId, setResettingUserId] = useState(null);
    const [savingUserId, setSavingUserId] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [statusReasonModal, setStatusReasonModal] = useState({
        open: false,
        barbershopId: null,
        barbershopName: '',
        nextStatus: null,
        reason: '',
    });
    const [resetPasswordModal, setResetPasswordModal] = useState({
        open: false,
        user: null,
        newPassword: '',
        generatedPassword: '',
        isSubmitting: false,
    });
    const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

    const activeSectionContent = SECTION_CONTENT[activeSection] || SECTION_CONTENT.dashboard;

    useEffect(() => {
        const verificarAssinaturasAtivasBarbearias = async () => {
            if (!barbershops.length) {
                setSubscriptionsByShop({});
                return;
            }

            try {
                const results = await Promise.all(
                    barbershops.map(async (shop) => {
                        const email = shop.admin?.email || shop.email;

                        if (!email) {
                            return [shop.id, null];
                        }

                        const assinatura = await buscarAssinaturaAtivaBarbearias(email);

                        return [shop.id, assinatura];
                    })
                );

                setSubscriptionsByShop(Object.fromEntries(results));
            } catch (error) {
                console.error('Erro ao buscar assinaturas:', error);
                setSubscriptionsByShop({});
            }
        };

        verificarAssinaturasAtivasBarbearias();
    }, [barbershops]);

    const subscriptionRows = useMemo(() => {
        return barbershops.map((shop) => {
            const assinatura = subscriptionsByShop[shop.id];

            return {
                id: shop.id,
                name: shop.name,
                plan: assinatura?.planName || 'Sem plano',
                status: assinatura?.status || 'none',
                nextBillingAt: assinatura?.nextBillingDate || null,
                price: assinatura?.price ?? null,
            };
        });
    }, [barbershops, subscriptionsByShop]);

    const reportSummary = useMemo(() => {
        return barbershops.reduce(
            (acc, shop) => {
                const status = String(shop?.status || '').toLowerCase();
                if (status === 'active') acc.active += 1;
                if (status === 'inactive') acc.inactive += 1;
                if (status === 'blocked') acc.blocked += 1;
                if (status === 'pending') acc.pending += 1;
                acc.totalAppointments += Number(shop?.metrics?.appointmentsCount || 0);
                acc.totalClients += Number(shop?.metrics?.clientsCount || 0);
                return acc;
            },
            { active: 0, inactive: 0, blocked: 0, pending: 0, totalAppointments: 0, totalClients: 0 }
        );
    }, [barbershops]);

    const dashboardCards = useMemo(() => [
        {
            title: 'Total de barbearias',
            value: dashboard?.totalBarbershops ?? 0,
            tone: 'pink',
            hint: 'Base cadastrada na plataforma',
        },
        {
            title: 'Ativas',
            value: dashboard?.activeBarbershops ?? 0,
            tone: 'purple',
            hint: 'Barbearias em operação',
        },
        {
            title: 'Bloqueadas/Inativas',
            value: (dashboard?.blockedBarbershops ?? 0) + (dashboard?.inactiveBarbershops ?? 0),
            tone: 'blue',
            hint: 'Unidades com restrição',
        },
        {
            title: 'Assinaturas ativas',
            value: dashboard?.activeSubscriptions ?? 0,
            tone: 'orange',
            hint: 'Receita recorrente ativa',
        },
        {
            title: 'Novas no mês',
            value: dashboard?.newBarbershopsThisMonth ?? 0,
            tone: 'teal',
            hint: 'Novos cadastros recentes',
        },
    ], [dashboard]);

    const recurringRevenue = useMemo(() => {
        return subscriptionRows.reduce((total, row) => {
            if (row.status !== 'active') return total;

            return total + Number(row.price || 0);
        }, 0);
    }, [subscriptionRows]);

    const recentShops = useMemo(() => barbershops.slice(0, 5), [barbershops]);

    const trafficBreakdown = useMemo(() => {
        const total = Math.max(reportSummary.totalAppointments + reportSummary.totalClients, 1);
        const direct = Math.round((reportSummary.totalClients / total) * 100);
        const traffic = Math.max(0, 100 - direct);
        const outbound = Math.max(0, 100 - direct - traffic);

        return [
            { label: 'Direto', value: direct },
            { label: 'Agendamentos', value: traffic },
            { label: 'Assinaturas', value: outbound },
        ];
    }, [reportSummary.totalAppointments, reportSummary.totalClients]);

    const topBarbershops = useMemo(() => {
        return [...barbershops]
            .sort((a, b) => Number(b?.metrics?.appointmentsCount || 0) - Number(a?.metrics?.appointmentsCount || 0))
            .slice(0, 4);
    }, [barbershops]);

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

    const loadUsers = useCallback(async (overrides = {}) => {
        const params = {
            page: overrides.page || usersPage,
            limit: usersLimit,
            q: overrides.q !== undefined ? overrides.q : (userFilters.q || undefined),
            role: overrides.role !== undefined ? overrides.role : (userFilters.role || undefined),
        };

        const result = await getSuperAdminUsers(params);
        setUsers(Array.isArray(result?.items) ? result.items : []);
        setUsersTotal(Number(result?.total || 0));
        setUsersTotalPages(Number(result?.totalPages || 1));
    }, [userFilters, usersPage, usersLimit]);

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
                    'Não foi possível carregar os dados do Super Admin.',
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

    useEffect(() => {
        if (activeSection !== 'users') return;
        if (!ensureSuperAdmin()) return;

        let mounted = true;

        (async () => {
            try {
                setUsersLoading(true);
                await loadUsers();
            } catch (error) {
                if (!mounted) return;
                showToast(
                    error?.response?.data?.[0] ||
                    error?.response?.data?.message ||
                    'Não foi possível carregar os usuários.',
                    'danger'
                );
            } finally {
                if (mounted) setUsersLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [activeSection, ensureSuperAdmin, loadUsers, showToast]);

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

    const handleUsersSearchSubmit = async (event) => {
        event.preventDefault();
        setUsersPage(1);
        await loadUsers({ page: 1 });
    };

    const openEditUser = (user) => {
        setSelectedUser(user);
        setSelectedUserForm({
            email: user?.email || '',
            phone: user?.phone || '',
            newPassword: '',
        });
    };

    const closeEditUser = () => {
        setSelectedUser(null);
        setSelectedUserForm({
            email: '',
            phone: '',
            newPassword: '',
        });
    };

    const submitEditUser = async (event) => {
        event.preventDefault();

        if (!selectedUser) return;

        try {
            setSavingUserId(selectedUser.id);

            const payload = {
                email: String(selectedUserForm.email || '').trim(),
                phone: String(selectedUserForm.phone || '').trim(),
            };

            const nextPassword = String(selectedUserForm.newPassword || '').trim();
            if (nextPassword) {
                payload.newPassword = nextPassword;
            }

            await updateSuperAdminUser(selectedUser.id, payload);
            showToast(`Usuário ${selectedUser.name || selectedUser.email} atualizado com sucesso.`);
            closeEditUser();

            if (activeSection === 'users') {
                await loadUsers();
            }
        } catch (error) {
            showToast(
                error?.response?.data?.[0] ||
                error?.response?.data?.message ||
                'Não foi possível atualizar o usuário.',
                'danger'
            );
        } finally {
            setSavingUserId(null);
        }
    };

    const performStatusUpdate = async (barbershopId, nextStatus, reason = null) => {
        try {
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
                'Não foi possível atualizar o status da barbearia.',
                'danger'
            );
        }
    };

    const handleStatusUpdate = async (barbershopId, nextStatus) => {
        if (nextStatus === 'blocked' || nextStatus === 'inactive') {
            const shop = barbershops.find((item) => item.id === barbershopId);
            setStatusReasonModal({
                open: true,
                barbershopId,
                barbershopName: shop?.name || 'Barbearia',
                nextStatus,
                reason: '',
            });
            return;
        }

        await performStatusUpdate(barbershopId, nextStatus, null);
    };

    const closeStatusReasonModal = () => {
        setStatusReasonModal({
            open: false,
            barbershopId: null,
            barbershopName: '',
            nextStatus: null,
            reason: '',
        });
    };

    const submitStatusReasonModal = async () => {
        const reason = String(statusReasonModal.reason || '').trim() || null;
        const { barbershopId, nextStatus } = statusReasonModal;

        closeStatusReasonModal();
        await performStatusUpdate(barbershopId, nextStatus, reason);
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
            showToast('Não foi possível carregar os detalhes da barbearia.', 'danger');
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setSelectedBarbershop(null);
        setSelectedBarbershopUsers([]);
    };

    const openResetPasswordModal = (user) => {
        setResetPasswordModal({
            open: true,
            user,
            newPassword: '',
            generatedPassword: '',
            isSubmitting: false,
        });
    };

    const closeResetPasswordModal = () => {
        setResetPasswordModal({
            open: false,
            user: null,
            newPassword: '',
            generatedPassword: '',
            isSubmitting: false,
        });
    };

    const submitResetPasswordModal = async () => {
        if (!resetPasswordModal.user) return;

        try {
            setResetPasswordModal((prev) => ({ ...prev, isSubmitting: true }));
            const passwordToUse = resetPasswordModal.newPassword && resetPasswordModal.newPassword.trim().length > 0
                ? resetPasswordModal.newPassword.trim()
                : undefined;
            const res = await resetUserPassword(resetPasswordModal.user.id, passwordToUse);
            const generated = res?.password;
            setResetPasswordModal((prev) => ({
                ...prev,
                generatedPassword: generated || '',
                isSubmitting: false,
            }));
            showToast(`Senha de ${resetPasswordModal.user.name || resetPasswordModal.user.email} redefinida com sucesso.`, 'success');
        } catch (err) {
            setResetPasswordModal((prev) => ({ ...prev, isSubmitting: false }));
            showToast('Erro ao redefinir senha.', 'danger');
        }
    };

    const handleResetPassword = (user) => {
        openResetPasswordModal(user);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <section className="super-admin-page">
            <div className="super-admin-shell">
                <aside className="super-admin-sidebar">
                    <div className="super-admin-sidebar__brand">
                        <h2>BarberOne</h2>
                        <span>Painel Global</span>
                    </div>

                    <div className="super-admin-sidebar__search">
                        <input
                            type="text"
                            value={filters.q}
                            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                            placeholder="Search..."
                        />
                    </div>

                    <nav className="super-admin-sidebar__menu" aria-label="Menu do painel">
                        {PANEL_SECTIONS.map((section) => (
                            <button
                                key={section.key}
                                type="button"
                                onClick={() => setActiveSection(section.key)}
                                className={`super-admin-sidebar__item ${activeSection === section.key ? 'super-admin-sidebar__item--active' : ''}`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </nav>

                    <button className="super-admin-sidebar__logout" onClick={handleLogout} type="button">
                        Sair
                    </button>
                </aside>

                <main className="super-admin-main">
                    <header className="super-admin-topbar">
                        <div className="super-admin-topbar__titles">
                            <p className="super-admin-topbar__eyebrow">Painel Super Admin</p>
                            <h1>{activeSectionContent.title}</h1>
                            <span>{activeSectionContent.subtitle}</span>
                        </div>

                        <div className="super-admin-topbar__profile">
                            <div className="super-admin-avatar">SA</div>
                            <div>
                                <strong>{currentUser?.name || 'Super Admin'}</strong>
                                <span>{currentUser?.email || 'superadmin@barberone.com'}</span>
                            </div>
                        </div>
                    </header>

                    {activeSection === 'dashboard' ? (
                        <>
                            <section className="super-admin-hero">
                                <div>
                                    <p>Bem-vindo de volta</p>
                                    <h2>Gerencie as barbearias com visão global e ações rápidas.</h2>
                                    <span>Monitore status, planos e atividade operacional em um só lugar.</span>
                                </div>
                                <button className="super-admin-hero__button" type="button" onClick={() => setActiveSection('barbershops')}>
                                    Ver barbearias
                                </button>
                            </section>

                            <section className="super-admin-metrics-grid">
                                {dashboardCards.map((card) => (
                                    <article key={card.title} className={`super-admin-metric super-admin-metric--${card.tone}`}>
                                        <span>{card.title}</span>
                                        <strong>{card.value}</strong>
                                        <small>{card.hint}</small>
                                    </article>
                                ))}
                            </section>

                            <section className="super-admin-panels">
                                <article className="super-admin-panel super-admin-panel--wide">
                                    <div className="super-admin-panel__header">
                                        <div>
                                            <h3>Receita e atividade</h3>
                                            <p>Resumo operacional das últimas barbearias cadastradas.</p>
                                        </div>
                                        <span className="super-admin-panel__badge">Atualizado agora</span>
                                    </div>

                                    <div className="super-admin-chart">
                                        <div className="super-admin-chart__summary">
                                            <strong>{formatCurrency(recurringRevenue)}</strong>
                                            <span>Estimativa de receita recorrente</span>
                                        </div>

                                        <div className="super-admin-bars" aria-hidden="true">
                                            {topBarbershops.map((shop, index) => {
                                                const height = Math.max(20, Number(shop?.metrics?.appointmentsCount || 0) * 3);
                                                return <i key={shop.id} style={{ height: `${height}px`, opacity: 0.55 + index * 0.1 }} />;
                                            })}
                                        </div>

                                        <div className="super-admin-mini-list">
                                            {recentShops.map((shop) => (
                                                <div key={shop.id}>
                                                    <strong>{shop.name}</strong>
                                                    <span>{statusLabel(shop.status)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </article>

                                <article className="super-admin-panel super-admin-panel--side">
                                    <div className="super-admin-panel__header">
                                        <div>
                                            <h3>Distribuição</h3>
                                            <p>Visão rápida do tráfego do painel.</p>
                                        </div>
                                    </div>

                                    <div className="super-admin-donut" style={{ '--p1': `${trafficBreakdown[0]?.value || 0}%`, '--p2': `${trafficBreakdown[1]?.value || 0}%`, '--p3': `${trafficBreakdown[2]?.value || 0}%` }}>
                                        <div className="super-admin-donut__inner">
                                            <strong>{trafficBreakdown[0]?.value || 0}%</strong>
                                            <span>Clientes</span>
                                        </div>
                                    </div>

                                    <div className="super-admin-traffic-list">
                                        {trafficBreakdown.map((item) => (
                                            <div key={item.label}>
                                                <span>{item.label}</span>
                                                <strong>{item.value}%</strong>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            </section>
                        </>
                    ) : null}

                    {activeSection === 'barbershops' ? (
                        <section className="super-admin-section-block">
                            <div className="super-admin-section-block__header">
                                <div>
                                    <h3>Barbearias</h3>
                                    <p>Filtre e gerencie as unidades cadastradas.</p>
                                </div>
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

                                <button type="submit" className="super-admin-btn super-admin-btn--accent">
                                    Filtrar
                                </button>
                            </form>

                            <div className="super-admin-table-wrap">
                                <table className="super-admin-table">
                                    <thead>
                                        <tr>
                                            <th>Barbearia</th>
                                            <th>Responsável</th>
                                            <th>Plano</th>
                                            <th>Status</th>
                                            <th>Criação</th>
                                            <th>Indicadores</th>
                                            <th>Ações</th>
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
                                                        <strong>{subscriptionsByShop[shop.id]?.planName || 'Sem plano'}</strong>
                                                        <small>{formatCurrency(subscriptionsByShop[shop.id]?.price)}</small>
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
                                                            <button type="button" className="super-admin-btn super-admin-btn--sm" onClick={() => openDetails(shop.id)}>
                                                                Detalhes
                                                            </button>
                                                            <button type="button" className="super-admin-btn super-admin-btn--sm" onClick={() => handleStatusUpdate(shop.id, 'active')}>
                                                                Ativar
                                                            </button>
                                                            <button type="button" className="super-admin-btn super-admin-btn--sm super-admin-btn--warn" onClick={() => handleStatusUpdate(shop.id, 'inactive')}>
                                                                Inativar
                                                            </button>
                                                            <button type="button" className="super-admin-btn super-admin-btn--sm super-admin-btn--danger" onClick={() => handleStatusUpdate(shop.id, 'blocked')}>
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
                                    Página {page} de {totalPages} | Total: {total}
                                </span>
                                <div>
                                    <button
                                        type="button"
                                        className="super-admin-btn super-admin-btn--ghost"
                                        disabled={page <= 1}
                                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="super-admin-btn super-admin-btn--ghost"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </footer>
                        </section>
                    ) : null}

                    {activeSection === 'users' ? (
                        <section className="super-admin-section-block">
                            <div className="super-admin-section-block__header">
                                <div>
                                    <h3>Usuários</h3>
                                    <p>Liste todas as contas e atualize email, telefone ou senha.</p>
                                </div>
                            </div>

                            <form className="super-admin-filters" onSubmit={handleUsersSearchSubmit}>
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, email, telefone ou CPF"
                                    value={userFilters.q}
                                    onChange={(e) => setUserFilters((prev) => ({ ...prev, q: e.target.value }))}
                                />

                                <select
                                    value={userFilters.role}
                                    onChange={(e) => setUserFilters((prev) => ({ ...prev, role: e.target.value }))}
                                >
                                    <option value="">Todos os papéis</option>
                                    <option value="super_admin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                    <option value="barber">Barbeiro</option>
                                    <option value="receptionist">Recepcionista</option>
                                    <option value="client">Cliente</option>
                                </select>

                                <button type="submit" className="super-admin-btn super-admin-btn--accent">
                                    Buscar
                                </button>
                            </form>

                            <div className="super-admin-table-wrap">
                                <table className="super-admin-table">
                                    <thead>
                                        <tr>
                                            <th>Usuário</th>
                                            <th>Contato</th>
                                            <th>Papel</th>
                                            <th>Barbearia atual</th>
                                            <th>Criação</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersLoading ? (
                                            <tr>
                                                <td colSpan={6}>Carregando...</td>
                                            </tr>
                                        ) : users.length === 0 ? (
                                            <tr>
                                                <td colSpan={6}>Nenhum usuário encontrado com os filtros atuais.</td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id}>
                                                    <td>
                                                        <strong>{user.name}</strong>
                                                        <small>ID: {user.id}</small>
                                                    </td>
                                                    <td>
                                                        <strong>{user.email || '-'}</strong>
                                                        <small>{user.phone || '-'}</small>
                                                    </td>
                                                    <td>
                                                        <span className={`super-admin-status super-admin-status--${String(user.role || 'client').toLowerCase()}`}>
                                                            {String(user.role || '-').replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <strong>{user.barbershop?.name || '-'}</strong>
                                                        <small>{user.barbershop?.slug || '-'}</small>
                                                    </td>
                                                    <td>{formatDate(user.createdAt)}</td>
                                                    <td>
                                                        <div className="super-admin-actions">
                                                            <button
                                                                type="button"
                                                                className="super-admin-btn super-admin-btn--sm"
                                                                onClick={() => openEditUser(user)}
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="super-admin-btn super-admin-btn--sm super-admin-btn--ghost"
                                                                onClick={() => handleResetPassword(user)}
                                                                disabled={resettingUserId === user.id}
                                                            >
                                                                {resettingUserId === user.id ? 'Resetando...' : 'Resetar senha'}
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
                                    Página {usersPage} de {usersTotalPages} | Total: {usersTotal}
                                </span>
                                <div>
                                    <button
                                        type="button"
                                        className="super-admin-btn super-admin-btn--ghost"
                                        disabled={usersPage <= 1}
                                        onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="super-admin-btn super-admin-btn--ghost"
                                        disabled={usersPage >= usersTotalPages}
                                        onClick={() => setUsersPage((prev) => Math.min(usersTotalPages, prev + 1))}
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </footer>
                        </section>
                    ) : null}

                    {activeSection === 'subscriptions' ? (
                        <section className="super-admin-section-block">
                            <div className="super-admin-section-block__header">
                                <div>
                                    <h3>Assinaturas</h3>
                                    <p>Resumo dos planos ativos e recorrências.</p>
                                </div>
                            </div>

                            <div className="super-admin-table-wrap">
                                <table className="super-admin-table">
                                    <thead>
                                        <tr>
                                            <th>Barbearia</th>
                                            <th>Plano</th>
                                            <th>Status</th>
                                            <th>Próxima cobrança</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5}>Carregando...</td></tr>
                                        ) : subscriptionRows.length === 0 ? (
                                            <tr><td colSpan={5}>Nenhuma assinatura encontrada.</td></tr>
                                        ) : (
                                            subscriptionRows.map((row) => {
                                                if (row.status === 'active') {
                                                    row.status = 'Ativa';
                                                }
                                                return (
                                                    <tr key={row.id}>
                                                        <td>{row.name}</td>
                                                        <td>{row.plan}</td>
                                                        <td>
                                                            {row.status === 'active'
                                                                ? 'Ativa'
                                                                : row.status === 'trialing'
                                                                    ? 'Teste'
                                                                    : row.status === 'past_due'
                                                                        ? 'Pagamento pendente'
                                                                        : row.status === 'none'
                                                                            ? 'Sem assinatura'
                                                                            : row.status}
                                                        </td>
                                                        <td>{formatDate(row.nextBillingAt)}</td>
                                                        <td>{formatCurrency(row.price)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}

                    {activeSection === 'reports' ? (
                        <section className="super-admin-section-block">
                            <div className="super-admin-section-block__header">
                                <div>
                                    <h3>Relatórios</h3>
                                    <p>Leitura rápida dos indicadores operacionais.</p>
                                </div>
                            </div>

                            <div className="super-admin-reports-grid">
                                <article className="super-admin-card">
                                    <h4>Ativas</h4>
                                    <strong>{reportSummary.active}</strong>
                                </article>
                                <article className="super-admin-card">
                                    <h4>Inativas</h4>
                                    <strong>{reportSummary.inactive}</strong>
                                </article>
                                <article className="super-admin-card">
                                    <h4>Bloqueadas</h4>
                                    <strong>{reportSummary.blocked}</strong>
                                </article>
                                <article className="super-admin-card">
                                    <h4>Agendamentos totais</h4>
                                    <strong>{reportSummary.totalAppointments}</strong>
                                </article>
                                <article className="super-admin-card">
                                    <h4>Clientes totais</h4>
                                    <strong>{reportSummary.totalClients}</strong>
                                </article>
                            </div>
                        </section>
                    ) : null}
                </main>
            </div>

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
                                                        <span>Próxima cobrança: {formatDate(sub.next_billing_at)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <section>
                                    <h4>Usuários vinculados ({selectedBarbershopUsers.length})</h4>
                                    {selectedBarbershopUsers.length === 0 ? (
                                        <p>Nenhum usuário vinculado.</p>
                                    ) : (
                                        <div className="super-admin-users-table">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Nome</th>
                                                        <th>Email</th>
                                                        <th>Telefone</th>
                                                        <th>Role</th>
                                                        <th>Criação</th>
                                                        <th>Ações</th>
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
                                                            <td>
                                                                <button
                                                                    className="super-admin-btn super-admin-btn--ghost"
                                                                    type="button"
                                                                    onClick={() => handleResetPassword(user)}
                                                                    disabled={resettingUserId === user.id}
                                                                >
                                                                    {resettingUserId === user.id ? 'Resetando...' : 'Resetar senha'}
                                                                </button>
                                                            </td>
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

            {selectedUser ? (
                <div className="super-admin-modal-overlay" onClick={closeEditUser}>
                    <div className="super-admin-modal super-admin-modal--compact" onClick={(e) => e.stopPropagation()}>
                        <header>
                            <h3>Editar usuário</h3>
                            <button className="super-admin-btn super-admin-btn--ghost" onClick={closeEditUser} type="button">
                                Fechar
                            </button>
                        </header>

                        <p>
                            Ajuste os dados de <strong>{selectedUser.name}</strong> e salve as alterações.
                        </p>

                        <form onSubmit={submitEditUser}>
                            <div className="super-admin-user-form-grid">
                                <label className="super-admin-form-field">
                                    <span>Email</span>
                                    <input
                                        type="email"
                                        value={selectedUserForm.email}
                                        onChange={(e) => setSelectedUserForm((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="usuario@exemplo.com"
                                    />
                                </label>

                                <label className="super-admin-form-field">
                                    <span>Telefone</span>
                                    <input
                                        type="text"
                                        value={selectedUserForm.phone}
                                        onChange={(e) => setSelectedUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Somente números"
                                    />
                                </label>

                                <label className="super-admin-form-field super-admin-form-field--full">
                                    <span>Nova senha</span>
                                    <input
                                        type="password"
                                        value={selectedUserForm.newPassword}
                                        onChange={(e) => setSelectedUserForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                        placeholder="Deixe em branco para não alterar"
                                    />
                                </label>
                            </div>

                            <div className="super-admin-modal__actions">
                                <button className="super-admin-btn super-admin-btn--ghost" onClick={closeEditUser} type="button">
                                    Cancelar
                                </button>
                                <button className="super-admin-btn super-admin-btn--accent" type="submit" disabled={savingUserId === selectedUser.id}>
                                    {savingUserId === selectedUser.id ? 'Salvando...' : 'Salvar alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {statusReasonModal.open ? (
                <div className="super-admin-modal-overlay" onClick={closeStatusReasonModal}>
                    <div className="super-admin-modal super-admin-modal--compact" onClick={(e) => e.stopPropagation()}>
                        <header>
                            <h3>
                                {statusReasonModal.nextStatus === 'blocked' ? 'Bloquear barbearia' : 'Inativar barbearia'}
                            </h3>
                            <button className="super-admin-btn super-admin-btn--ghost" onClick={closeStatusReasonModal} type="button">
                                Fechar
                            </button>
                        </header>

                        <p>
                            Informe um motivo (opcional) para {statusReasonModal.nextStatus === 'blocked' ? 'bloquear' : 'inativar'} <strong>{statusReasonModal.barbershopName}</strong>.
                        </p>

                        <div className="super-admin-form-field">
                            <textarea
                                value={statusReasonModal.reason}
                                onChange={(e) => setStatusReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
                                rows={4}
                                placeholder="Ex.: pendência financeira, solicitação do responsável, ajuste interno..."
                            />
                        </div>

                        <div className="super-admin-modal__actions">
                            <button className="super-admin-btn super-admin-btn--ghost" onClick={closeStatusReasonModal} type="button">
                                Cancelar
                            </button>
                            <button
                                className={`super-admin-btn ${statusReasonModal.nextStatus === 'blocked' ? 'super-admin-btn--danger' : 'super-admin-btn--warn'}`}
                                onClick={submitStatusReasonModal}
                                type="button"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {resetPasswordModal.open ? (
                <div className="super-admin-modal-overlay" onClick={closeResetPasswordModal}>
                    <div className="super-admin-modal super-admin-modal--compact" onClick={(e) => e.stopPropagation()}>
                        <header>
                            <h3>Redefinir Senha</h3>
                            <button className="super-admin-btn super-admin-btn--ghost" onClick={closeResetPasswordModal} type="button">
                                Fechar
                            </button>
                        </header>

                        {!resetPasswordModal.generatedPassword ? (
                            <>
                                <p>
                                    Redefinir senha de <strong>{resetPasswordModal.user?.name || resetPasswordModal.user?.email}</strong>.
                                </p>

                                <div className="super-admin-form-field">
                                    <span>Nova Senha (deixe vazio para gerar automaticamente)</span>
                                    <input
                                        type="text"
                                        value={resetPasswordModal.newPassword}
                                        onChange={(e) => setResetPasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))}
                                        placeholder="Ex.: Abc@1234"
                                    />
                                </div>

                                <div className="super-admin-modal__actions">
                                    <button className="super-admin-btn super-admin-btn--ghost" onClick={closeResetPasswordModal} type="button">
                                        Cancelar
                                    </button>
                                    <button
                                        className="super-admin-btn super-admin-btn--accent"
                                        onClick={submitResetPasswordModal}
                                        disabled={resetPasswordModal.isSubmitting}
                                        type="button"
                                    >
                                        {resetPasswordModal.isSubmitting ? 'Redefinindo...' : 'Confirmar'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p>
                                    Senha de <strong>{resetPasswordModal.user?.name || resetPasswordModal.user?.email}</strong> redefinida com sucesso!
                                </p>

                                <div className="super-admin-form-field">
                                    <span>Senha Temporária</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={resetPasswordModal.generatedPassword}
                                        style={{ backgroundColor: '#0a1220', cursor: 'text' }}
                                    />
                                </div>

                                <p style={{ marginTop: '0.8rem', color: '#ffcfa8', fontSize: '0.9rem' }}>
                                    Compartilhe esta senha com o usuário. Ele deverá alterá-la no primeiro acesso.
                                </p>

                                <div className="super-admin-modal__actions">
                                    <button className="super-admin-btn super-admin-btn--accent" onClick={closeResetPasswordModal} type="button">
                                        Concluído
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}

            {toast.show ? <Toast message={toast.message} type={toast.type} onClose={closeToast} /> : null}
        </section>
    );
}
