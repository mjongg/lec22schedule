import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon, 
  Search, 
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { interns, shifts, type Intern, type DaySchedule } from './data/schedules';

// Utility Dates
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

const TIMELINE_START = 6;
const TIMELINE_END = 24;
const TIMELINE_HOURS = 18;
const PIXELS_PER_HOUR = 60;

function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

function getShiftPillStyle(shiftId: string) {
  if (['pre', 'or', 'opd', 'dutyAmOpd'].includes(shiftId)) return 'pill-blue';
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'pill-pink';
  if (['ongAm'].includes(shiftId)) return 'pill-purple';
  if (['ec', 'regioAm'].includes(shiftId)) return 'pill-green';
  if (['off', 'from'].includes(shiftId)) return 'pill-gray';
  return 'pill-gray';
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
             colorClass: getShiftPillStyle(schedule.shiftId)
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
             colorClass: getShiftPillStyle(schedule.shiftId)
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
             colorClass: getShiftPillStyle(prevSchedule.shiftId)
           });
        }
      }
    }
  }

  return blocks;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeView, setActiveView] = useState<'dashboard' | 'calendar' | 'analytics'>('calendar');
  const [currentUserId, setCurrentUserId] = useState<string>('ong'); // Default Bea
  const [selectedWeek, setSelectedWeek] = useState('2026-08-10');
  
  // By default, select current user and maybe one other to show uncompressed UI
  const [selectedInterns, setSelectedInterns] = useState<string[]>(['ong', 'abangan', 'andrieux', 'regio']);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  const toggleInternFilter = (id: string) => {
    setSelectedInterns(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const weekStarts = ['2026-08-10', '2026-08-17'];
  const weekDates = generateWeekDates(selectedWeek);
  const axisHours = Array.from({ length: TIMELINE_HOURS }, (_, i) => TIMELINE_START + i);
  const activeInterns = interns.filter(i => selectedInterns.includes(i.id));

  const currentUser = interns.find(i => i.id === currentUserId);

  const calculateTotalDuties = (intern: Intern) => {
    return intern.schedules.filter(s => ['duty', 'dutyAmOpd', 'dutyPm'].includes(s.shiftId)).length;
  };

  // --- Views ---

  const renderDashboard = () => {
    if (!currentUser) return null;
    const dutyCount = calculateTotalDuties(currentUser);
    const freeCount = currentUser.schedules.filter(s => ['off', 'from'].includes(s.shiftId)).length;
    
    return (
      <div className="content-area">
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>Welcome back, {currentUser.name.split(',')[0]}!</h2>
        <p className="subtitle" style={{ marginBottom: '2rem' }}>Here is the information designed for your accurate insights.</p>

        <div className="dashboard-grid">
          <div className="card stat-card">
            <div className="stat-header">
              <span>Total Duties (Aug)</span>
              <Activity className="stat-icon" size={20} />
            </div>
            <div className="stat-value">{dutyCount}</div>
            <div className="stat-desc">shifts logged this rotation</div>
          </div>
          
          <div className="card stat-card">
            <div className="stat-header">
              <span>Free Days</span>
              <Sun className="stat-icon" size={20} />
            </div>
            <div className="stat-value">{freeCount}</div>
            <div className="stat-desc">OFF or FROM shifts</div>
          </div>

          <div className="card stat-card">
            <div className="stat-header">
              <span>Next Shift</span>
              <Clock className="stat-icon" size={20} />
            </div>
            <div className="stat-value" style={{fontSize: '1.5rem', marginTop: '0.5rem'}}>
              {currentUser.schedules[0]?.shiftId ? shifts[currentUser.schedules[0].shiftId].name : 'Unknown'}
            </div>
            <div className="stat-desc">Tomorrow at 07:00 AM</div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent Updates</h3>
          <p className="subtitle">Your personalized schedule overview will appear here.</p>
        </div>
      </div>
    );
  };

  const renderCalendar = () => (
    <div className="content-area" style={{ paddingBottom: '0' }}>
      <div className="calendar-view-layout">
        
        {/* Left Sidebar Filter (Peg 1 & 2 Style) */}
        <div className="calendar-sidebar">
          <div className="card filter-card">
            <h3 className="filter-title">My Calendar</h3>
            <div className="person-filter-list">
              <label className="person-filter-item">
                <input 
                  type="checkbox" 
                  checked={selectedInterns.includes(currentUserId)}
                  onChange={() => toggleInternFilter(currentUserId)}
                />
                <span className="person-filter-label">My Schedule</span>
              </label>
            </div>
          </div>

          <div className="card filter-card" style={{ flex: 1 }}>
            <h3 className="filter-title">Team Members</h3>
            <div className="person-filter-list">
              {interns.filter(i => i.id !== currentUserId).map(intern => (
                <label key={intern.id} className="person-filter-item">
                  <input 
                    type="checkbox" 
                    checked={selectedInterns.includes(intern.id)}
                    onChange={() => toggleInternFilter(intern.id)}
                  />
                  <span className="person-filter-label">{intern.name.split(',')[0]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Main Weekly Calendar Grid (Peg 3 Style) */}
        <div className="calendar-main">
          <div className="calendar-nav">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {new Date(selectedWeek).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="nav-arrows">
              <button 
                className="arrow-btn" 
                onClick={() => setSelectedWeek(weekStarts[0])}
                title="Week 1"
              >
                <ChevronLeft size={20} />
              </button>
              <button className="today-btn" onClick={() => setSelectedWeek(weekStarts[0])}>
                Week 1
              </button>
              <button 
                className="arrow-btn" 
                onClick={() => setSelectedWeek(weekStarts[1])}
                title="Week 2"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="week-header">
            <div className="time-spacer"></div>
            {weekDates.map(dateStr => {
              const d = new Date(dateStr);
              return (
                <div key={dateStr} className="day-header">
                  <div className="day-header-day">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="day-header-date">{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          <div className="week-body">
            <div className="time-axis">
              {axisHours.map(hour => (
                <div key={hour} className="time-slot">
                  <span>{hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</span>
                </div>
              ))}
            </div>

            <div className="day-columns">
              {weekDates.map(dateStr => (
                <div key={dateStr} className="day-col">
                  {/* Grid Lines */}
                  {axisHours.map(hour => (
                    <div key={hour} className="grid-line"></div>
                  ))}

                  {/* Render Shift Pills for filtered interns */}
                  {activeInterns.map((intern, idx) => {
                    const schedule = intern.schedules.find(s => s.date === dateStr);
                    const prevSchedule = intern.schedules.find(s => s.date === getYesterday(dateStr));
                    const blocks = getShiftBlocksForDay(schedule, prevSchedule);

                    const widthPct = 100 / activeInterns.length;
                    const leftPct = idx * widthPct;

                    return blocks.map((block, bIdx) => (
                      <div 
                        key={`${intern.id}-${bIdx}`}
                        className={`shift-pill ${block.colorClass}`}
                        style={{
                          top: `${block.topPx}px`,
                          height: `${block.heightPx}px`,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`
                        }}
                      >
                        <span className="pill-title">{block.label}</span>
                        {block.heightPx > 50 && (
                          <>
                            <span className="pill-time">{block.timeLabel}</span>
                            <span className="pill-intern"><User size={10} /> {intern.name.split(',')[0]}</span>
                          </>
                        )}
                      </div>
                    ));
                  })}

                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="content-area">
      <div className="card" style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>Analytics & Fairness Tracker</h2>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Intern Name</th>
              <th>Total Duties</th>
              <th>Free Days (OFF/FROM)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {interns.map(intern => {
              const duties = calculateTotalDuties(intern);
              const free = intern.schedules.filter(s => ['off', 'from'].includes(s.shiftId)).length;
              return (
                <tr key={intern.id}>
                  <td>{intern.name}</td>
                  <td>{duties}</td>
                  <td>{free}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: duties > 6 ? '#fee2e2' : '#dcfce7',
                      color: duties > 6 ? '#991b1b' : '#166534',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {duties > 6 ? 'Heavy Load' : 'Balanced'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );


  // --- Main Layout ---
  return (
    <div className="app-layout">
      {/* Left Sidebar Menu */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <CalendarDays size={20} />
          </div>
          <div className="logo-text">LEC Schedule</div>
        </div>

        <nav className="nav-menu">
          <div 
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </div>
          <div 
            className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <CalendarDays size={18} />
            <span>Team Calendar</span>
          </div>
          <div 
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-wrapper">
        <header className="topbar">
          <div className="page-title">
            {activeView === 'dashboard' && 'Dashboard Overview'}
            {activeView === 'calendar' && 'Team Calendar'}
            {activeView === 'analytics' && 'Analytics'}
          </div>
          
          <div className="topbar-actions">
            <button className="icon-btn" title="Search">
              <Search size={18} />
            </button>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="icon-btn" title="Notifications">
              <Bell size={18} />
            </button>
            
            <div className="user-profile">
              <div className="avatar">
                {currentUser?.name.charAt(0)}
              </div>
              <select 
                className="user-select" 
                value={currentUserId} 
                onChange={(e) => setCurrentUserId(e.target.value)}
              >
                {interns.map(i => (
                  <option key={i.id} value={i.id}>{i.name.split(',')[0]}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'calendar' && renderCalendar()}
        {activeView === 'analytics' && renderAnalytics()}
      </main>
    </div>
  );
}
