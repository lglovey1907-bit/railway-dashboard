'use client';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Database, Maximize2, PanelRight, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CellDataManager } from '@/components/cell/CellDataManager';

export type DbPeekMode = 'center' | 'side' | 'fullpage';

interface Props {
  cell: string;
  mode: DbPeekMode;
  onClose: () => void;
  onChangeMode: (m: DbPeekMode) => void;
}

const MODE_OPTS = [
  { id: 'center'   as DbPeekMode, Icon: ScanSearch, label: 'Center Peek' },
  { id: 'side'     as DbPeekMode, Icon: PanelRight,  label: 'Side Peek'   },
  { id: 'fullpage' as DbPeekMode, Icon: Maximize2,   label: 'Full Page'   },
];

// ── Shared header rendered inside each mode ───────────────────────────────────
function PeekHeader({ mode, onClose, onChangeMode }: Pick<Props, 'mode' | 'onClose' | 'onChangeMode'>) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
      <Database size={13} className="text-rail-600 shrink-0"/>
      <span className="text-sm font-bold text-slate-900 flex-1">Database</span>

      {/* Mode switcher pills */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 mr-1">
        {MODE_OPTS.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => onChangeMode(id)}
            title={label}
            className={cn(
              'p-1.5 rounded-md transition-all',
              mode === id
                ? 'bg-white shadow-sm text-rail-600'
                : 'text-slate-400 hover:text-slate-600',
            )}>
            <Icon size={12}/>
          </button>
        ))}
      </div>

      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
        <X size={14}/>
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function DatabasePeekModal({ cell, mode, onClose, onChangeMode }: Props) {
  // Resizable side panel width
  const [sideWidth, setSideWidth] = useState(() => {
    try { return Number(localStorage.getItem('rly_db_side_width') || 500); }
    catch { return 500; }
  });
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  // Keyboard: Esc → close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Resize drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const diff = dragRef.current.startX - e.clientX;
      const w = Math.max(340, Math.min(900, dragRef.current.startW + diff));
      setSideWidth(w);
    };
    const onUp = () => {
      if (dragRef.current) {
        try { localStorage.setItem('rly_db_side_width', String(sideWidth)); } catch {}
        dragRef.current = null;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [sideWidth]);

  if (typeof window === 'undefined') return null;

  // ── Full Page — rendered inline by parent; this file handles portal modes ──
  if (mode === 'fullpage') return null;

  const body = (
    <div className="flex-1 overflow-y-auto custom-scroll">
      <CellDataManager cell={cell}/>
    </div>
  );

  // ── Center Peek ────────────────────────────────────────────────────────────
  if (mode === 'center') {
    return createPortal(
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
          style={{ maxHeight: '88vh', minHeight: 400 }}
          onClick={e => e.stopPropagation()}>
          <PeekHeader mode={mode} onClose={onClose} onChangeMode={onChangeMode}/>
          {body}
        </div>
      </div>,
      document.body
    );
  }

  // ── Side Peek ──────────────────────────────────────────────────────────────
  return createPortal(
    <>
      {/* Dim backdrop */}
      <div
        className="fixed inset-0 z-[1900] bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}/>

      {/* Side panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[2000] bg-white shadow-2xl flex flex-col"
        style={{ width: sideWidth, transition: 'none' }}
        onClick={e => e.stopPropagation()}>

        {/* Drag resize handle on left edge */}
        <div
          className="absolute left-0 top-0 bottom-0 w-4 cursor-col-resize z-10 group"
          onMouseDown={e => {
            e.preventDefault();
            dragRef.current = { startX: e.clientX, startW: sideWidth };
          }}>
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-10 w-0.5 bg-slate-300 rounded group-hover:bg-rail-400 transition-colors"/>
        </div>

        <PeekHeader mode={mode} onClose={onClose} onChangeMode={onChangeMode}/>
        {body}
      </div>
    </>,
    document.body
  );
}

// ── Inline full-page wrapper (used directly in canvas) ────────────────────────
export function DatabaseFullPage({ cell, onClose, onChangeMode }: Omit<Props, 'mode'>) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <PeekHeader mode="fullpage" onClose={onClose} onChangeMode={onChangeMode}/>
      <div className="flex-1 overflow-y-auto custom-scroll">
        <CellDataManager cell={cell}/>
      </div>
    </div>
  );
}
