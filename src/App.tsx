import { useState } from 'react';
import { interns, shifts, type Intern } from './data/schedules';

// Helper to get yesterday's date safely
function getYesterday(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Check if an intern is busy at a specific hour on a specific date
function isInternBusy(intern: Intern, dateStr: string, hour: number): boolean {
  if (intern.schedules.length === 0) return false; // No data = assume free
  
  const todaySchedule = intern.schedules.find(s => s.date === dateStr);
  if (todaySchedule) {
    const shift = shifts[todaySchedule.shiftId];
    if (!shift.isFree) {
      const startH = parseInt(shift.startTime.split(':')[0]);
      const endH = parseInt(shift.endTime.split(':')[0]);
      if (startH < endH) {
        if (hour >= startH && hour < endH) return true;
      } else if (startH > endH) {
        if (hour >= startH) return true;
      }
    }
  }
  
  const prevDateStr = getYesterday(dateStr);
  const yesterdaySchedule = intern.schedules.find(s => s.date === prevDateStr);
  if (yesterdaySchedule) {
    const shift = shifts[yesterdaySchedule.shiftId];
    if (!shift.isFree) {
      const startH = parseInt(shift.startTime.split(':')[0]);
      const endH = parseInt(shift.endTime.split(':')[0]);
      if (startH > endH) {
         if (hour < endH) return true;
      }
    }
  }
  
  return false;
}

// Format date for display
function formatDate(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

function getShiftColorClass(shiftId: string) {
  if (['pre', 'or', 'opd', 'dutyAmOpd', 'ongAm'].includes(shiftId)) return 'shift-color-blue';
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'shift-color-red';
  if (['ec', 'regioAm'].includes(shiftId)) return 'shift-color-green';
  if (['off', 'from'].includes(shiftId)) return 'shift-color-grey';
  return 'shift-color-grey';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'freetime'>('dashboard');
  const [selectedWeekStart, setSelectedWeekStart] = useState('2026-08-10');

  const uniqueDates = Array.from(new Set(interns.flatMap(i => i.schedules.map(s => s.date)))).sort();
  const weekStarts = ['2026-08-10', '2026-08-17'];

  // Waking hours: 8:00 AM to 10:00 PM (8 to 21)
  const wakingHours = Array.from({ length: 14 }, (_, i) => i + 8);

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const renderDashboard = () => {
    const startDateIndex = uniqueDates.indexOf(selectedWeekStart);
    const weekDates = uniqueDates.slice(startDateIndex, Math.min(startDateIndex + 7, uniqueDates.length));

    return (
      <div className="fade-in glass-panel">
        <div className="date-selector">
          <label>Select Week: </label>
          <select 
            value={selectedWeekStart} 
            onChange={(e) => setSelectedWeekStart(e.target.value)}
          >
            {weekStarts.map(ws => (
              <option key={ws} value={ws}>Week of {formatDate(ws)}</option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th style={{ width: '250px' }} className="intern-name">Intern</th>
                {weekDates.map(date => (
                  <th key={date}>{formatDate(date)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interns.map(intern => (
                <tr key={intern.id}>
                  <td className="intern-name">{intern.name.split(',')[0]}</td>
                  {weekDates.map(date => {
                    const schedule = intern.schedules.find(s => s.date === date);
                    const shift = schedule ? shifts[schedule.shiftId] : null;
                    const colorClass = schedule ? getShiftColorClass(schedule.shiftId) : 'shift-color-grey';
                    
                    return (
                      <td key={date} className={`shift-cell ${colorClass}`}>
                        {shift ? (
                          <>
                            <span>{shift.name}</span>
                            {!shift.isFree && <span className="shift-time">{shift.startTime}-{shift.endTime}</span>}
                          </>
                        ) : (
                          <span style={{opacity: 0.5}}>No Data</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFreeTimeCalendar = () => {
    // Generate August 2026 calendar grid
    const daysInMonth = 31;
    // Aug 1, 2026 is a Saturday (index 6 where Sun=0)
    const firstDayIndex = 6; 
    const calendarCells = [];

    // Empty cells before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="calendar-cell out-of-month"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
      
      // Calculate overlapping free time during waking hours
      const commonFreeHours = wakingHours.filter(hour => {
        return interns.every(intern => !isInternBusy(intern, dateStr, hour));
      });

      // Group contiguous hours for display (e.g., "12:00 PM - 2:00 PM")
      const formattedSlots: string[] = [];
      if (commonFreeHours.length > 0) {
        let startHour = commonFreeHours[0];
        let prevHour = startHour;

        for (let i = 1; i <= commonFreeHours.length; i++) {
          const hour = commonFreeHours[i];
          if (hour === prevHour + 1) {
            prevHour = hour;
          } else {
            // End of block
            formattedSlots.push(`${formatHour(startHour)} - ${formatHour(prevHour + 1)}`);
            startHour = hour;
            prevHour = hour;
          }
        }
      }

      calendarCells.push(
        <div key={dateStr} className="calendar-cell">
          <div className="calendar-date">{day}</div>
          {commonFreeHours.length > 0 ? (
            <>
              <div className="free-time-badge">Free Time!</div>
              <div className="free-hours-tooltip">
                <strong style={{color: 'var(--success)'}}>Available Slots:</strong>
                {formattedSlots.map((slot, idx) => (
                  <span key={idx} style={{color: 'white', fontSize: '0.8rem'}}>{slot}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="busy-badge">Busy</div>
          )}
        </div>
      );
    }

    return (
      <div className="fade-in glass-panel">
        <h2 style={{textAlign: 'center', marginBottom: '1rem'}}>August 2026</h2>
        <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
          Showing overlapping free time during waking hours (8:00 AM - 10:00 PM). Hover over green days to see exact times.
        </p>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {calendarCells}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header>
        <h1>LEC 22 Scheduler</h1>
        <p className="subtitle">Sync schedules & find the perfect time for lunch or dinner.</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Weekly Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'freetime' ? 'active' : ''}`}
          onClick={() => setActiveTab('freetime')}
        >
          Free Time Calendar
        </button>
      </div>

      <main>
        {activeTab === 'dashboard' ? renderDashboard() : renderFreeTimeCalendar()}
      </main>
    </div>
  );
}
