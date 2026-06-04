import { useState } from 'react';
import { X, Link2, FileText, AlertCircle, Globe, Smartphone, Layers } from 'lucide-react';
import type { FileType, PublisherType } from '../types';

interface FileEntry {
  fileType: FileType;
  url: string;
  pastedContent: string;
  mode: 'url' | 'paste';
  urlError: string;
}

interface Props {
  onAdd: (name: string, publisherType: PublisherType, entries: { fileType: FileType; url: string; pastedContent?: string }[]) => void;
  onClose: () => void;
}

const PUBLISHER_TYPES: { id: PublisherType; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'website', label: 'Website', desc: 'ads.txt', icon: Globe },
  { id: 'app', label: 'App', desc: 'app-ads.txt', icon: Smartphone },
  { id: 'both', label: 'Both', desc: 'ads.txt + app-ads.txt', icon: Layers },
];

function FileSection({
  fileType,
  entry,
  onChange,
}: {
  fileType: FileType;
  entry: FileEntry;
  onChange: (patch: Partial<FileEntry>) => void;
}) {
  const label = fileType === 'ads.txt' ? 'ads.txt' : 'app-ads.txt';
  const accentClass = fileType === 'app-ads.txt' ? 'text-violet-700 bg-violet-100' : 'text-blue-700 bg-blue-100';

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-slate-50">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${accentClass}`}>{label}</span>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 p-0.5 bg-white gap-0.5">
        {[
          { id: 'url' as const, icon: Link2, label: 'Fetch from URL' },
          { id: 'paste' as const, icon: FileText, label: 'Paste Content' },
        ].map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ mode: opt.id, urlError: '' })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${
                entry.mode === opt.id
                  ? 'bg-slate-100 shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={11} /> {opt.label}
            </button>
          );
        })}
      </div>

      {entry.mode === 'url' ? (
        <div>
          <label className="block text-xs text-slate-600 mb-1 uppercase tracking-wider">{label} URL</label>
          <input
            type="url"
            value={entry.url}
            onChange={e => onChange({ url: e.target.value, urlError: '' })}
            placeholder={`https://example.com/${label}`}
            className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
              entry.urlError ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          {entry.urlError ? (
            <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
              <AlertCircle size={11} /> {entry.urlError}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Point directly to the file, e.g.{' '}
              <span className="font-mono bg-slate-100 px-1 rounded">https://yoursite.com/{label}</span>
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs text-slate-600 mb-1 uppercase tracking-wider">Paste {label} Content</label>
          <textarea
            value={entry.pastedContent}
            onChange={e => onChange({ pastedContent: e.target.value })}
            placeholder={'# Google\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n\n# AppNexus\nappnexus.com, 1234, RESELLER'}
            rows={6}
            className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
          />
        </div>
      )}
    </div>
  );
}

function makeEntry(fileType: FileType): FileEntry {
  return { fileType, url: '', pastedContent: '', mode: 'url', urlError: '' };
}

function validateUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AddPublisherModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [publisherType, setPublisherType] = useState<PublisherType>('website');
  const [adsEntry, setAdsEntry] = useState<FileEntry>(makeEntry('ads.txt'));
  const [appEntry, setAppEntry] = useState<FileEntry>(makeEntry('app-ads.txt'));

  const showAds = publisherType === 'website' || publisherType === 'both';
  const showApp = publisherType === 'app' || publisherType === 'both';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const entries: { fileType: FileType; url: string; pastedContent?: string }[] = [];
    let hasError = false;

    if (showAds) {
      if (adsEntry.mode === 'url') {
        if (!validateUrl(adsEntry.url.trim())) {
          setAdsEntry(prev => ({ ...prev, urlError: 'Please enter a valid URL starting with http:// or https://' }));
          hasError = true;
        } else {
          entries.push({ fileType: 'ads.txt', url: adsEntry.url.trim() });
        }
      } else {
        if (!adsEntry.pastedContent.trim()) return;
        const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
        entries.push({ fileType: 'ads.txt', url: `pasted://${slug}`, pastedContent: adsEntry.pastedContent.trim() });
      }
    }

    if (showApp) {
      if (appEntry.mode === 'url') {
        if (!validateUrl(appEntry.url.trim())) {
          setAppEntry(prev => ({ ...prev, urlError: 'Please enter a valid URL starting with http:// or https://' }));
          hasError = true;
        } else {
          entries.push({ fileType: 'app-ads.txt', url: appEntry.url.trim() });
        }
      } else {
        if (!appEntry.pastedContent.trim()) return;
        const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
        entries.push({ fileType: 'app-ads.txt', url: `pasted://${slug}`, pastedContent: appEntry.pastedContent.trim() });
      }
    }

    if (hasError || entries.length === 0) return;

    onAdd(name.trim(), publisherType, entries);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-slate-900 mb-3">Add Publisher</h2>
            {/* Publisher type selector */}
            <div className="flex gap-2">
              {PUBLISHER_TYPES.map(pt => {
                const Icon = pt.icon;
                const isSelected = publisherType === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setPublisherType(pt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 text-slate-500 hover:border-gray-300 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="font-medium">{pt.label}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>({pt.desc})</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            id="modal-btn-close"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-4 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Publisher name */}
          <div>
            <label className="block text-xs text-slate-600 mb-1.5 uppercase tracking-wider">Publisher Name</label>
            <input
              id="modal-input-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., My News Site, My Mobile App"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
              required
              autoFocus
            />
          </div>

          {showAds && (
            <FileSection
              fileType="ads.txt"
              entry={adsEntry}
              onChange={patch => setAdsEntry(prev => ({ ...prev, ...patch }))}
            />
          )}

          {showApp && (
            <FileSection
              fileType="app-ads.txt"
              entry={appEntry}
              onChange={patch => setAppEntry(prev => ({ ...prev, ...patch }))}
            />
          )}

          <div className="flex gap-2 pt-1">
            <button
              id="modal-btn-cancel"
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              id="modal-btn-submit"
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-md shadow-blue-500/20"
            >
              Fetch & Validate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
