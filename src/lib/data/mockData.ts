import type {
 User, KPIMetric, RevenueData, StationData,
 ComplaintData, ATVMData, TTEData, PendingRegistration,
 DataSourceConfig, PRSStationRow, DailyDigiData, PaymentModeShare
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE : Lovey Gandhi / CMI/G — full super-admin
// ADMINISTRATION: Sr.DCM/PS · DCM/PS · DCM/TC · ACM/Chg. — admin role
// USERS : CMI · COS · OS · Dealers (one per cell) — user role
// ─────────────────────────────────────────────────────────────────────────────

export const mockUsers: User[] = [
 // ── MAINTENANCE (Super Admin) ──────────────────────────────────────────────
 {
 id: 'm1', name: 'Loveyy', email: 'loveyyvijaygandhhi@gmail.com',
 role: 'maintenance', cell: 'All', designation: 'CMI/G', division: 'Delhi',
 approved: true, createdAt: '2024-01-01', lastLogin: '2026-06-13T08:30:00Z',
 },

 // ── ADMINISTRATION ─────────────────────────────────────────────────────────
 {
 id: 'a1', name: 'Sr.DCM/PS', email: 'srdcmps@internal.rly.in',
 hrmsId: 'SRDCMPS',
 role: 'admin', cell: 'All', designation: 'Sr.DCM/PS', division: 'Delhi',
 approved: true, createdAt: '2024-01-10', lastLogin: '2026-06-13T09:00:00Z',
 },

];

// ─── KPI Metrics (20 cells) ───────────────────────────────────────────────────
export const mockKPIs: KPIMetric[] = [
 { id: 'kpi1', label: 'Total Revenue', value: 20.66, unit: 'Cr', change: 4.2, trend: 'up',
 cell: 'UTS PRS', icon: 'trending-up', color: 'violet', target: 22 },
 { id: 'kpi2', label: 'Digital Collection', value: 9.19, unit: 'Cr', change: 8.1, trend: 'up',
 cell: 'UTS PRS', icon: 'smartphone', color: 'blue', target: 10 },
 { id: 'kpi3', label: 'Digi Percentage', value: '44.49', unit: '%', change: 2.3, trend: 'up',
 cell: 'UTS PRS', icon: 'percent', color: 'cyan', target: 50 },
 { id: 'kpi4', label: 'PRS Slips', value: 1.74, unit: 'L', change: -1.2, trend: 'down',
 cell: 'UTS PRS', icon: 'ticket', color: 'purple', target: 1.9 },
 { id: 'kpi5', label: 'Tickets Issued', value: 1.17, unit: 'L', change: 3.5, trend: 'up',
 cell: 'UTS PRS', icon: 'receipt', color: 'indigo', target: 1.3 },
 { id: 'kpi6', label: 'Passenger Bookings', value: 2.86, unit: 'L', change: 1.8, trend: 'up',
 cell: 'UTS PRS', icon: 'users', color: 'green', target: 3.1 },
 { id: 'kpi7', label: 'Penalty Cases', value: 1842, unit: '', change: -5.4, trend: 'down',
 cell: 'Ticket Checking', icon: 'alert-triangle', color: 'orange', target: 2000 },
 { id: 'kpi8', label: 'Penalty Amount', value: 18.42, unit: 'L', change: -3.1, trend: 'down',
 cell: 'Ticket Checking', icon: 'indian-rupee', color: 'red', target: 20 },
 { id: 'kpi9', label: 'Catering Revenue', value: 3.24, unit: 'Cr', change: 7.2, trend: 'up',
 cell: 'Catering', icon: 'utensils', color: 'orange', target: 3.5 },
 { id: 'kpi10', label: 'Parking Revenue', value: 0.87, unit: 'Cr', change: 5.6, trend: 'up',
 cell: 'Parking', icon: 'car', color: 'purple', target: 0.9 },
 { id: 'kpi11', label: 'Complaints Received', value: 312, unit: '', change: -8.2, trend: 'up',
 cell: 'Complaint/RailMadad', icon: 'message-circle', color: 'rose', target: 280 },
 { id: 'kpi12', label: 'Complaints Resolved', value: '89.4', unit: '%', change: 3.1, trend: 'up',
 cell: 'Complaint/RailMadad', icon: 'check-circle', color: 'green', target: 95 },
 { id: 'kpi13', label: 'JTBS Bookings', value: 24680, unit: '', change: 12.4, trend: 'up',
 cell: 'JTBS/YTSK/STBA', icon: 'store', color: 'cyan', target: 28000 },
 { id: 'kpi14', label: 'JTBS Revenue', value: 2.11, unit: 'Cr', change: 9.8, trend: 'up',
 cell: 'JTBS/YTSK/STBA', icon: 'banknote', color: 'teal', target: 2.5 },
 { id: 'kpi15', label: 'Licensed Porters', value: 148, unit: '', change: 0, trend: 'neutral',
 cell: 'License Porter', icon: 'briefcase', color: 'yellow', target: 160 },
 { id: 'kpi16', label: 'Publicity Events', value: 18, unit: '', change: 20, trend: 'up',
 cell: 'Publicity', icon: 'megaphone', color: 'pink', target: 24 },
 { id: 'kpi17', label: 'Concession Passes', value: 4218, unit: '', change: 2.1, trend: 'up',
 cell: 'Concession', icon: 'id-card', color: 'green', target: 4500 },
 { id: 'kpi18', label: 'Pending DAK', value: 34, unit: '', change: -15, trend: 'up',
 cell: 'DAK', icon: 'file-text', color: 'lime', target: 20 },
 { id: 'kpi19', label: 'Open Legal Cases', value: 67, unit: '', change: -2.9, trend: 'up',
 cell: 'Legal', icon: 'scale', color: 'amber', target: 60 },
 { id: 'kpi20', label: 'Sanitation Score', value: '82.4', unit: '%', change: 3.8, trend: 'up',
 cell: 'Sanitation', icon: 'sparkles', color: 'teal', target: 90 },
];

// ─── Revenue Trend ────────────────────────────────────────────────────────────
export const mockRevenue: RevenueData[] = [
 { month: 'May-25', utsprs: 18.2, ticketchecking: 1.6, catering: 2.9, parking: 0.75, jtbs: 1.8, total: 25.25, target: 26 },
 { month: 'Jun-25', utsprs: 17.8, ticketchecking: 1.5, catering: 2.7, parking: 0.72, jtbs: 1.75, total: 24.47, target: 26 },
 { month: 'Jul-25', utsprs: 16.9, ticketchecking: 1.4, catering: 2.5, parking: 0.68, jtbs: 1.6, total: 23.08, target: 25 },
 { month: 'Aug-25', utsprs: 17.5, ticketchecking: 1.55, catering: 2.8, parking: 0.71, jtbs: 1.7, total: 24.26, target: 25 },
 { month: 'Sep-25', utsprs: 18.8, ticketchecking: 1.7, catering: 3.0, parking: 0.78, jtbs: 1.9, total: 26.18, target: 27 },
 { month: 'Oct-25', utsprs: 19.4, ticketchecking: 1.8, catering: 3.2, parking: 0.82, jtbs: 2.0, total: 27.22, target: 27 },
 { month: 'Nov-25', utsprs: 19.9, ticketchecking: 1.85, catering: 3.15, parking: 0.84, jtbs: 2.05, total: 27.79, target: 28 },
 { month: 'Dec-25', utsprs: 21.2, ticketchecking: 2.0, catering: 3.5, parking: 0.9, jtbs: 2.2, total: 29.80, target: 30 },
 { month: 'Jan-26', utsprs: 20.4, ticketchecking: 1.9, catering: 3.3, parking: 0.88, jtbs: 2.1, total: 28.58, target: 29 },
 { month: 'Feb-26', utsprs: 19.8, ticketchecking: 1.82, catering: 3.2, parking: 0.85, jtbs: 2.05, total: 27.72, target: 28 },
 { month: 'Mar-26', utsprs: 22.1, ticketchecking: 2.1, catering: 3.6, parking: 0.94, jtbs: 2.3, total: 31.04, target: 31 },
 { month: 'Apr-26', utsprs: 20.66, ticketchecking: 1.84, catering: 3.24, parking: 0.87, jtbs: 2.11, total: 28.72, target: 29 },
];

// ─── PRS Station-wise Data (Power BI style) ──────────────────────────────────
export const mockPRSStations: PRSStationRow[] = [
 { bookingLocation: 'NDLS', code: 'NDLS', totalAmount: 5.84, digiAmount: 3.12, digiPct: 53.42, totalSlips: 48200, passengersBooked: 84320, passengersCancelled: 12480 },
 { bookingLocation: 'DLI', code: 'DLI', totalAmount: 3.22, digiAmount: 1.68, digiPct: 52.17, totalSlips: 28640, passengersBooked: 51200, passengersCancelled: 7620 },
 { bookingLocation: 'NZM', code: 'NZM', totalAmount: 2.87, digiAmount: 1.45, digiPct: 50.52, totalSlips: 24180, passengersBooked: 43460, passengersCancelled: 6580 },
 { bookingLocation: 'SZM', code: 'SZM', totalAmount: 0.52, digiAmount: 0.40, digiPct: 77.83, totalSlips: 4103, passengersBooked: 7286, passengersCancelled: 1031 },
 { bookingLocation: 'ANVT', code: 'ANVT', totalAmount: 1.94, digiAmount: 0.88, digiPct: 45.36, totalSlips: 16420, passengersBooked: 29480, passengersCancelled: 4360 },
 { bookingLocation: 'SNP', code: 'SNP', totalAmount: 0.62, digiAmount: 0.40, digiPct: 64.75, totalSlips: 4458, passengersBooked: 8760, passengersCancelled: 1201 },
 { bookingLocation: 'SSB', code: 'SSB', totalAmount: 0.83, digiAmount: 0.36, digiPct: 42.93, totalSlips: 6675, passengersBooked: 12073, passengersCancelled: 1698 },
 { bookingLocation: 'SMQL', code: 'SMQL', totalAmount: 0.22, digiAmount: 0.05, digiPct: 22.23, totalSlips: 1344, passengersBooked: 2734, passengersCancelled: 290 },
 { bookingLocation: 'SMK', code: 'SMK', totalAmount: 0.16, digiAmount: 0.02, digiPct: 12.12, totalSlips: 894, passengersBooked: 2023, passengersCancelled: 328 },
 { bookingLocation: 'DBD', code: 'DBD', totalAmount: 0.48, digiAmount: 0.09, digiPct: 18.72, totalSlips: 3820, passengersBooked: 7140, passengersCancelled: 1082 },
 { bookingLocation: 'TUN', code: 'TUN', totalAmount: 0.14, digiAmount: 0.02, digiPct: 16.19, totalSlips: 657, passengersBooked: 1431, passengersCancelled: 171 },
 { bookingLocation: 'TPZ', code: 'TPZ', totalAmount: 0.06, digiAmount: 0.01, digiPct: 10.64, totalSlips: 318, passengersBooked: 622, passengersCancelled: 58 },
 { bookingLocation: 'TKD', code: 'TKD', totalAmount: 0.00, digiAmount: 0.00, digiPct: 0.00, totalSlips: 37, passengersBooked: 0, passengersCancelled: 0 },
 { bookingLocation: 'PTRD', code: 'PTRD', totalAmount: 0.02, digiAmount: 0.00, digiPct: 0.57, totalSlips: 142, passengersBooked: 312, passengersCancelled: 48 },
 { bookingLocation: 'NOLI', code: 'NOLI', totalAmount: 0.18, digiAmount: 0.02, digiPct: 9.62, totalSlips: 1240, passengersBooked: 2680, passengersCancelled: 410 },
 { bookingLocation: 'KAT', code: 'KAT', totalAmount: 0.12, digiAmount: 0.02, digiPct: 12.58, totalSlips: 820, passengersBooked: 1640, passengersCancelled: 248 },
 { bookingLocation: 'MUD', code: 'MUD', totalAmount: 0.08, digiAmount: 0.01, digiPct: 10.86, totalSlips: 548, passengersBooked: 1120, passengersCancelled: 182 },
 { bookingLocation: 'GHNA', code: 'GHNA', totalAmount: 0.10, digiAmount: 0.01, digiPct: 9.36, totalSlips: 684, passengersBooked: 1480, passengersCancelled: 224 },
];

// ─── Daily Digital Percentage (line chart) ────────────────────────────────────
export const mockDailyDigi: DailyDigiData[] = [
 { day: 1, digiPct: 43.86 },
 { day: 2, digiPct: 46.04 },
 { day: 3, digiPct: 49.38 },
 { day: 4, digiPct: 44.36 },
 { day: 5, digiPct: 43.45 },
 { day: 6, digiPct: 44.13 },
 { day: 7, digiPct: 41.11 },
 { day: 8, digiPct: 42.24 },
 { day: 9, digiPct: 45.62 },
 { day: 10, digiPct: 46.72 },
 { day: 11, digiPct: 43.45 },
];

// ─── Payment Mode Shares (donut) ──────────────────────────────────────────────
export const mockPaymentModes: PaymentModeShare[] = [
 { mode: 'CASH', value: 50.18, color: '#22c55e' },
 { mode: 'DIGITAL', value: 44.80, color: '#3b82f6' },
 { mode: 'CCARD', value: 1.27, color: '#1e3a5f' },
 { mode: 'VOUCHER', value: 3.74, color: '#6b7280' },
];

// ─── Station Performance (legacy table) ──────────────────────────────────────
export const mockStations: StationData[] = [
 { station: 'New Delhi', code: 'NDLS', zone: 'NR', totalAmount: 5.84, digiAmount: 3.12, digiPct: 53.42, totalSlips: 48200, passengersBooked: 84320, passengersCancelled: 12480, target: 6.2, achievement: 94.2 },
 { station: 'Delhi', code: 'DLI', zone: 'NR', totalAmount: 3.22, digiAmount: 1.68, digiPct: 52.17, totalSlips: 28640, passengersBooked: 51200, passengersCancelled: 7620, target: 3.5, achievement: 92.0 },
 { station: 'Hazrat Nizamuddin', code: 'NZM', zone: 'NR', totalAmount: 2.87, digiAmount: 1.45, digiPct: 50.52, totalSlips: 24180, passengersBooked: 43460, passengersCancelled: 6580, target: 3.1, achievement: 92.6 },
 { station: 'Anand Vihar', code: 'ANVT', zone: 'NR', totalAmount: 1.94, digiAmount: 0.88, digiPct: 45.36, totalSlips: 16420, passengersBooked: 29480, passengersCancelled: 4360, target: 2.0, achievement: 97.0 },
 { station: 'Sahadara', code: 'SSB', zone: 'NR', totalAmount: 0.83, digiAmount: 0.36, digiPct: 42.93, totalSlips: 6675, passengersBooked: 12073, passengersCancelled: 1698, target: 0.9, achievement: 92.2 },
];

// ─── ATVM Machines ────────────────────────────────────────────────────────────
export const mockATVM: ATVMData[] = [
 { machineId: 'NDLS-01', station: 'NDLS', date: '2026-06-13', transactions: 1240, amount: 3.82, uptime: 98.2, status: 'active' },
 { machineId: 'NDLS-02', station: 'NDLS', date: '2026-06-13', transactions: 980, amount: 3.14, uptime: 96.8, status: 'active' },
 { machineId: 'DLI-01', station: 'DLI', date: '2026-06-13', transactions: 820, amount: 2.46, uptime: 94.5, status: 'active' },
 { machineId: 'NZM-01', station: 'NZM', date: '2026-06-13', transactions: 740, amount: 2.28, uptime: 91.2, status: 'idle' },
 { machineId: 'ANVT-01', station: 'ANVT', date: '2026-06-13', transactions: 0, amount: 0, uptime: 0, status: 'fault' },
 { machineId: 'SSB-01', station: 'SSB', date: '2026-06-13', transactions: 380, amount: 1.14, uptime: 88.6, status: 'active' },
];

// ─── TTE Data ─────────────────────────────────────────────────────────────────
export const mockTTE: TTEData[] = [
 { date: '2025-05', division: 'Delhi', inspections: 1820, penaltyCases: 2010, penaltyAmount: 20.1, compoundedCases: 1680, compoundedAmount: 16.8, edrsCases: 330 },
 { date: '2025-06', division: 'Delhi', inspections: 1750, penaltyCases: 1940, penaltyAmount: 19.4, compoundedCases: 1610, compoundedAmount: 16.1, edrsCases: 330 },
 { date: '2025-07', division: 'Delhi', inspections: 1680, penaltyCases: 1820, penaltyAmount: 18.2, compoundedCases: 1520, compoundedAmount: 15.2, edrsCases: 300 },
 { date: '2025-08', division: 'Delhi', inspections: 1720, penaltyCases: 1890, penaltyAmount: 18.9, compoundedCases: 1580, compoundedAmount: 15.8, edrsCases: 310 },
 { date: '2025-09', division: 'Delhi', inspections: 1840, penaltyCases: 2020, penaltyAmount: 20.2, compoundedCases: 1690, compoundedAmount: 16.9, edrsCases: 330 },
 { date: '2025-10', division: 'Delhi', inspections: 1960, penaltyCases: 2180, penaltyAmount: 21.8, compoundedCases: 1820, compoundedAmount: 18.2, edrsCases: 360 },
 { date: '2025-11', division: 'Delhi', inspections: 1980, penaltyCases: 2200, penaltyAmount: 22.0, compoundedCases: 1840, compoundedAmount: 18.4, edrsCases: 360 },
 { date: '2025-12', division: 'Delhi', inspections: 2100, penaltyCases: 2360, penaltyAmount: 23.6, compoundedCases: 1980, compoundedAmount: 19.8, edrsCases: 380 },
 { date: '2026-01', division: 'Delhi', inspections: 2020, penaltyCases: 2240, penaltyAmount: 22.4, compoundedCases: 1880, compoundedAmount: 18.8, edrsCases: 360 },
 { date: '2026-02', division: 'Delhi', inspections: 1940, penaltyCases: 2140, penaltyAmount: 21.4, compoundedCases: 1800, compoundedAmount: 18.0, edrsCases: 340 },
 { date: '2026-03', division: 'Delhi', inspections: 2200, penaltyCases: 2420, penaltyAmount: 24.2, compoundedCases: 2020, compoundedAmount: 20.2, edrsCases: 400 },
 { date: '2026-04', division: 'Delhi', inspections: 1860, penaltyCases: 1842, penaltyAmount: 18.42, compoundedCases: 1540, compoundedAmount: 15.4, edrsCases: 302 },
];

// ─── Complaints ───────────────────────────────────────────────────────────────
export const mockComplaints: ComplaintData[] = [
 { id: 'CMP001', date: '2026-06-10', cell: 'Complaint/RailMadad', category: 'Cleanliness', description: 'Platform 4 NDLS extremely dirty', status: 'open', priority: 'high', assignedTo: 'ADCM/Sanitation', escalationLevel: 2, daysOpen: 3 },
 { id: 'CMP002', date: '2026-06-08', cell: 'Catering', category: 'Food Quality', description: 'Stale food served on Rajdhani', status: 'in-progress', priority: 'critical', assignedTo: 'ADCM/Catering', escalationLevel: 4, daysOpen: 5 },
 { id: 'CMP003', date: '2026-06-12', cell: 'Ticket Checking', category: 'Behaviour', description: 'TTE misbehaviour at NZM', status: 'open', priority: 'high', assignedTo: 'Sr. TI/NZM', escalationLevel: 1, daysOpen: 1 },
 { id: 'CMP004', date: '2026-06-05', cell: 'UTS PRS', category: 'Refund', description: 'Refund not processed for cancelled ticket', status: 'resolved', priority: 'medium', assignedTo: 'ADCM/UTS', escalationLevel: 2, daysOpen: 0 },
 { id: 'CMP005', date: '2026-06-01', cell: 'Parking', category: 'Overcharging', description: 'Parking contractor overcharging at DLI', status: 'escalated', priority: 'critical', assignedTo: 'DCM/Delhi', escalationLevel: 6, daysOpen: 12 },
 { id: 'CMP006', date: '2026-06-09', cell: 'Sanitation', category: 'Toilet Condition', description: 'Toilets non-functional at platform 3, SSB', status: 'in-progress', priority: 'high', assignedTo: 'ADCM/Sanitation', escalationLevel: 2, daysOpen: 4 },
 { id: 'CMP007', date: '2026-06-11', cell: 'License Porter', category: 'Misbehaviour', description: 'Licensed porter demanding excess charges', status: 'open', priority: 'medium', assignedTo: 'CI/NDLS', escalationLevel: 1, daysOpen: 2 },
 { id: 'CMP008', date: '2026-05-28', cell: 'Legal', category: 'Court Order', description: 'Non-compliance with court order in land dispute', status: 'escalated', priority: 'critical', assignedTo: 'Sr. DCM/Delhi', escalationLevel: 7, daysOpen: 16 },
];

// ─── Pending Registrations ────────────────────────────────────────────────────
export const mockPendingRegs: PendingRegistration[] = [
 { id: 'pr1', user: { name: 'Ravi Shankar', email: 'ravi.marketing@delhi.nr.in', role: 'user', cell: 'Marketing', designation: 'ADCM/Marketing', division: 'Delhi' }, submittedAt: '2026-06-12T14:20:00Z', employeeId: 'NR/DEL/COM/0421' },
 { id: 'pr2', user: { name: 'Neha Gupta', email: 'neha.concession@delhi.nr.in', role: 'user', cell: 'Concession', designation: 'OS/Concession', division: 'Delhi' }, submittedAt: '2026-06-11T10:15:00Z', employeeId: 'NR/DEL/COM/0422' },
];

// ─── Data Sources ─────────────────────────────────────────────────────────────
export const mockDataSources: DataSourceConfig[] = [
 { id: 'ds1', name: 'PRIMES Portal', type: 'api', cell: 'UTS PRS', endpoint: 'https://primes.nr.indianrailways.gov.in', refreshInterval: 60, lastRefreshed: '2026-06-13T08:00:00Z', status: 'active' },
 { id: 'ds2', name: 'UTS Transaction DB', type: 'sql', cell: 'UTS PRS', refreshInterval: 30, lastRefreshed: '2026-06-13T08:30:00Z', status: 'active' },
 { id: 'ds3', name: 'TC Report Upload', type: 'csv', cell: 'Ticket Checking', refreshInterval: 1440, lastRefreshed: '2026-06-13T07:00:00Z', status: 'active' },
 { id: 'ds4', name: 'RailMadad API', type: 'api', cell: 'Complaint/RailMadad', endpoint: 'https://railmadad.indianrailways.gov.in', refreshInterval: 15, lastRefreshed: '2026-06-13T09:00:00Z', status: 'active' },
 { id: 'ds5', name: 'Catering Returns', type: 'csv', cell: 'Catering', refreshInterval: 1440, lastRefreshed: '2026-06-12T17:00:00Z', status: 'pending' },
 { id: 'ds6', name: 'Parking Collection', type: 'json', cell: 'Parking', refreshInterval: 360, lastRefreshed: '2026-06-13T06:00:00Z', status: 'active' },
];

// ─── Station Master (241 stations, NSG/HG categories) ─────────────────────────
export interface StationMaster {
 name: string;
 code: string;
 state: string;
 category: string; // NSG-1 … NSG-6 | HG-1 … HG-3
 section: string; // e.g."Delhi-Ambala","Delhi-Saharanpur"
 cmi: string; // CMI in-charge designation for this section
}

export const STATION_MASTER: StationMaster[] = [
 { name: 'ANAND VIHAR TERMINAL', code: 'ANVT', state: 'DELHI', category: 'NSG-1', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'DELHI JN.', code: 'DLI', state: 'DELHI', category: 'NSG-1', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'HAZRAT NIZAMUDDIN JN', code: 'NZM', state: 'NDLS', category: 'NSG-1', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'NEW DELHI', code: 'NDLS', state: 'NDLS', category: 'NSG-1', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'DELHI SARAI ROHILLA', code: 'DEE', state: 'DELHI', category: 'NSG-2', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'GHAZIABAD JN.', code: 'GZB', state: 'U.P.', category: 'NSG-2', section: 'Delhi-Ghaziabad', cmi: 'CMI/Publicity' },
 { name: 'DELHI CANTT.', code: 'DEC', state: 'DELHI', category: 'NSG-3', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'FARIDABAD', code: 'FDB', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'GURGAON', code: 'GGN', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'KARNAL', code: 'KUN', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KURUKSHETRA JN.', code: 'KKDE', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MEERUT CITY JN.', code: 'MTC', state: 'U.P.', category: 'NSG-3', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'MUZAFFARNAGAR', code: 'MOZ', state: 'U.P.', category: 'NSG-3', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'PANIPAT JN.', code: 'PNP', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ROHTAK JN.', code: 'ROK', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'SONIPAT', code: 'SNP', state: 'HARYANA', category: 'NSG-3', section: 'Delhi-Panipat', cmi: 'CMI/Security' },
 { name: 'BAHADURGARH', code: 'BGZ', state: 'HARYANA', category: 'NSG-4', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'DELHI SAFDARJUNG', code: 'DSJ', state: 'DELHI', category: 'NSG-4', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'DELHI SHAHDRA', code: 'DSA', state: 'DELHI', category: 'NSG-4', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'GANAUR', code: 'GNU', state: 'HARYANA', category: 'NSG-4', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JIND JN.', code: 'JIND', state: 'HARYANA', category: 'NSG-4', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'MODINAGAR', code: 'MDNR', state: 'U.P.', category: 'NSG-4', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NANGLOI', code: 'NNO', state: 'DELHI', category: 'NSG-4', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'NARELA', code: 'NUR', state: 'DELHI', category: 'NSG-4', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'NOLI', code: 'NOLI', state: 'U.P.', category: 'NSG-4', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PALWAL', code: 'PWL', state: 'HARYANA', category: 'NSG-4', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'SAHIBABAD', code: 'SBB', state: 'U.P.', category: 'NSG-4', section: 'Delhi-Ghaziabad', cmi: 'CMI/Publicity' },
 { name: 'SHAKUR BASTI', code: 'SSB', state: 'DELHI', category: 'NSG-4', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'SUBZI MANDI', code: 'SZM', state: 'DELHI', category: 'NSG-4', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'ADARSH NAGAR DELHI', code: 'ANDI', state: 'DELHI', category: 'NSG-5', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'BADLI', code: 'BHD', state: 'DELHI', category: 'NSG-5', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'BAGHPAT ROAD', code: 'BPM', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'BALLABGARH', code: 'BVH', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'BARAUT', code: 'BTU', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'BUDHLADA', code: 'BLZ', state: 'PUNJAB', category: 'NSG-5', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'DELHI KISHANGANJ', code: 'DKZ', state: 'DELHI', category: 'NSG-5', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'DELHI SADAR BAZAR', code: 'DSB', state: 'DELHI', category: 'NSG-5', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'DEOBAND', code: 'DBD', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'FARIDABAD NEW TOWN', code: 'FDN', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'GARHI HARSARU JN.', code: 'GHH', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'JAKHAL JN.', code: 'JHL', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Panipat', cmi: 'CMI/Security' },
 { name: 'KAITHAL', code: 'KLE', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Panipat', cmi: 'CMI/Security' },
 { name: 'KHATAULI', code: 'KAT', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Panipat', cmi: 'CMI/Security' },
 { name: 'KHEKRA', code: 'KEX', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'MANSA', code: 'MSZ', state: 'PUNJAB', category: 'NSG-5', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'MAUR', code: 'MAUR', state: 'PUNJAB', category: 'NSG-5', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'MEERUT CANT', code: 'MUT', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'NARWANA JN.', code: 'NRW', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Panipat', cmi: 'CMI/Security' },
 { name: 'PALAM', code: 'PM', state: 'DELHI', category: 'NSG-5', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'PATAUDI ROAD', code: 'PTRD', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SAKHOTI TANDA', code: 'SKF', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'SAMALKHA', code: 'SMK', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SAMPLA', code: 'SPZ', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'SHAMLI', code: 'SMQL', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'TAPRI JN.', code: 'TPZ', state: 'U.P.', category: 'NSG-5', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'TOHANA', code: 'TUN', state: 'HARYANA', category: 'NSG-5', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'TUGALAKABAD', code: 'TKD', state: 'DELHI', category: 'NSG-5', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'AMIN', code: 'AMIN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ASAOTI', code: 'AST', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ASAUDAH', code: 'ASE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ASTHAL BOHAR', code: 'ABO', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'BABARPUR', code: 'BBDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BAMANHERI', code: 'BMHR', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BARETA', code: 'BRZ', state: 'PUNJAB', category: 'NSG-6', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'BARSOLA', code: 'BZO', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BASAI DHANKOT', code: 'BDXT', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BAZIDA JATAN', code: 'BZJT', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BHAINI KHURD', code: 'BZK', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BHODWAL MAJRI', code: 'BDMJ', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BIJWASAN', code: 'BWSN', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'BISHANPUR HARYANA', code: 'BSPH', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BRAR SQUARE', code: 'BRSQ', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DAURALA', code: 'DRLA', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'DAYA BASTI', code: 'DBSI', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DELHI AZADPUR', code: 'DAZ', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DHAMTAN SAHIB', code: 'DTN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DHARODI', code: 'DHY', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DHIRPUR', code: 'DPP', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DHODA KHERI', code: 'DHKR', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DHOLA MAJRA', code: 'DHMZ', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DIWANA', code: 'DWNA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DOBH BAHALI', code: 'DBHL', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'FARUKHNAGAR', code: 'FN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GARHI', code: 'GRHI', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GHARAUNDA', code: 'GRA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GHASO', code: 'GSO', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GHEVRA', code: 'GHE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GOHANA', code: 'GHNA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GULDHAR', code: 'GUH', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'HIMMATPURA', code: 'HMQ', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'HIND', code: 'HIND', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'HOLAMBI KALAN', code: 'HUK', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'INCHHAPURI', code: 'IHP', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'ISMAILA HARYANA', code: 'ISM', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JAI JAI WANTI', code: 'JJT', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JARAUDA NARA', code: 'JDW', state: 'U.P', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JATAULA JORI SAMPKA', code: 'JSKA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JHAJJAR', code: 'JHJ', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'JIND CITY', code: 'JCY', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'JULANA', code: 'JNA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'KALAYAT', code: 'KIY', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KANDHLA', code: 'KQL', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'KARAINTHI', code: 'KHV', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KATAR SINGH WALA', code: 'KZW', state: 'PUNJAB', category: 'NSG-6', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'KHALILPUR', code: 'KIP', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KHARAWAR', code: 'KRZ', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KHERA KALAN', code: 'KHKN', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KHUKRANA HALT', code: 'KURN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KILA ZAFARGARH', code: 'KZH', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KINANA', code: 'KIU', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KOT FATEH', code: 'KTF', state: 'PUNJAB', category: 'NSG-6', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'LAJPAT NAGAR', code: 'LPNR', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MADLAUDA', code: 'MLDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MAHAM', code: 'MAHM', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rohtak-Jind', cmi: 'CMI/Marketing' },
 { name: 'MAISAR KHANA', code: 'MASK', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MANANI', code: 'MNZ', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MANGOLPURI', code: 'MGLP', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MANSURPUR', code: 'MSP', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MOHIUDDINPUR', code: 'MUZ', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MOHRI', code: 'MOY', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MOKHRA-MADINA', code: 'MKMN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MUDLANA', code: 'MDLA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MUNDHAL KALAN', code: 'MLKN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MURADNAGAR', code: 'MUD', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Panipat', cmi: 'CMI/Security' },
 { name: 'NAGAL', code: 'NGL', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NANAUTA', code: 'NNX', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'NARINDARPURA', code: 'NPX', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NAULTHA', code: 'NLH', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NAYA GHAZIABAD', code: 'GZN', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'NILOKHERI', code: 'NLKR', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'OKHLA', code: 'OKA', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Local', cmi: 'CMI/UTS-PRS' },
 { name: 'PABLI KHAS', code: 'PQY', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PARTAPUR', code: 'PRTP', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'PATEL NAGAR', code: 'PTNR', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PATLI', code: 'PT', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Rewari', cmi: 'CMI/Planning' },
 { name: 'PEHOWA ROAD', code: 'PHWR', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PILU KHERA', code: 'PKDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'QASIMPUR KHERI', code: 'KPKI', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'RAMPUR MANIHARAN', code: 'RPMN', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'RATHDHANA', code: 'RDDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ROHANA KALAN', code: 'RNA', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'SADDA SINGHWALA', code: 'SSZ', state: 'PUNJAB', category: 'NSG-6', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'SAFIDON', code: 'SFDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SAJUMA', code: 'SJM', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SAMAR GOPALPUR', code: 'SMF', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SANDAL KALAN', code: 'SLKN', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SAROJINI NAGAR', code: 'SOJ', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SEWA NAGAR', code: 'SWNR', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SHAHABAD MARKANDA', code: 'SHDM', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SHAHABAD MUHAMMADPUR', code: 'SMDP', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SHIVAJI BRIDGE', code: 'CSB', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SIWAHA', code: 'SWDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'TALHERI BAZURG', code: 'THJ', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'TARAORI', code: 'TRR', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'THANA BHAWAN', code: 'THBN', state: 'U.P.', category: 'NSG-6', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'THANESAR CITY', code: 'TNDE', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'TIK', code: 'TIK', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'TILAK BRIDGE', code: 'TKJ', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'UCHANA', code: 'UCA', state: 'HARYANA', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'VIVEK VIHAR', code: 'VVB', state: 'DELHI', category: 'NSG-6', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'AHERA', code: 'AHQ', state: 'U.P.', category: 'HG-1', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BEHTA HAZIPUR', code: 'BHHZ', state: 'U.P.', category: 'HG-1', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GOTRA', code: 'GTRA', state: 'U.P.', category: 'HG-1', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SUNEHRA', code: 'SFA', state: 'U.P.', category: 'HG-1', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'THANA BHAWAN TOWN HALT', code: 'TBTN', state: 'U.P.', category: 'HG-1', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'AILAM HALT', code: 'AILM', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ANAND VIHAR HALT', code: 'ANVR', state: 'DELHI', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ASRA HALT', code: 'ASAR', state: 'U.P', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BARKA HALT', code: 'BADK', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BAWLI HALT', code: 'BAOL', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BHUDPUR', code: 'BDHP', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'FAKHARPUR HALT', code: 'FAP', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GOKULPUR SABOLI HALT', code: 'GPSL', state: 'DELHI', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KHANDRAWALI HALT', code: 'KZI', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KOHAND HALT', code: 'KFU', state: 'HARYANA', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KUMBHAWAS MUNDHALIA', code: 'KWMD', state: 'HARYANA', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'LAKHAN MAJRA HALT', code: 'LNMA', state: 'HARYANA', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MANDAWALI CHANDER VIHAR', code: 'MWC', state: 'DELHI', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MUNDKA HALT', code: 'MQC', state: 'DELHI', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NUSRATABAD KHARKHARI', code: 'NTG', state: 'U.P', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PANDU PINDARA HALT', code: 'PPDE', state: 'HARYANA', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'RAJLU GARHI HALT', code: 'RUG', state: 'HARYANA', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SUJRA', code: 'SUJR', state: 'U.P.', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'TAJ NAGAR', code: 'TNJR', state: 'HARYANA', category: 'HG-2', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ALAWALPUR IDRISPUR', code: 'AIH', state: 'U.P.', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ASAN', code: 'ASAN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BAHALBA HALT', code: 'BABH', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BARWASNI HALT', code: 'BRNI', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BHAINSWAN', code: 'BASN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BHAMBHEWA', code: 'BHMW', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BHANKALA', code: 'BNQL', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BINJHOL', code: 'BNJL', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BUDHA KHERA', code: 'BKDE', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'BUTANA HALT', code: 'BUTN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'CHANDER NAGAR HALT', code: 'CNJ', state: 'U.P.', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DATEWAS', code: 'DTW', state: 'PUNJAB', category: 'HG-3', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'DHURANA', code: 'DHRN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DIGHAL', code: 'DGHL', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'DUHAI', code: 'DXH', state: 'U.P', category: 'HG-3', section: 'Delhi-Saharanpur', cmi: 'CMI/Sanitation' },
 { name: 'GAON BARODA', code: 'GNBA', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GEONG HALT', code: 'GXG', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GOKALGARH', code: 'GKG', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GUJRAN-BALWA HALT', code: 'GLBN', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'GURTHURI', code: 'GRZ', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'HARHAR FATEHPUR', code: 'HHP', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'HARSANA KALAN', code: 'HNN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ISHAPUR KHERI HALT', code: 'ISRI', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ISRANA HALT', code: 'IRA', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JANDHERA HALT', code: 'JDHH', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'JASIA HALT', code: 'JSS', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KAHANGARH HALT', code: 'KAGR', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KALWAN HALT', code: 'KLWN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KARSINDHU HALT', code: 'KSDE', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KHANDARI HALT', code: 'KHDR', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KHARKARA HALT', code: 'KRKH', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KIRTINAGAR HALT', code: 'KRTN', state: 'DELHI', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'KOTLI KALAN HALT', code: 'KTKL', state: 'PUNJAB', category: 'HG-3', section: 'Delhi-Bathinda', cmi: 'CMI/Comml.Control' },
 { name: 'LALIT KHERA HALT', code: 'LTKR', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'LATH HALT', code: 'LATH', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'LODI COLONY', code: 'LDCY', state: 'DELHI', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MACHHRAULI', code: 'MHRI', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MAKRAULI', code: 'MKLI', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'MOHANA HARYANA', code: 'MOHR', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NARA HALT', code: 'NARA', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NARAINA VIHAR', code: 'NRVR', state: 'DELHI', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'NEW KAITHAL HALT', code: 'NKLE', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PABNAWAJAS MAHINDAR', code: 'PBJM', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PALHAWAS', code: 'PLHW', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'PINDARSI HALT', code: 'PDS', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'QUTABPUR', code: 'QTP', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'RABHRA HALT', code: 'RBHR', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'ROHAD NAGAR', code: 'ROHN', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'RUKHI HALT', code: 'RKX', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SHAHID RAMPHAL BALHARA HALT', code: 'SRBH', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SILA KHERI', code: 'SXE', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SILAWAR', code: 'SLWR', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SONA ARJUNPUR', code: 'SNAP', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SORKHI HALT', code: 'SRHT', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SULTANPUR KALIAWAS', code: 'STKW', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'SUNDERPUR BA KA', code: 'SPBK', state: 'HARYANA', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
 { name: 'USMANPUR DEHAT HALT', code: 'UPRD', state: 'U.P', category: 'HG-3', section: 'Delhi-Ambala', cmi: 'CMI/TC' },
];

// ─── Station Planning Info (editable by Planning cell user) ──────────────────
export interface StationPlanningInfo {
 code: string;
 platforms: number;
 utsCountersAvailable: number;
 utsCountersWorking: number;
 staff: number;
 prsCountersAvailable: number;
 prsCountersWorking: number;
 prsCounterType: 'Advance' | 'Current' | 'Both' | '-';
 terminalType: 'RH' | 'NRH' | '-';
 googleSheetUrl?: string;
 lastUpdated?: string;
 updatedBy?: string;
}

// Seed data for NSG-1 stations; rest default to 0/unknown
export const STATION_PLANNING_DATA: Record<string, StationPlanningInfo> = {
 'NDLS': { code: 'NDLS', platforms: 16, utsCountersAvailable: 18, utsCountersWorking: 16, staff: 312, prsCountersAvailable: 24, prsCountersWorking: 22, prsCounterType: 'Both', terminalType: 'RH', lastUpdated: '2026-06-10', updatedBy: 'sunita.planning@delhi.nr.in' },
 'DLI': { code: 'DLI', platforms: 12, utsCountersAvailable: 14, utsCountersWorking: 12, staff: 248, prsCountersAvailable: 18, prsCountersWorking: 16, prsCounterType: 'Both', terminalType: 'RH', lastUpdated: '2026-06-10', updatedBy: 'sunita.planning@delhi.nr.in' },
 'NZM': { code: 'NZM', platforms: 8, utsCountersAvailable: 10, utsCountersWorking: 9, staff: 186, prsCountersAvailable: 14, prsCountersWorking: 12, prsCounterType: 'Both', terminalType: 'RH', lastUpdated: '2026-06-10', updatedBy: 'sunita.planning@delhi.nr.in' },
 'ANVT': { code: 'ANVT', platforms: 6, utsCountersAvailable: 8, utsCountersWorking: 7, staff: 142, prsCountersAvailable: 10, prsCountersWorking: 9, prsCounterType: 'Both', terminalType: 'RH', lastUpdated: '2026-06-10', updatedBy: 'sunita.planning@delhi.nr.in' },
 'DEE': { code: 'DEE', platforms: 4, utsCountersAvailable: 6, utsCountersWorking: 5, staff: 98, prsCountersAvailable: 8, prsCountersWorking: 7, prsCounterType: 'Current', terminalType: 'NRH', lastUpdated: '2026-06-08', updatedBy: 'sunita.planning@delhi.nr.in' },
 'GZB': { code: 'GZB', platforms: 6, utsCountersAvailable: 8, utsCountersWorking: 6, staff: 112, prsCountersAvailable: 10, prsCountersWorking: 8, prsCounterType: 'Current', terminalType: 'NRH', lastUpdated: '2026-06-08', updatedBy: 'sunita.planning@delhi.nr.in' },
};

// ─── Confidential Report System ───────────────────────────────────────────────
export type ConfidentialityLevel = 'public' | 'confidential' | 'restricted';
export type ReportStatus = 'draft' | 'submitted' | 'acknowledged';

export interface ConfidentialReport {
 id: string;
 title: string;
 category: string; // e.g."Punishment","D&AR","Staff List"
 cell: string;
 createdBy: string; // user id
 createdByName: string;
 createdByDesignation: string;
 createdAt: string;
 updatedAt: string;
 confidentiality: ConfidentialityLevel;
 allowedUserIds: string[]; // user ids who can view (empty = all)
 status: ReportStatus;
 summary: string; // short description
 content: ConfidentialReportRow[];
 acknowledged: string[]; // user ids who have acknowledged
}

export interface ConfidentialReportRow {
 [key: string]: string | number;
}

// ─── EXTENDED_USERS = all users (mockUsers already contains the full list) ────
// Used by Confidential Reports user-picker — just re-export mockUsers
export const EXTENDED_USERS: User[] = mockUsers;

// ─── Seed confidential reports ────────────────────────────────────────────────
export const CONFIDENTIAL_REPORTS_SEED: ConfidentialReport[] = [
 {
 id: 'cr001',
 title: 'Staff Under Punishment — June 2026',
 category: 'Punishment',
 cell: 'Security D&AR',
 createdBy: 'u03',
 createdByName: 'Rajeev Gupta',
 createdByDesignation: 'CMI/Security',
 createdAt: '2026-06-10T10:00:00Z',
 updatedAt: '2026-06-10T10:00:00Z',
 confidentiality: 'confidential',
 allowedUserIds: ['m1', 'a1'],
 status: 'submitted',
 summary: 'List of 12 commercial staff serving major/minor penalties as of June 2026',
 content: [
 { srNo: 1, name: 'R. Yadav', designation: 'Ticket Collector', station: 'NDLS', penaltyType: 'Minor', penaltyOrder: 'NDLS/TC/2026/01', effectFrom: '2026-05-01', duration: '1 month', remarks: 'Irregular attendance' },
 { srNo: 2, name: 'S. Kumar', designation: 'Booking Clerk', station: 'DLI', penaltyType: 'Major', penaltyOrder: 'DLI/BC/2026/03', effectFrom: '2026-04-15', duration: '6 months', remarks: 'Misappropriation of funds' },
 { srNo: 3, name: 'P. Verma', designation: 'TTE', station: 'NZM', penaltyType: 'Minor', penaltyOrder: 'NZM/TTE/2026/07', effectFrom: '2026-06-01', duration: '2 months', remarks: 'Absence from duty' },
 ],
 acknowledged: ['m1'],
 },
 {
 id: 'cr002',
 title: 'D&AR Pending Cases — Q1 FY2026-27',
 category: 'D&AR',
 cell: 'Security D&AR',
 createdBy: 'u03',
 createdByName: 'Rajeev Gupta',
 createdByDesignation: 'CMI/Security',
 createdAt: '2026-06-05T09:00:00Z',
 updatedAt: '2026-06-08T11:00:00Z',
 confidentiality: 'restricted',
 allowedUserIds: ['m1'],
 status: 'submitted',
 summary: 'Pending departmental inquiry cases requiring Sr. DCM decision',
 content: [
 { srNo: 1, caseNo: 'DEL/DAR/2026/14', employee: 'M. Singh', charge: 'Gross misconduct', stage: 'Inquiry pending', inchargeOfficer: 'AEN/Delhi', targetDate: '2026-06-30' },
 { srNo: 2, caseNo: 'DEL/DAR/2026/18', employee: 'B. Prasad', charge: 'Ticket irregularity', stage: 'Statement recorded', inchargeOfficer: 'Sr.TI/NDLS', targetDate: '2026-07-15' },
 ],
 acknowledged: [],
 },
];
