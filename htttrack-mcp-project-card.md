# HTTrack-MCP Server Project Card
## Technical Implementation & Development Roadmap

---

## 📋 **Project Overview**

**Project Name:** HTTrack-MCP Server  
**Purpose:** REST API wrapper around HTTrack for automated website crawling and brand asset extraction  
**Tech Stack:** Node.js/TypeScript, HTTrack CLI, SQLite  
**Target Platform:** Windows (primary), cross-platform compatibility  

---

## 🏗️ **Technical Architecture**

### Core Components
```
htttrack-mcp/
├── src/
│   ├── api/           # REST API endpoints
│   ├── jobs/          # Job queue management
│   ├── httrack/       # HTTrack CLI integration
│   ├── extractors/    # Brand asset extraction logic
│   └── utils/         # Shared utilities
├── tests/             # Unit and integration tests
├── docs/              # API documentation
└── scripts/           # Build and deployment scripts
```

### API Design
```typescript
// POST /api/crawl
interface CrawlRequest {
  targetUrl: string;
  options?: {
    depth?: number;           // Crawl depth (default: 2)
    maxFiles?: number;        // Max files to download
    filters?: string[];       // URL filters
    userAgent?: string;       // Custom user agent
  };
}

// Response
interface CrawlResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  estimatedTime?: number;     // Minutes
}

// GET /api/result/{jobId}
interface BrandAssets {
  colours: {
    primary: string[];        // Hex codes
    secondary: string[];
    accent: string[];
  };
  fonts: {
    headings: string[];
    body: string[];
    monospace: string[];
  };
  logos: {
    primary?: string;         // File path
    favicon?: string;
    social?: string[];
  };
  layout: {
    maxWidth?: number;
    containerType?: 'fluid' | 'fixed';
    gridSystem?: string;
  };
  metadata: {
    crawlTime: number;        // Seconds
    filesDownloaded: number;
    totalSize: number;        // Bytes
  };
}
```

---

## 🔧 **HTTrack Integration Strategy**

### CLI Command Structure
Based on analysis of `../httrack1/man/httrack.1`, key parameters for automation:

```bash
# Core crawling command
httrack {url} \
  --mirror \
  --path {output_dir} \
  --depth {depth} \
  --max-files {max_files} \
  --robots=0 \
  --quiet \
  --file-log {log_file} \
  --single-log
```

### Progress Tracking
Leverage HTTrack's callback system from `../httrack1/src/httrack.c`:

```typescript
interface HTTrackProgress {
  filesDownloaded: number;
  totalFiles: number;
  currentUrl: string;
  bytesDownloaded: number;
  speed: number;              // KB/s
  estimatedTime: number;      // Seconds
}
```

### Error Handling
```typescript
enum HTTrackError {
  NETWORK_TIMEOUT = 'network_timeout',
  INVALID_URL = 'invalid_url',
  ACCESS_DENIED = 'access_denied',
  DISK_FULL = 'disk_full',
  RATE_LIMITED = 'rate_limited'
}
```

---

## 🎯 **Development Phases**

### Phase 1: Foundation (Week 1-2)
**Deliverables:**
- [ ] Node.js/TypeScript project setup with Express
- [ ] Basic REST API endpoints (`POST /crawl`, `GET /result/{jobId}`)
- [ ] HTTrack CLI integration via child processes
- [ ] Job queue with SQLite persistence
- [ ] Basic error handling and logging

**Technical Tasks:**
```typescript
// Core job management
class JobManager {
  async createJob(targetUrl: string, options?: CrawlOptions): Promise<string>
  async getJobStatus(jobId: string): Promise<JobStatus>
  async getJobResult(jobId: string): Promise<BrandAssets>
  async cancelJob(jobId: string): Promise<void>
}

// HTTrack wrapper
class HTTrackWrapper {
  async startCrawl(jobId: string, targetUrl: string, options: CrawlOptions): Promise<void>
  async getProgress(jobId: string): Promise<HTTrackProgress>
  async stopCrawl(jobId: string): Promise<void>
}
```

### Phase 2: Asset Extraction Engine (Week 3-4)
**Deliverables:**
- [ ] CSS colour palette extraction
- [ ] Font family detection from CSS/HTML
- [ ] Logo and image identification
- [ ] Layout structure analysis
- [ ] Unit tests for extraction logic

**Extraction Modules:**
```typescript
// Colour extraction
class ColourExtractor {
  extractFromCSS(cssContent: string): ColourPalette
  extractFromHTML(htmlContent: string): ColourPalette
  analyseColourUsage(htmlContent: string, cssContent: string): ColourAnalysis
}

// Font extraction
class FontExtractor {
  extractFromCSS(cssContent: string): FontFamily[]
  extractFromHTML(htmlContent: string): FontFamily[]
  detectGoogleFonts(htmlContent: string): FontFamily[]
}

// Logo extraction
class LogoExtractor {
  findLogos(htmlContent: string, baseUrl: string): Logo[]
  findFavicon(htmlContent: string, baseUrl: string): string
  validateLogoUrl(url: string): boolean
}
```

### Phase 3: API Enhancement (Week 5-6)
**Deliverables:**
- [ ] Authentication middleware (API keys)
- [ ] Rate limiting and request validation
- [ ] Webhook notifications for job completion
- [ ] Comprehensive error handling
- [ ] API documentation with OpenAPI/Swagger

**API Enhancements:**
```typescript
// Rate limiting
const rateLimit = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests'
};

// Webhook notifications
interface WebhookPayload {
  jobId: string;
  status: 'completed' | 'failed';
  result?: BrandAssets;
  error?: string;
  timestamp: string;
}
```

---

## 🧪 **Testing Strategy**

### Unit Tests
```typescript
// Test extraction modules
describe('ColourExtractor', () => {
  test('extractFromCSS should find primary colours', () => {
    const css = 'body { color: #333; background: #fff; }';
    const result = extractor.extractFromCSS(css);
    expect(result.primary).toContain('#333');
  });
});

// Test HTTrack integration
describe('HTTrackWrapper', () => {
  test('should start crawl process', async () => {
    const wrapper = new HTTrackWrapper();
    await wrapper.startCrawl('test-job', 'https://example.com', {});
    expect(mockChildProcess.spawn).toHaveBeenCalled();
  });
});
```

### Integration Tests
- [ ] End-to-end crawl and extraction workflow
- [ ] API endpoint testing with real HTTrack execution
- [ ] Error scenario testing (network failures, invalid URLs)
- [ ] Performance testing with large sites

### Test Data
```typescript
// Sample test websites
const testSites = [
  'https://example.com',           // Simple site
  'https://bootstrap.com',         // Complex CSS framework
  'https://wordpress.org',         // Dynamic content
  'https://github.com'             // Modern SPA
];
```

---

## 📦 **Dependencies & Setup**

### Core Dependencies
```json
{
  "express": "^4.18.2",
  "sqlite3": "^5.1.6",
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.7.0",
  "joi": "^17.9.2",
  "winston": "^3.8.2"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.0.0",
  "@types/express": "^4.17.17",
  "typescript": "^5.0.0",
  "jest": "^29.5.0",
  "@types/jest": "^29.5.0",
  "ts-jest": "^29.1.0",
  "nodemon": "^2.0.22"
}
```

### Environment Setup
```bash
# Required system dependencies
- Node.js 18+
- HTTrack CLI (installed and in PATH)
- SQLite3

# Development setup
npm install
npm run build
npm run test
npm run dev
```

---

## 🔍 **Technical Challenges & Solutions**

### Challenge 1: HTTrack Process Management
**Problem:** Managing long-running HTTrack processes and handling crashes
**Solution:** 
```typescript
class ProcessManager {
  private processes = new Map<string, ChildProcess>();
  
  async startProcess(jobId: string, command: string): Promise<void> {
    const process = spawn(command, { stdio: 'pipe' });
    this.processes.set(jobId, process);
    
    process.on('exit', (code) => {
      this.handleProcessExit(jobId, code);
    });
  }
}
```

### Challenge 2: Accurate Asset Extraction
**Problem:** CSS parsing and colour/font detection accuracy
**Solution:** 
```typescript
// Use established libraries
import { parse } from 'css';
import { extract } from 'extract-css-colors';

class CSSAnalyzer {
  analyseStyles(cssContent: string): StyleAnalysis {
    const ast = parse(cssContent);
    const colours = extract(cssContent);
    return { ast, colours };
  }
}
```

### Challenge 3: Cross-Platform Compatibility
**Problem:** HTTrack CLI differences between Windows/Linux
**Solution:**
```typescript
class PlatformAdapter {
  getHTTrackCommand(): string {
    return process.platform === 'win32' 
      ? 'httrack.exe' 
      : 'httrack';
  }
  
  getOutputPath(jobId: string): string {
    return path.join(process.cwd(), 'downloads', jobId);
  }
}
```

---

## 📊 **Performance Considerations**

### Memory Management
- [ ] Stream processing for large CSS files
- [ ] Cleanup of downloaded files after extraction
- [ ] Database connection pooling
- [ ] Garbage collection monitoring

### Scalability
- [ ] Job queue with worker processes
- [ ] Horizontal scaling with load balancer
- [ ] Database indexing for job queries
- [ ] Caching of extraction results

### Monitoring
```typescript
// Performance metrics
interface Metrics {
  activeJobs: number;
  averageProcessingTime: number;
  memoryUsage: number;
  diskUsage: number;
  errorRate: number;
}
```

---

## 🚀 **Deployment Strategy**

### Development Environment
```bash
# Local development
npm run dev          # Start with nodemon
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint checking
```

### Production Environment
```bash
# Docker deployment
docker build -t htttrack-mcp .
docker run -p 3000:3000 htttrack-mcp

# Environment variables
HTTRACK_MCP_PORT=3000
HTTRACK_MCP_DB_PATH=/data/jobs.db
HTTRACK_MCP_DOWNLOAD_PATH=/data/downloads
HTTRACK_MCP_LOG_LEVEL=info
```

### CI/CD Pipeline
```yaml
# GitHub Actions
name: Build and Test
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

---

## 📚 **Documentation Requirements**

### API Documentation
- [ ] OpenAPI/Swagger specification
- [ ] Postman collection
- [ ] Example requests/responses
- [ ] Error code documentation

### Developer Documentation
- [ ] Setup and installation guide
- [ ] Architecture overview
- [ ] Contributing guidelines
- [ ] Troubleshooting guide

### Code Documentation
- [ ] JSDoc comments for all public methods
- [ ] README with usage examples
- [ ] Inline comments for complex logic
- [ ] Architecture decision records (ADRs)

---

*This technical project card provides the development roadmap and implementation details for building the HTTrack-MCP server as a robust, scalable API service.* 