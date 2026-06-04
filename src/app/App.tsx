import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, CheckCircle, Upload, Download } from 'lucide-react';
import { AddPublisherModal } from './components/AddPublisherModal';
import { PublisherCard } from './components/PublisherCard';
import { PublisherDetail } from './components/PublisherDetail';
import { parseAdsTxt } from './utils/adsTxtParser';
import { loadPublishers, savePublishers, fetchAdsTxtViaProxy } from './utils/api';
import { LOGO_SRC } from './constants/logo';
import type { Publisher, FileType, PublisherType } from './types';

let nextId = Date.now();

const FLOAT_POSITIONS = [
  { x: 4,  y: 8,  sz: 55, dur: 9,   delay: 0,   rot: -12 },
  { x: 76, y: 4,  sz: 40, dur: 7,   delay: 2.5, rot: 9   },
  { x: 87, y: 44, sz: 68, dur: 11,  delay: 1,   rot: -5  },
  { x: 2,  y: 62, sz: 46, dur: 8,   delay: 4,   rot: 14  },
  { x: 53, y: 70, sz: 38, dur: 10,  delay: 6,   rot: -8  },
  { x: 38, y: 16, sz: 30, dur: 7.5, delay: 3.5, rot: 20  },
  { x: 66, y: 82, sz: 58, dur: 12,  delay: 7,   rot: -16 },
  { x: 20, y: 84, sz: 42, dur: 9.5, delay: 5,   rot: 7   },
  { x: 91, y: 68, sz: 32, dur: 8,   delay: 1.5, rot: -10 },
];

export default function App() {
  const [publishers, setPublishers] = useState<Publisher[]>(() => {
    const saved = loadPublishers();
    return saved.map(p => {
      const enhanced = { ...p, publisherType: p.publisherType ?? 'both' };
      for (const fileType of ['ads.txt', 'app-ads.txt'] as const) {
        if (enhanced.files[fileType].content && !enhanced.files[fileType].parseResult) {
          enhanced.files[fileType].parseResult = parseAdsTxt(enhanced.files[fileType].content);
        }
      }
      return enhanced;
    });
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<FileType>('ads.txt');
  const [showAddModal, setShowAddModal] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    savePublishers(publishers);
  }, [publishers]);

  const updatePublisher = useCallback((id: string, fileType: FileType, patch: Partial<any>) => {
    setPublishers(prev => prev.map(p =>
      p.id === id ? { ...p, files: { ...p.files, [fileType]: { ...p.files[fileType], ...patch } } } : p
    ));
  }, []);

  async function doFetch(publisher: Publisher, fileType: FileType) {
    updatePublisher(publisher.id, fileType, { status: 'loading', error: null });
    try {
      const text = await fetchAdsTxtViaProxy(publisher.url);
      const parseResult = parseAdsTxt(text);
      updatePublisher(publisher.id, fileType, { status: 'success', content: text, parseResult });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred.';
      updatePublisher(publisher.id, fileType, { status: 'error', error: errorMsg });
    }
  }

  function handleAdd(
    name: string,
    publisherType: PublisherType,
    entries: { fileType: FileType; url: string; pastedContent?: string }[]
  ) {
    const id = String(nextId++);
    const pub: Publisher = {
      id, name,
      url: entries[0]?.url ?? '',
      publisherType,
      files: {
        'ads.txt': { content: null, status: 'idle', error: null, parseResult: null },
        'app-ads.txt': { content: null, status: 'idle', error: null, parseResult: null },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    for (const entry of entries) {
      pub.files[entry.fileType].content = entry.pastedContent || null;
      pub.files[entry.fileType].status = entry.pastedContent ? 'success' : 'idle';
      pub.files[entry.fileType].parseResult = entry.pastedContent ? parseAdsTxt(entry.pastedContent) : null;
      if (!entry.pastedContent && entry.url && !entry.url.startsWith('pasted://')) pub.url = entry.url;
    }
    setPublishers(prev => [...prev, pub]);
    for (const entry of entries) { if (!entry.pastedContent) doFetch(pub, entry.fileType); }
    setShowAddModal(false);
  }

  function handleRemove(id: string) {
    setPublishers(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleRefetch(id: string, fileType: FileType) {
    const pub = publishers.find(p => p.id === id);
    if (pub) doFetch(pub, fileType);
  }

  function handleUpdateContent(id: string, fileType: FileType, content: string) {
    const parseResult = parseAdsTxt(content);
    updatePublisher(id, fileType, { content, parseResult });
  }

  function handleExport() {
    if (publishers.length === 0) return;
    const blob = new Blob([JSON.stringify(publishers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adstxt-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Publisher[];
        if (Array.isArray(data)) {
          const enhanced = data.map(p => ({
            ...p,
            publisherType: p.publisherType ?? 'both',
            files: {
              'ads.txt': { ...p.files?.['ads.txt'], parseResult: null },
              'app-ads.txt': { ...p.files?.['app-ads.txt'], parseResult: null },
            }
          }));
          setPublishers(enhanced as Publisher[]);
        }
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const selectedPublisher = publishers.find(p => p.id === selectedId) ?? null;
  const isLoading = publishers.some(p =>
    p.files['ads.txt'].status === 'loading' || p.files['app-ads.txt'].status === 'loading'
  );

  return (
    /* h-screen + overflow-hidden locks the outer shell so panels scroll independently */
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* ── HEADER (always visible, never scrolls) ── */}
      <header
        style={{ background: '#0c1220', height: '52px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}
        className="flex items-center px-4 sm:px-6 gap-0"
      >
        <div className="flex items-center gap-2.5">
          <img
            src={LOGO_SRC}
            alt="Growth"
            width={28}
            height={28}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(21,21,238,0.35))' }}
          />
          <span className="text-white font-medium" style={{ fontSize: '15px' }}>Growth</span>
          <span style={{
            background: '#1515EE', color: '#fff', fontSize: '9px', fontWeight: 700,
            padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            ads.txt
          </span>
        </div>
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
        <span className="text-slate-400 text-sm hidden sm:block">Authorized Digital Sellers Manager</span>
        <div className="flex-1" />
        {isLoading && (
          <div className="flex items-center gap-1.5 text-blue-400 mr-3">
            <img src={LOGO_SRC} alt="" width={16} height={16} style={{ animation: 'logoPulse 1.6s ease-in-out infinite', opacity: 0.8 }} />
            <span className="text-xs">Fetching…</span>
          </div>
        )}
      </header>

      {selectedPublisher ? (
        /* Detail view fills the remaining height; scroll is managed inside PublisherDetail */
        <div className="flex-1 overflow-hidden flex flex-col">
          <PublisherDetail
            publisher={selectedPublisher}
            selectedFileType={selectedFileType}
            onFileTypeChange={setSelectedFileType}
            onBack={() => setSelectedId(null)}
            onRefetch={(fileType) => handleRefetch(selectedPublisher.id, fileType)}
            onUpdateContent={(fileType, content) => handleUpdateContent(selectedPublisher.id, fileType, content)}
          />
        </div>
      ) : (
        <>
          {/* ── TABS (never scrolls) ── */}
          <div style={{ background: '#0c1220', flexShrink: 0 }} className="flex px-4 sm:px-6 pt-2.5">
            <button
              id="tab-btn-publishers"
              className="pb-3 text-sm font-semibold border-b-2 -mb-px border-blue-500 text-white"
            >
              Publishers
            </button>
          </div>
          <div style={{ height: '24px', background: 'linear-gradient(to bottom, #0c1220, #f8fafc)', flexShrink: 0 }} />

          {/* ── HOME CONTENT (scrollable) ── */}
          <main className="flex-1 overflow-y-auto relative bg-gray-50">
            {/* Floating logos */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
              {FLOAT_POSITIONS.map((f, i) => (
                <img
                  key={i}
                  src={LOGO_SRC}
                  alt=""
                  style={{
                    position: 'absolute',
                    left: `${f.x}%`,
                    top: `${f.y}%`,
                    width: f.sz,
                    height: f.sz,
                    objectFit: 'contain',
                    opacity: 0,
                    transform: `rotate(${f.rot}deg)`,
                    animation: `floatXLogo ${f.dur}s ${f.delay}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>

            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8 relative" style={{ zIndex: 1 }}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-slate-800 leading-tight font-mono text-lg">Publishers</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Manage ads.txt and app-ads.txt files for each publisher</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => importInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-xl transition-colors border border-gray-200 text-slate-500 hover:bg-gray-100 bg-white"
                    >
                      <Upload size={12} /> Import
                    </button>
                    <button
                      onClick={handleExport}
                      disabled={publishers.length === 0}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-xs rounded-xl transition-colors border bg-white ${
                        publishers.length === 0
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 text-slate-500 hover:bg-gray-100'
                      }`}
                    >
                      <Download size={12} /> Export
                    </button>
                    <button
                      id="btn-add-publisher"
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl transition-colors shrink-0"
                    >
                      <Plus size={12} /> Add Publisher
                    </button>
                  </div>
                </div>

                {publishers.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-8 text-center">
                    <p className="text-sm text-slate-500 mb-1">No publishers added yet</p>
                    <p className="text-xs text-slate-400 mb-5">
                      Click <strong>Add Publisher</strong> above to add and validate files.
                    </p>
                    <div className="space-y-1.5 text-left max-w-xs mx-auto">
                      {[
                        'Validate entries against IAB ads.txt specification',
                        'Manage both ads.txt and app-ads.txt in one place',
                        'Detect errors, warnings and duplicates with spec references',
                        'Download the corrected files',
                      ].map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-slate-400">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishers.map(p => (
                      <PublisherCard
                        key={p.id}
                        publisher={p}
                        onRemove={handleRemove}
                        onRefetch={handleRefetch}
                        onClick={() => {
                          setSelectedId(p.id);
                          const defaultFt = p.publisherType === 'app' ? 'app-ads.txt' : 'ads.txt';
                          setSelectedFileType(defaultFt);
                        }}
                      />
                    ))}
                    <button
                      id="btn-add-another-publisher"
                      onClick={() => setShowAddModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                    >
                      <Plus size={12} /> Add another publisher
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </>
      )}

      {showAddModal && (
        <AddPublisherModal
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
