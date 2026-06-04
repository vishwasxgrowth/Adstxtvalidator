import { useState } from 'react';
import { Copy, Download, CheckCheck, FileText, Info } from 'lucide-react';
import type { Publisher, FileType } from '../types';
import { mergePublisherEntries } from '../utils/adsTxtParser';

interface Props {
  publishers: Publisher[];
}

export function MergedOutput({ publishers: pubs }: Props) {
  const [copied, setCopied] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<FileType>('ads.txt');

  const fileTypes: FileType[] = ['ads.txt', 'app-ads.txt'];

  const readyPublishers = (fileType: FileType) =>
    pubs
      .filter(p => p.files[fileType].status === 'success' && p.files[fileType].parseResult)
      .map(p => ({ ...p, parseResult: p.files[fileType].parseResult }));

  const ready = readyPublishers(selectedFileType);
  const merged = mergePublisherEntries(ready.map(p => p.parseResult!));
  const lineCount = merged ? merged.split('\n').filter(Boolean).length : 0;

  const header = [
    `# Merged ${selectedFileType} — generated ${new Date().toISOString().split('T')[0]}`,
    `# Publishers: ${ready.map(p => p.name).join(', ')}`,
    `# Total unique entries: ${lineCount}`,
    '',
  ].join('\n');

  const fullOutput = merged ? header + merged : '';

  function handleCopy() {
    navigator.clipboard.writeText(fullOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([fullOutput], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = selectedFileType;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const totalReady = pubs.filter(
    p =>
      (p.files['ads.txt'].status === 'success' && p.files['ads.txt'].parseResult) ||
      (p.files['app-ads.txt'].status === 'success' && p.files['app-ads.txt'].parseResult)
  ).length;

  if (totalReady === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <FileText size={24} className="text-gray-400" />
        </div>
        <h3 className="text-gray-700 mb-1">No validated publishers yet</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Add publishers and fetch their files. Once fetched, their entries will be merged and deduplicated here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* File type selector */}
      <div className="flex gap-1 bg-slate-50 p-1 rounded-lg w-fit">
        {fileTypes.map(ft => (
          <button
            key={ft}
            onClick={() => setSelectedFileType(ft)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium uppercase tracking-wide transition-colors ${
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

      {ready.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <FileText size={20} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No validated publishers for {selectedFileType} yet</p>
        </div>
      ) : (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>
              Merged <strong>{lineCount} unique entries</strong> from {ready.length} publisher{ready.length !== 1 ? 's' : ''}. Duplicates have been removed automatically.
            </p>
          </div>

          {/* Publisher source summary */}
          <div className="flex flex-wrap gap-2">
            {ready.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span>{p.name}</span>
                <span className="text-gray-400">({p.parseResult!.stats.totalEntries})</span>
              </div>
            ))}
          </div>

          {/* Output area */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-gray-400" />
                <span className="text-xs text-gray-600">{selectedFileType} — {lineCount} entries</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Download size={12} /> Download {selectedFileType}
                </button>
              </div>
            </div>
            <pre className="text-xs font-mono p-4 overflow-x-auto max-h-[500px] overflow-y-auto text-gray-700 whitespace-pre-wrap leading-relaxed">
              {fullOutput}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
