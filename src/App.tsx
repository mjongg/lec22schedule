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
  
  // Check today's shift
  const todaySchedule = intern.schedules.find(s => s.date === dateStr);
  if (todaySchedule) {
    const shift = shifts[todaySchedule.shiftId];
    if (!shift.isFree) {
      const startH = parseInt(shift.startTime.split(':')[0]);
      const endH = parseInt(shift.endTime.split(':')[0]);
      
      if (startH < endH) {
        if (hour >= startH && hour < endH) return true;
      } else if (startH > endH) {
        // Crosses midnight
        if (hour >= startH) return true;
      }
    }
  }
  
  // Check yesterday's shift (for shifts crossing midnight)
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

// Format date nicely (e.g. Aug 10, Mon)
function formatDate(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'freetime'>('dashboard');
  const [selectedWeekStart, setSelectedWeekStart] = useState('2026-08-10');
  const [selectedDate, setSelectedDate] = useState('2026-08-10');

  const uniqueDates = Array.from(new Set(interns.flatMap(i => i.schedules.map(s => s.date)))).sort();
  // Filter for weeks
  const weekStarts = ['2026-08-10', '2026-08-17'];

  // Hours array 0-23
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Free time calculation for selected date
  const commonFreeHours = hours.filter(hour => {
    return interns.every(intern => !isInternBusy(intern, selectedDate, hour));
  });

  const renderDashboard = () => {
    // Get dates for the selected week (7 days)
    const startDateIndex = uniqueDates.indexOf(selectedWeekStart);
    const weekDates = uniqueDates.slice(startDateIndex, startDateIndex + 7);

    return (
      <div className="fade-in">
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

        <div className="schedule-grid">
          {interns.map(intern => (
            <div key={intern.id} className="glass-panel person-card">
              <h3>{intern.name}</h3>
              {intern.schedules.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No schedule data available.</p>
              ) : (
                <div className="shift-list">
                  {weekDates.map(date => {
                    const schedule = intern.schedules.find(s => s.date === date);
                    const shift = schedule ? shifts[schedule.shiftId] : null;
                    
                    return (
                      <div key={date} className={`shift-item ${shift?.isFree ? 'free' : (shift ? 'busy' : '')}`}>
                        <div className="shift-info">
                          <span className="shift-date">{formatDate(date)}</span>
                          <span className="shift-name">{shift ? shift.name : 'Unknown'}</span>
                        </div>
                        {shift && (
                          <div className="shift-time">
                            {shift.startTime} - {shift.endTime}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFreeTimeFinder = () => {
    return (
      <div className="fade-in glass-panel">
        <div className="date-selector">
          <label>Select Date: </label>
          <select 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {uniqueDates.map(d => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </div>

        {commonFreeHours.length > 0 ? (
          <div className="free-time-summary fade-in">
            <h4>Common Free Time</h4>
            <div className="free-time-slots">
              {commonFreeHours.map(h => (
                <span key={h} className="time-slot">{String(h).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="free-time-summary fade-in" style={{ background: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
            <h4 style={{ color: 'var(--danger)' }}>No common free time on this date</h4>
          </div>
        )}

        <div className="timeline-container">
          {hours.map(hour => (
            <div key={hour} className="timeline-hour">
              <div className="hour-label">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="hour-blocks">
                {interns.map(intern => {
                  const isBusy = isInternBusy(intern, selectedDate, hour);
                  return (
                    <div 
                      key={`${intern.id}-${hour}`} 
                      className={`person-block ${isBusy ? 'unavailable' : 'available'}`}
                      title={`${intern.name}: ${isBusy ? 'Busy' : 'Free'}`}
                    >
                      {intern.name.split(',')[0]}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
          Free Time Finder
        </button>
      </div>

      <main>
        {activeTab === 'dashboard' ? renderDashboard() : renderFreeTimeFinder()}
      </main>
    </div>
  );
}
