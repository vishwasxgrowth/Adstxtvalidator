export type LineType = 'data' | 'comment' | 'variable' | 'empty' | 'invalid';
export type Severity = 'error' | 'warning' | 'info';
export type IssueType = 'format' | 'domain' | 'relationship' | 'duplicate' | 'cert_id' | 'case' | 'empty_field';

export interface ParsedLine {
  lineNumber: number;
  raw: string;
  type: LineType;
  group?: string; // Nearest preceding comment/section header
  domain?: string;
  publisherId?: string;
  relationship?: string;
  certAuthId?: string;
  variableName?: string;
  variableValue?: string;
}

export interface ValidationIssue {
  lineNumber: number;
  severity: Severity;
  issueType: IssueType;
  message: string;
  spec?: string; // IAB spec reference
}

export interface ParseStats {
  totalEntries: number;
  directEntries: number;
  resellerEntries: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  duplicateCount: number;
  commentCount: number;
  variableCount: number;
}

export interface ParseResult {
  lines: ParsedLine[];
  issues: ValidationIssue[];
  stats: ParseStats;
  groups: string[]; // All detected section/group headers (comment lines)
}

const VALID_RELATIONSHIPS = new Set(['DIRECT', 'RESELLER']);
const VARIABLE_PREFIXES = [
  'contact', 'subdomain', 'inventorypartnerdomain',
  'ownerdomain', 'managerdomain', 'ext-',
];

function isValidDomain(d: string): boolean {
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(d);
}

function isSectionHeader(commentLine: string): boolean {
  const content = commentLine.replace(/^#+\s*/, '').trim();
  // A section header is a short comment without URLs or emails
  return content.length > 0 && content.length < 80 && !content.includes('@') && !content.includes('http');
}

export function parseAdsTxt(content: string): ParseResult {
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: ParsedLine[] = [];
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>(); // key → first line number
  const groupsSet = new Set<string>();

  let currentGroup: string | undefined;
  let directEntries = 0, resellerEntries = 0;
  let errorCount = 0, warningCount = 0, infoCount = 0;
  let duplicateCount = 0, commentCount = 0, variableCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const raw = rawLines[i];
    const trimmed = raw.trim();

    if (trimmed === '') {
      lines.push({ lineNumber, raw, type: 'empty', group: currentGroup });
      continue;
    }

    if (trimmed.startsWith('#')) {
      if (isSectionHeader(trimmed)) {
        currentGroup = trimmed;
        groupsSet.add(trimmed);
      }
      lines.push({ lineNumber, raw, type: 'comment', group: currentGroup });
      commentCount++;
      continue;
    }

    // Variable declarations
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const potentialVar = trimmed.substring(0, eqIdx).toLowerCase().trim();
      if (VARIABLE_PREFIXES.some(p => potentialVar.startsWith(p))) {
        lines.push({
          lineNumber, raw, type: 'variable', group: currentGroup,
          variableName: potentialVar,
          variableValue: trimmed.substring(eqIdx + 1).trim(),
        });
        variableCount++;
        continue;
      }
    }

    // Data entry — strip inline comment first
    const withoutComment = trimmed.split('#')[0].trim();
    const parts = withoutComment.split(',').map(p => p.trim());
    const fieldCount = parts.filter(Boolean).length;

    if (fieldCount < 3 || !parts[0] || !parts[1] || !parts[2]) {
      lines.push({ lineNumber, raw, type: 'invalid', group: currentGroup });
      issues.push({
        lineNumber, severity: 'error', issueType: 'format',
        message: `Invalid format: found ${fieldCount} field${fieldCount !== 1 ? 's' : ''} but ads.txt requires minimum 3 comma-separated fields.`,
        spec: 'IAB ads.txt Spec §3.1 — Required fields: <domain>, <publisher_account_id>, <relationship_type>[, <certification_authority_id>]',
      });
      errorCount++;
      continue;
    }

    const [domain, publisherId, relationshipRaw, certAuthId] = parts;
    const relationship = relationshipRaw.toUpperCase();

    lines.push({
      lineNumber, raw, type: 'data', group: currentGroup,
      domain, publisherId, relationship,
      certAuthId: certAuthId || undefined,
    });

    // Validate domain (Field 1)
    if (!domain) {
      issues.push({
        lineNumber, severity: 'error', issueType: 'empty_field',
        message: 'Field 1 (Domain) is empty. It must contain the domain name of the advertising system.',
        spec: 'IAB ads.txt Spec §3.1 Field 1: The canonical domain name of the SSP, Exchange, Header Wrapper, etc.',
      });
      errorCount++;
    } else if (!isValidDomain(domain)) {
      issues.push({
        lineNumber, severity: 'error', issueType: 'domain',
        message: `"${domain}" is not a valid hostname. Domain names must follow RFC 1034 format (e.g., "google.com", "appnexus.com").`,
        spec: 'IAB ads.txt Spec §3.1 Field 1 & RFC 1034 — Domain must consist of alphanumeric characters and hyphens, separated by dots.',
      });
      errorCount++;
    }

    // Validate publisher ID (Field 2)
    if (!publisherId) {
      issues.push({
        lineNumber, severity: 'error', issueType: 'empty_field',
        message: 'Field 2 (Publisher Account ID) is empty. It must contain the account identifier assigned by the advertising system.',
        spec: 'IAB ads.txt Spec §3.1 Field 2: The publisher\'s account ID as assigned by the advertising system.',
      });
      errorCount++;
    }

    // Validate relationship (Field 3)
    if (!VALID_RELATIONSHIPS.has(relationship)) {
      issues.push({
        lineNumber, severity: 'error', issueType: 'relationship',
        message: `"${relationshipRaw}" is not a valid relationship type. Only DIRECT or RESELLER are permitted.`,
        spec: 'IAB ads.txt Spec §3.1 Field 3 — DIRECT means the publisher directly controls the account. RESELLER means a third party has been authorized to sell inventory through that account.',
      });
      errorCount++;
    } else {
      if (relationshipRaw !== relationship) {
        issues.push({
          lineNumber, severity: 'warning', issueType: 'case',
          message: `Relationship type "${relationshipRaw}" should be uppercase. Use "${relationship}" instead.`,
          spec: 'IAB ads.txt Spec §3.1 — While technically case-insensitive, uppercase is the canonical and widely accepted form.',
        });
        warningCount++;
      }
      if (relationship === 'DIRECT') directEntries++;
      else resellerEntries++;
    }

    // Optional cert authority ID (Field 4)
    if (!certAuthId) {
      issues.push({
        lineNumber, severity: 'info', issueType: 'cert_id',
        message: 'Missing optional Certification Authority ID (TAG-ID). This field improves supply chain transparency.',
        spec: 'IAB ads.txt Spec §3.1 Field 4 (Optional) — A TAG-ID from the Trustworthy Accountability Group that uniquely identifies the seller in a sellers.json file. Helps buyers verify legitimacy.',
      });
      infoCount++;
    }

    // Duplicate check
    if (domain && publisherId && VALID_RELATIONSHIPS.has(relationship)) {
      const key = `${domain.toLowerCase()},${publisherId.toLowerCase()},${relationship}`;
      if (seen.has(key)) {
        const firstLine = seen.get(key)!;
        issues.push({
          lineNumber, severity: 'warning', issueType: 'duplicate',
          message: `Duplicate of line ${firstLine}. The same (domain, publisher_id, relationship) combination already exists.`,
          spec: `IAB Best Practice — Duplicate entries do not grant additional permissions and inflate file size. The first occurrence on line ${firstLine} should be kept and this one removed.`,
        });
        warningCount++;
        duplicateCount++;
      } else {
        seen.set(key, lineNumber);
      }
    }
  }

  return {
    lines,
    issues,
    groups: Array.from(groupsSet),
    stats: {
      totalEntries: lines.filter(l => l.type === 'data').length,
      directEntries,
      resellerEntries,
      errorCount,
      warningCount,
      infoCount,
      duplicateCount,
      commentCount,
      variableCount,
    },
  };
}

export function addEntriesUnderGroup(content: string, targetGroup: string, newEntries: string): string {
  const lines = content.split('\n');
  const newEntryLines = newEntries.trim().split('\n').filter(l => l.trim());

  if (!targetGroup) {
    return content.trimEnd() + '\n' + newEntryLines.join('\n') + '\n';
  }

  const groupIdx = lines.findIndex(l => l.trim() === targetGroup.trim());
  if (groupIdx === -1) {
    return content.trimEnd() + '\n' + targetGroup + '\n' + newEntryLines.join('\n') + '\n';
  }

  // Find insertion point: before next section header (comment line starting with #)
  let insertIdx = lines.length;
  for (let i = groupIdx + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('#') && isSectionHeader(lines[i].trim())) {
      // Walk back past blank lines
      insertIdx = i;
      while (insertIdx > groupIdx + 1 && lines[insertIdx - 1].trim() === '') {
        insertIdx--;
      }
      break;
    }
  }

  lines.splice(insertIdx, 0, ...newEntryLines);
  return lines.join('\n');
}

export async function fetchAdsTxtContent(url: string): Promise<string> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) return resp.text();
  } catch {
    // try proxy
  }
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error(`Server returned ${resp.status}. Verify the URL is correct and publicly accessible.`);
  return resp.text();
}

export function mergePublisherEntries(results: (ParseResult | null)[]): string {
  const dataEntries = new Map<string, ParsedLine>();
  const variables = new Map<string, ParsedLine>();

  for (const result of results) {
    if (!result) continue;
    for (const line of result.lines) {
      if (line.type === 'data' && line.domain && line.publisherId && line.relationship) {
        const key = `${line.domain.toLowerCase()},${line.publisherId.toLowerCase()},${line.relationship.toUpperCase()}`;
        const existing = dataEntries.get(key);
        // Prefer keeping the one that has certAuthId if available
        if (!existing || (!existing.certAuthId && line.certAuthId)) {
          dataEntries.set(key, line);
        }
      } else if (line.type === 'variable' && line.variableName && line.variableValue) {
        const key = `${line.variableName.toLowerCase()}=${line.variableValue.trim()}`;
        if (!variables.has(key)) {
          variables.set(key, line);
        }
      }
    }
  }

  const lines: string[] = [];

  // Add variables first
  if (variables.size > 0) {
    lines.push('# Variables');
    for (const [_, v] of variables) {
      lines.push(`${v.variableName}=${v.variableValue}`);
    }
    lines.push('');
  }

  // Add data entries
  if (dataEntries.size > 0) {
    lines.push('# Authorized Sellers');
    for (const [_, d] of dataEntries) {
      const certPart = d.certAuthId ? `, ${d.certAuthId}` : '';
      lines.push(`${d.domain}, ${d.publisherId}, ${d.relationship}${certPart}`);
    }
  }

  return lines.join('\n');
}

