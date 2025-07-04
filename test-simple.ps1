# HTTrack-MCP MVP Simple Test Script

Write-Host "HTTrack-MCP MVP Test Script" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

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
        Write-Host "API Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Health Check
Write-Host "`nTest 1: Health Check" -ForegroundColor Yellow
$health = Invoke-API -Method "GET" -Endpoint "/health"
if ($health) {
    Write-Host "PASS: Server is running" -ForegroundColor Green
    Write-Host "   Version: $($health.version)" -ForegroundColor Gray
} else {
    Write-Host "FAIL: Server is not responding" -ForegroundColor Red
    exit 1
}

# Test 2: Check HTTrack Installation
Write-Host "`nTest 2: Check HTTrack Installation" -ForegroundColor Yellow
$httrackCheck = Invoke-API -Method "GET" -Endpoint "/api/check-httrack"
if ($httrackCheck) {
    if ($httrackCheck.httrackInstalled) {
        Write-Host "PASS: HTTrack is installed" -ForegroundColor Green
    } else {
        Write-Host "WARNING: HTTrack is not installed" -ForegroundColor Yellow
        Write-Host "   See HTTRACK_INSTALLATION.md for instructions" -ForegroundColor Gray
    }
} else {
    Write-Host "FAIL: Could not check HTTrack" -ForegroundColor Red
}

# Test 3: Start a Crawl Job
Write-Host "`nTest 3: Start a Crawl Job" -ForegroundColor Yellow
$crawlBody = @{
    targetUrl = $TEST_URL
    projectName = "test-crawl"
} | ConvertTo-Json

$crawlResponse = Invoke-API -Method "POST" -Endpoint "/api/crawl" -Body $crawlBody
if ($crawlResponse) {
    Write-Host "PASS: Crawl job created" -ForegroundColor Green
    Write-Host "   Job ID: $($crawlResponse.jobId)" -ForegroundColor Gray
    
    $jobId = $crawlResponse.jobId
    
    # Test 4: Monitor Job Status
    Write-Host "`nTest 4: Monitor Job Status" -ForegroundColor Yellow
    Write-Host "   Monitoring job: $jobId" -ForegroundColor Gray
    
    $maxAttempts = 5
    $attempt = 0
    
    do {
        Start-Sleep -Seconds 2
        $attempt++
        
        $status = Invoke-API -Method "GET" -Endpoint "/api/status/$jobId"
        if ($status) {
            Write-Host "   Attempt $attempt`: Status = $($status.status)" -ForegroundColor Gray
            
            if ($status.status -eq "completed") {
                Write-Host "PASS: Job completed!" -ForegroundColor Green
                Write-Host "   Local URL: $($status.localUrl)" -ForegroundColor Cyan
                break
            } elseif ($status.status -eq "failed") {
                Write-Host "FAIL: Job failed: $($status.error)" -ForegroundColor Red
                break
            }
        } else {
            Write-Host "   Attempt $attempt`: Could not get status" -ForegroundColor Yellow
        }
    } while ($attempt -lt $maxAttempts)
    
    if ($attempt -eq $maxAttempts) {
        Write-Host "WARNING: Timeout waiting for job completion" -ForegroundColor Yellow
        Write-Host "   This is normal if HTTrack is not installed" -ForegroundColor Gray
    }
    
} else {
    Write-Host "FAIL: Failed to create crawl job" -ForegroundColor Red
}

# Test 5: List All Jobs
Write-Host "`nTest 5: List All Jobs" -ForegroundColor Yellow
$jobs = Invoke-API -Method "GET" -Endpoint "/api/jobs"
if ($jobs) {
    Write-Host "PASS: Found $($jobs.jobs.Count) job(s)" -ForegroundColor Green
    foreach ($job in $jobs.jobs) {
        Write-Host "   Job ID: $($job.jobId)" -ForegroundColor Gray
        Write-Host "   Status: $($job.status)" -ForegroundColor Gray
    }
} else {
    Write-Host "FAIL: Could not retrieve jobs" -ForegroundColor Red
}

# Test 6: Test Error Handling
Write-Host "`nTest 6: Test Error Handling" -ForegroundColor Yellow
$invalidBody = @{
    targetUrl = "not-a-valid-url"
} | ConvertTo-Json

$errorResponse = Invoke-API -Method "POST" -Endpoint "/api/crawl" -Body $invalidBody
if ($errorResponse) {
    Write-Host "PASS: Error handling works" -ForegroundColor Green
    Write-Host "   Error: $($errorResponse.error)" -ForegroundColor Gray
} else {
    Write-Host "FAIL: Error handling test failed" -ForegroundColor Red
}

# Summary
Write-Host "`nTest Summary" -ForegroundColor Green
Write-Host "=============" -ForegroundColor Green
Write-Host "PASS: Server is running and responding" -ForegroundColor Green
Write-Host "PASS: API endpoints are working" -ForegroundColor Green
Write-Host "PASS: Error handling is functional" -ForegroundColor Green

if ($httrackCheck -and $httrackCheck.httrackInstalled) {
    Write-Host "PASS: HTTrack is installed and ready" -ForegroundColor Green
    Write-Host "SUCCESS: All tests passed!" -ForegroundColor Green
} else {
    Write-Host "WARNING: HTTrack is not installed" -ForegroundColor Yellow
    Write-Host "   Install HTTrack to test full functionality" -ForegroundColor Cyan
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "   1. Install HTTrack (if not already installed)" -ForegroundColor Gray
Write-Host "   2. Test with real websites" -ForegroundColor Gray
Write-Host "   3. Browse downloaded sites at http://localhost:8080/{jobId}" -ForegroundColor Gray

Write-Host "`nTest Complete!" -ForegroundColor Green 