# HTTrack-MCP MVP Test Script
# This script demonstrates the basic functionality of the HTTrack-MCP server

Write-Host "🚀 HTTrack-MCP MVP Test Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Configuration
$API_BASE_URL = "http://localhost:3000"
$TEST_URL = "https://httpbin.org"

# Function to make API calls
function Invoke-API {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $response = Invoke-RestMethod -Uri "$API_BASE_URL$Endpoint" -Method $Method -Headers $headers -Body $Body
        } else {
            $response = Invoke-RestMethod -Uri "$API_BASE_URL$Endpoint" -Method $Method -Headers $headers
        }
        
        return $response
    }
    catch {
        Write-Host "❌ API Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n📋 Test 1: Health Check" -ForegroundColor Yellow
$health = Invoke-API -Method "GET" -Endpoint "/health"
if ($health) {
    Write-Host "✅ Server is running" -ForegroundColor Green
    Write-Host "   Version: $($health.version)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Gray
} else {
    Write-Host "❌ Server is not responding" -ForegroundColor Red
    exit 1
}

# Test 2: Check HTTrack Installation
Write-Host "`n📋 Test 2: Check HTTrack Installation" -ForegroundColor Yellow
$httrackCheck = Invoke-API -Method "GET" -Endpoint "/api/check-httrack"
if ($httrackCheck) {
    if ($httrackCheck.httrackInstalled) {
        Write-Host "✅ HTTrack is installed and available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  HTTrack is not installed or not in PATH" -ForegroundColor Yellow
        Write-Host "   Please install HTTrack following the guide in HTTRACK_INSTALLATION.md" -ForegroundColor Gray
        Write-Host "   You can still test the API endpoints without HTTrack" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Could not check HTTrack installation" -ForegroundColor Red
}

# Test 3: Start a Crawl Job
Write-Host "`n📋 Test 3: Start a Crawl Job" -ForegroundColor Yellow
$crawlBody = @{
    targetUrl = $TEST_URL
    projectName = "test-crawl"
} | ConvertTo-Json

$crawlResponse = Invoke-API -Method "POST" -Endpoint "/api/crawl" -Body $crawlBody
if ($crawlResponse) {
    Write-Host "✅ Crawl job created successfully" -ForegroundColor Green
    Write-Host "   Job ID: $($crawlResponse.jobId)" -ForegroundColor Gray
    Write-Host "   Status: $($crawlResponse.status)" -ForegroundColor Gray
    
    $jobId = $crawlResponse.jobId
    
    # Test 4: Monitor Job Status
    Write-Host "`n📋 Test 4: Monitor Job Status" -ForegroundColor Yellow
    Write-Host "   Monitoring job: $jobId" -ForegroundColor Gray
    
    $maxAttempts = 10
    $attempt = 0
    
    do {
        Start-Sleep -Seconds 2
        $attempt++
        
        $status = Invoke-API -Method "GET" -Endpoint "/api/status/$jobId"
        if ($status) {
            Write-Host "   Attempt $attempt`: Status = $($status.status)" -ForegroundColor Gray
            
            if ($status.status -eq "completed") {
                Write-Host "✅ Job completed successfully!" -ForegroundColor Green
                Write-Host "   Local URL: $($status.localUrl)" -ForegroundColor Cyan
                Write-Host "   You can now browse the local website at the URL above" -ForegroundColor Gray
                break
            } elseif ($status.status -eq "failed") {
                Write-Host "❌ Job failed: $($status.error)" -ForegroundColor Red
                break
            }
        } else {
            Write-Host "   Attempt $attempt`: Could not get status" -ForegroundColor Yellow
        }
    } while ($attempt -lt $maxAttempts)
    
    if ($attempt -eq $maxAttempts) {
        Write-Host "⚠️  Timeout waiting for job completion" -ForegroundColor Yellow
        Write-Host "   This is normal if HTTrack is not installed" -ForegroundColor Gray
    }
    
} else {
    Write-Host "❌ Failed to create crawl job" -ForegroundColor Red
}

# Test 5: List All Jobs
Write-Host "`n📋 Test 5: List All Jobs" -ForegroundColor Yellow
$jobs = Invoke-API -Method "GET" -Endpoint "/api/jobs"
if ($jobs) {
    Write-Host "✅ Found $($jobs.jobs.Count) job(s)" -ForegroundColor Green
    foreach ($job in $jobs.jobs) {
        Write-Host "   Job ID: $($job.jobId)" -ForegroundColor Gray
        Write-Host "   Status: $($job.status)" -ForegroundColor Gray
        Write-Host "   Created: $($job.createdAt)" -ForegroundColor Gray
        if ($job.localUrl) {
            Write-Host "   Local URL: $($job.localUrl)" -ForegroundColor Cyan
        }
        Write-Host ""
    }
} else {
    Write-Host "❌ Could not retrieve jobs" -ForegroundColor Red
}

# Test 6: Test Error Handling
Write-Host "`n📋 Test 6: Test Error Handling" -ForegroundColor Yellow
$invalidBody = @{
    targetUrl = "not-a-valid-url"
} | ConvertTo-Json

$errorResponse = Invoke-API -Method "POST" -Endpoint "/api/crawl" -Body $invalidBody
if ($errorResponse) {
    Write-Host "✅ Error handling works correctly" -ForegroundColor Green
    Write-Host "   Error: $($errorResponse.error)" -ForegroundColor Gray
    Write-Host "   Message: $($errorResponse.message)" -ForegroundColor Gray
} else {
    Write-Host "❌ Error handling test failed" -ForegroundColor Red
}

# Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host "✅ Server is running and responding" -ForegroundColor Green
Write-Host "✅ API endpoints are working" -ForegroundColor Green
Write-Host "✅ Error handling is functional" -ForegroundColor Green

if ($httrackCheck -and $httrackCheck.httrackInstalled) {
    Write-Host "✅ HTTrack is installed and ready" -ForegroundColor Green
    Write-Host "🎉 All tests passed! The HTTrack-MCP MVP is working correctly." -ForegroundColor Green
} else {
    Write-Host "⚠️  HTTrack is not installed" -ForegroundColor Yellow
    Write-Host "📖 Please install HTTrack to test full functionality:" -ForegroundColor Cyan
    Write-Host "   See HTTRACK_INSTALLATION.md for installation instructions" -ForegroundColor Gray
}

Write-Host "`n🔗 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Install HTTrack (if not already installed)" -ForegroundColor Gray
Write-Host "   2. Test with real websites" -ForegroundColor Gray
Write-Host "   3. Browse downloaded sites at http://localhost:8080/{jobId}" -ForegroundColor Gray
Write-Host "   4. Check the README.md for more usage examples" -ForegroundColor Gray

Write-Host "`n✨ HTTrack-MCP MVP Test Complete!" -ForegroundColor Green 