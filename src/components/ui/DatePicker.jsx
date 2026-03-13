import { useState } from "react";
import "./DatePicker.css";

export default function DatePicker({ onSelectDate, selectedDate, maxDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek };
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isAfterMaxDate = (day) => {
    if (!maxDate) return false;
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate > maxDate;
  };

  const isNextMonthBlocked = () => false;

  const handleDayClick = (day) => {
    const selectedDateObj = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    
    if (isPastDate(day) || isAfterMaxDate(day)) {
      return;
    }
    
    onSelectDate(selectedDateObj);
  };

  const { daysInMonth, startDayOfWeek } = getDaysInMonth(currentMonth);
  const today = new Date();
  
  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isPastDate = (day) => {
    const checkDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    
    const todayWithoutTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const checkDateWithoutTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    
    return checkDateWithoutTime < todayWithoutTime;
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="date-picker">
      <div className="date-picker__header">
        <button onClick={handlePrevMonth} className="date-picker__nav">
          ←
        </button>
        <h3 className="date-picker__title">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button onClick={handleNextMonth} className="date-picker__nav" disabled={isNextMonthBlocked()}>
          →
        </button>
      </div>

      <div className="date-picker__weekdays">
        <span>Dom</span>
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
      </div>

      <div className="date-picker__days">
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="date-picker__day date-picker__day--empty" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isPast = isPastDate(day);
          const isBeyondMax = isAfterMaxDate(day);
          const isDisabled = isPast || isBeyondMax;
          const selected = isSelected(day);
          
          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={`date-picker__day ${
                isToday(day) ? "date-picker__day--today" : ""
              } ${selected ? "date-picker__day--selected" : ""} ${
                isDisabled ? "date-picker__day--disabled" : ""
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}