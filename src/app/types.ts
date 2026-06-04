import type { ParseResult } from './utils/adsTxtParser';

export type FileType = 'ads.txt' | 'app-ads.txt';
export type PublisherType = 'website' | 'app' | 'both';

export interface FileData {
  content: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  parseResult: ParseResult | null;
}

export interface Publisher {
  id: string;
  name: string;
  url: string;
  publisherType: PublisherType;
  files: {
    'ads.txt': FileData;
    'app-ads.txt': FileData;
  };
  createdAt: string;
  updatedAt: string;
}
