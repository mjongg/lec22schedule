import { useState } from 'react';
import { interns, shifts, type Intern } from './data/schedules';

// Helper to get yesterday's date safely
function getYesterday(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateWeekDates(startDateStr: string) {
  const dates = [];
  const parts = startDateStr.split('-');
  const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

// Check if an intern is busy at a specific hour on a specific date
function isInternBusy(intern: Intern, dateStr: string, hour: number): boolean {
  if (intern.schedules.length === 0) return false;
  
  const todaySchedule = intern.schedules.find(s => s.date === dateStr);
  let busyToday = false;
  if (todaySchedule) {
    const shift = shifts[todaySchedule.shiftId];
    if (!shift.isFree) {
      const startH = parseInt(shift.startTime.split(':')[0]);
      const endH = parseInt(shift.endTime.split(':')[0]);
      if (startH < endH) {
        if (hour >= startH && hour < endH) busyToday = true;
      } else if (startH > endH) {
        if (hour >= startH) busyToday = true;
      }
    }
  }
  
  let busyFromYesterday = false;
  const prevDateStr = getYesterday(dateStr);
  const yesterdaySchedule = intern.schedules.find(s => s.date === prevDateStr);
  if (yesterdaySchedule) {
    const shift = shifts[yesterdaySchedule.shiftId];
    if (!shift.isFree) {
      const startH = parseInt(shift.startTime.split(':')[0]);
      const endH = parseInt(shift.endTime.split(':')[0]);
      if (startH > endH) {
         if (hour < endH) busyFromYesterday = true;
      }
    }
  }
  
  return busyToday || busyFromYesterday;
}

// Get the shift details for tooltip
function getInternShiftForHour(intern: Intern, dateStr: string, hour: number): string | null {
  if (!isInternBusy(intern, dateStr, hour)) return null;
  
  const todaySchedule = intern.schedules.find(s => s.date === dateStr);
  if (todaySchedule) {
    const shift = shifts[todaySchedule.shiftId];
    if (!shift.isFree) {
      const startH = parseInt(shift.startTime.split(':')[0]);
      const endH = parseInt(shift.endTime.split(':')[0]);
      if ((startH < endH && hour >= startH && hour < endH) || (startH > endH && hour >= startH)) {
        return shift.name;
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
      if (startH > endH && hour < endH) {
         return shift.name + ' (Yesterday)';
      }
    }
  }
  return null;
}

function formatDateHeader(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  return (
    <>
      <div>{monthDay}</div>
      <div>{weekday}</div>
    </>
  );
}

function getShiftColorClass(shiftId: string) {
  if (['pre', 'or', 'opd', 'dutyAmOpd'].includes(shiftId)) return 'shift-color-blue';
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'shift-color-red';
  if (['ongAm'].includes(shiftId)) return 'shift-color-pink';
  if (['ec', 'regioAm'].includes(shiftId)) return 'shift-color-green';
  if (['off', 'from'].includes(shiftId)) return 'shift-color-white';
  return 'shift-color-grey';
}

function getDensityClass(busyCount: number) {
  if (busyCount === 0) return 'heatmap-density-0'; // Free!
  if (busyCount <= 2) return 'heatmap-density-1';
  if (busyCount <= 4) return 'heatmap-density-2';
  if (busyCount <= 6) return 'heatmap-density-3';
  return 'heatmap-density-4';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'heatmap' | 'freetime'>('dashboard');

  const wakingHours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9:59 PM
  const heatmapHours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11:59 PM

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const renderDashboardTable = (startDate: string, title: string) => {
    const weekDates = generateWeekDates(startDate);

    return (
      <div className="table-container">
        <h3 style={{textAlign: 'center', margin: '1rem 0', color: 'var(--text-primary)'}}>{title}</h3>
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="intern-name">Intern</th>
              {weekDates.map(date => (
                <th key={date}>{formatDateHeader(date)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {interns.map((intern, index) => (
              <tr key={intern.id}>
                <td className="intern-name">{index + 1}. {intern.name}</td>
                {weekDates.map(date => {
                  const schedule = intern.schedules.find(s => s.date === date);
                  const shift = schedule ? shifts[schedule.shiftId] : null;
                  const colorClass = schedule ? getShiftColorClass(schedule.shiftId) : 'shift-color-white';
                  
                  return (
                    <td key={date} className={`shift-cell ${colorClass}`}>
                      {shift ? (
                        <>
                          <span>{shift.name}</span>
                          {!shift.isFree && <span className="shift-time">{shift.startTime}-{shift.endTime}</span>}
                        </>
                      ) : (
                        <span style={{color: 'var(--text-secondary)'}}>{intern.id === 'andrieux' ? 'No Data' : 'OFF'}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="panel">
      <h2 style={{textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>TMC Spreadsheet Schedule</h2>
      <p className="subtitle" style={{textAlign: 'center', marginBottom: '2rem'}}>
        Individual schedules stacked vertically to eliminate horizontal scrolling. Exact hours are written in each block.
      </p>
      {renderDashboardTable('2026-08-10', 'Week 1 (Aug 10 - Aug 16)')}
      {renderDashboardTable('2026-08-17', 'Week 2 (Aug 17 - Aug 23)')}
    </div>
  );

  const renderHeatmap = () => {
    
    // To keep it simple and scroll-free, we render 14 days directly in one flex container? No, Google calendar is 7 days.
    // Let's just do all 14 days in the heatmap.
    const allDates = [
      ...generateWeekDates('2026-08-10'),
      ...generateWeekDates('2026-08-17')
    ];

    return (
      <div className="panel">
        <h2 style={{textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-primary)'}}>Group Busyness Heatmap</h2>
        <p className="subtitle" style={{textAlign: 'center', marginBottom: '2rem'}}>
          Quickly spot free time! <strong style={{color: '#166534'}}>Green</strong> means everyone is free. <strong style={{color: '#991b1b'}}>Red</strong> means people are busy. Hover over a cell to see who is working.
        </p>

        <div className="heatmap-container">
          <div className="heatmap-header">
            <div className="heatmap-axis-spacer"></div>
            {allDates.map(date => (
              <div key={date} className="heatmap-col-header">
                {formatDateHeader(date)}
              </div>
            ))}
          </div>

          <div className="heatmap-body">
            <div className="heatmap-axis">
              {heatmapHours.map(hour => (
                <div key={hour} className="heatmap-time-label">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>

            <div className="heatmap-day-columns">
              {allDates.map(dateStr => (
                <div key={dateStr} className="heatmap-col">
                  {heatmapHours.map(hour => {
                    const busyInterns = interns.filter(intern => isInternBusy(intern, dateStr, hour));
                    const busyCount = busyInterns.length;
                    const densityClass = getDensityClass(busyCount);
                    
                    let tooltipText = '';
                    if (busyCount === 0) {
                      tooltipText = 'Everyone is free!';
                    } else {
                      tooltipText = `Busy (${busyCount}):\n` + busyInterns.map(i => `- ${i.name.split(',')[0]} (${getInternShiftForHour(i, dateStr, hour)})`).join('\n');
                    }

                    return (
                      <div 
                        key={hour} 
                        className={`heatmap-cell ${densityClass}`}
                        title={tooltipText}
                      >
                        {busyCount === 0 ? 'Free' : busyCount}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFreeTimeCalendar = () => {
    const daysInMonth = 31;
    const firstDayIndex = 6;
    const calendarCells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="calendar-cell out-of-month"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
      
      const commonFreeHours = wakingHours.filter(hour => {
        return interns.every(intern => !isInternBusy(intern, dateStr, hour));
      });

      const formattedSlots: string[] = [];
      if (commonFreeHours.length > 0) {
        let startHour = commonFreeHours[0];
        let prevHour = startHour;

        for (let i = 1; i <= commonFreeHours.length; i++) {
          const hour = commonFreeHours[i];
          if (hour === prevHour + 1) {
            prevHour = hour;
          } else {
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
            <div className="free-time-container">
              {formattedSlots.map((slot, idx) => (
                <div key={idx} className="free-time-slot">{slot}</div>
              ))}
            </div>
          ) : (
            <div className="busy-badge">No Mutual Free Time</div>
          )}
        </div>
      );
    }

    return (
      <div className="panel">
        <h2 style={{textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>August 2026</h2>
        <p className="subtitle" style={{textAlign: 'center', marginBottom: '1.5rem'}}>
          Showing overlapping free time during waking hours (8:00 AM - 10:00 PM).
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
          TMC Spreadsheet
        </button>
        <button 
          className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          Group Heatmap
        </button>
        <button 
          className={`tab-btn ${activeTab === 'freetime' ? 'active' : ''}`}
          onClick={() => setActiveTab('freetime')}
        >
          Monthly Free Time
        </button>
      </div>

      <main>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'heatmap' && renderHeatmap()}
        {activeTab === 'freetime' && renderFreeTimeCalendar()}
      </main>
    </div>
  );
}
