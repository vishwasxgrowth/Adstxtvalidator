import { XCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { Publisher } from '../types';

interface Props {
  publishers: Publisher[];
}

export function ValidationSummary({ publishers }: Props) {
  const fileTypes = ['ads.txt', 'app-ads.txt'] as const;

  const ready = publishers.flatMap(p =>
    fileTypes
      .filter(ft => p.files[ft].status === 'success' && p.files[ft].parseResult)
      .map(ft => ({ publisher: p, fileType: ft, data: p.files[ft] }))
  );

  const totals = ready.reduce(
    (acc, item) => {
      const s = item.data.parseResult!.stats;
      return {
        entries: acc.entries + s.totalEntries,
        direct: acc.direct + s.directEntries,
        reseller: acc.reseller + s.resellerEntries,
        errors: acc.errors + s.errorCount,
        warnings: acc.warnings + s.warningCount,
        duplicates: acc.duplicates + s.duplicateCount,
      };
    },
    { entries: 0, direct: 0, reseller: 0, errors: 0, warnings: 0, duplicates: 0 }
  );

  if (ready.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <CheckCircle size={24} className="text-gray-400" />
        </div>
        <h3 className="text-gray-700 mb-1">No validation results yet</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Add publishers on the Publishers tab and fetch their files to see detailed validation results here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Entries', value: totals.entries, color: 'bg-gray-50 border-gray-200', text: 'text-gray-800' },
          { label: 'DIRECT', value: totals.direct, color: 'bg-green-50 border-green-100', text: 'text-green-700' },
          { label: 'RESELLER', value: totals.reseller, color: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          { label: 'Errors', value: totals.errors, color: 'bg-red-50 border-red-100', text: 'text-red-600' },
          { label: 'Warnings', value: totals.warnings, color: 'bg-amber-50 border-amber-100', text: 'text-amber-600' },
          { label: 'Duplicates', value: totals.duplicates, color: 'bg-orange-50 border-orange-100', text: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border p-3 ${stat.color}`}>
            <p className={`text-xl ${stat.text}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Per publisher & file type breakdown */}
      <div className="space-y-3">
        {ready.map((item) => {
          const { publisher: p, fileType, data } = item;
          const s = data.parseResult!.stats;
          const issues = data.parseResult!.issues;
          const errorIssues = issues.filter(i => i.severity === 'error');
          const warningIssues = issues.filter(i => i.severity === 'warning');
          const infoIssues = issues.filter(i => i.severity === 'info');

          return (
            <div key={`${p.id}-${fileType}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Publisher header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.errorCount > 0 ? 'bg-red-400' : s.warningCount > 0 ? 'bg-amber-400' : 'bg-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-800">{p.name}</span>
                    <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${
                      fileType === 'app-ads.txt'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {fileType}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 ml-0">{s.totalEntries} entries</span>
                </div>
                {s.errorCount === 0 && s.warningCount === 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle size={11} /> Valid
                  </span>
                )}
              </div>

              {/* Issue lists */}
              <div className="p-4 space-y-3">
                {errorIssues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <XCircle size={12} className="text-red-500" />
                      <span className="text-xs text-red-600">{errorIssues.length} Error{errorIssues.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1">
                      {errorIssues.map((issue, idx) => (
                        <div key={idx} className="flex gap-2 items-start px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                          <span className="text-xs text-red-400 shrink-0">L{issue.lineNumber}</span>
                          <span className="text-xs text-red-700">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {warningIssues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span className="text-xs text-amber-600">{warningIssues.length} Warning{warningIssues.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1">
                      {warningIssues.map((issue, idx) => (
                        <div key={idx} className="flex gap-2 items-start px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                          <span className="text-xs text-amber-400 shrink-0">L{issue.lineNumber}</span>
                          <span className="text-xs text-amber-700">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {infoIssues.length > 0 && (
                  <details className="group">
                    <summary className="flex items-center gap-1.5 cursor-pointer list-none">
                      <Info size={12} className="text-blue-400" />
                      <span className="text-xs text-blue-500">{infoIssues.length} Info notice{infoIssues.length !== 1 ? 's' : ''}</span>
                    </summary>
                    <div className="space-y-1 mt-1.5">
                      {infoIssues.slice(0, 5).map((issue, idx) => (
                        <div key={idx} className="flex gap-2 items-start px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <span className="text-xs text-blue-400 shrink-0">L{issue.lineNumber}</span>
                          <span className="text-xs text-blue-700">{issue.message}</span>
                        </div>
                      ))}
                      {infoIssues.length > 5 && (
                        <p className="text-xs text-gray-400 pl-3">…and {infoIssues.length - 5} more</p>
                      )}
                    </div>
                  </details>
                )}

                {errorIssues.length === 0 && warningIssues.length === 0 && infoIssues.length === 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={13} />
                    <span className="text-xs">Perfectly valid! No issues found.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
