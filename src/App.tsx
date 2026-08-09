import { useState } from 'react';
import { interns, shifts, type Intern, type DaySchedule } from './data/schedules';

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

// Check if an intern is busy at a specific hour on a specific date (for Monthly calendar)
function isInternBusy(intern: Intern, dateStr: string, hour: number): boolean {
  if (intern.schedules.length === 0) return false;
  
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

function formatDateHeader(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  return `${weekday} ${day}`;
}

function getShiftColorClass(shiftId: string) {
  if (['pre', 'or', 'opd', 'dutyAmOpd'].includes(shiftId)) return 'shift-color-blue';
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'shift-color-red';
  if (['ongAm'].includes(shiftId)) return 'shift-color-pink';
  if (['ec', 'regioAm'].includes(shiftId)) return 'shift-color-green';
  if (['off', 'from'].includes(shiftId)) return 'shift-color-white';
  return 'shift-color-grey';
}

const TIMELINE_START = 6; // 6 AM
const TIMELINE_END = 24;  // 12 AM (Midnight)
const TIMELINE_HOURS = 18;
const PIXELS_PER_HOUR = 60;

function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

interface BlockProps {
  topPx: number;
  heightPx: number;
  label: string;
  timeLabel: string;
  colorClass: string;
}

function getShiftBlocksForDay(schedule: DaySchedule | undefined, prevSchedule: DaySchedule | undefined): BlockProps[] {
  const blocks: BlockProps[] = [];
  
  if (schedule) {
    const shift = shifts[schedule.shiftId];
    if (shift && !shift.isFree) {
      const start = parseTime(shift.startTime);
      const end = shift.endTime === '23:59' ? 24 : parseTime(shift.endTime);
      
      if (start > end) { // Crosses midnight
        const renderStart = Math.max(start, TIMELINE_START);
        const renderEnd = TIMELINE_END;
        if (renderStart < renderEnd) {
           blocks.push({
             topPx: (renderStart - TIMELINE_START) * PIXELS_PER_HOUR,
             heightPx: (renderEnd - renderStart) * PIXELS_PER_HOUR,
             label: shift.name,
             timeLabel: `${shift.startTime}-${shift.endTime}`,
             colorClass: getShiftColorClass(schedule.shiftId)
           });
        }
      } else { // Normal shift
        const renderStart = Math.max(start, TIMELINE_START);
        const renderEnd = Math.min(end, TIMELINE_END);
        
        if (renderStart < renderEnd) {
           blocks.push({
             topPx: (renderStart - TIMELINE_START) * PIXELS_PER_HOUR,
             heightPx: (renderEnd - renderStart) * PIXELS_PER_HOUR,
             label: shift.name,
             timeLabel: `${shift.startTime}-${shift.endTime}`,
             colorClass: getShiftColorClass(schedule.shiftId)
           });
        }
      }
    }
  }

  if (prevSchedule) {
    const prevShift = shifts[prevSchedule.shiftId];
    if (prevShift && !prevShift.isFree) {
      const pStart = parseTime(prevShift.startTime);
      const pEnd = prevShift.endTime === '23:59' ? 24 : parseTime(prevShift.endTime);
      
      if (pStart > pEnd) { // Crossed midnight into TODAY
        const renderStart = TIMELINE_START;
        const renderEnd = Math.min(pEnd, TIMELINE_END);
        
        if (renderStart < renderEnd) {
           blocks.push({
             topPx: (renderStart - TIMELINE_START) * PIXELS_PER_HOUR,
             heightPx: (renderEnd - renderStart) * PIXELS_PER_HOUR,
             label: prevShift.name,
             timeLabel: `${prevShift.startTime}-${prevShift.endTime}`,
             colorClass: getShiftColorClass(prevSchedule.shiftId)
           });
        }
      }
    }
  }

  return blocks;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'freetime'>('dashboard');
  const [selectedWeekStart, setSelectedWeekStart] = useState('2026-08-10');

  const weekStarts = ['2026-08-10', '2026-08-17'];
  const wakingHours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9:59 PM

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const renderDashboard = () => {
    const weekDates = generateWeekDates(selectedWeekStart);
    const axisHours = Array.from({ length: TIMELINE_HOURS }, (_, i) => TIMELINE_START + i);
    const totalInterns = interns.length;

    return (
      <div className="panel" style={{ padding: '1rem' }}>
        <div className="date-selector">
          <label>Select Week: </label>
          <select 
            value={selectedWeekStart} 
            onChange={(e) => setSelectedWeekStart(e.target.value)}
          >
            {weekStarts.map(ws => {
              const parts = ws.split('-');
              const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              return <option key={ws} value={ws}>Week of {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</option>;
            })}
          </select>
        </div>

        <div className="week-calendar-container">
          <div className="week-calendar-header">
            <div className="time-axis-spacer"></div>
            {weekDates.map(date => (
              <div key={date} className="day-column-header">
                {formatDateHeader(date)}
              </div>
            ))}
          </div>
          
          <div className="week-calendar-body">
            <div className="time-axis">
              {axisHours.map(hour => (
                <div key={hour} className="time-label">
                  <span>{hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</span>
                </div>
              ))}
            </div>
            
            <div className="day-columns-container">
              {weekDates.map(dateStr => (
                <div key={dateStr} className="day-column">
                  {/* Grid Lines */}
                  {axisHours.map(hour => (
                    <div key={hour} className="hour-grid-line"></div>
                  ))}

                  {/* Shift Blocks for this day */}
                  {interns.map((intern, internIdx) => {
                    const schedule = intern.schedules.find(s => s.date === dateStr);
                    const prevSchedule = intern.schedules.find(s => s.date === getYesterday(dateStr));
                    const blocks = getShiftBlocksForDay(schedule, prevSchedule);

                    const widthPct = 100 / totalInterns;
                    const leftPct = internIdx * widthPct;
                    const initials = intern.name.split(',')[0].substring(0, 3); // e.g. ABA

                    return blocks.map((block, bIdx) => (
                      <div 
                        key={`${intern.id}-${bIdx}`}
                        className={`shift-block-vertical ${block.colorClass}`}
                        style={{
                          top: `${block.topPx}px`,
                          height: `${block.heightPx}px`,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`
                        }}
                        title={`${intern.name}: ${block.label} (${block.timeLabel})`}
                      >
                        <span className="shift-intern-name">{internIdx + 1}. {initials}</span>
                        {block.heightPx >= 45 && <span className="shift-block-name">{block.label}</span>}
                      </div>
                    ));
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
          Google Calendar View
        </button>
        <button 
          className={`tab-btn ${activeTab === 'freetime' ? 'active' : ''}`}
          onClick={() => setActiveTab('freetime')}
        >
          Monthly Free Time
        </button>
      </div>

      <main>
        {activeTab === 'dashboard' ? renderDashboard() : renderFreeTimeCalendar()}
      </main>
    </div>
  );
}
