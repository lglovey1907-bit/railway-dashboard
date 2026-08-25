import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, File, Plus } from 'lucide-react';
import type { DataSource } from '@/lib/monthly/types';

const SRC_ICONS: Record<string, React.ReactNode> = {
  sheets: <FileSpreadsheet size={16} className="text-emerald-500" />,
  docs: <FileText size={16} className="text-blue-500" />,
  pdf: <File size={16} className="text-red-500" />,
};

interface Props {
  dataSources: DataSource[];
  onUpdateSources: (sources: DataSource[]) => void;
  onFetchSheet?: (src: DataSource) => void;
  onFetchDoc?: (src: DataSource) => void;
  fetchingId?: string | null;
  onClose: () => void;
}

export function DataSourcesModal({
  dataSources, onUpdateSources, onFetchSheet, onFetchDoc, fetchingId, onClose
}: Props) {
  const [newSrc, setNewSrc] = useState<{ type: 'sheets'|'docs'|'pdf'; url: string; label: string }>({
    type: 'sheets', url: '', label: ''
  });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const handleAdd = async () => {
    if (!newSrc.label.trim()) { setError('Please enter a label.'); return; }
    
    let finalUrl = newSrc.url.trim();
    
    if (newSrc.type === 'pdf') {
      if (!pdfFile && !finalUrl) {
        setError('Please upload a PDF or enter a URL.');
        return;
      }
      if (pdfFile) {
        setIsUploading(true);
        setError('');
        try {
          const formData = new FormData();
          formData.append('file', pdfFile);
          const res = await fetch('/api/pdf', { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          finalUrl = data.url;
        } catch (err: any) {
          setError(err.message);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }
    } else {
      if (!finalUrl) { setError('Please enter a URL.'); return; }
    }
    
    const src: DataSource = {
      id: 'ds-' + Date.now(),
      type: newSrc.type,
      url: finalUrl,
      label: newSrc.label.trim()
    };
    onUpdateSources([...dataSources, src]);
    setNewSrc({ type: 'sheets', url: '', label: '' });
    setPdfFile(null);
    setError('');
  };

  const removeDataSource = (id: string) => {
    onUpdateSources(dataSources.filter(s => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-800">Linked Data Sources</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X size={16}/></button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {dataSources.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">No data sources linked yet.</p>
          ) : (
            <div className="space-y-2">
              {dataSources.map(src => (
                <div key={src.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    {SRC_ICONS[src.type]}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{src.label}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[250px]">{src.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {src.type === 'sheets' && onFetchSheet && (
                      <button onClick={() => onFetchSheet(src)} disabled={fetchingId === src.id}
                        className="px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg text-emerald-700 font-medium">
                        {fetchingId === src.id ? '⏳ Fetching…' : '📥 Fetch & Fill'}
                      </button>
                    )}
                    {(src.type === 'docs' || src.type === 'pdf') && onFetchDoc && (
                      <button onClick={() => onFetchDoc(src)} disabled={fetchingId === src.id}
                        className="px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg text-emerald-700 font-medium">
                        {fetchingId === src.id ? '⏳ Fetching…' : '📥 Fetch & Fill'}
                      </button>
                    )}
                    <button onClick={() => removeDataSource(src.id)}
                      className="px-2 py-1 text-[10px] bg-red-50 hover:bg-red-100 rounded-lg text-red-500">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">Add New Source</h3>
            <div className="flex gap-2">
              <select value={newSrc.type} onChange={e => setNewSrc({...newSrc, type: e.target.value as any})}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
                <option value="sheets">Google Sheets</option>
                <option value="docs">Google Docs</option>
                <option value="pdf">PDF Link</option>
              </select>
              <input type="text" placeholder="Label (e.g. 'April Figures')"
                value={newSrc.label} onChange={e => setNewSrc({...newSrc, label: e.target.value})}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              {newSrc.type === 'pdf' ? (
                <div className="flex-1 flex gap-2">
                  <input type="file" accept=".pdf"
                    onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                  <span className="text-[10px] text-slate-400 self-center">OR</span>
                  <input type="text" placeholder="URL..."
                    value={newSrc.url} onChange={e => setNewSrc({...newSrc, url: e.target.value})}
                    className="w-1/3 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                </div>
              ) : (
                <input type="text" placeholder="Paste document URL here..."
                  value={newSrc.url} onChange={e => setNewSrc({...newSrc, url: e.target.value})}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
              )}
              <button onClick={handleAdd} disabled={isUploading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                {isUploading ? 'Uploading...' : <><Plus size={14}/> Add</>}
              </button>
            </div>
            {error && <p className="text-[10px] text-red-500">{error}</p>}
            <p className="text-[10px] text-slate-400">
              For Google Docs/Sheets, ensure link sharing is set to "Anyone with the link can view".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
