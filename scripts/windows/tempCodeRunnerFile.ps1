$serverPath = "C:\Users\63981\proejects\CRIS-SYSTEM\backend"
$logFile = "$serverPath\server.log"

Write-Host "🚀 Starting CRIS-SYSTEM Backend Server Monitor..." -ForegroundColor Green
Write-Host "📁 Server path: $serverPath" -ForegroundColor Cyan
Write-Host "📝 Log file: $logFile" -ForegroundColor Cyan
Write-Host "⚠️  Press Ctrl+C to stop the server monitor" -ForegroundColor Yellow
Write-Host ""

# Change to server directory
Set-Location $serverPath

$restartCount = 0

while ($true) {
    try {
        Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Starting server (restart #$restartCount)..." -ForegroundColor Green
        
        # Start the server process
        $process = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError "$serverPath\error.log"
        
        # Wait for the process to start
        Start-Sleep -Seconds 2
        
        # Check if server is running
        $port = netstat -ano | Select-String ":5001"
        if ($port) {
            Write-Host "✅ Server is running on port 5001 (PID: $($process.Id))" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Server may not have started properly" -ForegroundColor Yellow
        }
        
        # Monitor the process
        while (!$process.HasExited) {
            Start-Sleep -Seconds 10
            
            # Check if port is still listening
            $port = netstat -ano | Select-String ":5001"
            if (-not $port) {
                Write-Host "❌ Server port 5001 is no longer listening" -ForegroundColor Red
                if (!$process.HasExited) {
                    $process.Kill()
                }
                break
            }
        }
        
        Write-Host "❌ Server process has stopped" -ForegroundColor Red
        $restartCount++
        
        if ($restartCount -gt 10) {
            Write-Host "⚠️  Server has restarted too many times. Waiting 30 seconds before next attempt..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
        } else {
            Write-Host "🔄 Restarting server in 5 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
        
    } catch {
        Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "🔄 Retrying in 10 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}
