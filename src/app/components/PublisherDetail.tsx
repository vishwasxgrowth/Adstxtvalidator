import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft, RefreshCw, ExternalLink, XCircle, AlertTriangle,
  Info, CheckCircle, ChevronDown, Plus, Sparkles,
  Hash, FileText, Copy, CheckCheck, Save, Download, Trash2,
} from 'lucide-react';
import { LOGO_SRC } from '../constants/logo';
import type { ParsedLine, ValidationIssue } from '../utils/adsTxtParser';
import { addEntriesUnderGroup, parseAdsTxt } from '../utils/adsTxtParser';



type FilterKey = 'errors' | 'warnings' | 'duplicates' | 'comments';

interface Props {
  publisher: Publisher;
  selectedFileType: FileType;
  onFileTypeChange: (fileType: FileType) => void;
  onBack: () => void;
  onRefetch: (fileType: FileType) => void;
  onUpdateContent: (fileType: FileType, content: string) => void;
}

function getLineIssues(lineNumber: number, issues: ValidationIssue[]) {
  return issues.filter(i => i.lineNumber === lineNumber);
}

function SeverityBadge({ issues }: { issues: ValidationIssue[] }) {
  const hasError = issues.some(i => i.severity === 'error');
  const hasWarning = issues.some(i => i.severity === 'warning');
  const hasDuplicate = issues.some(i => i.issueType === 'duplicate');

  if (hasError) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs shrink-0">
      <XCircle size={10} /> Error
    </span>
  );
  if (hasDuplicate) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs shrink-0">
      <AlertTriangle size={10} /> Duplicate
    </span>
  );
  if (hasWarning) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-xs shrink-0">
      <AlertTriangle size={10} /> Warning
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs shrink-0">
      <CheckCircle size={10} /> Valid
    </span>
  );
}

function EntryRow({ line, issues, isSelected = false, isSelectable = false, onToggleSelect }: { line: ParsedLine; issues: ValidationIssue[]; isSelected?: boolean; isSelectable?: boolean; onToggleSelect?: () => void }) {
  const [open, setOpen] = useState(false);
  const lineIssues = getLineIssues(line.lineNumber, issues);
  const hasIssues = lineIssues.some(i => i.severity === 'error' || i.severity === 'warning');
  const isHighSeverity = lineIssues.some(i => i.severity === 'error');
  const isDuplicate = lineIssues.some(i => i.issueType === 'duplicate');

  if (line.type === 'empty') {
    return <div className="h-3" />;
  }

  if (line.type === 'comment') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg mx-2 my-1">
        <Hash size={12} className="text-slate-400 shrink-0" />
        <span className="text-xs text-slate-300 font-mono">{line.raw.trim()}</span>
      </div>
    );
  }

  if (line.type === 'variable') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 mx-2 my-0.5 rounded-lg border border-purple-100 bg-purple-50">
        <span className="text-xs text-slate-400 w-8 text-right shrink-0">{line.lineNumber}</span>
        <span className="text-xs font-mono text-purple-700 flex-1">{line.raw.trim()}</span>
        <span className="text-xs text-purple-400 shrink-0">Variable</span>
      </div>
    );
  }

  if (line.type === 'invalid') {
    return (
      <div className="mx-2 my-0.5">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          <span className="text-xs text-slate-400 w-8 text-right shrink-0">{line.lineNumber}</span>
          <span className="text-xs font-mono text-red-700 flex-1 break-all">{line.raw || '(empty)'}</span>
          <XCircle size={13} className="text-red-400 shrink-0" />
        </div>
        {lineIssues.map((issue, idx) => (
          <IssueCard key={idx} issue={issue} />
        ))}
      </div>
    );
  }

  // Data entry
  const rowBg = isSelected
    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    : isHighSeverity
      ? 'bg-red-50 border-red-200 hover:bg-red-100'
      : isDuplicate
        ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
        : hasIssues
          ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          : 'bg-white border-gray-100 hover:bg-gray-50';

  return (
    <div className="mx-2 my-0.5">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${rowBg}`}
        onClick={() => lineIssues.length > 0 && setOpen(o => !o)}
      >
        {isSelectable && (
          <div
            className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
            }`}
            onClick={e => { e.stopPropagation(); onToggleSelect?.(); }}
          >
            {isSelected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        )}
        <span className="text-xs text-slate-300 w-8 text-right shrink-0 tabular-nums">{line.lineNumber}</span>

        {/* Entry fields */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {line.domain && (
            <span className="text-xs font-mono text-slate-700">{line.domain},</span>
          )}
          {line.publisherId && (
            <span className="text-xs font-mono text-blue-600">{line.publisherId},</span>
          )}
          {line.relationship && (
            <span className={`text-xs font-mono ${line.relationship === 'DIRECT' ? 'text-green-600' : 'text-purple-600'}`}>
              {line.relationship}
            </span>
          )}
          {line.certAuthId && (
            <span className="text-xs font-mono text-slate-400">, {line.certAuthId}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge issues={lineIssues} />
          {lineIssues.length > 0 && (
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {/* Issue cards */}
      {open && lineIssues.map((issue, idx) => (
        <IssueCard key={idx} issue={issue} />
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: ValidationIssue }) {
  const configs = {
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-100', label: 'Error' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', label: 'Warning' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-50 border-blue-100', label: 'Notice' },
  };
  const cfg = configs[issue.severity];
  const Icon = cfg.icon;

  return (
    <div className={`ml-12 mr-2 mt-1 px-3 py-2.5 rounded-lg border ${cfg.bg}`}>
      <div className="flex items-start gap-2">
        <Icon size={12} className={`${cfg.color} mt-0.5 shrink-0`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-700 leading-relaxed">{issue.message}</p>
          {issue.spec && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed border-l-2 border-slate-200 pl-2">
              {issue.spec}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PublisherDetail({ publisher, selectedFileType, onFileTypeChange, onBack, onRefetch, onUpdateContent }: Props) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newEntries, setNewEntries] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [showDupHighlight, setShowDupHighlight] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fileData = publisher.files[selectedFileType];
  const { status, parseResult, error, content } = fileData;

  // Determine which file type tabs to show based on publisher type
  const publisherType = publisher.publisherType ?? 'both';
  const availableFileTabs: FileType[] = publisherType === 'website'
    ? ['ads.txt']
    : publisherType === 'app'
      ? ['app-ads.txt']
      : ['ads.txt', 'app-ads.txt'];

  // Reset save state when a fresh refetch arrives (content changes from outside)
  const prevContentRef = useRef(content);
  useEffect(() => {
    if (content !== prevContentRef.current && status === 'success') {
      prevContentRef.current = content;
      setIsSaved(true);
      setIsDirty(false);
    }
  }, [content, status]);

  function toggleLineSelect(lineNumber: number) {
    setSelectedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineNumber)) next.delete(lineNumber);
      else next.add(lineNumber);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!parseResult) return;
    const selectableLines = parseResult.lines.filter(l => l.type === 'data' || l.type === 'invalid');
    if (selectedLines.size === selectableLines.length && selectableLines.length > 0) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(selectableLines.map(l => l.lineNumber)));
    }
  }

  function handleDeleteSelected() {
    if (!content || selectedLines.size === 0) return;
    const lines = content.split('\n');
    const updated = lines.filter((_, i) => !selectedLines.has(i + 1)).join('\n');
    onUpdateContent(selectedFileType, updated);
    setSelectedLines(new Set());
    setIsDirty(true);
    setIsSaved(false);
  }

  function toggleFilter(key: FilterKey) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleGroupSelect(group: string) {
    setSelectedGroup(group);
    if (group && groupRefs.current[group]) {
      groupRefs.current[group]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleApply() {
    if (!newEntries.trim() || !content) return;
    const updated = addEntriesUnderGroup(content, selectedGroup, newEntries);
    onUpdateContent(selectedFileType, updated);
    setNewEntries('');
    setIsDirty(true);
    setIsSaved(false);
    setApplySuccess(true);
    setTimeout(() => setApplySuccess(false), 3000);
  }

  function handleSave() {
    if (!content) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timestampLine = `# Last modified: ${dateStr}, ${timeStr}`;

    const lines = content.split('\n');

    // Replace existing timestamp if already at top, otherwise prepend with blank line gap
    if (lines[0].startsWith('# Last modified:') || lines[0].startsWith('# Changes made on:')) {
      lines[0] = timestampLine;
      // Ensure blank line after timestamp
      if (lines[1] !== '') lines.splice(1, 0, '');
    } else {
      // Add timestamp + 1 blank line at the very top
      lines.unshift(timestampLine, '');
    }

    const updatedContent = lines.join('\n');
    onUpdateContent(selectedFileType, updatedContent);
    setIsSaved(true);
    setIsDirty(false);
  }

  function handleDownload() {
    if (!isSaved || !content) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safeName = publisher.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    a.download = `${safeName}-${selectedFileType}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleCopyAll() {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const stats = parseResult?.stats;

  const filteredLines = useMemo(() => {
    if (!parseResult) return [];
    if (activeFilters.size === 0) return parseResult.lines;

    return parseResult.lines.filter(line => {
      const lineIssues = parseResult.issues.filter(i => i.lineNumber === line.lineNumber);
      if (activeFilters.has('errors') && lineIssues.some(i => i.severity === 'error')) return true;
      if (activeFilters.has('warnings') && lineIssues.some(i => i.severity === 'warning' && i.issueType !== 'duplicate')) return true;
      if (activeFilters.has('duplicates') && lineIssues.some(i => i.issueType === 'duplicate')) return true;
      if (activeFilters.has('comments') && line.type === 'comment') return true;
      return false;
    });
  }, [parseResult, activeFilters]);

  const entryAnalysis = useMemo(() => {
    if (!newEntries.trim() || !parseResult) return null;

    const existingKeys = new Set<string>();
    for (const line of parseResult.lines) {
      if (line.type === 'data' && line.domain && line.publisherId && line.relationship) {
        existingKeys.add(
          `${line.domain.toLowerCase()},${line.publisherId.toLowerCase()},${line.relationship.toUpperCase()}`
        );
      }
    }

    const parsed = parseAdsTxt(newEntries);
    const rawLines = newEntries.split('\n');

    const lineResults = rawLines.map((raw, idx) => {
      const lineNumber = idx + 1;
      const parsedLine = parsed.lines.find(l => l.lineNumber === lineNumber);
      const lineIssues = parsed.issues.filter(i => i.lineNumber === lineNumber);
      if (!parsedLine || parsedLine.type !== 'data') {
        return { raw, status: 'other' as const, hasError: false, hasWarning: false };
      }
      const key = `${(parsedLine.domain || '').toLowerCase()},${(parsedLine.publisherId || '').toLowerCase()},${(parsedLine.relationship || '').toUpperCase()}`;
      return {
        raw,
        status: existingKeys.has(key) ? 'duplicate' as const : 'new' as const,
        hasError: lineIssues.some(i => i.severity === 'error'),
        hasWarning: lineIssues.some(i => i.severity === 'warning'),
      };
    });

    return {
      lineResults,
      duplicateCount: lineResults.filter(l => l.status === 'duplicate').length,
      newCount: lineResults.filter(l => l.status === 'new').length,
      errorCount: lineResults.filter(l => l.hasError).length,
      warningCount: lineResults.filter(l => l.hasWarning && !l.hasError).length,
    };
  }, [newEntries, parseResult]);

  const FILTERS: { key: FilterKey; label: string; count: number; color: string; activeColor: string }[] = [
    {
      key: 'errors',
      label: 'Errors',
      count: stats?.errorCount ?? 0,
      color: 'border-gray-200 text-slate-600 hover:border-red-300',
      activeColor: 'border-red-400 bg-red-50 text-red-600',
    },
    {
      key: 'warnings',
      label: 'Warnings',
      count: stats?.warningCount ?? 0,
      color: 'border-gray-200 text-slate-600 hover:border-amber-300',
      activeColor: 'border-amber-400 bg-amber-50 text-amber-600',
    },
    {
      key: 'duplicates',
      label: 'Duplicates',
      count: stats?.duplicateCount ?? 0,
      color: 'border-gray-200 text-slate-600 hover:border-orange-300',
      activeColor: 'border-orange-400 bg-orange-50 text-orange-600',
    },
    {
      key: 'comments',
      label: 'Comments',
      count: stats?.commentCount ?? 0,
      color: 'border-gray-200 text-slate-600 hover:border-slate-400',
      activeColor: 'border-slate-500 bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0">
        <button
          id="detail-btn-back"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-800">{publisher.name}</span>
            {availableFileTabs.length > 1 && (
              <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
                {availableFileTabs.map(ft => (
                  <button
                    key={ft}
                    onClick={() => onFileTypeChange(ft)}
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
            )}
            {availableFileTabs.length === 1 && (
              <span className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wide ${
                availableFileTabs[0] === 'app-ads.txt' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {availableFileTabs[0]}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 ml-0 truncate block sm:inline">{publisher.url}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="detail-btn-copy-all"
            onClick={handleCopyAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
              copied ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-slate-500 hover:bg-gray-50'
            }`}
          >
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy all'}
          </button>

          {/* Save button */}
          <button
            id="detail-btn-save"
            onClick={handleSave}
            disabled={!content || (!isDirty && isSaved)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
              isSaved && !isDirty
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default'
                : isDirty
                  ? 'border-blue-400 bg-blue-600 text-white hover:bg-blue-700'
                  : 'border-gray-200 text-slate-400 cursor-default'
            }`}
            title={isDirty ? 'Save current changes' : isSaved ? 'Already saved' : 'No changes to save'}
          >
            <Save size={12} />
            {isSaved && !isDirty ? 'Saved' : 'Save'}
          </button>

          {/* Download button */}
          <button
            id="detail-btn-download"
            onClick={handleDownload}
            disabled={!isSaved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
              isSaved
                ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                : 'border-gray-200 text-slate-300 cursor-not-allowed bg-gray-50'
            }`}
            title={isSaved ? `Download ${selectedFileType}` : 'Save first before downloading'}
          >
            <Download size={12} />
            Download
          </button>

          {!publisher.url.startsWith('pasted://') && (
            <a
              id="detail-link-external"
              href={publisher.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            id="detail-btn-refresh"
            onClick={() => onRefetch(selectedFileType)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-slate-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-[30%] shrink-0 flex flex-col border-r border-gray-200 bg-slate-50">

          {/* Filter section */}
          <div className="p-4 border-b border-gray-200">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Filter Entries</p>
            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map(f => (
                <button
                  id={`detail-btn-filter-${f.key}`}
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${
                    activeFilters.has(f.key) ? f.activeColor : f.color
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="opacity-70">{f.count}</span>
                </button>
              ))}
            </div>
            {activeFilters.size > 0 && (
              <button
                id="detail-btn-clear-filters"
                onClick={() => setActiveFilters(new Set())}
                className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
              >
                Clear filters → show all
              </button>
            )}
          </div>

          {/* Add entries section */}
          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={12} className="text-blue-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wider">Add Entries</p>
            </div>

            <div className="flex flex-col flex-1 gap-3 min-h-0">
              {/* Group dropdown */}
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Insert under section</label>
                {(parseResult?.groups ?? []).length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg">
                    <Info size={12} className="text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-500">
                      No sections detected — new entries will be added at the end of the file.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <select
                        id="detail-select-group"
                        value={selectedGroup}
                        onChange={e => handleGroupSelect(e.target.value)}
                        className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                      >
                        <option value="">— End of file</option>
                        {(parseResult?.groups ?? []).map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedGroup
                        ? `Entries will be added under "${selectedGroup}"`
                        : 'Entries will be appended at the end'}
                    </p>
                  </>
                )}
              </div>

              {/* New entries textarea + live analysis */}
              <div className="flex flex-col flex-1 min-h-0">
                <label className="block text-xs text-slate-600 mb-1.5 shrink-0">Paste new entries</label>

                {showDupHighlight && entryAnalysis ? (
                  /* Highlight mode: read-only view with duplicate lines in red */
                  <div className="border border-red-200 rounded-lg overflow-hidden bg-white flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1">
                      {entryAnalysis.lineResults.map((line, i) => (
                        <div
                          key={i}
                          style={{
                            background: line.status === 'duplicate' ? '#fef2f2' : 'transparent',
                            padding: '2px 10px',
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            lineHeight: '1.7',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            borderBottom: i < entryAnalysis.lineResults.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                            minHeight: '20px',
                            color: line.status === 'duplicate' ? '#991b1b' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          {line.status === 'duplicate' && (
                            <span style={{ fontSize: '8px', fontWeight: 700, background: '#fecaca', color: '#991b1b', padding: '0 4px', borderRadius: '3px', flexShrink: 0 }}>DUP</span>
                          )}
                          <span style={{ opacity: line.raw.trim() ? 1 : 0.3 }}>{line.raw || '(empty line)'}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowDupHighlight(false)}
                      className="w-full text-xs text-slate-400 hover:text-slate-600 py-1.5 border-t border-gray-100 transition-colors text-center shrink-0"
                    >
                      ← Back to edit
                    </button>
                  </div>
                ) : (
                  <textarea
                    id="detail-textarea-new-entries"
                    value={newEntries}
                    onChange={e => { setNewEntries(e.target.value); setShowDupHighlight(false); }}
                    placeholder={'google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\nappnexus.com, 1234, RESELLER'}
                    className="flex-1 min-h-0 w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                  />
                )}

                {/* Live analysis: shown whenever there's content */}
                {entryAnalysis && newEntries.trim() && (
                  <div className="mt-2 space-y-1.5">
                    {/* New / Duplicate action buttons */}
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          const filtered = entryAnalysis.lineResults
                            .filter(l => l.status !== 'duplicate')
                            .map(l => l.raw)
                            .join('\n')
                            .trim();
                          setNewEntries(filtered);
                          setShowDupHighlight(false);
                        }}
                        title="Remove duplicates from box — keep only new entries"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          entryAnalysis.newCount > 0
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        New ({entryAnalysis.newCount})
                      </button>

                      <button
                        onClick={() => entryAnalysis.duplicateCount > 0 && setShowDupHighlight(d => !d)}
                        title="Highlight duplicate lines in red inside the box"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          entryAnalysis.duplicateCount > 0
                            ? showDupHighlight
                              ? 'bg-red-100 border-red-300 text-red-700'
                              : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        Duplicate ({entryAnalysis.duplicateCount})
                      </button>
                    </div>

                    {/* Error / Warning counts */}
                    {(entryAnalysis.errorCount > 0 || entryAnalysis.warningCount > 0) && (
                      <div className="flex gap-3 text-xs">
                        {entryAnalysis.errorCount > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle size={10} />
                            {entryAnalysis.errorCount} error{entryAnalysis.errorCount !== 1 ? 's' : ''} in pasted entries
                          </span>
                        )}
                        {entryAnalysis.warningCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle size={10} />
                            {entryAnalysis.warningCount} warning{entryAnalysis.warningCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Apply button */}
              <button
                id="detail-btn-apply-changes"
                onClick={handleApply}
                disabled={!newEntries.trim()}
                className={`w-full shrink-0 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm transition-all ${
                  newEntries.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus size={14} />
                Apply Changes
              </button>


              {applySuccess && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={13} className="text-green-500 shrink-0" />
                  <span className="text-xs text-green-700">Entries added and re-validated!</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div ref={rightPanelRef} className="flex-1 overflow-y-auto bg-gray-50 py-2">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2.5px] border-gray-200 border-t-blue-500 animate-spin" />
                <img src={LOGO_SRC} alt="" width={28} height={28} style={{ animation: 'logoPulse 1.6s ease-in-out infinite' }} />
              </div>
              <span className="text-sm text-slate-400">Fetching {selectedFileType}…</span>
            </div>
          )}

          {status === 'error' && (
            <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-red-700">Failed to fetch {selectedFileType}</p>
                  <p className="text-xs text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && parseResult && (
            <>
              {/* Multi-select toolbar */}
              <div className="mx-4 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {selectedLines.size === parseResult.lines.filter(l => l.type === 'data' || l.type === 'invalid').length && parseResult.lines.filter(l => l.type === 'data' || l.type === 'invalid').length > 0
                    ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-xs text-slate-400">
                  {selectedLines.size > 0 ? <><span className="font-medium text-slate-600">{selectedLines.size}</span> selected</> : 'Click rows to select'}
                </span>
                <div className="flex-1" />
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedLines.size === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    selectedLines.size > 0
                      ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                      : 'border border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={12} /> Delete selected
                </button>
              </div>

              {/* Filter status indicator */}
              {activeFilters.size > 0 && (
                <div className="mx-4 mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                  <Info size={12} className="text-blue-400 shrink-0" />
                  <span className="text-xs text-blue-600">
                    Showing {filteredLines.length} of {parseResult.lines.length} lines
                  </span>
                </div>
              )}

              {filteredLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <CheckCircle size={24} className="text-green-400 mb-2" />
                  <p className="text-sm text-slate-500">No lines match the active filters</p>
                </div>
              ) : (
                <div>
                  {filteredLines.map(line => {
                    const isGroupHeader = line.type === 'comment' && parseResult.groups?.includes(line.raw.trim());
                    const groupKey = line.raw.trim();
                    const isSelectable = line.type === 'data' || line.type === 'invalid';
                    const isSelected = selectedLines.has(line.lineNumber);
                    return (
                      <div
                        key={line.lineNumber}
                        ref={isGroupHeader ? (el) => { groupRefs.current[groupKey] = el; } : undefined}
                        className={isGroupHeader && selectedGroup === groupKey ? 'ring-2 ring-blue-400 ring-offset-1 rounded-lg mx-2 my-1' : ''}
                      >
                        <EntryRow
                          line={line}
                          issues={parseResult.issues}
                          isSelected={isSelected}
                          isSelectable={isSelectable}
                          onToggleSelect={isSelectable ? () => toggleLineSelect(line.lineNumber) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {status === 'idle' && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText size={24} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Content not yet loaded</p>
              <button onClick={() => onRefetch(selectedFileType)} className="mt-3 text-xs text-blue-500 hover:text-blue-600">
                Fetch now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
