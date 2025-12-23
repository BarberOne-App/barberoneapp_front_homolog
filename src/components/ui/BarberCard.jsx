import { useState } from "react";
import Button from "./Button.jsx";
import "./BarberCard.css";

export default function BarberCard({
  barber,
  services,
  availableTimes, 
  allTimes,       
  bookedSlots = [], 
  onBook,
  showToast,
}) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
   
    setSelectedTime("");
  };


  const getTotalDuration = () => {
    if (selectedServices.length === 0) return 0;
    return selectedServices.reduce((sum, s) => {
      if (s.duration) return sum + s.duration;
      return sum + 30; // fallback se não vier duration
    }, 0);
  };

  const totalDuration = getTotalDuration(); 
  const slotsNeeded = totalDuration / 30;

 
  const getDisplayTimes = () => {
    if (!totalDuration) return []; 

    const base = availableTimes; 

 
    if (totalDuration === 30) {
      return base;
    }

  
    if (totalDuration === 60) {
      return base.filter((time) => {
        const [, minute] = time.split(":").map(Number);
        return minute === 0;
      });
    }


    return base;
  };

  const displayTimes = getDisplayTimes();


  const isTimeAvailableForSelection = (time) => {
    if (!slotsNeeded) return false;

    const indexInAll = allTimes.indexOf(time);
    if (indexInAll === -1) return false;

    const slots = [];
    for (let i = 0; i < slotsNeeded; i++) {
      const t = allTimes[indexInAll + i];
      if (!t) return false;
      slots.push(t);
    }

    
    const hasConflict = slots.some((t) => bookedSlots.includes(t));
    if (hasConflict) return false;

   
    if (!availableTimes.includes(time)) return false;

    return true;
  };

  const handleConfirm = () => {
    if (selectedServices.length === 0) {
      showToast
        ? showToast("Selecione pelo menos um serviço.", "danger")
        : alert("Selecione pelo menos um serviço.");
      return;
    }

    if (!selectedTime) {
      showToast
        ? showToast("Selecione um horário.", "danger")
        : alert("Selecione um horário.");
      return;
    }

    onBook({
      barberId: barber.id,
      barberName: barber.name,
      services: selectedServices,
      time: selectedTime,
    });

    setSelectedServices([]);
    setSelectedTime("");
  };

  const parsePrice = (price) => {
    if (!price) return 0;
    return Number(
      price.replace("R$", "").replace(".", "").replace(",", ".").trim()
    );
  };

  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + parsePrice(s.price),
    0
  );

  return (
    <div className="barber-card">
      <div className="barber-card__header">
        <img
          src={barber.photo}
          alt={barber.name}
          className="barber-card__avatar"
        />
        <div className="barber-card__info">
          <h3 className="barber-card__name">{barber.name}</h3>
          <p className="barber-card__specialty">{barber.specialty}</p>
        </div>
      </div>

      <div className="barber-card__services">
        <h4>Serviços</h4>
        <div className="services-grid">
          {services.map((service) => {
            const selected = selectedServices.some((s) => s.id === service.id);
            return (
              <div
                key={service.id}
                className={`service-box ${
                  selected ? "service-box--selected" : ""
                }`}
                onClick={() => toggleService(service)}
              >
                <div className="service-box__name">{service.name}</div>
                <div className="service-box__price">{service.price}</div>
                {selected && <div className="service-box__check">✓</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="barber-card__times">
        <h4>Horários</h4>

        {selectedServices.length === 0 && (
          <p style={{ color: "#a8a8a8", fontSize: 14 }}>
            Selecione um serviço para ver os horários disponíveis.
          </p>
        )}

        {selectedServices.length > 0 && displayTimes.length === 0 && (
          <p>Sem horários disponíveis para este serviço.</p>
        )}

        {selectedServices.length > 0 && displayTimes.length > 0 && (
          <div className="times-grid">
            {displayTimes.map((time) => {
              const disabled = !isTimeAvailableForSelection(time);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  className={`time-box ${
                    isSelected ? "time-box--selected" : ""
                  }`}
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedTime(time)}
                >
                  {time}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="total-price">
        Total: <strong>R$ {totalPrice.toFixed(2)}</strong>
      </div>

      <Button onClick={handleConfirm} style={{ marginTop: 16 }}>
        Agendar
      </Button>
    </div>
  );
}
