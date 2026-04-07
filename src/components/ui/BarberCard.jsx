// import { useState, useEffect, useRef } from 'react';
// import Button from './Button.jsx';
// import './BarberCard.css';

// export default function BarberCard({
//   barber,
//   services,
//   selectedDate,
//   barberId,
//   getBookedSlots,
//   generateTimes,
//   getAvailableTimes,
//   calculateTotalDuration,
//   onBook,
//   showToast,
//   preSelectedService,
// }) {
//   const [selectedServices, setSelectedServices] = useState([]);
//   const [selectedTime, setSelectedTime] = useState('');
//   const hasPreSelected = useRef(false);

//   useEffect(() => {
//     if (preSelectedService && !hasPreSelected.current) {
//       const serviceExists = services.find((s) => s.id === preSelectedService.id);
//       if (serviceExists) {
//         setSelectedServices([preSelectedService]);
//         hasPreSelected.current = true;
//       }
//     }
//   }, [preSelectedService, services]);

//   const toggleService = (service) => {
//     setSelectedServices((prev) => {
//       const exists = prev.find((s) => s.id === service.id);
//       if (exists) {
//         return prev.filter((s) => s.id !== service.id);
//       }
//       return [...prev, service];
//     });

//     setSelectedTime('');
//   };

//   const getTotalDuration = () => {
//     if (selectedServices.length === 0) return 0;
//     return calculateTotalDuration(selectedServices);
//   };

//   const totalDuration = getTotalDuration();
//   const slotsNeeded = Math.ceil(totalDuration / 30);

//   const bookedSlots = getBookedSlots(barberId, selectedDate) || [];
//   const availableTimes = getAvailableTimes(barberId, selectedDate) || [];
//   const allTimes = generateTimes(30);

//   const isTimeAvailableForSelection = (time) => {
//     if (!slotsNeeded) return false;

//     const indexInAll = allTimes.indexOf(time);
//     if (indexInAll === -1) return false;


//     const slots = [];
//     for (let i = 0; i < slotsNeeded; i++) {
//       const t = allTimes[indexInAll + i];
//       if (!t) return false;
//       slots.push(t);
//     }


//     const hasConflict = slots.some((t) => bookedSlots.includes(t));
//     if (hasConflict) return false;


//     if (!availableTimes.includes(time)) return false;

//     return true;
//   };

//   const handleConfirm = () => {
//     if (selectedServices.length === 0) {
//       showToast ? showToast('Selecione pelo menos um serviço.', 'danger') : alert('Selecione pelo menos um serviço.');
//       return;
//     }
//     if (!selectedTime) {
//       showToast ? showToast('Selecione um horário.', 'danger') : alert('Selecione um horário.');
//       return;
//     }

//     onBook({
//       barberId: barber.id,
//       barberName: barber.name,
//       services: selectedServices,
//       time: selectedTime,
//     });

//     setSelectedServices([]);
//     setSelectedTime('');
//     hasPreSelected.current = false;
//   };

//   const parsePrice = (price) => {
//     if (!price) return 0;
//     return Number(price);
//   };

//   const totalPrice = selectedServices.reduce((sum, s) => sum + parsePrice(s.basePrice), 0);

//   return (
//     <div className="barber-card">
//       <div className="barber-card__header">
//         <img src={barber.photo} alt={barber.displayName} className="barber-card__avatar" />
//         <div className="barber-card__info">
//           <h3 className="barber-card__name">{barber.displayName}</h3>
//           <p className="barber-card__specialty">{barber.specialty}</p>
//         </div>
//       </div>

//       <div className="barber-card__services">
//         <h4>Serviços</h4>
//         <div className="services-grid">
//           {services.map((service) => {
//             const isSelected = selectedServices.find((s) => s.id === service.id);
//             return (
//               <div
//                 key={service.id}
//                 className={`service-box ${isSelected ? 'service-box--selected' : ''}`}
//                 onClick={() => toggleService(service)}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <div className="service-box__name">{service.name}</div>
//                 <div className="service-box__price">
//                   {Number(service.basePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
//                 </div>
//                 {isSelected && <div className="service-box__check">✓</div>}
//               </div>
//             );
//           })}
//         </div>

//         {selectedServices.length > 0 && (
//           <div className="total-price">
//             <strong>Total:</strong> R$ {totalPrice.toFixed(2)} ({totalDuration} min)
//           </div>
//         )}
//       </div>

//       <div className="barber-card__times">
//         <h4>Horários Disponíveis</h4>

//         {selectedServices.length === 0 ? (
//           <p style={{ color: '#a8a8a8', textAlign: 'center', padding: '1rem' }}>
//             Selecione um serviço para ver os horários disponíveis.
//           </p>
//         ) : availableTimes.length === 0 ? (
//           <p style={{ color: '#ff9800', textAlign: 'center', padding: '1rem' }}>
//             Sem horários disponíveis para este serviço.
//           </p>
//         ) : (
//           <div className="times-grid">
//             {availableTimes.map((time) => {
//               const isAvailable = isTimeAvailableForSelection(time);
//               return (
//                 <button
//                   key={time}
//                   className={`time-box ${selectedTime === time ? 'time-box--selected' : ''}`}
//                   onClick={() => isAvailable && setSelectedTime(time)}
//                   disabled={!isAvailable}
//                   style={{
//                     opacity: isAvailable ? 1 : 0.5,
//                     cursor: isAvailable ? 'pointer' : 'not-allowed',
//                   }}
//                 >
//                   {time}
//                 </button>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {selectedServices.length > 0 && selectedTime && (
//         <Button onClick={handleConfirm} style={{ width: '100%', marginTop: '1rem' }}>
//           Confirmar Agendamento
//         </Button>
//       )}
//     </div>
//   );
// }

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
  hasActiveSubscription = false,
  isServiceCoveredByPlan = () => false,
}) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const hasPreSelected = useRef(false);

  const barberName = barber.displayName || barber.name || 'Barbeiro';
  const barberInitial = String(barberName).trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    setAvatarError(false);
  }, [barber?.photo]);

  useEffect(() => {
    if (preSelectedService && !hasPreSelected.current) {
      const serviceExists = services.find((s) => s.id === preSelectedService.id);
      if (serviceExists) {
        setSelectedServices([preSelectedService]);
        hasPreSelected.current = true;
      }
    }
  }, [preSelectedService, services]);

  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

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
  const availableTimes =
    selectedServices.length > 0
      ? getAvailableTimes(barberId, selectedDate, totalDuration) || []
      : [];

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
      showToast
        ? showToast('Selecione pelo menos um serviço.', 'danger')
        : alert('Selecione pelo menos um serviço.');
      return;
    }

    if (!selectedTime) {
      showToast
        ? showToast('Selecione um horário.', 'danger')
        : alert('Selecione um horário.');
      return;
    }

    onBook({
      barberId: barber.id,
      barberName: barberName,
      services: selectedServices,
      time: selectedTime,
    });

    setSelectedServices([]);
    setSelectedTime('');
    hasPreSelected.current = false;
  };

  const parsePrice = (price) => {
    if (!price) return 0;
    return Number(price);
  };

  const getEffectiveServicePrice = (service) => {
    const raw = parsePrice(service.basePrice);
    if (hasActiveSubscription && isServiceCoveredByPlan(service)) return 0;
    return raw;
  };

  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + getEffectiveServicePrice(s),
    0
  );

  const selectedCoveredCount = selectedServices.filter(
    (service) => hasActiveSubscription && isServiceCoveredByPlan(service),
  ).length;

  return (
    <div className="barber-card">
      <div className="barber-card__header">
        {barber?.photo && !avatarError ? (
          <img
            src={barber.photo}
            alt={barberName}
            className="barber-card__avatar"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="barber-card__avatar barber-card__avatar-fallback">{barberInitial}</div>
        )}
        <div className="barber-card__info">
          <h3 className="barber-card__name">{barberName}</h3>
          <p className="barber-card__specialty">{barber.specialty}</p>
        </div>
      </div>

      <div className="barber-card__services">
        <h4>Serviços</h4>
        <div className="services-grid">
          {services.length === 0 && (
            <p style={{ color: '#a8a8a8', textAlign: 'center', padding: '1rem' }}>
              Este barbeiro ainda não possui serviços de domínio configurados.
            </p>
          )}

          {services.map((service) => {
            const isSelected = selectedServices.find((s) => s.id === service.id);
            const coveredByPlan = hasActiveSubscription && isServiceCoveredByPlan(service);
            const originalPrice = parsePrice(service.basePrice);

            return (
              <div
                key={service.id}
                className={`service-box ${isSelected ? 'service-box--selected' : ''}`}
                onClick={() => toggleService(service)}
                style={{ cursor: 'pointer' }}
              >
                <div className="service-box__name">{service.name}</div>
                <div className="service-box__price">
                  {coveredByPlan ? (
                    <>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>R$ 0,00</span>
                      <span
                        style={{
                          marginLeft: '0.45rem',
                          textDecoration: 'line-through',
                          opacity: 0.65,
                          fontSize: '0.82rem',
                        }}
                      >
                        {originalPrice.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </>
                  ) : (
                    originalPrice.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  )}
                </div>
                {isSelected && <div className="service-box__check">✓</div>}
              </div>
            );
          })}
        </div>

        {selectedServices.length > 0 && (
          <div className="total-price">
            <strong>Total:</strong>{' '}
            {totalPrice === 0
              ? 'Grátis (Plano)'
              : `R$ ${totalPrice.toFixed(2)}`}{' '}
            ({totalDuration} min)
            {selectedCoveredCount > 0 && (
              <span style={{ marginLeft: '0.5rem', color: '#22c55e', fontWeight: 600 }}>
                {selectedCoveredCount} serviço(s) coberto(s)
              </span>
            )}
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