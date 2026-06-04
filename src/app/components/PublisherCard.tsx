import { Trash2, RefreshCw, ExternalLink, ChevronRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { Publisher, FileType } from '../types';

interface Props {
  publisher: Publisher;
  onRemove: (id: string) => void;
  onRefetch: (id: string, fileType: FileType) => void;
  onClick: (id: string) => void;
}

export function PublisherCard({ publisher, onRemove, onRefetch, onClick }: Props) {
  const publisherType = publisher.publisherType ?? 'both';
  const defaultFt: FileType = publisherType === 'app' ? 'app-ads.txt' : 'ads.txt';
  const [selectedFileType, setSelectedFileType] = useState<FileType>(defaultFt);
  const availableFileTabs: FileType[] = publisherType === 'website'
    ? ['ads.txt']
    : publisherType === 'app'
      ? ['app-ads.txt']
      : ['ads.txt', 'app-ads.txt'];
  const fileData = publisher.files[selectedFileType];
  const { status, parseResult, error } = fileData;
  const { name, url } = publisher;
  const stats = parseResult?.stats;

  const isHealthy = status === 'success' && stats && stats.errorCount === 0;
  const hasErrors = stats && stats.errorCount > 0;
  const hasWarnings = stats && stats.warningCount > 0;

  const statusDot = status === 'loading'
    ? 'bg-blue-400 animate-pulse'
    : status === 'error'
      ? 'bg-red-400'
      : hasErrors
        ? 'bg-red-400'
        : hasWarnings
          ? 'bg-amber-400'
          : status === 'success'
            ? 'bg-emerald-400'
            : 'bg-gray-300';

  return (
    <div
      onClick={() => onClick(publisher.id)}
      className="group relative bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer transition-all hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${statusDot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-slate-800 truncate">{name}</h3>
            {/* File type tabs */}
            <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
              {availableFileTabs.map(ft => (
                <button
                  key={ft}
                  onClick={(e) => { e.stopPropagation(); setSelectedFileType(ft); }}
                  className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wide transition-colors ${
                    selectedFileType === ft
                      ? ft === 'app-ads.txt'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-blue-100 text-blue-700'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-slate-400 hover:text-blue-500 transition-colors truncate block mt-0.5"
          >
            {url}
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {status !== 'loading' && (
            <button
              onClick={e => { e.stopPropagation(); onRefetch(publisher.id, selectedFileType); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-slate-600 transition-colors"
              title="Re-fetch"
            >
              <RefreshCw size={13} />
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-slate-600 transition-colors"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={e => { e.stopPropagation(); onRemove(publisher.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {status === 'loading' && (
        <div className="mt-3 flex items-center gap-2 text-blue-500">
          <RefreshCw size={12} className="animate-spin" />
          <span className="text-xs">Fetching {selectedFileType}…</span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-600 line-clamp-2">{error}</p>
        </div>
      )}

      {/* Stats row */}
      {status === 'success' && stats && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">{stats.totalEntries} entries</span>

          <div className="flex-1" />

          {hasErrors && (
            <div className="flex items-center gap-1.5 text-red-500">
              <XCircle size={16} />
              <span className="text-sm font-medium">{stats.errorCount} error{stats.errorCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {hasWarnings && (
            <div className="flex items-center gap-1.5 text-amber-500">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{stats.warningCount} warning{stats.warningCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {isHealthy && (
            <div className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Valid</span>
            </div>
          )}
        </div>
      )}

      {/* View details arrow */}
      <div className={`absolute right-5 bottom-5 transition-all opacity-0 group-hover:opacity-100 text-blue-400 ${status === 'success' ? '' : 'hidden'}`}>
        <ChevronRight size={16} />
      </div>
    </div>
  );
}
