# Test script for Owl Home Loans website crawl

Write-Host "Testing Owl Home Loans Website Crawl" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Test the crawl API
$body = @{
    targetUrl = "https://owlhomeloans.com.au/"
    projectName = "owl-home-loans"
} | ConvertTo-Json

Write-Host "Starting crawl job..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/crawl" -Method POST -ContentType "application/json" -Body $body
    
    Write-Host "Crawl job created successfully!" -ForegroundColor Green
    Write-Host "Job ID: $($response.jobId)" -ForegroundColor Cyan
    Write-Host "Status: $($response.status)" -ForegroundColor Gray
    
    $jobId = $response.jobId
    
    # Monitor the job
    Write-Host "`nMonitoring job progress..." -ForegroundColor Yellow
    
    $maxAttempts = 20
    $attempt = 0
    
    do {
        Start-Sleep -Seconds 3
        $attempt++
        
        try {
            $status = Invoke-RestMethod -Uri "http://localhost:3000/api/status/$jobId" -Method GET
            
            Write-Host "Attempt $attempt`: Status = $($status.status)" -ForegroundColor Gray
            
            if ($status.status -eq "completed") {
                Write-Host "`nSUCCESS! Job completed!" -ForegroundColor Green
                Write-Host "Local URL: $($status.localUrl)" -ForegroundColor Cyan
                Write-Host "You can now browse the Owl Home Loans website locally!" -ForegroundColor Green
                break
            } elseif ($status.status -eq "failed") {
                Write-Host "`nFAILED: Job failed" -ForegroundColor Red
                Write-Host "Error: $($status.error)" -ForegroundColor Red
                break
            }
        } catch {
            Write-Host "Attempt $attempt`: Could not get status" -ForegroundColor Yellow
        }
    } while ($attempt -lt $maxAttempts)
    
    if ($attempt -eq $maxAttempts) {
        Write-Host "`nTIMEOUT: Job monitoring timed out" -ForegroundColor Yellow
        Write-Host "This might be normal if HTTrack is not installed" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "ERROR: Failed to create crawl job" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest Complete!" -ForegroundColor Green 