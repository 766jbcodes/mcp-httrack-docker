# HTTrack-MCP MVP

A Node.js/TypeScript server that automates website crawling using HTTrack and serves downloaded sites locally.

## ✅ **Status: MVP Complete & Operational**

The HTTrack-MCP MVP is now **fully functional** with successful HTTrack integration. We've proven the complete workflow from URL input to local website serving with real website crawling tested and working.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **HTTrack CLI** (must be in PATH)
  - Windows: Download from [HTTrack website](https://www.httrack.com/)
  - Ensure `httrack.exe` is in your system PATH

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Check HTTrack installation:**
   ```bash
   npm run dev
   # In another terminal:
   curl http://localhost:3000/api/check-httrack
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

## 📋 API Endpoints

### Start a Crawl Job
```bash
POST /api/crawl
Content-Type: application/json

{
  "targetUrl": "https://example.com",
  "projectName": "optional-custom-name"
}
```

**Response:**
```json
{
  "jobId": "abc123-def456-ghi789",
  "status": "queued",
  "message": "Crawl job created successfully"
}
```

### Check Job Status
```bash
GET /api/status/{jobId}
```

**Response:**
```json
{
  "jobId": "abc123-def456-ghi789",
  "status": "completed",
  "localUrl": "http://localhost:8080/abc123-def456-ghi789",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:32:00.000Z"
}
```

### Cancel a Job
```bash
DELETE /api/crawl/{jobId}
```

### List All Jobs
```bash
GET /api/jobs
```

### Health Check
```bash
GET /health
```

### Check HTTrack Installation
```bash
GET /api/check-httrack
```

## 🔧 Usage Examples

### Basic Website Crawl
```bash
# 1. Start the server
npm run dev

# 2. Start a crawl job
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'

# 3. Check status (replace with actual jobId)
curl http://localhost:3000/api/status/abc123-def456-ghi789

# 4. Browse the local site
# Open: http://localhost:8080/abc123-def456-ghi789
```

### Using PowerShell (Windows)
```powershell
# Start crawl
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/crawl" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"targetUrl": "https://example.com"}'

$jobId = $response.jobId
Write-Host "Job ID: $jobId"

# Check status
$status = Invoke-RestMethod -Uri "http://localhost:3000/api/status/$jobId"
Write-Host "Status: $($status.status)"
Write-Host "Local URL: $($status.localUrl)"
```

## 🏗️ Project Structure

```
htttrack-mcp-mvp/
├── src/
│   ├── server.ts          # Main Express server
│   ├── httrack.ts         # HTTrack CLI wrapper
│   ├── localServer.ts     # Static file server
│   └── types.ts           # TypeScript interfaces
├── downloads/             # HTTrack output directory
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 How It Works

1. **URL Input**: Send website URL via POST request
2. **HTTrack Crawl**: Downloads complete website using HTTrack CLI
3. **Local Serving**: Serves downloaded files on localhost:8080
4. **Browse Ready**: Access local mock website with working links

### HTTrack Configuration
- **Mirror Mode**: Complete website mirroring
- **Depth**: 2 levels (configurable)
- **Max Files**: 1000 (configurable)
- **Robots**: Disabled for better crawling
- **Output**: `./downloads/{jobId}/`

## 🧪 Testing

### Test Cases
- [x] Simple static website (example.com)
- [x] Website with CSS and images
- [x] Website with JavaScript
- [x] Website with relative links
- [x] Error handling for invalid URLs
- [x] Error handling for network failures
- [x] **Real website crawling (owlhomeloans.com.au)**
- [x] **WordPress site with complex structure**
- [x] **Complete offline browsing experience**

### Manual Testing
```bash
# Test with different websites
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://httpbin.org"}'

curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://jsonplaceholder.typicode.com"}'

# Test with real website (proven working)
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://owlhomeloans.com.au"}'
```

### PowerShell Testing
```powershell
# Use the provided test scripts
.\test-simple.ps1
.\test-owl-loans.ps1
```

## 🚨 Troubleshooting

### Common Issues

**HTTrack not found:**
```bash
# Check if HTTrack is in PATH
httrack --version

# If not found, add HTTrack to your system PATH
# Windows: Add httrack.exe directory to PATH environment variable
```

**Port already in use:**
```bash
# Change port via environment variable
HTTRACK_MCP_PORT=3001 npm run dev
```

**Permission denied:**
```bash
# Ensure you have write permissions to the project directory
# Windows: Run as Administrator if needed
```

**Download fails:**
- Check internet connection
- Verify target URL is accessible
- Check HTTrack logs in console output

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev
```

## 📊 Performance

- **Typical download time**: 2-5 minutes for small sites
- **File limit**: 1000 files per job
- **Concurrent jobs**: Limited by system resources
- **Local server startup**: <10 seconds

## 🔒 Security Notes

- Only crawls publicly accessible websites
- No authentication required (development tool)
- Downloads stored locally in `./downloads/` directory
- Consider adding rate limiting for production use

## 🚀 Development

### Scripts
```bash
npm run dev      # Start development server with nodemon
npm run start    # Start production server
npm run build    # Build TypeScript to JavaScript
```

### Environment Variables
```bash
HTTRACK_MCP_PORT=3000      # API server port (default: 3000)
LOCAL_SERVER_PORT=8080     # Local file server port (default: 8080)
DOWNLOAD_PATH=./downloads  # HTTrack output directory
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🎉 **MVP Achievement**

### **What We've Accomplished**
- ✅ **Complete HTTrack integration** with Windows compatibility
- ✅ **Real website crawling** tested and proven working
- ✅ **Full workflow** from URL to local browsing
- ✅ **Comprehensive API** with job management
- ✅ **Production-ready foundation** for Phase 2 development

### **Proven Capabilities**
- Successfully crawled complex WordPress sites (owlhomeloans.com.au)
- Complete website structure preservation
- Working internal links and assets
- Offline browsing experience
- Robust error handling and job management

## 🚀 **Next Steps**

See `NEXT_STEPS.md` for detailed roadmap including:
- **Phase 2**: Brand asset extraction
- **Enhancements**: Configuration management, job persistence
- **Future**: Web interface, enterprise features

## 🐳 Docker deployment with Portainer (Git stack)

The easiest way to run HTTrack-MCP on your Docker server is via Portainer's "Git repository" stack feature.  The stack auto-builds the image whenever you push to the repository, so updates are as simple as `git push`.

### 1. Prerequisites
- A Portainer instance that can build images (agent or standalone).
- This repository pushed to a Git provider (GitHub, GitLab, Bitbucket, Azure DevOps, etc.).
- A Personal Access Token (PAT) or deploy key if the repo is private.

### 2. Files in the repo
- `Dockerfile` – builds the application image (HTTrack included).
- `docker-compose.yml` – declares the service, volumes, and port mappings.

### 3. One-off setup in Portainer
1. In Portainer go to **Stacks → Add stack → Git repository**.  
2. Fill in:  
   • **Repository URL**: `https://.../your-org/htttrack-mcp.git`  
   • **Repository reference**: `main`  
   • **Compose path**: `docker-compose.yml`  
3. If the repository is private, tick **Authentication** and paste your PAT or select a saved credential.  
4. Under **Auto-update** choose:  
   • **Webhook** – fastest; Portainer displays a URL. Add that URL as a webhook in your Git host so a push triggers an immediate redeploy.  
   • **Interval polling** – Portainer will pull every X minutes.  
5. Click **Deploy the stack**.

Portainer will:
- Clone the repo.
- Build the image defined by the Dockerfile.
- Create (or re-use) the `downloads` volume so your mirrored sites survive container upgrades.
- Start the container with the ports and environment shown below.

### 4. Default container settings
- Ports mapped:  
  • `3000:3000` – public API.  
  • `8080:8080` – local sites (only necessary if end-users need direct access).  
- Named volume `downloads` mounted to `/usr/src/app/downloads`.  
- Environment: `HTTRACK_MCP_PORT=3000` (change in compose file if you want a different API port).

### 5. Updating
Just push to the `main` branch.  If you enabled the webhook, Portainer will rebuild and replace the running container automatically – the `downloads` volume keeps existing data.

Need something else?  Raise an issue or pull request and we'll improve this guide. 🇦🇺

---

**Status**: MVP Complete & Operational ✅  
**Next Milestone**: Enhanced error handling and port management  
**Target**: Asset extraction prototype by end of month #   m c p - h t t r a c k - d o c k e r  
 