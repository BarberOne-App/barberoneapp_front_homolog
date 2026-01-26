import Button from "./Button.jsx";
import "./Appointment.css";

export default function AppointmentCard({ appointment, onDelete, paymentStatus = null }) {
  const totalPrice = (appointment.services || []).reduce((sum, service) => {
    const price = Number(
      String(service.price ?? 0)
        .replace(/[^\d,.-]/g, "")
        .replace(",", ".")
    );

    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  return (
    <div className="appointment-card">
      <h3>{appointment.barberName}</h3>

      <p>
        <strong>Data:</strong>{" "}
        {appointment.date
          ? new Date(appointment.date).toLocaleDateString("pt-BR")
          : "-"}
      </p>

      <p>
        <strong>Horário:</strong> {appointment.time || "-"}
      </p>

      <div>
        <strong>Serviços:</strong>
        {appointment.services?.length ? (
          <ul>
            {appointment.services.map((service) => (
              <li key={service.id}>
                {service.name} — R${" "}
                {Number(
                  String(service.price)
                    .replace(/[^\d,.-]/g, "")
                    .replace(",", ".")
                ).toFixed(2)}
              </li>
            ))}
          </ul>
        ) : (
          <p>-</p>
        )}
      </div>

      <p>
        <strong>Total:</strong> R$ {totalPrice.toFixed(2)}
      </p>

      <Button onClick={() => onDelete(appointment.id)}>
        Cancelar
      </Button>
    </div>
  );
}