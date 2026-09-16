import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const CalendarWidget = ({ realEvents = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find real events that fall on dates in this month
  const getEventsForDay = (day) => {
    const targetDate = new Date(year, month, day).toISOString().split('T')[0];
    return realEvents.filter((ev) => {
      const start = ev.startDate ? ev.startDate.split('T')[0] : null;
      const end = ev.endDate ? ev.endDate.split('T')[0] : null;
      const regEnd = ev.registrationEnd ? ev.registrationEnd.split('T')[0] : null;
      return start === targetDate || end === targetDate || regEnd === targetDate;
    });
  };

  const daysArray = [];
  // Empty slots before 1st of month
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= totalDays; day++) {
    daysArray.push(day);
  }

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month;

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="calendar-widget">
        <div className="calendar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarIcon size={18} color="var(--primary)" />
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {monthNames[month]} {year}
            </h4>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={prevMonth}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--text-muted)' }}
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--text-muted)' }}
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="calendar-day-header">
              {d}
            </div>
          ))}

          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} style={{ visibility: 'hidden' }}></div>;
            }

            const dayEvents = getEventsForDay(day);
            const isToday = isCurrentMonthToday && today.getDate() === day;
            const isSelected = selectedDay === day;

            return (
              <div
                key={day}
                className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'active' : ''} ${dayEvents.length > 0 ? 'has-event' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Real Events on Selected Date */}
        <div style={{ marginTop: 18, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: 8, textTransform: 'uppercase' }}>
            {monthNames[month]} {selectedDay} Schedule
          </div>
          {selectedDayEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedDayEvents.map((ev, i) => (
                <div
                  key={ev._id || i}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-light)',
                    fontSize: '0.825rem',
                    color: 'var(--primary-dark)',
                    fontWeight: 600,
                  }}
                >
                  {ev.title || ev.name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No scheduled deadlines or events on this date.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
