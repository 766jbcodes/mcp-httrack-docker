import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { HTTrackWrapper } from './httrack';
import { LocalServer } from './localServer';
import { AssetExtractor } from './assetExtractor';
import { CrawlRequest, CrawlResponse, JobStatus, ApiError, AssetExtractionRequest, AssetExtractionResponse, BrandAssets } from './types';
import { setTimeout } from 'timers';

class JobManager {
  private jobs = new Map<string, JobStatus>();
  private httrack = new HTTrackWrapper();
  private localServer = new LocalServer(8080);
  private assetExtractions = new Map<string, BrandAssets>();

  constructor() {
    // Start the local server
    this.localServer.start();
  }

  async createJob(targetUrl: string, projectName?: string): Promise<string> {
    const jobId = uuidv4();
    const now = new Date();

    const jobStatus: JobStatus = {
      jobId,
      status: 'queued',
      createdAt: now,
      updatedAt: now
    };

    // Store the target URL for later use in asset extraction
    (jobStatus as any).targetUrl = targetUrl;

    this.jobs.set(jobId, jobStatus);

    // Start the crawl process asynchronously
    this.startCrawl(jobId, targetUrl).catch(error => {
      console.error(`Error in crawl job ${jobId}:`, error);
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.updatedAt = new Date();
      }
    });

    return jobId;
  }

  private async startCrawl(jobId: string, targetUrl: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      // Update status to running
      job.status = 'running';
      job.updatedAt = new Date();

      console.log(`Starting crawl for job ${jobId}: ${targetUrl}`);

      // Start HTTrack crawl
      await this.httrack.startCrawl(jobId, targetUrl);

      // Check if project is ready to serve
      if (this.localServer.isProjectReady(jobId)) {
        const localUrl = await this.localServer.serveProject(jobId);
        
        // Update job status to completed
        job.status = 'completed';
        job.localUrl = localUrl;
        job.updatedAt = new Date();
        
        console.log(`Job ${jobId} completed successfully. Available at: ${localUrl}`);
      } else {
        throw new Error('Project files not found after crawl completion');
      }

    } catch (error) {
      console.error(`Crawl failed for job ${jobId}:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date();
      throw error;
    }
  }

  getJobStatus(jobId: string): JobStatus | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    // Add progress information if job is running
    if (job.status === 'running') {
      const progress = this.httrack.getProgress(jobId);
      if (progress) {
        job.progress = {
          filesDownloaded: progress.filesDownloaded,
          totalFiles: progress.totalFiles,
          currentUrl: progress.currentUrl
        };
      }
    }

    return { ...job }; // Return a copy to prevent external modification
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      await this.httrack.stopCrawl(jobId);
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.updatedAt = new Date();
    }
  }

  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  async extractAssets(jobId: string): Promise<BrandAssets> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'completed') {
      throw new Error(`Cannot extract assets for job ${jobId} - job status is ${job.status}`);
    }

    // Check if assets have already been extracted
    if (this.assetExtractions.has(jobId)) {
      return this.assetExtractions.get(jobId)!;
    }

    // Get the project directory for this job
    const projectDir = this.localServer.getProjectDirectory(jobId);
    if (!projectDir) {
      throw new Error(`Project directory not found for job ${jobId}`);
    }

    // Extract the base URL from the job (we'll need to store this in the job status)
    const baseUrl = this.extractBaseUrlFromJob(job);
    
    // Create asset extractor and extract assets
    const extractor = new AssetExtractor(projectDir, baseUrl);
    const assets = await extractor.extractAssets();

    // Store the extracted assets
    this.assetExtractions.set(jobId, assets);

    return assets;
  }

  getExtractedAssets(jobId: string): BrandAssets | null {
    return this.assetExtractions.get(jobId) || null;
  }

  private extractBaseUrlFromJob(job: JobStatus): string {
    // Get the stored target URL
    const targetUrl = (job as any).targetUrl;
    if (targetUrl) {
      return targetUrl;
    }
    
    // Fallback - try to extract from local URL
    if (job.localUrl) {
      const pathParts = job.localUrl.split('/');
      if (pathParts.length > 2) {
        return `https://${pathParts[2]}`;
      }
    }
    
    // Final fallback
    return 'https://example.com';
  }
}

// Initialize Express app
const app = express();
const jobManager = new JobManager();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start crawl endpoint
app.post('/api/crawl', async (req: Request, res: Response) => {
  try {
    const { targetUrl, projectName }: CrawlRequest = req.body;

    if (!targetUrl) {
      const error: ApiError = {
        error: 'VALIDATION_ERROR',
        message: 'targetUrl is required',
        timestamp: new Date()
      };
      return res.status(400).json(error);
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      const error: ApiError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid URL format',
        timestamp: new Date()
      };
      return res.status(400).json(error);
    }

    const jobId = await jobManager.createJob(targetUrl, projectName);
    
    const response: CrawlResponse = {
      jobId,
      status: 'queued',
      message: 'Crawl job created successfully'
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating crawl job:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

// Get job status endpoint
app.get('/api/status/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const status = jobManager.getJobStatus(jobId);

    if (!status) {
      const error: ApiError = {
        error: 'NOT_FOUND',
        message: `Job ${jobId} not found`,
        jobId,
        timestamp: new Date()
      };
      return res.status(404).json(error);
    }

    res.json(status);

  } catch (error) {
    console.error('Error getting job status:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

// Cancel job endpoint
app.delete('/api/crawl/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    await jobManager.cancelJob(jobId);
    
    res.json({ 
      message: `Job ${jobId} cancelled successfully`,
      jobId 
    });

  } catch (error) {
    console.error('Error cancelling job:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

// List all jobs endpoint
app.get('/api/jobs', (req: Request, res: Response) => {
  try {
    const jobs = jobManager.getAllJobs();
    res.json({ jobs });
  } catch (error) {
    console.error('Error listing jobs:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

// Check HTTrack installation endpoint
app.get('/api/check-httrack', async (req: Request, res: Response) => {
  try {
    const isInstalled = await jobManager['httrack'].checkHTTrackInstallation();
    res.json({ 
      httrackInstalled: isInstalled,
      message: isInstalled ? 'HTTrack is available' : 'HTTrack is not installed or not in PATH'
    });
  } catch (error) {
    console.error('Error checking HTTrack installation:', error);
    res.status(500).json({ 
      httrackInstalled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Extract assets endpoint
app.post('/api/extract-assets', async (req: Request, res: Response) => {
  try {
    const { jobId }: AssetExtractionRequest = req.body;

    if (!jobId) {
      const error: ApiError = {
        error: 'VALIDATION_ERROR',
        message: 'jobId is required',
        timestamp: new Date()
      };
      return res.status(400).json(error);
    }

    // Check if assets have already been extracted
    const existingAssets = jobManager.getExtractedAssets(jobId);
    if (existingAssets) {
      const response: AssetExtractionResponse = {
        jobId,
        status: 'completed',
        assets: existingAssets,
        message: 'Assets already extracted'
      };
      return res.json(response);
    }

    // Extract assets
    const assets = await jobManager.extractAssets(jobId);
    
    const response: AssetExtractionResponse = {
      jobId,
      status: 'completed',
      assets,
      message: 'Asset extraction completed successfully'
    };

    res.json(response);

  } catch (error) {
    console.error('Error extracting assets:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

// Get extracted assets endpoint
app.get('/api/assets/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const assets = jobManager.getExtractedAssets(jobId);

    if (!assets) {
      const error: ApiError = {
        error: 'NOT_FOUND',
        message: `No assets found for job ${jobId}. Run asset extraction first.`,
        jobId,
        timestamp: new Date()
      };
      return res.status(404).json(error);
    }

    res.json(assets);

  } catch (error) {
    console.error('Error getting extracted assets:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

/**
 * POST /api/crawl-and-extract
 * Starts a crawl job and, when complete, automatically triggers asset extraction.
 * Returns jobId immediately. Poll /api/assets/:jobId for results.
 */
app.post('/api/crawl-and-extract', async (req: Request, res: Response) => {
  try {
    const { targetUrl, projectName }: CrawlRequest = req.body;

    if (!targetUrl) {
      const error: ApiError = {
        error: 'VALIDATION_ERROR',
        message: 'targetUrl is required',
        timestamp: new Date()
      };
      return res.status(400).json(error);
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      const error: ApiError = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid URL format',
        timestamp: new Date()
      };
      return res.status(400).json(error);
    }

    // Start crawl job
    const jobId = await jobManager.createJob(targetUrl, projectName);

    // Start polling for job completion and trigger asset extraction in background
    (async function pollAndExtract(jobId: string) {
      const pollIntervalMs = 5000;
      const maxAttempts = 240; // ~20 minutes
      let attempts = 0;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        const status = jobManager.getJobStatus(jobId);
        if (!status) return;
        if (status.status === 'completed') {
          try {
            await jobManager.extractAssets(jobId);
            return;
          } catch (err) {
            console.error(`Asset extraction failed for job ${jobId}:`, err);
            return;
          }
        }
        if (status.status === 'failed') {
          return;
        }
        attempts++;
      }
      console.warn(`Asset extraction polling timed out for job ${jobId}`);
    })(jobId);

    res.status(201).json({
      jobId,
      status: 'queued',
      message: 'Crawl job started. Asset extraction will run automatically after crawl completes.'
    });
  } catch (error) {
    console.error('Error in crawl-and-extract:', error);
    const apiError: ApiError = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(apiError);
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', error);
  const apiError: ApiError = {
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date()
  };
  res.status(500).json(apiError);
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  const error: ApiError = {
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date()
  };
  res.status(404).json(error);
});

// Start server
const PORT = process.env.HTTRACK_MCP_PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 HTTrack-MCP MVP server running on port ${PORT}`);
  console.log(`📋 API Documentation:`);
  console.log(`   POST /api/crawl - Start a new crawl job`);
  console.log(`   GET  /api/status/:jobId - Get job status`);
  console.log(`   DELETE /api/crawl/:jobId - Cancel a job`);
  console.log(`   GET  /api/jobs - List all jobs`);
  console.log(`   POST /api/extract-assets - Extract brand assets from completed job`);
  console.log(`   GET  /api/assets/:jobId - Get extracted assets for a job`);
  console.log(`   GET  /api/check-httrack - Check HTTrack installation`);
  console.log(`   GET  /health - Health check`);
  console.log(`🌐 Local server will run on port 8080`);
}); 