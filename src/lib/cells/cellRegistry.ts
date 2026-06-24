// ─────────────────────────────────────────────────────────────────────────────
// Cell Registry — Dynamic Cell Management System
// ─────────────────────────────────────────────────────────────────────────────

export type CellStatus = 'active' | 'inactive' | 'archived';

export interface CellRecord {
 id: string;
 name: string;
 code: string;
 slug: string;
 description: string;
 headDesignation: string;
 iconKey: string;
 status: CellStatus;
 isBuiltin: boolean;
 createdAt: string;
 updatedAt: string;
 order: number;
 createdBy?: string;
 updatedBy?: string;
}

const REGISTRY_KEY = 'rly_cell_registry';

export const BUILTIN_CELLS: CellRecord[] = [
 { id:'c_planning', name:'Planning', code:'PLANNING', slug:'planning', description:'Commercial Planning & Policy', headDesignation:'CMI/Planning', iconKey:'ClipboardList', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:1 },
 { id:'c_manpower', name:'Manpower Planning', code:'MANPOWER', slug:'manpower', description:'Staff Deployment & Manpower Management', headDesignation:'COS/Manpower', iconKey:'Users2', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:2 },
 { id:'c_security', name:'Security D&AR', code:'SECURITY', slug:'security', description:'Discipline, Appeal & Security Matters', headDesignation:'CMI/Security', iconKey:'ShieldCheck', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:3 },
 { id:'c_legal', name:'Legal', code:'LEGAL', slug:'legal', description:'Legal Affairs & Court Cases', headDesignation:'COS/Legal', iconKey:'Scale', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:4 },
 { id:'c_marketing', name:'Marketing', code:'MARKETING', slug:'marketing', description:'Passenger Marketing & Business Development', headDesignation:'CMI/Marketing', iconKey:'Megaphone', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:5 },
 { id:'c_tte', name:'Ticket Checking', code:'TTE', slug:'tte', description:'Ticket Examination & Penalty Management', headDesignation:'CMI/TC', iconKey:'Ticket', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:6 },
 { id:'c_utsprs', name:'UTS PRS', code:'UTSPRS', slug:'prs', description:'Unreserved & Reserved Ticketing Systems', headDesignation:'CMI/UTS-PRS', iconKey:'BarChart3', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:7 },
 { id:'c_jtbs', name:'JTBS/YTSK/STBA', code:'JTBS', slug:'jtbs', description:'Jan Sadharan Ticket Booking & Allied Services', headDesignation:'COS/JTBS', iconKey:'Store', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:8 },
 { id:'c_store', name:'Store', code:'STORE', slug:'store', description:'Commercial Stores & Inventory Management', headDesignation:'COS/Store', iconKey:'Package', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:9 },
 { id:'c_sanitation', name:'Sanitation', code:'SANIT', slug:'sanitation', description:'Station Sanitation & Housekeeping', headDesignation:'CMI/Sanitation', iconKey:'Sparkles', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:10 },
 { id:'c_catering', name:'Catering', code:'CATERING', slug:'catering', description:'On-board & Platform Catering Services', headDesignation:'CMI/Catering', iconKey:'UtensilsCrossed', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:11 },
 { id:'c_parking', name:'Parking', code:'PARKING', slug:'parking', description:'Station Parking Management', headDesignation:'COS/Parking', iconKey:'ParkingSquare', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:12 },
 { id:'c_publicity', name:'Publicity', code:'PUBLICITY', slug:'publicity', description:'Publicity, Advertisements & Hoardings', headDesignation:'CMI/Publicity', iconKey:'Radio', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:13 },
 { id:'c_porter', name:'License Porter', code:'PORTER', slug:'porter', description:'Licensed Porter Management & Allocation', headDesignation:'COS/Porter', iconKey:'Briefcase', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:14 },
 { id:'c_complaints', name:'Complaint/RailMadad', code:'COMPLAINTS', slug:'complaints', description:'Complaint Management & RailMadad Integration', headDesignation:'CMI/Complaints', iconKey:'MessageCircle', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:15 },
 { id:'c_concession', name:'Concession', code:'CONCESS', slug:'concession', description:'Concession Pass & Privilege Ticket Management', headDesignation:'COS/Concession', iconKey:'Tag', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:16 },
 { id:'c_pa', name:'PA', code:'PA', slug:'pa', description:'Personal Assistant & Office Management', headDesignation:'PA to Sr.DCM', iconKey:'Phone', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:17 },
 { id:'c_control', name:'Commercial Control', code:'CONTROL', slug:'control', description:'Commercial Control & Coordination', headDesignation:'CMI/Comml.Control', iconKey:'Monitor', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:18 },
 { id:'c_union', name:'Union/DRUCC', code:'UNION', slug:'union', description:'Union Relations & DRUCC', headDesignation:'COS/Union', iconKey:'Users2', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:19 },
 { id:'c_dak', name:'DAK', code:'DAK', slug:'dak', description:'Dak (Correspondence) & Record Management', headDesignation:'COS/DAK', iconKey:'FolderOpen', status:'active', isBuiltin:true, createdAt:'2024-01-01', updatedAt:'2024-01-01', order:20 },
];

function gid() { return `cell_${Date.now()}_${Math.floor(Math.random()*10000)}`; }

export function getAllCells(): CellRecord[] {
 if (typeof window === 'undefined') return BUILTIN_CELLS;
 try {
 const raw = localStorage.getItem(REGISTRY_KEY);
 if (!raw) {
 localStorage.setItem(REGISTRY_KEY, JSON.stringify(BUILTIN_CELLS));
 return BUILTIN_CELLS;
 }
 const stored: CellRecord[] = JSON.parse(raw);
 // Merge new built-ins if any added in updates
 const storedIds = new Set(stored.map(c => c.id));
 const missing = BUILTIN_CELLS.filter(b => !storedIds.has(b.id));
 if (missing.length) {
 const merged = [...stored, ...missing].sort((a, b) => a.order - b.order);
 localStorage.setItem(REGISTRY_KEY, JSON.stringify(merged));
 return merged;
 }
 return stored.sort((a, b) => a.order - b.order);
 } catch { return BUILTIN_CELLS; }
}

export function getActiveCells(): CellRecord[] {
 return getAllCells().filter(c => c.status === 'active');
}

export function getCellBySlug(slug: string): CellRecord | null {
 return getAllCells().find(c => c.slug === slug) ?? null;
}

function saveCells(cells: CellRecord[]) {
 if (typeof window !== 'undefined') localStorage.setItem(REGISTRY_KEY, JSON.stringify(cells));
}

export function createCell(
 data: Pick<CellRecord,'name'|'code'|'description'|'headDesignation'|'iconKey'>,
 createdBy?: string,
): CellRecord {
 const cells = getAllCells();
 const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
 const maxOrder = Math.max(0, ...cells.map(c => c.order));
 const cell: CellRecord = {
 id: gid(), name: data.name.trim(), code: data.code.trim().toUpperCase(),
 slug, description: data.description.trim(),
 headDesignation: data.headDesignation.trim(),
 iconKey: data.iconKey || 'Folder',
 status: 'active', isBuiltin: false,
 createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
 order: maxOrder + 1, createdBy, updatedBy: createdBy,
 };
 saveCells([...cells, cell]);
 return cell;
}

export function updateCell(
 id: string,
 patch: Partial<Pick<CellRecord,'name'|'code'|'description'|'headDesignation'|'iconKey'|'status'|'order'>>,
 updatedBy?: string,
): CellRecord | null {
 const cells = getAllCells();
 const idx = cells.findIndex(c => c.id === id);
 if (idx < 0) return null;
 const newSlug = patch.name
 ? patch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
 : cells[idx].slug;
 cells[idx] = { ...cells[idx], ...patch, slug: newSlug, updatedAt: new Date().toISOString(), updatedBy };
 saveCells(cells);
 return cells[idx];
}

export function setCellStatus(id: string, status: CellStatus, by?: string) {
 updateCell(id, { status }, by);
}

export function archiveCell(id: string, by?: string) {
 const cells = getAllCells();
 const cell = cells.find(c => c.id === id);
 if (!cell) return;
 if (cell.isBuiltin) throw new Error('Built-in cells cannot be deleted');
 setCellStatus(id, 'archived', by);
}

export const AVAILABLE_ICONS = [
 'Folder','Users2','BarChart3','ShieldCheck','Scale','Megaphone','Ticket','Store',
 'Package','Sparkles','UtensilsCrossed','ParkingSquare','Radio','Briefcase',
 'MessageCircle','Tag','Phone','Monitor','FolderOpen','ClipboardList','Building2',
 'Globe','Truck','Layers','Activity','Database','FileText','Settings','Boxes',
];
