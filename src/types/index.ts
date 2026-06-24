// ─── Auth & Users ───────────────────────────────────────────────────────────
export type UserRole = 'maintenance' | 'admin' | 'incharge' | 'user';

export interface PreviousPosting {
 designation: string;
 cell: string;
 station: string;
 from: string;
 to: string;
}

export interface User {
 id: string;
 name: string;
 email: string;
 role: UserRole;
 cell: string;
 designation: string;
 division: string;
 approved: boolean;
 createdAt: string;
 lastLogin?: string;
 avatar?: string;

 // ── Signup (mandatory at registration) ──────────────────────────────────
 hrmsId?: string;
 fatherHusbandName?: string;
 workingAs?: string; // e.g."Booking Clerk","TTE","Dealer"
 mobileNumber?: string;
 mustChangePassword?: boolean;

 // ── Cell Staff Roster fields ─────────────────────────────────────────────
 listOfWorkAssigned?: string;
 datePostingInCell?: string;

 // ── Complete Profile (optional, filled later) ───────────────────────────
 appointmentDate?: string;
 workingSinceInCell?: string;
 photoUrl?: string;
 previousPostings?: PreviousPosting[];
 profileCompleted?: boolean;
}

export interface AuthState {
 user: User | null;
 token: string | null;
 isLoading: boolean;
 error: string | null;
}

export interface LoginCredentials {
 email: string;
 password: string;
}

export interface RegisterRequest extends LoginCredentials {
 name: string;
 designation: string;
 cell: string;
 employeeId: string;

}

// ─── 20 Commercial Cells ──────────────────────────────────────────────────────
export type Cell =
 | 'Planning'
 | 'Manpower Planning'
 | 'Security D&AR'
 | 'Legal'
 | 'Marketing'
 | 'Ticket Checking'
 | 'UTS PRS'
 | 'JTBS/YTSK/STBA'
 | 'Store'
 | 'Sanitation'
 | 'Catering'
 | 'Parking'
 | 'Publicity'
 | 'License Porter'
 | 'Complaint/RailMadad'
 | 'Concession'
 | 'PA'
 | 'Commercial Control'
 | 'Union/DRUCC'
 | 'DAK'
 | 'All';

export interface KPIMetric {
 id: string;
 label: string;
 value: number | string;
 unit: string;
 change: number;
 trend: 'up' | 'down' | 'neutral';
 cell: Cell;
 icon: string;
 color: string;
 target?: number;
}

export interface RevenueData {
 month: string;
 utsprs: number;
 ticketchecking: number;
 catering: number;
 parking: number;
 jtbs: number;
 total: number;
 target: number;
}

export interface StationData {
 station: string;
 code: string;
 zone: string;
 totalAmount: number;
 digiAmount: number;
 digiPct: number;
 totalSlips: number;
 passengersBooked: number;
 passengersCancelled: number;
 target: number;
 achievement: number;
}

export interface ComplaintData {
 id: string;
 date: string;
 cell: Cell;
 category: string;
 description: string;
 status: 'open' | 'in-progress' | 'resolved' | 'escalated';
 priority: 'low' | 'medium' | 'high' | 'critical';
 assignedTo: string;
 escalationLevel: number;
 daysOpen: number;
}

export interface UTSData {
 date: string;
 station: string;
 transactions: number;
 amount: number;
 cancelledTickets: number;
 refundAmount: number;
 unreservedJourneys: number;
}

export interface PRSData {
 date: string;
 station: string;
 bookings: number;
 amount: number;
 waitlisted: number;
 cancelled: number;
 tatkal: number;
 tatkalAmount: number;
}

export interface ATVMData {
 machineId: string;
 station: string;
 date: string;
 transactions: number;
 amount: number;
 uptime: number;
 status: 'active' | 'idle' | 'fault' | 'maintenance';
}

export interface TTEData {
 date: string;
 division: string;
 inspections: number;
 penaltyCases: number;
 penaltyAmount: number;
 compoundedCases: number;
 compoundedAmount: number;
 edrsCases: number;
}

export interface ChartDataPoint {
 name: string;
 value: number;
 [key: string]: string | number;
}

// ─── PRS-style Power BI View Data ─────────────────────────────────────────────
export interface PRSStationRow {
 bookingLocation: string;
 code: string;
 totalAmount: number;
 digiAmount: number;
 digiPct: number;
 totalSlips: number;
 passengersBooked: number;
 passengersCancelled: number;
}

export interface DailyDigiData {
 day: number;
 digiPct: number;
}

export interface PaymentModeShare {
 mode: string;
 value: number;
 color: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface PendingRegistration {
 id: string;
 user: Omit<User, 'id' | 'approved' | 'createdAt'>;
 submittedAt: string;
 employeeId: string;
}

export interface DataSourceConfig {
 id: string;
 name: string;
 type: 'csv' | 'json' | 'api' | 'sql';
 cell: Cell;
 endpoint?: string;
 uploadedFile?: string;
 refreshInterval: number;
 lastRefreshed?: string;
 status: 'active' | 'error' | 'pending';
}

export interface DashboardConfig {
 id: string;
 title: string;
 cell: Cell;
 widgets: WidgetConfig[];
 visibleTo: UserRole[];
 createdBy: string;
 updatedAt: string;
}

export interface WidgetConfig {
 id: string;
 type: 'kpi' | 'line-chart' | 'bar-chart' | 'pie-chart' | 'table' | 'map' | 'gauge';
 title: string;
 dataSource: string;
 position: { x: number; y: number; w: number; h: number };
 config: Record<string, unknown>;
}

export interface ReportRequest {
 id: string;
 requestedBy: string;
 cell: Cell;
 type: string;
 dateRange: { from: string; to: string };
 status: 'pending' | 'approved' | 'rejected' | 'generated';
 requestedAt: string;
}
