import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/layout/BaseLayout.jsx";
import Button from "../components/ui/Button.jsx";
import DatePicker from "../components/ui/DatePicker.jsx";
import BarberCard from "../components/ui/BarberCard.jsx";
import AppointmentCard from "../components/ui/AppointmentCard.jsx";
import Toast from "../components/ui/Toast.jsx";
import PaymentModal from "../components/ui/PaymentModal.jsx";
import { getSession, logout } from "../services/authService.js";
import { getBarbers } from "../services/barberServices.js";
import { getAllServices } from "../services/serviceServices.js";
import {
  getAppointments,
  createAppointment,
  deleteAppointment,
} from "../services/appointmentService.js";
import {
  criarPagamentoAgendamento,
  buscarPagamentoAgendamento,
} from "../services/paymentService.js";
import "./AuthPages.css";

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const currentUser = getSession();

  const [view, setView] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentPayments, setAppointmentPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] =
    useState(null);

  const isAdmin = currentUser?.role === "admin" || currentUser?.isAdmin === true;

  async function loadData() {
    try {
      const [barbersData, servicesData, appointmentsData] = await Promise.all([
        getBarbers(),
        getAllServices(),
        getAppointments(),
      ]);

      setBarbers(barbersData || []);
      setServices(servicesData || []);
      setAppointments(appointmentsData || []);

      const userAppointments = (appointmentsData || []).filter(
        (apt) => apt.clientId === currentUser?.id
      );

      const paymentsMap = {};
      for (const apt of userAppointments) {
        const payment = await buscarPagamentoAgendamento(apt.id);
        if (payment) {
          paymentsMap[apt.id] = payment;
        }
      }
      setAppointmentPayments(paymentsMap);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };


  const generateTimes = () => {
    const times = [];
    let hour = 8;
    let minute = 0;

    while (hour < 19) {
      const h = String(hour).padStart(2, "0");
      const m = String(minute).padStart(2, "0");
      times.push(`${h}:${m}`);

      minute += 30;
      if (minute === 60) {
        minute = 0;
        hour += 1;
      }
    }
    return times;
  };


  const getBookedSlots = (barberId, date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];

    return appointments
      .filter(
        (apt) => apt.barberId === barberId && apt.date === dateStr
      )
      .flatMap((apt) => {
        let totalDuration = 30;

        if (Array.isArray(apt.services) && apt.services.length > 0) {
          totalDuration = apt.services.reduce((sum, s) => {
            if (s.duration) return sum + s.duration;
            if (
              typeof s.name === "string" &&
              s.name.toLowerCase().includes("corte") &&
              s.name.toLowerCase().includes("barba")
            ) {
              return sum + 60;
            }
            return sum + 30;
          }, 0);
        }

        const slots = totalDuration / 30;
        const result = [];
        let [h, m] = apt.time.split(":").map(Number);

        for (let i = 0; i < slots; i++) {
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          result.push(`${hh}:${mm}`);

          m += 30;
          if (m === 60) {
            m = 0;
            h += 1;
          }
        }

        return result;
      });
  };

 const getAvailableTimes = (barberId, date) => {
  if (!date) return [];

  const allTimes = generateTimes();
  const dateStr = date.toISOString().split("T")[0];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const isToday = dateStr === todayStr;
  let currentHour = 0;
  let currentMinute = 0;

  if (isToday) {
    currentHour = today.getHours();
    currentMinute = today.getMinutes();
  }

  const bookedTimes = appointments
    .filter((apt) => apt.barberId === barberId && apt.date === dateStr)
    .map((apt) => apt.time);

  return allTimes.filter((time) => {
    if (bookedTimes.includes(time)) return false;

    if (isToday) {
      const [hour, minute] = time.split(":").map(Number);
      if (hour < currentHour) return false;
      if (hour === currentHour && minute <= currentMinute) return false;
   
    }

    return true;
  });
};

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: "", type: "success" });
  };

  const handleBook = async (bookingData) => {
    try {
      if (!selectedDate) {
        showToast("Selecione uma data.", "danger");
        return;
      }

      const dateStr = selectedDate.toISOString().split("T")[0];
      const availableTimes = getAvailableTimes(
        bookingData.barberId,
        selectedDate
      );

      if (!availableTimes.includes(bookingData.time)) {
        showToast(
          "Este horário não está mais disponível. Por favor, selecione outro.",
          "danger"
        );
        await loadData();
        return;
      }

      const newAppointment = {
        barberId: bookingData.barberId,
        barberName: bookingData.barberName,
        services: bookingData.services,
        date: dateStr,
        time: bookingData.time,
        client: currentUser.name,
        clientId: currentUser.id,
      };

      const createdAppointment = await createAppointment(newAppointment);

      const serviceNames = bookingData.services.map((s) => s.name).join(", ");
      const totalAmount = bookingData.services.reduce((sum, s) => {
        const priceStr = s.price || "0";
        const numeric = Number(
          priceStr.replace("R$", "").replace(".", "").replace(",", ".").trim()
        );
        return sum + (Number.isNaN(numeric) ? 0 : numeric);
      }, 0);

      await criarPagamentoAgendamento({
        appointmentId: createdAppointment.id,
        userId: currentUser.id,
        userName: currentUser.name,
        amount: totalAmount,
        serviceName: serviceNames,
        barberName: bookingData.barberName,
        appointmentDate: dateStr,
        appointmentTime: bookingData.time,
      });

      await loadData();
      showToast(
        "Agendamento confirmado! Você pode pagar agora ou no estabelecimento.",
        "success"
      );
      setView("myAppointments");
    } catch (error) {
      console.error("Erro ao agendar", error);
      showToast("Erro ao realizar agendamento.", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente cancelar este agendamento?")) return;
    try {
      await deleteAppointment(id);
      await loadData();
      showToast("Agendamento cancelado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao cancelar", error);
      showToast("Erro ao cancelar agendamento.", "danger");
    }
  };

  const handleOpenPaymentModal = (appointment) => {
    const payment = appointmentPayments[appointment.id];
    if (!payment) return;

    const paymentPlan = {
      id: appointment.id,
      name: payment.serviceName,
      price: parseFloat(payment.amount),
    };

    setSelectedAppointmentForPayment({
      ...paymentPlan,
      appointmentId: appointment.id,
      paymentId: payment.id,
      isAppointment: true,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    await loadData();
    setShowPaymentModal(false);
    setSelectedAppointmentForPayment(null);
    showToast("Pagamento realizado com sucesso!", "success");
  };

  const myAppointments = appointments.filter(
    (apt) => apt.clientId === currentUser?.id
  );

  const sortedMyAppointments = [...myAppointments].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB - dateA;
  });

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
        <div className="auth-card" style={{ maxWidth: "900px" }}>
          <div className="appointments-header">
            <div>
              <h1 className="auth-title">Agendamentos</h1>
              <p className="auth-subtitle">
                Usuário: {currentUser?.name}{" "}
                {isAdmin && (
                  <span style={{ marginLeft: "10px", color: "#d4af37" }}>
                    Admin
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {isAdmin && (
                <Button onClick={() => navigate("/admin")}>Painel Admin</Button>
              )}
              <Button onClick={handleLogout}>Sair</Button>
            </div>
          </div>

          <div className="appointments-tabs">
            <button
              onClick={() => setView("calendar")}
              className={`tab-btn ${
                view === "calendar" ? "tab-btn--active" : ""
              }`}
            >
              Novo Agendamento
            </button>
            <button
              onClick={() => setView("myAppointments")}
              className={`tab-btn ${
                view === "myAppointments" ? "tab-btn--active" : ""
              }`}
            >
              Meus Agendamentos ({myAppointments.length})
            </button>
          </div>

          {view === "calendar" && (
            <div className="appointments-booking">
              <h2>Selecione uma data</h2>
              <DatePicker
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
              />

              {selectedDate && (
                <div className="appointments-barbers">
                  <h2>
                    Barbeiros disponíveis em{" "}
                    {selectedDate.toLocaleDateString("pt-BR")}
                  </h2>

                  {barbers.length === 0 ? (
  <p>Nenhum barbeiro disponível.</p>
) : (
  barbers.map((barber) => {
    const barberWithPhoto = {
      ...barber,
      photo:
        barber.photo ||
        barber.avatar ||
        `https://i.pravatar.cc/150?img=${barber.id}`,
    };

    const allTimes = generateTimes();
    const bookedSlots = getBookedSlots(barber.id, selectedDate);
    const availableTimes = getAvailableTimes(barber.id, selectedDate);

    return (
      <BarberCard
        key={barber.id}
        barber={barberWithPhoto}
        services={services}
        availableTimes={availableTimes}
        allTimes={allTimes}
        bookedSlots={bookedSlots}
        onBook={handleBook}
        showToast={showToast}
      />
    );
  })
)}
                </div>
              )}
            </div>
          )}

          {view === "myAppointments" && (
            <div className="appointments-list">
              <h2>Seus Agendamentos</h2>
              {sortedMyAppointments.length === 0 ? (
                <p className="calendar-empty">Você não tem agendamentos.</p>
              ) : (
                <div className="calendar-list">
                  {sortedMyAppointments.map((apt) => {
                    const payment = appointmentPayments[apt.id];
                    const isPending = payment && payment.status === "pending";
                    const isPaid = payment && payment.status === "paid";

                    return (
                      <div key={apt.id} className="appointment-card-wrapper">
                        <AppointmentCard
                          appointment={apt}
                          onDelete={handleDelete}
                        />

                        {payment && (
                          <div
                            style={{
                              marginTop: "10px",
                              padding: "10px",
                              backgroundColor: isPaid
                                ? "#1a4d1a"
                                : "#4d3a1a",
                              borderRadius: "4px",
                              textAlign: "center",
                            }}
                          >
                            {isPaid ? (
                              <span style={{ color: "#4ade80" }}>
                                Pago - {payment.paymentMethod}
                              </span>
                            ) : (
                              <span style={{ color: "#fbbf24" }}>
                                Pagamento Pendente - R$
                                {parseFloat(payment.amount).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {isPending && (
                          <button
                            onClick={() => handleOpenPaymentModal(apt)}
                            className="btn-edit"
                            style={{
                              marginTop: "10px",
                              width: "100%",
                              background: "#d4af37",
                              color: "#1a1a1a",
                            }}
                          >
                            Pagar Agora
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

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

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </section>
    </BaseLayout>
  );
}
