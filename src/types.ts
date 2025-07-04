// API Request/Response Types
export interface CrawlRequest {
  targetUrl: string;
  projectName?: string;
}

export interface CrawlResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  localUrl?: string;
  message?: string;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  localUrl?: string;
  progress?: {
    filesDownloaded: number;
    totalFiles: number;
    currentUrl: string;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Asset Extraction Types
export interface BrandAssets {
  logos: LogoAsset[];
  colours: ColourPalette;
  fonts: FontAsset[];
  layout: LayoutStructure;
  metadata: SiteMetadata;
  extractedAt: Date;
}

export interface LogoAsset {
  type: 'header' | 'footer' | 'favicon' | 'other';
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  filename: string;
  localPath: string;
}

export interface ColourPalette {
  primary: string[];
  secondary: string[];
  background: string[];
  text: string[];
  accent: string[];
  all: string[];
}

export interface FontAsset {
  family: string;
  weight?: string;
  style?: string;
  source: 'google' | 'self-hosted' | 'system' | 'other';
  url?: string;
  filename?: string;
}

export interface LayoutStructure {
  header: HTMLElement | null;
  footer: HTMLElement | null;
  navigation: HTMLElement | null;
  mainContent: HTMLElement | null;
  sidebar?: HTMLElement | null;
}

export interface SiteMetadata {
  title: string;
  description?: string;
  keywords?: string[];
  viewport?: string;
  themeColor?: string;
}

export interface AssetExtractionRequest {
  jobId: string;
  targetUrl?: string;
}

export interface AssetExtractionResponse {
  jobId: string;
  status: 'extracting' | 'completed' | 'failed';
  assets?: BrandAssets;
  error?: string;
  message?: string;
}

// HTTrack Integration Types
export interface HTTrackOptions {
  depth?: number;
  maxFiles?: number;
  robots?: boolean;
  quiet?: boolean;
}

export interface HTTrackProgress {
  filesDownloaded: number;
  totalFiles: number;
  currentUrl: string;
  bytesDownloaded: number;
  speed: number; // KB/s
  estimatedTime: number; // seconds
}

// Error Types
export enum HTTrackError {
  NETWORK_TIMEOUT = 'network_timeout',
  INVALID_URL = 'invalid_url',
  ACCESS_DENIED = 'access_denied',
  DISK_FULL = 'disk_full',
  RATE_LIMITED = 'rate_limited',
  PROCESS_FAILED = 'process_failed'
}

export interface ApiError {
  error: string;
  message: string;
  jobId?: string;
  timestamp: Date;
} 