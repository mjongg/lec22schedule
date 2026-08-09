import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Flame,
  Settings,
  Sun,
  Moon,
  Bell,
  Clock,
  Activity,
  Users,
  Coffee,
} from 'lucide-react';
import { interns, shifts, type Intern } from './data/schedules';

/* ── helpers ── */

function generateWeekDates(startDateStr: string) {
  const dates: string[] = [];
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    dates.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    );
  }
  return dates;
}

function getYesterday(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function isInternBusyAtHour(intern: Intern, dateStr: string, hour: number): boolean {
  // Check today's schedule
  const today = intern.schedules.find((s) => s.date === dateStr);
  if (today) {
    const shift = shifts[today.shiftId];
    if (shift && !shift.isFree) {
      const sH = parseInt(shift.startTime.split(':')[0]);
      const eH = parseInt(shift.endTime.split(':')[0]);
      if (sH < eH && hour >= sH && hour < eH) return true;
      if (sH > eH && hour >= sH) return true;
    }
  }
  // Check yesterday's overnight carry‑over
  const yest = intern.schedules.find((s) => s.date === getYesterday(dateStr));
  if (yest) {
    const shift = shifts[yest.shiftId];
    if (shift && !shift.isFree) {
      const sH = parseInt(shift.startTime.split(':')[0]);
      const eH = parseInt(shift.endTime.split(':')[0]);
      if (sH > eH && hour < eH) return true;
    }
  }
  return false;
}

function formatAmPm(timeStr: string) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function pillColor(shiftId: string) {
  // AM shifts -> yellow
  if (['pre', 'dutyAmOpd', 'or', 'ec', 'opd', 'ongAm', 'regioAm'].includes(shiftId)) return 'pill-yellow';
  // PM shifts -> blue
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'pill-blue';
  // OFF shifts -> gray
  return 'pill-gray';
}

function densityClass(busy: number) {
  if (busy === 0) return 'density-0';
  if (busy <= 2) return 'density-1';
  if (busy <= 4) return 'density-2';
  if (busy <= 6) return 'density-3';
  return 'density-4';
}

function densityLabel(busy: number, total: number) {
  if (busy === 0) return '✓';
  return `${busy}/${total}`;
}

function fmtHour(h: number) {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function fmtDayHeader(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
  return { weekday, day: d };
}

const ALL_14_DATES = [...generateWeekDates('2026-08-10'), ...generateWeekDates('2026-08-17')];
const HEATMAP_HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM
const WAKING_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

/* ── component ── */

type View = 'dashboard' | 'table' | 'heatmap' | 'analytics';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<View>('table');
  const [userId, setUserId] = useState('ong');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const user = interns.find((i) => i.id === userId)!;

  /* ── Dashboard ── */
  const renderDashboard = () => {
    const duties = user.schedules.filter((s) =>
      ['duty', 'dutyAmOpd', 'dutyPm', 'ongAm', 'ongPm'].includes(s.shiftId)
    ).length;
    const freeDays = user.schedules.filter((s) => ['off', 'from'].includes(s.shiftId)).length;
    const nextShift = user.schedules[0];

    // Find next mutual free lunch slot
    const freeSlots: string[] = [];
    for (const dateStr of ALL_14_DATES) {
      const freeHrs = WAKING_HOURS.filter((h) => interns.every((i) => !isInternBusyAtHour(i, dateStr, h)));
      if (freeHrs.length > 0) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        // Build contiguous ranges
        let start = freeHrs[0];
        let prev = start;
        for (let i = 1; i <= freeHrs.length; i++) {
          if (freeHrs[i] === prev + 1) { prev = freeHrs[i]; continue; }
          freeSlots.push(`${label}: ${fmtHour(start)} – ${fmtHour(prev + 1)}`);
          start = freeHrs[i];
          prev = start;
        }
      }
      if (freeSlots.length >= 5) break;
    }

    return (
      <div className="content-area">
        <h2 className="page-heading">Welcome back, {user.name.split(',')[0]}!</h2>
        <p className="page-sub">Here's your rotation overview for August 2026.</p>

        <div className="dashboard-grid">
          <div className="card stat-card">
            <div className="stat-header">
              <span>Total Shifts</span>
              <div className="stat-icon"><Activity size={18} /></div>
            </div>
            <div className="stat-value">{duties}</div>
            <div className="stat-desc">duty/on-call shifts this rotation</div>
          </div>

          <div className="card stat-card">
            <div className="stat-header">
              <span>Days Off</span>
              <div className="stat-icon"><Sun size={18} /></div>
            </div>
            <div className="stat-value">{freeDays}</div>
            <div className="stat-desc">OFF or FROM days</div>
          </div>

          <div className="card stat-card">
            <div className="stat-header">
              <span>Next Shift</span>
              <div className="stat-icon"><Clock size={18} /></div>
            </div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>
              {nextShift ? shifts[nextShift.shiftId]?.name : '—'}
            </div>
            <div className="stat-desc">
              {nextShift ? `${new Date(nextShift.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-header">
              <span>Team Size</span>
              <div className="stat-icon"><Users size={18} /></div>
            </div>
            <div className="stat-value">{interns.length}</div>
            <div className="stat-desc">interns in LEC 22</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '0.5rem' }}>
          <h3 className="section-title"><Coffee size={16} /> Upcoming Mutual Free Slots</h3>
          <p className="section-desc">Time windows where <strong>everyone</strong> in LEC 22 is free (8 AM – 10 PM)</p>
          <div className="free-slots-list">
            {freeSlots.length > 0 ? (
              freeSlots.map((slot, i) => (
                <div key={i} className="free-slot-badge">{slot}</div>
              ))
            ) : (
              <p className="text-muted">No mutual free slots found in the next 14 days.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Team Table (TMC Spreadsheet) ── */
  const renderWeekTable = (weekStart: string, title: string) => {
    const dates = generateWeekDates(weekStart);
    return (
      <div className="table-wrap">
        <h3 className="week-title">{title}</h3>
        <div className="table-scroll">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="intern-name">Intern</th>
                {dates.map((d) => {
                  const { weekday, day } = fmtDayHeader(d);
                  return (
                    <th key={d}>
                      <div className="col-day">{weekday}</div>
                      <div className="col-date">{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {interns.map((intern, idx) => (
                <tr key={intern.id}>
                  <td className="intern-name">
                    <span className="intern-num">{idx + 1}</span>
                    {intern.name.split(',')[0]}
                  </td>
                  {dates.map((d) => {
                    const sched = intern.schedules.find((s) => s.date === d);
                    const shift = sched ? shifts[sched.shiftId] : null;
                    const color = sched ? pillColor(sched.shiftId) : '';
                    return (
                      <td key={d} className={`shift-pill-cell ${color}`}>
                        {shift ? (
                          <>
                            <div className="shift-name">{shift.name}</div>
                            {!shift.isFree && (
                              <div className="shift-time">
                                {formatAmPm(shift.startTime)} – {formatAmPm(shift.endTime)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="shift-name" style={{ opacity: 0.4 }}>
                            {intern.id === 'andrieux' ? 'No Data' : '—'}
                          </div>
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

  const renderTable = () => (
    <div className="content-area">
      <h2 className="page-heading">Team Schedule</h2>
      <p className="page-sub">Everyone's individual schedule — Week 1 and Week 2 stacked.</p>
      {renderWeekTable('2026-08-10', 'Week 1  ·  Aug 10 – 16')}
      {renderWeekTable('2026-08-17', 'Week 2  ·  Aug 17 – 23')}
    </div>
  );

  /* ── Heatmap ── */
  const renderHeatmap = () => {
    const totalInterns = interns.length;
    return (
      <div className="content-area">
        <h2 className="page-heading">Group Busyness Heatmap</h2>
        <p className="page-sub">
          Instantly see when the team is free.{' '}
          <strong className="legend-free">Green ✓ = Everyone Free</strong>,{' '}
          <strong className="legend-busy">Red = Busy</strong>.
          Hover for details.
        </p>

        <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <div className="heatmap-grid">
            {/* Header row */}
            <div className="heatmap-corner"></div>
            {ALL_14_DATES.map((d) => {
              const { weekday, day } = fmtDayHeader(d);
              return (
                <div key={d} className="heatmap-header-cell">
                  <div>{weekday}</div>
                  <div style={{ fontWeight: 700 }}>{day}</div>
                </div>
              );
            })}

            {/* Hour rows */}
            {HEATMAP_HOURS.map((hour) => (
              <>
                <div key={`t-${hour}`} className="heatmap-time-cell">
                  {fmtHour(hour)}
                </div>
                {ALL_14_DATES.map((dateStr) => {
                  const busyInterns = interns.filter((i) => isInternBusyAtHour(i, dateStr, hour));
                  const busy = busyInterns.length;
                  const tooltip =
                    busy === 0
                      ? 'Everyone is free!'
                      : `${busy} busy:\n${busyInterns.map((i) => `• ${i.name.split(',')[0]}`).join('\n')}`;
                  return (
                    <div
                      key={`${dateStr}-${hour}`}
                      className={`heatmap-cell ${densityClass(busy)}`}
                      title={tooltip}
                    >
                      {densityLabel(busy, totalInterns)}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="legend-item"><span className="legend-swatch density-0"></span> Free</span>
          <span className="legend-item"><span className="legend-swatch density-1"></span> 1–2 busy</span>
          <span className="legend-item"><span className="legend-swatch density-2"></span> 3–4 busy</span>
          <span className="legend-item"><span className="legend-swatch density-3"></span> 5–6 busy</span>
          <span className="legend-item"><span className="legend-swatch density-4"></span> 7–8 busy</span>
        </div>
      </div>
    );
  };

  /* ── Analytics ── */
  const renderAnalytics = () => (
    <div className="content-area">
      <h2 className="page-heading">Analytics & Fairness Tracker</h2>
      <p className="page-sub">Duty distribution across LEC 22 interns for this rotation.</p>

      <div className="card">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Intern</th>
              <th>Duties</th>
              <th>Free Days</th>
              <th>Total Logged</th>
              <th>Load</th>
            </tr>
          </thead>
          <tbody>
            {interns.map((intern, idx) => {
              const duties = intern.schedules.filter((s) =>
                ['duty', 'dutyAmOpd', 'dutyPm', 'ongAm', 'ongPm'].includes(s.shiftId)
              ).length;
              const free = intern.schedules.filter((s) =>
                ['off', 'from'].includes(s.shiftId)
              ).length;
              const total = intern.schedules.length;
              const isHeavy = duties >= 6;
              return (
                <tr key={intern.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{intern.name.split(',')[0]}</td>
                  <td>{duties}</td>
                  <td>{free}</td>
                  <td>{total}</td>
                  <td>
                    <span className={`load-badge ${isHeavy ? 'load-heavy' : 'load-ok'}`}>
                      {isHeavy ? 'Heavy' : 'Balanced'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ── Layout ── */
  const navItems: { id: View; icon: typeof LayoutDashboard; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'table', icon: CalendarDays, label: 'Team Schedule' },
    { id: 'heatmap', icon: Flame, label: 'Heatmap' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon"><CalendarDays size={20} /></div>
          <span className="logo-text">LEC 22</span>
        </div>

        <nav className="nav-menu">
          {navItems.map(({ id, icon: Icon, label }) => (
            <div
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => {}}>
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-wrapper">
        <header className="topbar">
          <div className="page-title">
            {view === 'dashboard' && 'Dashboard'}
            {view === 'table' && 'Team Schedule'}
            {view === 'heatmap' && 'Group Heatmap'}
            {view === 'analytics' && 'Analytics'}
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} title="Toggle Theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="icon-btn" title="Notifications">
              <Bell size={18} />
            </button>

            <div className="user-profile">
              <div className="avatar">{user.name.charAt(0)}</div>
              <select
                className="user-select"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name.split(',')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {view === 'dashboard' && renderDashboard()}
        {view === 'table' && renderTable()}
        {view === 'heatmap' && renderHeatmap()}
        {view === 'analytics' && renderAnalytics()}
      </main>
    </div>
  );
}
