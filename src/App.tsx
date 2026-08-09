import { useState, useEffect } from 'react';
import {
  Radio,
  BookOpen,
  MessageSquare,
  CalendarDays,
  Flame,
  Sun,
  Moon,
  Bell,
  Coffee,
  ArrowLeft,
  CheckSquare,
  Square,
  FileText,
  Pin,
  AlertCircle,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { interns, shifts, type Intern } from './data/schedules';

/* ── Helpers ── */

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
  // Check yesterday's overnight carry-over
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
  if (['pre', 'dutyAmOpd', 'or', 'ec', 'opd', 'ongAm', 'regioAm'].includes(shiftId)) return 'pill-yellow';
  if (['duty', 'dutyPm', 'ongPm'].includes(shiftId)) return 'pill-blue';
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

/* ── Knowledge Base Guides Data ── */

interface KBGuide {
  id: string;
  icon: string;
  title: string;
  desc: string;
  category: string;
  content: {
    subtitle: string;
    sections: { title: string; items: string[] }[];
    notes?: string;
  };
}

const KB_GUIDES: KBGuide[] = [
  {
    id: 'surgery',
    icon: '🔪',
    title: 'Surgery Survival Guide',
    desc: 'OR etiquette, scrub protocols, suture quick reference, and post-op ward rounds.',
    category: 'Surgical',
    content: {
      subtitle: 'Essential Operating Room Procedures & Ward Management for LEC 22',
      sections: [
        {
          title: 'OR Etiquette & Preparation',
          items: [
            'Arrive 30 minutes before first case; introduce yourself to scrub nurse and circulator.',
            'Scrub for 3 to 5 minutes using chlorhexidine before the first case of the day.',
            'Keep hands above waist level and below shoulder level at all times once sterile.',
            'Review patient pre-op lab results (CBC, PT/PTT, Blood Type & Crossmatch) prior to incision.',
          ],
        },
        {
          title: 'Suture Materials & Applications',
          items: [
            'Silk (Non-absorbable): Drains, skin closure, vessel ligation.',
            'Vicryl / Polyglactin (Absorbable): Subcutaneous closure, fascia, bowel anastomosis.',
            'Monocryl / Poliglecaprone (Absorbable): Subcuticular skin closure.',
            'Nylon / Ethilon (Non-absorbable): Skin closure, tension sutures.',
          ],
        },
        {
          title: 'Post-Op Ward Rounds Template',
          items: [
            'S/O: Pain score, flatus/bowel movement, drain output, vital signs.',
            'A: Post-op Day # [X] status post [Procedure Name].',
            'P: Wound dressing check, diet advance as tolerated, pain management, ambulation.',
          ],
        },
      ],
      notes: 'Always double-check post-op orders with the senior resident before signing off on charts.',
    },
  },
  {
    id: 'obgyn',
    icon: '🤰',
    title: 'OBGYN Cheat Sheet',
    desc: 'Delivery room checklist, APGAR scoring, labor stage monitoring, and NST reading.',
    category: 'Obstetrics',
    content: {
      subtitle: 'Delivery Room Protocols & High-Risk Obstetrics Reference',
      sections: [
        {
          title: 'APGAR Score Quick Reference (1 & 5 Minutes)',
          items: [
            'Appearance (Color): 0 = Blue/Pale, 1 = Body Pink / Extremities Blue, 2 = Completely Pink.',
            'Pulse (Heart Rate): 0 = Absent, 1 = < 100 bpm, 2 = ≥ 100 bpm.',
            'Grimace (Reflex): 0 = No response, 1 = Grimace, 2 = Cough/Sneeze/Cry.',
            'Activity (Muscle Tone): 0 = Limp, 1 = Flexion of arms/legs, 2 = Active movement.',
            'Respiration (Effort): 0 = Absent, 1 = Slow/Irregular, 2 = Good cry.',
          ],
        },
        {
          title: 'Stages of Labor',
          items: [
            'First Stage: Onset of true labor to 10cm full cervical dilation (Latent < 6cm, Active ≥ 6cm).',
            'Second Stage: Full dilation to delivery of infant.',
            'Third Stage: Delivery of infant to delivery of placenta.',
            'Fourth Stage: First 2 hours post-placental delivery (monitor uterine tone & bleeding).',
          ],
        },
        {
          title: 'Delivery Room Prep Checklist',
          items: [
            'Warm radiant warmer and prepare sterile towels.',
            'Verify suction apparatus function and oxygen supply.',
            'Prepare cord clamp, umbilical scissors, and oxytocin 10u IM.',
          ],
        },
      ],
      notes: 'Notify senior consultant immediately for fetal bradycardia (<110 bpm) or heavy vaginal bleeding.',
    },
  },
  {
    id: 'peds',
    icon: '👶',
    title: 'Pediatrics Pocket Guide',
    desc: 'Pediatric dosing (mg/kg), fluid resuscitation, maintenance formulas, and normal vitals.',
    category: 'Pediatrics',
    content: {
      subtitle: 'Clinical Formulas & Emergency Dosing for Pediatric Patients',
      sections: [
        {
          title: 'Holiday-Segar Maintenance Fluid Calculator',
          items: [
            'First 10 kg: 100 mL / kg / 24 hours (4 mL/kg/hr)',
            'Next 10 kg (11-20 kg): Add 50 mL / kg / 24 hours (2 mL/kg/hr)',
            'Each kg > 20 kg: Add 20 mL / kg / 24 hours (1 mL/kg/hr)',
            'Standard Maintenance Solution: D5 0.45% NaCl + 20 mEq KCl/L.',
          ],
        },
        {
          title: 'Common Pediatric Medication Dosages',
          items: [
            'Paracetamol: 10 - 15 mg/kg/dose Q4-6H (Max 75 mg/kg/day).',
            'Ibuprofen: 5 - 10 mg/kg/dose Q6-8H (Max 40 mg/kg/day).',
            'Amoxicillin: 45 - 90 mg/kg/day divided BID or TID.',
            'Salbutamol Nebulization: 2.5 mg (if < 20kg) or 5 mg (if > 20kg) Q20M x 3 doses for acute asthma.',
          ],
        },
        {
          title: 'Pediatric Normal Vital Signs by Age',
          items: [
            'Neonate (<28 days): HR 100-180, RR 30-60, Systolic BP 60-90.',
            'Infant (1-12 mo): HR 100-160, RR 30-50, Systolic BP 70-100.',
            'Child (1-5 yr): HR 80-130, RR 20-30, Systolic BP 80-110.',
            'School Age (6-12 yr): HR 70-110, RR 18-24, Systolic BP 90-120.',
          ],
        },
      ],
      notes: 'Always double-check pediatric drug calculations with weight in kg before ordering.',
    },
  },
  {
    id: 'im',
    icon: '🩺',
    title: 'Internal Medicine Playbook',
    desc: 'ABG interpretation, ECG system, hypertensive crisis protocol, and rounding orders.',
    category: 'Medicine',
    content: {
      subtitle: 'Diagnostic Protocols & Emergency Therapeutics for Internal Medicine',
      sections: [
        {
          title: 'ABG Systematic 5-Step Analysis',
          items: [
            'Step 1: Check pH (Normal: 7.35 - 7.45; < 7.35 = Acidemia, > 7.45 = Alkalemia).',
            'Step 2: Check PaCO2 (Normal: 35 - 45 mmHg; Respiratory indicator).',
            'Step 3: Check HCO3 (Normal: 22 - 26 mEq/L; Metabolic indicator).',
            'Step 4: Identify primary disorder & check compensation.',
            'Step 5: Calculate Anion Gap if metabolic acidosis: Na - (Cl + HCO3). Normal = 8-12.',
          ],
        },
        {
          title: 'Hypertensive Urgency vs Emergency Management',
          items: [
            'Hypertensive Emergency: BP > 180/120 with acute end-organ damage (stroke, ACS, pulmonary edema). Reduce MAP by 20-25% in 1st hour using IV Nicardipine or Labetalol.',
            'Hypertensive Urgency: BP > 180/120 WITHOUT acute end-organ damage. Gradual reduction over 24-48 hours using oral Captopril or Clonidine.',
          ],
        },
        {
          title: 'Daily IM Progress Note (SOAP)',
          items: [
            'S: Overnight events, active complaints, input/output (24h urine & intake balance).',
            'O: Vitals, physical exam findings, latest labs & imaging results.',
            'A: Problem list with diagnostic status.',
            'P: Diagnostic plan, therapeutic changes, disposition/discharge planning.',
          ],
        },
      ],
      notes: 'Ensure all telemetry alarms and critical lab values are addressed immediately during shift handover.',
    },
  },
  {
    id: 'er',
    icon: '⚡',
    title: 'ER Triage & ACLS Quick Ref',
    desc: 'ACLS cardiac arrest algorithm, emergency meds, trauma primary survey (ABCDE).',
    category: 'Emergency',
    content: {
      subtitle: 'High-Yield Resuscitation & Emergency Department Algorithms',
      sections: [
        {
          title: 'ACLS Cardiac Arrest Algorithm Summary',
          items: [
            'Shockable Rhythms (VF / Pulseless VT): Deliver Shock -> CPR 2 min -> Shock -> Epinephrine 1mg Q3-5M -> Amiodarone 300mg (2nd dose 150mg).',
            'Non-Shockable Rhythms (PEA / Asystole): CPR 2 min -> Epinephrine 1mg Q3-5M ASAP -> Identify & treat 5 H\'s and 5 T\'s.',
            '5 H\'s: Hypovolemia, Hypoxia, Hydrogen ion (acidosis), Hypo/Hyperkalemia, Hypothermia.',
            '5 T\'s: Tension pneumothorax, Tamponade (cardiac), Toxins, Thrombosis (pulmonary), Thrombosis (coronary).',
          ],
        },
        {
          title: 'Trauma Primary Survey (ABCDE)',
          items: [
            'A - Airway maintenance with cervical spine restriction.',
            'B - Breathing and ventilation assessment.',
            'C - Circulation with hemorrhage control (2 large bore 16G IVs).',
            'D - Disability: Neurological evaluation (GCS, pupil response).',
            'E - Exposure & Environmental control (Prevent hypothermia).',
          ],
        },
      ],
      notes: 'Call code blue immediately upon identifying unresponsiveness or absence of pulse.',
    },
  },
  {
    id: 'clearance',
    icon: '📑',
    title: 'LEC Clearance & Admin Guide',
    desc: 'Sign-off checklists, logbook submissions, clearance forms, and department guidelines.',
    category: 'Administrative',
    content: {
      subtitle: 'Step-by-Step Rotation Exit Requirements & Clearance Checklist',
      sections: [
        {
          title: 'End-of-Rotation Clearance Checklist',
          items: [
            'Complete all ward patient chart entries and discharge summaries.',
            'Obtain department chairman & chief resident sign-offs on physical logbooks.',
            'Return hospital keys, badges, and borrowed library or department references.',
            'Submit completed rotation evaluation forms to the LEC Secretariat.',
          ],
        },
        {
          title: 'Logbook Submission Criteria',
          items: [
            'Minimum 25 major/minor surgical cases logged with consultant signatures.',
            'Minimum 15 normal spontaneous deliveries logged for OBGYN.',
            'Complete 100% attendance log for duty shifts.',
          ],
        },
      ],
      notes: 'Clearance forms must be completed within 5 business days after rotation end date.',
    },
  },
];

/* ── Component Main ── */

type View = 'dashboard' | 'knowledge' | 'board' | 'table' | 'heatmap';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<View>('dashboard');
  const [userId, setUserId] = useState('ong');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Requirements checklist state for Team Board
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: '1', text: 'Submit BLS Certificate', done: true },
    { id: '2', text: 'Hospital Safety & Infection Control Orientation', done: true },
    { id: '3', text: 'Department Clearance Forms Sign-off', done: false },
    { id: '4', text: 'Mid-Rotation Clinical Evaluation', done: false },
    { id: '5', text: 'Surgical & OBGYN Case Logbook Submissions', done: false },
    { id: '6', text: 'PhilHealth Accreditation Registration', done: false },
    { id: '7', text: 'End-of-Rotation LEC Feedback Survey', done: false },
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const user = interns.find((i) => i.id === userId) || interns[0];

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  /* ── 1. Live Status / Dashboard View ── */
  const renderDashboard = () => {
    const simDateStr = '2026-08-11';
    const simHour = 10;

    // Calculate mutual free slots for section below
    const freeSlots: string[] = [];
    for (const dateStr of ALL_14_DATES) {
      const freeHrs = WAKING_HOURS.filter((h) => interns.every((i) => !isInternBusyAtHour(i, dateStr, h)));
      if (freeHrs.length > 0) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        let start = freeHrs[0];
        let prev = start;
        for (let i = 1; i <= freeHrs.length; i++) {
          if (freeHrs[i] === prev + 1) {
            prev = freeHrs[i];
            continue;
          }
          freeSlots.push(`${label}: ${fmtHour(start)} – ${fmtHour(prev + 1)}`);
          start = freeHrs[i];
          prev = start;
        }
      }
      if (freeSlots.length >= 5) break;
    }

    return (
      <div className="content-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="page-heading">Live Intern Status</h2>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              Real-time activity and shift tracker for all 8 members of LEC 22.
            </p>
          </div>
          <div className="card" style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: 'var(--radius-full)' }}>
            <Radio size={18} style={{ color: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Simulated Time: <span style={{ color: 'var(--primary)' }}>Aug 11, 2026 at 10:00 AM</span>
            </span>
          </div>
        </div>

        {/* Live Status Cards Grid */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '2rem' }}>
          {interns.map((intern) => {
            const isBusy = isInternBusyAtHour(intern, simDateStr, simHour);
            const todaySched = intern.schedules.find((s) => s.date === simDateStr);
            const shift = todaySched ? shifts[todaySched.shiftId] : null;

            return (
              <div key={intern.id} className="card stat-card" style={{ borderLeft: `4px solid ${isBusy ? '#ef4444' : '#22c55e'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                      {intern.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {intern.name.split(',')[0]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {intern.name.split(',')[1]?.trim() || ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  {isBusy ? (
                    <span className="status-indicator status-busy">
                      ● On Duty {shift ? `· ${shift.name}` : ''}
                    </span>
                  ) : (
                    <span className="status-indicator status-online">
                      ● Free / Off Shift
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {shift ? (
                    <div>
                      <strong>Current Schedule:</strong> {shift.name}{' '}
                      {!shift.isFree && `(${formatAmPm(shift.startTime)} – ${formatAmPm(shift.endTime)})`}
                    </div>
                  ) : (
                    <div>
                      <strong>Current Schedule:</strong> {intern.id === 'andrieux' ? 'No Schedule Data' : 'OFF / Available'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mutual Free Slots Section (Hangout Finder) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              <Coffee size={20} />
            </div>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                Mutual Free Slots (Hangout Finder)
              </h3>
              <p className="section-desc" style={{ margin: 0 }}>
                Time windows where <strong>everyone</strong> in LEC 22 is free (between 8:00 AM – 10:00 PM)
              </p>
            </div>
          </div>

          <div className="free-slots-list" style={{ marginTop: '1rem' }}>
            {freeSlots.length > 0 ? (
              freeSlots.map((slot, i) => (
                <div key={i} className="free-slot-badge" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                  ☕ {slot}
                </div>
              ))
            ) : (
              <p className="text-muted">No mutual free slots found in the next 14 days.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── 2. Knowledge Base View (Notion style) ── */
  const renderKnowledge = () => {
    if (selectedDocId) {
      const guide = KB_GUIDES.find((g) => g.id === selectedDocId);
      if (!guide) return null;

      return (
        <div className="content-area">
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              className="icon-btn"
              onClick={() => setSelectedDocId(null)}
              style={{ width: 'auto', borderRadius: 'var(--radius-md)', padding: '0 1rem', gap: '8px' }}
            >
              <ArrowLeft size={18} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Back to Knowledge Base</span>
            </button>
          </div>

          <div className="doc-view">
            <div className="doc-cover">{guide.icon}</div>
            <h1 className="doc-title">{guide.title}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem', fontStyle: 'italic' }}>
              {guide.content.subtitle}
            </p>

            <div className="doc-content">
              {guide.content.sections.map((sec, idx) => (
                <div key={idx} style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.3rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    {sec.title}
                  </h2>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.75rem' }}>
                    {sec.items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{ fontSize: '0.95rem', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {guide.content.notes && (
                <div
                  style={{
                    background: 'var(--primary-light)',
                    borderLeft: '4px solid var(--primary)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '2rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <AlertCircle size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '2px' }}>Clinical Practice Note:</strong>
                    <span style={{ fontSize: '0.9rem' }}>{guide.content.notes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="content-area">
        <h2 className="page-heading">Knowledge Base</h2>
        <p className="page-sub">
          Notion-style clinical survival guides, formulas, cheat sheets, and administrative docs for LEC 22.
        </p>

        <div className="kb-grid">
          {KB_GUIDES.map((guide) => (
            <div
              key={guide.id}
              className="kb-card"
              onClick={() => setSelectedDocId(guide.id)}
            >
              <div className="kb-icon">{guide.icon}</div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.25rem' }}>
                {guide.category}
              </div>
              <h3 className="kb-title">{guide.title}</h3>
              <p className="kb-desc">{guide.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ── 3. Team Board View (Slack style) ── */
  const renderBoard = () => {
    const totalRequirements = checklist.length;
    const completedRequirements = checklist.filter((c) => c.done).length;

    return (
      <div className="content-area">
        <h2 className="page-heading">Team Board</h2>
        <p className="page-sub">
          Slack-style updates, announcements from the LEC President, and group requirements tracker.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Messages Column */}
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Pin size={18} style={{ color: 'var(--primary)' }} /> Pinned Announcements & Chat
            </h3>

            <div className="message-board">
              <div className="message-item">
                <div className="message-avatar" style={{ background: 'var(--primary)', color: '#fff' }}>
                  J
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">Dr. Joy Ong (LEC President)</span>
                    <span className="message-time">Today at 08:30 AM</span>
                  </div>
                  <div className="message-body">
                    Good morning LEC 22! Welcome to our new LEC Hub. Please make sure to review the upcoming Week 2 schedule roster. BLS certificates and rotation clearance papers are due this Friday. Reach out if you need help with chart sign-offs!
                  </div>
                  <div className="message-attachment">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                      <FileText size={16} /> Important Notice: Week 2 Ward Turnover Protocols
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      All morning endorsement duties must be handed over in Room 402 by 06:45 AM.
                    </p>
                  </div>
                </div>
              </div>

              <div className="message-item">
                <div className="message-avatar">A</div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">ABANGAN, Andre Rafael</span>
                    <span className="message-time">Yesterday at 06:45 PM</span>
                  </div>
                  <div className="message-body">
                    Heads up for everyone assigned to Surgical OR tomorrow! Dr. Santos requested pre-op rounds completed by 06:30 AM sharp. Pre-op checklist and suture kits are ready in OR 3.
                  </div>
                </div>
              </div>

              <div className="message-item" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div className="message-avatar">C</div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">BANTAYAN, Catherine</span>
                    <span className="message-time">Aug 9 at 02:15 PM</span>
                  </div>
                  <div className="message-body">
                    Just updated the Pediatrics Pocket Guide in the Knowledge Base with the latest Holiday-Segar maintenance fluid calculations and dosage references! Check it out when you have free time.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Column */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} /> Rotation Requirements Checklist
              </h3>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                {completedRequirements} / {totalRequirements} Done
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Track requirement completions for your rotation record. Click any item to toggle completion status.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="checklist-item"
                  onClick={() => toggleChecklistItem(item.id)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: item.done ? 'var(--bg-app)' : 'var(--bg-panel)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  {item.done ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  ) : (
                    <Square size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: item.done ? 500 : 600,
                      color: item.done ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── 4. Team Schedule View (TMC Spreadsheet) ── */
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

  /* ── 5. Heatmap View ── */
  const renderHeatmap = () => {
    const totalInterns = interns.length;
    return (
      <div className="content-area">
        <h2 className="page-heading">Group Busyness Heatmap</h2>
        <p className="page-sub">
          Instantly see when the team is free.{' '}
          <strong className="legend-free">Green ✓ = Everyone Free</strong>,{' '}
          <strong className="legend-busy">Red = Busy</strong>. Hover for details.
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
              <div key={`row-${hour}`} style={{ display: 'contents' }}>
                <div className="heatmap-time-cell">{fmtHour(hour)}</div>
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
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="legend-item">
            <span className="legend-swatch density-0"></span> Free
          </span>
          <span className="legend-item">
            <span className="legend-swatch density-1"></span> 1–2 busy
          </span>
          <span className="legend-item">
            <span className="legend-swatch density-2"></span> 3–4 busy
          </span>
          <span className="legend-item">
            <span className="legend-swatch density-3"></span> 5–6 busy
          </span>
          <span className="legend-item">
            <span className="legend-swatch density-4"></span> 7–8 busy
          </span>
        </div>
      </div>
    );
  };

  /* ── Layout & Navigation ── */
  const navItems: { id: View; icon: typeof Radio; label: string }[] = [
    { id: 'dashboard', icon: Radio, label: 'Live Status' },
    { id: 'knowledge', icon: BookOpen, label: 'Knowledge Base' },
    { id: 'board', icon: MessageSquare, label: 'Team Board' },
    { id: 'table', icon: CalendarDays, label: 'Team Schedule' },
    { id: 'heatmap', icon: Flame, label: 'Heatmap' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <CalendarDays size={20} />
          </div>
          <span className="logo-text">LEC Hub</span>
        </div>

        <nav className="nav-menu">
          {navItems.map(({ id, icon: Icon, label }) => (
            <div
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => {
                setView(id);
                if (id !== 'knowledge') setSelectedDocId(null);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" style={{ cursor: 'default' }}>
            <Activity size={18} />
            <span>LEC 22 Roster</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-wrapper">
        <header className="topbar">
          <div className="page-title">
            {view === 'dashboard' && 'Live Status & Hangouts'}
            {view === 'knowledge' && (selectedDocId ? 'Clinical Guide' : 'Knowledge Base')}
            {view === 'board' && 'Team Board'}
            {view === 'table' && 'Team Schedule'}
            {view === 'heatmap' && 'Group Heatmap'}
          </div>

          <div className="topbar-actions">
            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              title="Toggle Theme"
            >
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
        {view === 'knowledge' && renderKnowledge()}
        {view === 'board' && renderBoard()}
        {view === 'table' && renderTable()}
        {view === 'heatmap' && renderHeatmap()}
      </main>
    </div>
  );
}
