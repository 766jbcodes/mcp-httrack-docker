import express, { Express, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

export class LocalServer {
  private app: Express;
  private port: number;
  private isStarted: boolean = false;

  constructor(port: number = 8080) {
    this.app = express();
    this.port = port;
  }

  async serveProject(jobId: string): Promise<string> {
    const projectPath = path.join(process.cwd(), 'downloads', jobId);
    
    // Check if project directory exists
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory not found: ${projectPath}`);
    }

    // Find the main HTML file (index.html, default.html, or first .html file)
    const htmlFile = this.findMainHtmlFile(projectPath);
    if (!htmlFile) {
      throw new Error(`No HTML file found in project directory: ${projectPath}`);
    }

    // Serve static files from project directory
    this.app.use(`/${jobId}`, express.static(projectPath));
    
    // Handle root route to serve the main HTML file
    this.app.get(`/${jobId}`, (req: Request, res: Response) => {
      res.sendFile(path.join(projectPath, htmlFile));
    });

    // Handle root route without trailing slash
    this.app.get(`/${jobId}/`, (req: Request, res: Response) => {
      res.sendFile(path.join(projectPath, htmlFile));
    });

    const url = `http://localhost:${this.port}/${jobId}`;
    console.log(`Project ${jobId} available at: ${url}`);
    return url;
  }

  start(): void {
    if (this.isStarted) {
      console.log('Local server is already running');
      return;
    }

    this.app.listen(this.port, () => {
      console.log(`Local server running on port ${this.port}`);
      this.isStarted = true;
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down local server...');
      process.exit(0);
    });
  }

  getPort(): number {
    return this.port;
  }

  isRunning(): boolean {
    return this.isStarted;
  }

  private findMainHtmlFile(projectPath: string): string | null {
    const files = fs.readdirSync(projectPath);
    
    // Priority order for HTML files
    const priorityFiles = ['index.html', 'default.html', 'main.html', 'home.html'];
    
    // Check priority files first
    for (const priorityFile of priorityFiles) {
      if (files.includes(priorityFile)) {
        return priorityFile;
      }
    }
    
    // If no priority file found, look for any .html file
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    if (htmlFiles.length > 0) {
      return htmlFiles[0];
    }
    
    return null;
  }

  // Method to check if a project is ready to serve
  isProjectReady(jobId: string): boolean {
    const projectPath = path.join(process.cwd(), 'downloads', jobId);
    if (!fs.existsSync(projectPath)) {
      return false;
    }
    
    const htmlFile = this.findMainHtmlFile(projectPath);
    return htmlFile !== null;
  }

  // Method to get project info
  getProjectInfo(jobId: string): { exists: boolean; htmlFile?: string; fileCount?: number } {
    const projectPath = path.join(process.cwd(), 'downloads', jobId);
    
    if (!fs.existsSync(projectPath)) {
      return { exists: false };
    }
    
    const htmlFile = this.findMainHtmlFile(projectPath);
    const files = fs.readdirSync(projectPath);
    
    return {
      exists: true,
      htmlFile: htmlFile || undefined,
      fileCount: files.length
    };
  }

  // Method to get project directory path
  getProjectDirectory(jobId: string): string | null {
    const projectPath = path.join(process.cwd(), 'downloads', jobId);
    
    if (!fs.existsSync(projectPath)) {
      return null;
    }
    
    return projectPath;
  }
} 