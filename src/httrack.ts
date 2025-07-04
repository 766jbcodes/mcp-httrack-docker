import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { HTTrackOptions, HTTrackProgress, HTTrackError } from './types';

export class HTTrackWrapper {
  private processes = new Map<string, ChildProcess>();
  private progress = new Map<string, HTTrackProgress>();

  async startCrawl(jobId: string, targetUrl: string, options: HTTrackOptions = {}): Promise<void> {
    const outputPath = path.join(process.cwd(), 'downloads', jobId);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Validate URL
    if (!this.isValidUrl(targetUrl)) {
      throw new Error(`Invalid URL: ${targetUrl}`);
    }

    return new Promise((resolve, reject) => {
      const httrackArgs = [
        targetUrl,
        '--mirror',
        `--path=${outputPath}`,
        `--depth=${options.depth || 2}`,
        `--max-files=${options.maxFiles || 1000}`,
        options.robots === false ? '--robots=0' : '--robots=1',
        options.quiet !== false ? '--quiet' : '',
        '--keep-alive',
        '--display'
      ].filter(arg => arg !== '');

      console.log(`Starting HTTrack for job ${jobId}: ${targetUrl}`);
      console.log(`HTTrack command: httrack ${httrackArgs.join(' ')}`);

      // Use full path to HTTrack for Windows
      const httrackPath = process.platform === 'win32' 
        ? 'C:\\Program Files (x86)\\WinHTTrack\\httrack.exe'
        : 'httrack';
        
      const httrack = spawn(httrackPath, httrackArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.processes.set(jobId, httrack);

      // Initialize progress tracking
      this.progress.set(jobId, {
        filesDownloaded: 0,
        totalFiles: 0,
        currentUrl: targetUrl,
        bytesDownloaded: 0,
        speed: 0,
        estimatedTime: 0
      });

      let output = '';
      let errorOutput = '';

      httrack.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        this.parseProgress(jobId, chunk);
        process.stdout.write(chunk); // Show real-time output
      });

      httrack.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(`HTTrack stderr for job ${jobId}:`, chunk);
      });

      httrack.on('close', (code) => {
        this.processes.delete(jobId);
        
        if (code === 0) {
          console.log(`HTTrack completed successfully for job ${jobId}`);
          resolve();
        } else {
          const error = new Error(`HTTrack failed with code ${code}. Error output: ${errorOutput}`);
          console.error(`HTTrack failed for job ${jobId}:`, error.message);
          reject(error);
        }
      });

      httrack.on('error', (error) => {
        this.processes.delete(jobId);
        console.error(`HTTrack process error for job ${jobId}:`, error.message);
        reject(error);
      });

      // Handle process termination
      process.on('SIGINT', () => {
        this.stopCrawl(jobId);
      });
    });
  }

  async stopCrawl(jobId: string): Promise<void> {
    const process = this.processes.get(jobId);
    if (process) {
      console.log(`Stopping HTTrack process for job ${jobId}`);
      process.kill('SIGTERM');
      this.processes.delete(jobId);
    }
  }

  getProgress(jobId: string): HTTrackProgress | undefined {
    return this.progress.get(jobId);
  }

  isRunning(jobId: string): boolean {
    return this.processes.has(jobId);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private parseProgress(jobId: string, output: string): void {
    const progress = this.progress.get(jobId);
    if (!progress) return;

    // Parse HTTrack output for progress information
    // This is a basic implementation - HTTrack output format may vary
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for file count patterns
      const fileMatch = line.match(/(\d+)\/(\d+)\s+files/);
      if (fileMatch) {
        progress.filesDownloaded = parseInt(fileMatch[1]);
        progress.totalFiles = parseInt(fileMatch[2]);
      }

      // Look for current URL patterns
      const urlMatch = line.match(/Downloading:\s+(.+)/);
      if (urlMatch) {
        progress.currentUrl = urlMatch[1].trim();
      }

      // Look for speed patterns
      const speedMatch = line.match(/(\d+(?:\.\d+)?)\s*KB\/s/);
      if (speedMatch) {
        progress.speed = parseFloat(speedMatch[1]);
      }
    }

    this.progress.set(jobId, progress);
  }

  async checkHTTrackInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const httrackPath = process.platform === 'win32' 
        ? 'C:\\Program Files (x86)\\WinHTTrack\\httrack.exe'
        : 'httrack';
        
      const httrack = spawn(httrackPath, ['--version'], { stdio: 'pipe' });
      
      httrack.on('close', (code) => {
        resolve(code === 0);
      });
      
      httrack.on('error', () => {
        resolve(false);
      });
    });
  }
} 