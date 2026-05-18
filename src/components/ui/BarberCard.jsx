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
  preSelectedTime = '',
  hasActiveSubscription = false,
  isServiceCoveredByPlan = () => false,
  isActive = false,
  onSelectBarber = () => {},
  disabled = false,
  disabledReason = '',
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
    if (disabled) {
      if (disabledReason && showToast) showToast(disabledReason, 'warning');
      return;
    }

    onSelectBarber?.();
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });

    setSelectedTime('');
  };

  useEffect(() => {
    if (!isActive && (selectedServices.length > 0 || selectedTime)) {
      setSelectedServices([]);
      setSelectedTime('');
      hasPreSelected.current = false;
    }
  }, [isActive, selectedServices.length, selectedTime]);

  const getTotalDuration = () => {
    if (selectedServices.length === 0) return 0;
    return calculateTotalDuration(selectedServices);
  };

  const totalDuration = getTotalDuration();
  const availableTimes =
    selectedServices.length > 0
      ? getAvailableTimes(barberId, selectedDate, totalDuration) || []
      : [];

  const allTimes = generateTimes(5);

  const isTimeAvailableForSelection = (time) => {
    return allTimes.includes(time) && availableTimes.includes(time);
  };

  useEffect(() => {
    if (!preSelectedTime || selectedServices.length === 0 || selectedTime) return;
    if (isTimeAvailableForSelection(preSelectedTime)) {
      setSelectedTime(preSelectedTime);
    }
  }, [preSelectedTime, selectedServices.length, selectedTime, availableTimes]);

  const handleConfirm = () => {
    if (disabled) {
      if (disabledReason && showToast) showToast(disabledReason, 'warning');
      return;
    }

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
    if (typeof price === 'number') return Number.isFinite(price) ? price : 0;

    let cleanPrice = String(price).replace(/R\$/g, '').trim();
    if (cleanPrice.includes(',')) {
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    }

    const parsed = Number(cleanPrice);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isPlanCoveredService = (service) =>
    hasActiveSubscription &&
    (service.covered_by_plan === true ||
      String(service.covered_by_plan ?? '').trim().toLowerCase() === 'true' ||
      service.coveredByPlan === true ||
      String(service.coveredByPlan ?? '').trim().toLowerCase() === 'true' ||
      service.serviceCoveredByPlan === true ||
      String(service.serviceCoveredByPlan ?? '').trim().toLowerCase() === 'true' ||
      isServiceCoveredByPlan(service));

  const getServicePrice = (service) =>
    parsePrice(service.basePrice ?? service.base_price ?? service.price ?? service.originalBasePrice);

  const getEffectiveServicePrice = (service) => {
    if (isPlanCoveredService(service)) return 0;
    return getServicePrice(service);
  };

  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + getEffectiveServicePrice(s),
    0
  );

  const selectedCoveredCount = selectedServices.filter(
    (service) => isPlanCoveredService(service),
  ).length;

  const handleHeaderSelect = () => {
    if (disabled) {
      if (disabledReason && showToast) showToast(disabledReason, 'warning');
      return;
    }

    onSelectBarber?.();
  };

  const handleHeaderKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleHeaderSelect();
  };

  return (
    <div
      className={`barber-card ${isActive ? 'barber-card--active' : ''} ${disabled ? 'barber-card--disabled' : ''}`}
      aria-disabled={disabled}
    >
      <div
        className="barber-card__header"
        onClick={handleHeaderSelect}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isActive}
      >
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
          {disabled && disabledReason && (
            <p className="barber-card__disabled-reason">{disabledReason}</p>
          )}
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
            const coveredByPlan = isPlanCoveredService(service);
            const originalPrice = getServicePrice(service);

            return (
              <div
                key={service.id}
                className={`service-box ${isSelected ? 'service-box--selected' : ''}`}
                onClick={() => toggleService(service)}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                aria-disabled={disabled}
              >
                <div className="service-box__name">{service.name}</div>
                <div className="service-box__price">
                  {coveredByPlan ? (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span
                        style={{
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
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>Incluso no plano</span>
                    </span>
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
                  onClick={() => {
                    if (disabled) {
                      if (disabledReason && showToast) showToast(disabledReason, 'warning');
                      return;
                    }
                    if (isAvailable) setSelectedTime(time);
                  }}
                  disabled={disabled || !isAvailable}
                  style={{
                    opacity: !disabled && isAvailable ? 1 : 0.5,
                    cursor: !disabled && isAvailable ? 'pointer' : 'not-allowed',
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
        <Button
          onClick={handleConfirm}
          disabled={disabled}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          Confirmar Agendamento
        </Button>
      )}
    </div>
  );
}
