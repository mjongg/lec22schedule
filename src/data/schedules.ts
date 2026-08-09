export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  isFree: boolean;
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  shiftId: string; // reference to Shift.id
}

export interface Intern {
  id: string;
  name: string;
  schedules: DaySchedule[];
}

export const shifts: Record<string, Shift> = {
  pre: { id: 'pre', name: 'PRE', startTime: '07:00', endTime: '19:00', isFree: false },
  dutyAmOpd: { id: 'dutyAmOpd', name: 'DUTY AM/OPD', startTime: '07:00', endTime: '19:00', isFree: false },
  or: { id: 'or', name: 'OR', startTime: '07:00', endTime: '17:00', isFree: false },
  ec: { id: 'ec', name: 'EYE CENTER', startTime: '07:00', endTime: '17:00', isFree: false },
  opd: { id: 'opd', name: 'OPD', startTime: '07:00', endTime: '17:00', isFree: false },
  dutyPm: { id: 'dutyPm', name: 'DUTY PM', startTime: '19:00', endTime: '07:00', isFree: false },
  duty: { id: 'duty', name: 'DUTY', startTime: '19:00', endTime: '07:00', isFree: false },
  from: { id: 'from', name: 'FROM', startTime: '00:00', endTime: '23:59', isFree: true },
  off: { id: 'off', name: 'OFF', startTime: '00:00', endTime: '23:59', isFree: true },
  
  ongAm: { id: 'ongAm', name: 'AM Duty', startTime: '05:30', endTime: '17:30', isFree: false },
  ongPm: { id: 'ongPm', name: 'PM Duty', startTime: '17:30', endTime: '05:30', isFree: false },
  
  regioAm: { id: 'regioAm', name: 'Morning', startTime: '08:00', endTime: '12:00', isFree: false },
};

export const interns: Intern[] = [
  {
    id: 'abangan',
    name: 'ABANGAN, Andre Rafael Zabala',
    schedules: [
      { date: '2026-08-10', shiftId: 'pre' },
      { date: '2026-08-11', shiftId: 'duty' },
      { date: '2026-08-12', shiftId: 'from' },
      { date: '2026-08-13', shiftId: 'pre' },
      { date: '2026-08-14', shiftId: 'duty' },
      { date: '2026-08-15', shiftId: 'from' },
      { date: '2026-08-16', shiftId: 'pre' },
    ]
  },
  {
    id: 'andrieux',
    name: 'ANDRIEUX, Justene Robin Umali',
    schedules: []
  },
  {
    id: 'bantayan',
    name: 'BANTAYAN, Catherine Duque',
    schedules: [
      { date: '2026-08-10', shiftId: 'or' },
      { date: '2026-08-11', shiftId: 'dutyAmOpd' },
      { date: '2026-08-12', shiftId: 'dutyPm' },
      { date: '2026-08-13', shiftId: 'from' },
      { date: '2026-08-14', shiftId: 'opd' },
      { date: '2026-08-15', shiftId: 'or' },
      { date: '2026-08-16', shiftId: 'off' },
      { date: '2026-08-17', shiftId: 'opd' },
      { date: '2026-08-18', shiftId: 'or' },
      { date: '2026-08-19', shiftId: 'dutyAmOpd' },
      { date: '2026-08-20', shiftId: 'dutyPm' },
      { date: '2026-08-21', shiftId: 'from' },
      { date: '2026-08-22', shiftId: 'opd' }, 
      { date: '2026-08-23', shiftId: 'off' },
    ]
  },
  {
    id: 'majarais',
    name: 'MAJARAIS, Margerie Zia Sayo',
    schedules: [
      { date: '2026-08-10', shiftId: 'dutyAmOpd' },
      { date: '2026-08-11', shiftId: 'dutyPm' },
      { date: '2026-08-12', shiftId: 'from' },
      { date: '2026-08-13', shiftId: 'opd' },
      { date: '2026-08-14', shiftId: 'or' },
      { date: '2026-08-15', shiftId: 'ec' },
      { date: '2026-08-16', shiftId: 'off' },
      { date: '2026-08-17', shiftId: 'or' },
      { date: '2026-08-18', shiftId: 'dutyAmOpd' },
      { date: '2026-08-19', shiftId: 'dutyPm' },
      { date: '2026-08-20', shiftId: 'from' },
      { date: '2026-08-21', shiftId: 'opd' },
      { date: '2026-08-22', shiftId: 'or' },
      { date: '2026-08-23', shiftId: 'dutyPm' },
    ]
  },
  {
    id: 'mercado',
    name: 'MERCADO, Norman Christopher Tolentino',
    schedules: [
      { date: '2026-08-10', shiftId: 'opd' },
      { date: '2026-08-11', shiftId: 'or' },
      { date: '2026-08-12', shiftId: 'dutyAmOpd' },
      { date: '2026-08-13', shiftId: 'opd' },
      { date: '2026-08-14', shiftId: 'or' },
      { date: '2026-08-15', shiftId: 'off' },
      { date: '2026-08-16', shiftId: 'dutyPm' },
      { date: '2026-08-17', shiftId: 'from' },
      { date: '2026-08-18', shiftId: 'ec' },
      { date: '2026-08-19', shiftId: 'or' },
      { date: '2026-08-20', shiftId: 'ec' },
      { date: '2026-08-21', shiftId: 'or' },
      { date: '2026-08-22', shiftId: 'or' },
      { date: '2026-08-23', shiftId: 'dutyAmOpd' },
    ]
  },
  {
    id: 'ong',
    name: 'ONG, Mary Joy Beatrice Binag',
    schedules: [
      { date: '2026-08-10', shiftId: 'off' },
      { date: '2026-08-11', shiftId: 'ongAm' },
      { date: '2026-08-12', shiftId: 'ongAm' },
      { date: '2026-08-13', shiftId: 'ongAm' },
      { date: '2026-08-14', shiftId: 'ongAm' },
      { date: '2026-08-15', shiftId: 'ongAm' },
      { date: '2026-08-16', shiftId: 'ongAm' },
      { date: '2026-08-17', shiftId: 'ongPm' },
      { date: '2026-08-18', shiftId: 'off' },
      { date: '2026-08-19', shiftId: 'ongAm' },
      { date: '2026-08-20', shiftId: 'ongPm' },
      { date: '2026-08-21', shiftId: 'ongPm' },
      { date: '2026-08-22', shiftId: 'ongPm' },
      { date: '2026-08-23', shiftId: 'ongPm' },
    ]
  },
  {
    id: 'regio',
    name: 'REGIO, Allen Joshua Caparas',
    schedules: [
      { date: '2026-08-10', shiftId: 'regioAm' },
      { date: '2026-08-11', shiftId: 'regioAm' },
      { date: '2026-08-12', shiftId: 'regioAm' },
      { date: '2026-08-13', shiftId: 'regioAm' },
      { date: '2026-08-14', shiftId: 'regioAm' },
      { date: '2026-08-15', shiftId: 'off' },
      { date: '2026-08-16', shiftId: 'off' },
      { date: '2026-08-17', shiftId: 'regioAm' },
      { date: '2026-08-18', shiftId: 'regioAm' },
      { date: '2026-08-19', shiftId: 'regioAm' },
      { date: '2026-08-20', shiftId: 'regioAm' },
      { date: '2026-08-21', shiftId: 'regioAm' },
      { date: '2026-08-22', shiftId: 'off' },
      { date: '2026-08-23', shiftId: 'off' },
    ]
  },
  {
    id: 'rengel',
    name: 'RENGEL, Diandra Bryanna Mendoza',
    schedules: [
      { date: '2026-08-10', shiftId: 'ec' },
      { date: '2026-08-11', shiftId: 'opd' },
      { date: '2026-08-12', shiftId: 'or' },
      { date: '2026-08-13', shiftId: 'dutyAmOpd' },
      { date: '2026-08-14', shiftId: 'dutyPm' },
      { date: '2026-08-15', shiftId: 'from' },
      { date: '2026-08-16', shiftId: 'off' },
      { date: '2026-08-17', shiftId: 'or' },
      { date: '2026-08-18', shiftId: 'opd' },
      { date: '2026-08-19', shiftId: 'opd' },
      { date: '2026-08-20', shiftId: 'or' },
      { date: '2026-08-21', shiftId: 'dutyAmOpd' },
      { date: '2026-08-22', shiftId: 'dutyPm' },
      { date: '2026-08-23', shiftId: 'from' },
    ]
  }
];
