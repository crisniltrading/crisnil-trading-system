Write-Host "Starting CRIS Backend Server..." -ForegroundColor Green
Set-Location "C:\Users\63981\proejects\CRIS-SYSTEM\backend"
Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "Starting server on port 5001..." -ForegroundColor Cyan
node server.js
