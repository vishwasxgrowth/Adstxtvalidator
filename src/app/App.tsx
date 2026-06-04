import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, FileText, CheckCircle } from 'lucide-react';
import { AddPublisherModal } from './components/AddPublisherModal';
import { PublisherCard } from './components/PublisherCard';
import { PublisherDetail } from './components/PublisherDetail';
import { parseAdsTxt } from './utils/adsTxtParser';
import { loadPublishers, savePublishers, fetchAdsTxtViaProxy } from './utils/api';
import type { Publisher, FileType, PublisherType } from './types';

let nextId = Date.now();

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

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    savePublishers(publishers);
  }, [publishers]);

  const updatePublisher = useCallback((id: string, fileType: FileType, patch: Partial<any>) => {
    setPublishers(prev => prev.map(p =>
      p.id === id
        ? { ...p, files: { ...p.files, [fileType]: { ...p.files[fileType], ...patch } } }
        : p
    ));
  }, []);

  async function doFetch(publisher: Publisher, fileType: FileType, content?: string) {
    updatePublisher(publisher.id, fileType, { status: 'loading', error: null });
    try {
      const text = content ?? await fetchAdsTxtViaProxy(publisher.url);
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
      id,
      name,
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
      if (!entry.pastedContent && entry.url && !entry.url.startsWith('pasted://')) {
        pub.url = entry.url;
      }
    }

    setPublishers(prev => [...prev, pub]);

    for (const entry of entries) {
      if (!entry.pastedContent) doFetch(pub, entry.fileType);
    }

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

  const selectedPublisher = publishers.find(p => p.id === selectedId) ?? null;
  const isLoading = publishers.some(p => p.files['ads.txt'].status === 'loading' || p.files['app-ads.txt'].status === 'loading');

  if (selectedPublisher) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <PublisherDetail
          publisher={selectedPublisher}
          selectedFileType={selectedFileType}
          onFileTypeChange={setSelectedFileType}
          onBack={() => setSelectedId(null)}
          onRefetch={(fileType) => handleRefetch(selectedPublisher.id, fileType)}
          onUpdateContent={(fileType, content) => handleUpdateContent(selectedPublisher.id, fileType, content)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 px-4 sm:px-6 pt-8 pb-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FileText size={17} className="text-white" />
              </div>
              <div>
                <h1 id="app-main-heading" className="text-white text-sm leading-none font-medium">ads.txt Manager</h1>
                <p className="text-slate-400 text-xs mt-0.5">Authorized Digital Sellers</p>
              </div>
            </div>
            {isLoading && (
              <div className="flex items-center gap-1.5 text-sm text-blue-400">
                <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                Fetching…
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 text-sm border-b border-slate-700/50 mb-0">
            <button
              id="tab-btn-publishers"
              className="pb-3 font-medium transition-colors border-b-2 -mb-[2px] border-blue-500 text-white font-semibold"
            >
              Publishers
            </button>
          </div>

          <div className="h-6 -mx-4 sm:-mx-6 bg-gradient-to-b from-slate-800 to-gray-50" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8">
        <div>
          {/* Publishers section header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-slate-800 leading-tight font-mono text-lg">Publishers</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage ads.txt and app-ads.txt files for each publisher</p>
            </div>
            <button
              id="btn-add-publisher"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl transition-colors shrink-0"
            >
              <Plus size={12} /> Add Publisher
            </button>
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
      </main>

      {showAddModal && (
        <AddPublisherModal
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

