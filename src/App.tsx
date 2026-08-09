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
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getShiftColorClass(shiftId: string) {
  if (['pre', 'or', 'opd', 'dutyAmOpd'].includes(shiftId)) return 'shift-color-blue';
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'shift-color-red';
  if (['ongAm'].includes(shiftId)) return 'shift-color-pink';
  if (['ec', 'regioAm'].includes(shiftId)) return 'shift-color-green';
  if (['off', 'from'].includes(shiftId)) return 'shift-color-grey';
  return 'shift-color-grey';
}

const TIMELINE_START = 6;
const TIMELINE_END = 24;
const TIMELINE_HOURS = 18;

function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

interface BlockProps {
  left: number;
  width: number;
  label: string;
  timeLabel: string;
  extendsLeft: boolean;
  extendsRight: boolean;
  colorClass: string;
}

function getShiftBlocks(schedule: DaySchedule | undefined, prevSchedule: DaySchedule | undefined): BlockProps[] {
  const blocks: BlockProps[] = [];
  
  // 1. Process Today's shift
  if (schedule) {
    const shift = shifts[schedule.shiftId];
    if (shift) {
      const start = parseTime(shift.startTime);
      const end = shift.endTime === '23:59' ? 24 : parseTime(shift.endTime);
      
      if (start > end) { // Crosses midnight
        const renderStart = Math.max(start, TIMELINE_START);
        const renderEnd = TIMELINE_END;
        if (renderStart < renderEnd) {
           blocks.push({
             left: ((renderStart - TIMELINE_START) / TIMELINE_HOURS) * 100,
             width: ((renderEnd - renderStart) / TIMELINE_HOURS) * 100,
             label: shift.name,
             timeLabel: `${shift.startTime}-${shift.endTime}`,
             extendsLeft: start < TIMELINE_START,
             extendsRight: true,
             colorClass: getShiftColorClass(schedule.shiftId)
           });
        }
      } else { // Normal shift
        const renderStart = Math.max(start, TIMELINE_START);
        const renderEnd = Math.min(end, TIMELINE_END);
        
        if (renderStart < renderEnd) {
           blocks.push({
             left: ((renderStart - TIMELINE_START) / TIMELINE_HOURS) * 100,
             width: ((renderEnd - renderStart) / TIMELINE_HOURS) * 100,
             label: shift.name,
             timeLabel: shift.isFree ? '' : `${shift.startTime}-${shift.endTime}`,
             extendsLeft: start < TIMELINE_START,
             extendsRight: end > TIMELINE_END,
             colorClass: getShiftColorClass(schedule.shiftId)
           });
        }
      }
    }
  }

  // 2. Process Yesterday's carry-over
  if (prevSchedule) {
    const prevShift = shifts[prevSchedule.shiftId];
    if (prevShift) {
      const pStart = parseTime(prevShift.startTime);
      const pEnd = prevShift.endTime === '23:59' ? 24 : parseTime(prevShift.endTime);
      
      if (pStart > pEnd) { // It crossed midnight into TODAY
        const renderStart = TIMELINE_START;
        const renderEnd = Math.min(pEnd, TIMELINE_END);
        
        if (renderStart < renderEnd) {
           blocks.push({
             left: 0,
             width: ((renderEnd - renderStart) / TIMELINE_HOURS) * 100,
             label: prevShift.name,
             timeLabel: `${prevShift.startTime}-${prevShift.endTime}`,
             extendsLeft: true,
             extendsRight: false,
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

  const wakingHours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9:59 PM

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  const renderDashboard = () => {
    const allDates = [
      ...generateWeekDates('2026-08-10'),
      ...generateWeekDates('2026-08-17')
    ];

    const axisHours = Array.from({ length: TIMELINE_HOURS }, (_, i) => TIMELINE_START + i);

    return (
      <div className="panel" style={{ padding: '2rem 1rem' }}>
        <h2 style={{textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>
          Daily Schedule (Aug 10 - Aug 23)
        </h2>
        <p className="subtitle" style={{textAlign: 'center', marginBottom: '2rem'}}>
          Scroll down to view daily schedules. The timeline runs from 6:00 AM to Midnight.
        </p>

        {allDates.map(dateStr => (
          <div key={dateStr} className="day-block">
            <div className="day-header">{formatDateHeader(dateStr)}</div>
            
            <div className="timeline-container">
              <div className="timeline-wrapper">
                
                {/* Hourly Axis */}
                <div className="timeline-axis">
                  {axisHours.map(hour => (
                    <div key={hour} className="axis-hour">
                      {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                    </div>
                  ))}
                </div>

                {/* Intern Tracks */}
                {interns.map((intern, idx) => {
                  const schedule = intern.schedules.find(s => s.date === dateStr);
                  const prevSchedule = intern.schedules.find(s => s.date === getYesterday(dateStr));
                  const blocks = getShiftBlocks(schedule, prevSchedule);

                  return (
                    <div key={intern.id} className="intern-track">
                      <div className="intern-track-name">{idx + 1}. {intern.name.split(',')[0]}</div>
                      <div className="intern-track-timeline">
                        {/* Grid lines */}
                        {axisHours.map(hour => (
                          <div key={hour} className="track-grid-line"></div>
                        ))}
                        
                        {/* Shift Blocks */}
                        {blocks.map((block, bIdx) => (
                          <div 
                            key={bIdx}
                            className={`shift-block ${block.colorClass} ${block.extendsLeft ? 'extends-left' : ''} ${block.extendsRight ? 'extends-right' : ''}`}
                            style={{ left: `${block.left}%`, width: `${block.width}%` }}
                          >
                            <div className="shift-block-label">
                              <span>{block.label}</span>
                              {block.timeLabel && <span className="shift-block-time">{block.timeLabel}</span>}
                            </div>
                          </div>
                        ))}

                        {/* No Data State */}
                        {blocks.length === 0 && schedule === undefined && (
                          <div style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {intern.id === 'andrieux' ? 'No Data' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        ))}
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
            <>
              <div className="free-time-badge">Free Time</div>
              <div className="free-hours-tooltip">
                <div className="tooltip-title">Available Slots:</div>
                {formattedSlots.map((slot, idx) => (
                  <span key={idx} className="tooltip-slot">{slot}</span>
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
      <div className="panel">
        <h2 style={{textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>August 2026</h2>
        <p className="subtitle" style={{textAlign: 'center', marginBottom: '1.5rem'}}>
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
          Daily Hourly Timeline
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
