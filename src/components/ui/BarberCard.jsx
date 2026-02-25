import { useState, useEffect, useRef } from 'react';
import Button from './Button.jsx';
import './BarberCard.css';

export default function BarberCard({ 
  barber, 
  services, 
  selectedDate,
  barberId,
  getBookedSlots,
  generateTimes,
  getAvailableTimes,
  calculateTotalDuration,
  onBook, 
  showToast,
  preSelectedService,
}) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const hasPreSelected = useRef(false);

  useEffect(() => {
    if (preSelectedService && !hasPreSelected.current) {
      const serviceExists = services.find((s) => s.id === preSelectedService.id);
      if (serviceExists) {
        setSelectedServices([preSelectedService]);
        hasPreSelected.current = true;
      }
    }
  }, [preSelectedService, services]);

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  
    setSelectedTime('');
  };

  const getTotalDuration = () => {
    if (selectedServices.length === 0) return 0;
    return calculateTotalDuration(selectedServices);
  };

  const totalDuration = getTotalDuration();
  const slotsNeeded = Math.ceil(totalDuration / 30);

const bookedSlots = getBookedSlots(barberId, selectedDate) || [];
const availableTimes = getAvailableTimes(barberId, selectedDate) || [];  
const allTimes = generateTimes(30);  

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
      showToast ? showToast('Selecione pelo menos um serviço.', 'danger') : alert('Selecione pelo menos um serviço.');
      return;
    }
    if (!selectedTime) {
      showToast ? showToast('Selecione um horário.', 'danger') : alert('Selecione um horário.');
      return;
    }

    onBook({
      barberId: barber.id,
      barberName: barber.name,
      services: selectedServices,
      time: selectedTime,
    });

    setSelectedServices([]);
    setSelectedTime('');
    hasPreSelected.current = false;
  };

  const parsePrice = (price) => {
    if (!price) return 0;
    return Number(price.replace(/R\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim());
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + parsePrice(s.price), 0);

  return (
    <div className="barber-card">
      <div className="barber-card__header">
        <img src={barber.photo} alt={barber.name} className="barber-card__avatar" />
        <div className="barber-card__info">
          <h3 className="barber-card__name">{barber.name}</h3>
          <p className="barber-card__specialty">{barber.specialty}</p>
        </div>
      </div>

      <div className="barber-card__services">
        <h4>Serviços</h4>
        <div className="services-grid">
          {services.map((service) => {
            const isSelected = selectedServices.find((s) => s.id === service.id);
            return (
              <div
                key={service.id}
                className={`service-box ${isSelected ? 'service-box--selected' : ''}`}
                onClick={() => toggleService(service)}
                style={{ cursor: 'pointer' }}
              >
                <div className="service-box__name">{service.name}</div>
                <div className="service-box__price">{service.price}</div>
                {isSelected && <div className="service-box__check">✓</div>}
              </div>
            );
          })}
        </div>

        {selectedServices.length > 0 && (
          <div className="total-price">
            <strong>Total:</strong> R$ {totalPrice.toFixed(2)} ({totalDuration} min)
          </div>
        )}
      </div>

      <div className="barber-card__times">
        <h4>Horários Disponíveis</h4>

        {selectedServices.length === 0 ? (
          <p style={{ color: '#a8a8a8', textAlign: 'center', padding: '1rem' }}>
            Selecione um serviço para ver os horários disponíveis.
          </p>
        ) : availableTimes.length === 0 ? (
          <p style={{ color: '#ff9800', textAlign: 'center', padding: '1rem' }}>
            Sem horários disponíveis para este serviço.
          </p>
        ) : (
          <div className="times-grid">
            {availableTimes.map((time) => {
              const isAvailable = isTimeAvailableForSelection(time);
              return (
                <button
                  key={time}
                  className={`time-box ${selectedTime === time ? 'time-box--selected' : ''}`}
                  onClick={() => isAvailable && setSelectedTime(time)}
                  disabled={!isAvailable}
                  style={{
                    opacity: isAvailable ? 1 : 0.5,
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                  }}
                >
                  {time}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedServices.length > 0 && selectedTime && (
        <Button onClick={handleConfirm} style={{ width: '100%', marginTop: '1rem' }}>
          Confirmar Agendamento
        </Button>
      )}
    </div>
  );
}